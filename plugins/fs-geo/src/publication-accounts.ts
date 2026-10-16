import {createHash} from 'node:crypto';
import {access,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {z} from 'zod';

export interface PublicationProfileOwner {
  namespace:string;tenantId:string;userId:string;permissions:readonly string[];signal:AbortSignal;
}
export interface AccountBrowserHandle {close():void}
export type AccountBrowserLauncher=(input:{url:string;profileDirectory:string})=>Promise<AccountBrowserHandle>;
const ownerSchema=z.object({namespace:z.enum(['https://dev.fsstory.net','https://platform.fsstory.net']),tenantId:z.uuid(),userId:z.uuid(),permissions:z.array(z.string())});

/** Explicit login window only. No cookie extraction, debugging port, stealth or publishing. */
export const launchToutiaoLogin:AccountBrowserLauncher=async input=>{
  if(input.url!=='https://mp.toutiao.com/auth/page/login'||!path.isAbsolute(input.profileDirectory))throw Error('头条登录目标无效');
  const bases=[process.env.ProgramFiles,process.env['ProgramFiles(x86)'],process.env.LOCALAPPDATA].filter((base):base is string=>!!base);
  const candidates=['Google/Chrome/Application/chrome.exe','Microsoft/Edge/Application/msedge.exe'].flatMap(relative=>bases.map(base=>path.join(base,...relative.split('/'))));
  let executable:string|undefined;
  for(const candidate of candidates){try{await access(candidate);executable=candidate;break}catch{/* next installed browser */}}
  if(!executable)throw Error('需要安装 Chrome 或 Edge 才能登录头条');
  const child=spawn(executable,[`--user-data-dir=${input.profileDirectory}`,'--no-first-run','--no-default-browser-check','--new-window',input.url],{stdio:'ignore',shell:false});
  await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)});
  return {close:()=>{if(child.exitCode===null)child.kill()}};
};

/** authorize must be a Host-owned Platform validation, never a renderer/model identity. */
export class ToutiaoAccountProfiles {
  private active:{key:string;handle:AccountBrowserHandle;signal:AbortSignal;revoke:()=>void}|undefined;
  private opening=false;
  constructor(private root:string,private authorize:()=>Promise<PublicationProfileOwner>,private launch:AccountBrowserLauncher=launchToutiaoLogin){
    if(!path.isAbsolute(root))throw Error('发布账号目录必须为本机绝对路径');
  }
  async open(accountId:string){
    z.uuid().parse(accountId);
    if(this.opening)throw Error('登录窗口正在打开，请稍后重试');
    this.opening=true;
    try{
      const owner=await this.authorize();ownerSchema.parse(owner);owner.signal.throwIfAborted();
      if(!owner.permissions.some(p=>['geo.operator','geo.admin'].includes(p)))throw Error('登录发布账号需要 GEO 操作权限');
      const key=createHash('sha256').update(JSON.stringify([owner.namespace,owner.tenantId,owner.userId,accountId])).digest('hex');
      if(this.active?.key===key)return {phase:'AWAITING_LOGIN' as const,accountId,publishingVerified:false};
      this.close();
      const profileDirectory=path.join(this.root,key);
      if(process.platform==='win32'&&profileDirectory.length>180)throw Error('发布账号目录过长，请使用较短的本机数据目录');
      await mkdir(profileDirectory,{recursive:true,mode:0o700});owner.signal.throwIfAborted();
      const handle=await this.launch({url:'https://mp.toutiao.com/auth/page/login',profileDirectory});
      if(owner.signal.aborted){handle.close();owner.signal.throwIfAborted()}
      const revoke=()=>{if(this.active?.handle===handle)this.close()};
      this.active={key,handle,signal:owner.signal,revoke};owner.signal.addEventListener('abort',revoke,{once:true});
      return {phase:'AWAITING_LOGIN' as const,accountId,publishingVerified:false};
    }finally{this.opening=false}
  }
  close(){const active=this.active;this.active=undefined;if(active){active.signal.removeEventListener('abort',active.revoke);active.handle.close()}}
}
