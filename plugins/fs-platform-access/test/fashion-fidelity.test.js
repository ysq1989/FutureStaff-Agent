import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {createSourceDetail,readSourceDetail,garmentPreservationPrompt,modelGarmentReference} from '../lib/fashion-fidelity.js'

test('detail material copies source pixels and records immutable provenance',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-fidelity-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const raw=Buffer.from(Array.from({length:40*30*3},(_,i)=>(i*29)%256))
 await writeFile(path.join(root,'source.png'),await sharp(raw,{raw:{width:40,height:30,channels:3}}).png().toBuffer())
 const id='10000000-0000-4000-8000-000000000001',region={left:8,top:4,width:12,height:16}
 const receipt=await createSourceDetail(root,id,'source.png',region,'腰带原图细节')
 const expected=await sharp(path.join(root,'source.png')).ensureAlpha().extract(region).raw().toBuffer()
 assert.deepEqual(await sharp(path.join(root,receipt.imagePath)).raw().toBuffer(),expected)
 assert.equal(receipt.fidelityMode,'source-crop');assert.equal(receipt.pixelPreservationVerified,true)
 assert.equal((await readSourceDetail(root,id)).sourceImagePath,'source.png')
 assert.deepEqual(await createSourceDetail(root,id,'source.png',region,'腰带原图细节'),receipt)
 await assert.rejects(createSourceDetail(root,id,'source.png',{...region,left:9},'腰带原图细节'),/CONFLICT/)
 await writeFile(path.join(root,receipt.imagePath),'tampered')
 await assert.rejects(readSourceDetail(root,id),/INVALID|CONFLICT/)
})
test('source cropping rejects outside geometry and unsafe paths',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-crop-'));t.after(()=>rm(root,{recursive:true,force:true}))
 await writeFile(path.join(root,'source.png'),await sharp({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer())
 const id='10000000-0000-4000-8000-000000000001'
 for(const region of [{left:-1,top:0,width:5,height:5},{left:0,top:0,width:9,height:8},{left:0.5,top:0,width:4,height:4}])await assert.rejects(createSourceDetail(root,id,'source.png',region,'detail'),/REGION/)
 await assert.rejects(createSourceDetail(root,id,'../source.png',{left:0,top:0,width:4,height:4},'detail'),/PATH/)
})
test('generation policy fixes garment attributes and forbids replacing belts or pockets',()=>{
 const prompt=garmentPreservationPrompt('adult model')
 for(const term of ['color','silhouette','belt','pocket','cuff','elastic','reference'])assert.ok(prompt.toLowerCase().includes(term))
 assert.ok(prompt.endsWith('adult model'))
 assert.ok(garmentPreservationPrompt('x'.repeat(13500)).length<=15000)
})
test('tiny model references get an opaque bounded copy without changing the source artifact',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-reference-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const input=await sharp({create:{width:310,height:65,channels:4,background:{r:229,g:165,b:126,alpha:1}}}).png().toBuffer()
 const file=path.join(root,'belt.png');await writeFile(file,input)
 const reference=await modelGarmentReference(root,'belt.png'),encoded=Buffer.from(reference.split(',')[1],'base64')
 assert.match(reference,/^data:image\/jpeg;base64,/)
 const meta=await sharp(encoded).metadata();assert.equal(meta.width,512);assert.equal(meta.height,512);assert.equal(meta.hasAlpha,false);assert.ok(encoded.length<2000000)
 assert.deepEqual(await readFile(file),input)
 const center=await sharp(encoded).extract({left:256,top:256,width:1,height:1}).raw().toBuffer()
 for(const [i,value] of [229,165,126].entries())assert.ok(Math.abs(center[i]-value)<=3)
})
