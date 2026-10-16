import fs from 'node:fs'
import path from 'node:path'
import {zstdDecompressSync} from 'node:zlib'
const root='C:/Users/10089/.futurestaff/workspaces/production/6e7db441-c4ea-4f16-8261-9e1a5379b2ff/users/242ab148-8370-4d54-b6bb-da4bbee4a0f3/sessions'
const owner=fs.readdirSync(root).find(x=>x.includes('272dafc9-be91-4203-a696-e6013b43bb64'))
if(!owner)throw Error('Fashion session scope not found')
const files=fs.readdirSync(path.join(root,owner)).map(folder=>path.join(root,owner,folder,'session.jsonl.zstd')).filter(file=>fs.existsSync(file)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs)
for(const file of files.slice(0,2)){
 const raw=zstdDecompressSync(fs.readFileSync(file)).toString('utf8'),rows=[]
 function walk(value){
  if(!value||typeof value!=='object')return
  if(value.type==='tool-call'&&typeof value.name==='string'&&/image/.test(value.name)){
   let args={};try{args=JSON.parse(value.arguments)}catch{}
   rows.push({name:value.name,id:value.id,args:Object.fromEntries(['tool','requestId','size','imagePaths','imagePath','action'].filter(key=>key in args).map(key=>[key,args[key]]))})
  }
  if(value.type==='text'&&typeof value.text==='string'&&value.text.includes('AGENT_IMAGE_REQUEST'))rows.push({error:value.text.match(/AGENT_IMAGE_[A-Z_]+(?::[^\n]{0,100})?/)?.[0]})
  for(const member of Object.values(value))if(typeof member==='object')if(Array.isArray(member))member.forEach(walk);else walk(member)
 }
 for(const line of raw.split('\n'))if(line){try{walk(JSON.parse(line))}catch{}}
 console.log(JSON.stringify({session:path.basename(path.dirname(file)),records:raw.split('\n').length,events:rows.slice(-30)}))
}
