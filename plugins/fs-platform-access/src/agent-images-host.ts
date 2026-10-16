import type {Context} from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import {AgentImageService,type ImageIdentity} from './agent-images.js'
import type {ShopThemeService} from './shop.js'
import {createHash} from 'node:crypto'
import {garmentReference,exportFashionFile} from './fashion-files.js'
import path from 'node:path'
import os from 'node:os'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {ContentBlock} from '@deepseek-ai/dsh-llm'

export function renderFashionResult(input:unknown):ContentBlock[]{
 const value=input as Record<string,unknown>
 const {preview,sourcePreview,...receipt}=value
 return [{type:'text',text:JSON.stringify(receipt)},...[preview,sourcePreview].filter(Boolean).map(attachment=>({type:'image' as const,attachment:attachment as Extract<ContentBlock,{type:'image'}>['attachment']}))]
}
export function nativeImageRequestId(sessionId:string,callId:string,input:unknown):string{
 if(typeof input==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(input))return input
 return 'native-'+createHash('sha256').update(JSON.stringify([sessionId,callId])).digest('hex').slice(0,32)
}
export function mountAgentImages(ctx:Context,origin:string,authorize:(sessionId:string)=>Promise<ImageIdentity>,shop:ShopThemeService,authorizeShop?:(sessionId:string)=>Promise<unknown>,authorizeWebsite?:(sessionId:string)=>Promise<unknown>){
 const service=new AgentImageService(origin,authorize,shop)
 ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/_futurestaff/fashion/export',handler:async(request,response)=>{
  const send=(status:number,value:unknown)=>{response.statusCode=status;response.setHeader('content-type','application/json');response.setHeader('cache-control','no-store');response.end(JSON.stringify(value))}
  if(request.method!=='POST'||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.socket.remoteAddress??'')||request.headers['x-futurestaff-fashion']!=='1'||(request.headers.origin&&request.headers.origin!=='http://'+request.headers.host)){send(403,{error:'FASHION_EXPORT_DENIED'});return}
  try{
   let raw='';for await(const chunk of request){raw+=String(chunk);if(Buffer.byteLength(raw)>2048){send(413,{error:'FASHION_EXPORT_INVALID'});return}}
   const input=JSON.parse(raw) as {sessionId?:unknown;requestId?:unknown}
   if(Object.keys(input).some(key=>!['sessionId','requestId'].includes(key))||typeof input.sessionId!=='string'||!input.sessionId||input.sessionId.length>256||typeof input.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(input.requestId)){send(400,{error:'FASHION_EXPORT_INVALID'});return}
   const identity=await authorize(input.sessionId)
   const downloaded=await service.fashionDownload(input.sessionId,{requestId:input.requestId},undefined,identity)
   const current=await authorize(input.sessionId)
   if(current.agentId!==identity.agentId||current.version!==identity.version||current.workspacePath!==identity.workspacePath)throw Error('AGENT_CHANGED')
   const file=await exportFashionFile(identity.workspacePath,String(downloaded.requestId),path.join(os.homedir(),'Downloads'))
   identity.signal.throwIfAborted()
   send(200,{path:file,status:'succeeded'})
  }catch{send(400,{error:'FASHION_EXPORT_UNAVAILABLE'})}
 }}),'User initiated fashion original export')
 ctx.inject(['tools'],toolCtx=>{
  const requestId={type:'string',minLength:8,maxLength:80,description:'唯一UUID或8至80位字母数字编号；Host稳定转为UUID，同一编号不会重新生成。超时查询原编号或结果中的requestId。'},role={type:'string',enum:['banner','category','navigation']}
  const definitions=[
   {name:'website_image_download',description:'将已完成的网站效果图请求下载到当前智能体 website-output；生成成功但下载失败时用本工具重试原 requestId，不重新生图。',parameters:{type:'object',properties:{requestId},required:['requestId'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.fashionDownload(id,{requestId:(input as {requestId:string}).requestId,folder:'website-output'},signal)},
   {name:'website_image_generate',description:'根据业务需求、品牌和可选参考截图生成网站设计效果图。Host只使用当前主体已有免费 futurestaff-image 模型并核实零价格，不需要开通 Web 系统；不会发布网站。imagePaths 为当前工作区最多两张参考图，返回真实 website-output 文件；结果未知时只查询原 requestId，禁止重生成。',parameters:{type:'object',properties:{requestId:{type:'string',maxLength:80},prompt:{type:'string',minLength:1,maxLength:15000},size:{type:'string',enum:['1024x1024','1536x1024','1024x1536','768x1024','1024x768']},imagePaths:{type:'array',maxItems:2,items:{type:'string'}}},required:['prompt'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.websiteGenerate(id,input as Parameters<AgentImageService['websiteGenerate']>[1],signal)},
   {name:'fashion_detail_material',description:'服装详情素材优先用本工具直接裁切商家原图像素，禁止让生图模型重新绘制腰带、口袋、袖口或面料。先 read_image 和 inspect 确认原图像素尺寸，region 使用原图像素坐标，每次一个部位。保留实际颜色与结构，不调色、不拉伸、不补图，不调用收费模型。成功返回原图来源和可查看/下载的素材；裁切选区仍需人工审核。',parameters:{type:'object',properties:{requestId:{type:'string',maxLength:80},imagePath:{type:'string'},label:{type:'string',minLength:1,maxLength:80},region:{type:'object',properties:{left:{type:'integer',minimum:0},top:{type:'integer',minimum:0},width:{type:'integer',minimum:4},height:{type:'integer',minimum:4}},required:['left','top','width','height'],additionalProperties:false}},required:['imagePath','label','region'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.fashionDetail(id,input as Parameters<AgentImageService['fashionDetail']>[1],signal)},
   {name:'fashion_image_generate',description:'使用当前主体已有免费模型和真实服装原图生成模特上身草稿。Host固定版型、颜色、腰带、口袋、袖口保真约束，成功结果附商家原图供对照。详情部位素材必须优先使用 fashion_detail_material 裁切原图，不能让模型重绘商品细节。Host自动选唯一 futurestaff-image / futurestaff_ai 模型并稳定生成requestId，不要猜ID或Token。成功后先下载落盘，再返回可查看的path及工具可用的相对imagePath；只查看实际返回路径，不猜文件名。downloadStatus非succeeded时只查询或下载原请求，绝不能重生成。imagePaths 为当前工作区相对路径，每张先预览。',parameters:{type:'object',properties:{requestId:{type:'string',maxLength:80,description:'可省略；结果会返回真实requestId，用于查询和下载。'},tool:{type:'string',description:'兼容旧参数，可省略；Host自动选择已有免费模型。'},prompt:{type:'string',maxLength:15000},size:{type:'string',enum:['1024x1024','1536x1024','1024x1536','768x1024','1024x768']},imagePaths:{type:'array',minItems:1,maxItems:2,items:{type:'string'}}},required:['prompt','imagePaths'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.fashionGenerate(id,input as Parameters<AgentImageService['fashionGenerate']>[1],signal)},
   {name:'fashion_image_process',description:'对工作区相对imagePath执行rembg抠图或像素检查。requestId可省略，Host稳定生成；抠图成功先下载落盘，再返回真实path和相对imagePath，只查看返回文件。inspect返回规格，不生成商品事实。未知状态只查询原requestId，不换ID重做。',parameters:{type:'object',properties:{requestId:{type:'string',maxLength:80},imagePath:{type:'string'},action:{type:'string',enum:['inspect','remove_background']}},required:['imagePath','action'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.fashionProcess(id,input as Parameters<AgentImageService['fashionProcess']>[1],signal)},
   {name:'fashion_image_download',description:'下载当前用户在当前 Agent 中已完成的图片请求到私有工作区 fashion-output；返回实际文件路径供预览和交付，不发布到商城。',parameters:{type:'object',properties:{requestId},required:['requestId'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.fashionDownload(id,input as {requestId:string},signal)},
   {name:'agent_image_tools',description:'读取当前会话绑定智能体已有且获准使用的生图工具与参数。凭据由 Agent 系统保存，禁止要求用户手填 Token 或改用商城试戴配置。',parameters:{type:'object',properties:{},additionalProperties:false},run:(id:string,_input:unknown,signal:AbortSignal)=>service.list(id,signal)},
   {name:'agent_image_generate',description:'调用当前智能体已配置的原生生图模型。先询问装修目标、风格和是否生图，按用户确认的数量先做样图；不默认三张或固定配色。先等待 agent_image_tools 返回，tool 使用真实名称；每张图片一个requestId。超时先查原请求，禁止重复生图。生成后用 shop_theme_asset_from_image 自动压缩上传；上传失败保留原请求并说明，不读取base64或改用Shell。',parameters:{type:'object',properties:{requestId,tool:{type:'string'},prompt:{type:'string',maxLength:15000},size:{type:'string'}},required:['requestId','tool','prompt','size'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.generate(id,input as Parameters<AgentImageService['generate']>[1],signal)},
   {name:'agent_image_status',description:'查询原生图 UUID 请求的实际结果；unknown 时禁止重复提交。',parameters:{type:'object',properties:{requestId},required:['requestId'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.status(id,(input as {requestId:string}).requestId,signal)},
{name:'shop_theme_asset_from_image',description:'将当前智能体生成的图片自动读取、压缩并上传为商城主题资产；无需复制 base64 或 Token。之后用商城 asset_attach 绑定真实图片槽位。',parameters:{type:'object',properties:{imageRequestId:requestId,requestId,role},required:['imageRequestId','requestId','role'],additionalProperties:false},run:(id:string,input:unknown,signal:AbortSignal)=>service.upload(id,input as Parameters<AgentImageService['upload']>[1],signal)},
  ]
  for(const definition of definitions)toolCtx.effect(()=>toolCtx.tools.register({name:definition.name,description:definition.description,parameters:definition.parameters,output:{schema:{type:'object',additionalProperties:true},render:(_args,value)=>renderFashionResult(value)},execute:async(input,exec)=>{if(!exec.agent)throw Error('AGENT_SESSION_REQUIRED');if(definition.name==='shop_theme_asset_from_image')await authorizeShop?.(exec.agent.id);if(['website_image_generate','fashion_image_generate','fashion_image_process','fashion_detail_material'].includes(definition.name)){const value=input as Record<string,unknown>;input={...value,requestId:nativeImageRequestId(exec.agent.id,String(exec.callId),value.requestId),...(['website_image_generate','fashion_image_generate'].includes(definition.name)?{size:value.size??(definition.name==='website_image_generate'?'1536x1024':'1024x1536')}:{})}}
   if(definition.name.startsWith('website_'))await authorizeWebsite?.(exec.agent.id)
   const value=await definition.run(exec.agent.id,input,exec.signal) as Record<string,unknown>
   if((definition.name.startsWith('fashion_')||definition.name.startsWith('website_'))&&(value.status==='succeeded'||definition.name.endsWith('image_download'))&&typeof value.imagePath==='string'){
    const identity=await authorize(exec.agent.id),attachments=toolCtx.get('attachments')
    if(!attachments)return {...value,previewStatus:'unavailable'}
    let preview,sourcePreview
    try{
     const dataUrl=await garmentReference(identity.workspacePath,value.imagePath)
     preview=await attachments.saveImage({data:Buffer.from(dataUrl.split(',')[1]!,'base64'),mediaType:'image/png',name:value.imagePath.split('/').pop()!})
     if(typeof value.sourceImagePath==='string'){
      const source=await garmentReference(identity.workspacePath,value.sourceImagePath)
      sourcePreview=await attachments.saveImage({data:Buffer.from(source.split(',')[1]!,'base64'),mediaType:'image/png',name:'原图参考.png'})
     }
    }catch{exec.signal.throwIfAborted();identity.signal.throwIfAborted()}
    const current=await authorize(exec.agent.id)
    if(current.agentId!==identity.agentId||current.version!==identity.version||current.workspacePath!==identity.workspacePath)throw Error('AGENT_CHANGED')
    return {...value,...(preview?{preview}:{}),...(sourcePreview?{sourcePreview}:{}),previewStatus:preview?'succeeded':'unavailable'}
   }
   return value
  },timeoutMs:300000}),'Agent image '+definition.name)
 })
 return service
}
