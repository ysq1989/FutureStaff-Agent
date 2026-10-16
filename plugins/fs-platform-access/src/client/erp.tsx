import {useState,useEffect} from 'react'
import type {Context} from '@deepseek-ai/cordis'
import type {ToolCallViewProps} from '@deepseek-ai/dsh-client-ui-tool/client'
import {InteractionWindow,InteractionTable,interactionCss} from './interaction.js'
import {ErpOrderForm,erpOrderFormCss} from './erp-order-form.js'
type Row=Record<string,unknown>
type View={viewId:string;sessionId:string;kind:string;title:string;resource:string;data:unknown;conversationUpdated?:boolean;confirmationViewId?:string}
type Meta={kind:string;viewId:string;sessionId:string;title:string}
const labels:Record<string,string>={name:'名称',customer_name:'客户',supplier_name:'供应商',product_name:'产品',material_name:'物料',warehouse_name:'仓库',order_no:'订单号',record_no:'单号',payment_no:'登记单号',sku:'产品编码',code:'编码',unit:'单位',quantity:'数量',stock_qty:'库存量',cost_price:'成本价',unit_price:'单价',total_amount:'总金额',paid_amount:'已收付金额',amount:'金额',status:'状态',notes:'备注',reason:'业务原因',description:'说明',order_date:'订单日期',due_date:'交付日期',record_date:'业务日期',payment_date:'登记日期',category_name:'分类',new_status:'目标状态',profit:'利润',revenue:'收入',expense:'支出',total_value:'总价值',discount:'折扣金额',tax_amount:'税额'}
const values:Record<string,string>={active:'在用',inactive:'停用',draft:'草稿',pending:'待处理',confirmed:'已确认',completed:'已完成',cancelled:'已取消',income:'收入',expense:'支出',receipt:'收款',payment:'付款'}
const operations:Record<string,string>={'sales.create':'新建销售订单草稿','sales.edit':'编辑销售订单','sales.status':'销售状态流转','purchase.create':'新建采购订单草稿','purchase.edit':'编辑采购订单','purchase.status':'采购状态流转','stock.inbound':'入库登记','stock.outbound':'出库登记','stock.transfer':'仓库调拨','production.create':'新建生产工单','production.status':'生产状态流转','payments.create':'收付款登记'}
async function api(action:string,sessionId:string,body:Row={}):Promise<View>{
 const response=await fetch('/_futurestaff/erp',{method:'POST',headers:{'content-type':'application/json','x-futurestaff-erp':'1'},body:JSON.stringify({action,sessionId,...body}),cache:'no-store'});const result=await response.json()
 if(!response.ok){const messages:Record<string,string>={ERP_PERMISSION_DENIED:'当前岗位没有此操作权限。',ERP_AUTH_REQUIRED:'请重新登录。',ERP_RECORD_UNAVAILABLE:'记录不存在或不可访问。',ERP_VIEW_EXPIRED:'权限或数据已变化，请重新查询。',ERP_STATE_CHANGED:'业务记录已变化，请重新生成预览。',ERP_READBACK_PENDING:'业务已经保存，结果暂未读回。再次点击只会读取结果，不会重复写入。'};throw Error(result.message??messages[result.error]??'操作未完成，请查询业务结果后重试。')}
 return result
}
function rows(value:unknown):Row[]{if(Array.isArray(value))return value as Row[];if(value&&typeof value==='object'){const r=value as Row;for(const key of ['items','data','rows'])if(Array.isArray(r[key]))return r[key] as Row[]}return []}
function text(key:string,value:unknown){if(value==null)return ['cost_price','unit_price','stock_qty','total_amount','profit'].includes(key)?'无权限':'—';return values[String(value)]??String(value)}
function Table({data,detail}:{data:unknown;detail?:(id:string)=>void}){
 const items=rows(data),columns=Object.keys(labels).filter(key=>items.some(r=>key in r)).slice(0,9)
 return <InteractionTable rows={items} columns={columns.map(key=>({key,label:labels[key]!,format:(value:unknown)=>text(key,value)}))} {...(detail?{onDetail:detail}:{})}/>
}
function Details({data}:{data:unknown}){const row=(data??{}) as Row;return <><dl>{Object.entries(row).filter(([k,v])=>labels[k]&&(v===null||typeof v!=='object')).map(([k,v])=><div key={k}><dt>{labels[k]}</dt><dd>{text(k,v)}</dd></div>)}</dl>{Array.isArray(row.items)&&<Table data={row.items}/>}</>}
export function previewDetails(data:Row):Row{
 const body=data.body as Row,refs=rows(data.references)
 return {...body,...(Array.isArray(body.items)?{items:body.items.map(item=>{const row=item as Row;return {...row,...(row.product_id?{product_name:refs.find(v=>v.id===row.product_id)?.name}:{}),...(row.material_id?{material_name:refs.find(v=>v.id===row.material_id)?.name}:{})}})}:{})}
}
export function applyErpClient(ctx:Context){
 const closeWindow=()=>update();let selected:View|undefined;const listeners=new Set<()=>void>();const update=(v?:View)=>{selected=v;listeners.forEach(fn=>fn())}
 function Window(){const [editable,setEditable]=useState<{previewId:string;form:View}>();const [view,setView]=useState(selected),[busy,setBusy]=useState(false),[error,setError]=useState('');useEffect(()=>{const fn=()=>{setView(selected);setError('')};listeners.add(fn);return()=>{listeners.delete(fn)}},[]);if(!view)return null
  async function act(action:string,body:Row){setBusy(true);setError('');try{update(await api(action,view!.sessionId,body))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  const data=view.data as Row
  return <InteractionWindow title={view.title} onClose={closeWindow} busy={busy} className="fs-erp-window">{view.kind==='form'?<ErpOrderForm key={view.viewId} data={view.data as Row} resource={view.resource} onBusyChange={setBusy} onPreview={async input=>{const next=await api('prepare',view.sessionId,{input});setEditable({previewId:next.viewId,form:{...view,data:{...(view.data as Row),draft:input.body}}});update(next)}}/>:view.kind==='preview'?<><h3>{operations[String(data.operation)]??'业务操作'}</h3><p>尚未执行，请核对内容后确认。</p>{editable?.previewId===view.viewId&&<button disabled={busy} onClick={()=>update(editable.form)}>返回修改</button>}<ul>{rows(data.references).map((r,i)=><li key={i}>{String(r.name)}</li>)}</ul><Details data={previewDetails(data)}/><button disabled={busy} onClick={()=>act('confirm',{viewId:view.viewId})}>{busy?'正在执行，请勿重复操作…':'确认执行'}</button></>:view.kind==='entity'?<Details data={view.data}/>:<Table data={view.data} {...(!view.resource.includes('/')&&view.resource!=='stock'?{detail:(id:string)=>{void act('query',{input:{resource:view.resource,id}})}}:{})}/>} {view.conversationUpdated===true&&<p role="status">已保存，结果已返回原 Agent 会话。</p>}{view.conversationUpdated===false&&<p role="status">业务已保存，原会话暂时不可用。<button disabled={busy} onClick={()=>act('confirm',{viewId:view.confirmationViewId})}>重试返回结果</button></p>}{error&&<p role="alert">{error}</p>}</InteractionWindow>
 }
 function LiveBridge(){
  useEffect(()=>{
   let owner='',controller:AbortController|undefined
   const start=()=>{
    const snapshot=ctx.platformClientSession.getSnapshot(),next=['ready','no_apps'].includes(snapshot.phase)?`${snapshot.activeTenantId}:${snapshot.user?.userId}`:''
    if(next===owner)return;owner=next;controller?.abort();update();if(!next)return
    const current=new AbortController();controller=current
    const run=async()=>{while(!current.signal.aborted){try{
     const response=await fetch('/_futurestaff/erp/events',{headers:{'x-futurestaff-erp':'1'},cache:'no-store',signal:current.signal})
     if(!response.ok||!response.body)throw Error('ERP_EVENTS_UNAVAILABLE')
     const reader=response.body.getReader(),decoder=new TextDecoder();let buffer=''
     while(!current.signal.aborted){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});if(buffer.length>20000)throw Error('ERP_EVENT_LIMIT');let end
      while((end=buffer.indexOf('\n\n'))>=0){const message=buffer.slice(0,end);buffer=buffer.slice(end+2);if(!message.startsWith('data: '))continue
       const meta=JSON.parse(message.slice(6)) as Meta
       if(meta.kind!=='futurestaff.erp')continue
       void api('view',meta.sessionId,{viewId:meta.viewId}).then(value=>{if(!current.signal.aborted&&(!selected||!['form','preview'].includes(selected.kind)))update(value)}).catch(()=>{})
      }
     }
    }catch{/* Identity and business error messages remain on the initiating action. */}
    if(!current.signal.aborted)await new Promise<void>(resolve=>{const timer=setTimeout(finish,1500);function finish(){clearTimeout(timer);current.signal.removeEventListener('abort',finish);resolve()};current.signal.addEventListener('abort',finish,{once:true})})
   }}
    void run()
   }
   start();const unsubscribe=ctx.platformClientSession.subscribe(start);return()=>{unsubscribe();controller?.abort()}
  },[])
  return null
 }
 function Card({meta}:{meta:Meta}){const [view,setView]=useState<View>(),[error,setError]=useState('');useEffect(()=>{let active=true;api('view',meta.sessionId,{viewId:meta.viewId}).then(v=>{if(active)setView(v)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[meta.viewId]);return <section className="fs-erp-card"><header><strong>{meta.title}</strong><span>ERP</span></header>{error?<p role="status">{error}</p>:!view?<p>正在验证权限并读取数据…</p>:<>{view.kind==='table'&&<Table data={view.data}/>}<p>{view.kind==='preview'?'等待核对与确认，尚未执行。':view.kind==='form'?'通过业务窗口选择对象、填写订单。':'已读取当前授权范围的数据。'}</p><button onClick={async()=>{try{update(await api('view',meta.sessionId,{viewId:meta.viewId}))}catch(e){setError((e as Error).message)}}}>{view.kind==='preview'?'核对并确认':view.kind==='form'?'打开开单窗口':'打开业务窗口'}</button></>}</section>}
 for(const name of ['call_erp_api','erp_query','erp_order_form','erp_prepare_action'])ctx.slots.inject('tool.call.toolview',()=>ctx.slots.register({name:'tool.call.toolview',key:name},(props:ToolCallViewProps)=>{
  const root=props.block
  if(!('kind' in root)||root.kind!=='tool-result')return <p>正在读取 ERP 业务数据…</p>
  if(root.isError)return <p role="alert">操作未完成，请检查权限与业务状态。</p>
  let meta=root.meta as Meta|undefined
  if(meta?.kind!=='futurestaff.erp')for(const block of root.content){if(block.type!=='text')continue;try{const value=JSON.parse(block.text) as Meta;if(value.kind==='futurestaff.erp'){meta=value;break}}catch{}}
  return meta?.kind==='futurestaff.erp'?<Card meta={meta}/>:<p>业务结果已返回，请查看对话中的说明。</p>
 }))
 ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'futurestaff-erp-window',order:20},Window))
 ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'futurestaff-erp-view-events',order:19},LiveBridge))
 if(typeof document==='undefined')return
 const style=document.createElement('style');style.textContent=interactionCss+erpOrderFormCss+`.fs-erp-card,.fs-erp-window{color:var(--text-primary);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:12px;padding:18px}.fs-erp-card{margin:12px 0;max-width:100%}.fs-erp-card header,.fs-erp-window header{display:flex;justify-content:space-between;align-items:center;gap:16px}.fs-erp-card button,.fs-erp-window button{padding:8px 12px;border:1px solid var(--border-default);border-radius:7px;background:var(--bg-tertiary);color:var(--text-primary);cursor:pointer}.fs-erp-window button:disabled{opacity:.5;cursor:default}.fs-erp-card p,.fs-erp-window p,.fs-erp-window dt{color:var(--text-secondary)}.fs-erp-backdrop{position:fixed;inset:0;z-index:90;display:flex;justify-content:flex-end;background:color-mix(in srgb,var(--bg-primary) 65%,transparent)}.fs-erp-window{width:min(850px,100vw);height:100%;overflow:auto;border-radius:12px 0 0 12px}.fs-erp-scroll{overflow:auto}.fs-erp-scroll table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:13px}.fs-erp-scroll td,.fs-erp-scroll th{padding:10px;border-bottom:1px solid var(--border-default);text-align:left}.fs-erp-scroll th{background:var(--bg-tertiary)}.fs-erp-form{display:grid;gap:16px}.fs-erp-form label{display:grid;gap:6px}.fs-erp-form input,.fs-erp-form select,.fs-erp-form textarea{width:100%;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-default);padding:9px;border-radius:7px}.fs-erp-line{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;align-items:end}.fs-erp-window dl{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fs-erp-window dd{margin:4px 0;overflow-wrap:anywhere}.fs-erp-window [role=alert]{color:var(--error)}.fs-erp-window :focus-visible{outline:2px solid var(--accent-primary);outline-offset:2px}@media(max-width:650px){.fs-erp-line{grid-template-columns:1fr 1fr}.fs-erp-window dl{grid-template-columns:1fr}}`;document.head.append(style);ctx.effect(()=>()=>{style.remove();update();listeners.clear()},'ERP interaction lifecycle')
}
