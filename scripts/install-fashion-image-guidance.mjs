import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'output/fashion-image-guidance-20261014')
const directories={packaged:'D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha',active:'C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'}
const prefix='node_modules/@futurestaff/fs-platform-access/lib/',hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const manifestFile=path.join(directories.packaged,'release-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile)),changes=[]
manifest.workspacePreviousInventories??=[]
manifest.workspacePreviousInventories.push(Object.fromEntries(Object.entries(manifest.files).filter(([file])=>file.startsWith(prefix))))
fs.mkdirSync(out,{recursive:true})
for(const extension of ['.js','.js.map','.d.ts']){
 const relative=prefix+'chat'+extension,bytes=fs.readFileSync(path.join(root,'plugins/fs-platform-access/lib/chat'+extension))
 for(const [label,directory] of Object.entries(directories)){
  const target=path.join(directory,relative),backup=path.join(out,'before',label,relative)
  fs.mkdirSync(path.dirname(backup),{recursive:true});if(!fs.existsSync(backup))fs.copyFileSync(target,backup)
  changes.push({target,relative,beforeHash:hash(fs.readFileSync(target)),candidateHash:hash(bytes)})
 }
 manifest.files[relative]=hash(bytes)
}
fs.copyFileSync(manifestFile,path.join(out,'manifest.before.json'))
for(const change of changes){if(hash(fs.readFileSync(change.target))!==change.beforeHash)throw Error('Concurrent Host change');fs.copyFileSync(path.join(root,'plugins/fs-platform-access/lib',path.basename(change.relative)),change.target)}
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(out,'installed.json'),JSON.stringify({changes,nativeShellChanged:false},null,2))
console.log(JSON.stringify({status:'installed',files:3,nativeShellChanged:false}))
