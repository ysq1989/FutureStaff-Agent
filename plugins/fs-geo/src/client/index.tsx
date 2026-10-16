import type {Context} from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@futurestaff/fs-platform-access/client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {geoCloudHome} from '../cloud-entry.js';

export const inject=['platformClientSession','platformSystemPages','slots'];
const pageId='geo';
export function apply(ctx:Context){
 function Launcher({wide}:{wide:boolean}){
  return <button type="button" aria-label="打开 GEO 系统" title="GEO 品牌可见性与内容运营" onClick={()=>ctx.platformSystemPages.open(pageId)} style={{width:'100%',padding:'8px 10px'}}> {wide?'GEO 品牌运营':'GEO'} </button>;
 }
 function Page(){
  const controller=ctx.platformClientSession;
  const session=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const home=geoCloudHome(session);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const owner=session.activeTenantId+':'+session.user?.userId;
  async function enter(){
   if(busy||!home)return;setBusy(true);setError('');
   try{
    const response=await fetch('/_futurestaff/geo/launch',{method:'POST',headers:{'content-type':'application/json','x-futurestaff-geo':'1'},body:'{}',cache:'no-store'});
    const value=await response.json();
    if(!response.ok)throw Error(value.error?.message||'GEO 登录交接暂不可用');
    const url=new URL(value.data?.url);
    if(url.origin+'/'!==home||url.pathname!=='/agent-connect'||!/^#geo-agent=[A-Za-z0-9_-]{1,512}$/.test(url.hash)||url.search||url.username||url.password)throw Error('GEO 登录目标无效');
    const current=controller.getSnapshot();if(current.activeTenantId+':'+current.user?.userId!==owner||current.phase!=='ready'||geoCloudHome(current)!==home)throw Error('主体或授权已切换，请重新打开 GEO');
    window.open(url.href,'_blank','noopener,noreferrer');
   }catch(e){setError(e instanceof Error?e.message:'云端 GEO 暂不可用')}finally{setBusy(false)}
  }
  useEffect(()=>{if(home)void enter()},[owner,home]);
  return <section style={{padding:24,maxWidth:760,lineHeight:1.7}}>
    <h1>GEO 品牌运营</h1>
    <p>品牌资料、文章、审核和推广计划统一保存在云端。</p>
    {home ? <button type="button" aria-label="打开云端 GEO 工作台" disabled={busy} onClick={()=>void enter()}>{busy?'正在交接登录…':'重新进入云端工作台'}</button>
      : <p role="status">请在 FutureStaff 主窗口完成登录，并核对当前主体的 GEO 应用入口及授权。</p>}
    {error&&<p role="alert">{error}</p>}
    <p>云端渠道账号列表中的“在本机登录头条”会打开本机隔离登录窗口，登录态保留在本机。实际账号和自动发布仍需核验。</p>
    <p>原有本地工作区数据已保留，未自动上传或合并到云端。</p>
  </section>;
 }
 ctx.effect(()=>ctx.platformSystemPages.register({id:pageId,title:'GEO 品牌运营',component:Page}),'futurestaff-geo: peer system page');
 ctx.slots.inject('sidebar.footer.action',()=>ctx.slots.register({name:'sidebar.footer.action',id:'futurestaff-geo-launcher',order:-14},Launcher));
}
