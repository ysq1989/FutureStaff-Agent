import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'output/desktop-images-20261014')
const packaged='D:/FutureStaff Agent/resources/futurestaff-profile/profiles/futurestaff-alpha'
const active='C:/Users/10089/.dsh/profiles/fs-production-9f11710a5b44eda18b74dedfa2774d1040831e1d74ae35266d7fd93bacf06089'
const prefix='node_modules/@futurestaff/fs-platform-access/lib/'
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex')
const manifestFile=path.join(packaged,'release-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile))
const files={}
for(const name of ['chat','chat-images'])for(const extension of ['.js','.js.map','.d.ts'])files[prefix+name+extension]=fs.readFileSync(path.join(root,'plugins/fs-platform-access/lib',name+extension))
const old=fs.readFileSync(path.join(packaged,prefix+'plugin.js'),'utf8')
const anchor='agents ? agents.resolvePolicyBinding : undefined);'
if(old.split(anchor).length!==2)throw Error('Installed adapter anchor drifted')
files[prefix+'plugin.js']=Buffer.from(old.replace("import { FutureStaffChatAdapter } from './chat.js';","import { FutureStaffChatAdapter } from './chat.js';\nimport { createChatImageReader } from './chat-images.js';").replace(anchor,"agents ? agents.resolvePolicyBinding : undefined, agents ? createChatImageReader(() => ctx.get('attachments'), async (sessionId) => { await access.authorizeChat(); const binding = await agents.resolveBinding(sessionId); if (!binding) throw Error('AGENT_BINDING_REQUIRED'); return agents.store.workspacePath(binding.agentId); }) : undefined);"))
fs.mkdirSync(output,{recursive:true})
const changes=[]
for(const [relative,raw] of Object.entries(files))for(const [label,directory] of [['packaged',packaged],['active',active]]){
 const target=path.join(directory,relative),before=fs.existsSync(target)?hash(fs.readFileSync(target)):null
 changes.push({label,relative,target,beforeHash:before,candidateHash:hash(raw)})
 const candidate=path.join(output,'candidate',relative);fs.mkdirSync(path.dirname(candidate),{recursive:true});fs.writeFileSync(candidate,raw)
}
const receipt={changes,manifestBefore:hash(fs.readFileSync(manifestFile)),nativeShellChanged:false,userDataCopied:false}
fs.writeFileSync(path.join(output,'candidate.json'),JSON.stringify(receipt,null,2))
if(process.argv[2]!=='apply'){console.log(JSON.stringify({status:'prepared',files:Object.keys(files).length}));process.exit(0)}
for(const change of changes){
 const actual=fs.existsSync(change.target)?hash(fs.readFileSync(change.target)):null
 if(actual!==change.beforeHash)throw Error('Concurrent Host change')
 const backup=path.join(output,'before',change.label,change.relative);fs.mkdirSync(path.dirname(backup),{recursive:true})
 if(actual&&!fs.existsSync(backup))fs.copyFileSync(change.target,backup)
}
fs.copyFileSync(manifestFile,path.join(output,'release-manifest.before.json'))
manifest.workspacePreviousInventories??=[]
manifest.workspacePreviousInventories.push(Object.fromEntries(Object.entries(manifest.files).filter(([p])=>p.startsWith(prefix))))
for(const [relative,raw] of Object.entries(files))manifest.files[relative]=hash(raw)
for(const change of changes)fs.copyFileSync(path.join(output,'candidate',change.relative),change.target)
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2))
fs.writeFileSync(path.join(output,'installed.json'),JSON.stringify(receipt,null,2))
console.log(JSON.stringify({status:'installed',files:Object.keys(files).length,nativeShellChanged:false,userDataCopied:false}))
