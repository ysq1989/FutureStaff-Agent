import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { establishModuleSession } from '../lib/system-sso.js'
const entry={module_id:'erp',client_id:'futurestaff-erp-prod',host:'erp.fsstory.net',auth_base_url:'https://platform.fsstory.net',redirect_uri:'https://erp.fsstory.net/oauth/callback/futurestaff'}
const input={appId:'erp',url:'https://erp.fsstory.net/erp',authority:'https://platform.fsstory.net',userId:'member',tenantId:'tenant',signal:new AbortController().signal}

const webOrigin='https://web.fsstory.net',webState='s'.repeat(32),webChallenge='c'.repeat(43)
const webLocation=input.authority+'/login?'+new URLSearchParams({client_id:'futurestaff-web-prod',redirect_uri:webOrigin+'/oauth/callback/futurestaff',code_challenge_method:'S256',code_challenge:webChallenge,state:webState})
function webFixture(patch={}){
  let established=false;const calls=[]
  return {...input,appId:'web',url:webOrigin+'/',calls,
    fetch:async(url,init)=>{calls.push({url,init});if(url.endsWith('/api/website/session'))return established?Response.json({user:{id:'member',tenantId:'tenant'},realPlatformConnected:true,...patch.session}):new Response('',{status:403});if(url.endsWith('/oauth/start'))return new Response(null,{status:303,headers:{location:patch.location??webLocation}});established=true;return new Response('Website')},
    authorize:async(id,body)=>{assert.equal(id,'web');assert.equal(body.clientId,'futurestaff-web-prod');assert.equal(body.codeChallenge,webChallenge);return{redirectUrl:webOrigin+'/oauth/callback/futurestaff?code=single-use-code&state='+(patch.callbackState??body.state)}}}
}
test('Web uses Website-owned PKCE cookies and verifies the resulting member and subject',async()=>{
  const fixture=webFixture();assert.equal(await establishModuleSession(fixture),true)
  assert.ok(fixture.calls.every(c=>!c.url.includes('/api/auth/module-')))
  assert.equal(fixture.calls.find(c=>c.url.endsWith('/oauth/start')).init.redirect,'manual')
  assert.equal(fixture.calls.find(c=>c.url.includes('/oauth/callback/')).init.credentials,'include')
})
test('Web reuses only the current real Platform-backed Website session',async()=>{
  assert.equal(await establishModuleSession({...input,appId:'web',url:webOrigin+'/',fetch:async()=>Response.json({user:{id:'member',tenantId:'tenant'},realPlatformConnected:true}),authorize:async()=>{throw Error('unnecessary authorization')}}),false)
})
test('Web rejects foreign authority, environment, redirect, PKCE, callback state and final identity',async()=>{
  for(const location of [webLocation.replace('platform.fsstory.net','platform-dev.fsstory.net'),webLocation.replace('futurestaff-web-prod','futurestaff-web-dev'),webLocation.replace(encodeURIComponent(webOrigin),encodeURIComponent('https://evil.invalid')),webLocation.replace('S256','plain')])await assert.rejects(establishModuleSession(webFixture({location})),/SYSTEM_SSO_CONTRACT_MISMATCH/)
  await assert.rejects(establishModuleSession(webFixture({callbackState:'wrong'})),/SYSTEM_SSO_CALLBACK_MISMATCH/)
  for(const session of [{user:{id:'other',tenantId:'tenant'}},{user:{id:'member',tenantId:'other'}},{realPlatformConnected:false}])await assert.rejects(establishModuleSession(webFixture({session})),/SYSTEM_SSO_CONTRACT_MISMATCH/)
})
test('existing same-member module session avoids another login',async()=>{
  let authorized=false
  const recovered=await establishModuleSession({...input,fetch:async()=>Response.json({user:{id:'member',tenant_id:'tenant'},module:{module_id:'erp'}}),authorize:async()=>{authorized=true;throw Error('unexpected')}})
  assert.equal(recovered,false)
  assert.equal(authorized,false)
})
test('new module session uses one-use PKCE proof without a password or copied cookie',async()=>{
  const calls=[];let challenge
  const recovered=await establishModuleSession({...input,fetch:async(url,init)=>{calls.push({url,init});if(url.endsWith('module-session'))return new Response('',{status:401});if(url.endsWith('module-entry'))return Response.json(entry);return Response.json({ok:true})},
    authorize:async(id,body)=>{assert.equal(id,'erp');challenge=body.codeChallenge;return{redirectUrl:entry.redirect_uri+'?code='+'c'.repeat(43)+'&state='+body.state}}})
  const body=JSON.parse(calls.at(-1).init.body)
  assert.equal(recovered,true)
  assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'),challenge)
  assert.deepEqual(Object.keys(body).sort(),['client_id','code','code_verifier','redirect_uri'])
  assert.equal(calls.at(-1).init.credentials,'include')
})
test('foreign module environment is rejected before requesting credentials',async()=>{
  await assert.rejects(establishModuleSession({...input,fetch:async url=>url.endsWith('module-session')?new Response('',{status:401}):Response.json({...entry,auth_base_url:'https://dev.fsstory.net'}),authorize:async()=>{throw Error('must not authorize')}}),/SYSTEM_SSO_CONTRACT_MISMATCH/)
})
test('AI uses its portal session consumer without exposing a platform bearer',async()=>{
  const calls=[]
  await establishModuleSession({...input,appId:'ai',url:'https://ai.erplucky.com/',fetch:async(url,init)=>{calls.push({url,init});return url.endsWith('/session')?new Response('',{status:401}):Response.json({ok:true})},authorize:async()=>{throw Error('wrong protocol')},authorizeAi:async body=>({code:'c'.repeat(43),state:body.state})})
  assert.equal(calls.at(-1).url,'https://ai.erplucky.com/ai-api/auth/desktop')
  assert.deepEqual(Object.keys(JSON.parse(calls.at(-1).init.body)).sort(),['code','codeVerifier','environment','state'])
})
test('GEO reuses server-owned PKCE cookies and verifies the resulting actor',async()=>{
  let established=false
  const state='s'.repeat(43),challenge='c'.repeat(43),origin='https://geo.fsstory.net'
  await establishModuleSession({...input,appId:'geo',url:origin+'/',fetch:async url=>{
    if(url.endsWith('/session'))return established?Response.json({data:{userId:'member',tenantId:'tenant'}}):new Response('',{status:401})
    if(url.endsWith('/start'))return new Response(null,{status:302,headers:{location:input.authority+'/login?client_id=futurestaff-geo-prod&redirect_uri='+encodeURIComponent(origin+'/oauth/callback/futurestaff')+'&code_challenge='+challenge+'&state='+state+'&code_challenge_method=S256'}})
    established=true;return new Response('ok')
  },authorize:async(id,body)=>{assert.equal(id,'geo');assert.equal(body.codeChallenge,challenge);return{redirectUrl:origin+'/oauth/callback/futurestaff?code='+'x'.repeat(43)+'&state='+state}}})
  assert.equal(established,true)
})
