import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { configureFutureStaffDataRoot } from '../src/futurestaff-data-root.ts'

describe('FutureStaff 3.0 managed data root', () => {
  it('keeps new shell state, profiles and agent data beneath the same local root', () => {
    const dir=mkdtempSync(join(tmpdir(),'fs-data-root-'))
    try {
      let userData=join(dir,'roaming','FutureStaff Agent')
      const env:NodeJS.ProcessEnv={LOCALAPPDATA:dir}
      const app={getPath:()=>userData,setPath:(_key:string,value:string)=>{userData=value}}
      configureFutureStaffDataRoot(app,'win32',env,join(dir,'home'))
      expect(userData).toBe(join(dir,'FutureStaff Agent','desktop'))
      expect(env.DSH_HOME).toBe(join(dir,'FutureStaff Agent','harness'))
    } finally {rmSync(dir,{recursive:true,force:true})}
  })
  it('preserves populated legacy shell data and explicit profile roots without copying secrets', () => {
    const dir=mkdtempSync(join(tmpdir(),'fs-data-root-'))
    try {
      const legacy=join(dir,'legacy');mkdirSync(legacy)
      writeFileSync(join(legacy,'protected.json'),'synthetic preserved state')
      const env:NodeJS.ProcessEnv={LOCALAPPDATA:dir,DSH_HOME:join(dir,'explicit')}
      const app={getPath:()=>legacy,setPath:()=>{throw Error('must retain legacy')}}
      configureFutureStaffDataRoot(app,'win32',env,join(dir,'home'))
      expect(readFileSync(join(legacy,'protected.json'),'utf8')).toBe('synthetic preserved state')
      expect(env.DSH_HOME).toBe(join(dir,'explicit'))
    } finally {rmSync(dir,{recursive:true,force:true})}
  })
})
