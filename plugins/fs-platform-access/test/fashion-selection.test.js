import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,rm,stat} from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {AgentImageService} from '../lib/agent-images.js'
import {nativeImageRequestId} from '../lib/agent-images-host.js'

test('native execution supplies stable usable IDs without model-authored short identifiers',()=>{
 const first=nativeImageRequestId('session','call-1',undefined)
 assert.equal(first,nativeImageRequestId('session','call-1','1'))
 assert.notEqual(first,nativeImageRequestId('session','call-2',undefined))
 assert.match(first,/^native-[a-f0-9]{32}$/)
 assert.equal(nativeImageRequestId('session','call-1','preview-product-001'),'preview-product-001')
})

test('unknown dispatch failures expose the original request UUID for status lookup',async()=>{
 const identity={agentId:'10000000-0000-4000-8000-000000000001',version:'a'.repeat(64),accessToken:'test',signal:new AbortController().signal}
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async()=>new Response('unknown',{status:500}))
 await assert.rejects(service.generate('session',{requestId:'status-check-01',tool:'model',prompt:'x',size:'1024x1024'}),error=>/UNCONFIRMED: requestId=[a-f0-9-]{36}/.test(error.message))
})

test('fashion generation selects the authoritative free tool instead of an invented model identifier',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-selection-'));t.after(()=>rm(root,{recursive:true,force:true}))
 await writeFile(path.join(root,'dress.png'),await sharp({create:{width:4,height:4,channels:3,background:'red'}}).png().toBuffer())
 const tool='image_model:30000000-0000-4000-8000-000000000001'
 const identity={workspacePath:root,agentId:'10000000-0000-4000-8000-000000000001',version:'a'.repeat(64),accessToken:'test',signal:new AbortController().signal}
 let posts=0,requestId
 const output=await sharp({create:{width:6,height:8,channels:3,background:'red'}}).png().toBuffer()
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async(url,init)=>{
  if(url.pathname.endsWith('/image-tools'))return Response.json({agentVersion:identity.version,tools:[{name:tool,model:'futurestaff-image',sourceType:'futurestaff_ai',referenceImages:2}]})
  if(url.pathname.endsWith('/content'))return new Response(output)
  posts++;const body=JSON.parse(init.body);assert.equal(body.tool,tool);assert.equal(body.freeOnly,true);assert.match(body.prompt,/belt width\/hardware/);assert.match(body.prompt,/pocket count/);requestId=body.requestId
  return Response.json({status:'succeeded',requestId})
 })
 const receipt=await service.fashionGenerate('s',{requestId:'preview-check-01',tool:'futurestaff-image',prompt:'dress',size:'1024x1536',imagePaths:['dress.png']})
 assert.equal(receipt.status,'succeeded')
 assert.equal(receipt.downloadStatus,'succeeded')
 assert.ok((await stat(receipt.path)).size>0)
 assert.equal(receipt.imagePath,'fashion-output/'+requestId+'.png')
 assert.equal(posts,1)
})
