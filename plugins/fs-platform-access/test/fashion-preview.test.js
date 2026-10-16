import test from 'node:test'
import assert from 'node:assert/strict'
import {renderFashionResult,mountAgentImages} from '../lib/agent-images-host.js'
import {fashionGalleryDefinition,uniqueFashionGallery} from '../lib/client/fashion-gallery.js'
import {mountFashionPreviews} from '../lib/client/fashion-preview.js'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {exportFashionFile} from '../lib/fashion-files.js'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {Readable} from 'node:stream'
test('successful fashion tools expose durable image content and keep receipt text separate',()=>{
 const preview={attachmentId:'sha256:'+'a'.repeat(64),mediaType:'image/png',width:800,height:1200,bytes:1000,name:'dress.png'}
 const blocks=renderFashionResult({status:'succeeded',imagePath:'fashion-output/dress.png',preview})
 assert.equal(blocks[1].type,'image');assert.deepEqual(blocks[1].attachment,preview)
 assert.equal(JSON.parse(blocks[0].text).preview,undefined)
 assert.equal(JSON.parse(blocks[0].text).imagePath,'fashion-output/dress.png')
 assert.equal(renderFashionResult({status:'unknown'}).length,1)
 const paired=renderFashionResult({preview,sourcePreview:{...preview,name:'原图.png'}})
 assert.equal(paired.length,3);assert.equal(paired[2].attachment.name,'原图.png')
})
test('completed-turn gallery keeps distinct pictures and omits later results',()=>{
 const item=(seq,id)=>({seq,callId:String(seq),content:[{type:'image',attachment:{attachmentId:id}}]})
 assert.deepEqual(uniqueFashionGallery([item(1,'a'),item(2,'a'),item(3,'b'),item(6,'c')],4).map(row=>row.seq),[1,3])
})
test('gallery records only successful correlated fashion image outputs',()=>{
 let state=fashionGalleryDefinition.start({}, {event:{type:'turn/start',data:{turn:1}}})
 state=fashionGalleryDefinition.update({state},{event:{type:'tool/call',data:{callId:'c1',name:'fashion_image_generate'}}})
 const result={type:'tool/result',seq:3,data:{message:{source:{callId:'c1'},content:[{type:'tool-result',content:[{type:'image',attachment:{attachmentId:'a'}}]}]}}}
 state=fashionGalleryDefinition.update({state},{event:result});assert.equal(state.items.length,1)
 assert.equal(fashionGalleryDefinition.update({state},{event:{...result,data:{message:{...result.data.message,source:{callId:'unrelated'}}}}}).items.length,1)
 assert.equal(fashionGalleryDefinition.update({state},{event:{...result,data:{message:{...result.data.message,content:[{...result.data.message.content[0],isError:true}]}}}}).items.length,1)
})
test('turn-tail uses the native matched currency and displays cards without expanding tools',()=>{
 let tail
 const slots={inject:(_name,callback)=>callback(),register:(options,component)=>{if(options.name==='conversation.chat.turnTail')tail=component;return ()=>{}}}
 mountFashionPreviews({slots,inject:(_services,callback)=>callback({effect:()=>{}})})
 const html=renderToStaticMarkup(createElement(tail,{sessionId:'s',openFile:()=>{},matched:[{seq:1,callId:'c',content:[{type:'text',text:'{}'},{type:'image',attachment:{attachmentId:'a',width:100,height:200}}]}]}))
 assert.match(html,/本轮生成图片/);assert.match(html,/data-fashion-preview/);assert.match(html,/100 × 200/)
})
test('original export preserves bytes, is idempotent and refuses overwrite or path escape',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-export-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const workspace=path.join(root,'workspace'),downloads=path.join(root,'downloads'),id='10000000-0000-4000-8000-000000000001'
 await mkdir(path.join(workspace,'fashion-output'),{recursive:true})
 const bytes=await sharp({create:{width:8,height:12,channels:4,background:'red'}}).png().toBuffer()
 await writeFile(path.join(workspace,'fashion-output',id+'.png'),bytes)
 const file=await exportFashionFile(workspace,id,downloads)
 assert.deepEqual(await readFile(file),bytes)
 assert.equal(await exportFashionFile(workspace,id,downloads),file)
 await writeFile(file,'user modified')
 await assert.rejects(exportFashionFile(workspace,id,downloads),/CONFLICT/)
 assert.equal((await readFile(file)).toString(),'user modified')
 await assert.rejects(exportFashionFile(workspace,'../escape',downloads),/INVALID/)
})
test('export endpoint rejects cross-origin, nonlocal and injected identity fields before authorization',async()=>{
 let handler,authorized=0
 mountAgentImages({effect:fn=>fn(),webServer:{register:route=>{handler=route.handler;return()=>{}}},inject:()=>{}},'https://platform.fsstory.net',async()=>{authorized++;throw Error('private')},{})
 const invoke=async(body,remote='127.0.0.1',origin='http://127.0.0.1:1234')=>{
  const request=Readable.from([JSON.stringify(body)]);request.method='POST';request.socket={remoteAddress:remote};request.headers={host:'127.0.0.1:1234',origin,'x-futurestaff-fashion':'1'}
  const response={statusCode:0,setHeader:()=>{},end:value=>{response.body=value}}
  await handler(request,response);return response
 }
 const body={sessionId:'s',requestId:'10000000-0000-4000-8000-000000000001'}
 assert.equal((await invoke(body,'192.0.2.1')).statusCode,403)
 assert.equal((await invoke(body,'127.0.0.1','https://example.com')).statusCode,403)
 assert.equal((await invoke({...body,tenantId:'other'})).statusCode,400)
 assert.equal(authorized,0)
 const denied=await invoke(body);assert.equal(authorized,1);assert.equal(denied.statusCode,400);assert.doesNotMatch(denied.body,/private/)
})
