import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { AgentWorkspaceStore, fetchAgentData, type AgentCard, type AgentCredentials, type AgentSnapshot } from './agents.js'
import type { WorkspaceIdentity } from './workspace.js'
import path from 'node:path'

/** Session cwd comes from the Host SessionStore, never the renderer. */
export async function resolveSessionAgent(store: AgentWorkspaceStore, sessionId: string, cwd: string | undefined) {
  if (!cwd || !path.isAbsolute(cwd)) return undefined
  const relative = path.relative(path.join(store.root, 'agents'), cwd)
  const parts = relative.split(path.sep)
  if (parts.length !== 2 || parts[1] !== 'workspace') return undefined
  const agentId = parts[0]!
  if (path.resolve(cwd) !== path.resolve(store.directory(agentId), 'workspace')) return undefined
  await store.bind(sessionId, agentId)
  return store.binding(sessionId)
}

/** Renderer sees only public projections; credentials never leave the Host. */
export function mountAgents(ctx: Context, origin: string, identity: WorkspaceIdentity, root: string,
  authorize: () => Promise<AgentCredentials>, fetcher=globalThis.fetch) {
  const store=new AgentWorkspaceStore(root,identity)
  let queue:Promise<unknown>=Promise.resolve()
  const resolveBinding = (sessionId: string) => {
    const operation = async () => {
      const sessions = ctx.get('sessions') as unknown as { get(id:string): {header:{cwd?:string}}|undefined } | undefined
      return resolveSessionAgent(store, sessionId, sessions?.get(sessionId)?.header.cwd)
    }
    const pending = queue.then(operation, operation); queue = pending.catch(() => {})
    return pending
  }
  for(const [suffix,method] of [['catalog','GET'],['select','POST'],['bind','POST']] as const){
    ctx.effect(()=>ctx.webServer.register({kind:'exact',path:`/_futurestaff/agents/${suffix}`,handler:async(request,response)=>{
      const send=(status:number,body:unknown)=>{
        response.statusCode=status;response.setHeader('content-type','application/json; charset=utf-8')
        response.setHeader('cache-control','no-store');response.setHeader('x-content-type-options','nosniff');response.end(JSON.stringify(body))
      }
      if(request.method!==method||request.headers['x-futurestaff-agent']!=='1'
        ||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.socket.remoteAddress??''))return send(403,{error:'LOCAL_REQUEST_REQUIRED'})
      try{
        const credentials=await authorize()
        if(credentials.tenantId!==identity.tenantId||credentials.userId!==identity.userId)throw new Error('AGENT_IDENTITY_MISMATCH')
        if(suffix==='catalog'){
          const cards=await fetchAgentData(origin,credentials,undefined,fetcher) as AgentCard[]
          return send(200,{items:cards.map(card=>({...card,path:`${store.directory(card.agentId)}/workspace`})),dataDirectory:root})
        }
        let raw='';for await(const chunk of request){raw+=chunk.toString();if(Buffer.byteLength(raw)>2048)throw new Error('AGENT_REQUEST_INVALID')}
        const body=JSON.parse(raw)
        if(suffix==='select'){
          if(Object.keys(body).join()!=='agentId'||typeof body.agentId!=='string')throw new Error('AGENT_REQUEST_INVALID')
          const snapshot=await fetchAgentData(origin,credentials,body.agentId,fetcher) as AgentSnapshot
          const operation=()=>store.materialize(snapshot,credentials.signal)
          const pending=queue.then(operation,operation);queue=pending.catch(()=>{})
          const directory=await pending;credentials.signal.throwIfAborted()
          const registry=ctx.get('workspaceRegistry') as unknown as {create(path:string,title?:string):Promise<unknown>}|undefined
          if(!registry)throw new Error('AGENT_WORKSPACE_SERVICE_REQUIRED')
          await registry.create(path.join(directory,'workspace'),snapshot.name)
          credentials.signal.throwIfAborted()
          return send(200,{agentId:snapshot.agentId,name:snapshot.name,path:`${directory}/workspace`,version:snapshot.version})
        }
        if(Object.keys(body).sort().join()!=='agentId,sessionId'||typeof body.agentId!=='string'||typeof body.sessionId!=='string')throw new Error('AGENT_REQUEST_INVALID')
        // Recheck current platform visibility before accepting a persistent binding.
        await fetchAgentData(origin,credentials,body.agentId,fetcher)
        const binding = await resolveBinding(body.sessionId)
        if (!binding || binding.agentId !== body.agentId) throw new Error('AGENT_SESSION_MISMATCH')
        credentials.signal.throwIfAborted();return send(200,{ok:true})
      }catch{send(409,{error:'AGENT_UNAVAILABLE'})}
    }}),`futurestaff persistent agents ${suffix}`)
  }
  return {store, resolveBinding}
}
