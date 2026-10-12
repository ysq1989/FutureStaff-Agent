import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InteractionRegistry, InteractionReturnChannel } from '../lib/interaction.js'

const view = (module = 'erp', id = 'view-1', sessionId = 'session-1') => ({schemaVersion:1,module,viewId:id,sessionId,kind:'preview',title:'中文操作',data:{}})
test('shared view registry rejects other modules, owners, sessions, policy changes and expiry', () => {
  let now = 100
  const registry = new InteractionRegistry('erp', {now:() => now, ttlMs:10})
  registry.put({view:view(),owner:'tenant:employee',policy:'policy-1'})
  assert.equal(registry.checked('view-1','session-1','tenant:employee','policy-1').view.title,'中文操作')
  for (const args of [['view-1','other','tenant:employee','policy-1'],['view-1','session-1','other','policy-1'],['view-1','session-1','tenant:employee','policy-2']]) assert.throws(() => registry.checked(...args))
  assert.throws(() => registry.put({view:view('visa'),owner:'tenant:employee',policy:'policy-1'}))
  now=110
  assert.throws(() => registry.checked('view-1','session-1','tenant:employee','policy-1'))
})
test('an aborted login or tool operation invalidates its old view even with identical permissions', () => {
  const registry = new InteractionRegistry('erp'), controller=new AbortController()
  registry.put({view:view(),owner:'owner',policy:'p',signal:controller.signal})
  controller.abort()
  assert.throws(()=>registry.checked('view-1','session-1','owner','p'))
})
test('a second domain uses the same registry without ERP fields and disposal removes listeners', () => {
  const registry = new InteractionRegistry('visa'), events=[]
  registry.subscribe((v,owner) => events.push({module:v.module,owner}))
  registry.put({view:view('visa'),owner:'tenant:employee',policy:'p'})
  assert.deepEqual(events,[{module:'visa',owner:'tenant:employee'}])
  registry.clear()
  assert.throws(() => registry.checked('view-1','session-1','tenant:employee','p'))
  registry.put({view:view('visa','view-2'),owner:'tenant:employee',policy:'p'})
  assert.equal(events.length,1)
})
test('button results return once to their original session and owner, never a replacement identity', async () => {
  const channel = new InteractionReturnChannel(), messages=[],controller=new AbortController()
  channel.bind('session-1','tenant:employee',async value=>messages.push(value),controller.signal)
  assert.equal(await channel.deliver('action-1',view(),'other'),false)
  assert.equal(await channel.deliver('action-1',view('erp','v','other-session'),'tenant:employee'),false)
  const results=await Promise.all([channel.deliver('action-1',view(),'tenant:employee'),channel.deliver('action-1',view(),'tenant:employee')])
  assert.deepEqual(results,[true,true]);assert.equal(messages.length,1)
  controller.abort()
  assert.equal(await channel.deliver('action-2',view(),'tenant:employee'),false)
})
test('a failed conversation delivery retries the same result without claiming success', async () => {
  const channel = new InteractionReturnChannel();let attempts=0
  channel.bind('session-1','owner',async()=>{if(++attempts===1)throw Error('conversation unavailable')},new AbortController().signal)
  await assert.rejects(()=>channel.deliver('action-1',view(),'owner'))
  assert.equal(await channel.deliver('action-1',view(),'owner'),true)
  assert.equal(attempts,2)
  channel.clear();assert.equal(await channel.deliver('action-2',view(),'owner'),false)
})
test('disposing one runtime does not remove another session return channel',async()=>{
 const channel = new InteractionReturnChannel(),signal=new AbortController().signal
 channel.bind('session-1','owner',async()=>{},signal)
 channel.bind('session-2','owner',async()=>{},signal)
 channel.unbind('session-1')
 assert.equal(await channel.deliver('action-1',view(),'owner'),false)
 assert.equal(await channel.deliver('action-2',view('erp','v','session-2'),'owner'),true)
})
