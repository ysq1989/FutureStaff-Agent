import fs from 'node:fs'
import crypto from 'node:crypto'
import sharp from 'sharp'
const root='C:/Users/10089/.futurestaff/workspaces/production/6e7db441-c4ea-4f16-8261-9e1a5379b2ff/users/242ab148-8370-4d54-b6bb-da4bbee4a0f3/agents/272dafc9-be91-4203-a696-e6013b43bb64/workspace'
const ids=['cfd390de-d7ff-4577-ac05-dcbabe9b093b','8643ccf9-6b93-4d33-a61b-22240960a4cd','429e1ee1-3975-48b7-af1f-2657c1b2c053']
const rows=[]
for(const id of ids){
 const imagePath='fashion-output/'+id+'.png',raw=fs.readFileSync(root+'/'+imagePath)
 const metadata=await sharp(raw).metadata()
 const pixels=await sharp(raw).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let transparent=0,opaque=0
 for(let i=3;i<pixels.data.length;i+=4){if(pixels.data[i]===0)transparent++;if(pixels.data[i]===255)opaque++}
 if(metadata.format!=='png'||!metadata.width||!metadata.height)throw Error('Invalid delivery file')
 rows.push({id,imagePath,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),format:metadata.format,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,transparentPixels:transparent,opaquePixels:opaque})
}
if(!rows[2].hasAlpha||!rows[2].transparentPixels||!rows[2].opaquePixels)throw Error('Cutout lacks real transparent/foreground pixels')
fs.writeFileSync('output/fashion-full-flow-20261014/final-file-verification.json',JSON.stringify({passed:true,rows},null,2))
console.log(JSON.stringify({passed:true,files:rows.map(({width,height,hasAlpha,bytes})=>({width,height,hasAlpha,bytes})),cutoutHasTransparentBackground:true}))
