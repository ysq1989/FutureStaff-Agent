import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {open,readFile,lstat,realpath} from 'node:fs/promises'
import path from 'node:path'
import {garmentFile,saveFashionImage} from './fashion-files.js'
export interface DetailRegion {left:number;top:number;width:number;height:number}
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
export function garmentPreservationPrompt(prompt:string):string{
 if(prompt.length>13500)throw Error('FASHION_PROMPT_TOO_LONG')
 return `REFERENCE GARMENT IDENTITY IS MANDATORY. Edit the supplied reference garment onto the requested adult model; do not design a similar dress. Preserve exact reference color tone and fabric appearance, silhouette/length/pleats, collar, button placement, belt width/hardware, pocket count/location/flap/embroidery, sleeve length and folded cuff construction. Treat the reference as the only garment identity. Describe visible fasteners by their actual solid/open shape, material appearance and stud count, not a generic buckle stereotype. When the reference has a solid textile overlap with small studs, keep it solid, without an invented frame or hole. Do not substitute an elastic/smocked waistband, sash, bow, large buckle, extra pocket, unflapped patch pocket, missing embroidery, long sleeve or changed skirt shape. Default to a relaxed front pose and neutral studio light; honor an explicitly requested scene or pose while keeping garment features visible. Adapt only garment drape to the body; retain its construction. Product features override creative styling. No unsupported fabric claims or added text/watermarks/invented logos; retain existing embroidery and markings visible in the reference. If a requested style conflicts with garment identity, preserve the garment.\nREQUEST:\n${prompt}`
}
/** Provider-only copy: normalize opaque RGB and pad tiny crops without distorting their content. */
export async function modelGarmentReference(root:string|undefined,imagePath:string){
 const normalized=await sharp(await garmentFile(root,imagePath),{limitInputPixels:4000000}).rotate().flatten({background:'#ffffff'}).resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).png().toBuffer({resolveWithObject:true})
 const horizontal=Math.max(0,512-normalized.info.width),vertical=Math.max(0,512-normalized.info.height)
 for(const quality of [95,90,85]){
  const encoded=await sharp(normalized.data).extend({left:Math.floor(horizontal/2),right:Math.ceil(horizontal/2),top:Math.floor(vertical/2),bottom:Math.ceil(vertical/2),background:'#ffffff'}).jpeg({quality,chromaSubsampling:'4:4:4'}).toBuffer()
  if(encoded.length<=2000000)return 'data:image/jpeg;base64,'+encoded.toString('base64')
 }
 throw Error('FASHION_REFERENCE_TOO_LARGE')
}
async function sourceCrop(root:string|undefined,imagePath:string,region:DetailRegion){
 const source=await garmentFile(root,imagePath)
 const oriented=await sharp(source,{limitInputPixels:4000000}).rotate().ensureAlpha().raw().toBuffer({resolveWithObject:true})
 if(!region||Object.keys(region).sort().join(',')!=='height,left,top,width'||Object.values(region).some(value=>!Number.isSafeInteger(value))||region.left<0||region.top<0||region.width<4||region.height<4||region.left+region.width>oriented.info.width||region.top+region.height>oriented.info.height)throw Error('FASHION_DETAIL_REGION_INVALID')
 const pixels=await sharp(oriented.data,{raw:oriented.info}).extract(region).raw().toBuffer()
 const bytes=await sharp(pixels,{raw:{width:region.width,height:region.height,channels:4}}).png().toBuffer()
 return {sourceSha256:hash(source),pixels,bytes}
}
export async function createSourceDetail(root:string|undefined,id:string,imagePath:string,region:DetailRegion,label:string){
 if(!root||!label||label.length>80)throw Error('FASHION_DETAIL_INVALID')
 const cropped=await sourceCrop(root,imagePath,region)
 const file=await saveFashionImage(root,id,cropped.bytes),imagePathOut='fashion-output/'+id+'.png'
 const receipt={requestId:id,status:'succeeded',imagePath:imagePathOut,path:file,imageRole:'detail',label,fidelityMode:'source-crop',sourceImagePath:imagePath,sourceSha256:cropped.sourceSha256,region:{left:region.left,top:region.top,width:region.width,height:region.height},width:region.width,height:region.height,pixelPreservationVerified:true,reviewStatus:'needs-review',externalModelCalls:0,outputSha256:hash(await readFile(file))}
 const metadata=path.join(await realpath(root),'fashion-output',id+'.source.json'),encoded=Buffer.from(JSON.stringify(receipt))
 try{const handle=await open(metadata,'wx',0o600);try{await handle.writeFile(encoded)}finally{await handle.close()}}
 catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error
  if((await lstat(metadata)).isSymbolicLink()||!(await readFile(metadata)).equals(encoded))throw Error('FASHION_DETAIL_CONFLICT')}
 return receipt
}
export async function readSourceDetail(root:string|undefined,id:string){
 if(!root||!/^[a-f0-9-]{36}$/.test(id))throw Error('FASHION_DETAIL_INVALID')
 const metadata=path.join(await realpath(root),'fashion-output',id+'.source.json')
 let stat
 try{stat=await lstat(metadata)}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096)throw Error('FASHION_DETAIL_INVALID')
 const receipt=JSON.parse((await readFile(metadata)).toString()) as Awaited<ReturnType<typeof createSourceDetail>>
 if(receipt.requestId!==id||receipt.fidelityMode!=='source-crop'||receipt.imagePath!=='fashion-output/'+id+'.png')throw Error('FASHION_DETAIL_INVALID')
 const cropped=await sourceCrop(root,receipt.sourceImagePath,receipt.region)
 let output:Buffer
 try{output=await garmentFile(root,receipt.imagePath)}catch{throw Error('FASHION_DETAIL_INVALID')}
 if(cropped.sourceSha256!==receipt.sourceSha256||hash(output)!==receipt.outputSha256||!(await sharp(output).ensureAlpha().raw().toBuffer()).equals(cropped.pixels))throw Error('FASHION_DETAIL_CONFLICT')
 return receipt
}
