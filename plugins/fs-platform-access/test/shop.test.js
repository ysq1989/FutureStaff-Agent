import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ShopThemeService } from '../lib/shop.js'

test('Shop exchanges its own system session; credentials stay outside tool results', async () => {
  const identity = { owner:'tenant:user', signal:new AbortController().signal }
  const requests=[]
  const service=new ShopThemeService(async()=>identity, async(path,init)=>{
    requests.push([path,init])
    if(path==='/adminapi/platform_login') return Response.json({status:200,data:{token:'private-test-token'}})
    const rpc=JSON.parse(init.body)
    return Response.json({jsonrpc:'2.0',id:rpc.id,result:rpc.method==='tools/list'?{tools:[{name:'shop_theme_context'},{name:'shop_orders_list'}]}:{content:[{type:'text',text:'{"ok":true}'}]}})
  })
  assert.deepEqual(await service.list(),{hostTool:'shop_theme_call',callFormat:{name:'operationName',arguments:'按argumentsSchema填写'},operations:[{operationName:'shop_theme_context'}]})
  await service.call('shop_theme_context',{})
  assert.equal(requests.filter(([p])=>p==='/adminapi/platform_login').length,1)
  assert.equal(requests.at(-1)[1].headers['Authori-zation'],'Bearer private-test-token')
  await assert.rejects(service.call('shop_orders_list',{}),/SHOP_TOOL_DENIED/)
})

test('An aborted identity or lost write response never retries a mutation',async()=>{
 const controller=new AbortController(); let count=0
 const service=new ShopThemeService(async()=>({owner:'one',signal:controller.signal}),async(path)=>{
  if(path.includes('platform_login'))return Response.json({status:200,data:{token:'secret'}})
  count++;throw Error('network contains secret')
 })
 await assert.rejects(service.call('shop_theme_apply',{requestId:'request-123456789'}),/SHOP_RESULT_UNCONFIRMED/)
 assert.equal(count,1)
 controller.abort();await assert.rejects(service.list());assert.equal(count,1)
})

test('theme results preserve actual slots and revisions without duplicating large native sections',async()=>{
 const identity={owner:'tenant:user',origin:'https://shop-test.fsstory.net',signal:new AbortController().signal}
 const native={draftId:'a'.repeat(32),revision:4,sections:{home:{value:{banner:{name:'swiperBg',images:'x'.repeat(50000)}}},user:{value:{member:{name:'member'}}}},imageSlots:[{slotId:'home:banner:img',section:'home',componentId:'banner',path:'img',role:'banner',url:'https://private.example/long-image-url'}]}
 const service=new ShopThemeService(async()=>identity,async(path,init)=>path.includes('platform_login')?Response.json({status:200,data:{token:'private'}}):Response.json({id:JSON.parse(init.body).id,result:{isError:false,structuredContent:native,content:[{type:'text',text:JSON.stringify(native)}]}}))
 const result=await service.call('shop_theme_draft_get',{draftId:native.draftId})
 assert.equal(result.draftId,native.draftId);assert.equal(result.revision,4)
 assert.equal(result.imageSlots[0].slotId,'home:banner:img')
 assert.equal(result.sections,undefined);assert.equal(result.content,undefined)
 assert.ok(JSON.stringify(result).length<5000)
})

test('theme MCP errors stop with the real safe code instead of looking like successful objects',async()=>{
 const identity={owner:'tenant:user',signal:new AbortController().signal}
 const service=new ShopThemeService(async()=>identity,async(path,init)=>path.includes('platform_login')?Response.json({status:200,data:{token:'private'}}):Response.json({id:JSON.parse(init.body).id,result:{isError:true,content:[{type:'text',text:'THEME_STORAGE_UNAVAILABLE'}]}}))
 await assert.rejects(service.call('shop_theme_preview',{}),/THEME_STORAGE_UNAVAILABLE/)
})

test('short theme intent ids map once per real owner and status queries use the same id',async()=>{
 const identity={owner:'tenant:user',signal:new AbortController().signal},requests=[]
 const service=new ShopThemeService(async()=>identity,async(path,init)=>{
  if(path.includes('platform_login'))return Response.json({status:200,data:{token:'private'}})
  const rpc=JSON.parse(init.body);requests.push(rpc.params)
  return Response.json({id:rpc.id,result:{structuredContent:{status:'completed'},isError:false}})
 })
 await service.call('shop_theme_asset_attach',{requestId:'jade-attach-001'})
 await service.call('shop_theme_operation_status',{requestId:'jade-attach-001'})
 assert.match(requests[0].arguments.requestId,/^shop-[a-f0-9]{32}$/)
 assert.equal(requests[0].arguments.requestId,requests[1].arguments.requestId)
 await service.call('shop_theme_asset_attach',{requestId:'jade-attach-001'},'other-session')
 assert.notEqual(requests[0].arguments.requestId,requests[2].arguments.requestId)
})
