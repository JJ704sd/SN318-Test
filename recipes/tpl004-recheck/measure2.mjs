/**
 * UI-TPL-004 复核实测 v2：
 *  - 自动登录 Mock 账号后进入真实页面
 *  - 量测：表格正文/表头/链接/Tag/文字按钮 的计算色 + body 上的 Arco 变量实际值
 *  - 量测：hover 行、选中行 状态下的正文色与底色（步骤3）
 *  - 只读：仅点击登录、勾选行、鼠标移动；不提交任何表单
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = './private-local-path'
const PORT = 9335
const OUT = '.\\.work\\tpl004-recheck'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const TARGETS = [
  { id: 'T04-A-demo-list', url: 'http://127.0.0.1:5173/demo/list', note: 'UI-TPL-004 原验证对象：通用模板运单列表（目的地/重量/日期 + a-link）' },
  { id: 'T04-B-master-currency', url: 'http://127.0.0.1:5173/system-config/master-data?group=finance&resource=currency', note: '本轮用户指定页：基础配置-币种' },
  { id: 'T04-C-master-country', url: 'http://127.0.0.1:5173/system-config/master-data?group=location&resource=country', note: '基础配置-国家（含分页与长文本样例）' },
]

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

const SNAPSHOT = String.raw`(() => {
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const col = (el) => { const s = cs(el); return s ? s.color : null; };
  const bg = (el) => { const s = cs(el); return s ? s.backgroundColor : null; };
  const bd = (el) => { const s = cs(el); return s ? s.borderColor : null; };
  const out = { url: location.href, title: document.title, at: new Date().toISOString() };
  const b = cs(document.body);
  out.vars = {};
  if (b) for (const v of ['--color-text-title','--color-text-body','--color-primary','--arcoblue-6','--primary-6','--link-6']) {
    out.vars[v] = (b.getPropertyValue(v) || '').trim();
  }
  const table = document.querySelector('.arco-table');
  if (!table) { out.noTable = true; out.text = (document.body.innerText||'').replace(/\s+/g,' ').slice(0,200); return out; }
  out.headers = [...table.querySelectorAll('.arco-table-th')].map(th => ({
    title: (th.innerText||'').trim(), color: col(th), bg: bg(th),
  }));
  const rows = [...table.querySelectorAll('tbody .arco-table-tr:not(.arco-table-tr-empty)')];
  const row = rows[0];
  out.rowCount = rows.length;
  out.firstRow = row ? [...row.querySelectorAll('.arco-table-td')].map(td => {
    const cell = td.querySelector('.arco-table-cell');
    const kid = cell ? cell.firstElementChild : null;
    return {
      text: (td.innerText||'').trim().slice(0,30),
      tdColor: col(td),
      cellColor: col(cell),
      kidColor: col(kid),
      kidTag: kid ? kid.tagName + '.' + String(kid.className).slice(0,44) : null,
      bg: bg(td),
    };
  }) : [];
  out.links = [...document.querySelectorAll('.arco-link')].slice(0,10).map(a => ({
    text:(a.innerText||'').trim().slice(0,24), color: col(a), cls:String(a.className).slice(0,40)
  }));
  out.tags = [...document.querySelectorAll('.arco-tag')].slice(0,8).map(t => ({
    text:(t.innerText||'').trim().slice(0,16), color: col(t), bg: bg(t), border: bd(t)
  }));
  out.statusTags = [...document.querySelectorAll('[class*="status"],[class*="Status"]')]
    .filter(e => e.children.length === 0 && (e.innerText||'').trim())
    .slice(0,10).map(e => ({
      text:(e.innerText||'').trim().slice(0,16), cls:String(e.className).slice(0,56),
      color: col(e), bg: bg(e), border: bd(e)
    }));
  out.textButtons = [...document.querySelectorAll('button, .arco-btn-text, .arco-link')]
    .filter(e => /编辑|删除|停用|启用|详情|新增|查看/.test(e.innerText||''))
    .slice(0,10).map(e => ({ text:(e.innerText||'').trim().slice(0,12), color: col(e), cls:String(e.className).slice(0,56) }));
  out.primaryButtons = [...document.querySelectorAll('.arco-btn-primary')].slice(0,4).map(e => ({
    text:(e.innerText||'').trim().slice(0,12), color: col(e), bg: bg(e)
  }));
  // 泄漏扫描：页面上哪些元素的计算色仍是 Arco 默认主色 rgb(22,93,255)
  const LEAK = 'rgb(22, 93, 255)';
  const leak = {};
  for (const el of document.querySelectorAll('body *')) {
    const s = cs(el); if (!s) continue;
    const props = [];
    if (s.color === LEAK) props.push('color');
    if (s.backgroundColor === LEAK) props.push('background');
    if (s.borderTopColor === LEAK) props.push('border');
    if (s.outlineColor === LEAK) props.push('outline');
    if (!props.length) continue;
    const key = String(el.className || el.tagName).slice(0, 60);
    if (!leak[key]) leak[key] = { props: [...new Set(props)], count: 0, sample: (el.innerText||'').trim().slice(0,16) };
    leak[key].count++;
  }
  out.leak165DFF = leak;
  return out;
})()`

async function waitReady(s, timeoutMs = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const st = await s.evalJs(`(() => ({
      boot: !!document.querySelector('#app-bootstrap-loading'),
      rows: document.querySelectorAll('.arco-table-tr').length,
      login: !!document.querySelector('.login-panel__submit'),
      url: location.pathname + location.search
    }))()`)
    if (st.boot) { await sleep(400); continue }
    if (st.login) return { ok: false, reason: 'login', st }
    if (st.rows > 0) return { ok: true, st }
    await sleep(400)
  }
  return { ok: false, reason: 'timeout', st: null }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const profile = mkdtempSync(join(tmpdir(), 'tpl004c-'))
  const child = spawn(CHROME, ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
  process.on('exit', () => { try { child.kill() } catch {} })

  let ready = false
  for (let i = 0; i < 40 && !ready; i++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); ready = true } catch { await sleep(250) } }
  if (!ready) { console.error('no browser'); process.exit(1) }

  const page = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej) })
  const s = new Session(ws)
  await s.send('Page.enable'); await s.send('Runtime.enable')

  // 1) 登录一次（Mock 自动登录），后续复用同一浏览器上下文
  await s.send('Page.navigate', { url: 'http://127.0.0.1:5173/demo/list' })
  let r = await waitReady(s, 12000)
  let loginTrace = []
  if (r.reason === 'login') {
    const box = await s.evalJs(`(() => { const b=document.querySelector('.login-panel__submit'); const x=b.getBoundingClientRect(); return {x:x.x+x.width/2, y:x.y+x.height/2}; })()`)
    for (const type of ['mousePressed','mouseReleased']) {
      await s.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
    }
    await sleep(2500)
    loginTrace.push({ afterClick: await s.evalJs(`({url: location.pathname + location.search, txt:(document.body.innerText||'').replace(/\\s+/g,' ').slice(0,120)})`) })
    r = await waitReady(s, 20000)
    loginTrace.push({ ready: r.ok, st: r.st })
  }
  console.log('=== 登录 ===')
  console.log(JSON.stringify(loginTrace, null, 1))

  const all = []
  for (const t of TARGETS) {
    await s.send('Page.navigate', { url: t.url })
    await sleep(1500)
    let readyRes = await waitReady(s, 12000)
    if (!readyRes.ok && readyRes.reason === 'login') {
      // Mock 会话不跨整页导航保留：每页各自登录一次，登录后按 redirect 回到目标页
      const box = await s.evalJs(`(() => { const b=document.querySelector('.login-panel__submit'); const x=b.getBoundingClientRect(); return {x:x.x+x.width/2, y:x.y+x.height/2}; })()`)
      for (const type of ['mousePressed','mouseReleased']) {
        await s.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
      }
      await sleep(3000) // 登录后按 redirect 跳转，等页面稳定再判定（否则 waitReady 会立刻命中登录页）
      readyRes = await waitReady(s, 25000)
    }
    if (!readyRes.ok) {
      console.log(`\n${t.id}: 未就绪（${readyRes.reason}），跳过`)
      all.push({ id: t.id, url: t.url, note: t.note, blocked: readyRes.reason })
      continue
    }
    const base = await s.evalJs(SNAPSHOT)
    const shot1 = await s.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(OUT, `${t.id}.png`), Buffer.from(shot1.data, 'base64'))

    // 步骤3：hover 第一数据行 → 读底色与文字色
    const hoverPt = await s.evalJs(`(() => {
      const row = document.querySelector('tbody .arco-table-tr:not(.arco-table-tr-empty)');
      if (!row) return null; const x = row.getBoundingClientRect();
      return { x: x.x + 200, y: x.y + x.height/2 };
    })()`)
    let hover = null
    if (hoverPt) {
      await s.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hoverPt.x, y: hoverPt.y })
      await sleep(500)
      hover = await s.evalJs(`(() => {
        const cs=(e)=>e?getComputedStyle(e):null;
        const row=document.querySelector('.arco-table-tr:hover');
        if(!row) return {noHover:true};
        const td=row.querySelector('.arco-table-td');
        const link=row.querySelector('.arco-link');
        const tag=row.querySelector('.arco-tag')||row.querySelector('[class*="status"]');
        return { rowText:(row.innerText||'').replace(/\\s+/g,' ').slice(0,40),
                 tdBg: cs(td)?cs(td).backgroundColor:null, tdColor: cs(td)?cs(td).color:null,
                 linkColor: cs(link)?cs(link).color:null, tagColor: cs(tag)?cs(tag).color:null, tagBg: cs(tag)?cs(tag).backgroundColor:null };
      })()`)
      const shotH = await s.send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(OUT, `${t.id}-hover.png`), Buffer.from(shotH.data, 'base64'))
    }

    // 步骤3：勾选第一行 → 读选中态
    let selected = null
    const cb = await s.evalJs(`(() => {
      const box=document.querySelector('tbody .arco-table-tr:not(.arco-table-tr-empty) .arco-table-checkbox');
      if(!box) return null; const x=box.getBoundingClientRect();
      return { x:x.x+x.width/2, y:x.y+x.height/2 };
    })()`)
    if (cb) {
      for (const type of ['mousePressed','mouseReleased']) {
        await s.send('Input.dispatchMouseEvent', { type, x: cb.x, y: cb.y, button: 'left', clickCount: 1 })
      }
      await sleep(600)
      selected = await s.evalJs(`(() => {
        const cs=(e)=>e?getComputedStyle(e):null;
        const row=document.querySelector('.arco-table-tr-checked');
        if(!row) return {noSelected:true};
        const td=row.querySelector('.arco-table-td');
        const link=row.querySelector('.arco-link');
        const tag=row.querySelector('.arco-tag')||row.querySelector('[class*="status"]');
        return { rowText:(row.innerText||'').replace(/\\s+/g,' ').slice(0,40),
                 tdBg: cs(td)?cs(td).backgroundColor:null, tdColor: cs(td)?cs(td).color:null,
                 linkColor: cs(link)?cs(link).color:null, tagColor: cs(tag)?cs(tag).color:null };
      })()`)
      const shotS = await s.send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(OUT, `${t.id}-selected.png`), Buffer.from(shotS.data, 'base64'))
    }

    const rec = { id: t.id, url: t.url, note: t.note, measuredAt: new Date().toISOString(), base, hover, selected }
    all.push(rec)
    writeFileSync(join(OUT, `${t.id}.json`), JSON.stringify(rec, null, 2), 'utf8')

    console.log(`\n===== ${t.id} =====`)
    console.log('note      :', t.note)
    console.log('url       :', base.url)
    console.log('Arco vars :', JSON.stringify(base.vars))
    if (base.headers) console.log('表头      :', JSON.stringify(base.headers))
    if (base.firstRow) console.log('首行单元格:', JSON.stringify(base.firstRow))
    if (base.links?.length) console.log('a-link    :', JSON.stringify(base.links))
    if (base.tags?.length) console.log('arco-tag  :', JSON.stringify(base.tags))
    if (base.statusTags?.length) console.log('状态Tag   :', JSON.stringify(base.statusTags))
    if (base.textButtons?.length) console.log('文字按钮  :', JSON.stringify(base.textButtons))
    if (base.primaryButtons?.length) console.log('主按钮    :', JSON.stringify(base.primaryButtons))
    if (hover) console.log('hover态   :', JSON.stringify(hover))
    if (selected) console.log('选中态    :', JSON.stringify(selected))
  }

  writeFileSync(join(OUT, 'tpl004-measurements.json'), JSON.stringify(all, null, 2), 'utf8')
  console.log('\n输出:', OUT)
  child.kill(); process.exit(0)
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })
