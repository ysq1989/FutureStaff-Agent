import {createHash} from 'node:crypto'
export type ShopIdentity = { owner:string; signal:AbortSignal; origin?:string }
export type ShopRequest = (path:string, init:RequestInit)=>Promise<Response>
const names=new Set(['context','themes_list','get','components','catalog_list','draft_create','draft_get','plan_update','asset_upload','asset_attach','validate','preview','apply','operation_status','rollback'].map(name=>name==='themes_list'?'shop_themes_list':'shop_theme_'+name))

/** Keep the editable contract and receipts, not two copies of full native page JSON. */
function themeAgentView(result:unknown):unknown{
 if(!result||typeof result!=='object')throw Error('SHOP_MCP_REJECTED')
 const envelope=result as {isError?:boolean;structuredContent?:unknown;content?:Array<{type:string;text?:string}>}
 if(envelope.isError){const code=envelope.content?.find(b=>b.type==='text')?.text;throw Error(typeof code==='string'&&/^(?:THEME|DSH)_[A-Z_]+$/.test(code)?code:'SHOP_THEME_OPERATION_FAILED')}
 let value=envelope.structuredContent
 if(value===undefined&&envelope.content){try{value=JSON.parse(envelope.content.find(b=>b.type==='text')?.text??'')}catch{throw Error('SHOP_MCP_REJECTED')}}
 if(value===undefined)value=result
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('SHOP_MCP_REJECTED')
 const {sections,...view}=value as Record<string,unknown>
 if(sections&&typeof sections==='object')view.componentSummary=Object.entries(sections).flatMap(([section,page])=>{
  const nodes=(page as {value?:Record<string,{name?:string}>}|null)?.value
  return nodes&&typeof nodes==='object'?Object.entries(nodes).map(([componentId,node])=>({section,componentId,name:node?.name})):[]
 })
 if(Array.isArray(view.imageSlots))view.imageSlots=view.imageSlots.map(slot=>{
  const {slotId,section,componentId,path,role}=slot;return {slotId,section,componentId,path,role}
 })
 if(Array.isArray(view.components))view.components=view.components.map(component=>({...component,editable:component.editable?.map((field:{path:string;value:unknown})=>({path:field.path,value:typeof field.value==='string'&&field.value.length>180?field.value.slice(0,180):field.value,...(typeof field.value==='string'&&field.value.length>180?{valueTruncated:true}:{})}))}))
 return view
}

