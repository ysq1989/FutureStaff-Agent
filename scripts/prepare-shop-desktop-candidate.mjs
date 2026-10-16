import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
const root=path.resolve(import.meta.dirname,'..')
const desktop=path.join(root,'desktop-shell/dsh-plugin-desktop')
const require=createRequire(path.join(desktop,'package.json'))
const asar=require('@electron/asar')
const installed='D:/FutureStaff Agent/resources/app.asar'
const output=path.join(root,'output/shop-theme-desktop')
const snapshot=path.join(output,'native-source')
fs.mkdirSync(output,{recursive:true})
if(fs.existsSync(snapshot))throw Error('Snapshot already exists')
fs.mkdirSync(snapshot)
fs.cpSync(path.join(desktop,'src'),path.join(snapshot,'src'),{recursive:true})
for(const file of ['package.json','tsdown.config.ts','tsconfig.json','tsconfig.client.json'])fs.copyFileSync(path.join(desktop,file),path.join(snapshot,file))
fs.symlinkSync(path.join(desktop,'node_modules'),path.join(snapshot,'node_modules'),'junction')
// Reconstruct the installed source from its maps, excluding unrelated working-tree changes.
const files=asar.listPackage(installed).map(name=>name.slice(1).replaceAll('\\','/'))
let restored=0
for(const file of files.filter(name=>name.startsWith('lib/')&&name.endsWith('.map')&&!name.includes('/native-ui/'))){
 const map=JSON.parse(asar.extractFile(installed,file).toString())
 for(let i=0;i<map.sources.length;i++){
  const source=map.sources[i]
  if(!source.startsWith('../src/')||!map.sourcesContent[i])continue
  const destination=path.resolve(snapshot,'lib',source)
  if(!destination.startsWith(path.join(snapshot,'src')+path.sep))throw Error('Source map path invalid')
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,map.sourcesContent[i]);restored++
 }
}
if(restored<25)throw Error('Installed source maps incomplete')
function modify(file,transform){const target=path.join(snapshot,'src',file);const before=fs.readFileSync(target,'utf8');const after=transform(before);if(after===before)throw Error('Patch did not apply: '+file);fs.writeFileSync(target,after)}
function method(file,start,end){const current=fs.readFileSync(path.join(desktop,'src',file),'utf8');const a=current.indexOf(start),b=current.indexOf(end,a);if(a<0||b<0)throw Error('Missing method');return current.slice(a,b)}
modify('system-views.ts',source=>source.replace('  private detach(',method('system-views.ts','  /** No renderer IPC entry:','  private detach(')+'  private detach('))
modify('runtime.ts',source=>source.replace('export interface DesktopRuntime {','export interface DesktopRuntime {\n  requestSystem?(appId:string,path:string,init:RequestInit):Promise<Response>'))
for(const file of ['electron-runtime.ts','electron-shell-generation.ts'])modify(file,source=>{
 const block=method(file,'  async requestSystem(','\n  /**')
 const anchor=file==='electron-runtime.ts'?'  /** Show a native':'  /** Reload the active renderer'
 // Insert before show(), independent of the following method's documentation.
 let result=source.replace('  show(): void {',block+'\n  show(): void {')
 if(file==='electron-shell-generation.ts')result=result.replace('export class ElectronShellGeneration {','export class ElectronShellGeneration {\n  private systemViews:DesktopSystemViews|undefined').replace('    const systemViews = spec.resolveSystemApplication ? new DesktopSystemViews(window, origin, spec.resolveSystemApplication) : undefined','    const systemViews = spec.resolveSystemApplication ? new DesktopSystemViews(window, origin, spec.resolveSystemApplication) : undefined\n    this.systemViews=systemViews')
 return result
})
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
fs.writeFileSync(path.join(output,'baseline.json'),JSON.stringify({installedAsar:hash(installed),sourceMapsRestored:restored,productVersion:JSON.parse(asar.extractFile(installed,'package.json')).version},null,2))
console.log(JSON.stringify({snapshot,sourceMapsRestored:restored}))
