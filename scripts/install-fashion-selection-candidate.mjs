import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const root=path.resolve(import.meta.dirname,'..'),preview=process.argv.includes('--preview-zoom')||process.argv.includes('--original-export')||process.argv.includes('--gallery-fixed')||process.argv.includes('--preview')||process.argv.includes('--preview-fix')||process.argv.includes('--gallery'),heartbeat=process.argv.includes('--heartbeat')||process.argv.includes('--dedup'),budget=process.argv.includes('--view-budget'),out=path.join(root,'output/fashion-full-flow-20261014'+(process.argv.includes('--preview-zoom')?'/preview-zoom':process.argv.includes('--original-export')?'/original-export':process.argv.includes('--gallery-fixed')?'/gallery-fixed':process.argv.includes('--gallery')?'/gallery':process.argv.includes('--preview-fix')?'/preview-fix':preview?'/preview':budget?'/view-budget':process.argv.includes('--dedup')?'/dedup':heartbeat?'/heartbeat':process.argv.includes('--processing')?'/processing':process.argv.includes('--auto-download')?'/auto-download':''))
const directories={packaged:'D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha',active:'C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'}
const prefix='node_modules/@futurestaff/fs-platform-access/lib/',hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const manifestFile=path.join(directories.packaged,'release-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile)),changes=[]
fs.mkdirSync(out,{recursive:true})
const previous=Object.fromEntries(Object.entries(manifest.files).filter(([file])=>file.startsWith(prefix)))
const inventoryKey=value=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)))
const previousInventories=manifest.workspacePreviousInventories??[]
const nextInventories=previousInventories.some(value=>inventoryKey(value)===inventoryKey(previous))?previousInventories:[...previousInventories,previous]
if(nextInventories.length>16)throw Error('Profile inventory retention review is required before installing another patch')
const modules=process.argv.includes('--original-export')?['chat','agent-images-host','client','fashion-files']:preview?['chat','agent-images-host','client']:budget?['chat-images','fashion-files','agent-images']:heartbeat?['chat']:['agent-images','agent-images-host']
for(const name of modules)for(const ext of ['.js','.js.map','.d.ts']){
 if(name==='client'&&ext==='.d.ts')continue
 const relative=prefix+name+ext,bytes=fs.readFileSync(path.join(root,'plugins/fs-platform-access/lib',name+ext))
 for(const [label,directory] of Object.entries(directories)){
  const target=path.join(directory,relative),candidate=path.join(out,'candidate',relative)
  fs.mkdirSync(path.dirname(candidate),{recursive:true});fs.writeFileSync(candidate,bytes)
  changes.push({label,target,relative,beforeHash:hash(fs.readFileSync(target)),candidateHash:hash(bytes)})
 }
}
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify({changes,nativeShellChanged:false},null,2))
if(process.argv[2]!=='apply'){console.log(JSON.stringify({status:'prepared',files:changes.length/2}));process.exit(0)}
for(const c of changes){
 if(hash(fs.readFileSync(c.target))!==c.beforeHash)throw Error('Concurrent Host edit')
 const backup=path.join(out,'before',c.label,c.relative);fs.mkdirSync(path.dirname(backup),{recursive:true});if(!fs.existsSync(backup))fs.copyFileSync(c.target,backup)
}
if(!fs.existsSync(path.join(out,'manifest.before.json')))fs.copyFileSync(manifestFile,path.join(out,'manifest.before.json'))
manifest.workspacePreviousInventories=nextInventories
for(const c of changes){fs.copyFileSync(path.join(out,'candidate',c.relative),c.target);manifest.files[c.relative]=c.candidateHash}
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(out,'installed.json'),JSON.stringify({changes,nativeShellChanged:false},null,2))
console.log(JSON.stringify({status:'installed',files:changes.length/2,nativeShellChanged:false}))
