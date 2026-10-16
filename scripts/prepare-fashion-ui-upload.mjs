import fs from 'node:fs'
const source='C:/Users/10089/.futurestaff/workspaces/production/6e7db441-c4ea-4f16-8261-9e1a5379b2ff/users/242ab148-8370-4d54-b6bb-da4bbee4a0f3/agents/272dafc9-be91-4203-a696-e6013b43bb64/workspace/fashion-input/98bb42bf206538b32faaf3e6b33e17f373468436bf63de42488aa5fd18e7f735.png'
const content=fs.readFileSync(source).toString('base64')
const code=`async page => {
 await page.locator('[contenteditable=true]').click();
 await page.evaluate(encoded=>{
  const raw=Uint8Array.from(atob(encoded),x=>x.charCodeAt(0));
  const files=new DataTransfer();files.items.add(new File([raw],'fashion-e2e-dress.png',{type:'image/png'}));
  document.querySelector('[contenteditable=true]').dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:files}));
 },${JSON.stringify(content)});
}`
fs.writeFileSync('output/fashion-full-flow-20261014/upload-dress.playwright.js',code)
console.log('Prepared UI paste of the authorized garment image')
