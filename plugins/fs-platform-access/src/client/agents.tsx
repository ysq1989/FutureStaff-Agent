import { createElement, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from 'react'
import type { PlatformAccessSnapshot } from '../controller.js'

export interface DesktopAgentCard { agentId:string;name:string;description:string;available:boolean;unavailableReason:string|null;path:string }
interface SessionList { current?:string;ids:readonly string[];byId:Record<string,{title?:string;cwd?:string;blank?:boolean}> }
interface Workspace {workspaceId:string;path:string;sessionIds:readonly string[]}
interface BrowserProps {
  useSessions<T>(select:(state:SessionList)=>T):T
  useWorkspaces<T>(select:(state:{items:readonly Workspace[];archivedSessionIds:readonly string[]})=>T):T
  createWorkspace(input:{path:string}):Promise<Workspace>
  startSession(workspaceId?:string):void
  open(id:string):void
  wide:boolean
}
interface PickerProps {open:boolean;onClose():void;onPick(id:string):void;createWorkspace(input:{path:string}):Promise<Workspace>}
interface Controller {subscribe(listener:()=>void):()=>void;getSnapshot():PlatformAccessSnapshot}
const normalize=(p:string)=>p.replaceAll('\\','/').replace(/\/$/,'').toLowerCase()
async function request(route:string,body?:unknown,signal?:AbortSignal){
  const response=await fetch(`/_futurestaff/agents/${route}`,{
    method:body===undefined?'GET':'POST',headers:{'x-futurestaff-agent':'1','content-type':'application/json'},cache:'no-store',
    ...(body===undefined?{}:{body:JSON.stringify(body)}),...(signal?{signal}:{}),
  })
  if(!response.ok)throw new Error('无法读取智能体，请检查平台连接、使用权限或配置是否已更新。')
  return response.json()
}
const css=`
.fs-agents{display:flex;flex-direction:column;gap:8px;min-height:0;color:var(--text-primary);font-size:13px}.fs-agents h3{font-size:13px;margin:8px 0}.fs-agents button{font:inherit;color:inherit;background:transparent;border:1px solid var(--border-default);border-radius:8px;padding:9px;text-align:left;cursor:pointer}.fs-agents button:hover{background:var(--bg-hover)}.fs-agents button:focus-visible{outline:2px solid var(--accent-primary)}.fs-agents button:disabled{cursor:default;opacity:.65}.fs-agent-choice{display:flex;flex-direction:column;gap:4px;width:100%}.fs-agent-choice[aria-current=true]{border-color:var(--accent-primary);background:var(--bg-active)}.fs-agents small,.fs-agents p{color:var(--text-secondary);margin:0;line-height:1.5}.fs-agent-list{display:flex;flex-direction:column;gap:6px;overflow:auto}.fs-agent-session[aria-current=page]{color:var(--accent-primary);background:var(--bg-active)}.fs-agents-dialog{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;background:color-mix(in srgb,var(--bg-primary) 75%,transparent);padding:24px}.fs-agents-dialog>.fs-agents{width:min(480px,100%);max-height:80vh;padding:20px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:12px}.fs-agents-header{display:flex;align-items:center;justify-content:space-between;gap:8px}.fs-agent-legacy{margin-top:12px}.fs-agents-error{color:var(--error)!important}.fs-agents-data{overflow-wrap:anywhere;font-size:11px}
.fs-agents .fs-agent-choice{height:auto;min-height:68px;flex-shrink:0;overflow:hidden;align-items:stretch}.fs-agent-choice small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;max-height:3em;overflow:hidden;overflow-wrap:anywhere}.fs-agent-choice strong{overflow-wrap:anywhere}
`
function useCatalog(controller:Controller){
  const identity=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot)
  const owner=['ready','no_apps'].includes(identity.phase)?`${identity.activeTenantId}:${identity.user?.userId}`:''
  const [catalog,setCatalog]=useState<{owner:string;items:DesktopAgentCard[];directory:string}>({owner:'',items:[],directory:''})
  const [error,setError]=useState('');const [revision,refresh]=useState(0)
  useEffect(()=>{
    const abort=new AbortController();setError('')
    if(!owner){setCatalog({owner:'',items:[],directory:''});return()=>abort.abort()}
    void request('catalog',undefined,abort.signal).then(body=>{
      if(!Array.isArray(body.items)||typeof body.dataDirectory!=='string')throw new Error('智能体目录版本不兼容。')
      if(!abort.signal.aborted)setCatalog({owner,items:body.items,directory:body.dataDirectory})
    }).catch(reason=>{if(!abort.signal.aborted)setError(reason.message)})
    return()=>abort.abort()
  },[owner,revision])
  return {items:catalog.owner===owner?catalog.items:[],directory:catalog.owner===owner?catalog.directory:'',error,refresh:()=>refresh(value=>value+1),owner}
}
function Choices({items,current,busy,choose}:{items:DesktopAgentCard[];current?:string|undefined;busy:boolean;choose:(agent:DesktopAgentCard)=>void}){
  return <div className="fs-agent-list">{items.map(agent=><button type="button" className="fs-agent-choice" key={agent.agentId} disabled={busy||!agent.available} aria-current={current===agent.agentId} onClick={()=>choose(agent)}>
    <strong>{agent.name}</strong><small>{agent.available?agent.description:agent.unavailableReason}</small>
  </button>)}</div>
}
function useOperationSignal(owner:string, enabled=true){
  const operation=useRef(new AbortController())
  useEffect(()=>{
    operation.current=new AbortController()
    if(!owner||!enabled)operation.current.abort()
    return()=>operation.current.abort()
  },[owner,enabled])
  return operation
}
export function createAgentBrowser(controller:Controller,Legacy:ComponentType<BrowserProps>){
  return function AgentBrowser(props:BrowserProps){
    const {items,directory,error:catalogError,refresh,owner}=useCatalog(controller)
    const sessions=props.useSessions(value=>value)
    const workspaces=props.useWorkspaces(value=>value)
    const [chosen,setChosen]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [legacy,setLegacy]=useState(false)
    const operation=useOperationSignal(owner)
    const current=sessions.current?sessions.byId[sessions.current]:undefined
    const active=items.find(agent=>current?.cwd&&normalize(agent.path)===normalize(current.cwd))??items.find(agent=>agent.agentId===chosen)
    useEffect(()=>{setChosen('');setError('');setLegacy(false);setBusy(false)},[owner])
    const choose=async(agent:DesktopAgentCard)=>{
      const signal=operation.current.signal
      setBusy(true);setError('')
      try{
        const selected=await request('select',{agentId:agent.agentId},signal)
        signal.throwIfAborted()
        const workspace=await props.createWorkspace({path:selected.path})
        signal.throwIfAborted()
        setChosen(agent.agentId);props.startSession(workspace.workspaceId)
      }catch(reason){if(!signal.aborted)setError(reason instanceof Error?reason.message:'智能体工作区创建失败。')}finally{if(!signal.aborted)setBusy(false)}
    }
    const workspace=active?workspaces.items.find(item=>normalize(item.path)===normalize(active.path)):undefined
    const visible=workspace?.sessionIds.filter(id=>!workspaces.archivedSessionIds.includes(id)&&sessions.byId[id])??[]
    return <div className="fs-agents"><style>{css}</style>
      <div className="fs-agents-header"><h3>选择智能体</h3><button type="button" onClick={refresh} disabled={busy}>刷新</button></div>
      <Choices items={items} current={active?.agentId} busy={busy} choose={agent=>{void choose(agent)}}/>
      {!!items.length&&<small>继承平台知识、技能与记忆；执行工具使用本机已授权能力。云端专属工具暂未接入。</small>}
      {busy&&<p role="status">正在准备智能体知识与工作文件…</p>}
      {!items.length&&!catalogError&&<p role="status">当前主体暂无可用智能体，请在平台端创建或授权。</p>}
      {(error||catalogError)&&<p role="alert" className="fs-agents-error">{error||catalogError}</p>}
      {active&&<><h3>{active.name}的会话</h3>{workspace&&<button type="button" onClick={()=>props.startSession(workspace.workspaceId)}>＋ 新建会话</button>}
        <div className="fs-agent-list">{visible.map(id=><button type="button" className="fs-agent-session" key={id} aria-current={sessions.current===id?'page':undefined} onClick={()=>props.open(id)}>{sessions.byId[id]?.title||'新会话'}</button>)}</div></>}
      {directory&&<small className="fs-agents-data">本机数据位置：{directory}</small>}
      <button type="button" className="fs-agent-legacy" aria-expanded={legacy} onClick={()=>setLegacy(value=>!value)}>历史工作区与会话</button>
      {legacy&&<><small>保留旧数据；未绑定智能体的旧会话可查看，继续工作请选择智能体新建会话。</small>{createElement(Legacy,props)}</>}
    </div>
  }
}
export function createAgentPicker(controller:Controller){
  return function AgentPicker(props:PickerProps){
    const {items,error:catalogError,refresh,owner}=useCatalog(controller)
    const operation=useOperationSignal(owner,props.open)
    const [busy,setBusy]=useState(false);const [error,setError]=useState('');const dialog=useRef<HTMLDivElement>(null)
    useEffect(()=>{
      setBusy(false);setError('')
      if(!props.open)return
      const previous=document.activeElement
      dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
      return()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus()}
    },[props.open,owner])
    const choose=async(agent:DesktopAgentCard)=>{
      const signal=operation.current.signal;setBusy(true);setError('')
      try{
        const selected=await request('select',{agentId:agent.agentId},signal);signal.throwIfAborted()
        const workspace=await props.createWorkspace({path:selected.path});signal.throwIfAborted()
        props.onPick(workspace.workspaceId);props.onClose()
      }catch(reason){if(!signal.aborted)setError(reason instanceof Error?reason.message:'智能体工作区创建失败。')}
      finally{if(!signal.aborted)setBusy(false)}
    }
    if(!props.open)return null
    return <div className="fs-agents-dialog" onKeyDown={event=>{
      if(event.key==='Escape'){event.preventDefault();props.onClose()}
      if(event.key==='Tab'){
        const buttons=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[])
        const first=buttons[0],last=buttons.at(-1)
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }
    }}>
      <style>{css}</style><div ref={dialog} className="fs-agents" role="dialog" aria-modal="true" aria-label="选择智能体">
        <div className="fs-agents-header"><h3>选择智能体</h3><button type="button" onClick={props.onClose}>关闭</button></div>
        <p>使用平台配置的知识、技能与长期记忆开始对话。</p>
        <Choices items={items} busy={busy} choose={agent=>{void choose(agent)}}/>
        {!items.length&&!catalogError&&<p role="status">暂无已授权智能体。</p>}
        {(error||catalogError)&&<p role="alert" className="fs-agents-error">{error||catalogError}</p>}
        <button type="button" disabled={busy} onClick={refresh}>刷新智能体</button>
      </div>
    </div>
  }
}
