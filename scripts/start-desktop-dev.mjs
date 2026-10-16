/** Launch the built product Profile with separate Harness and Electron state. */
import { cpSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { selectDesktopProfile } from '../desktop-shell/dsh-plugin-desktop/src/profile-manager.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const desktop = join(root, 'desktop-shell', 'dsh-plugin-desktop')
const home = join(root, '.dsh', 'desktop-development')
const userData = join(root, '.dsh', 'desktop-dev-user-data')
const profile = join(home, 'profiles', 'futurestaff-alpha')
mkdirSync(dirname(profile), { recursive: true })
cpSync(join(root, 'dist', 'desktop-profile', 'profiles', 'futurestaff-alpha'), profile, { recursive: true })
selectDesktopProfile(join(userData, 'profile-selection', 'state.json'), home, 'futurestaff-alpha')

if (process.argv.includes('--prepare-only')) {
  console.log(`Prepared desktop development Profile: ${profile}`)
} else {
  const require = createRequire(join(desktop, 'package.json'))
  const environment = { ...process.env, DSH_HOME: home, DSH_HOST: '127.0.0.1' }
  delete environment.ELECTRON_RUN_AS_NODE
  const child = spawn(require('electron'), [join(desktop, 'lib', 'main.js'), `--user-data-dir=${userData}`], {
    cwd: root, env: environment, stdio: 'inherit', windowsHide: true,
  })
  child.once('error', error => { console.error(error); process.exitCode = 1 })
  child.once('exit', code => { process.exitCode = code ?? 1 })
}
