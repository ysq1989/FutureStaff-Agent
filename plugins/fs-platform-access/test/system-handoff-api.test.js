import test from 'node:test'
import assert from 'node:assert/strict'
import {PlatformDevApi} from '../lib/api.js'

test('browser handoffs send a single JSON content type that FastAPI can parse',async()=>{
 const input={clientId:'futurestaff-erp-prod',redirectUri:'https://erp.fsstory.net/oauth/callback/futurestaff',codeChallenge:'c'.repeat(43),state:'s'.repeat(43)}
 const api=new PlatformDevApi(async(url,init)=>{
  assert.equal(new Headers(init.headers).get('content-type'),'application/json')
  const value=JSON.parse(init.body)
  return Response.json(String(url).endsWith('web-authorize')?{code:'a'.repeat(43),state:value.state,meta:{contractVersion:'0.1.1',simulated:false}}:
   {redirectUrl:value.redirectUri+'?code='+'a'.repeat(43)+'&state='+value.state,meta:{contractVersion:'0.1.1',simulated:false}})
 },'https://platform.fsstory.net')
 await api.authorizeModuleBrowser('host-only','erp',input)
 await api.authorizeAiWeb('host-only',{codeChallenge:input.codeChallenge,state:input.state})
 await api.authorizeGeoBrowser('host-only',{...input,clientId:'futurestaff-geo-prod',redirectUri:'https://geo.fsstory.net/oauth/callback/futurestaff'})
})
