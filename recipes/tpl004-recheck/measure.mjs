/**
 * UI-TPL-004 复核实测：独立 Chromium(CDP) 客户端量测表格正文色 / 链接色 / Tag 色。
 * 动机：内置 Browser 在本项目上 ESM 动态导入挂起（/src/mock/lmd.ts 永久 pending），
 *      用第二个客户端对照，区分「客户端故障」与「产品缺陷」。
 * 只读量测：不改 DOM、不改状态、不发写请求。
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = './private-local-path'
const PORT = 9333
const OUT = '.\\.work\\tpl004-recheck'

const TARGETS = [
  { id: 'master-currency', url: 'http://127.0.0.1:5173/system-config/master-data?group=finance&resource=currency' },
  { id: 'master-country', url: 'http://127.0.0.1:5173/system-config/master-data?group=location&resource=country' },
  { id: 'demo-list', url: 'http://127.0.0.1:5173/demo/list' },
]

// 页内只读量测脚本
const MEASURE = String.raw`(() => {
  const cs = (el) => getComputedStyle(el);
  const app = document.querySelector('#app');
  const out = {
    url: location.href,
    title: document.title,
    bootstrapLoading: !!document.querySelector('#app-bootstrap-loading'),
    appChildren: app ? app.children.length : 0,
    hasTable: !!document.querySelector('.arco-table'),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
  };
  const b = cs(document.body);
  out.bodyColor = b.color;
  out.vars = {};
  for (const v of ['--color-text-title','--color-text-body','--color-text-placeholder','--color-secondary','--color-primary',
                   '--arcoblue-5','--arcoblue-6','--arcoblue-7','--primary-6','--link-6','--color-link-1','--color-link-light-3',
                   '--color-border','--color-fill-2']) {
    out.vars[v] = (b.getPropertyValue(v) || '').trim();
  }
  const table = document.querySelector('.arco-table');
  if (table) {
    out.headers = [...table.querySelectorAll('.arco-table-th')].map(th => ({
      title: (th.innerText || '').trim(),
      color: cs(th).color,
      bg: cs(th).backgroundColor,
    }));
    const row = table.querySelector('.arco-table-tr:not(.arco-table-tr-empty)');
    out.row = row ? [...row.querySelectorAll('.arco-table-td')].map(td => {
      const cell = td.querySelector('.arco-table-cell');
      const inner = cell ? [...cell.children] : [];
      return {
        text: (td.innerText || '').trim().slice(0, 40),
        tdColor: cs(td).color,
        cellColor: cell ? cs(cell).color : null,
        innerColor: inner.length ? cs(inner[0]).color : null,
        innerTag: inner.length ? inner[0].tagName + '.' + String(inner[0].className).slice(0, 40) : null,
      };
    }) : [];
  }
  out.links = [...document.querySelectorAll('.arco-link')]
    .slice(0, 12)
    .map(a => ({ text: (a.innerText || '').trim().slice(0, 28), color: cs(a).color, cls: String(a.className).slice(0, 50) }));
  const anchors = [...document.querySelectorAll('a[href]')].slice(0, 8);
  out.anchors = anchors.map(a => ({ text: (a.innerText || '').trim().slice(0, 28), color: cs(a).color, cls: String(a.className).slice(0, 50) }));
  out.tags = [...document.querySelectorAll('.arco-tag')]
    .slice(0, 10)
    .map(t => ({ text: (t.innerText || '').trim().slice(0, 20), color: cs(t).color, bg: cs(t).backgroundColor, border: cs(t).borderColor }));
  out.statusTags = [...document.querySelectorAll('[class*="status-tag"], [class*="StatusTag"], [class*="by-status"]')]
    .slice(0, 6)
    .map(t => ({ text: (t.innerText || '').trim().slice(0, 20), cls: String(t.className).slice(0, 60), color: cs(t).color, bg: cs(t).backgroundColor }));
  out.textButtons = [...document.querySelectorAll('.arco-btn-text, .master-data-page__actions button, .master-data-page__actions a')]
    .slice(0, 10)
    .map(t => ({ text: (t.innerText || '').trim().slice(0, 20), color: cs(t).color, cls: String(t.className).slice(0, 60) }));
  return out;
})()`

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function cdpTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return res.json()
}

class Session {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error('CDP timeout: ' + method))
        }
      }, 30000)
    })
  }
  async evalJs(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('JS error: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
    return r.result.value
  }
}

async function waitMounted(s, label) {
  for (let i = 0; i < 40; i++) {
    const st = await s.evalJs(`(() => ({
      boot: !!document.querySelector('#app-bootstrap-loading'),
      rows: document.querySelectorAll('.arco-table-tr').length,
      appKids: (document.querySelector('#app')||{children:[]}).children.length,
      txt: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,120)
    }))()`)
    if (!st.boot && st.appKids > 0 && (st.rows > 0 || /基础配置|运单|模板/.test(st.txt))) {
      return { mounted: true, after: i, state: st }
    }
    await sleep(500)
  }
  const st = await s.evalJs(`(() => ({ boot: !!document.querySelector('#app-bootstrap-loading'), rows: document.querySelectorAll('.arco-table-tr').length, appKids: (document.querySelector('#app')||{children:[]}).children.length, txt: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,200) }))()`)
  return { mounted: false, after: 40, state: st }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const profile = mkdtempSync(join(tmpdir(), 'tpl004-'))
  const child = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=CalculateNativeWinOcclusion',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,900',
    'about:blank',
  ], { stdio: 'ignore' })

  const cleanup = () => { try { child.kill() } catch {} }
  process.on('exit', cleanup)

  let version = null
  for (let i = 0; i < 40; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break } catch { await sleep(250) }
  }
  if (!version) { console.error('chromium 未就绪'); cleanup(); process.exit(1) }
  console.log('browser:', version['Browser'])

  const results = []
  for (const t of TARGETS) {
    const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(t.url)}`, { method: 'PUT' })).json()
    const ws = new WebSocket(created.webSocketDebuggerUrl)
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
    const s = new Session(ws)
    await s.send('Page.enable')
    await s.send('Runtime.enable')

    let state = await waitMounted(s, t.id)
    if (!state.mounted) {
      await s.send('Page.navigate', { url: t.url })
      await sleep(1200)
      state = await waitMounted(s, t.id)
    }
    const measured = await s.evalJs(MEASURE)
    const shot = await s.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(OUT, `${t.id}.png`), Buffer.from(shot.data, 'base64'))

    const rec = { id: t.id, requestedUrl: t.url, mount: state, measured }
    results.push(rec)
    writeFileSync(join(OUT, `${t.id}.json`), JSON.stringify(rec, null, 2), 'utf8')

    console.log(`\n===== ${t.id} =====`)
    console.log('url        :', measured.url)
    console.log('mounted    :', state.mounted, `(after ${state.after} polls)`)
    console.log('hasTable   :', measured.hasTable, ' bootstrap:', measured.bootstrapLoading)
    if (measured.vars) {
      console.log('vars       :', JSON.stringify({
        'body': measured.vars['--color-text-body'],
        'title': measured.vars['--color-text-title'],
        'primary': measured.vars['--color-primary'],
        'arcoblue6': measured.vars['--arcoblue-6'],
        'primary6': measured.vars['--primary-6'],
        'link6': measured.vars['--link-6'],
      }))
    }
    if (measured.headers) console.log('headers    :', JSON.stringify(measured.headers))
    if (measured.row) console.log('first row  :', JSON.stringify(measured.row))
    if (measured.links?.length) console.log('a-link     :', JSON.stringify(measured.links))
    if (measured.anchors?.length) console.log('anchors    :', JSON.stringify(measured.anchors))
    if (measured.tags?.length) console.log('arco-tags  :', JSON.stringify(measured.tags))
    if (measured.statusTags?.length) console.log('statusTags :', JSON.stringify(measured.statusTags))
    if (measured.textButtons?.length) console.log('textBtns   :', JSON.stringify(measured.textButtons))
    ws.close()
  }

  writeFileSync(join(OUT, 'all-results.json'), JSON.stringify(results, null, 2), 'utf8')
  console.log('\n输出目录:', OUT)
  cleanup()
  process.exit(0)
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
