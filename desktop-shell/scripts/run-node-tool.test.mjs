import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { nodeToolEntry } from './run-node-tool.mjs'

test('Node tool launcher preserves Unicode paths, arguments and exit codes without a cmd shim',()=>{
  const temporary=mkdtempSync(join(tmpdir(),'fs-node-tools-'))
  const root=join(temporary,'中文项目'),tool=join(root,'node_modules','tsdown')
  try{
    mkdirSync(tool,{recursive:true})
    writeFileSync(join(root,'package.json'),'{}')
    writeFileSync(join(tool,'package.json'),JSON.stringify({name:'tsdown',bin:{tsdown:'runner.mjs'}}))
    writeFileSync(join(tool,'runner.mjs'),'process.stdout.write(JSON.stringify(process.argv.slice(2)));process.exitCode=7')
    assert.equal(nodeToolEntry(root,'tsdown'),join(tool,'runner.mjs'))
    const result=spawnSync(process.execPath,[fileURLToPath(new URL('./run-node-tool.mjs',import.meta.url)),
      'tsdown','空格 参数','literal & percent%'],{cwd:root,encoding:'utf8',windowsHide:true})
    assert.equal(result.status,7,result.stderr)
    assert.deepEqual(JSON.parse(result.stdout),['空格 参数','literal & percent%'])
    assert.throws(()=>nodeToolEntry(root,'unknown'),/Unsupported Node tool/)
  }finally{rmSync(temporary,{recursive:true,force:true})}
})

test('tool launcher refuses a package that has no matching CLI entry',()=>{
  const root=mkdtempSync(join(tmpdir(),'fs-node-tools-invalid-'))
  try{
    const tool=join(root,'node_modules','tsdown');mkdirSync(tool,{recursive:true})
    writeFileSync(join(root,'package.json'),'{}')
    writeFileSync(join(tool,'package.json'),JSON.stringify({name:'tsdown',bin:{other:'x.mjs'}}))
    assert.throws(()=>nodeToolEntry(root,'tsdown'),/CLI entry is missing/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
