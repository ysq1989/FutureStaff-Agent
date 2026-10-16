import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=process.argv[2];
if(!source||!path.isAbsolute(source))throw Error('Absolute GEO source directory required');
const root=fileURLToPath(new URL('../',import.meta.url));
const metadata=JSON.parse(await readFile(path.join(source,'package.json'),'utf8'));
if(metadata.name!=='futurestaff-geo')throw Error('Unexpected source repository');
const files=['packages/core/local-publication.ts','packages/core/publication-fingerprint.ts','packages/core/content.ts','packages/core/content-types.ts','packages/core/errors.ts','packages/adapters/publication-executor.ts','packages/local-publisher/journal.ts','packages/local-publisher/runner.ts'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestPath=path.join(root,'publishing-source-manifest.json');
let previous={files:{}};
try{previous=JSON.parse(await readFile(manifestPath,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
const pending=[];
for(const file of files){
 const bytes=await readFile(path.join(source,file));
 const target=path.join(root,'publishing-source',file);
 try{const current=await readFile(target);if(sha(current)!==previous.files[file]&&sha(current)!==sha(bytes))throw Error(`Preserve edited publishing source: ${file}`)}catch(error){if(error.code!=='ENOENT')throw error}
 pending.push({file,target,bytes});
}
for(const item of pending){await mkdir(path.dirname(item.target),{recursive:true});await writeFile(item.target,item.bytes)}
await writeFile(manifestPath,JSON.stringify({schemaVersion:1,source:'FutureStaff GEO',status:'Uncommitted reviewed source snapshot; not a deployed release',version:metadata.version,files:Object.fromEntries(pending.map(item=>[item.file,sha(item.bytes)]))},null,2)+'\n');
console.log(`Pinned ${pending.length} GEO publication files; legacy source manifest unchanged.`);
