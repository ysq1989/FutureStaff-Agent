import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, symlink } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// Hidden Electron fixture: synthetic pages only, isolated from installed user data.
const root=fileURLToPath(new URL('../',import.meta.url))
const temp=await mkdtemp(path.join(os.tmpdir(),'fs-session-renewal-'))
await mkdir(path.join(temp,'user-data'))
await symlink(path.join(root,'node_modules'),path.join(temp,'node_modules'),'junction')
await build({entryPoints:[path.join(root,'src/system-views.ts')],outfile:path.join(temp,'views.mjs'),bundle:true,format:'esm',platform:'node',external:['electron']})
await build({entryPoints:[path.join(root,'src/preload.ts')],outfile:path.join(temp,'preload.cjs'),bundle:true,format:'cjs',platform:'node',external:['electron']})
await writeFile(path.join(temp,'smoke.cjs'),`
const {app,BrowserWindow,session,webContents}=require('electron');
const {createServer}=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 app.setPath('userData',${JSON.stringify(path.join(temp,'user-data'))});await app.whenReady();
 const {DesktopSystemViews}=await import('./views.mjs');
 // Compress the minute check interval in this fixture, without changing product code.
 const timeout=global.setTimeout;global.setTimeout=(fn,ms,...args)=>timeout(fn,ms===60000?100:ms,...args);
 let main,manager,server,checks=0,pages=0,recover=false,offline=false;
 const boundary=new AbortController();
 try{
  server=createServer((req,res)=>{res.end('<!doctype html><h1>Fixture shell</h1>')});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const fromPartition=session.fromPartition.bind(session);
  session.fromPartition=(name,...args)=>{
   const ses=fromPartition(name,...args);ses.resolveHost=async()=>({endpoints:[{address:'8.8.8.8',family:'ipv4'}]});
   ses.protocol.handle('https',()=>{pages++;return new Response('<!doctype html><input id="draft" value="initial">',{headers:{'content-type':'text/html'}})});
   return ses;
  };
  main=new BrowserWindow({show:false,webPreferences:{preload:${JSON.stringify(path.join(temp,'preload.cjs'))},contextIsolation:true,sandbox:true,nodeIntegration:false}});
  manager=new DesktopSystemViews(main,origin,async()=>({url:'https://erp.fsstory.net/erp',owner:'fixture:tenant:user',signal:boundary.signal,
   prepare:async()=>{checks++;if(offline)throw Error('fixture offline');const restored=recover;recover=false;return restored}}));
  await main.loadURL(origin);
  const request=input=>main.webContents.executeJavaScript('window.futurestaffSystems.request('+JSON.stringify(input)+')');
  assert.equal((await request({action:'show',appId:'erp',bounds:{x:0,y:0,width:800,height:600}})).ok,true);
  const guest=webContents.getAllWebContents().find(w=>w.getURL()==='https://erp.fsstory.net/erp');assert.ok(guest);
  await guest.executeJavaScript('document.getElementById("draft").value="keep this draft"');
  const wait=async condition=>{const deadline=Date.now()+5000;while(!condition()){if(Date.now()>deadline)throw Error('fixture timeout');await new Promise(r=>timeout(r,20))}};
  await wait(()=>checks>=3);assert.equal(pages,1);
  assert.equal(await guest.executeJavaScript('document.getElementById("draft").value'),'keep this draft');
  offline=true;const failed=checks;await wait(()=>checks>failed);assert.equal(pages,1);assert.equal(guest.isDestroyed(),false);
  offline=false;recover=true;await wait(()=>pages===2);
  await wait(()=>!guest.isLoading());
  assert.equal(await guest.executeJavaScript('document.getElementById("draft").value'),'initial');
  assert.equal(await guest.executeJavaScript('typeof window.futurestaffSystems'),'undefined');
  const id=guest.id;boundary.abort();await wait(()=>!webContents.fromId(id));
  const stopped=checks;await new Promise(r=>timeout(r,300));assert.equal(checks,stopped);
  console.log('SYSTEM_SESSION_RENEWAL_SMOKE_PASSED');
 }finally{manager?.dispose();main?.destroy();server?.close();app.quit()}
})().catch(error=>{console.error(error);app.exit(1)});
`)
await writeFile(path.join(temp,'package.json'),JSON.stringify({name:'futurestaff-renewal-fixture',version:'1.0.0',main:'smoke.cjs'}))
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE
const child=spawn(path.join(root,'node_modules/electron/dist/electron.exe'),[temp],{env,windowsHide:true,stdio:['ignore','pipe','pipe']})
let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk)
const timer=setTimeout(()=>child.kill(),20000)
const code=await new Promise(resolve=>child.once('exit',resolve));clearTimeout(timer)
if(code!==0||!output.includes('SYSTEM_SESSION_RENEWAL_SMOKE_PASSED'))throw Error(output)
console.log('SYSTEM_SESSION_RENEWAL_SMOKE_PASSED')
