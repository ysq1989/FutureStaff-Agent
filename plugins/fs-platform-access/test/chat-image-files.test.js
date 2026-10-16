import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,symlink,rm} from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {createChatImageReader} from '../lib/chat-images.js'
const signal=()=>new AbortController().signal
test('verified attachments are normalized once into the bound agent workspace',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-chat-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const data=await sharp({create:{width:20,height:20,channels:3,background:'red'}}).png().toBuffer()
 const reader=createChatImageReader(()=>({readImage:async()=>({data})}),async()=>root)
 const first=await reader({},'s',signal()),second=await reader({},'s',signal())
 assert.deepEqual(first,second)
 assert.match(first.path,/^fashion-input\/[a-f0-9]{64}\.png$/)
 assert.equal(first.dataUrl,'data:image/png;base64,'+(await readFile(path.join(root,first.path))).toString('base64'))
})
test('identity changes and attachment store failures cannot expose private errors',async()=>{
 const reader=createChatImageReader(()=>({readImage:async()=>{throw Error('integrity')}}),async()=>'/unused')
 await assert.rejects(reader({},'s',signal()),/integrity/)
 const data=await sharp({create:{width:2,height:2,channels:3,background:'red'}}).png().toBuffer()
 let calls=0
 const changed=createChatImageReader(()=>({readImage:async()=>({data})}),async()=>++calls===1?'/old':'/new')
 await assert.rejects(changed({},'s',signal()),/AGENT_CHANGED/)
})
test('input directory symlinks never redirect writes outside the agent',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-chat-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const outside=path.join(root,'outside');await mkdir(outside)
 const workspace=path.join(root,'agent');await mkdir(workspace)
 await symlink(outside,path.join(workspace,'fashion-input'),'junction')
 const data=await sharp({create:{width:2,height:2,channels:3,background:'red'}}).png().toBuffer()
 const reader=createChatImageReader(()=>({readImage:async()=>({data})}),async()=>workspace)
 await assert.rejects(reader({},'s',signal()),/IMAGE_PATH_INVALID/)
})
