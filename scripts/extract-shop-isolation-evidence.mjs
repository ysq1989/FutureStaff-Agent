import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
const root='C:/Users/10089/.futurestaff/workspaces/production/6e7db441-c4ea-4f16-8261-9e1a5379b2ff/users/242ab148-8370-4d54-b6bb-da4bbee4a0f3/sessions'
const directory=fs.readdirSync(root).find(name=>name.includes('2129a23b-b85b-4abe-8a7a-23e2ed6d6980'))
const file=path.join(root,directory,'session-350fa57a-255d-4d8d-b260-30529d428278/session.jsonl.zstd')
const bytes=fs.readFileSync(file),chunks=[]
for(let offset=0;offset<bytes.length;){const frame=zlib.zstdDecompressSync(bytes.subarray(offset),{info:true});if(!frame.engine.bytesWritten)throw Error('Invalid frame');chunks.push(frame.buffer);offset+=frame.engine.bytesWritten}
const events=Buffer.concat(chunks).toString().split('\n').filter(Boolean).map(line=>JSON.parse(line))
const results=new Map(events.filter(event=>event.type==='tool/result').map(event=>[event.data.message.source.callId,event.data]))
const records=[]
for(const event of events.filter(event=>event.type==='tool/call')){
 const call=event.data
 if(!['shop_tools','shop_query','shop_theme_tools','shop_theme_call','erp_query','call_erp_api','agent_image_tools','agent_image_generate','agent_image_status','shop_theme_asset_from_image'].includes(call.name))continue
 const args=JSON.parse(call.arguments)
 const result=results.get(call.callId)
 const texts=result?.message.content.flatMap(block=>block.content??[]).filter(block=>block.type==='text').map(block=>block.text)??[]
 let data
 try{const value=JSON.parse(texts.join('\n'));data=value.structuredContent??value;if(value.isError)data={isError:true,error:value.content?.[0]?.text}}catch{
  const text=texts.join('\n'),revision=/\\?"revision\\?"\s*:\s*(\d+)/.exec(text),title=/\\?"title\\?"\s*:\s*\\?"([^"\\]+)/.exec(text)
  data=revision?{revision:Number(revision[1]),...(title?{title:title[1]}:{}),partialOutput:true}:{error:text.slice(0,200)}
 }
 const fields=['total','source','filters','draftId','revision','title','themeId','status','activated','rollbackRef','activeRevision','previewUrl','valid','imageCount','imageBytes','isError','error','credentialSource','agentVersion','requestId','bytes','sha256','engineRequestId','model','errorCode','assetRef','partialOutput']
 const summary=Object.fromEntries(fields.filter(key=>data?.[key]!==undefined).map(key=>[key,data[key]]))
 if(data?.activeTheme)summary.activeTheme=data.activeTheme
 if(Array.isArray(data?.tools))summary.toolCount=data.tools.length
 records.push({hostTool:call.name,turn:call.turn,step:call.step,tool:args.name??call.name,arguments:['shop_theme_call','shop_query'].includes(call.name)?args.arguments:args,result:summary})
}
const destination='D:/项目/crmeb-shop/output/agent-theme-desktop/shop-isolation-dialogue.json'
fs.writeFileSync(destination,JSON.stringify({sessionId:'session-350fa57a-255d-4d8d-b260-30529d428278',realDesktopDialogue:true,records},null,2))
console.log(JSON.stringify(records.filter(record=>record.turn>=1),null,2))
