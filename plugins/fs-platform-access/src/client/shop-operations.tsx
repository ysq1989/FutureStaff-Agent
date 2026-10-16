import {useEffect,useRef,useState} from 'react'
import type {Context} from '@deepseek-ai/cordis'
import type {ToolCallViewProps} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {ShopOperationView} from '../shop-operations.js'
import {InteractionWindow,InteractionTable,interactionCss} from './interaction.js'
import {ShopRecommendations,shopRecommendationCss} from './shop-recommendations.js'
import type {ShopRecommendationData} from '../shop-products.js'
import {shopRecommendationDefinition,latestShopRecommendation,type ShopGalleryItem} from './shop-recommendation-gallery.js'
type Row=Record<string,unknown>
type Meta={kind:string;viewId:string;sessionId:string;title:string}
const labels:Record<string,string>={store_name:'商品名称',cate_name:'分类名称',price:'价格',stock:'库存',is_show:'上架状态',order_id:'订单号',pay_price:'实付金额',status:'状态',paid:'已支付',nickname:'会员昵称',name:'名称',title:'标题',count:'数量',total:'总数',balance:'余额',integral:'积分',amount:'金额',sort:'排序',phone:'电话',uid:'会员编号',id:'编号',params:'业务对象',query:'筛选条件',body:'业务内容'}
const states:Record<string,string>={prepared:'待确认',executing:'执行中',completed:'已完成',failed:'未完成',unknown:'结果待核实'}
async function api(action:'view'|'confirm'|'select',meta:Pick<Meta,'sessionId'|'viewId'>,productId?:number):Promise<ShopOperationView>{
 const response=await fetch('/_futurestaff/shop/operation',{method:'POST',headers:{'content-type':'application/json','x-futurestaff-shop':'1'},body:JSON.stringify({action,sessionId:meta.sessionId,viewId:meta.viewId,...(productId===undefined?{}:{productId})}),cache:'no-store'})
 const body=await response.json() as ShopOperationView&{error?:string}
 if(!response.ok){const messages:Record<string,string>={DSH_FORBIDDEN:'当前账号无权执行此操作，请检查商城授权与岗位权限。',SHOP_VIEW_EXPIRED:'预览已过期，请重新生成。',DSH_PREVIEW_EXPIRED:'预览已过期，请重新生成。',DSH_API_REJECTED:'商城原接口拒绝了这些参数，请补全或修改后重新预览。',DSH_RESULT_UNCONFIRMED:'结果待核实，请查询原操作状态，不要重复提交。',DSH_NATIVE_SETTINGS_REQUIRED:'此项需要在商城后台填写受保护设置。',DSH_BUSY:'操作正在处理中，请稍后查看。'};throw Error(messages[body.error??'']??'商城操作未完成，请检查权限、参数或当前业务状态。')}
 return body
}
export function ShopBusinessData({value}:{value:unknown}){
 let data=value
 if(data&&typeof data==='object'&&!Array.isArray(data)&&(data as Row).status===200)data=(data as Row).data
 const object=data&&typeof data==='object'&&!Array.isArray(data)?data as Row:undefined
 const listEnvelope=object&&Object.keys(object).every(key=>['list','items','rows','count','total','page','limit','per_page','pagination'].includes(key))
 const items=Array.isArray(data)?data:listEnvelope?['list','items','rows'].map(key=>object![key]).find(Array.isArray):undefined
 if(Array.isArray(items)&&items.length){
  const records=items.every(item=>item!==null&&typeof item==='object'&&!Array.isArray(item))
  if(!records)return <ul>{items.map((item,index)=><li key={index}><ShopBusinessData value={item}/></li>)}</ul>
  const columns=[...new Set(items.flatMap(item=>Object.keys(item as Row)))].filter(key=>items.some(item=>typeof(item as Row)[key]!=='object')).slice(0,8)
  return <>{object&&['count','total'].filter(key=>object[key]!==undefined).map(key=><p key={key}>{labels[key]}：{String(object[key])}</p>)}<InteractionTable rows={items as Row[]} columns={columns.map(key=>({key,label:labels[key]??key}))}/></>
 }
 if(Array.isArray(items)&&!items.length)return <p role="status">当前没有符合条件的记录。</p>
 if(object)return <dl>{Object.entries(object).map(([key,item])=><div key={key}><dt>{labels[key]??key}</dt><dd>{item&&typeof item==='object'?<ShopBusinessData value={item}/>:String(item??'—')}</dd></div>)}</dl>
 return <p>{String(data??'操作结果已返回。')}</p>
}
export function applyShopOperationClient(ctx:Context){
 let selected:ShopOperationView|undefined,revision=0;const listeners=new Set<()=>void>()
 const update=(view?:ShopOperationView)=>{selected=view;for(const listener of listeners)listener()}
 function Window(){
  const [view,setView]=useState(selected),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const pending=useRef(false)
  useEffect(()=>{const changed=()=>{setView(selected);setError('')};listeners.add(changed);return()=>{listeners.delete(changed)}},[])
  if(!view)return null
  const data=view.data as Row
  async function confirm(){if(pending.current)return;pending.current=true;const current=revision;setBusy(true);setError('');try{const result=await api('confirm',{viewId:view!.confirmationViewId??view!.viewId,sessionId:view!.sessionId});if(current===revision)update(result)}catch(reason){if(current===revision)setError((reason as Error).message)}finally{pending.current=false;setBusy(false)}}
  return <InteractionWindow className="fs-shop-window" title={view.title} busy={busy} onClose={()=>update()}>
   {view.kind==='preview'?<><p>请核对以下内容。尚未执行，点击确认后才会提交到商城。</p><ShopBusinessData value={data.arguments}/><button className="fs-shop-confirm" disabled={busy||data.state!=='prepared'} onClick={()=>{void confirm()}}>{busy?'正在执行，请勿重复提交…':'确认执行'}</button></>:<><p>操作状态：{states[String(data.state)]??'已读取'}</p><ShopBusinessData value={data.data}/></>}
   {data.state==='unknown'&&<p role="alert">结果待核实，请查看原操作状态，不要重复提交。</p>}
   {view.conversationUpdated===true&&<p role="status">已完成，结果已返回原 Shop Agent 会话。</p>}
   {view.conversationUpdated===false&&<p role="status">业务已完成，原会话暂未收到结果。<button disabled={busy} onClick={()=>{void confirm()}}>重试返回结果</button></p>}
   {error&&<p role="alert">{error}</p>}
  </InteractionWindow>
 }
 function Card({meta}:{meta:Meta}){
  const [view,setView]=useState<ShopOperationView>(),[error,setError]=useState('')
  useEffect(()=>{let current=true;const epoch=revision;const changed=()=>{if(epoch!==revision){setView(undefined);setError('登录身份已变更，请重新查询商品。')}};listeners.add(changed);void api('view',meta).then(value=>{if(current&&epoch===revision)setView(value)},reason=>{if(current&&epoch===revision)setError(reason.message)});return()=>{current=false;listeners.delete(changed)}},[meta.sessionId,meta.viewId])
  async function choose(productId:number){const epoch=revision;const result=await api('select',meta,productId);if(epoch!==revision)throw Error('登录身份已变更，请重新查询商品。');setView(result);return result.conversationUpdated===true}
  if(view?.kind==='recommendations')return <section className="fs-shop-card"><ShopRecommendations data={view.data as ShopRecommendationData} onSelect={choose}/></section>
  return <section className="fs-shop-card"><strong>{meta.title}</strong>{error?<p role="status">{error}</p>:!view?<p>正在核对当前账号权限…</p>:<><p>{view.kind==='preview'?'等待核对与确认，尚未执行。':'已读取当前账号获准访问的商城数据。'}</p><button onClick={()=>{const epoch=revision;void api('view',meta).then(value=>{if(epoch===revision)update(value)},reason=>{if(epoch===revision)setError(reason.message)})}}>{view.kind==='preview'?'核对并确认':'查看商城结果'}</button></>}</section>
 }
 for(const name of ['shop_call','shop_operation_status','shop_recommend_products'])ctx.slots.inject('tool.call.toolview',()=>ctx.slots.register({name:'tool.call.toolview',key:name},(props:ToolCallViewProps)=>{
  const block=props.block;if(!('kind'in block)||block.kind!=='tool-result')return <p>正在查询商城操作…</p>;if(block.isError)return <p role="alert">商城操作未完成，请检查账号权限和业务状态。</p>
  let meta=block.meta as Meta|undefined
  if(meta?.kind!=='futurestaff.shop')for(const item of block.content){if(item.type!=='text')continue;try{const value=JSON.parse(item.text) as ShopOperationView;if(value.module==='shop'&&value.viewId){meta={kind:'futurestaff.shop',viewId:value.viewId,sessionId:value.sessionId,title:value.title};break}}catch{}}
  if(name==='shop_recommend_products')return <p>图文推荐已生成，请在本轮回答下方查看图片并选择商品。</p>
  return meta?.kind==='futurestaff.shop'?<Card meta={meta}/>:<p>商城结果已返回，请查看会话说明。</p>
 }))
 ctx.inject(['uiConversation'],scope=>{
  scope.effect(()=>scope.uiConversation.events.register(shopRecommendationDefinition))
  ctx.slots.inject('conversation.chat.turnTail',()=>ctx.slots.register({name:'conversation.chat.turnTail',priority:-90,select:(owner:{turn:{data:{get(key:'futurestaff-shop-recommendations'):{items:ShopGalleryItem[]}|undefined}};seq:number})=>latestShopRecommendation(owner.turn.data.get('futurestaff-shop-recommendations')?.items??[],owner.seq)},(props:{matched:Meta})=><Card meta={props.matched}/>))
 })
 ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'futurestaff-shop-operation',order:21},Window))
 if(typeof document==='undefined')return
 const recommendationStyle=document.createElement('style');recommendationStyle.textContent=shopRecommendationCss;document.head.append(recommendationStyle);ctx.effect(()=>()=>recommendationStyle.remove(),'Shop recommendation UI styles')
 ctx.effect(()=>{let owner='';const changed=()=>{const snapshot=ctx.platformClientSession.getSnapshot(),next=['ready','no_apps'].includes(snapshot.phase)?`${snapshot.activeTenantId}:${snapshot.user?.userId}`:'';if(next!==owner){owner=next;revision++;update()}};changed();const unsubscribe=ctx.platformClientSession.subscribe(changed);return()=>{revision++;unsubscribe();update();listeners.clear()}},'Shop confirmation identity lifecycle')
 const style=document.createElement('style');style.textContent=interactionCss+`.fs-shop-card{margin:12px 0;padding:16px;border:1px solid var(--border-default);border-radius:8px;background:var(--bg-secondary)}.fs-shop-card button{padding:8px 12px;border:1px solid var(--border-default);border-radius:7px;background:var(--bg-tertiary);color:var(--text-primary);cursor:pointer}.fs-shop-card p,.fs-shop-window p{color:var(--text-secondary)}.fs-shop-window dl{display:grid;gap:12px}.fs-shop-window dl>div{min-width:0}.fs-shop-window dt{font-weight:600}.fs-shop-window dd{margin:4px 0;overflow-wrap:anywhere;min-width:0}.fs-shop-window .fs-shop-confirm{background:var(--accent-primary);color:var(--fs-on-accent)}.fs-shop-window [role=alert]{color:var(--error)}`;document.head.append(style);ctx.effect(()=>()=>style.remove(),'Shop operation UI styles')
}
