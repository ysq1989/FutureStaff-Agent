import { createElement, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import { systemTitle } from './system-directory.js'

export interface SystemPage { id:string;title:string;component:ComponentType<{visible?:boolean}>;close?:()=>Promise<void> }
type State={mode:'sessions'|'systems';tabs:readonly SystemPage[];available:readonly SystemPage[];active:string|null;owner:string}
/** UI navigation only. Backend authorization remains inside each module. */
export class SystemPages {
  private state:State={mode:'sessions',tabs:[],available:[],active:null,owner:''}
  private pages=new Map<string,SystemPage>()
  private listeners=new Set<()=>void>()
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  getSnapshot=()=>this.state
  has(id:string){return this.pages.has(id)}
  private update(patch:Partial<State>){this.state={...this.state,...patch};for(const fn of this.listeners)fn()}
  register(page:SystemPage){
    if(this.pages.has(page.id))throw Error('SYSTEM_PAGE_ALREADY_REGISTERED')
    this.pages.set(page.id,page)
    this.update({available:[...this.pages.values()]})
    return()=>{this.pages.delete(page.id);const tabs=this.state.tabs.filter(item=>item.id!==page.id);this.update({available:[...this.pages.values()],tabs,active:tabs.some(item=>item.id===this.state.active)?this.state.active:tabs.at(-1)?.id??null})}
  }
  bindOwner(owner:string){if(owner!==this.state.owner)this.update({owner,mode:'sessions',tabs:[],active:null})}
  select(mode:State['mode']){if(mode!==this.state.mode)this.update({mode})}
  open(id:string){
    const page=this.pages.get(id)
    if(!page||!this.state.owner)throw Error('SYSTEM_PAGE_UNAVAILABLE')
    this.update({mode:'systems',active:id,tabs:this.state.tabs.some(item=>item.id===id)?this.state.tabs:[...this.state.tabs,page]})
  }
  async close(id:string){
    const owner=this.state.owner,page=this.state.tabs.find(item=>item.id===id)
    if(!page)return
    await page.close?.()
    if(this.state.owner!==owner)return
    const tabs=this.state.tabs.filter(item=>item.id!==id)
    this.update({tabs,active:id===this.state.active?tabs.at(-1)?.id??null:this.state.active})
  }
}
const css=`.fs-system-main{position:relative;width:100%;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--bg-primary);color:var(--text-primary)}.fs-system-main[hidden],.fs-system-body[hidden],.fs-chat-page[hidden]{display:none}.fs-system-strip{display:flex;gap:6px;align-items:center;padding:8px 12px;background:var(--bg-secondary);border-bottom:1px solid var(--border-default);overflow-x:auto;flex-shrink:0}.fs-system-tab{display:flex;border:1px solid var(--border-default);border-radius:9px;background:var(--bg-primary);flex-shrink:0}.fs-system-tab[data-selected=true]{border-color:var(--accent-primary);color:var(--accent-primary)}.fs-system-tab button{color:inherit;background:transparent;border:0;padding:8px 12px;cursor:pointer;font:inherit}.fs-system-tab button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:-2px}.fs-system-content{flex:1;min-height:0;overflow:hidden}.fs-system-body{height:100%;min-height:0;overflow:auto}.fs-chat-page{height:100%;min-height:0}.fs-system-empty{display:grid;place-items:center;height:100%;color:var(--text-secondary)}`
const compactCss=`
.fs-system-toolbar,.fs-system-tab{box-sizing:border-box}
.fs-system-toolbar{height:46px;min-height:46px;padding-right:52px;flex-shrink:0;background:var(--fs-sidebar-bg);border-bottom:1px solid var(--border-default)}.fs-system-strip{height:45px;min-height:45px;padding:6px 8px 6px 12px;gap:4px;background:transparent;border-bottom:0;scrollbar-width:none}.fs-system-strip::-webkit-scrollbar{display:none}
.fs-system-tab{height:32px;border-color:transparent;border-radius:6px;background:transparent;color:var(--text-secondary);max-width:240px;align-items:center}
.fs-system-tab:hover{background:var(--bg-hover)}.fs-system-tab[data-selected=true]{background:var(--bg-secondary);color:var(--text-primary);border-color:var(--border-default);box-shadow:0 1px 2px var(--fs-shadow)}
.fs-system-tab button{height:30px;padding:0 10px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-radius:5px}.fs-system-tab button[role=tab]{min-width:0;font-weight:500}.fs-system-tab button:last-child{display:grid;place-items:center;width:26px;flex-shrink:0;padding:0;color:var(--text-secondary)}.fs-system-tab button:last-child:hover{background:var(--bg-hover);color:var(--text-primary)}
.fs-system-body{overflow:hidden}.fs-system-empty{font-size:13px}
@media(max-width:640px){.fs-system-strip{padding-left:8px}.fs-system-tab{max-width:170px}.fs-system-tab button{padding:0 8px}}
@media(prefers-reduced-motion:reduce){.fs-system-main *{transition:none!important}}
`
export function SystemMain({pages,chat}:{pages:SystemPages;chat:ReactNode}){
  const state=useSyncExternalStore(pages.subscribe,pages.getSnapshot,pages.getSnapshot)
  return <><style>{css}{compactCss}{`.fs-cloud-entry{box-sizing:border-box;margin:24px;padding:28px;max-width:760px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:8px;line-height:1.7}.fs-cloud-entry h1{font-size:24px;margin:8px 0}.fs-cloud-entry p{font-size:14px;color:var(--text-secondary)}.fs-cloud-kicker{font-size:12px;color:var(--accent-primary)}.fs-cloud-entry button{border:0;border-radius:6px;background:var(--fs-button-start);color:var(--fs-on-accent);padding:10px 16px;cursor:pointer;font:inherit}.fs-cloud-entry button:hover{background:var(--fs-button-end)}.fs-cloud-entry button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:3px}.fs-system-tab:hover{background:var(--bg-hover)}@media(max-width:640px){.fs-cloud-entry{margin:12px;padding:16px}.fs-cloud-entry h1{font-size:20px}}`}</style><div className="fs-chat-page" hidden={state.mode!=='sessions'}>{chat}</div><section className="fs-system-main" hidden={state.mode!=='systems'} aria-label="系统页面">
    <div className="fs-system-toolbar"><div className="fs-system-strip" role="tablist" aria-label="已打开的系统" onKeyDown={event=>{
      if(!(event.target instanceof HTMLElement)||event.target.getAttribute('role')!=='tab'||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!state.tabs.length)return
      event.preventDefault()
      const current=state.tabs.findIndex(page=>page.id===state.active)
      const index=event.key==='Home'?0:event.key==='End'?state.tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+state.tabs.length)%state.tabs.length
      const page=state.tabs[index];if(page){pages.open(page.id);document.getElementById(`fs-system-tab-${page.id}`)?.focus()}
    }}>{state.tabs.map(page=><div className="fs-system-tab" key={page.id} data-selected={state.active===page.id}>
      <button type="button" id={`fs-system-tab-${page.id}`} role="tab" aria-selected={state.active===page.id} tabIndex={state.active===page.id?0:-1} aria-controls={`fs-system-${page.id}`} onClick={()=>pages.open(page.id)}>{systemTitle(page.id,page.title)}</button>
      <button type="button" aria-label={`关闭${systemTitle(page.id,page.title)}`} onClick={()=>{void pages.close(page.id).catch(()=>{})}}><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 4 8 8 M12 4l-8 8"/></svg></button></div>)}</div></div>
    <div className="fs-system-content">{state.tabs.map(page=><div className="fs-system-body" role="tabpanel" aria-labelledby={`fs-system-tab-${page.id}`} id={`fs-system-${page.id}`} key={`${state.owner}:${page.id}`} hidden={state.active!==page.id}>{createElement(page.component,{visible:state.mode==='systems'&&state.active===page.id})}</div>)}{!state.tabs.length&&<div className="fs-system-empty">选择左侧系统打开页面</div>}</div>
  </section></>
}
