import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readFile, symlink } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../',import.meta.url)), work=path.resolve(root,'../../work/embedded-system')
await mkdir(work,{recursive:true})
const temp=await mkdtemp(path.join(os.tmpdir(),'fs-native-system-'))
await mkdir(path.join(temp,'user-data'))
await symlink(path.join(root,'node_modules'),path.join(temp,'node_modules'),'junction')
await build({entryPoints:[path.join(root,'src/system-views.ts')],outfile:path.join(temp,'views.mjs'),bundle:true,format:'esm',platform:'node',external:['electron']})
await build({entryPoints:[path.join(root,'src/preload.ts')],outfile:path.join(temp,'preload.cjs'),bundle:true,format:'cjs',platform:'node',external:['electron']})
const smoke=`
const {app,BrowserWindow,session,webContents}=require('electron');
const {createServer}=require('node:http'),{writeFile}=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{const{DesktopSystemViews}=await import('./views.mjs');
app.setPath('userData',${JSON.stringify(path.join(temp,'user-data'))});
await app.whenReady();let main,manager,server;const boundary=new AbortController();let requests=0;
try{
 server=createServer((req,res)=>{requests++;res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><h1>Agent test shell</h1><div style="margin-left:240px;margin-top:100px">Native system tab</div>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 main=new BrowserWindow({show:false,width:1200,height:800,webPreferences:{preload:${JSON.stringify(path.join(temp,'preload.cjs'))},contextIsolation:true,sandbox:true,nodeIntegration:false}});
 manager=new DesktopSystemViews(main,origin,async id=>{if(!['erp','immigration'].includes(id))throw Error('denied');return{url:id==='erp'?'https://erp.fsstory.net/erp':'https://visa.fsstory.net/immigration',owner:'isolated-fixture:subject:user',signal:boundary.signal}});
 const fromPartition=session.fromPartition.bind(session);session.fromPartition=(name,...args)=>{const ses=fromPartition(name,...args);if(!ses.__fixture){ses.__fixture=true;ses.resolveHost=async()=>({endpoints:[{address:'8.8.8.8',family:'ipv4'}]});ses.protocol.handle('https',()=>new Response('<!doctype html><meta charset="utf-8"><h1>Embedded business page</h1><input id="draft" value="fixture draft"><p>Native isolated guest</p>',{headers:{'content-type':'text/html'}}))}return ses};
 await main.loadURL(origin);await main.webContents.session.cookies.set({url:origin,name:'agentPrivateFixture',value:'synthetic-value'});
 const request=input=>main.webContents.executeJavaScript('window.futurestaffSystems.request('+JSON.stringify(input)+')');
 const show={action:'show',appId:'erp',bounds:{x:240,y:100,width:960,height:650}};
 assert.equal((await request({...show,url:'https://evil.invalid'})).ok,false);
 assert.equal((await request(show)).ok,true);const guest=webContents.getAllWebContents().find(w=>w.getURL()==='https://erp.fsstory.net/erp');assert.ok(guest);
 assert.equal(await guest.executeJavaScript('typeof window.futurestaffSystems'),'undefined');
 assert.equal(await guest.executeJavaScript('document.cookie.includes("agentPrivateFixture")'),false);
 await guest.executeJavaScript('document.getElementById("draft").value="preserved draft"');
 const before=requests;await guest.executeJavaScript('fetch('+JSON.stringify(origin+'/private')+').catch(()=>null)');assert.equal(requests,before);
 assert.equal((await request({action:'hide',appId:'erp'})).ok,true);assert.equal(main.contentView.children.length,0);
 assert.equal((await request(show)).ok,true);assert.equal(await guest.executeJavaScript('document.getElementById("draft").value'),'preserved draft');
 assert.equal((await request(show)).ok,true);assert.equal(webContents.getAllWebContents().filter(w=>w.getURL()==='https://erp.fsstory.net/erp').length,1);
 assert.equal((await request({...show,appId:'immigration'})).ok,true);assert.equal(main.contentView.children.length,1);
 main.setPosition(-10000,-10000);main.showInactive();await new Promise(r=>setTimeout(r,200));
 const capture=async contents=>{let error;for(let attempt=0;attempt<5;attempt++){try{return await contents.capturePage()}catch(cause){error=cause;await new Promise(r=>setTimeout(r,250))}}throw error};
 const image=await capture(main.webContents);await writeFile(${JSON.stringify(path.join(work,'native-shell.png'))},image.toPNG());
 const activeGuest=webContents.getAllWebContents().find(w=>w.getURL()==='https://visa.fsstory.net/immigration');const guestImage=await capture(activeGuest);await writeFile(${JSON.stringify(path.join(work,'native-guest.png'))},guestImage.toPNG());
 const ids=webContents.getAllWebContents().filter(w=>w.id!==main.webContents.id).map(w=>w.id);boundary.abort();await new Promise(r=>setTimeout(r,100));
 for(const id of ids)assert.equal(webContents.fromId(id),undefined);
 await writeFile(${JSON.stringify(path.join(work,'native-result.json'))},JSON.stringify({ok:true,singleton:true,draftPreserved:true,privateNetworkBlocked:true,noGuestBridge:true,noAgentCookie:true,abortDisposedGuests:true},null,2));
 console.log('NATIVE_SYSTEM_SMOKE_PASSED');
}catch(error){console.error(error);app.exit(1)}finally{manager?.dispose();main?.destroy();server?.close();app.quit()}
})().catch(error=>{console.error(error);app.exit(1)});
`
await writeFile(path.join(temp,'smoke.cjs'),smoke)
await writeFile(path.join(temp,'package.json'),JSON.stringify({name:'futurestaff-system-fixture',version:'1.0.0',main:'smoke.cjs'}))
const env={...process.env,ELECTRON_ENABLE_LOGGING:'1'};delete env.ELECTRON_RUN_AS_NODE
const child=spawn(path.join(root,'node_modules/electron/dist/electron.exe'),[temp,'--enable-logging=stderr'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']})
let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk)
const timer=setTimeout(()=>child.kill(),30000)
const code=await new Promise(resolve=>child.once('exit',resolve));clearTimeout(timer)
await writeFile(path.join(work,'native-smoke.txt'),output)
if(code!==0||!output.includes('NATIVE_SYSTEM_SMOKE_PASSED'))throw Error(output)
console.log(await readFile(path.join(work,'native-result.json'),'utf8'))
