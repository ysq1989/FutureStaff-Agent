import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {spawn} from 'node:child_process'
import {createServer} from 'node:http'
import {existsSync} from 'node:fs'
import {mkdtemp,readFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {Cdp} from '@futurestaff/douyin-dm-mcp/browser'

const root=fileURLToPath(new URL('../../../',import.meta.url))
const executable=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync)
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
test('reusable window traps focus, blocks closing during writes and safely renders selected columns',{skip:!executable,timeout:30000},async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fs-interaction-ui-'))
  const bundle=await build({stdin:{resolveDir:root,loader:'tsx',contents:`
    import React,{useState,useCallback}from'react';import{createRoot}from'react-dom/client';
    import{InteractionWindow,InteractionTable,interactionCss}from'./plugins/fs-platform-access/src/client/interaction.tsx';
    function App(){const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[mode,setMode]=useState('sidebar');
      window.fixture={busy:setBusy,mode:setMode};const close=useCallback(()=>setOpen(false),[]);
      return <><style>{interactionCss}</style><button id="open" onClick={()=>setOpen(true)}>打开业务窗口</button>{open&&<InteractionWindow title="中文测试" onClose={close} busy={busy} mode={mode}>
       <InteractionTable rows={[{id:'r',name:'<script>危险内容</script>',secret:'不应显示的字段'}]} columns={[{key:'name',label:'名称'}]}/>
       <button id="confirm" disabled={busy}>确认执行</button></InteractionWindow>}</>}
    createRoot(document.getElementById('root')).render(<App/>);`},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic'})
  const server=createServer((request,response)=>{response.setHeader('content-type',request.url==='/app.js'?'text/javascript':'text/html');response.end(request.url==='/app.js'?bundle.outputFiles[0].text:'<html><body><div id="root"></div><script src="/app.js"></script></body></html>')})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const url=`http://127.0.0.1:${server.address().port}`
  const browser=spawn(executable,['--headless=new','--disable-background-networking','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${dir}/browser`,'about:blank'],{windowsHide:true,stdio:'ignore'})
  let cdp
  try{
    let portFile;for(let i=0;i<100;i++){try{portFile=await readFile(path.join(dir,'browser','DevToolsActivePort'),'utf8');break}catch{await pause(50)}}assert.ok(portFile,'browser debugging endpoint')
    const port=portFile.split('\n')[0],target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(v=>v.type==='page')
    cdp=await Cdp.connect(target.webSocketDebuggerUrl)
    await cdp.call('Page.navigate',{url})
    for(let i=0;i<100;i++){if(await cdp.evaluate(()=>!!document.querySelector('#open'),null))break;await pause(50)}
    await cdp.evaluate(()=>{const button=document.querySelector('#open');button.focus();button.click();return true},null);await pause(100)
    const content=await cdp.evaluate(()=>({label:document.querySelector('[role=dialog]')?.getAttribute('aria-label'),text:document.querySelector('table')?.textContent,injected:!!document.querySelector('table script'),focused:document.activeElement?.getAttribute('aria-label')}),null)
    assert.equal(content.label,'中文测试');assert.match(content.text,/<script>/);assert.doesNotMatch(content.text,/不应显示的字段/);assert.equal(content.injected,false);assert.equal(content.focused,'关闭业务窗口')
    await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8})
    assert.equal(await cdp.evaluate(()=>document.activeElement.id,null),'confirm')
    await cdp.evaluate(()=>{window.fixture.busy(true);return true},null);await pause(50)
    await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
    assert.equal(await cdp.evaluate(()=>!!document.querySelector('[role=dialog]'),null),true)
    await cdp.evaluate(()=>{window.fixture.busy(false);window.fixture.mode('dialog');return true},null);await pause(50)
    assert.equal(await cdp.evaluate(()=>!!document.querySelector('.fs-interaction-dialog'),null),true)
    await cdp.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(50)
    assert.equal(await cdp.evaluate(()=>!!document.querySelector('[role=dialog]'),null),false)
    assert.equal(await cdp.evaluate(()=>document.activeElement.id,null),'open')
  }finally{cdp?.close();browser.kill();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
})
