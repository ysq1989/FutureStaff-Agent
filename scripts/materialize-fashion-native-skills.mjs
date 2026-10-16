import {AgentWorkspaceStore} from '../plugins/fs-platform-access/lib/agents.js'
import fs from 'node:fs/promises'
import path from 'node:path'
const identity={environment:'production',tenantId:'6e7db441-c4ea-4f16-8261-9e1a5379b2ff',userId:'242ab148-8370-4d54-b6bb-da4bbee4a0f3'}
const root='C:/Users/10089/.futurestaff/workspaces/production/'+identity.tenantId+'/users/'+identity.userId
const store=new AgentWorkspaceStore(root,identity),agentId='272dafc9-be91-4203-a696-e6013b43bb64'
const snapshot=await store.snapshot(agentId)
if(!snapshot.files.some(f=>f.path==='skills/fashion-launch/SKILL.md'))throw Error('Platform fashion Skill absent from verified snapshot')
await store.materialize(snapshot,new AbortController().signal)
const file=path.join(await store.workspacePath(agentId),'.agents/skills/fashion-launch/SKILL.md')
console.log(JSON.stringify({status:'materialized',skillName:'fashion-launch',version:snapshot.version,frontmatterVerified:(await fs.readFile(file,'utf8')).includes('name: fashion-launch')}))
