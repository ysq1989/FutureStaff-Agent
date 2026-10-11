import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Ignore only Git checkout CRLF/LF conversion, never source whitespace. */
export function desktopSourceDigest(path) {
  try {
    return createHash('sha256').update(readFileSync(path,'utf8').replaceAll('\r\n','\n')).digest('hex')
  } catch(error) {
    if(error.code==='ENOENT')return null
    throw error
  }
}

export function checkDeclaredDesktopDifferences(stableRoot,betaRoot,manifest) {
  if(!manifest||manifest.version!==1||!Array.isArray(manifest.files))throw Error('Desktop variant invalid declaration')
  const paths=new Set(),hash=value=>value===null||(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value))
  for(const entry of manifest.files){
    if(!entry||typeof entry.path!=='string'||entry.path.split('/').some(part=>!part||part.startsWith('.')||/[\\:]/.test(part))
      ||paths.has(entry.path)||typeof entry.reason!=='string'||!entry.reason.trim()
      ||!hash(entry.stableSha256)||!hash(entry.betaSha256)
      ||(entry.stableSha256===null&&entry.betaSha256===null))throw Error('Desktop variant invalid declaration')
    paths.add(entry.path)
    const stable=desktopSourceDigest(join(stableRoot,entry.path)),beta=desktopSourceDigest(join(betaRoot,entry.path))
    if(stable!==entry.stableSha256||beta!==entry.betaSha256)throw Error(`Desktop variant reviewed source changed: ${entry.path}`)
    if(stable===beta)throw Error(`Desktop variant no longer differs: ${entry.path}`)
  }
  return paths
}
