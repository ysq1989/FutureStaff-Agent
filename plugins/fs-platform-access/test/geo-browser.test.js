import test from 'node:test';
import assert from 'node:assert/strict';
import {PlatformDevApi} from '../lib/api.js';
test('GEO browser authorization keeps desktop credential in Host and validates fixed callback/state',async()=>{
 const input={clientId:'futurestaff-geo-prod',redirectUri:'https://geo.fsstory.net/oauth/callback/futurestaff',codeChallenge:'c'.repeat(43),state:'s'.repeat(43)};
 let bad=false;
 const api=new PlatformDevApi(async(url,options)=>{
  assert.equal(String(url),'https://platform.fsstory.net/desktop/v1/apps/geo/browser-authorize');
  assert.equal(new Headers(options.headers).get('authorization'),'Bearer desktop-host-only');
  return Response.json({redirectUrl:bad?'https://evil.test/':input.redirectUri+'?code='+'a'.repeat(43)+'&state='+input.state,meta:{contractVersion:'0.1.1',simulated:false}});
 },'https://platform.fsstory.net');
 assert.ok((await api.authorizeGeoBrowser('desktop-host-only',input)).redirectUrl.startsWith(input.redirectUri));
 bad=true;await assert.rejects(api.authorizeGeoBrowser('desktop-host-only',input));
 await assert.rejects(api.authorizeGeoBrowser('desktop-host-only',{...input,clientId:'futurestaff-geo-dev'}));
});
