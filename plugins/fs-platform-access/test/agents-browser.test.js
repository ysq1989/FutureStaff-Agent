import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Cdp } from '@futurestaff/douyin-dm-mcp/browser'
import { AgentWorkspaceStore } from '../lib/agents.js'
import { resolveSessionAgent } from '../lib/agent-host.js'

const root=fileURLToPath(new URL('../../../',import.meta.url))
const executable=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync)
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
test('real browser selects persistent agents, isolates sessions, preserves files, and cancels stale selection',{skip:!executable,timeout:30000},async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fs-agent-ui-'))
  const identity={environment:'dev',tenantId:'10000000-0000-4000-8000-000000000001',userId:'20000000-0000-4000-8000-000000000001'}
  const store=new AgentWorkspaceStore(path.join(dir,'member'),identity)
  const cards=[1,2].map(n=>({agentId:`30000000-0000-4000-8000-00000000000${n}`,name:`助手${n}`,description:`知识${n}`,available:true,unavailableReason:null}))
  const bundle=await build({stdin:{resolveDir:root,loader:'tsx',contents:`
    import React,{useState,useSyncExternalStore}from'react';import{createRoot}from'react-dom/client';
    import{createAgentBrowser,createAgentPicker}from'./plugins/fs-platform-access/src/client/agents.tsx';
    import{appearanceTokens}from'./plugins/fs-platform-access/src/client/appearance.ts';
    const listeners=new Set();let identity={phase:'ready',activeTenantId:'tenant',user:{userId:'user'}};
    const controller={subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},getSnapshot:()=>identity};
    const Browser=createAgentBrowser(controller,()=> <p>原工作区资料</p>),Picker=createAgentPicker(controller);
    const nativeListeners=new Set();let sessions={ids:[],byId:{},current:undefined},workspaces={items:[],archivedSessionIds:[]};
    const update=()=>nativeListeners.forEach(fn=>fn());let number=0;
    const createWorkspace=async({path})=>{let item=workspaces.items.find(w=>w.path===path);if(!item){item={path,workspaceId:path,sessionIds:[]};workspaces={...workspaces,items:[...workspaces.items,item]};update()}return item};
    const startSession=id=>{const w=workspaces.items.find(w=>w.workspaceId===id),sessionId='session-'+(++number);sessions={...sessions,current:sessionId,ids:[...sessions.ids,sessionId],byId:{...sessions.byId,[sessionId]:{title:'测试会话'+number,cwd:w.path}}};workspaces={...workspaces,items:workspaces.items.map(item=>item===w?{...w,sessionIds:[...w.sessionIds,sessionId]}:item)};update()};
    window.fixture={get:()=>({sessions,workspaces}),logout:()=>{identity={phase:'signed_out'};listeners.forEach(fn=>fn())}};
    const useSessions=select=>select(useSyncExternalStore(fn=>{nativeListeners.add(fn);return()=>nativeListeners.delete(fn)},()=>sessions));
    const useWorkspaces=select=>select(useSyncExternalStore(fn=>{nativeListeners.add(fn);return()=>nativeListeners.delete(fn)},()=>workspaces));
    for(const[key,value]of Object.entries(appearanceTokens))document.documentElement.style.setProperty(key,value.light);
    function App(){const[open,setOpen]=useState(false);return <main style={{maxWidth:480,padding:12}}><button id="open-picker" onClick={()=>setOpen(true)}>选择</button><Browser useSessions={useSessions} useWorkspaces={useWorkspaces} createWorkspace={createWorkspace} startSession={startSession} open={id=>{sessions={...sessions,current:id};update()}} wide={true}/><Picker open={open} onClose={()=>setOpen(false)} onPick={startSession} createWorkspace={createWorkspace}/></main>}
    createRoot(document.getElementById('root')).render(<App/>);
  `},bundle:true,write:false,format:'iife',jsx:'automatic'})
  let slow=false
  const server=createServer(async(req,res)=>{
    try{
      if(req.url==='/_futurestaff/agents/catalog'){res.setHeader('content-type','application/json');return res.end(JSON.stringify({items:cards.map(c=>({...c,path:path.join(store.directory(c.agentId),'workspace')})),dataDirectory:store.root}))}
      if(req.url==='/_futurestaff/agents/select'){
        let body='';for await(const chunk of req)body+=chunk
        const card=cards.find(c=>c.agentId===JSON.parse(body).agentId)
        if(slow)await sleep(500)
        const directory=await store.materialize({agentId:card.agentId,name:card.name,description:card.description,version:'a'.repeat(64),files:[{path:'soul.md',content:card.description}]},new AbortController().signal)
        res.setHeader('content-type','application/json');return res.end(JSON.stringify({path:path.join(directory,'workspace')}))
      }
      res.setHeader('content-type',req.url==='/fixture.js'?'application/javascript':'text/html; charset=utf-8')
      res.end(req.url==='/fixture.js'?bundle.outputFiles[0].text:'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><div id="root"></div><script src="/fixture.js"></script></html>')
    }catch{res.statusCode=409;res.end('{}')}
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const child=spawn(executable,['--headless=new','--disable-background-networking','--no-first-run','--no-default-browser-check','--no-proxy-server','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${dir}/browser`,'about:blank'],{windowsHide:true,stdio:'ignore'})
  let cdp
  try{
    let portFile;for(let i=0;i<80;i++){try{portFile=await readFile(path.join(dir,'browser','DevToolsActivePort'),'utf8');break}catch{await sleep(100)}}
    assert.ok(portFile)
    const targets=await(await fetch(`http://127.0.0.1:${portFile.split('\n')[0]}/json/list`)).json()
    cdp=await Cdp.connect(targets.find(item=>item.type==='page').webSocketDebuggerUrl)
    await cdp.call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`})
    const waitFor=async(fn)=>{for(let i=0;i<80;i++){if(await cdp.evaluate(fn,null))return;await sleep(50)}assert.fail('browser state did not settle')}
    await waitFor(()=>document.querySelectorAll('.fs-agent-choice').length===2)
    await cdp.evaluate(()=>document.querySelectorAll('.fs-agent-choice')[0].click()||true,null)
    await waitFor(()=>window.fixture.get().sessions.ids.length===1)
    let native=await cdp.evaluate(()=>window.fixture.get(),null)
    const first=native.sessions.current,cwd=native.sessions.byId[first].cwd
    assert.equal((await resolveSessionAgent(store,first,cwd)).agentId,cards[0].agentId)
    await writeFile(path.join(cwd,'local.txt'),'preserved work')
    await cdp.evaluate(()=>document.querySelectorAll('.fs-agent-choice')[1].click()||true,null)
    await waitFor(()=>window.fixture.get().sessions.ids.length===2)
    assert.equal(await cdp.evaluate(()=>document.querySelectorAll('.fs-agent-session').length,null),1)
    native=await cdp.evaluate(()=>window.fixture.get(),null)
    assert.equal((await resolveSessionAgent(store,native.sessions.current,native.sessions.byId[native.sessions.current].cwd)).agentId,cards[1].agentId)
    await cdp.evaluate(()=>document.querySelectorAll('.fs-agent-choice')[0].click()||true,null)
    await waitFor(()=>window.fixture.get().sessions.ids.length===3)
    assert.equal(await cdp.evaluate(()=>document.querySelectorAll('.fs-agent-session').length,null),2)
    assert.equal(await readFile(path.join(cwd,'local.txt'),'utf8'),'preserved work')
    assert.equal((await new AgentWorkspaceStore(store.root,identity).binding(first)).agentId,cards[0].agentId)
    await cdp.evaluate(()=>document.querySelector('.fs-agent-legacy').click()||true,null)
    assert.equal(await cdp.evaluate(()=>document.body.textContent.includes('原工作区资料'),null),true)
    await cdp.evaluate(()=>document.getElementById('open-picker').click()||true,null)
    assert.equal(await cdp.evaluate(()=>document.activeElement.textContent,null),'关闭')
    await cdp.evaluate(()=>{const dialog=document.querySelector('[role=dialog]'),last=[...dialog.querySelectorAll('button')].at(-1);last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));return true},null)
    assert.equal(await cdp.evaluate(()=>document.activeElement.textContent,null),'关闭')
    await cdp.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})),null)
    assert.equal(await cdp.evaluate(()=>document.querySelector('[role=dialog]')===null,null),true)
    await cdp.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
    assert.equal(await cdp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth,null),true)
    const output=path.join(root,'work','persistent-agents-v3');await mkdir(output,{recursive:true})
    await writeFile(path.join(output,'selector-narrow.png'),Buffer.from((await cdp.call('Page.captureScreenshot',{format:'png'})).data,'base64'))
    slow=true
    await cdp.evaluate(()=>{document.querySelectorAll('.fs-agent-choice')[1].click();window.fixture.logout();return true},null)
    await sleep(650)
    assert.equal(await cdp.evaluate(()=>window.fixture.get().sessions.ids.length,null),3)
    assert.equal(await cdp.evaluate(()=>document.querySelectorAll('.fs-agent-choice').length,null),0)
  }finally{cdp?.close();child.kill();await new Promise(resolve=>server.close(resolve))}
})
