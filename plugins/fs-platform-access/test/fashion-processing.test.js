import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,rm,stat} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {AgentImageService} from '../lib/agent-images.js'

test('background removal returns only after its transparent output is locally ready',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-process-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const bytes=await sharp({create:{width:5,height:6,channels:4,background:{r:255,g:0,b:0,alpha:0.5}}}).png().toBuffer()
 await writeFile(path.join(root,'dress.png'),bytes)
 const identity={workspacePath:root,agentId:'10000000-0000-4000-8000-000000000001',version:'a'.repeat(64),accessToken:'test',signal:new AbortController().signal}
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async(url,init)=>url.pathname.endsWith('/content')?new Response(bytes):Response.json({status:'succeeded',requestId:JSON.parse(init.body).requestId,inspection:{hasAlpha:true}}))
 const receipt=await service.fashionProcess('s',{requestId:'remove-alpha-001',imagePath:'dress.png',action:'remove_background'})
 assert.equal(receipt.downloadStatus,'succeeded')
 assert.ok((await stat(receipt.path)).size>0)
 assert.equal((await sharp(receipt.path).metadata()).hasAlpha,true)
})

test('processing gateway timeout includes a queryable original UUID instead of permitting another operation',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-timeout-'));t.after(()=>rm(root,{recursive:true,force:true}))
 await writeFile(path.join(root,'dress.png'),await sharp({create:{width:5,height:6,channels:3,background:'red'}}).png().toBuffer())
 const identity={workspacePath:root,agentId:'10000000-0000-4000-8000-000000000001',version:'a'.repeat(64),accessToken:'test',signal:new AbortController().signal}
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async()=>new Response('gateway',{status:504}))
 await assert.rejects(service.fashionProcess('s',{requestId:'remove-timeout-001',imagePath:'dress.png',action:'remove_background'}),error=>/UNCONFIRMED: requestId=[a-f0-9-]{36}/.test(error.message))
})
