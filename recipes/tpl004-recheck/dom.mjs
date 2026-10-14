import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const CHROME='./private-local-path'
const PORT=9336
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
class S{constructor(ws){this.ws=ws;this.id=0;this.p=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&this.p.has(m.id)){const{resolve,reject}=this.p.get(m.id);this.p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result)}})}
send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.p.has(id)){this.p.delete(id);rej(new Error('timeout'))}},30000)})}
async js(x){const r=await this.send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,300));return r.result.value}}
const profile=mkdtempSync(join(tmpdir(),'t04d-'))
const child=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run',`--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,'--window-size=1440,900','about:blank'],{stdio:'ignore'})
process.on('exit',()=>{try{child.kill()}catch{}})
for(let i=0;i<40;i++){try{await fetch(`http://127.0.0.1:${PORT}/json/version`);break}catch{await sleep(250)}}
const pg=await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json()
const ws=new WebSocket(pg.webSocketDebuggerUrl)
await new Promise((r,j)=>{ws.addEventListener('open',r);ws.addEventListener('error',j)})
const s=new S(ws); await s.send('Page.enable'); await s.send('Runtime.enable')
await s.send('Page.navigate',{url:'http://127.0.0.1:5173/system-config/master-data?group=finance&resource=currency'})
await sleep(4000)
let st=await s.js(`({login:!!document.querySelector('.login-panel__submit'), rows:document.querySelectorAll('.arco-table-tr').length})`)
if(st.login){const b=await s.js(`(()=>{const x=document.querySelector('.login-panel__submit').getBoundingClientRect();return{x:x.x+x.width/2,y:x.y+x.height/2}})()`)
for(const t of ['mousePressed','mouseReleased'])await s.send('Input.dispatchMouseEvent',{type:t,x:b.x,y:b.y,button:'left',clickCount:1})
await sleep(3500)}
console.log(JSON.stringify(await s.js(`(()=>{
  const tbl=document.querySelector('.arco-table');
  const chain=[];
  let el=tbl.querySelector('.arco-table-tr');
  while(el && el!==document.body){ chain.push(el.tagName+'.'+String(el.className).slice(0,70)); el=el.parentElement; }
  const trs=[...document.querySelectorAll('.arco-table-tr')].map(t=>({cls:String(t.className).slice(0,60), parent:String(t.parentElement.className).slice(0,50), tds:t.querySelectorAll('.arco-table-td').length}));
  return {chain, trCount:trs.length, trs:trs.slice(0,6)};
})()`),null,1))
child.kill(); process.exit(0)
