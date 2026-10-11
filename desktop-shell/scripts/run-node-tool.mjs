/** Launch build tools without Windows .cmd wrappers that can corrupt Unicode paths. */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packages = { tsdown: 'tsdown', vite: 'vite', tsc: 'typescript', vitest: 'vitest' }

export function nodeToolEntry(cwd, tool) {
  if (!Object.hasOwn(packages, tool)) throw Error(`Unsupported Node tool: ${tool}`)
  const require = createRequire(join(cwd, 'package.json'))
  const manifestPath = require.resolve(`${packages[tool]}/package.json`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const entry = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[tool]
  if (typeof entry !== 'string' || !entry) throw Error(`Node tool CLI entry is missing: ${tool}`)
  return resolve(dirname(manifestPath), entry)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [tool, ...args] = process.argv.slice(2)
  const result = spawnSync(process.execPath, [nodeToolEntry(process.cwd(), tool), ...args], {
    stdio: 'inherit', shell: false, windowsHide: true,
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}
