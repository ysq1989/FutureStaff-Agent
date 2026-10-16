import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ErpService} from '../lib/erp.js'
import {businessToolAllowed,decodeBusinessSystems} from '../lib/business-scope.js'
import {decodeAgentSnapshot} from '../lib/agents.js'

test('SHOP session is rejected before requesting an ERP grant or any ERP data',async()=>{
 let calls=0
 const service=new ErpService('https://platform.fsstory.net',async()=>({accessToken:'private',tenantId:'tenant',userId:'user',signal:new AbortController().signal}),async()=>{calls++;throw Error('NETWORK_MUST_NOT_RUN')},()=>Date.now(),async sessionId=>{assert.equal(sessionId,'shop-session');throw Error('AGENT_BUSINESS_SCOPE_DENIED')})
 await assert.rejects(()=>service.query({resource:'products'},'shop-session'),/AGENT_BUSINESS_SCOPE_DENIED/)
 assert.equal(calls,0)
})

test('SHOP excludes both ERP tool families while ERP and legacy scopes stay compatible',()=>{
 for(const name of ['erp_query','erp_order_form','erp_prepare_action','call_erp_api'])assert.equal(businessToolAllowed(name,['shop']),false)
 assert.equal(businessToolAllowed('shop_query',['shop']),true)
 assert.equal(businessToolAllowed('agent_image_generate',['shop']),true)
 assert.equal(businessToolAllowed('erp_query',['erp']),true)
 assert.equal(businessToolAllowed('erp_query',undefined),true)
 for(const value of [null,['unknown'],['shop','shop']])assert.throws(()=>decodeBusinessSystems(value))
 const snapshot={agentId:'30000000-0000-4000-8000-000000000001',name:'renamed assistant',description:'ERP text cannot grant scope',version:'a'.repeat(64),files:[],businessSystems:['shop']}
 assert.deepEqual(decodeAgentSnapshot(snapshot).businessSystems,['shop'])
 assert.throws(()=>decodeAgentSnapshot({...snapshot,businessSystems:'erp'}))
})
