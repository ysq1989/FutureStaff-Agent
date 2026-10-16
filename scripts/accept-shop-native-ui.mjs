/** Acceptance through the installed native UI; never reads or handles credentials. */
import fs from 'node:fs/promises'
import {Cdp} from '@futurestaff/douyin-dm-mcp/browser'
const output='D:/项目/.codex-build/shop-agent-full-access-20261015'
const port=(await fs.readFile('C:/Users/10089/AppData/Roaming/FutureStaff Agent/DevToolsActivePort','utf8')).split('\n')[0]
const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const cdp=await Cdp.connect(tabs.find(tab=>tab.type==='page'&&tab.url.startsWith('http://127.0.0.1')).webSocketDebuggerUrl)
try{
 const action=process.argv[2]
 if(action==='send'){
  const text=await fs.readFile(process.argv[3],'utf8')
  await cdp.evaluate(()=>{document.querySelector('.fs-shop-window button[aria-label="关闭业务窗口"]')?.click();[...document.querySelectorAll('button')].find(button=>button.textContent==='会话')?.click();return true},null)
  await new Promise(resolve=>setTimeout(resolve,100))
  await cdp.evaluate(()=>{document.querySelector('[contenteditable=true]').focus();return true},null)
  await cdp.call('Input.insertText',{text})
  await new Promise(resolve=>setTimeout(resolve,100))
  const result=await cdp.evaluate(()=>{const button=document.querySelector('button[aria-label="发送消息"]');if(!button||button.disabled)return{sent:false};button.click();return{sent:true}},null)
  if(!result.sent)throw Error('SHOP_NATIVE_COMPOSER_BUSY')
  console.log(result)
 }else if(action==='open'){
  console.log(await cdp.evaluate(()=>{[...document.querySelectorAll('.fs-shop-card button')].findLast(button=>button.textContent==='核对并确认')?.click();return true},null))
 }else if(action==='confirm'){
  let text
  for(let attempt=0;attempt<50;attempt++){text=await cdp.evaluate(()=>document.querySelector('.fs-shop-window')?.textContent??null,null);const title=await cdp.evaluate(()=>document.querySelector('.fs-shop-window h2')?.textContent??null,null);if(text?.includes('尚未执行')&&(!process.argv[3]||title===process.argv[3]))break;await new Promise(resolve=>setTimeout(resolve,50))}
  if(process.argv[3]&&await cdp.evaluate(()=>document.querySelector('.fs-shop-window h2')?.textContent??null,null)!==process.argv[3])throw Error('UNEXPECTED_SHOP_PREVIEW')
  if(!text?.includes('FS_AGENT_ACCEPTANCE_20261015')||!text.includes('尚未执行'))throw Error('ONLY_MARKED_SHOP_FIXTURE_MAY_BE_CONFIRMED')
  console.log(await cdp.evaluate(()=>{document.querySelector('.fs-shop-confirm').click();return true},null))
 }else if(action==='records'){
  const rows=await cdp.evaluate(async()=>{
   const element=document.querySelector('button');let root=element[Object.keys(element).find(key=>key.startsWith('__reactFiber'))];while(root?.return)root=root.return
   const visited=new Set(),rows=new Map()
   function visit(fiber){
    if(!fiber||visited.has(fiber))return;visited.add(fiber)
    const props=fiber.memoizedProps,block=props?.block
    if(block?.kind==='tool-result'&&props.toolName==='shop_call'){
     let args=block.call.argsRaw,value
     try{if(typeof args==='string')args=JSON.parse(args)}catch{}
     for(const item of block.content??[])if(item.type==='text'){try{value=JSON.parse(item.text);break}catch{}}
     const payload=value?.data,name=args?.name
     if(typeof name==='string'&&/^shop_(?:api_[a-zA-Z0-9_]+|orders_list|products_list)$/.test(name))rows.set(props.callId,{callId:props.callId,name,viewId:value?.viewId??block.meta?.viewId,sessionId:block.meta?.sessionId,kind:value?.kind,state:payload?.state,readOnly:payload?.readOnly,resultStatus:payload?.data?.status,error:block.isError?block.content?.filter(item=>item.type==='text').flatMap(item=>item.text.match(/(?:SHOP|DSH)_[A-Z_]+/g)??[]):null})
    }
    visit(fiber.child);visit(fiber.sibling)
   }
   visit(root)
   await Promise.all([...rows.values()].filter(row=>!row.error&&!row.kind&&row.viewId&&row.sessionId).map(async row=>{
    try{
     const response=await fetch('/_futurestaff/shop/operation',{method:'POST',headers:{'content-type':'application/json','x-futurestaff-shop':'1'},body:JSON.stringify({action:'view',viewId:row.viewId,sessionId:row.sessionId})})
     const view=await response.json();if(response.ok)Object.assign(row,{kind:view.kind,state:view.data?.state,readOnly:view.data?.readOnly,resultStatus:view.data?.data?.status,verifiedThroughNativeView:true});else row.error=[view.error??'SHOP_VIEW_UNVERIFIED']
    }catch{row.error=['SHOP_VIEW_UNVERIFIED']}
   }))
   return [...rows.values()]
  },null)
  const file=output+'/native-request-coverage.json';let prior=[];try{prior=JSON.parse(await fs.readFile(file,'utf8'))}catch{}
  const merged=new Map(prior.map(row=>[row.callId,row]))
  for(const row of rows){const old=merged.get(row.callId);merged.set(row.callId,old?.kind&&!row.kind?old:row)}
  const all=[...merged.values()]
  await fs.writeFile(file,JSON.stringify(all,null,2))
  console.log(JSON.stringify({newRows:rows.length,recorded:all.length,last:rows.slice(-4)}))
 }else{
  const text=await cdp.evaluate(()=>document.body.innerText,null)
  await fs.writeFile(output+'/native-session-text.txt',text)
  console.log(JSON.stringify({tail:text.slice(-6000),cards:await cdp.evaluate(()=>document.querySelectorAll('.fs-shop-card').length,null)}))
 }
}finally{cdp.close()}