/** Credentials exist only in this Host service, bound to the current Platform identity. */
export class ShopThemeService {
 private credential:{owner:string;signal:AbortSignal;token:string;until:number}|undefined
 private sequence=0
 constructor(private authorize:()=>Promise<ShopIdentity>,private request:ShopRequest){}
 dispose(){this.credential=undefined}
 private async rpc(method:string,params:unknown):Promise<unknown>{
  const identity=await this.authorize();identity.signal.throwIfAborted()
  let credential=this.credential
  if(!credential||credential.owner!==identity.owner||credential.signal!==identity.signal||credential.until<=Date.now()){
   this.credential=undefined
   const response=await this.request('/adminapi/platform_login',{method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:identity.signal})
   const body=await response.json() as {status?:number;data?:{token?:string}}
   if(!response.ok||body.status!==200||typeof body.data?.token!=='string'||!body.data.token)throw Error('SHOP_LOGIN_DENIED')
   credential={...identity,token:body.data.token,until:Date.now()+300000};this.credential=credential
   identity.signal.addEventListener('abort',()=>{if(this.credential===credential)this.credential=undefined},{once:true})
  }
  identity.signal.throwIfAborted()
  const id=++this.sequence
  let body:{id?:number;error?:unknown;result?:unknown}
  try{
   const response=await this.request('/adminapi/dsh/mcp',{method:'POST',headers:{'content-type':'application/json','Authori-zation':'Bearer '+credential.token},body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:identity.signal})
   if(!response.ok)throw Error('HTTP')
   body=await response.json() as typeof body
  }catch{throw Error('SHOP_RESULT_UNCONFIRMED: 查询原 requestId 的 operation_status，勿自动重试写入。')}
  identity.signal.throwIfAborted()
  if(body.id!==id||body.error||!('result'in body))throw Error('SHOP_MCP_REJECTED')
  if(identity.origin&&body.result&&typeof body.result==='object'){
   const result=body.result as {structuredContent?:{previewUrl?:string};content?:Array<{type:string;text?:string}>}
   const preview=result.structuredContent?.previewUrl
   if(preview&&/^\/pages\/index\/index\?theme_id=[1-9][0-9]*$/.test(preview)){
    result.structuredContent!.previewUrl=new URL(preview,identity.origin).href
    result.content=[{type:'text',text:JSON.stringify(result.structuredContent)}]
   }
  }
  return body.result
 }
 async list(includeProducts=false){
  const result=await this.rpc('tools/list',{}) as {tools?:Array<{name:string;description?:string;inputSchema?:unknown}>}
  if(!Array.isArray(result.tools))throw Error('SHOP_MCP_REJECTED')
  return {hostTool:'shop_theme_call',callFormat:{name:'operationName',arguments:'按argumentsSchema填写'},operations:result.tools.filter(tool=>names.has(tool.name)||includeProducts&&tool.name==='shop_products_list').map(tool=>({operationName:tool.name,...(tool.description?{description:tool.description}:{}),...(tool.inputSchema?{argumentsSchema:tool.inputSchema}:{})}))}
 }
 async products(args:Record<string,unknown>){return this.rpc('tools/call',{name:'shop_products_list',arguments:args})}
 async catalog(input:{category?:string;search?:string;limit?:number;offset?:number}={}){
  const result=await this.rpc('tools/list',{...input,limit:input.limit??30}) as {tools?:Array<{name:string}>;categories?:Record<string,number>;total?:number}
  if(!Array.isArray(result.tools)||result.tools.some(tool=>typeof tool.name!=='string'))throw Error('SHOP_MCP_REJECTED')
  return {categories:result.categories??{},total:result.total??result.tools.length,tools:input.category||input.search?result.tools.filter(tool=>tool.name.startsWith('shop_api_')):result.tools.filter(tool=>tool.name==='shop_products_list'),hint:'按category或search读取当前账号获准使用的shop_api_*操作参数，再调用shop_call；商品快捷查询使用shop_query，主题使用shop_theme_tools；写操作等待用户在业务窗口确认。'}
 }
 async admin(name:string,args:Record<string,unknown>){
  // Preserve existing read aliases without treating a routing mistake as lost authority.
  if(names.has(name))throw Error('SHOP_THEME_TOOL_USE_SHOP_THEME_CALL')
  if(!/^shop_api_[a-zA-Z0-9_]+$/.test(name)&&!['shop_products_list','shop_orders_list'].includes(name))throw Error('SHOP_TOOL_DENIED')
  return this.rpc('tools/call',{name,arguments:args})
 }
 async confirmOperation(operationId:string){return this.rpc('operations/confirm',{operationId})}
 async operation(operationId:string){return this.rpc('operations/status',{operationId})}
 async call(name:string,args:Record<string,unknown>,sessionId=''){
  if(!names.has(name))throw Error('SHOP_TOOL_DENIED')
  if(typeof args.requestId==='string'&&args.requestId.length<16){
   if(!/^[A-Za-z0-9_-]{8,15}$/.test(args.requestId))throw Error('SHOP_REQUEST_ID_INVALID')
   const identity=await this.authorize();identity.signal.throwIfAborted()
   args={...args,requestId:'shop-'+createHash('sha256').update(JSON.stringify([identity.owner,sessionId,args.requestId])).digest('hex').slice(0,32)}
  }
  return themeAgentView(await this.rpc('tools/call',{name,arguments:args}))
 }
}
