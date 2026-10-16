import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
const root=path.resolve(import.meta.dirname,'..'), output=path.join(root,'output/shop-theme-desktop')
const require=createRequire(path.join(root,'desktop-shell/dsh-plugin-desktop/package.json')),asar=require('@electron/asar')
const installed='D:/FutureStaff Agent/resources/app.asar',tree=path.join(output,'app-tree-3')
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const baseline=JSON.parse(fs.readFileSync(path.join(output,'baseline.json')))
if(hash(fs.readFileSync(installed))!==baseline.installedAsar)throw Error('Installed desktop changed')
if(!fs.existsSync(tree)){fs.mkdirSync(tree);asar.extractAll(installed,tree)}
const native=path.join(output,'native-source/lib'),changed=[]
for(const file of fs.readdirSync(native).filter(name=>/\.(js|map)$/.test(name)&&!name.startsWith('client')&&!name.startsWith('preload'))){
 const target=path.join(tree,'lib',file),content=fs.readFileSync(path.join(native,file))
 const original='D:/FutureStaff Agent/resources/app.asar.unpacked/lib/'+file
 if(fs.existsSync(original)&&hash(fs.readFileSync(original))===hash(content))continue
 fs.writeFileSync(target,content);changed.push('lib/'+file)
}
const names=asar.listPackage(installed).map(name=>name.slice(1).replaceAll('\\','/'))
const unpacked=names.filter(name=>{const stat=asar.statFile(installed,path.normalize(name),false);return stat.unpacked&&!stat.files&&!stat.link})
const candidate=path.join(output,'app.candidate.asar')
const regular=names.filter(name=>{const stat=asar.statFile(installed,path.normalize(name),false);return !stat.files&&!stat.link})
if(unpacked.length!==regular.length)throw Error('This candidate supports only the installed fully-unpacked package')
await asar.createPackageWithOptions(tree,candidate,{unpack:'**/*'})
// All original assets outside the native Host bundles remain byte-identical.
for(const name of names){
 const stat=asar.statFile(installed,path.normalize(name),false)
 if(stat.files||changed.includes(name))continue
 if(stat.link){if(asar.statFile(candidate,path.normalize(name),false).link!==stat.link)throw Error('Protected desktop link changed: '+name);continue}
 if(hash(asar.extractFile(installed,path.normalize(name)))!==hash(asar.extractFile(candidate,path.normalize(name))))throw Error('Protected desktop asset changed: '+name)
}
fs.copyFileSync(installed,path.join(output,'app.before.asar'))
for(const relative of changed){
 const original='D:/FutureStaff Agent/resources/app.asar.unpacked/'+relative
 if(fs.existsSync(original)){const backup=path.join(output,'native-before',relative);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(original,backup)}
}
const packaged='D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha'
const manifestPath=path.join(packaged,'release-manifest.json'),before=fs.readFileSync(manifestPath),manifest=JSON.parse(before)
fs.writeFileSync(path.join(output,'release-manifest.before.json'),before)
const profileFiles={}
for(const name of ['plugin.js','shop.js','shop-host.js','agent-images.js','agent-images-host.js']){
 const relative='node_modules/@futurestaff/fs-platform-access/lib/'+name
 const content=fs.readFileSync(path.join(root,'plugins/fs-platform-access/lib',name))
 profileFiles[relative]={hash:hash(content),file:path.join(output,'profile',relative)}
 fs.mkdirSync(path.dirname(profileFiles[relative].file),{recursive:true});fs.writeFileSync(profileFiles[relative].file,content)
}
manifest.supersedes=[...new Set([...manifest.supersedes,hash(before)])]
manifest.workspacePreviousInventories=[...(manifest.workspacePreviousInventories??[]),Object.fromEntries(Object.entries(manifest.files).filter(([name])=>name.startsWith('node_modules/@futurestaff/fs-platform-access/lib/')))]
if(manifest.workspacePreviousInventories.length>16)throw Error('Previous inventory retention requires review')
manifest.files={...manifest.files,...Object.fromEntries(Object.entries(profileFiles).map(([name,item])=>[name,item.hash]))}
fs.writeFileSync(path.join(output,'release-manifest.candidate.json'),JSON.stringify(manifest,null,2))
fs.writeFileSync(path.join(output,'candidate.json'),JSON.stringify({asar:hash(fs.readFileSync(candidate)),baseline:baseline.installedAsar,changedNativeFiles:changed,profileFiles,protectedAssetsUnchanged:true,privateCandidate:true},null,2))
console.log(JSON.stringify({changedNativeFiles:changed,protectedAssetsUnchanged:true,privateCandidate:true}))
