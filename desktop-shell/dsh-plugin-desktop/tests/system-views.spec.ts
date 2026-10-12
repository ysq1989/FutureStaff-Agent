import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
const native = vi.hoisted(() => {
  const handlers = new Map<string, Function>(), views: any[] = []
  const sessions = new Map<string, any>()
  class WebContentsView {
    readonly webContents = { on: vi.fn(), setWindowOpenHandler: vi.fn(), isDestroyed: () => false,
      close: vi.fn(), loadURL: vi.fn(async () => {}), reload: vi.fn(), id: 101 }
    readonly setBounds = vi.fn()
    constructor(readonly options: any) { views.push(this) }
  }
  return { handlers, views, sessions, WebContentsView,
    ipcMain: { handle: (key: string, fn: Function) => handlers.set(key, fn), removeHandler: (key: string) => handlers.delete(key) },
    session: { fromPartition: (key: string) => {
      if (!sessions.has(key)) sessions.set(key, { fetch:vi.fn(async()=>new Response('{}')), resolveHost: vi.fn(async()=>({endpoints:[{address:'8.8.8.8'}]})), webRequest: { onBeforeRequest: vi.fn() }, setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn(), on: vi.fn(), clearStorageData: vi.fn(async () => {}) })
      return sessions.get(key)
    } },
  }
})
vi.mock('electron', () => native)
import { DesktopSystemViews } from '../src/system-views.ts'
import { SYSTEM_VIEW_CHANNEL } from '../src/system-view-contract.ts'
describe('native embedded system views', () => {
  afterEach(()=>vi.useRealTimers())
  beforeEach(() => { native.handlers.clear(); native.views.length = 0; native.sessions.clear() })
  function fixture() {
    const signal = new AbortController(), frame = { url: 'http://127.0.0.1:43120/' }
    const window = { webContents: { id: 7, mainFrame: frame, getZoomFactor: () => 1 },
      contentView: { addChildView: vi.fn(), removeChildView: vi.fn() }, isDestroyed: () => false,
      getContentBounds: () => ({ x: 0, y: 0, width: 1200, height: 800 }) }
    const resolver = vi.fn(async () => ({ owner: 'env:tenant:user', url: 'https://erp.fsstory.net/erp', signal: signal.signal }))
    const manager = new DesktopSystemViews(window as unknown as BrowserWindow, 'http://127.0.0.1:43120', resolver)
    const invoke = (value: unknown, sender = window.webContents, senderFrame = frame) => native.handlers.get(SYSTEM_VIEW_CHANNEL)!({ sender, senderFrame } as unknown as IpcMainInvokeEvent, value)
    const show = { action: 'show', appId: 'erp', bounds: { x: 264, y: 88, width: 936, height: 712 } }
    return { signal, window, resolver, manager, invoke, show }
  }
  it('allows only the trusted main frame and typed actions, never renderer URLs or tenants', async () => {
    const f = fixture()
    for (const value of [{ ...f.show, url: 'https://evil.invalid' }, { ...f.show, owner: 'another' }, { ...f.show, action: 'execute' }, { ...f.show, bounds: { x: NaN, y: 0, width: 1, height: 1 } }]) expect((await f.invoke(value)).ok).toBe(false)
    expect((await f.invoke(f.show, { ...f.window.webContents, id: 99 })).ok).toBe(false)
    expect((await f.invoke(f.show, f.window.webContents, { url: 'http://127.0.0.1:43120/' })).ok).toBe(false)
    expect(native.views).toHaveLength(0)
    f.manager.dispose()
  })
  it('keeps one isolated view per system, detaches when hidden and revokes storage on auth loss', async () => {
    const f = fixture()
    expect((await f.invoke(f.show)).ok).toBe(true)
    expect((await f.invoke(f.show)).ok).toBe(true)
    expect(native.views).toHaveLength(1)
    const view = native.views[0]
    expect(view.options.webPreferences).toMatchObject({ contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true })
    expect(view.options.webPreferences.preload).toBeUndefined()
    expect(view.webContents.loadURL).toHaveBeenCalledWith('https://erp.fsstory.net/erp')
    expect((await f.invoke({ action: 'hide', appId: 'erp' })).ok).toBe(true)
    expect(f.window.contentView.removeChildView).toHaveBeenCalled()
    expect(view.webContents.close).not.toHaveBeenCalled()
    f.signal.abort();await Promise.resolve()
    expect(view.webContents.close).toHaveBeenCalled()
    expect([...native.sessions.values()][0].clearStorageData).toHaveBeenCalled()
    f.manager.dispose();expect(native.handlers.size).toBe(0)
  })
  it('blocks guest local/private requests, unexpected navigation, popups and downloads', async () => {
    const f = fixture();await f.invoke(f.show)
    const ses = [...native.sessions.values()][0], guard = ses.webRequest.onBeforeRequest.mock.calls[0][0]
    for (const url of ['http://127.0.0.1:43120/', 'https://localhost/', 'https://192.168.1.1/', 'file:///C:/secret']) {
      const callback = vi.fn();guard({url}, callback);expect(callback).toHaveBeenCalledWith({cancel:true})
    }
    ses.resolveHost.mockResolvedValueOnce({endpoints:[{address:'127.0.0.1'}]})
    const rebound=vi.fn();guard({url:'https://public-looking.fsstory.net/'},rebound);await Promise.resolve()
    expect(rebound).toHaveBeenCalledWith({cancel:true})
    const view = native.views[0], open = view.webContents.setWindowOpenHandler.mock.calls[0][0]
    expect(open({url:'https://evil.invalid'})).toEqual({action:'deny'})
    const navigate = view.webContents.on.mock.calls.find(([name]: string[]) => name === 'will-navigate')[1]
    const event={preventDefault:vi.fn()};navigate(event,'https://evil.invalid/');expect(event.preventDefault).toHaveBeenCalled()
    f.manager.dispose()
  })
  it('ignores pending authorization completed after disposal or abort', async () => {
    const f = fixture();let finish!: Function
    f.resolver.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const showing=f.invoke(f.show);f.manager.dispose()
    finish({owner:'env:tenant:user',url:'https://erp.fsstory.net/',signal:f.signal.signal})
    expect((await showing).ok).toBe(false);expect(native.views).toHaveLength(0)
  })
  it('uses a new partition when Host identity changes and hide invalidates pending shows', async () => {
    const f=fixture();await f.invoke(f.show)
    const oldSession=[...native.sessions.values()][0], oldView=native.views[0]
    f.resolver.mockResolvedValueOnce({owner:'env:another:user',url:'https://erp.fsstory.net/erp',signal:new AbortController().signal})
    expect((await f.invoke(f.show)).ok).toBe(true)
    expect(native.sessions.size).toBe(2);expect(oldSession.clearStorageData).toHaveBeenCalled();expect(oldView.webContents.close).toHaveBeenCalled()
    let finish!:Function
    f.resolver.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const showing=f.invoke(f.show);await f.invoke({action:'hide',appId:'erp'})
    finish({owner:'env:another:user',url:'https://erp.fsstory.net/erp',signal:new AbortController().signal})
    expect((await showing).ok).toBe(false)
    f.manager.dispose()
  })
  it('establishes a private session before loading, exactly once for duplicate shows',async()=>{
    const f=fixture(),prepare=vi.fn(async()=>{})
    f.resolver.mockResolvedValue({owner:'env:tenant:user',url:'https://erp.fsstory.net/erp',signal:f.signal.signal,prepare} as never)
    expect((await f.invoke(f.show)).ok).toBe(true)
    expect(prepare).toHaveBeenCalledOnce()
    expect(prepare.mock.invocationCallOrder[0]).toBeLessThan(native.views[0].webContents.loadURL.mock.invocationCallOrder[0])
    expect((await f.invoke(f.show)).ok).toBe(true);expect(prepare).toHaveBeenCalledOnce()
    f.manager.dispose()
  })
  it('recovers expired guest sessions, preserves valid pages and stops after logout',async()=>{
    vi.useFakeTimers()
    const f=fixture(),prepare=vi.fn(async()=>false)
    f.resolver.mockResolvedValue({owner:'env:tenant:user',url:'https://erp.fsstory.net/erp',signal:f.signal.signal,prepare} as never)
    await f.invoke(f.show)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(prepare).toHaveBeenCalledTimes(2)
    expect(native.views[0].webContents.reload).not.toHaveBeenCalled()
    prepare.mockResolvedValueOnce(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(native.views[0].webContents.reload).toHaveBeenCalledOnce()
    f.signal.abort()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(prepare).toHaveBeenCalledTimes(3)
    f.manager.dispose()
  })
  it('retries a failed session check and ignores recovery completed after disposal',async()=>{
    vi.useFakeTimers()
    const f=fixture(),prepare=vi.fn(async()=>false)
    f.resolver.mockResolvedValue({owner:'env:tenant:user',url:'https://erp.fsstory.net/erp',signal:f.signal.signal,prepare} as never)
    await f.invoke(f.show)
    prepare.mockRejectedValueOnce(Error('offline'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(native.views[0].webContents.close).not.toHaveBeenCalled()
    let finish!:(value:boolean)=>void
    prepare.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    await vi.advanceTimersByTimeAsync(60_000)
    f.manager.dispose();finish(true)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(prepare).toHaveBeenCalledTimes(3)
    expect(native.views[0].webContents.reload).not.toHaveBeenCalled()
  })
})
