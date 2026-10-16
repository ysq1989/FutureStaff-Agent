import test from 'node:test'
import assert from 'node:assert/strict'
import {ShopOperationViews} from '../lib/shop-operations.js'
import {shopProductImage} from '../lib/shop-products.js'
import {mountShop} from '../lib/shop-host.js'
import {shopSelectionTurnContext} from '../lib/shop-selection.js'
import {Readable} from 'node:stream'
import {shopRecommendationDefinition,latestShopRecommendation} from '../lib/client/shop-recommendation-gallery.js'

function fixture(){
 let owner='shop:user',allowed=true,rows=[{id:134,store_name:'真实商品',image:'https://cdn.example.com/product.jpg',price:'828.00',stock:1,is_show:1},{id:131,store_name:'另一商品',image:'',price:900,stock:0,is_show:0}]
 const calls=[],signal=new AbortController().signal
 const views=new ShopOperationViews({admin:async(name,args)=>{calls.push({name,args});if(!allowed)throw Error('DSH_FORBIDDEN');return {structuredContent:{source:'shop',list:rows,total:rows.length}}}},async()=>({owner,origin:'https://shop.example.com',signal}),async id=>{if(id!=='session')throw Error('SHOP_SESSION_DENIED')})
 return {views,calls,revoke:()=>{allowed=false},owner:value=>{owner=value},rows:value=>{rows=value}}
}
test('recommendations resolve real facts and images by scoped read IDs; selection is never a write',async()=>{
 const f=fixture(),read=await f.views.call('shop_products_list',{page:1,limit:20},'session')
 const view=await f.views.recommend(read.viewId,[{productId:134,reason:'符合已确认的价格范围'}],'session')
 assert.equal(view.kind,'recommendations');assert.equal(view.data.products[0].image,'https://cdn.example.com/product.jpg')
 assert.equal(view.data.products[0].price,'828.00');assert.equal(view.data.products[0].reason,'符合已确认的价格范围')
 const chosen=await f.views.select(view.viewId,134,'session')
 assert.equal(chosen.data.selectedProductId,134);assert.equal(chosen.data.selectionOnly,true)
 const again=await f.views.select(view.viewId,134,'session');assert.equal(again.selectionEventId,chosen.selectionEventId)
 await assert.rejects(()=>f.views.confirm(view.viewId,'session'),/SHOP_CONFIRMATION_REQUIRED/)
 assert.ok(f.calls.every(call=>call.name==='shop_products_list'))
})
test('recommendations reject invented IDs, duplicates, unbounded lists and foreign scope',async()=>{
 const f=fixture(),read=await f.views.call('shop_products_list',{},'session')
 for(const items of [[{productId:999,reason:'假商品'}],[{productId:134,reason:'a'},{productId:134,reason:'b'}],[],Array.from({length:7},(_,i)=>({productId:i+1,reason:'x'})),[{productId:134,reason:''}]])
  await assert.rejects(()=>f.views.recommend(read.viewId,items,'session'),/SHOP_RECOMMENDATION_/)
 await assert.rejects(()=>f.views.recommend(read.viewId,[{productId:134,reason:'a'}],'foreign'),/SHOP_SESSION_DENIED/)
 f.owner('other:user');await assert.rejects(()=>f.views.recommend(read.viewId,[{productId:134,reason:'a'}],'session'),/SHOP_VIEW_EXPIRED/)
})
test('view and selection recheck permissions and membership; stale product is not selectable',async()=>{
 const f=fixture(),read=await f.views.call('shop_products_list',{},'session'),view=await f.views.recommend(read.viewId,[{productId:134,reason:'a'}],'session')
 await assert.rejects(()=>f.views.select(view.viewId,131,'session'),/SHOP_RECOMMENDATION_PRODUCT_REQUIRED/)
 f.rows([]);await assert.rejects(()=>f.views.select(view.viewId,134,'session'),/SHOP_RECOMMENDATION_STALE/)
 f.revoke();await assert.rejects(()=>f.views.view(view.viewId,'session'),/DSH_FORBIDDEN/)
})
test('product pictures accept public HTTPS, resolve Shop paths and reject unsafe or local URLs',()=>{
 assert.equal(shopProductImage('/uploads/product.jpg','https://shop.example.com'),'https://shop.example.com/uploads/product.jpg')
 for(const value of ['javascript:alert(1)','data:image/svg+xml,test','file:///secret','http://cdn.example.com/a.jpg','https://user:secret@cdn.example.com/a.jpg','https://127.0.0.1/a','https://10.1.1.1/a','https://169.254.169.254/a','https://[::1]/a','https://printer.local/a'])assert.equal(shopProductImage(value),undefined)
})
test('registered recommendation selection returns to its original Agent once, without granting import',async()=>{
 const tools=new Map(),followups=[],methods=[],identity={owner:'shop:member',origin:'https://shop.example.com',signal:new AbortController().signal}
 let handler
 const agent={id:'session',session:{deriveMessages:()=>[]},followup:value=>followups.push(value)}
 const ctx={on:()=>{},effect:fn=>fn(),inject:(_names,fn)=>fn({effect:fn=>fn(),tools:{register:tool=>{tools.set(tool.name,tool);return()=>{}}}}),webServer:{register:route=>{handler=route.handler;return()=>{}}},get:key=>key==='agents'?new Map([[agent.id,agent]]):{requestSystem:async(_id,path,init)=>{
  if(path.endsWith('platform_login'))return Response.json({status:200,data:{token:'fixture-private'}})
  const rpc=JSON.parse(init.body);methods.push(rpc.params.name)
  return Response.json({id:rpc.id,result:{structuredContent:{source:'shop',list:[{id:134,store_name:'真实商品',price:'828',stock:1,image:'https://cdn.example.com/product.jpg'}],total:1}}})
 }}}
 mountShop(ctx,async()=>identity,async session=>assert.equal(session,agent.id))
 const exec={agent,signal:identity.signal},read=await tools.get('shop_query').execute({name:'shop_products_list',arguments:{}},exec)
 const view=await tools.get('shop_recommend_products').execute({viewId:read.viewId,items:[{productId:134,reason:'符合需求'}]},exec)
 const request=async body=>{let output,status;const req=Readable.from([JSON.stringify(body)]);req.method='POST';req.socket={remoteAddress:'127.0.0.1'};req.headers={'x-futurestaff-shop':'1',host:'127.0.0.1'};const res={set statusCode(value){status=value},setHeader:()=>{},end:text=>{output=JSON.parse(text)}};await handler(req,res);return {status,output}}
 const input={action:'select',sessionId:agent.id,viewId:view.viewId,productId:134}
 const [one,two]=await Promise.all([request(input),request(input)])
 assert.equal(one.status,200);assert.equal(two.output.conversationUpdated,true);assert.equal(followups.length,1)
 assert.equal(followups[0].source.plugin,'futurestaff-shop-selection')
 assert.deepEqual(JSON.parse(followups[0].content[0].text),{kind:'shop.product.selection',source:'shop',productId:134})
 assert.match(followups[0].content[1].text,/本店已有商品，无需导入/)
 assert.ok(methods.every(name=>name==='shop_products_list'))
 assert.equal((await request({...input,productId:999})).status,400)
 const history=[{role:'assistant',content:[{type:'tool-call',id:'recommend',name:'shop_recommend_products'}]},
  {role:'user',source:{kind:'tool'},content:[{type:'tool-result',toolCallId:'recommend',content:[{type:'text',text:JSON.stringify(view)}]}]},followups[0]]
 assert.match(shopSelectionTurnContext(history),/无需导入/)
 assert.equal(shopSelectionTurnContext([...history,{role:'user',source:{kind:'user'},content:[{type:'text',text:'换个需求'}]}]),undefined)
 assert.equal(shopSelectionTurnContext([followups[0]]),undefined)
})
test('recommendation projection keeps the latest successful native cards visible without expanding tools',()=>{
 const definition=shopRecommendationDefinition
 let state=definition.start({}, {event:{type:'turn/start',data:{turn:1}}})
 state=definition.update({state},{event:{type:'tool/call',data:{callId:'r1',name:'shop_recommend_products'}}})
 const view={module:'shop',kind:'recommendations',sessionId:'session',viewId:'cards1',data:{kind:'shop.products.recommendations'}}
 const event={type:'tool/result',seq:4,data:{message:{source:{callId:'r1'},content:[{type:'tool-result',content:[{type:'text',text:JSON.stringify(view)}]}]}}}
 state=definition.update({state},{event});assert.equal(state.items.length,1)
 const built=definition.buildLocationData({state},'turn');assert.equal(built.key,'futurestaff-shop-recommendations')
 assert.equal(latestShopRecommendation(state.items,3),null)
 assert.equal(latestShopRecommendation(state.items,4).viewId,'cards1')
 const unrelated={...event,data:{message:{...event.data.message,source:{callId:'other'}}}}
 assert.equal(definition.update({state},{event:unrelated}),state)
 const failed={...event,data:{message:{...event.data.message,content:[{...event.data.message.content[0],isError:true}]}}}
 assert.equal(definition.update({state},{event:failed}),state)
 assert.equal(latestShopRecommendation([...state.items,{seq:5,meta:{...state.items[0].meta,viewId:'cards2'}}],5).viewId,'cards2')
})
