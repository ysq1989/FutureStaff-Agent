/** Presentation facts resolved from SHOP, never accepted from model arguments. */
export interface ShopProductCandidate {
 id:number; name:string; image?:string|undefined; price:string|null; stock:number|null
 onSale:boolean|null; reason:string
}
export interface ShopRecommendationData {
 kind:'shop.products.recommendations'; source:'shop'; readOnly:true; selectionOnly:true
 products:ShopProductCandidate[]; selectedProductId?:number
}
export function shopProductImage(value:unknown,origin?:string):string|undefined{
 if(typeof value!=='string'||!value.trim()||value.length>4096)return
 try{
  const url=new URL(value,origin),host=url.hostname.toLowerCase()
  if(url.protocol!=='https:'||url.username||url.password||!host.includes('.')||host.endsWith('.localhost')||host.endsWith('.local')||host.includes(':'))return
  if(/^\d+\.\d+\.\d+\.\d+$/.test(host)){
   const [a=0,b=0]=host.split('.').map(Number)
   if(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127)return
  }
  return url.href
 }catch{return}
}
export function shopProductCandidate(row:Record<string,unknown>,reason:string,origin:string):ShopProductCandidate{
 const price=typeof row.price==='number'?String(row.price):row.price
 return {id:Number(row.id),name:typeof row.store_name==='string'?row.store_name.slice(0,300):`商品 ${row.id}`,
  image:shopProductImage(row.image,origin),price:typeof price==='string'&&/^\d{1,12}(?:\.\d{1,4})?$/.test(price)?price:null,
  stock:row.stock!==null&&row.stock!==''&&Number.isSafeInteger(Number(row.stock))&&Number(row.stock)>=0?Number(row.stock):null,
  onSale:[0,1,'0','1'].includes(row.is_show as number|string)?Number(row.is_show)===1:null,reason}
}
