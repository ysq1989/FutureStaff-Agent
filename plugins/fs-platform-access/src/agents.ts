import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { requireUuid } from './contracts.js'
import { assertPlatformOrigin } from './environment.js'
import type { WorkspaceIdentity } from './workspace.js'

export interface AgentCard { agentId: string; name: string; description: string; available: boolean; unavailableReason: string | null }
export interface AgentSnapshot { agentId: string; name: string; description: string; version: string; files: { path: string; content: string }[] }
export interface AgentCredentials { accessToken: string; tenantId: string; userId: string; signal: AbortSignal }
const id = (value: string) => requireUuid({id:value},'id').toLowerCase()
const error = () => new Error('AGENT_CONTRACT_INVALID')
const record = (value: unknown): value is Record<string,unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
export function agentFileAllowed(value: string): boolean {
  if(value.includes('\\')||value.startsWith('/')||value.split('/').some(p=>!p||p.startsWith('.')
    ||/[<>:"|?*\x00-\x1f]/.test(p)||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p)))return false
  return ['soul.md','memory/memory.md','memory.md'].includes(value)
    || /^(skills\/|workspace\/knowledge_base\/).+\.(md|txt|csv)$/i.test(value)
}
export function decodeAgentSnapshot(value: unknown): AgentSnapshot {
  if(!record(value)||Object.keys(value).sort().join()!=='agentId,description,files,name,version'
    ||typeof value.agentId!=='string'||typeof value.name!=='string'||!value.name.trim()||value.name.length>200
    ||typeof value.description!=='string'||value.description.length>2000
    ||typeof value.version!=='string'||!(/^[a-f0-9]{64}$/).test(value.version)
    ||!Array.isArray(value.files)||value.files.length>128)throw error()
  id(value.agentId)
  let size=0;const seen=new Set<string>()
  for(const file of value.files){
    if(!record(file)||Object.keys(file).sort().join()!=='content,path'||typeof file.path!=='string'
      ||!agentFileAllowed(file.path)||typeof file.content!=='string'||Buffer.byteLength(file.content)>65536
      ||seen.has(file.path.toLowerCase()))throw error()
    seen.add(file.path.toLowerCase());size+=Buffer.byteLength(file.content)
  }
  if(size>1024*1024)throw error()
  return structuredClone(value) as unknown as AgentSnapshot
}

export async function fetchAgentData(origin: string, credentials: AgentCredentials, agentId?: string, fetcher=globalThis.fetch): Promise<unknown> {
  assertPlatformOrigin(origin)
  const response=await fetcher(`${origin}/desktop/v1/agents${agentId?`/${id(agentId)}/snapshot`:''}`,{
    headers:{authorization:`Bearer ${credentials.accessToken}`},redirect:'error',cache:'no-store',
    signal:AbortSignal.any([credentials.signal,AbortSignal.timeout(15000)]),
  })
  if(!response.ok){await response.body?.cancel();throw new Error('AGENT_UNAVAILABLE')}
  const reader=response.body?.getReader();if(!reader)throw error()
  const chunks:Uint8Array[]=[];let size=0
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2*1024*1024)throw error();chunks.push(part.value)}}finally{await reader.cancel()}
  credentials.signal.throwIfAborted()
  const body:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if(!record(body)||body.contractVersion!=='1.0.0'||body.activeTenantId!==credentials.tenantId)throw error()
  if(agentId){const result=decodeAgentSnapshot(body.snapshot);if(result.agentId!==id(agentId))throw error();return result}
  if(!Array.isArray(body.items)||body.items.length>200)throw error()
  const seen=new Set<string>()
  return body.items.map(item=>{
    if(!record(item)||Object.keys(item).sort().join()!=='agentId,available,description,name,unavailableReason'
      ||typeof item.agentId!=='string'||typeof item.name!=='string'||!item.name.trim()||item.name.length>200
      ||typeof item.description!=='string'||item.description.length>2000||typeof item.available!=='boolean'
      ||!(item.unavailableReason===null||typeof item.unavailableReason==='string'))throw error()
    const agent=id(item.agentId);if(seen.has(agent))throw error();seen.add(agent)
    return {...item,agentId:agent} as unknown as AgentCard
  })
}

