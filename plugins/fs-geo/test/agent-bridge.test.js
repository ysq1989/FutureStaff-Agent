import test from 'node:test';
import assert from 'node:assert/strict';
import {GeoAgentBridge} from '../lib/agent-bridge.js';
const id='00000000-0000-4000-8000-000000000001';
test('local GEO bridge is exact-origin, schema-bound, one-use for SSO and retired on owner change',async()=>{
 const controller=new AbortController();let owner={namespace:'https://platform.fsstory.net',tenantId:id,userId:id,permissions:['geo.admin'],signal:controller.signal};
 let calls=0,opens=0,closed=0,wrongProjection=false;
 const bridge=new GeoAgentBridge({authorize:async()=>owner,authorizeBrowser:async input=>{calls++;return {redirectUrl:input.redirectUri+'?code='+'a'.repeat(43)+'&state='+input.state}},lookupAccount:async input=>({tenantId:wrongProjection?'00000000-0000-4000-8000-000000000002':owner.tenantId,userId:owner.userId,projectId:input.projectId,account:{id:input.accountId,platform:'toutiao',label:'Fixture'}}),profiles:()=>({open:async accountId=>{opens++;return {phase:'AWAITING_LOGIN',accountId,publishingVerified:false}},close:()=>{closed++}})});
 try{
  const launch=await bridge.launch();const uri=new URL(launch.url);
  assert.equal(uri.origin,'https://geo.fsstory.net');assert.equal(uri.pathname,'/agent-connect');
  const context=JSON.parse(Buffer.from(uri.hash.split('=')[1],'base64url').toString());
  const request=(body,origin='https://geo.fsstory.net')=>fetch(`http://127.0.0.1:${context.port}/geo-agent/v1`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({cap:context.cap,...body})});
  assert.equal((await request({action:'STATUS'},'https://evil.test')).status,403);
  assert.equal((await request({action:'STATUS',tenantId:'forged'})).status,422);
  assert.equal((await request({action:'STATUS',cap:'wrong'})).status,403);
  assert.equal((await request({action:'STATUS'})).status,200);
  const authorizationRequest={clientId:'futurestaff-geo-prod',redirectUri:'https://geo.fsstory.net/oauth/callback/futurestaff',codeChallenge:'c'.repeat(43),state:'s'.repeat(43)};
  assert.equal((await request({action:'AUTHORIZE',authorizationRequest})).status,200);
  assert.equal((await request({action:'AUTHORIZE',authorizationRequest})).status,409);
  assert.equal(calls,1);
  assert.equal((await request({action:'OPEN_ACCOUNT',projectId:id,accountId:id})).status,200);
  assert.equal(opens,1);
  wrongProjection=true;
  assert.equal((await request({action:'OPEN_ACCOUNT',projectId:id,accountId:id})).status,403);
  assert.equal(opens,1);wrongProjection=false;
  owner={...owner,permissions:['geo.read']};
  assert.equal((await request({action:'OPEN_ACCOUNT',projectId:id,accountId:id})).status,403);
  assert.equal(opens,1);owner={...owner,permissions:['geo.admin']};
  owner={...owner,tenantId:'00000000-0000-4000-8000-000000000002'};
  assert.equal((await request({action:'OPEN_ACCOUNT',projectId:id,accountId:id})).status,403);
  controller.abort();assert.ok(closed>0);
 }finally{await bridge.close()}
});
