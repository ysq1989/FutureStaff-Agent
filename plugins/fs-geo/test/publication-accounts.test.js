import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {ToutiaoAccountProfiles} from '../lib/publisher.js';

test('headlines login profiles are local, owner-isolated and retired on identity revocation',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'geo-accounts-'));
 const accountId='00000000-0000-4000-8000-000000000009';
 const controller=new AbortController();
 const owner={namespace:'https://platform.fsstory.net',tenantId:'00000000-0000-4000-8000-000000000001',userId:'00000000-0000-4000-8000-000000000002',permissions:['geo.operator'],signal:controller.signal};
 let current=owner,opened=[],closed=0;
 const profiles=new ToutiaoAccountProfiles(root,async()=>current,async input=>{opened.push(input);return {close:()=>{closed++}}});
 try{
  assert.equal((await profiles.open(accountId)).phase,'AWAITING_LOGIN');
  assert.equal(opened[0].url,'https://mp.toutiao.com/auth/page/login');
  assert.ok(opened[0].profileDirectory.startsWith(root+path.sep));
  assert.equal(opened[0].profileDirectory.includes(owner.userId),false);
  await profiles.open(accountId);assert.equal(opened.length,1);
  controller.abort();assert.equal(closed,1);
  await assert.rejects(profiles.open(accountId));
  current={...owner,userId:'00000000-0000-4000-8000-000000000003',signal:new AbortController().signal};
  await profiles.open(accountId);assert.notEqual(opened[0].profileDirectory,opened[1].profileDirectory);
  current={...current,permissions:['geo.read']};await assert.rejects(profiles.open(accountId),/权限/);
  await assert.rejects(profiles.open('../escape'));
 }finally{profiles.close();await rm(root,{recursive:true,force:true})}
});
