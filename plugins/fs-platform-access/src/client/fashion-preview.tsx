import {createElement,useEffect,useState,useRef} from 'react'
import type {Context} from '@deepseek-ai/cordis'
import type {ToolCallViewProps} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {ContentBlock} from '@deepseek-ai/dsh-llm'
import {fashionGalleryDefinition,uniqueFashionGallery,galleryToolResult,type FashionGalleryItem} from './fashion-gallery.js'
import {fashionPreviewCss} from './fashion-preview-style.js'

/** Images remain session-authorized attachments; renderer never reads local paths. */
export function mountFashionPreviews(ctx:Context){
 ctx.inject(['uiConversation'],scope=>{
 scope.effect(()=>scope.uiConversation.events.register(fashionGalleryDefinition))
 scope.effect(()=>{const style=document.createElement('style');style.dataset.futurestaffFashion='gallery';style.textContent=fashionPreviewCss;document.head.append(style);return()=>style.remove()})
 function FashionPreview({block,sessionId,openFile}:ToolCallViewProps){
  const settled='kind' in block&&block.kind==='tool-result'?block:undefined
  const content:readonly ContentBlock[]=settled?.content??[]
  const images=content.filter(item=>item.type==='image'),image=images[0],source=images[1]
  let receipt:Record<string,unknown>={}
  try{const text=content.find(item=>item.type==='text');if(text?.type==='text')receipt=JSON.parse(text.text)}catch{}
  const [url,setUrl]=useState<string>(),[error,setError]=useState(false)
  const [sourceUrl,setSourceUrl]=useState<string>()
  const [exportState,setExportState]=useState(''),[exporting,setExporting]=useState(false)
  const [zoom,setZoom]=useState(false),dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{if(zoom&&url)dialog.current?.showModal();return()=>dialog.current?.close()},[zoom,url])
  const attachment=image?.type==='image'?image.attachment:undefined
  useEffect(()=>{
   let live=true;setUrl(undefined);setSourceUrl(undefined);setError(false)
   if(attachment)scope.uiConversation.imageUrl(sessionId,attachment).then(value=>{if(live)setUrl(value)},()=>{if(live)setError(true)})
   if(source?.type==='image')scope.uiConversation.imageUrl(sessionId,source.attachment).then(value=>{if(live)setSourceUrl(value)},()=>{})
   return ()=>{live=false}
  },[sessionId,attachment?.attachmentId,source?.attachment.attachmentId])
  const file=typeof receipt.imagePath==='string'?receipt.imagePath:undefined
  const requestId=typeof receipt.requestId==='string'?receipt.requestId:undefined
  const download=async()=>{
   setExporting(true);setExportState('')
   try{
    const response=await fetch('/_futurestaff/fashion/export',{method:'POST',headers:{'content-type':'application/json','x-futurestaff-fashion':'1'},body:JSON.stringify({sessionId,requestId}),cache:'no-store'})
    if(!response.ok)throw Error('export')
    const result=await response.json() as {path:string};setExportState('已下载原图：'+result.path)
   }catch{setExportState('下载未完成，请稍后重试；已生成文件仍保留。')}
   finally{setExporting(false)}
  }
  const copied=receipt.fidelityMode==='source-crop',unconfirmed=receipt.status==='unknown',generated=receipt.fidelityMode==='reference-generation'||receipt.model==='futurestaff-image',title=settled?.isError||receipt.status==='failed'?'处理未完成':unconfirmed?'生成结果待确认':!settled?'正在处理素材':typeof receipt.label==='string'?receipt.label:receipt.imageRole==='on-model'?'模特上身图':attachment?'服装素材':'规格检查'
  return createElement('figure',{'data-fashion-preview':true,className:'fs-fashion-card'},
   createElement('div',{className:'fs-fashion-card__head'},createElement('figcaption',{title},title),createElement('span',{className:'fs-fashion-badge'},copied?'原图裁切':unconfirmed?'未确认':'待审核')),
   attachment?createElement('button',{type:'button',className:'fs-fashion-card__media',disabled:!url,onClick:()=>setZoom(true),'aria-label':'查看生成图片'},url?createElement('img',{src:url,alt:title,onError:()=>{setError(true);setUrl(undefined)}}):createElement('p',{role:error?'alert':'status'},error?'预览暂不可用，原文件已保留':'正在加载预览…')):null,
   zoom&&url?createElement('dialog',{ref:dialog,className:'fs-fashion-dialog','aria-label':'生成图片预览',onClose:()=>setZoom(false),onCancel:()=>setZoom(false)},
    createElement('div',{className:'fs-fashion-dialog__head'},createElement('strong',null,sourceUrl?'原图与素材对照':title),createElement('button',{type:'button',className:'fs-fashion-button',onClick:()=>setZoom(false)},'关闭预览')),
    createElement('div',{className:'fs-fashion-dialog__grid'+(sourceUrl?'':' fs-fashion-dialog__grid--single')},
     sourceUrl?createElement('figure',null,createElement('figcaption',null,'商家原图'),createElement('img',{src:sourceUrl,alt:'商家服装原图'})):null,
     createElement('figure',null,createElement('figcaption',null,copied?'原图像素裁切':'生成素材 · 待审核'),createElement('img',{src:url,alt:title}))),
    createElement('p',{className:'fs-fashion-dialog__note'},'核对版型、颜色、腰带、口袋与袖口；尺寸检查不能代替商品保真审核。')):null,
   createElement('div',{className:'fs-fashion-card__body'},
    attachment?createElement('p',{className:'fs-fashion-card__meta'},createElement('span',null,`${attachment.width} × ${attachment.height}`),createElement('span',null,copied?'来源像素保持':generated?'参考图生成':'图片素材')):null,
    createElement('div',{className:'fs-fashion-card__actions'},
     requestId&&file?createElement('button',{type:'button',className:'fs-fashion-button fs-fashion-button--primary','aria-label':'下载原图',disabled:exporting,onClick:download},exporting?'下载中…':'↓ 下载原图'):null,
     url?createElement('button',{type:'button',className:'fs-fashion-button',onClick:()=>setZoom(true)},sourceUrl?'原图对照':'放大预览'):file?createElement('button',{type:'button',className:'fs-fashion-button',onClick:()=>openFile(file)},'打开文件'):null),
    exportState?createElement('p',{role:'status',className:'fs-fashion-card__note'},exportState):null,
    unconfirmed?createElement('p',{className:'fs-fashion-card__note'},`原请求 ${typeof receipt.requestId==='string'?receipt.requestId:''} 尚未确认，请查询原请求；不会自动重新生成。`):null),
   settled?.isError?createElement('pre',{className:'fs-fashion-card__error'},content.filter(item=>item.type==='text').map(item=>item.type==='text'?item.text:'').join('\n')):null)
 }
 for(const key of ['fashion_image_generate','fashion_image_process','fashion_image_download','fashion_detail_material'])ctx.slots.inject('tool.call.toolview',()=>ctx.slots.register({name:'tool.call.toolview',key,priority:-100},FashionPreview))
 ctx.slots.inject('conversation.chat.turnTail',()=>ctx.slots.register({name:'conversation.chat.turnTail',priority:-100,select:(owner:{turn:{data:{get(key:'futurestaff-fashion-gallery'):{items:FashionGalleryItem[]}|undefined}};seq:number})=>{
  const items=uniqueFashionGallery(owner.turn.data.get('futurestaff-fashion-gallery')?.items??[],owner.seq)
  return items.length?items:null
 }},(props:ToolCallViewProps & {matched:FashionGalleryItem[]})=>createElement('section',{'aria-label':'本轮生成图片','data-fashion-gallery':true,className:'fs-fashion-gallery'},
  createElement('header',{className:'fs-fashion-gallery__head'},createElement('h3',null,'本轮生成图片'),createElement('span',null,`${props.matched.length} 张素材 · 使用前请审核`)),
  createElement('div',{className:'fs-fashion-gallery__grid'},...props.matched.map((item:FashionGalleryItem)=>createElement(FashionPreview,{...props,block:galleryToolResult(item),callId:item.callId,toolName:'fashion_image_generate',key:item.callId}))))) )
 })
}
