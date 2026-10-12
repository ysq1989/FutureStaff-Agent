import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { ipcMain, session, WebContentsView } from 'electron'
import type { BrowserWindow, IpcMainInvokeEvent, Session } from 'electron'
import { SYSTEM_VIEW_CHANNEL, type SystemViewRequest, type SystemViewResolver, type SystemViewResult, type SystemViewTarget } from './system-view-contract.ts'
import { fetchSystemSession } from './system-session-fetch.ts'

type Guest = { view: WebContentsView; target: SystemViewTarget; session: Session; attached: boolean; revoke: () => void; loading?:Promise<void>; renewal?:ReturnType<typeof setTimeout>; checking?:Promise<boolean | void> }
function safeRequest(value: unknown): value is SystemViewRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  if (Object.keys(item).some(key => !['action','appId','bounds'].includes(key))
    || typeof item.appId !== 'string' || !/^[a-z][a-z0-9_]{1,63}$/.test(item.appId)
    || !['show','hide','close','reload'].includes(String(item.action))) return false
  if (item.action !== 'show') return item.bounds === undefined
  if (!item.bounds || typeof item.bounds !== 'object' || Array.isArray(item.bounds)) return false
  const bounds = item.bounds as Record<string, unknown>
  return Object.keys(bounds).length === 4 && ['x','y','width','height'].every(key => typeof bounds[key] === 'number' && Number.isFinite(bounds[key]) && Math.abs(bounds[key] as number) <= 16384)
    && (bounds.width as number) > 0 && (bounds.height as number) > 0
}
function publicHttps(raw: string): boolean {
  try {
    const url = new URL(raw), host = url.hostname
    return url.protocol === 'https:' && !url.username && !url.password && !isIP(host.replace(/^\[|\]$/g,''))
      && host.includes('.') && !['localhost','local','internal','test','invalid'].some(suffix => host === suffix || host.endsWith(`.${suffix}`))
  } catch { return false }
}
function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a=0,b=0] = address.split('.').map(Number)
    return a > 0 && a < 224 && ![10,127].includes(a) && !(a===169&&b===254)
      && !(a===172&&b>=16&&b<=31) && !(a===192&&(b===168||b===0))
      && !(a===100&&b>=64&&b<=127) && !(a===198&&(b===18||b===19))
  }
  return isIP(address) === 6 && /^[23]/.test(address) && !address.toLowerCase().startsWith('2001:db8:')
}
function proxyDnsAlias(address: string): boolean {
  return isIP(address) === 4 && /^198\.(18|19)\./.test(address)
}
function usesRemoteDnsProxy(proxy: string): boolean {
  const routes = proxy.split(';').map(route => route.trim()).filter(Boolean)
  return routes.length > 0 && routes.every(route => {
    const match = /^(PROXY|HTTPS|SOCKS5) (?:\[[0-9a-f:]+\]|[a-z0-9.-]+):([0-9]{1,5})$/i.exec(route)
    return !!match && Number(match[2]) > 0 && Number(match[2]) <= 65535
  })
}
function navigationAllowed(raw: string, target: string): boolean {
  if (!publicHttps(raw)) return false
  const url = new URL(raw)
  return url.origin === new URL(target).origin || ['https://platform.fsstory.net','https://platform-dev.fsstory.net','https://dev.fsstory.net','https://fsstory.net'].includes(url.origin)
}

