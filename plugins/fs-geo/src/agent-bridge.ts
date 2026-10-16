import {createServer,type Server,type IncomingMessage,type ServerResponse} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {PublicationProfileOwner} from './publication-accounts.js';

const cap=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const authorization=z.object({clientId:z.string().max(100),redirectUri:z.string().max(500),codeChallenge:z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),state:z.string().regex(/^[A-Za-z0-9_-]{16,128}$/)}).strict();
const command=z.discriminatedUnion('action',[
 z.object({cap,action:z.literal('AUTHORIZE'),authorizationRequest:authorization}).strict(),
 z.object({cap,action:z.literal('STATUS')}).strict(),
 z.object({cap,action:z.literal('OPEN_ACCOUNT'),projectId:z.uuid(),accountId:z.uuid()}).strict(),
 z.object({cap,action:z.literal('CLOSE_ACCOUNT')}).strict(),
 z.object({cap,action:z.literal('DISCONNECT')}).strict(),
]);
const ownerSchema=z.object({namespace:z.enum(['https://platform.fsstory.net','https://dev.fsstory.net']),tenantId:z.uuid(),userId:z.uuid(),permissions:z.array(z.string())});
interface ProfilePort {open(accountId:string):Promise<{phase:string;accountId:string;publishingVerified:boolean}>;close():void}
interface AccountProjection {tenantId:string;userId:string;projectId:string;account:{id:string;platform:string;label:string}}
export interface GeoAgentBridgeOptions {
 authorize():Promise<PublicationProfileOwner>;
 authorizeBrowser(input:z.infer<typeof authorization>):Promise<{redirectUrl:string}>;
 lookupAccount(input:{owner:PublicationProfileOwner;origin:string;projectId:string;accountId:string}):Promise<AccountProjection>;
 profiles(authorize:()=>Promise<PublicationProfileOwner>):ProfilePort;
}
const originFor=(owner:PublicationProfileOwner)=>owner.namespace==='https://platform.fsstory.net'?'https://geo.fsstory.net':'https://geo-dev.fsstory.net';
const ownerKey=(owner:PublicationProfileOwner)=>JSON.stringify([owner.namespace,owner.tenantId,owner.userId]);
function reply(response:ServerResponse,status:number,data:unknown){response.statusCode=status;response.setHeader('content-type','application/json');response.setHeader('cache-control','no-store');response.setHeader('x-content-type-options','nosniff');response.end(JSON.stringify(data))}
export class GeoAgentBridge {
 private current:{server:Server;profiles:ProfilePort;owner:PublicationProfileOwner;abort:()=>void;timer:ReturnType<typeof setTimeout>}|undefined;
 private launching=false;
 constructor(private options:GeoAgentBridgeOptions){}
 async launch(){
  if(this.launching)throw Error('GEO_LAUNCH_BUSY');this.launching=true;
  try{
   const owner=await this.options.authorize();ownerSchema.parse(owner);owner.signal.throwIfAborted();
   await this.close();
   const origin=originFor(owner),secret=randomBytes(32).toString('base64url');
   let invalid=false,authorized=false,used=false,port=0;const requests:number[]=[];
   const bound=async()=>{
    if(invalid)throw Error('GEO_IDENTITY_CHANGED');
    owner.signal.throwIfAborted();let current:PublicationProfileOwner;
    try{current=await this.options.authorize()}catch(error){invalid=true;profiles.close();throw error}
    if(ownerKey(current)!==ownerKey(owner)){invalid=true;profiles.close();throw Error('GEO_IDENTITY_CHANGED')}
    current.signal.throwIfAborted();return current;
   };
   const profiles=this.options.profiles(bound);
   const handle=async(request:IncomingMessage,response:ServerResponse)=>{
    const permitted=request.socket.remoteAddress==='127.0.0.1'&&request.headers.host===`127.0.0.1:${port}`&&request.headers.origin===origin&&request.url==='/geo-agent/v1';
    if(!permitted)return reply(response,403,{error:{code:'LOCAL_ORIGIN_REJECTED',message:'本机连接来源不匹配'}});
    response.setHeader('access-control-allow-origin',origin);response.setHeader('vary','Origin');
    response.setHeader('access-control-allow-private-network','true');
    if(request.method==='OPTIONS'){
     if(request.headers['access-control-request-method']!=='POST'||String(request.headers['access-control-request-headers']||'').toLowerCase().split(',').map(v=>v.trim()).filter(Boolean).some(v=>v!=='content-type'))return reply(response,403,{error:{code:'LOCAL_METHOD_REJECTED',message:'本机操作方法无效'}});
     response.setHeader('access-control-allow-methods','POST');response.setHeader('access-control-allow-headers','Content-Type');response.statusCode=204;response.end();return;
    }
    if(request.method!=='POST'||!String(request.headers['content-type']).startsWith('application/json'))return reply(response,415,{error:{code:'LOCAL_JSON_REQUIRED',message:'本机接口只接受 JSON 操作'}});
    try{
     let size=0;const chunks:Buffer[]=[];
     for await(const raw of request){const chunk=Buffer.from(raw);size+=chunk.length;if(size>8192)throw Error('LOCAL_REQUEST_LIMIT');chunks.push(chunk)}
     const raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));
     if(typeof raw?.cap!=='string'||Buffer.byteLength(raw.cap)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(raw.cap),Buffer.from(secret)))return reply(response,403,{error:{code:'LOCAL_CONNECTION_INVALID',message:'请从 Agent 重新打开 GEO'}});
     const input=command.parse(raw);
     const now=Date.now();while(requests.length&&requests[0]<now-60000)requests.shift();if(requests.length>=20)throw Error('LOCAL_RATE_LIMIT');requests.push(now);
     const current=await bound();
     if(input.action==='DISCONNECT'){invalid=true;profiles.close();reply(response,200,{data:{closed:true}});queueMicrotask(()=>{void this.close()});return}
     if(input.action==='AUTHORIZE'){
      if(used)return reply(response,409,{error:{code:'LOCAL_AUTH_USED',message:'登录交接已执行，请重新打开 GEO'}});
      if(input.authorizationRequest.clientId!==(origin.includes('geo-dev.')?'futurestaff-geo-dev':'futurestaff-geo-prod')||input.authorizationRequest.redirectUri!==origin+'/oauth/callback/futurestaff')throw Error('LOCAL_CALLBACK_REJECTED');
      used=true;
      const result=await this.options.authorizeBrowser(input.authorizationRequest);
      await bound();
      const target=new URL(result.redirectUrl);
      if(target.origin+target.pathname!==input.authorizationRequest.redirectUri||target.searchParams.get('state')!==input.authorizationRequest.state)throw Error('LOCAL_CALLBACK_REJECTED');
      authorized=true;return reply(response,200,{data:{redirectUrl:target.href}});
     }
     if(input.action==='STATUS')return reply(response,200,{data:{schemaVersion:1,owner:{tenantId:current.tenantId,userId:current.userId},authorized,publishingVerified:false}});
     if(!authorized)throw Error('LOCAL_AUTH_REQUIRED');
     if(input.action==='CLOSE_ACCOUNT'){profiles.close();return reply(response,200,{data:{closed:true}})}
     if(!current.permissions.some(p=>['geo.admin','geo.operator'].includes(p))){profiles.close();throw Error('GEO_PERMISSION_REQUIRED')}
     const projection=await this.options.lookupAccount({owner:current,origin,projectId:input.projectId,accountId:input.accountId});
     await bound();
     if(projection.tenantId!==current.tenantId||projection.userId!==current.userId||projection.projectId!==input.projectId||projection.account.id!==input.accountId||projection.account.platform!=='toutiao')throw Error('GEO_ACCOUNT_SCOPE_REJECTED');
     return reply(response,200,{data:await profiles.open(input.accountId)});
    }catch(error){
     if(error instanceof z.ZodError||error instanceof SyntaxError)return reply(response,422,{error:{code:'LOCAL_INPUT_INVALID',message:'本机操作参数无效'}});
     const code=error instanceof Error?error.message:'';
     if(code==='需要安装 Chrome 或 Edge 才能登录头条')return reply(response,409,{error:{code:'BROWSER_REQUIRED',message:'请安装 Chrome 或 Edge 后，再打开本机头条登录窗口'}});
     const known=['GEO_IDENTITY_CHANGED','GEO_PERMISSION_REQUIRED','GEO_ACCOUNT_SCOPE_REJECTED','LOCAL_CALLBACK_REJECTED','LOCAL_AUTH_REQUIRED','LOCAL_REQUEST_LIMIT','LOCAL_RATE_LIMIT'];
     return reply(response,known.includes(code)?403:503,{error:{code:known.includes(code)?code:'LOCAL_CONNECTION_UNAVAILABLE',message:'本机连接或授权暂不可用，请从 Agent 重新打开 GEO'}});
    }
   };
   const server=createServer((request,response)=>{void handle(request,response)});server.requestTimeout=5000;server.keepAliveTimeout=1000;
   await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve())});
   const address=server.address();if(!address||typeof address==='string')throw Error('LOCAL_BIND_FAILED');port=address.port;
   const abort=()=>{void this.close()};const timer=setTimeout(abort,30*60000);timer.unref();
   this.current={server,profiles,owner,abort,timer};owner.signal.addEventListener('abort',abort,{once:true});
   if(owner.signal.aborted){await this.close();owner.signal.throwIfAborted()}
   return {url:origin+'/agent-connect#geo-agent='+Buffer.from(JSON.stringify({port,cap:secret})).toString('base64url')};
  }finally{this.launching=false}
 }
 async close(){const active=this.current;this.current=undefined;if(active){clearTimeout(active.timer);active.owner.signal.removeEventListener('abort',active.abort);active.profiles.close();active.server.closeIdleConnections();await new Promise<void>(resolve=>active.server.close(()=>resolve()))}}
}
