/** Scoped Host update derived from the installed Profile; no user data or native shell copy. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'output/fashion-release-20261014')
const packaged='D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha'
const active='C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'
const prefix='node_modules/@futurestaff/fs-platform-access/lib/'
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex')
const manifestFile=path.join(packaged,'release-manifest.json')
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'))
const files={}
for(const name of ['agent-images','agent-images-host','fashion-files'])for(const extension of ['.js','.js.map','.d.ts']){
 const source=path.join(root,'plugins/fs-platform-access/lib',name+extension)
 files[prefix+name+extension]=fs.readFileSync(source)
}
const oldPlugin=fs.readFileSync(path.join(packaged,prefix+'plugin.js'),'utf8')
const anchor='return { ...credentials, agentId: binding.agentId, version: binding.version };'
if(oldPlugin.split(anchor).length!==2)throw Error('Installed image authorization anchor drifted')
files[prefix+'plugin.js']=Buffer.from(oldPlugin.replace(anchor,'return { ...credentials, agentId: binding.agentId, version: binding.version, workspacePath: await agents.store.workspacePath(binding.agentId) };'))
fs.mkdirSync(output,{recursive:true})
const candidate={changes:[],manifestBefore:hash(fs.readFileSync(manifestFile)),nativeShellChanged:false,userDataCopied:false}
for(const [relative,raw] of Object.entries(files)){
 const file=path.join(output,'candidate',relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,raw)
 for(const [label,directory] of [['packaged',packaged],['active',active]]){
  const target=path.join(directory,relative)
  candidate.changes.push({label,target,relative,candidateHash:hash(raw),beforeHash:fs.existsSync(target)?hash(fs.readFileSync(target)):null})
 }
}
const previous=Object.fromEntries(Object.entries(manifest.files).filter(([relative])=>relative.startsWith(prefix)))
manifest.workspacePreviousInventories??=[]
if(!manifest.workspacePreviousInventories.some(value=>JSON.stringify(value)===JSON.stringify(previous)))manifest.workspacePreviousInventories.push(previous)
for(const [relative,raw] of Object.entries(files))manifest.files[relative]=hash(raw)
fs.writeFileSync(path.join(output,'manifest.candidate.json'),JSON.stringify(manifest,null,2))
fs.writeFileSync(path.join(output,'candidate.json'),JSON.stringify(candidate,null,2))
if(process.argv[2]!=='apply'){console.log(JSON.stringify({status:'prepared',files:Object.keys(files).length,userDataCopied:false,nativeShellChanged:false}));process.exit(0)}
if(hash(fs.readFileSync(manifestFile))!==candidate.manifestBefore)throw Error('Installed manifest changed')
for(const change of candidate.changes){
 const actual=fs.existsSync(change.target)?hash(fs.readFileSync(change.target)):null
 if(actual!==change.beforeHash)throw Error('Installed Host changed: '+change.relative)
 if(hash(fs.readFileSync(path.join(output,'candidate',change.relative)))!==change.candidateHash)throw Error('Candidate changed')
 const backup=path.join(output,'before',change.label,change.relative)
 fs.mkdirSync(path.dirname(backup),{recursive:true})
 if(actual&&!fs.existsSync(backup))fs.copyFileSync(change.target,backup)
}
if(!fs.existsSync(path.join(output,'release-manifest.before.json')))fs.copyFileSync(manifestFile,path.join(output,'release-manifest.before.json'))
for(const change of candidate.changes){fs.mkdirSync(path.dirname(change.target),{recursive:true});fs.copyFileSync(path.join(output,'candidate',change.relative),change.target)}
fs.copyFileSync(path.join(output,'manifest.candidate.json'),manifestFile)
fs.writeFileSync(path.join(output,'installed.json'),JSON.stringify(candidate,null,2))
console.log(JSON.stringify({status:'installed',files:Object.keys(files).length,userDataCopied:false,nativeShellChanged:false}))
