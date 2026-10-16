import {test} from 'node:test'
import assert from 'node:assert/strict'
import {WebsiteService} from '../lib/website.js'
const identity={accessToken:'private',agentId:'10000000-0000-4000-8000-000000000001',version:'a'.repeat(64),signal:new AbortController().signal}
test('Website bridge stays standalone without invoking remote website operations',async()=>{
 const requests=[]
 const service=new WebsiteService('https://platform.fsstory.net',async()=>identity,async(url,init)=>{requests.push([url.href,init]);return Response.json({mode:'standalone',tools:[],agentVersion:identity.version})})
 assert.equal((await service.tools('session')).mode,'standalone')
 assert.equal(requests.length,1);assert.match(requests[0][0],/website-tools$/)
})
test('Website bridge pins version, strips credentials from failures and never retries writes',async()=>{
 const requests=[]
 const service=new WebsiteService('https://platform.fsstory.net',async()=>identity,async(url,init)=>{requests.push([url.href,init]);throw Error('private')})
 await assert.rejects(service.call('session',{name:'website_reference_save',arguments:{requestId:'test'}}),/WEBSITE_RESULT_UNCONFIRMED/)
 assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0][1].body).agentVersion,identity.version)
})
