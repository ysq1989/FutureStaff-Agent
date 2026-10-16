/** Optional, untrusted form suggestions; never an instruction to save an order. */
export type ErpOrderDraft={customer_id?:string;supplier_id?:string;order_date?:string;notes?:string;items?:Array<{product_id?:string;material_id?:string;quantity?:number;unit_price?:number}>}
export function normalizeOrderDraft(kind:'sales'|'purchase',input:unknown):ErpOrderDraft{
 if(input===undefined)return {}
 const fail=()=>{throw Error('ERP_INPUT_INVALID')}
 const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:fail()
 const allowed=(value:Record<string,unknown>,names:string[])=>{if(Object.keys(value).some(key=>!names.includes(key)))fail()}
 const id=(value:unknown)=>{if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))fail()}
 const draft=object(input),partner=kind==='sales'?'customer_id':'supplier_id',itemId=kind==='sales'?'product_id':'material_id'
 allowed(draft,[partner,'order_date','notes','items'])
 if(draft[partner]!==undefined)id(draft[partner])
 if(draft.order_date!==undefined){const date=draft.order_date;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)fail()}
 if(draft.notes!==undefined&&(typeof draft.notes!=='string'||draft.notes.length>2000))fail()
 if(draft.items!==undefined){
  if(!Array.isArray(draft.items)||draft.items.length<1||draft.items.length>50)fail()
  for(const value of draft.items as unknown[]){const row=object(value);allowed(row,[itemId,'quantity','unit_price']);if(row[itemId]!==undefined)id(row[itemId])
   if(row.quantity!==undefined&&(typeof row.quantity!=='number'||!Number.isFinite(row.quantity)||row.quantity<=0))fail()
   if(row.unit_price!==undefined&&(typeof row.unit_price!=='number'||!Number.isFinite(row.unit_price)||row.unit_price<0))fail()
  }
 }
 return JSON.parse(JSON.stringify(draft)) as ErpOrderDraft
}
