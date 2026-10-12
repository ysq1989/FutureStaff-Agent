import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizedSystemHome } from '../lib/system-navigation.js'
const app={appId:'vietnam_immigration',tenantId:'a',baseUrl:'https://visa.fsstory.net',deepLinks:{home:'/immigration'},capabilities:['visa.read']}
const snapshot={phase:'ready',activeTenantId:'a',applications:[app]}
test('native authorization resolves only business IDs from current server discovery',()=>{
  assert.equal(authorizedSystemHome(snapshot,'immigration'),'https://visa.fsstory.net/immigration')
  for(const id of ['agent','wecom_album','platform','https://evil.invalid','unknown'])assert.equal(authorizedSystemHome(snapshot,id),null)
  for(const patch of [{phase:'signed_out'},{activeTenantId:'b'},{applications:[{...app,capabilities:[]}]},{applications:[{...app,baseUrl:'http://127.0.0.1:43120'}]}])assert.equal(authorizedSystemHome({...snapshot,...patch},'immigration'),null)
})
