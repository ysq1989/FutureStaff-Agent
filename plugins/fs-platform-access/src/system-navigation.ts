import type { AuthorizedApplication } from './contracts.js'
import type { PlatformAccessSnapshot } from './controller.js'

const aliases: Readonly<Record<string, string>> = {
  vietnam_immigration: 'immigration', product_hub: 'hub', futurestaff_ai: 'ai',
}
const systems = new Set(['erp', 'hub', 'shop', 'web', 'ai', 'geo', 'immigration'])
export const systemApplicationId = (id: string): string => aliases[id] ?? id

/** Navigation uses current server discovery, never a renderer-supplied URL. */
export function applicationHome(snapshot: Pick<PlatformAccessSnapshot, 'phase' | 'activeTenantId'>, app: AuthorizedApplication): string | null {
  if (snapshot.phase !== 'ready' || !snapshot.activeTenantId || app.tenantId !== snapshot.activeTenantId || !app.capabilities.length) return null
  try {
    const base = new URL(app.baseUrl)
    if (base.protocol !== 'https:' || base.username || base.password
      || !(base.hostname === 'fsstory.net' || base.hostname.endsWith('.fsstory.net')
        || (systemApplicationId(app.appId) === 'ai' && base.hostname === 'ai.erplucky.com')
        || (systemApplicationId(app.appId) === 'shop' && base.hostname.includes('.')
          && !base.hostname.includes(':') && !/^\d+(\.\d+){3}$/.test(base.hostname)
          && !/\.(local|localhost|internal|invalid|test)$/.test(base.hostname)))) return null
    const path = app.deepLinks.home ?? '/'
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null
    const home = new URL(path, base)
    return home.origin === base.origin ? home.href : null
  } catch { return null }
}

export function authorizedSystemHome(snapshot: PlatformAccessSnapshot, id: string): string | null {
  if (!systems.has(id)) return null
  for (const app of snapshot.applications) {
    if (systemApplicationId(app.appId) !== id) continue
    const home = applicationHome(snapshot, app)
    if (home) return home
  }
  return null
}
