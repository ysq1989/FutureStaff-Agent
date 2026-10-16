import {createHash} from 'node:crypto'
import {mkdir,realpath,lstat,open,readFile} from 'node:fs/promises'
import path from 'node:path'
import {boundedGarmentPixels} from './fashion-files.js'
import type {ChatImageReader} from './chat.js'

type Ref=Parameters<ChatImageReader>[0]
type Store={readImage(ref:Ref,signal?:AbortSignal):Promise<{data:Uint8Array}>}

/** Only the durable attachment store supplies bytes; no renderer paths or URLs. */
export function createChatImageReader(store:()=>Store|undefined,workspace:(sessionId:string)=>Promise<string>):ChatImageReader{
 return async(ref,sessionId,signal)=>{
  signal.throwIfAborted()
  const attachments=store();if(!attachments)throw Error('ATTACHMENTS_UNAVAILABLE')
  const root=await workspace(sessionId)
  const stored=await attachments.readImage(ref,signal)
  if(stored.data.byteLength>12_000_000)throw Error('IMAGE_TOO_LARGE')
  const bytes=await boundedGarmentPixels(stored.data)
  signal.throwIfAborted()
  if(await workspace(sessionId)!==root)throw Error('AGENT_CHANGED')
  const canonical=await realpath(root),directory=path.join(canonical,'fashion-input')
  await mkdir(directory,{recursive:true})
  if((await lstat(directory)).isSymbolicLink()||await realpath(directory)!==directory)throw Error('IMAGE_PATH_INVALID')
  const name=createHash('sha256').update(bytes).digest('hex')+'.png',target=path.join(directory,name)
  try{const file=await open(target,'wx',0o600);try{await file.writeFile(bytes)}finally{await file.close()}}
  catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error
   if((await lstat(target)).isSymbolicLink()||!(await readFile(target)).equals(bytes))throw Error('IMAGE_REVISION_CONFLICT')}
  signal.throwIfAborted()
  if(await workspace(sessionId)!==root)throw Error('AGENT_CHANGED')
  return {dataUrl:'data:image/png;base64,'+bytes.toString('base64'),path:'fashion-input/'+name}
 }
}
