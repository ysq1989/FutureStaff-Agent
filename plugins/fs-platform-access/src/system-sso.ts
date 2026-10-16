import { createHash, randomBytes } from 'node:crypto'
import { systemApplicationId } from './system-navigation.js'
import type { GeoBrowserAuthorization } from './contracts.js'

export type SystemFetch = (url: string, init?: RequestInit) => Promise<Response>
/** Uses server-issued, one-use PKCE codes; never copies passwords or business cookies. */
export async function establishModuleSession(input: {
  appId: string; url: string; authority: string; userId: string; tenantId: string; signal: AbortSignal;
  fetch: SystemFetch; authorize: (moduleId: string, body: GeoBrowserAuthorization) => Promise<{redirectUrl:string}>;
  authorizeAi?: (input:{codeChallenge:string;state:string})=>Promise<{code:string;state:string}>;
}): Promise<boolean> {
  const origin = new URL(input.url).origin
  const environment = input.authority === 'https://platform.fsstory.net' ? 'prod' : 'dev'
  if(input.appId==='web') {
    const sessionUrl=`${origin}/api/website/session`
    const matches=(value:{user?:{id?:string;tenantId?:string};realPlatformConnected?:boolean})=>
      value.realPlatformConnected===true&&value.user?.id===input.userId&&value.user?.tenantId===input.tenantId
    const current=await input.fetch(sessionUrl,{credentials:'include',cache:'no-store',signal:input.signal})
    if(current.ok&&matches(await current.json()))return false
    // Website owns the verifier/state cookie and consumes its own callback.
    const start=await input.fetch(`${origin}/oauth/start`,{credentials:'include',redirect:'manual',cache:'no-store',signal:input.signal})
    const location=start.headers.get('location')
    if(!location)throw Error('SYSTEM_SSO_NOT_ENROLLED')
    const authorization=new URL(location),params=authorization.searchParams,redirectUri=`${origin}/oauth/callback/futurestaff`
    const keys=['client_id','redirect_uri','code_challenge_method','code_challenge','state']
    if(authorization.origin!==input.authority||authorization.pathname!=='/login'||authorization.username||authorization.password||authorization.hash
      ||keys.some(key=>params.getAll(key).length!==1)||params.get('client_id')!==`futurestaff-web-${environment}`
      ||params.get('redirect_uri')!==redirectUri||params.get('code_challenge_method')!=='S256'
      ||!/^[A-Za-z0-9_-]{43}$/.test(params.get('code_challenge')??'')||!/^[A-Za-z0-9_-]{32,128}$/.test(params.get('state')??''))throw Error('SYSTEM_SSO_CONTRACT_MISMATCH')
    const result=await input.authorize('web',{clientId:params.get('client_id')!,redirectUri,codeChallenge:params.get('code_challenge')!,state:params.get('state')!})
    const callback=new URL(result.redirectUrl)
    if(callback.origin+callback.pathname!==redirectUri||callback.username||callback.password||callback.hash
      ||callback.searchParams.getAll('state').length!==1||callback.searchParams.get('state')!==params.get('state')
      ||callback.searchParams.getAll('code').length!==1||!callback.searchParams.get('code')||input.signal.aborted)throw Error('SYSTEM_SSO_CALLBACK_MISMATCH')
    const exchange=await input.fetch(callback.href,{credentials:'include',redirect:'follow',cache:'no-store',signal:input.signal})
    if(!exchange.ok||input.signal.aborted)throw Error('SYSTEM_SSO_EXCHANGE_FAILED')
    const verified=await input.fetch(sessionUrl,{credentials:'include',cache:'no-store',signal:input.signal})
    if(!verified.ok)throw Error('SYSTEM_SSO_EXCHANGE_FAILED')
    if(!matches(await verified.json())||input.signal.aborted)throw Error('SYSTEM_SSO_CONTRACT_MISMATCH')
    return true
  }
  if(input.appId==='geo') {
    const current=await input.fetch(`${origin}/api/geo/v1/session`,{credentials:'include',cache:'no-store',signal:input.signal})
    if(current.ok){const value=await current.json() as {data?:{userId?:string;tenantId?:string}}
      if(value.data?.userId===input.userId&&value.data?.tenantId===input.tenantId)return false}
    const start=await input.fetch(`${origin}/api/geo/auth/start`,{credentials:'include',redirect:'manual',cache:'no-store',signal:input.signal})
    const location=start.headers.get('location')
    if(!location)throw Error('SYSTEM_SSO_NOT_ENROLLED')
    const authorize=new URL(location),params=authorize.searchParams
    const redirectUri=`${origin}/oauth/callback/futurestaff`
    if(authorize.origin!==input.authority||params.get('redirect_uri')!==redirectUri||params.get('code_challenge_method')!=='S256'
      ||params.get('client_id')!==`futurestaff-geo-${environment}`||!params.get('state')||!params.get('code_challenge'))throw Error('SYSTEM_SSO_CONTRACT_MISMATCH')
    const result=await input.authorize('geo',{clientId:params.get('client_id')!,redirectUri,codeChallenge:params.get('code_challenge')!,state:params.get('state')!})
    const callback=new URL(result.redirectUrl)
    if(callback.origin+callback.pathname!==redirectUri||callback.searchParams.get('state')!==params.get('state')||input.signal.aborted)throw Error('SYSTEM_SSO_CALLBACK_MISMATCH')
    const exchange=await input.fetch(callback.href,{credentials:'include',cache:'no-store',redirect:'follow',signal:input.signal})
    if(!exchange.ok||input.signal.aborted)throw Error('SYSTEM_SSO_EXCHANGE_FAILED')
    const verified=await input.fetch(`${origin}/api/geo/v1/session`,{credentials:'include',cache:'no-store',signal:input.signal})
    if(!verified.ok)throw Error('SYSTEM_SSO_EXCHANGE_FAILED')
    const actor=await verified.json() as {data?:{userId?:string;tenantId?:string}}
    if(actor.data?.userId!==input.userId||actor.data?.tenantId!==input.tenantId)throw Error('SYSTEM_SSO_CONTRACT_MISMATCH')
    return true
  }
  if(input.appId==='ai') {
    const current=await input.fetch(`${origin}/ai-api/session`,{credentials:'include',cache:'no-store',signal:input.signal})
    if(current.ok){const value=await current.json() as {user?:{id?:string;tenantId?:string;environment?:string}}
      if(value.user?.id===input.userId&&value.user?.tenantId===input.tenantId&&value.user?.environment===environment)return false}
    if(!input.authorizeAi)throw Error('SYSTEM_SSO_UNAVAILABLE')
    const verifier=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url')
    const proof=await input.authorizeAi({codeChallenge:createHash('sha256').update(verifier).digest('base64url'),state})
    if(proof.state!==state||input.signal.aborted)throw Error('SYSTEM_SSO_CALLBACK_MISMATCH')
    const exchange=await input.fetch(`${origin}/ai-api/auth/desktop`,{method:'POST',credentials:'include',cache:'no-store',signal:input.signal,
      headers:{'content-type':'application/json',Origin:origin},body:JSON.stringify({code:proof.code,codeVerifier:verifier,state,environment})})
    if(!exchange.ok||input.signal.aborted)throw Error('SYSTEM_SSO_EXCHANGE_FAILED')
    return true
  }
  const prefix=input.appId==='shop'?'/futurestaff/product-hub/auth':'/api/auth'
  const moduleId=input.appId==='shop'?'hub':input.appId
  const response = await input.fetch(`${origin}${prefix}/module-session`, { credentials:'include', cache:'no-store', signal:input.signal })
  if (response.ok) {
    const context = await response.json() as {user?:{id?:string;tenant_id?:string};module?:{module_id?:string}}
    if (context.user?.id === input.userId && context.user?.tenant_id === input.tenantId
      && systemApplicationId(context.module?.module_id ?? '') === moduleId) return false
  }
  const discovery = await input.fetch(`${origin}${prefix}/module-entry`, {cache:'no-store',signal:input.signal})
  if (!discovery.ok) throw Error('SYSTEM_SSO_NOT_ENROLLED')
  const entry = await discovery.json() as {module_id?:string;client_id?:string;host?:string;auth_base_url?:string;redirect_uri?:string}
  const authOrigin=input.appId==='shop'?'https://product.fsstory.net':origin
  if (!entry.client_id || !entry.redirect_uri || !entry.module_id || entry.host !== new URL(authOrigin).host
    || entry.auth_base_url !== input.authority || new URL(entry.redirect_uri).origin !== authOrigin
    || systemApplicationId(entry.module_id) !== moduleId) throw Error('SYSTEM_SSO_CONTRACT_MISMATCH')
  const verifier = randomBytes(32).toString('base64url'), state = randomBytes(32).toString('base64url')
  const result = await input.authorize(entry.module_id, {clientId:entry.client_id, redirectUri:entry.redirect_uri,
    codeChallenge:createHash('sha256').update(verifier).digest('base64url'), state})
  const callback = new URL(result.redirectUrl)
  if (callback.origin + callback.pathname !== entry.redirect_uri || callback.searchParams.get('state') !== state || !callback.searchParams.get('code')) throw Error('SYSTEM_SSO_CALLBACK_MISMATCH')
  if (input.signal.aborted) throw Error('SYSTEM_SSO_REVOKED')
  const exchange = await input.fetch(`${origin}${prefix}/module-token`, {method:'POST',credentials:'include',cache:'no-store',signal:input.signal,
    headers:{'content-type':'application/json',Origin:origin},body:JSON.stringify({client_id:entry.client_id,redirect_uri:entry.redirect_uri,
      code:callback.searchParams.get('code'),code_verifier:verifier})})
  if (!exchange.ok || input.signal.aborted) throw Error('SYSTEM_SSO_EXCHANGE_FAILED')
  return true
}
