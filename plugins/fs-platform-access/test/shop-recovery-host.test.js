import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {AgentImageService} from '../lib/agent-images.js'

test('restart after lost provider reply and lost OSS reply reuses original image and asset intents',async()=>{
 const identity={accessToken:'fixture-private',agentId:'10000000-0000-4000-8000-000000000001',version:'a'.repeat(64),signal:new AbortController().signal}
 const raw=await sharp({create:{width:750,height:500,channels:3,background:'#164B3B'}}).png().toBuffer()
 let generations=0,uploads=0,commits=0,persistedImage,persistedAsset
 const fetcher=async(url,init)=>{
  if(init.method==='POST'){
   const body=JSON.parse(init.body);generations++;persistedImage={requestId:body.requestId,status:'succeeded'}
   throw new DOMException('client stopped after provider completed','AbortError')
  }
  if(url.pathname.endsWith('/content'))return new Response(raw)
  assert.equal(url.pathname.split('/').at(-1),persistedImage.requestId);return Response.json(persistedImage)
 }
 const shop={call:async(name,args)=>{
  assert.equal(name,'shop_theme_asset_upload');uploads++
  if(!persistedAsset){commits++;persistedAsset={requestId:args.requestId,assetRef:'b'.repeat(32),sha256:'c'.repeat(64),url:'https://shop-test.fsstory.net/api/os?o=fixture'};throw Error('SHOP_RESULT_UNCONFIRMED')}
  assert.equal(args.requestId,persistedAsset.requestId);return persistedAsset
 }}
 const create=()=>new AgentImageService('https://platform.fsstory.net',async()=>identity,shop,fetcher)
 await assert.rejects(create().generate('session',{requestId:'banner-intent-001',tool:'image_model:'+identity.agentId,prompt:'synthetic',size:'1536x1024'}),/RESULT_UNCONFIRMED/)
 const resumed=create(),receipt=await resumed.status('session','banner-intent-001')
 assert.equal(receipt.status,'succeeded')
 const input={imageRequestId:receipt.requestId,requestId:'asset-intent-001',role:'banner'}
 await assert.rejects(resumed.upload('session',input),/SHOP_RESULT_UNCONFIRMED/)
 const asset=await create().upload('session',input)
 assert.equal(asset.assetRef,'b'.repeat(32));assert.equal(generations,1);assert.equal(uploads,2);assert.equal(commits,1)
})
