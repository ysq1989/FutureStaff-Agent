import fs from 'node:fs/promises';
import {Cdp} from '@futurestaff/douyin-dm-mcp/browser';
const port=(await fs.readFile('C:/Users/10089/AppData/Roaming/FutureStaff Agent/DevToolsActivePort','utf8')).split('\n')[0];
const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const cdp=await Cdp.connect(tabs.find(t=>t.type==='page'&&t.url.startsWith('http://127.0.0.1')).webSocketDebuggerUrl);
try{
 const action=process.argv[2];
 if(action==='window'){const text=await cdp.evaluate(()=>document.querySelector('.fs-shop-window')?.innerText??'loading',null);await fs.writeFile('D:/项目/.codex-build/shop-agent-88-repair-20261015/view.txt',text);console.log(text.slice(0,6500))}
 if(action==='cards')console.log(await cdp.evaluate(()=>[...document.querySelectorAll('.fs-shop-card')].map(c=>c.querySelector('strong')?.textContent),null));
 if(action==='new')console.log(await cdp.evaluate(()=>{document.querySelector('.fs-shop-window button[aria-label="关闭业务窗口"]')?.click();[...document.querySelectorAll('button')].find(b=>b.textContent.includes('+ 新会话'))?.click();return true},null));
 if(action==='select-shop')console.log(await cdp.evaluate(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.innerText.startsWith('SHOP 系统助手'));if(!button)throw Error('SHOP_AGENT_SELECTION_NOT_FOUND');button.click();return true},null));
 if(action==='tail')console.log(await cdp.evaluate(()=>document.body.innerText.slice(-2200),null));
 if(action==='confirm-owned'){
 const expected=process.argv[3],guard=JSON.parse(await fs.readFile('D:/项目/.codex-build/shop-agent-88-repair-20261015/native-cleanup-guard.json','utf8')),owned=guard.rows.find(r=>r.title===expected);if(!guard.verified||!owned||Date.now()-guard.verifiedAt>600000)throw Error('CURRENT_FIXTURE_OWNERSHIP_REQUIRED');console.log(await cdp.evaluate(({expected,id})=>{const panel=document.querySelector('.fs-shop-window'),recordId=[...panel?.querySelectorAll('dt')??[]].find(e=>e.textContent==='编号')?.nextElementSibling?.textContent;if(panel?.querySelector('h2')?.textContent!==expected||recordId?.trim()!==String(id)||!panel.innerText.includes('尚未执行'))throw Error('OWNED_DELETE_PREVIEW_MISMATCH');const button=panel.querySelector('.fs-shop-confirm');if(!button||button.disabled)throw Error('CONFIRMATION_UNAVAILABLE');button.click();return {confirmed:true,title:expected,id}},{expected,id:owned.id}));
 }
 if(action==='confirm'){
 const expected=process.argv[3];console.log(await cdp.evaluate(expected=>{const panel=document.querySelector('.fs-shop-window');if(panel?.querySelector('h2')?.textContent!==expected||!panel.innerText.includes('FS_AGENT_ACCEPTANCE_20261015_R88')||!panel.innerText.includes('尚未执行'))throw Error('ONLY_CURRENT_MARKED_R88_FIXTURE');const button=panel.querySelector('.fs-shop-confirm');if(!button||button.disabled)throw Error('CONFIRMATION_UNAVAILABLE');button.click();return {confirmed:true,title:expected}},expected));
 }
 if(action==='view'){
  const title=process.argv[3];
  for(let n=0;n<40;n++){const pending=await cdp.evaluate(()=>document.querySelector('.fs-shop-window')?.innerText.includes('正在执行')??false,null);if(!pending)break;if(n===39)throw Error('WAIT_FOR_EXISTING_CONFIRMATION');await new Promise(r=>setTimeout(r,100));}
  await cdp.evaluate(title=>{document.querySelector('.fs-shop-window button[aria-label="关闭业务窗口"]')?.click();const card=[...document.querySelectorAll('.fs-shop-card')].findLast(c=>c.querySelector('strong')?.textContent===title);card?.querySelector('button')?.click();return !!card},title);
  for(let n=0;n<40;n++){const ready=await cdp.evaluate(title=>document.querySelector('.fs-shop-window h2')?.textContent===title,title);if(ready)break;await new Promise(r=>setTimeout(r,100));}
  const text=await cdp.evaluate(()=>document.querySelector('.fs-shop-window')?.innerText??'loading',null);await fs.writeFile('D:/项目/.codex-build/shop-agent-88-repair-20261015/view.txt',text);console.log(text.slice(0,5000));
 }
}finally{cdp.close()}
