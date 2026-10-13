import assert from 'node:assert/strict'
import test from 'node:test'
import { PlatformDevApi } from '../lib/api.js'

const tenantId = '10000000-0000-4000-8000-000000000001'
const web = {
  appId: 'web', tenantId, displayName: '官网管理', baseUrl: 'https://website.example.invalid',
  deepLinks: { home: '/' }, capabilities: ['web.manage'], contractRange: '^0.1.0',
  canManage: true, applicationId: 'futurestaff-web', permissions: ['web.manage'],
  mcpUrl: 'https://website.example.invalid/mcp', tokenExchangePath: '/api/website-control/v1/agent-token',
}
const client = item => new PlatformDevApi(async () => Response.json({
  activeTenantId: tenantId, items: [item], meta: { contractVersion: '0.1.1', simulated: false },
}), 'https://platform.fsstory.net')

test('website management discovery extension preserves the existing desktop application projection', async () => {
  const result = await client(web).listApplications('fixture-token', tenantId)
  assert.equal(result.items[0].appId, 'web')
  assert.equal(result.items[0].tenantId, tenantId)
  assert.deepEqual(result.items[0].capabilities, ['web.manage'])
  assert.equal(result.items[0].mcpUrl, undefined)
  assert.equal(result.items[0].permissions, undefined)
})

for (const [name, patch] of [
  ['unknown fields', { unexpectedAuthority: true }],
  ['malformed management flag', { canManage: 'true' }],
  ['foreign website identity', { applicationId: 'futurestaff-shop' }],
  ['foreign MCP origin', { mcpUrl: 'https://foreign.example.invalid/mcp' }],
  ['embedded MCP credentials', { mcpUrl: 'https://user:password@website.example.invalid/mcp' }],
  ['unexpected exchange path', { tokenExchangePath: '//foreign.example.invalid/token' }],
  ['permissions outside base capabilities', { permissions: ['web.delete_all'] }],
  ['foreign tenant', { tenantId: '10000000-0000-4000-8000-000000000002' }],
  ['incomplete extension', { mcpUrl: undefined }],
]) {
  test(`website discovery still rejects ${name}`, async () => {
    await assert.rejects(client({ ...web, ...patch }).listApplications('fixture-token', tenantId),
      error => error.code === 'CONTRACT_MISMATCH')
  })
}
