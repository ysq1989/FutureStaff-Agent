import {build} from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'..'),lib=path.join(root,'plugins/fs-platform-access/lib'),out=path.join(root,'output/shop-decoration-20261015/build')
fs.mkdirSync(out,{recursive:true})
await build({entryPoints:[path.join(lib,'chat.js')],outfile:path.join(out,'chat.js'),bundle:true,format:'esm',platform:'node',target:'es2022',sourcemap:true,plugins:[{name:'inline-shop-guidance-only',setup(b){b.onResolve({filter:/.*/},args=>args.kind==='entry-point'?undefined:args.path==='./shop-theme-guidance.js'?{path:path.join(lib,args.path)}:{path:args.path,external:true})}}]})
for(const file of ['chat.d.ts',...['shop','shop-host'].flatMap(name=>['.js','.js.map','.d.ts'].map(ext=>name+ext))])fs.copyFileSync(path.join(lib,file),path.join(out,file))
console.log('Prepared only chat and Shop Host modules; shared build files left unchanged')
