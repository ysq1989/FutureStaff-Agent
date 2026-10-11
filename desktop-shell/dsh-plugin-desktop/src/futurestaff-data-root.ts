/** New Windows installs share a managed root; existing installations stay put. */
import { existsSync, lstatSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join } from 'node:path'

function ensureDirectory(directory:string):void {
  const parent=dirname(directory)
  if(parent!==directory)ensureDirectory(parent)
  if(!existsSync(directory))mkdirSync(directory)
  const info=lstatSync(directory)
  if(!info.isDirectory()||info.isSymbolicLink())throw Error('AGENT_DATA_ROOT_UNSAFE')
}

export function configureFutureStaffDataRoot(
  app:{getPath(name:'userData'):string;setPath(name:'userData',value:string):void},
  platform=process.platform,env:NodeJS.ProcessEnv=process.env,home=homedir(),
):void {
  if(platform!=='win32')return
  const local=env.LOCALAPPDATA
  if(!local||!isAbsolute(local))throw Error('AGENT_DATA_ROOT_UNAVAILABLE')
  const root=join(local,'FutureStaff Agent'),legacy=app.getPath('userData')
  if(!existsSync(legacy)||readdirSync(legacy).length===0){
    const directory=join(root,'desktop');ensureDirectory(directory)
    app.setPath('userData',directory)
  }
  // Preserve launcher/user overrides and pre-existing Harness profiles.
  if(!env.DSH_HOME&&!existsSync(join(home,'.dsh'))){
    const directory=join(root,'harness');ensureDirectory(directory)
    env.DSH_HOME=directory
  }
}
