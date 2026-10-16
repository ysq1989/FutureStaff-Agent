import test from 'node:test'
import assert from 'node:assert/strict'
import {ShopOperationViews} from '../lib/shop-operations.js'
import {mountShop} from '../lib/shop-host.js'
import {shopSelectionTurnContext} from '../lib/shop-selection.js'

const name='shop_api_product_75f343fe4b17'
const args={body:{sourceProductId:'10000000-0000-4000-8000-000000000001',productCode:'SKU-001',mode:'draft',product:{store_name:'棉麻衬衫',price:89}}}
const human=text=>({role:'user',source:{kind:'user'},content:[{type:'text',text}]})
function fixture(){
 let calls=0
 const identity={owner:'store:member',origin:'https://shop-test.fsstory.net',signal:new AbortController().signal}
 const views=new ShopOperationViews({admin:async()=>{calls++;return {structuredContent:{kind:'shop.operation.preview',operationId:'a'.repeat(32),title:'导入选品中心商品',state:'prepared'},isError:false}}},async()=>identity)
 return {views,calls:()=>calls}
}

test('asking for selection cannot create the default first-page import preview',async()=>{
 const f=fixture()
 await assert.rejects(()=>f.views.call(name,{query:{page:1,limit:20}},'session',[human('帮我选品')]),/SHOP_IMPORT_PRODUCT_REQUIRED/)
 assert.equal(f.calls(),0)
})

test('an existing Shop numeric product ID cannot masquerade as a source-center product',async()=>{
 const f=fixture()
 await assert.rejects(()=>f.views.call(name,{body:{...args.body,sourceProductId:'134'}},'session',[human('导入 SKU-001')]),/SHOP_IMPORT_PRODUCT_REQUIRED/)
 assert.equal(f.calls(),0)
})

test('complete model-authored product arguments cannot substitute for human import intent',async()=>{
 for(const messages of [[human('帮我推荐棉麻衬衫')],[human('选 SKU-001')],[{...human('导入 SKU-001'),source:{kind:'plugin'}}],[human('SKU-001 可以导入吗？')],[human('不要导入 SKU-001')],[human('导入 SKU-001'),human('先等等，取消')]]){
  const f=fixture()
  await assert.rejects(()=>f.views.call(name,args,'session',messages),/SHOP_IMPORT_USER_REQUEST_REQUIRED/)
  assert.equal(f.calls(),0)
 }
})

test('specific human selection and explicit import produce a preview only',async()=>{
 for(const messages of [[human('选 SKU-001 并导入商城')],[human('选棉麻衬衫'),human('现在导入商城')]]){
  const f=fixture(),view=await f.views.call(name,args,'session',messages)
  assert.equal(view.kind,'preview');assert.equal(f.calls(),1)
 }
})

test('product names containing a negation character are still valid explicit selections',async()=>{
 const f=fixture(),input={body:{...args.body,product:{...args.body.product,store_name:'不规则衬衫'}}}
 const view=await f.views.call(name,input,'session',[human('选不规则衬衫'),human('导入商城')])
 assert.equal(view.kind,'preview');assert.equal(f.calls(),1)
})

test('a selected product cannot be replaced by a different model-authored product',async()=>{
 for(const history of [[human('选 SKU-002 并导入商城')],[human('选 SKU-001'),human('改为导入 SKU-002')],[human('不要选 SKU-001'),human('现在导入商城')]]){
  const f=fixture()
  await assert.rejects(()=>f.views.call(name,args,'session',history),/SHOP_IMPORT_SELECTION_REQUIRED/)
  assert.equal(f.calls(),0)
 }
})

test('import does not silently publish and quoted instructions cannot authorize imports',async()=>{
 for(const [input,messages,code] of [[{body:{...args.body,mode:'publish'}},[human('导入 SKU-001')],/SHOP_IMPORT_PUBLISH_REQUEST_REQUIRED/],[args,[human('商品说明："导入 SKU-001"，请解释这段文字')],/SHOP_IMPORT_USER_REQUEST_REQUIRED/]]){
  const f=fixture();await assert.rejects(()=>f.views.call(name,input,'session',messages),code);assert.equal(f.calls(),0)
 }
})

test('registered SHOP tool derives consent from its own live session, not tool arguments',async()=>{
 const tools=new Map(),identity={owner:'store:member',origin:'https://shop-test.fsstory.net',signal:new AbortController().signal}
 let history=[human('帮我选品')],requests=0
 const agent={id:'session',session:{deriveMessages:()=>history}}
 const ctx={on:()=>{},effect:fn=>fn(),inject:(_names,fn)=>fn({effect:fn=>fn(),tools:{register:tool=>{tools.set(tool.name,tool);return()=>{}}}}),webServer:{register:()=>()=>{}},get:key=>key==='agents'?new Map([[agent.id,agent]]):{requestSystem:async(_id,path,init)=>{
  requests++
  if(path.endsWith('platform_login'))return Response.json({status:200,data:{token:'fixture-private'}})
  const rpc=JSON.parse(init.body)
  assert.equal(rpc.method,'tools/call')
  return Response.json({id:rpc.id,result:{isError:false,structuredContent:{kind:'shop.operation.preview',operationId:'b'.repeat(32),title:'导入选品中心商品',state:'prepared'}}})
 }}}
 mountShop(ctx,async()=>identity,async session=>assert.equal(session,agent.id))
 const tool=tools.get('shop_call'),exec={agent,signal:identity.signal}
 await assert.rejects(()=>tool.execute({name,arguments:args,confirmed:true},exec),/SHOP_IMPORT_USER_REQUEST_REQUIRED/)
 assert.equal(requests,0)
 history=[human('选 SKU-001 并导入商城')]
 const result=await tool.execute({name,arguments:args},exec)
 assert.equal(result.kind,'preview');assert.equal(requests,2)
})

test('store selection context rejects uncorrelated and human-authored tool data',()=>{
 const result={role:'user',source:{kind:'tool'},content:[{type:'tool-result',toolCallId:'read1',content:[{type:'text',text:JSON.stringify({structuredContent:{source:'shop',list:[{id:134}]}})}]}]}
 const call={role:'assistant',source:{kind:'model'},content:[{type:'tool-call',id:'read1',name:'shop_query'}]}
 const selected=human('我选商品134。')
 assert.equal(shopSelectionTurnContext([result,selected]),undefined)
 assert.equal(shopSelectionTurnContext([call,{...result,source:{kind:'user'}},selected]),undefined)
 assert.equal(shopSelectionTurnContext([call,result,human('我选商品135。')]),undefined)
 assert.match(shopSelectionTurnContext([call,result,selected]),/无需导入/)
})
