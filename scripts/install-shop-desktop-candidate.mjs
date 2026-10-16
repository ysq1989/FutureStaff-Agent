/** Install this private acceptance candidate; never copies user data or unrelated plugin code. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'output/shop-theme-desktop')
const candidate=JSON.parse(fs.readFileSync(path.join(output,'candidate.json')))
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const resources='D:/FutureStaff Agent/resources'
if(hash(path.join(resources,'app.asar'))!==candidate.baseline)throw Error('Installed desktop changed; do not overwrite')
if(hash(path.join(output,'app.candidate.asar'))!==candidate.asar)throw Error('Candidate changed')
const packaged=path.join(resources,'futurestaff-profile/profiles/futurestaff-alpha')
const active='C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'
const changes=[]
for(const directory of [packaged,active])for(const [relative,item] of Object.entries(candidate.profileFiles)){
 const target=path.join(directory,relative)
 const label=directory===packaged?'packaged':'active'
 if(fs.existsSync(target)){const backup=path.join(output,'profile-before',label,relative);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(target,backup)}
 changes.push({target,source:item.file,hash:item.hash})
}
for(const item of changes){if(hash(item.source)!==item.hash)throw Error('Profile candidate changed');fs.copyFileSync(item.source,item.target)}
fs.copyFileSync(path.join(output,'release-manifest.candidate.json'),path.join(packaged,'release-manifest.json'))
for(const relative of candidate.changedNativeFiles){
 const source=path.join(output,'app.candidate.asar.unpacked',relative),target=path.join(resources,'app.asar.unpacked',relative)
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target)
}
fs.copyFileSync(path.join(output,'app.candidate.asar'),path.join(resources,'app.asar'))
fs.writeFileSync(path.join(output,'installed.json'),JSON.stringify({installedAsar:hash(path.join(resources,'app.asar')),changedFiles:[...changes.map(item=>item.target),...candidate.changedNativeFiles],userDataCopied:false,privateCandidate:true},null,2))
console.log('Installed private Shop theme + Agent image Host candidate; user data preserved')