/** Native content is separate from the authenticated DSH renderer session. */
export class DesktopSystemViews {
  private guests = new Map<string, Guest>()
  private revisions = new Map<string, number>()
  private clearing = new Map<string, Promise<void>>()
  private disposed = false
  private guardedSessions = new WeakSet<Session>()
  private proxyTargets = new WeakMap<Session, string>()
  constructor(private window: BrowserWindow, private shellOrigin: string, private resolve: SystemViewResolver) {
    ipcMain.handle(SYSTEM_VIEW_CHANNEL, (event, input: unknown) => this.request(event, input))
  }
  private trusted(event: IpcMainInvokeEvent): boolean {
    return !this.disposed && !this.window.isDestroyed() && event.sender.id === this.window.webContents.id
      && event.senderFrame === this.window.webContents.mainFrame
      && new URL(event.senderFrame.url).origin === this.shellOrigin
  }
  private detach(guest: Guest): void {
    if (guest.attached && !this.window.isDestroyed()) this.window.contentView.removeChildView(guest.view)
    guest.attached = false
  }
  private remove(id: string, clear = false): void {
    const guest = this.guests.get(id)
    if (!guest) return
    this.guests.delete(id);guest.target.signal.removeEventListener('abort', guest.revoke)
    if (guest.renewal) clearTimeout(guest.renewal)
    this.detach(guest)
    if (!guest.view.webContents.isDestroyed()) guest.view.webContents.close()
    if (clear) {
      const partition = this.partition(id, guest.target.owner)
      const cleared = guest.session.clearStorageData().catch(() => {})
      this.clearing.set(partition, cleared)
      void cleared.finally(() => { if (this.clearing.get(partition) === cleared) this.clearing.delete(partition) })
    }
  }
  private partition(id: string, owner: string): string {
    return `persist:futurestaff-system-${createHash('sha256').update(JSON.stringify([owner,id])).digest('hex')}`
  }
  private create(id: string, target: SystemViewTarget): Guest {
    const isolated = session.fromPartition(this.partition(id, target.owner))
    this.proxyTargets.set(isolated, target.url)
    if (!this.guardedSessions.has(isolated)) {
      this.guardedSessions.add(isolated)
      isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
      isolated.setPermissionCheckHandler(() => false)
      isolated.webRequest.onBeforeRequest((details, callback) => {
        if (!publicHttps(details.url)) { callback({ cancel: true }); return }
        // DNS names are insufficient: deny a public-looking host that resolves locally.
        void isolated.resolveHost(new URL(details.url).hostname).then(async result => {
          const addresses = result.endpoints.map(endpoint => endpoint.address)
          if (!addresses.length) { callback({ cancel: true }); return }
          if (addresses.every(publicAddress)) { callback({ cancel: false }); return }
          // A configured HTTP/SOCKS5 proxy resolves the authorized public hostname
          // remotely. Its TUN DNS alias is not a LAN destination; never extend this
          // exception to other private ranges, arbitrary hosts or DIRECT fallback.
          const authorized = this.proxyTargets.get(isolated)
          const alias = addresses.every(address => publicAddress(address) || proxyDnsAlias(address))
          const proxied = alias && authorized && navigationAllowed(details.url, authorized)
            && usesRemoteDnsProxy(await isolated.resolveProxy(details.url))
          callback({ cancel: !proxied })
        }).catch(() => callback({ cancel: true }))
      })
      isolated.on('will-download', event => event.preventDefault())
    }
    const view = new WebContentsView({ webPreferences: { session: isolated, contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true } })
    const guest: Guest = { view, target, session: isolated, attached: false, revoke: () => this.remove(id, true) }
    view.webContents.setWindowOpenHandler(({ url }) => {
      // Keep auth and first-party links in the same tab. Arbitrary popups are denied.
      if (navigationAllowed(url, target.url)) void view.webContents.loadURL(url).catch(() => {})
      return { action: 'deny' }
    })
    const navigate = (event: Electron.Event, url: string) => { if (!navigationAllowed(url, target.url)) event.preventDefault() }
    view.webContents.on('will-navigate', navigate)
    view.webContents.on('will-redirect', navigate)
    view.webContents.on('will-attach-webview', event => event.preventDefault())
    view.webContents.on('will-frame-navigate', event => { if (!navigationAllowed(event.url, target.url)) event.preventDefault() })
    target.signal.addEventListener('abort', guest.revoke, { once: true })
    this.guests.set(id, guest)
    return guest
  }
  private prepare(guest: Guest): Promise<boolean | void> {
    // Manual refresh and the background check share one authorization-code exchange.
    if (guest.checking) return guest.checking
    const checking = Promise.resolve().then(() => guest.target.prepare?.((url,init)=>fetchSystemSession(guest.session,url,init)))
    guest.checking = checking
    void checking.finally(() => { if (guest.checking === checking) delete guest.checking }).catch(() => {})
    return checking
  }
  private scheduleRenewal(id: string, guest: Guest): void {
    if (!guest.target.prepare || this.disposed || guest.target.signal.aborted || this.guests.get(id) !== guest) return
    guest.renewal = setTimeout(async () => {
      try {
        const recovered = await this.prepare(guest)
        if (recovered && !this.disposed && !guest.target.signal.aborted && this.guests.get(id) === guest
          && !guest.view.webContents.isDestroyed()) guest.view.webContents.reload()
      } catch { /* Preserve the page on transient failure; retry at the next check. */ }
      this.scheduleRenewal(id, guest)
    }, 60_000)
    guest.renewal.unref?.()
  }
  private async request(event: IpcMainInvokeEvent, input: unknown): Promise<SystemViewResult> {
    try {
      if (!this.trusted(event) || !safeRequest(input)) return { ok: false, error: 'SYSTEM_VIEW_DENIED' }
      const revision = (this.revisions.get(input.appId) ?? 0) + 1
      this.revisions.set(input.appId, revision)
      const existing = this.guests.get(input.appId)
      if (input.action === 'close') { this.remove(input.appId); return { ok: true } }
      if (input.action === 'hide') { if (existing) this.detach(existing); return { ok: true } }
      const target = await this.resolve(input.appId)
      if (this.disposed || target.signal.aborted || this.revisions.get(input.appId) !== revision || !publicHttps(target.url) || !target.owner) return { ok: false, error: 'SYSTEM_VIEW_REVOKED' }
      const partition = this.partition(input.appId, target.owner)
      await this.clearing.get(partition)
      if (this.disposed || target.signal.aborted || this.revisions.get(input.appId) !== revision) return { ok: false, error: 'SYSTEM_VIEW_REVOKED' }
      let guest = this.guests.get(input.appId)
      if (guest && (guest.target.owner !== target.owner || guest.target.signal !== target.signal || guest.target.url !== target.url)) {
        this.remove(input.appId, true);guest = undefined
        await this.clearing.get(partition)
        if (this.disposed || target.signal.aborted || this.revisions.get(input.appId) !== revision) return { ok: false, error: 'SYSTEM_VIEW_REVOKED' }
      }
      if (input.action === 'reload' && !guest) return { ok: false, error: 'SYSTEM_VIEW_UNAVAILABLE' }
      if (!guest && this.guests.size >= 12) return { ok: false, error: 'SYSTEM_VIEW_LIMIT' }
      guest ??= this.create(input.appId, target)
      if (input.action === 'reload') {
        await this.prepare(guest)
        if (this.disposed || guest.target.signal.aborted || this.guests.get(input.appId) !== guest) return {ok:false,error:'SYSTEM_VIEW_REVOKED'}
        guest.view.webContents.reload(); return { ok: true }
      }
      const zoom = this.window.webContents.getZoomFactor(), content = this.window.getContentBounds(), bounds = input.bounds!
      const x = Math.max(0, Math.min(content.width, Math.round(bounds.x * zoom))), y = Math.max(0, Math.min(content.height, Math.round(bounds.y * zoom)))
      const width = Math.max(0, Math.min(content.width-x, Math.round(bounds.width * zoom))), height = Math.max(0, Math.min(content.height-y, Math.round(bounds.height * zoom)))
      if (!width || !height) { this.detach(guest); return { ok: true } }
      for (const other of this.guests.values()) if (other !== guest) this.detach(other)
      guest.view.setBounds({x,y,width,height})
      if (!guest.attached) { this.window.contentView.addChildView(guest.view);guest.attached = true }
      if (!guest.loading) {
        guest.loading = (async () => {
          await this.prepare(guest)
          if (guest.target.signal.aborted || this.disposed) throw Error('SYSTEM_SSO_REVOKED')
          await guest.view.webContents.loadURL(target.url)
          this.scheduleRenewal(input.appId, guest)
        })()
      }
      {
        try { await guest.loading }
        catch (cause) {
          if (this.guests.get(input.appId) === guest) this.remove(input.appId)
          const safe=new Set(['SYSTEM_SSO_NOT_ENROLLED','SYSTEM_SSO_CONTRACT_MISMATCH','SYSTEM_SSO_EXCHANGE_FAILED','SYSTEM_SSO_UNAVAILABLE'])
          return {ok:false,error:cause instanceof Error&&safe.has(cause.message)?cause.message:'SYSTEM_VIEW_LOAD_FAILED'}
        }
      }
      return { ok: !this.disposed && !target.signal.aborted && this.guests.get(input.appId) === guest }
    } catch { return { ok: false, error: 'SYSTEM_VIEW_UNAVAILABLE' } }
  }
  dispose(): void {
    this.disposed = true;ipcMain.removeHandler(SYSTEM_VIEW_CHANNEL)
    for (const id of this.guests.keys()) this.remove(id)
  }
}
