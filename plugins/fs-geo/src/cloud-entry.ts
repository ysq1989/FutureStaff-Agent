import type { PlatformAccessSnapshot } from '@futurestaff/fs-platform-access';

/** Navigation hint only; the cloud GEO host validates its own module session. */
export function geoCloudHome(snapshot: Pick<PlatformAccessSnapshot,'phase'|'activeTenantId'|'applications'>): string|null {
  if(snapshot.phase!=='ready'||!snapshot.activeTenantId)return null;
  const app=snapshot.applications.find(item=>item.appId==='geo'&&item.tenantId===snapshot.activeTenantId
    &&['https://geo.fsstory.net','https://geo-dev.fsstory.net'].includes(item.baseUrl)
    &&item.capabilities.some(permission=>['geo.read','geo.operator','geo.admin'].includes(permission)));
  return app ? `${app.baseUrl}/` : null;
}
