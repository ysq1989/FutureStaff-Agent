import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'output/tool-image-skills-20261014')
const directories={packaged:'D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha',active:'C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'}
const prefix='node_modules/@futurestaff/fs-platform-access/lib/',hash=raw=>crypto.createHash('sha256').update(raw).digest('hex')
const files={};for(const name of ['chat','agents'])for(const ext of ['.js','.js.map','.d.ts'])files[prefix+name+ext]=fs.readFileSync(path.join(root,'plugins/fs-platform-access/lib',name+ext))
const manifestFile=path.join(directories.packaged,'release-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile)),changes=[]
fs.mkdirSync(out,{recursive:true})
for(const [relative,raw] of Object.entries(files))for(const [label,directory] of Object.entries(directories)){
 const target=path.join(directory,relative);changes.push({label,relative,target,beforeHash:hash(fs.readFileSync(target)),candidateHash:hash(raw)})
 const candidate=path.join(out,'candidate',relative);fs.mkdirSync(path.dirname(candidate),{recursive:true});fs.writeFileSync(candidate,raw)
}
const receipt={changes,nativeShellChanged:false,userDataCopied:false}
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(receipt,null,2))
if(process.argv[2]!=='apply'){console.log(JSON.stringify({status:'prepared',files:6}));process.exit(0)}
for(const c of changes){if(hash(fs.readFileSync(c.target))!==c.beforeHash)throw Error('Concurrent Host edit');const backup=path.join(out,'before',c.label,c.relative);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(c.target,backup)}
fs.copyFileSync(manifestFile,path.join(out,'manifest.before.json'))
manifest.workspacePreviousInventories??=[];manifest.workspacePreviousInventories.push(Object.fromEntries(Object.entries(manifest.files).filter(([p])=>p.startsWith(prefix))))
for(const [relative,raw] of Object.entries(files))manifest.files[relative]=hash(raw)
for(const c of changes)fs.copyFileSync(path.join(out,'candidate',c.relative),c.target)
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(out,'installed.json'),JSON.stringify(receipt,null,2))
console.log(JSON.stringify({status:'installed',files:6,nativeShellChanged:false}))
