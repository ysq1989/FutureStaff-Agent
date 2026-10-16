import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const root=path.resolve(import.meta.dirname,'..'),file='D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha/release-manifest.json'
const prefix='node_modules/@futurestaff/fs-platform-access/lib/',manifest=JSON.parse(fs.readFileSync(file))
const next=process.argv.includes('--next')
const processing=process.argv.includes('--processing')
const dedup=process.argv.includes('--dedup')
const budget=process.argv.includes('--view-budget')
const preview=process.argv.includes('--preview-zoom')||process.argv.includes('--original-export')||process.argv.includes('--gallery-fixed')||process.argv.includes('--preview')||process.argv.includes('--preview-fix')||process.argv.includes('--gallery')
const before=JSON.parse(fs.readFileSync(path.join(root,process.argv.includes('--preview-zoom')?'output/fashion-full-flow-20261014/original-export/manifest.before.json':process.argv.includes('--original-export')?'output/fashion-full-flow-20261014/gallery-fixed/manifest.before.json':process.argv.includes('--gallery-fixed')?'output/fashion-full-flow-20261014/gallery/manifest.before.json':process.argv.includes('--gallery')?'output/fashion-full-flow-20261014/preview-fix/manifest.before.json':process.argv.includes('--preview-fix')?'output/fashion-full-flow-20261014/preview/manifest.before.json':preview?'output/fashion-full-flow-20261014/view-budget/manifest.before.json':budget?'output/fashion-release-20261014/release-manifest.before.json':dedup?'output/tool-image-skills-20261014/manifest.before.json':processing?'output/fashion-full-flow-20261014/heartbeat/manifest.before.json':next?'output/fashion-full-flow-20261014/manifest.before.json':'output/fashion-image-guidance-20261014/manifest.before.json')))
const obsolete=Object.fromEntries(Object.entries(before.files).filter(([name])=>name.startsWith(prefix)))
const key=value=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)))
const index=manifest.workspacePreviousInventories.findIndex(value=>key(value)===key(obsolete))
if(index<0||manifest.workspacePreviousInventories.length!==((next||processing||dedup||budget||preview)?16:17))throw Error('Retention candidate drifted; review required')
const profiles='C:/Users/10089/.dsh/profiles'
for(const name of fs.readdirSync(profiles).filter(name=>/^fs-(dev|production)-[a-f0-9]{64}$/.test(name))){
 const directory=path.join(profiles,name)
 if(fs.lstatSync(directory).isSymbolicLink())throw Error('Linked Profile; refuse inventory retirement')
 const matches=Object.entries(obsolete).every(([relative,digest])=>{
  const target=path.join(directory,relative)
  return fs.existsSync(target)&&fs.lstatSync(target).isFile()&&!fs.lstatSync(target).isSymbolicLink()&&crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')===digest
 })
 if(matches)throw Error('An installed Profile still uses this intermediate inventory')
}
const out=path.join(root,'output/fashion-full-flow-20261014/'+(process.argv.includes('--preview-zoom')?'preview-zoom-retention':process.argv.includes('--original-export')?'original-export-retention':process.argv.includes('--gallery-fixed')?'gallery-fixed-retention':process.argv.includes('--gallery')?'gallery-retention':process.argv.includes('--preview-fix')?'preview-fix-retention':preview?'preview-retention':budget?'view-budget-retention':dedup?'dedup-retention':processing?'processing-retention':next?'auto-download-retention':'heartbeat'));fs.mkdirSync(out,{recursive:true})
fs.copyFileSync(file,path.join(out,'manifest.inventory-retention.before.json'))
fs.writeFileSync(path.join(out,'retired-intermediate-inventory.json'),JSON.stringify({reason:'Unpublished intermediate test code; no installed Profile matches; bounded retention review',inventory:obsolete},null,2))
manifest.workspacePreviousInventories.splice(index,1)
if(manifest.workspacePreviousInventories.length>16)throw Error('Bound not satisfied')
fs.writeFileSync(file,JSON.stringify(manifest,null,2))
console.log(JSON.stringify({status:'retained',inventories:manifest.workspacePreviousInventories.length,currentCodeChanged:false,userDataChanged:false,archived:1}))
