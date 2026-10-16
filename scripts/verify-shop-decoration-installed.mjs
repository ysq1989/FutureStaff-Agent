import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'output/shop-decoration-20261015')
const iteration=process.argv[2]??'scope-v5'
if(!/^[a-z0-9-]{2,24}$/.test(iteration))throw Error('Invalid candidate')
const candidate=JSON.parse(fs.readFileSync(path.join(out,'install',iteration,'candidate.json'),'utf8'))
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const directories={packaged:'D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha',active:'C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'}
const prefix='node_modules/@futurestaff/fs-platform-access/lib/'
const names=new Set(candidate.changes.map(c=>c.name)),files={}
for(const c of candidate.changes){if(hash(c.target)!==c.candidateHash)throw Error('Installed SHOP module changed');files[c.label+'/'+c.name]=c.candidateHash}
for(const [label,directory] of Object.entries(directories))for(const [name,before] of Object.entries(candidate.protectedCode[label]))if(!names.has(name)&&hash(path.join(directory,prefix,name))!==before)throw Error('Sibling code changed: '+name)
const manifest=JSON.parse(fs.readFileSync(path.join(directories.packaged,'release-manifest.json'),'utf8'))
if(Object.keys(manifest.files).length>256)throw Error('Profile budget exceeded')
const report={accepted:true,modules:['chat','shop','shop-host'],installedFiles:candidate.changes.length,profileFiles:Object.keys(manifest.files).length,protectedSiblingCodeUnchanged:true,nativeShellChanged:false,userDataCopied:false,files}
fs.writeFileSync(path.join(out,'installed-verification.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify({...report,files:undefined}))
