import {test} from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {AgentImageService,imageRequestUuid} from '../lib/agent-images.js'
const imageRequestId='55e31e6e-453e-44db-9365-4ddae1a9b740'
const identity={accessToken:'private-agent-token',agentId:'696508ad-9c10-4dc3-833b-98355100d746',version:'a'.repeat(64),signal:new AbortController().signal}

test('website design uses the current free model without garment or Shop instructions',async()=>{
 const requests=[]
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async(url,init)=>{
  requests.push([url.href,init]);return Response.json(url.pathname.endsWith('image-tools')?{agentVersion:identity.version,tools:[{name:'image_model:10000000-0000-4000-8000-000000000001',model:'futurestaff-image',sourceType:'futurestaff_ai'}]}:{status:'failed',requestId:imageRequestId})
 })
 await service.websiteGenerate('session',{requestId:imageRequestId,prompt:'工业官网首页，蓝白品牌',size:'1536x1024'})
 const body=JSON.parse(requests.at(-1)[1].body)
 assert.equal(body.freeOnly,true);assert.equal(body.prompt,'工业官网首页，蓝白品牌');assert.deepEqual(body.references,[])
 assert.equal(requests.length,2)
})
test('website design refuses ambiguous or unavailable free model pools before generation',async()=>{
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async()=>Response.json({agentVersion:identity.version,tools:[]}))
 await assert.rejects(service.websiteGenerate('session',{requestId:imageRequestId,prompt:'website',size:'1536x1024'}),/WEBSITE_FREE_MODEL_UNAVAILABLE/)
})
test('readable image intents map consistently and are scoped to the bound session and Agent',()=>{
 const value=imageRequestUuid('session',identity.agentId,'banner-jade-001')
 assert.equal(value,imageRequestUuid('session',identity.agentId,'banner-jade-001'))
 assert.notEqual(value,imageRequestUuid('another-session',identity.agentId,'banner-jade-001'))
 assert.equal(imageRequestUuid('session',identity.agentId,'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
})
test('existing Agent model is invoked once with Host credentials and pinned session binding',async()=>{
 const requests=[]
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async(url,init)=>{requests.push([url.href,init]);throw Error('lost response private-agent-token')})
 await assert.rejects(service.generate('session',{requestId:imageRequestId,tool:'generate_image_openai',prompt:'jade',size:'1536x1024'}),/AGENT_IMAGE_RESULT_UNCONFIRMED/)
 assert.equal(requests.length,1)
 const [url,init]=requests[0];assert.equal(url,'https://platform.fsstory.net/desktop/v1/agents/'+identity.agentId+'/image-requests')
 assert.equal(init.headers.Authorization,'Bearer private-agent-token')
 assert.equal(JSON.parse(init.body).agentVersion,identity.version)
})

test('a non-Error abort preserves the original request id and never resubmits generation',async()=>{
 let count=0
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,{},async()=>{count++;throw 'aborted'})
 await assert.rejects(service.generate('session',{requestId:imageRequestId,tool:'generate_image_openai',prompt:'banner',size:'1536x1024'}),error=>error.message.includes('AGENT_IMAGE_RESULT_UNCONFIRMED')&&error.message.includes(imageRequestId))
 assert.equal(count,1)
})
test('generated binary stays in Host and is compressed before native theme upload',async()=>{
 const raw=await sharp({create:{width:1536,height:1024,channels:3,background:'#164B3B'}}).png().toBuffer()
 let uploaded
 const shop={call:async(name,args)=>{uploaded={name,args};return {assetRef:'a'.repeat(32),bytes:1024}}}
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,shop,async()=>new Response(raw))
 const result=await service.upload('session',{imageRequestId,requestId:'asset-request-123456',role:'banner'})
 assert.equal(result.assetRef,'a'.repeat(32));assert.equal(uploaded.name,'shop_theme_asset_upload')
 assert.match(uploaded.args.requestId,/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/)
 const compressed=Buffer.from(uploaded.args.data,'base64'),meta=await sharp(compressed).metadata()
 assert.equal(meta.width,750);assert.ok(compressed.length<180000);assert.ok(!JSON.stringify(result).includes('private-agent-token'))
})

test('theme upload promotes nested MCP failure to an actionable error without returning image bytes',async()=>{
 const raw=await sharp({create:{width:300,height:150,channels:3,background:'#164B3B'}}).png().toBuffer()
 const shop={call:async()=>({isError:true,content:[{type:'text',text:'THEME_STORAGE_UNAVAILABLE'}]})}
 const service=new AgentImageService('https://platform.fsstory.net',async()=>identity,shop,async()=>new Response(raw))
 await assert.rejects(service.upload('session',{imageRequestId,requestId:'jade-asset-001',role:'banner'}),/THEME_STORAGE_UNAVAILABLE/)
})
