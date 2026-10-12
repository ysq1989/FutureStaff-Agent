import assert from 'node:assert/strict'
import test from 'node:test'
import { PlatformDevAccessController, InMemoryTenantResources } from '../lib/index.js'

const tenantId = '10000000-0000-4000-8000-000000000001'
const userId = '20000000-0000-4000-8000-000000000001'
function fixture() {
  let name = 'A', owner = tenantId, finish
  const session = { accessToken: 'fixture-access-with-entropy', refreshToken: 'fixture-refresh-with-entropy', tokenType: 'Bearer', expiresIn: 900, audience: 'futurestaff-agent-pc-dev', activeTenantId: tenantId }
  const user = () => ({ userId, displayName: name })
  const api = {
    loginWithPassword: async () => ({ session, user: user() }), refresh: async () => ({ session }), logout: async () => {},
    currentUser: async () => ({ activeTenantId: owner, user: user() }),
    listTenants: async () => ({ activeTenantId: tenantId, items: [{ tenantId, displayName: 'Fixture', slug: 'fixture', logoUrl: null, role: 'member' }] }),
    listApplications: async () => ({ activeTenantId: tenantId, items: [] }),
    listModels: async () => ({ activeTenantId: tenantId, activeModelId: null, items: [] }),
  }
  const vault = { value: undefined, async save(value) { this.value = value }, async load() { return this.value }, async clear() { this.value = undefined } }
  const access = new PlatformDevAccessController(api, vault, new InMemoryTenantResources())
  return { access, api, vault, rename: value => { name = value }, otherOwner: () => { owner = '10000000-0000-4000-8000-000000000002' }, pending: () => { api.currentUser = () => new Promise(resolve => { finish = resolve }); return value => finish(value) } }
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('manual refresh rereads the official name and updates the protected profile cache', async () => {
  const f = fixture(); await f.access.login({ loginIdentifier: 'fixture@example.invalid', password: 'fixture' })
  f.rename('B'); await f.access.refresh()
  assert.equal(f.access.getSnapshot().user.displayName, 'B')
  assert.equal(f.vault.value.user.displayName, 'B'); assert.equal(f.access.getSnapshot().user.userId, userId)
  f.access.dispose()
})

test('an active desktop receives a renamed profile within thirty seconds', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] })
  const f = fixture(); await f.access.login({ loginIdentifier: 'fixture@example.invalid', password: 'fixture' })
  f.rename('B'); t.mock.timers.tick(30000); await flush()
  assert.equal(f.access.getSnapshot().user.displayName, 'B'); f.access.dispose()
})

test('a response for another subject never replaces the displayed profile', async () => {
  const f = fixture(); await f.access.login({ loginIdentifier: 'fixture@example.invalid', password: 'fixture' })
  f.rename('B'); f.otherOwner(); await f.access.refresh()
  assert.equal(f.access.getSnapshot().user.displayName, 'A'); assert.equal(f.access.getSnapshot().phase, 'error')
  f.access.dispose()
})
