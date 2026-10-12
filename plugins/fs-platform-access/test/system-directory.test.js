import test from 'node:test'
import assert from 'node:assert/strict'
import { systemDirectory, applicationHome } from '../lib/client/system-directory.js'

const app = { appId: 'erp', tenantId: 'a', displayName: 'ERP', baseUrl: 'https://erp-dev.fsstory.net', deepLinks: { home: '/erp' }, capabilities: ['erp.read'] }
const snapshot = { phase: 'ready', activeTenantId: 'a', applications: [app] }
test('directory includes canonical business systems and registered modules without appending internal applications', () => {
  const items = systemDirectory({ ...snapshot, applications: [app, { ...app, appId: 'product_hub' }, { ...app, appId: 'custom', displayName: '扩展系统' }] }, [{ id: 'douyin', title: '抖音获客' }, { id: 'geo', title: 'GEO 品牌运营' }])
  assert.equal(items.filter(item => item.id === 'geo').length, 0)
  assert.equal(items.find(item => item.id === 'douyin').pageId, 'douyin')
  assert.equal(items.find(item => item.id === 'erp').url, 'https://erp-dev.fsstory.net/erp')
  assert.equal(items.find(item => item.id === 'shop'), undefined)
  assert.ok(items.some(item => item.title === '货源集市'))
  assert.ok(items.every(item => item.title !== '扩展系统'))
  assert.ok(items.every(item => item.id !== 'product_hub'))
})
test('platform identifiers resolve to one business entry while self, admin and source connectors stay out', () => {
  const apps = [
    { ...app, appId: 'agent', displayName: '数字员工' },
    { ...app, appId: 'platform', displayName: '管理平台' },
    { ...app, appId: 'wecom_album', displayName: '货源管理系统' },
    { ...app, appId: 'vietnam_immigration', displayName: '越南签证', baseUrl: 'https://visa.fsstory.net', deepLinks: { home: '/immigration' } },
    { ...app, appId: 'futurestaff_ai', displayName: 'AI', baseUrl: 'https://ai.erplucky.com', deepLinks: { home: '/' } },
    { ...app, appId: 'product_hub', displayName: '未来市集', baseUrl: 'https://product.fsstory.net', deepLinks: { home: '/product-hub' } },
  ]
  const items = systemDirectory({ ...snapshot, applications: apps }, [{ id: 'douyin', title: '抖音获客' }])
  assert.equal(items.length, 4)
  assert.ok(items.every(item => !['agent', 'platform', 'wecom_album'].includes(item.id)))
  assert.equal(items.filter(item => item.title === '越南签证').length, 1)
  assert.equal(items.find(item => item.id === 'immigration').url, 'https://visa.fsstory.net/immigration')
  assert.equal(items.find(item => item.id === 'ai').url, 'https://ai.erplucky.com/')
  assert.equal(items.find(item => item.id === 'hub').url, 'https://product.fsstory.net/product-hub')
})
test('authorized Shop AI and GEO entries are visible while absent grants are omitted', () => {
  const apps=['shop','futurestaff_ai','geo'].map(appId=>({...app,appId,baseUrl:'https://'+(appId==='futurestaff_ai'?'ai':appId)+'.fsstory.net'}))
  assert.deepEqual(systemDirectory({...snapshot,applications:apps},[]).map(item=>item.id),['shop','ai','geo'])
  assert.deepEqual(systemDirectory({...snapshot,applications:[]},[]),[])
})
test('only active authenticated subject applications can supply safe first-party navigation', () => {
  assert.equal(applicationHome(snapshot, app), 'https://erp-dev.fsstory.net/erp')
  for (const patch of [{ tenantId: 'b' }, { capabilities: [] }, { baseUrl: 'https://fsstory.net.attacker.invalid' }, { baseUrl: 'javascript:alert(1)' }, { baseUrl: 'https://user:pass@erp.fsstory.net' }, { deepLinks: { home: '//attacker.invalid' } }, { deepLinks: { home: '/\\attacker.invalid' } }]) {
    assert.equal(applicationHome(snapshot, { ...app, ...patch }), null)
  }
  for (const phase of ['loading', 'signed_out', 'error', 'selecting_tenant']) {
    assert.equal(applicationHome({ ...snapshot, phase }, app), null)
  }
})
