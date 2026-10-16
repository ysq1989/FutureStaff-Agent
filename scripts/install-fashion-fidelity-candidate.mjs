import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const root=path.resolve(import.meta.dirname,'..'),iteration=process.argv.find(value=>value.startsWith('--iteration='))?.slice(12),prefix='node_modules/@futurestaff/fs-platform-access/lib/'
if(iteration&&!/^[a-z0-9-]{3,40}$/.test(iteration))throw Error('Invalid reviewed iteration')
const retireBefore=process.argv.find(value=>value.startsWith('--retire-before='))?.slice(16)
if(retireBefore&&!/^[a-z0-9-]{3,40}$/.test(retireBefore))throw Error('Invalid retention source')
const out=path.join(root,'output/fashion-fidelity-20261014',iteration??'')
const directories={packaged:'D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha',active:'C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'}
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),manifestFile=path.join(directories.packaged,'release-manifest.json'),manifestBytes=fs.readFileSync(manifestFile),manifest=JSON.parse(manifestBytes)
const key=map=>JSON.stringify(Object.entries(map).sort(([a],[b])=>a.localeCompare(b)))
const before=Object.fromEntries(Object.entries(manifest.files).filter(([name])=>name.startsWith(prefix)))
let inventories=manifest.workspacePreviousInventories??[]
let retired
if(!inventories.some(map=>key(map)===key(before))&&inventories.length===16){
 const old=JSON.parse(fs.readFileSync(retireBefore?path.join(root,'output/fashion-fidelity-20261014',retireBefore,'manifest.before.json'):path.join(root,iteration?'output/fashion-fidelity-20261014/manifest.before.json':'output/fashion-full-flow-20261014/preview-zoom/manifest.before.json')))
 retired=Object.fromEntries(Object.entries(old.files).filter(([name])=>name.startsWith(prefix)))
 if(!inventories.some(map=>key(map)===key(retired)))throw Error('Retention candidate absent')
 for(const name of fs.readdirSync('C:/Users/10089/.dsh/profiles').filter(name=>/^fs-(dev|production)-[a-f0-9]{64}$/.test(name))){
  const profile=path.join('C:/Users/10089/.dsh/profiles',name)
  if(fs.lstatSync(profile).isSymbolicLink())throw Error('Linked profile')
  if(Object.entries(retired).every(([name,sha])=>{const file=path.join(profile,name);return fs.existsSync(file)&&fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink()&&digest(fs.readFileSync(file))===sha}))throw Error('Retired inventory still active')
 }
 inventories=inventories.filter(map=>key(map)!==key(retired))
}
if(!inventories.some(map=>key(map)===key(before)))inventories=[...inventories,before]
if(inventories.length>16)throw Error('Retention bound exceeded')
const changes=[]
for(const module of ['agent-images','agent-images-host','fashion-fidelity','client'])for(const ext of module==='client'?['.js','.js.map']:['.js','.js.map','.d.ts']){
 const name=prefix+module+ext,bytes=fs.readFileSync(path.join(root,'plugins/fs-platform-access/lib',module+ext)),candidate=path.join(out,'candidate',name)
 fs.mkdirSync(path.dirname(candidate),{recursive:true});fs.writeFileSync(candidate,bytes)
 for(const [label,profile] of Object.entries(directories)){
  const target=path.join(profile,name),relative=path.relative(fs.realpathSync(profile),fs.realpathSync(path.dirname(target)))
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Candidate escapes profile')
  if(fs.existsSync(target)&&(!fs.lstatSync(target).isFile()||fs.lstatSync(target).isSymbolicLink()))throw Error('Invalid code target')
  changes.push({label,name,target,candidate,beforeHash:fs.existsSync(target)?digest(fs.readFileSync(target)):null,candidateHash:digest(bytes)})
 }
}
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify({changes,retiredInventory:retired,nativeShellChanged:false},null,2))
if(process.argv[2]!=='apply'){console.log(JSON.stringify({status:'prepared',files:changes.length/2}));process.exit(0)}
if(fs.existsSync(path.join(out,'installed.json')))throw Error('Candidate already installed; prepare a distinct reviewed iteration')
if(digest(fs.readFileSync(manifestFile))!==digest(manifestBytes))throw Error('Manifest changed')
for(const item of changes){
 if((fs.existsSync(item.target)?digest(fs.readFileSync(item.target)):null)!==item.beforeHash)throw Error('Concurrent code change')
 if(item.beforeHash){const backup=path.join(out,'before',item.label,item.name);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(item.target,backup)}
}
fs.writeFileSync(path.join(out,'manifest.before.json'),manifestBytes)
for(const item of changes){fs.copyFileSync(item.candidate,item.target);manifest.files[item.name]=item.candidateHash}
manifest.workspacePreviousInventories=inventories
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2))
fs.writeFileSync(path.join(out,'installed.json'),JSON.stringify({changes,nativeShellChanged:false},null,2))
console.log(JSON.stringify({status:'installed',files:changes.length/2,inventories:inventories.length,nativeShellChanged:false}))
