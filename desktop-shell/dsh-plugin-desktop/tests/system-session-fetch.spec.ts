import {EventEmitter} from 'node:events'
import {expect,it,vi} from 'vitest'
import type {Session} from 'electron'
const requests=vi.hoisted(()=>({last:null as any,options:null as any}))
vi.mock('electron',()=>({net:{request:vi.fn(options=>{
 requests.options=options
 const request=new EventEmitter() as any
 request.abort=vi.fn(()=>request.emit('error',new Error('Redirect was cancelled')))
 request.followRedirect=vi.fn();request.setHeader=vi.fn()
 request.end=()=>queueMicrotask(()=>request.emit('redirect',302,'GET','https://platform.fsstory.net/login',{location:['https://platform.fsstory.net/login']}))
 requests.last=request;return request
})}}))
import {fetchSystemSession} from '../src/system-session-fetch.ts'
it('returns manual redirect headers without following or copying cookies from another session',async()=>{
 const session={fetch:vi.fn(async()=>{throw Error('Redirect was cancelled')})} as unknown as Session
 const response=await fetchSystemSession(session,'https://geo.fsstory.net/api/geo/auth/start',{redirect:'manual'})
 expect(response.status).toBe(302)
 expect(response.headers.get('location')).toBe('https://platform.fsstory.net/login')
 expect(requests.options.session).toBe(session);expect(requests.options.useSessionCookies).toBe(true)
 expect(requests.last.followRedirect).not.toHaveBeenCalled()
 expect(session.fetch).not.toHaveBeenCalled()
})
