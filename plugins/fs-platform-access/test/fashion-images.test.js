import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {AgentImageService} from '../lib/agent-images.js'

test('fashion inputs stay in the bound Agent workspace and use free-only reference generation',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-agent-'))
 try{
  await writeFile(path.join(root,'coat.png'),await sharp({create:{width:100,height:120,channels:3,background:'white'}}).png().toBuffer())
  const identity={workspacePath:root,agentId:'10000000-0000-4000-8000-000000000001',version:'a'.repeat(64),accessToken:'test-only',signal:new AbortController().signal}
  let calls=0
  const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async(url,init)=>{
   if(url.pathname.endsWith('/image-tools'))return Response.json({agentVersion:identity.version,tools:[{name:'image_model:30000000-0000-4000-8000-000000000001',model:'futurestaff-image',sourceType:'futurestaff_ai',referenceImages:2}]})
   calls++;const body=JSON.parse(init.body)
   assert.equal(body.freeOnly,true);assert.equal(body.references.length,1)
   assert.ok(body.references[0].startsWith('data:image/jpeg;base64,'));assert.equal(body.imagePaths,undefined)
   const metadata=await sharp(Buffer.from(body.references[0].split(',')[1],'base64')).metadata()
   assert.ok(metadata.width>=512&&metadata.height>=512);assert.equal(metadata.hasAlpha,false)
   return Response.json({status:'succeeded'})
  })
  assert.equal((await service.fashionGenerate('session',{requestId:'fashion-preview-1',tool:'image_model:test',prompt:'coat',size:'1024x1024',imagePaths:['coat.png']})).status,'succeeded')
  await assert.rejects(service.fashionGenerate('session',{requestId:'fashion-preview-2',tool:'image_model:test',prompt:'coat',size:'1024x1024',imagePaths:['../outside.png']}))
  assert.equal(calls,1)
 }finally{await rm(root,{recursive:true,force:true})}
})

test('switching the bound Agent during file preparation never sends its images to another Agent',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-switch-'))
 try{
  await writeFile(path.join(root,'coat.png'),await sharp({create:{width:100,height:120,channels:3,background:'white'}}).png().toBuffer())
  const first={workspacePath:root,agentId:'10000000-0000-4000-8000-000000000001',version:'a'.repeat(64),accessToken:'test-only',signal:new AbortController().signal}
  let authorizations=0,calls=0
  const service=new AgentImageService('https://platform.fsstory.net',async()=>++authorizations===1?first:{...first,agentId:'20000000-0000-4000-8000-000000000002'}, {},async()=>{calls++;return Response.json({})})
  await assert.rejects(service.fashionGenerate('session',{requestId:'fashion-switch-1',tool:'image_model:test',prompt:'coat',size:'1024x1024',imagePaths:['coat.png']}))
  assert.equal(calls,0)
 }finally{await rm(root,{recursive:true,force:true})}
})
