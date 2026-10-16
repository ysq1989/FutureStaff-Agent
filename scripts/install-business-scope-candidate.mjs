/** Scoped private desktop repair; no native shell, renderer, sessions or credentials copied. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const repository=path.resolve(import.meta.dirname,'..')
const packaged='D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha'
const active='C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'
const output=path.join(repository,'output/shop-business-isolation-20261013')
const manifestFile=path.join(packaged,'release-manifest.json')
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'))
const prefix='node_modules/@futurestaff/fs-platform-access/lib/'
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const previous=Object.fromEntries(Object.entries(manifest.files).filter(([file])=>file.startsWith(prefix)))
const changes=[]
for(const base of ['agents','agent-host','business-scope','chat','erp','erp-host','shop','shop-host','plugin','agent-images-host'])for(const suffix of ['.js','.js.map','.d.ts']){
 const relative=prefix+base+suffix,source=path.join(repository,'plugins/fs-platform-access/lib',base+suffix)
 if(!fs.existsSync(source))throw Error('Missing candidate '+relative)
 for(const [label,root] of [['packaged',packaged],['active',active]]){
  const target=path.join(root,relative)
  if(fs.existsSync(target)){
   const backup=path.join(output,'before',label,relative)
   fs.mkdirSync(path.dirname(backup),{recursive:true})
   if(!fs.existsSync(backup))fs.copyFileSync(target,backup)
  }
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target)
  changes.push({label,file:relative,hash:hash(target)})
 }
 manifest.files[relative]=hash(source)
}
fs.mkdirSync(output,{recursive:true})
if(!fs.existsSync(path.join(output,'release-manifest.before.json')))fs.copyFileSync(manifestFile,path.join(output,'release-manifest.before.json'))
manifest.workspacePreviousInventories??=[]
if(!manifest.workspacePreviousInventories.some(item=>JSON.stringify(item)===JSON.stringify(previous)))manifest.workspacePreviousInventories.push(previous)
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2))
fs.writeFileSync(path.join(output,'installed.json'),JSON.stringify({privateCandidate:true,userDataCopied:false,nativeShellChanged:false,changes},null,2))
console.log('Installed only reviewed business-scope Host files; user data and shell preserved')
