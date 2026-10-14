/**
 * 探查：登录页结构 + 运行时声明 --arcoblue-6 的样式表顺序（判定 base.less 覆盖为何失效）
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = './private-local-path'
const PORT = 9334

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

class Session {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map()
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout ' + method)) } }, 30000)
    })
  }
  async evalJs(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
    return r.result.value
  }
}

async function main() {
  const profile = mkdtempSync(join(tmpdir(), 'tpl004b-'))
  const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
  process.on('exit', () => { try { child.kill() } catch {} })

  let ok = false
  for (let i = 0; i < 40 && !ok; i++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); ok = true } catch { await sleep(250) } }
  if (!ok) { console.error('no browser'); process.exit(1) }

  const page = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
  const s = new Session(ws)
  await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('DOM.enable'); await s.send('CSS.enable')

  await s.send('Page.navigate', { url: 'http://127.0.0.1:5173/system-config/master-data?group=finance&resource=currency' })
  await sleep(4000)

  console.log('=== 登录页探查 ===')
  console.log(JSON.stringify(await s.evalJs(`(() => ({
    url: location.href,
    text: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,400),
    inputs: [...document.querySelectorAll('input')].map(i=>({type:i.type, ph:i.placeholder, name:i.name, id:i.id, cls:String(i.className).slice(0,50)})),
    buttons: [...document.querySelectorAll('button')].map(b=>({text:(b.innerText||'').trim().slice(0,20), type:b.type, cls:String(b.className).slice(0,60), disabled:b.disabled})),
    links: [...document.querySelectorAll('a')].map(a=>({text:(a.innerText||'').trim().slice(0,20), href:a.getAttribute('href')}))
  }))()`), null, 1))

  console.log('\n=== 运行时样式表：谁声明了 --arcoblue-6 ===')
  console.log(JSON.stringify(await s.evalJs(`(() => {
    const out = [];
    const walk = (list, prefix) => {
      for (const sheet of Array.from(list)) {
        let rules; try { rules = sheet.cssRules } catch(e) { out.push({href: sheet.href, err:'CORS:'+e.name}); continue }
        if (!rules) continue
        for (const r of Array.from(rules)) {
          if (r.cssRules && r.selectorText === undefined) { walk(r.cssRules, prefix + '>' + (r.conditionText||r.cssText.slice(0,20))); continue }
          if (r.style && r.style.getPropertyValue('--arcoblue-6')) {
            out.push({ idx: out.length, selector: r.selectorText, arcoblue6: r.style.getPropertyValue('--arcoblue-6').trim(),
                       href: sheet.href ? sheet.href.split('/').slice(-1)[0] : 'inline', hasLink6: !!r.style.getPropertyValue('--link-6') })
          }
        }
      }
    };
    walk(document.styleSheets, '');
    const b = getComputedStyle(document.body);
    return { decls: out, order: out.map(x => x.href + ':' + x.selector),
             computed: { arcoblue6: b.getPropertyValue('--arcoblue-6').trim(), primary6: b.getPropertyValue('--primary-6').trim(), link6: b.getPropertyValue('--link-6').trim(), colorPrimary: b.getPropertyValue('--color-primary').trim() },
             sheetCount: document.styleSheets.length }
  })()`), null, 1))

  ws.close(); child.kill(); process.exit(0)
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })
