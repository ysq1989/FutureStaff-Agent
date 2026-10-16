import type {ConversationNodeDefinition} from '@deepseek-ai/dsh-client-ui-conversation/client'
export interface ShopRecommendationMeta {kind:'futurestaff.shop';viewId:string;sessionId:string;title:string}
export interface ShopGalleryItem {seq:number;meta:ShopRecommendationMeta}
interface State {turn:number;calls:Set<string>;items:ShopGalleryItem[]}
declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
 interface ConversationTurnDataMap {'futurestaff-shop-recommendations':{items:ShopGalleryItem[]}}
}
/** Recommendations remain visible after the normal tool group collapses. */
export const shopRecommendationDefinition:ConversationNodeDefinition={
 kind:'futurestaff-shop-recommendations',
 match:event=>['turn/start','tool/call','tool/result'].includes(event.type)?{id:String((event.data as {turn:number}).turn),role:event.type==='turn/start'?'start':'update'}:null,
 start:(_context,match)=>({turn:(match.event.data as {turn:number}).turn,calls:new Set(),items:[]}),
 update:(context,match)=>{
  const state=context.state as State
  if(match.event.type==='tool/call'){
   if(match.event.data.name!=='shop_recommend_products')return state
   return {...state,calls:new Set([...state.calls,String(match.event.data.callId)])}
  }
  if(match.event.type!=='tool/result')return state
  const message=match.event.data.message,block=message.content[0],callId=String((message.source as {callId?:string}).callId)
  if(!state.calls.has(callId)||block?.type!=='tool-result'||block.isError)return state
  for(const item of block.content){
   if(item.type!=='text')continue
   try{
    const value=JSON.parse(item.text)
    if(value.module!=='shop'||value.kind!=='recommendations'||value.data?.kind!=='shop.products.recommendations'||typeof value.viewId!=='string'||typeof value.sessionId!=='string')continue
    const meta:ShopRecommendationMeta={kind:'futurestaff.shop',viewId:value.viewId,sessionId:value.sessionId,title:'为你推荐的商品'}
    return {...state,items:[...state.items,{seq:match.event.seq,meta}]}
   }catch{}
  }
  return state
 },
 buildLocationData:(context,scope,previous)=>{
  const state=context.state as State|undefined
  if(scope!=='turn'||!state)return null
  if(previous?.kind==='turn'&&previous.key==='futurestaff-shop-recommendations'&&previous.value.items===state.items)return previous
  return {kind:'turn',turn:state.turn,key:'futurestaff-shop-recommendations',value:{items:state.items}}
 }
}
export function latestShopRecommendation(items:readonly ShopGalleryItem[],seq:number):ShopRecommendationMeta|null{
 return items.filter(item=>item.seq<=seq).at(-1)?.meta??null
}
