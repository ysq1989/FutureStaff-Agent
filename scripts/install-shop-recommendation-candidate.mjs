/** Scoped, reversible local SHOP recommendation Host and client patch. Never copies user data or credentials. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const iteration=process.argv.find(value=>value.startsWith('--iteration='))?.slice(12)
if(iteration&&!/^[a-z0-9-]{2,24}$/.test(iteration))throw Error('Invalid reviewed iteration')
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'output/shop-recommendations-20261015',iteration??'')
const packaged='D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha'
const profiles='C:/Users/10089/.dsh/profiles'
const active=path.join(profiles,'fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089')
const prefix='node_modules/@futurestaff/fs-platform-access/lib/'
const manifestFile=path.join(packaged,'release-manifest.json')
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const key=map=>JSON.stringify(Object.entries(map).sort(([a],[b])=>a.localeCompare(b)))
function inventory(directory,relative=''){
 if(fs.lstatSync(directory).isSymbolicLink())throw Error('Linked code directory')
 return Object.fromEntries(fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const name=relative+entry.name,file=path.join(directory,entry.name)
  if(entry.isSymbolicLink())throw Error('Linked code file')
  return entry.isDirectory()?Object.entries(inventory(file,name+'/')):[[name,digest(file)]]
 }))
}
function unused(prior){
 return fs.readdirSync(profiles).filter(name=>/^fs-(dev|production)-[a-f0-9]{64}$/.test(name)).every(name=>{
  const directory=path.join(profiles,name)
  if(fs.lstatSync(directory).isSymbolicLink())throw Error('Linked workspace')
  return !Object.entries(prior).every(([relative,hash])=>{
   const file=path.join(directory,relative)
   if(!fs.existsSync(file))return false
   if(fs.lstatSync(file).isSymbolicLink()||!fs.lstatSync(file).isFile())throw Error('Invalid workspace file')
   return digest(file)===hash
  })
 })
}
if(process.argv[2]==='prepare'){
 if(fs.existsSync(out))throw Error('Candidate already exists')
 fs.mkdirSync(path.join(out,'candidate'),{recursive:true})
 const manifest=JSON.parse(fs.readFileSync(manifestFile)),changes=[],protectedCode={}
 for(const [label,directory] of Object.entries({packaged,active}))protectedCode[label]=inventory(path.join(directory,prefix))
 for(const name of [...['shop-host','shop-operations','shop-selection','shop-products'].flatMap(module=>['.js','.js.map','.d.ts'].map(suffix=>module+suffix)),'client.js','client.js.map']){
  const relative=prefix+name,source=path.join(root,'plugins/fs-platform-access/lib',name),candidate=path.join(out,'candidate',name)
  fs.copyFileSync(source,candidate)
  for(const [label,directory] of Object.entries({packaged,active})){
   const target=path.join(directory,relative),beforeHash=fs.existsSync(target)?digest(target):null
   if(beforeHash){const backup=path.join(out,'before',label,name);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(target,backup)}
   changes.push({label,name,target,candidate,beforeHash,candidateHash:digest(source)})
  }
  manifest.files[relative]=digest(source)
 }
 const previous=Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(manifestFile)).files).filter(([name])=>name.startsWith(prefix)))
 let inventories=manifest.workspacePreviousInventories??[],retired
 if(!inventories.some(map=>key(map)===key(previous))){
  if(inventories.length===16){
   const index=inventories.slice(0,-2).findLastIndex(unused)
   if(index<0)throw Error('No unused intermediate inventory can be archived')
   retired=inventories[index];inventories=inventories.filter((_,i)=>i!==index)
  }
  inventories=[...inventories,previous]
 }
 if(inventories.length>16)throw Error('Inventory bound exceeded')
 manifest.workspacePreviousInventories=inventories
 fs.copyFileSync(manifestFile,path.join(out,'manifest.before.json'))
 fs.writeFileSync(path.join(out,'manifest.candidate.json'),JSON.stringify(manifest,null,2))
 fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify({changes,protectedCode,manifestBefore:digest(manifestFile),manifestCandidate:digest(path.join(out,'manifest.candidate.json')),retiredInventory:retired,nativeShellChanged:false},null,2))
 console.log(JSON.stringify({status:'prepared',modules:4,files:changes.length,retiredUnusedInventory:!!retired,nativeShellChanged:false}))
}else if(process.argv[2]==='apply'){
 if(fs.existsSync(path.join(out,'installed.json')))throw Error('Candidate already applied')
 const candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json')))
 if(digest(manifestFile)!==candidate.manifestBefore||digest(path.join(out,'manifest.candidate.json'))!==candidate.manifestCandidate)throw Error('Manifest changed')
 for(const [label,directory] of Object.entries({packaged,active}))if(key(inventory(path.join(directory,prefix)))!==key(candidate.protectedCode[label]))throw Error('Concurrent code change')
 if(candidate.retiredInventory&&!unused(candidate.retiredInventory))throw Error('Inventory became active')
 for(const change of candidate.changes){
  if((fs.existsSync(change.target)?digest(change.target):null)!==change.beforeHash||digest(change.candidate)!==change.candidateHash)throw Error('Candidate changed')
 }
 for(const change of candidate.changes){
  const temporary=change.target+'.shop-recommendations-updating'
  fs.copyFileSync(change.candidate,temporary,fs.constants.COPYFILE_EXCL);fs.renameSync(temporary,change.target)
 }
 fs.copyFileSync(path.join(out,'manifest.candidate.json'),manifestFile)
 for(const [label,directory] of Object.entries({packaged,active})){
  const now=inventory(path.join(directory,prefix)),changed=new Set(candidate.changes.filter(c=>c.label===label).map(c=>c.name))
  for(const [name,hash] of Object.entries(candidate.protectedCode[label]))if(!changed.has(name)&&now[name]!==hash)throw Error('Protected code changed')
 }
 for(const change of candidate.changes)if(digest(change.target)!==change.candidateHash)throw Error('Install mismatch')
 fs.writeFileSync(path.join(out,'installed.json'),JSON.stringify({status:'installed',modules:4,files:candidate.changes.length,protectedCodeUnchanged:true,nativeShellChanged:false,userDataCopied:false},null,2))
 console.log('Installed only the reviewed SHOP recommendation patch')
}else if(process.argv[2]==='rollback'){
 const candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json')))
 if(![candidate.manifestBefore,candidate.manifestCandidate].includes(digest(manifestFile)))throw Error('Manifest changed since patch')
 for(const change of candidate.changes){
  const current=fs.existsSync(change.target)?digest(change.target):null
  if(current!==change.beforeHash&&current!==change.candidateHash)throw Error('Code changed since patch')
 }
 for(const change of candidate.changes){
  if(change.beforeHash)fs.copyFileSync(path.join(out,'before',change.label,change.name),change.target)
  else if(fs.existsSync(change.target)){
   const archived=path.join(out,'rollback-added',change.label,change.name)
   fs.mkdirSync(path.dirname(archived),{recursive:true});fs.renameSync(change.target,archived)
  }
 }
 fs.copyFileSync(path.join(out,'manifest.before.json'),manifestFile)
 fs.writeFileSync(path.join(out,'rollback.json'),JSON.stringify({status:'rolled-back',userDataChanged:false}))
 console.log('Restored the pre-patch SHOP modules and client bundle and manifest')
}else throw Error('Expected prepare, apply or rollback')
