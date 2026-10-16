import test from 'node:test'
import assert from 'node:assert/strict'
import {ShopOperationViews} from '../lib/shop-operations.js'
import {ShopThemeService} from '../lib/shop.js'
const operationId='a'.repeat(32),name='shop_api_product_123456789012'
function fixture(){
 let identity={owner:'store:member',origin:'https://shop-test.fsstory.net',signal:new AbortController().signal},allowed=true,confirms=0
 const preview={kind:'shop.operation.preview',operationId,name,title:'新增商品',state:'prepared',arguments:{body:{store_name:'测试商品'}}}
 const result={...preview,kind:'shop.operation.result',state:'completed',data:{status:200,data:{id:123}}}
 const wrap=structuredContent=>({structuredContent,isError:false})
 const service={admin:async()=>wrap(preview),operation:async()=>{if(!allowed)throw Error('DSH_FORBIDDEN');return wrap(confirms?result:preview)},confirmOperation:async()=>{if(!allowed)throw Error('DSH_FORBIDDEN');confirms++;await Promise.resolve();return wrap(result)}}
 const views=new ShopOperationViews(service,async()=>identity,async session=>{if(session!=='shop-session')throw Error('SHOP_SESSION_DENIED')})
 return {views,setIdentity:value=>{identity=value},identity:()=>identity,revoke:()=>{allowed=false},confirms:()=>confirms}
}
test('Shop writes are staged; native confirmations are owner/session-bound and delivered once',async()=>{
 const f=fixture(),view=await f.views.call(name,{},'shop-session')
 assert.equal(view.kind,'preview');assert.equal(f.confirms(),0)
 await assert.rejects(()=>f.views.view(view.viewId,'erp-session'),/SHOP_SESSION_DENIED/)
 const [first,second]=await Promise.all([f.views.confirm(view.viewId,'shop-session'),f.views.confirm(view.viewId,'shop-session')])
 assert.equal(first.kind,'entity');assert.equal(first.viewId,second.viewId);assert.equal(f.confirms(),1)
 f.revoke();await assert.rejects(()=>f.views.confirm(view.viewId,'shop-session'),/DSH_FORBIDDEN/)
 assert.equal(f.confirms(),1)
})
test('foreign identity and aborted login cannot consume a pending Shop view',async()=>{
 const f=fixture(),view=await f.views.call(name,{},'shop-session'),original=f.identity()
 f.setIdentity({...original,owner:'other:member'});await assert.rejects(()=>f.views.confirm(view.viewId,'shop-session'),/SHOP_VIEW_EXPIRED/)
 f.setIdentity(original);const abort=new AbortController();f.setIdentity({...original,signal:abort.signal});abort.abort();await assert.rejects(()=>f.views.confirm(view.viewId,'shop-session'))
 assert.equal(f.confirms(),0)
})
test('catalog exposes account categories, and arbitrary RPC methods cannot be model operations',async()=>{
 const methods=[]
 const service=new ShopThemeService(async()=>({owner:'store:member',signal:new AbortController().signal}),async(path,init)=>{
  if(path.endsWith('platform_login'))return Response.json({status:200,data:{token:'private'}})
  const rpc=JSON.parse(init.body);methods.push(rpc.method)
  return Response.json({id:rpc.id,result:{tools:[{name},{name:'shop_products_list'}],categories:{product:2},total:2}})
 })
 assert.deepEqual((await service.catalog()).tools,[{name:'shop_products_list'}])
 assert.equal((await service.catalog({category:'product'})).tools.length,1)
 await assert.rejects(()=>service.admin('operations/confirm',{}),/SHOP_TOOL_DENIED/)
 await assert.rejects(()=>service.admin('erp_query',{}),/SHOP_TOOL_DENIED/)
 assert.deepEqual(methods,['tools/list','tools/list'])
 await service.admin('shop_orders_list',{page:1,limit:1})
 assert.equal(methods.at(-1),'tools/call')
 await assert.rejects(()=>service.admin('shop_theme_context',{}),/SHOP_THEME_TOOL_USE_SHOP_THEME_CALL/)
})

test('existing order read aliases render the actual result without creating a write preview',async()=>{
 const identity={owner:'store:member',origin:'https://shop-test.fsstory.net',signal:new AbortController().signal}
 const service={admin:async()=>({structuredContent:{items:[],total:0},isError:false}),confirmOperation:async()=>{throw Error('Must never confirm a read')}}
 const views=new ShopOperationViews(service,async()=>identity)
 const view=await views.call('shop_orders_list',{page:1,limit:1},'fixture')
 assert.equal(view.kind,'entity');assert.deepEqual(view.data.data,{items:[],total:0})
 await assert.rejects(()=>views.confirm(view.viewId,'fixture'),/SHOP_CONFIRMATION_REQUIRED/)
})

test('parameter errors explain schema fields without returning values or accepting strings',async()=>{
 const identity={owner:'store:member',origin:'https://shop-test.fsstory.net',signal:new AbortController().signal}
 const service={admin:async()=>({isError:true,structuredContent:{errorCode:'DSH_INVALID_ARGUMENTS',instruction:'按params/query/body分组',argumentHint:{fields:{body:['attrs','store_name']}}}})}
 const views=new ShopOperationViews(service,async()=>identity)
 await assert.rejects(()=>views.call(name,{},'fixture'),/DSH_INVALID_ARGUMENTS.*attrs/)
 await assert.rejects(()=>views.call(name,'{}','fixture'),/SHOP_ARGUMENTS_OBJECT_REQUIRED/)
})

test('read failures explain business prerequisites and never suggest confirming or polling a write',async()=>{
 const identity={owner:'store:member',origin:'https://shop-test.fsstory.net',signal:new AbortController().signal}
 for(const code of ['DSH_DEPENDENCY_NOT_CONFIGURED','DSH_TRACKING_NOT_AVAILABLE','DSH_READ_UNAVAILABLE','DSH_BUSINESS_LIMIT_REACHED','DSH_API_REJECTED']){
  const service={admin:async()=>({isError:true,structuredContent:{errorCode:code,readOnly:true,instruction:'private-provider-value'}})}
  const views=new ShopOperationViews(service,async()=>identity)
  await assert.rejects(()=>views.call(name,{},'fixture'),error=>error.message.startsWith(code)&&error.message.includes('没有待确认操作')&&!error.message.includes('private-provider-value'))
 }
})
