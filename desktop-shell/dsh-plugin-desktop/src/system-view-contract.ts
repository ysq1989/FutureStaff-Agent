export const SYSTEM_VIEW_CHANNEL = 'futurestaff:system-view:v1'
export interface SystemViewTarget { url: string; owner: string; signal: AbortSignal; prepare?: (fetcher: (url:string,init?:RequestInit)=>Promise<Response>)=>Promise<boolean | void> }
export type SystemViewResolver = (appId: string) => Promise<SystemViewTarget>
export interface SystemViewRequest {
  action: 'show' | 'hide' | 'close' | 'reload'
  appId: string
  bounds?: { x: number; y: number; width: number; height: number }
}
export interface SystemViewResult { ok: boolean; error?: string }
