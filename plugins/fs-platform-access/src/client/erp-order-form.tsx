import {useState} from 'react'
type Row=Record<string,unknown>
type Line={id:string;quantity:string;price:string}
const list=(value:unknown):Row[]=>Array.isArray(value)?value as Row[]:value&&typeof value==='object'&&Array.isArray((value as Row).items)?(value as Row).items as Row[]:[]
const numberText=(value:unknown)=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?String(value):''
export function ErpOrderForm({data,resource,onPreview,onBusyChange}:{data:Row;resource:string;onPreview(input:Row):Promise<void>;onBusyChange(value:boolean):void}){
 const sales=resource==='sales-orders',partnerKey=sales?'customer_id':'supplier_id',itemKey=sales?'product_id':'material_id'
 const partners=list(data.partners).filter(row=>!['inactive','disabled','停用'].includes(String(row.status)))
 const products=list(data.items).filter(row=>!['inactive','disabled','停用'].includes(String(row.status)))
 const draft=(data.draft??{}) as Row
 const price=(id:string)=>numberText(products.find(row=>row.id===id)?.[sales?'unit_price':'cost_price'])
 const [partner,setPartner]=useState(String(draft[partnerKey]??''))
 const [date,setDate]=useState(String(draft.order_date??new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date())))
 const [notes,setNotes]=useState(String(draft.notes??''))
 const [lines,setLines]=useState<Line[]>(()=>Array.isArray(draft.items)?(draft.items as Row[]).map(row=>({id:String(row[itemKey]??''),quantity:numberText(row.quantity),price:row.unit_price===undefined?price(String(row[itemKey]??'')):numberText(row.unit_price)})):[{id:'',quantity:'1',price:''}])
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[submitted,setSubmitted]=useState(false)
 const issues:string[]=[]
 if(!partners.some(row=>row.id===partner))issues.push(`请选择${sales?'客户':'供应商'}。`)
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))issues.push('请选择订单日期。')
 lines.forEach((line,index)=>{if(!products.some(row=>row.id===line.id))issues.push(`第 ${index+1} 项：请选择${sales?'产品':'物料'}。`);if(!line.quantity||!Number.isFinite(Number(line.quantity))||Number(line.quantity)<=0)issues.push(`第 ${index+1} 项：数量必须大于 0。`);if(!line.price||!Number.isFinite(Number(line.price))||Number(line.price)<0)issues.push(`第 ${index+1} 项：请填写单价（可填写 0）。`)})
 const update=(index:number,patch:Partial<Line>)=>{setError('');setLines(value=>value.map((line,i)=>i===index?{...line,...patch}:line))}
 async function preview(event:React.FormEvent){event.preventDefault();setSubmitted(true);setError('');if(busy||issues.length)return;setBusy(true);onBusyChange(true)
  try{await onPreview({operation:(sales?'sales':'purchase')+'.create',body:{[partnerKey]:partner,order_date:date,notes,items:lines.map(line=>({[itemKey]:line.id,quantity:Number(line.quantity),unit_price:Number(line.price)}))}})}catch(reason){setError((reason as Error).message)}finally{setBusy(false);onBusyChange(false)}
 }
 return <form className="fs-erp-form" onSubmit={preview} noValidate>
  <p className="fs-erp-steps">1 填写草稿 → 2 核对预览 → 3 确认保存</p>
  <p>{Object.keys(draft).length?'已知信息已带入，请补全缺项并核对。':'填写客户或供应商及订单明细。'}预览不会保存订单。</p>
  <fieldset disabled={busy}>
   <label>{sales?'客户':'供应商'}<select value={partner} aria-invalid={submitted&&!partner} onChange={event=>{setPartner(event.target.value);setError('')}}><option value="">请选择{sales?'客户':'供应商'}</option>{partners.map(row=><option key={String(row.id)} value={String(row.id)}>{String(row.name)}{row.code?` · ${row.code}`:''}</option>)}</select></label>
   <label>订单日期<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
   {lines.map((line,index)=>{const product=products.find(row=>row.id===line.id),shortage=sales&&product?.stock_qty!=null&&Number(line.quantity)>Number(product.stock_qty)
    return <section className="fs-erp-line-item" key={index} aria-label={`订单明细 ${index+1}`}><div className="fs-erp-line">
     <label>{sales?'产品':'物料'}<select value={line.id} onChange={event=>update(index,{id:event.target.value,price:price(event.target.value)})}><option value="">请选择{sales?'产品':'物料'}</option>{products.map(row=><option key={String(row.id)} value={String(row.id)}>{String(row.name)}{row.sku||row.code?` · ${row.sku??row.code}`:''}</option>)}</select></label>
     <label>数量{product?.unit?`（${product.unit}）`:''}<input type="number" step="any" min="0" value={line.quantity} aria-invalid={submitted&&(!line.quantity||Number(line.quantity)<=0)} onChange={event=>update(index,{quantity:event.target.value})}/></label>
     <label>单价<input type="number" step="0.01" min="0" placeholder="请补充单价" value={line.price} aria-invalid={submitted&&!line.price} onChange={event=>update(index,{price:event.target.value})}/></label>
     <button type="button" aria-label={`移除第 ${index+1} 项`} disabled={lines.length===1} onClick={()=>setLines(value=>value.filter((_,i)=>i!==index))}>移除</button>
    </div><div className="fs-erp-line-context"><span>小计：{line.quantity&&line.price?((Number(line.quantity)||0)*(Number(line.price)||0)).toFixed(2):'待补全'}</span>{product&&<span>库存：{product.stock_qty==null?'未提供':String(product.stock_qty)} {String(product.unit??'')}</span>}</div>
    {shortage&&<p className="fs-erp-warning">数量超过当前库存，确认订单时由 ERP 按库存规则校验。</p>}{line.id&&line.price==='0'&&<p className="fs-erp-warning">当前单价为 0，请核实是否为零价订单。</p>}
   </section>})}
   <button type="button" disabled={lines.length>=50} onClick={()=>setLines(value=>[...value,{id:'',quantity:'1',price:''}])}>添加明细</button>
   <label>备注<textarea value={notes} onChange={event=>setNotes(event.target.value)} maxLength={2000} placeholder="选填"/></label>
  </fieldset>
  <div className="fs-erp-form-total"><strong>预计金额：{issues.length?'待补全':lines.reduce((sum,line)=>sum+Number(line.quantity)*Number(line.price),0).toFixed(2)}</strong><small>最终金额以 ERP 保存结果为准。</small></div>
  {submitted&&issues.length>0&&<ul role="alert">{issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}{error&&<p role="alert">{error}</p>}
  <button type="submit" disabled={busy}>{busy?'正在核对…':'预览订单'}</button>
 </form>
}
export const erpOrderFormCss=`.fs-erp-form fieldset{display:grid;gap:16px;border:0;margin:0;padding:0;min-width:0}.fs-erp-form input,.fs-erp-form select,.fs-erp-form textarea{box-sizing:border-box;min-width:0}.fs-erp-line-item{min-width:0;padding:12px;border:1px solid var(--border-default);border-radius:8px}.fs-erp-line>label{min-width:0}.fs-erp-line-context{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:12px;margin-top:8px;color:var(--text-secondary)}.fs-erp-form .fs-erp-warning{font-size:12px;color:var(--warning)}.fs-erp-form-total{display:grid;gap:6px;padding-top:12px;border-top:1px solid var(--border-default)}.fs-erp-form-total small{color:var(--text-secondary)}.fs-erp-form .fs-erp-steps{font-size:12px;color:var(--accent-primary)}.fs-erp-form [aria-invalid=true]{border-color:var(--error)}.fs-erp-form button[type=submit]{background:var(--accent-primary);color:var(--fs-on-accent)}.fs-erp-form p{margin:0}`