async function realDirectory(directory:string):Promise<void>{
  const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('AGENT_DIRECTORY_UNSAFE')
}
async function ensureTree(directory:string):Promise<void>{
  const parent=path.dirname(directory)
  if(parent!==directory)await ensureTree(parent)
  try{await realDirectory(directory)}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await mkdir(directory);await realDirectory(directory)}
}
async function existingTree(directory:string):Promise<void>{
  const parent=path.dirname(directory)
  if(parent!==directory)await existingTree(parent)
  await realDirectory(directory)
}
async function atomicJson(file:string,value:unknown):Promise<void>{
  try{if((await lstat(file)).isSymbolicLink())throw new Error('AGENT_FILE_UNSAFE')}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}
  const temporary=`${file}.${randomUUID()}.tmp`
  await writeFile(temporary,JSON.stringify(value),{flag:'wx',mode:0o600});await rename(temporary,file)
}
export class AgentWorkspaceStore {
  constructor(readonly root:string,readonly identity:WorkspaceIdentity){if(!path.isAbsolute(root))throw error();id(identity.tenantId);id(identity.userId)}
  directory(agentId:string):string{return path.join(this.root,'agents',id(agentId))}
  /** Match the native registry's canonical paths, including Windows app virtualization. */
  async workspacePath(agentId:string):Promise<string>{
    const directory=path.join(this.directory(agentId),'workspace')
    try{await existingTree(directory);return await realpath(directory)}
    catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return directory;throw e}
  }
  async materialize(raw:AgentSnapshot,signal:AbortSignal):Promise<string>{
    const snapshot=decodeAgentSnapshot(raw);signal.throwIfAborted()
    const directory=this.directory(snapshot.agentId)
    for(const suffix of ['definition','memory','workspace','sessions'])await ensureTree(path.join(directory,suffix))
    for(const file of snapshot.files){
      signal.throwIfAborted()
      const target=path.join(directory,'workspace','.futurestaff-agent','definition',...file.path.split('/'))
      await ensureTree(path.dirname(target))
      try{if((await lstat(target)).isSymbolicLink())throw new Error('AGENT_FILE_UNSAFE')}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e}
      const temporary=`${target}.${randomUUID()}.tmp`;await writeFile(temporary,file.content,{flag:'wx',mode:0o600});await rename(temporary,target)
    }
    signal.throwIfAborted()
    await atomicJson(path.join(directory,'definition','snapshot.json'),snapshot)
    return directory
  }
  async snapshot(agentId:string):Promise<AgentSnapshot>{
    const directory=this.directory(agentId);await existingTree(path.join(directory,'definition'))
    const target=path.join(directory,'definition','snapshot.json')
    if((await lstat(target)).isSymbolicLink())throw error()
    return decodeAgentSnapshot(JSON.parse(await readFile(target,'utf8')))
  }
  private bindingFile(sessionId:string):string{
    if(!sessionId||sessionId.length>256)throw error()
    return path.join(this.root,'agent-session-bindings',`${createHash('sha256').update(sessionId).digest('hex')}.json`)
  }
  async binding(sessionId:string):Promise<{agentId:string;version:string}|undefined>{
    const file=this.bindingFile(sessionId)
    try{
      await existingTree(path.dirname(file));if((await lstat(file)).isSymbolicLink())throw error()
      const value=JSON.parse(await readFile(file,'utf8'))
      if(value.sessionId!==sessionId||JSON.stringify(value.identity)!==JSON.stringify(this.identity)
        ||typeof value.version!=='string'||! /^[a-f0-9]{64}$/.test(value.version))throw error()
      return {agentId:id(value.agentId),version:value.version}
    }catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw e}
  }
  async bind(sessionId:string,agentId:string):Promise<void>{
    const snapshot=await this.snapshot(agentId);const existing=await this.binding(sessionId)
    if(existing){if(existing.agentId!==id(agentId))throw new Error('AGENT_SESSION_MISMATCH');return}
    const file=this.bindingFile(sessionId);await ensureTree(path.dirname(file))
    // Exclusive creation protects against simultaneous attempts to bind different Agents.
    await writeFile(file,JSON.stringify({sessionId,identity:this.identity,agentId:id(agentId),version:snapshot.version}),{flag:'wx',mode:0o600})
    const directory=path.join(this.directory(agentId),'sessions',path.basename(file,'.json'))
    for(const suffix of ['attachments','drafts','outputs'])await ensureTree(path.join(directory,suffix))
  }
}
