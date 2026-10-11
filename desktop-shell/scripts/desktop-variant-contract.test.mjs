import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { desktopSourceDigest, checkDeclaredDesktopDifferences } from './desktop-variant-contract.mjs'

function fixture(run) {
  const root=mkdtempSync(join(tmpdir(),'fs-variant-contract-'))
  const stable=join(root,'stable'),beta=join(root,'beta')
  mkdirSync(stable);mkdirSync(beta)
  try{return run({stable,beta})}finally{rmSync(root,{recursive:true,force:true})}
}
const entry=(stable,beta,path='feature.ts')=>({path,reason:'Reviewed product feature; Beta keeps upstream behavior',
  stableSha256:desktopSourceDigest(join(stable,path)),betaSha256:desktopSourceDigest(join(beta,path))})
const check=(stable,beta,records)=>checkDeclaredDesktopDifferences(stable,beta,{version:1,files:records})

test('declared product differences pass only for the reviewed Stable and Beta contents',()=>fixture(({stable,beta})=>{
  writeFileSync(join(stable,'feature.ts'),'product')
  writeFileSync(join(beta,'feature.ts'),'upstream')
  const record=entry(stable,beta)
  assert.deepEqual([...check(stable,beta,[record])],['feature.ts'])
  writeFileSync(join(stable,'feature.ts'),'new unreviewed product')
  assert.throws(()=>check(stable,beta,[record]),/reviewed source changed/)
  writeFileSync(join(stable,'feature.ts'),'product')
  writeFileSync(join(beta,'feature.ts'),'changed upstream')
  assert.throws(()=>check(stable,beta,[record]),/reviewed source changed/)
}))

test('Stable-only additions do not permit unreviewed Beta additions',()=>fixture(({stable,beta})=>{
  writeFileSync(join(stable,'feature.ts'),'product')
  const record=entry(stable,beta)
  assert.equal(record.betaSha256,null)
  assert.equal(check(stable,beta,[record]).has('feature.ts'),true)
  writeFileSync(join(beta,'feature.ts'),'unexpected addition')
  assert.throws(()=>check(stable,beta,[record]),/reviewed source changed/)
}))

test('traversal, duplicate entries, absent reasons and malformed hashes fail closed',()=>fixture(({stable,beta})=>{
  writeFileSync(join(stable,'feature.ts'),'product')
  const record=entry(stable,beta)
  for(const changed of [{...record,path:'../private.ts'},{...record,reason:''},{...record,stableSha256:'bad'},
    {...record,stableSha256:null,betaSha256:null}])assert.throws(()=>check(stable,beta,[changed]),/invalid declaration/)
  assert.throws(()=>check(stable,beta,[record,record]),/invalid declaration/)
  assert.throws(()=>checkDeclaredDesktopDifferences(stable,beta,{version:2,files:[]}),/invalid declaration/)
}))

test('hashes normalize checkout line endings without ignoring source changes',()=>fixture(({stable,beta})=>{
  writeFileSync(join(stable,'feature.ts'),'first\nsecond\n')
  const record=entry(stable,beta)
  writeFileSync(join(stable,'feature.ts'),'first\r\nsecond\r\n')
  assert.equal(check(stable,beta,[record]).size,1)
  writeFileSync(join(stable,'feature.ts'),'first\nsecond changed\n')
  assert.throws(()=>check(stable,beta,[record]),/reviewed source changed/)
}))

test('resolved differences require removing their declaration',()=>fixture(({stable,beta})=>{
  writeFileSync(join(stable,'feature.ts'),'same')
  writeFileSync(join(beta,'feature.ts'),'same')
  assert.throws(()=>check(stable,beta,[entry(stable,beta)]),/no longer differs/)
}))
