import {net} from 'electron'
import type {Session} from 'electron'

/** Electron fetch rejects manual redirects; retain headers via ClientRequest. */
export function fetchSystemSession(session:Session,url:string,init?:RequestInit):Promise<Response> {
  if(init?.redirect!=='manual')return session.fetch(url,init)
  const parsed=new URL(url)
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||(init.method&&init.method!=='GET')||init.body)
    return Promise.reject(new Error('SYSTEM_SSO_CONTRACT_MISMATCH'))
  return new Promise((resolve,reject)=>{
    const request=net.request({url,session,useSessionCookies:true,redirect:'manual',method:'GET'})
    let settled=false
    const finish=(error?:unknown,response?:Response)=>{
      if(settled)return
      settled=true;clearTimeout(timer);init?.signal?.removeEventListener('abort',abort)
      if(error)reject(error);else resolve(response!)
    }
    const abort=()=>{finish(new DOMException('Request aborted','AbortError'));request.abort()}
    const timer=setTimeout(abort,20000)
    request.on('error',error=>finish(error))
    request.on('redirect',(status,_method,target)=>{
      finish(undefined,new Response(null,{status,headers:{location:target}}))
      request.abort()
    })
    request.on('response',response=>{
      const chunks:Uint8Array[]=[]
      response.on('data',chunk=>chunks.push(chunk))
      response.on('error',error=>finish(error))
      response.on('end',()=>{
        const headers=new Headers()
        for(const [key,value]of Object.entries(response.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value)
        finish(undefined,new Response(Buffer.concat(chunks),{status:response.statusCode,headers}))
      })
    })
    new Headers(init.headers).forEach((value,key)=>request.setHeader(key,value))
    init.signal?.addEventListener('abort',abort,{once:true})
    if(init.signal?.aborted)abort();else request.end()
  })
}
