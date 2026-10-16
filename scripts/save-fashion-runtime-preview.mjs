import {saveFashionImage} from '../plugins/fs-platform-access/lib/fashion-files.js'
import fs from 'node:fs/promises'
const root='C:/Users/10089/.futurestaff/workspaces/production/6e7db441-c4ea-4f16-8261-9e1a5379b2ff/users/242ab148-8370-4d54-b6bb-da4bbee4a0f3/agents/272dafc9-be91-4203-a696-e6013b43bb64/workspace'
const requestId='41c277a8-0e0f-57b6-ac0e-cad20d9dedb6'
const output=await saveFashionImage(root,requestId,await fs.readFile('D:/项目/FutureStaff-platform/output/fashion-runtime-20261014/preview.png'))
console.log(JSON.stringify({requestId,path:output,draft:true,automaticPublishing:false}))
