import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,createHash} from 'node:crypto'
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import {boundedGarmentPixels,inspectGarmentFile} from '../lib/fashion-files.js'

test('complex downloaded PNG stays intact while the vision copy fits the fixed byte budget',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'fashion-budget-'));t.after(()=>rm(root,{recursive:true,force:true}))
 const bytes=await sharp(randomBytes(1000*1000*3),{raw:{width:1000,height:1000,channels:3}}).png({compressionLevel:0}).toBuffer()
 assert.ok(bytes.length>2_000_000)
 await writeFile(path.join(root,'download.png'),bytes)
 const view=await boundedGarmentPixels(bytes)
 assert.ok(view.length<=2_000_000)
 assert.equal((await sharp(view).metadata()).format,'png')
 const inspection=await inspectGarmentFile(root,'download.png')
 assert.equal(inspection.width,1000);assert.equal(inspection.height,1000)
 assert.equal(inspection.bytes,bytes.length)
 assert.equal(inspection.sha256,createHash('sha256').update(bytes).digest('hex'))
 assert.deepEqual(await readFile(path.join(root,'download.png')),bytes)
})
