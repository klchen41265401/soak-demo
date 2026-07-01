import { useState, useEffect } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { useStore, useT, COLORS, PW } from './store.jsx'
import handoffMd from '../HANDOFF_soak_line.md?raw'
import LinePage from './pages/LinePage.jsx'
import OperatorPage from './pages/OperatorPage.jsx'
import MonitorPage from './pages/MonitorPage.jsx'

const TABS = [
  { key: 'line', k: 'nav.line' },
  { key: 'operator', k: 'nav.operator' },
  { key: 'monitor', k: 'nav.monitor' },
]

// 各分頁說明（點「?」開啟）
const HELP = {
  line: {
    title: { zh: '產線俯視圖 — 模擬 RFID 產線流動', en: 'Line Map — simulate the RFID line' },
    steps: [
      { zh: '這一頁模擬「把貼了 RFID 的 Runcard 抓過去、投進各站」，全部用拖曳完成。', en: 'This page simulates grabbing an RFID-tagged runcard and dropping it into each station — all by dragging.' },
      { zh: '① 從右側「Runcard 待處理」抓一張卡 → 拖到 Signin 簽入。', en: '① Grab a card from “Runcards” on the right → drop on Signin.' },
      { zh: '② 從 Signin 拖到 IQC 檢驗。流程單向，不能回頭或跳站。', en: '② From Signin drag to IQC. The flow is one-way — no going back or skipping.' },
      { zh: '③ 從酸種瓶把 酸 / PW 倒進 Tank 的 Acid/PW 區（酸種要和卡片規格相符；PW 槽需先泡過酸）。', en: '③ Pour an acid / PW bottle into a tank’s Acid/PW slot (acid must match the card; a PW tank needs a prior acid soak).' },
      { zh: '④ 把完成 Signin+IQC 的卡拖進 Tank 綠色區 → 開始計時（達標後不停，會超時轉紅）。', en: '④ Drop a Signin+IQC card into a tank’s green slot → timing starts (keeps running into overtime, turns red).' },
      { zh: '⑤ 倒數中被拉出＝異常，現場螢幕會叫人放回；最後拖進 HPW 結束、清除所有標記。', en: '⑤ Pulled out mid-timing = abnormal (operator screen asks to return it). Finish by dropping into HPW — clears all marks.' },
      { zh: 'Tank 可用左上握把 ⠿ 在 Soak Bench 1 / 2 之間拖動；移出區用來暫放被取出的卡。', en: 'Drag a tank between Soak Bench 1 / 2 by its ⠿ grip; the Removal Zone holds pulled-out cards.' },
      { zh: '拖曳時全畫面變暗，只有「可以放入的地方」會亮起引導你。', en: 'While dragging, the screen dims and only valid drop targets light up to guide you.' },
    ],
  },
  operator: {
    title: { zh: '現場螢幕 — Tank 前的作業顯示', en: 'Operator Screen — display in front of the tank' },
    steps: [
      { zh: '放在 Tank 前給作業員看零件狀態；資料由產線俯視圖即時帶入。', en: 'Sits in front of a tank for the operator; data comes live from the Line Map.' },
      { zh: '大字＝已計時時間；達到要求後進入「超時」並轉紅。', en: 'Big number = elapsed time; after the target it goes “over” and turns red.' },
      { zh: '「請放入 RC-xxx」＝排班提示該把哪一張卡放進來。', en: '“Please place RC-xxx” = schedule prompt for which card to load.' },
      { zh: '「未偵測到 Tag・請放回」＝有卡在倒數中被取出、還沒放回。', en: '“Tag not detected — return part” = a card was pulled mid-timing and not returned.' },
      { zh: '右欄顯示 Soak Bench / Tank / 液體 / 現在時間 與零件 PN/SN；可切換 Tank A/B、左右對調兩區。', en: 'Right column shows Bench / Tank / liquid / time and PN/SN; switch Tank A/B and swap the two panels.' },
    ],
  },
  monitor: {
    title: { zh: '監控站 — 即時監控牆', en: 'Monitor — live monitoring wall' },
    steps: [
      { zh: '以酸桶為單位的即時監控；上方切換要看的槽。', en: 'Per-tank live monitoring; switch the tank at the top.' },
      { zh: '表格顯示槽內零件的 要求 / 已計時 / 進度 / 狀態；超時與異常標紅。', en: 'The table shows required / elapsed / progress / status; overtime and abnormal are flagged red.' },
      { zh: '頂部橫幅彙總異常與「被取出未放回」的零件數。', en: 'The top banner summarizes abnormal and pulled-out-not-returned parts.' },
      { zh: '下方「出槽紀錄」記錄每次離槽結果（達標 / 超時 / 異常）。', en: 'The “Left-tank records” below log every removal result (pass / over / abnormal).' },
    ],
  },
}

export default function App() {
  const { state, dispatch } = useStore()
  const { t, lang } = useT()
  const [tab, setTab] = useState('line')
  const [activeId, setActiveId] = useState(null)
  const [showLog, setShowLog] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // toast 自動消失
  useEffect(() => {
    if (!state.toast) return
    const t = setTimeout(() => dispatch({ type: 'DISMISS_TOAST' }), 2600)
    return () => clearTimeout(t)
  }, [state.toast, dispatch])

  function onDragEnd(ev) {
    setActiveId(null)
    if (ev.over) dispatch({ type: 'DROP', activeId: String(ev.active.id), overId: String(ev.over.id) })
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(ev) => setActiveId(String(ev.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="app" data-theme={state.theme}>
        <header className="topnav">
          <div className="brand">
            <span className="brand-logo">⚗︎</span>
            <div>
              <div className="brand-title">{t('app.title')}</div>
              <div className="brand-sub">{t('app.sub')}</div>
            </div>
          </div>
          <nav className="tabs">
            {TABS.map((tb) => (
              <button key={tb.key} className={'tab' + (tab === tb.key ? ' active' : '')} onClick={() => setTab(tb.key)}>
                <span className="tab-zh">{t(tb.k)}</span>
              </button>
            ))}
          </nav>
          <button className="help-btn" onClick={() => setShowHelp(true)} title={t('btn.help')} aria-label="help">
            ?
          </button>
          <button className="rules-btn" onClick={() => setShowRules(true)}>
            📋 {t('btn.rules')}
          </button>
          <button className="log-btn" onClick={() => setShowLog(true)}>
            ▤ {t('btn.log')}{state.logs.length ? ` (${state.logs.length})` : ''}
          </button>
          <button className="theme-btn" onClick={() => dispatch({ type: 'TOGGLE_THEME' })} title="Day / Night">
            {state.theme === 'light' ? '🌙 ' + t('btn.toDark') : '☀ ' + t('btn.toLight')}
          </button>
          <button className="lang-btn" onClick={() => dispatch({ type: 'TOGGLE_LANG' })} title="中 / EN">
            🌐 {t('btn.lang')}
          </button>
          <button className="reset-btn" onClick={() => dispatch({ type: 'RESET' })} title={lang === 'zh' ? '重置所有頁面到最原始狀態' : 'Reset all pages to initial state'}>
            ⟲ {t('btn.reset')}
          </button>
        </header>

        {showLog && <LogPanel onClose={() => setShowLog(false)} />}
        {showHelp && <HelpModal tab={tab} onClose={() => setShowHelp(false)} />}
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}

        <main className={'page page-' + tab}>
          {tab === 'line' && <LinePage />}
          {tab === 'operator' && <OperatorPage />}
          {tab === 'monitor' && <MonitorPage />}
        </main>

        {activeId && <div className="drag-dim" />}

        {state.toast && (
          <div className={'toast ' + state.toast.type} key={state.toast.id}>
            <div className="toast-zh">{lang === 'zh' ? state.toast.msg : state.toast.en}</div>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId ? <DragGhost id={activeId} state={state} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function LogPanel({ onClose }) {
  const { state, dispatch } = useStore()
  const { t, lang } = useT()
  const [copied, setCopied] = useState(false)
  const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--')
  const esc = (s) => String(s).replace(/\|/g, '\\|')
  const rows = [...state.logs].reverse() // 新到舊

  // 純前端：產出好複製 / 好下載的 Markdown 表格（中英並列）
  function asMarkdown() {
    const head =
      `# ${t('log.title')}\n\n` +
      `| # | ${t('log.colTime')} | ${t('log.colType')} | 中文 | English |\n` +
      `|---|------|------|------|------|\n`
    const body = state.logs
      .map((e, i) => `| ${i + 1} | ${fmtTime(e.ts)} | ${e.type.toUpperCase()} | ${esc(e.zh)} | ${esc(e.en)} |`)
      .join('\n')
    return head + body + '\n'
  }

  async function copyMd() {
    const text = asMarkdown()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function downloadMd() {
    const blob = new Blob([asMarkdown()], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    a.href = url
    a.download = `soak-log-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="log-overlay" onClick={onClose}>
      <div className="log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="log-head">
          <div className="log-title">{t('log.title')} <span className="log-count">{t('log.count', { n: state.logs.length })}</span></div>
          <div className="log-actions">
            <button className="log-act" onClick={copyMd} disabled={!state.logs.length}>{copied ? '✓ ' + t('log.copied') : '⧉ ' + t('log.copy')}</button>
            <button className="log-act" onClick={downloadMd} disabled={!state.logs.length}>⭳ {t('log.download')}</button>
            <button className="log-act" onClick={() => dispatch({ type: 'CLEAR_LOGS' })} disabled={!state.logs.length}>🗑 {t('log.clear')}</button>
            <button className="log-act log-close" onClick={onClose}>✕ {t('log.close')}</button>
          </div>
        </div>
        <div className="log-body">
          {rows.length === 0 && <div className="log-empty">{t('log.empty')}</div>}
          {rows.length > 0 && (
            <table className="log-table">
              <thead>
                <tr>
                  <th className="lt-time">{t('log.colTime')}</th>
                  <th className="lt-type">{t('log.colType')}</th>
                  <th>{t('log.colMsg')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className={'log-' + e.type}>
                    <td className="lt-time">{fmtTime(e.ts)}</td>
                    <td className="lt-type"><span className={'log-badge log-badge-' + e.type}>{e.type}</span></td>
                    <td className="log-msg">{lang === 'zh' ? e.zh : e.en}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---- 迷你 Markdown 渲染（供業務規則交接文件在網頁內顯示）---- */
function mdInline(text, kb) {
  const nodes = []
  let rest = text
  let key = 0
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/
  let m
  while ((m = rest.match(re))) {
    if (m.index > 0) nodes.push(rest.slice(0, m.index))
    if (m[2] !== undefined) nodes.push(<b key={kb + '-' + key++}>{m[2]}</b>)
    else nodes.push(<code key={kb + '-' + key++}>{m[3]}</code>)
    rest = rest.slice(m.index + m[0].length)
  }
  if (rest) nodes.push(rest)
  return nodes
}

function renderMarkdown(md) {
  const lines = md.split('\n')
  const out = []
  let i = 0
  let k = 0
  const parseRow = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*$/.test(line)) { i++; continue }
    if (/^\s*---+\s*$/.test(line)) { out.push(<hr key={k++} />); i++; continue }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const L = h[1].length
      const Tag = 'h' + Math.min(L + 1, 6)
      out.push(<Tag key={k++} className={'md-h md-h' + L}>{mdInline(h[2], 'h' + k)}</Tag>)
      i++
      continue
    }
    if (/^\s*>/.test(line)) {
      const buf = []
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++ }
      out.push(<blockquote key={k++} className="md-quote">{mdInline(buf.join(' '), 'q' + k)}</blockquote>)
      continue
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++ }
      const header = parseRow(rows[0])
      const body = rows.slice(2).map(parseRow)
      out.push(
        <table key={k++} className="md-table">
          <thead><tr>{header.map((c, j) => <th key={j}>{mdInline(c, 'th' + k + j)}</th>)}</tr></thead>
          <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{mdInline(c, 't' + k + ri + j)}</td>)}</tr>)}</tbody>
        </table>,
      )
      continue
    }
    if (/^\s*[-•]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-•]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-•]\s+/, '')); i++ }
      out.push(<ul key={k++} className="md-ul">{items.map((it, j) => <li key={j}>{mdInline(it, 'li' + k + j)}</li>)}</ul>)
      continue
    }
    // paragraph
    const para = []
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*[|>#-]/.test(lines[i]) && !/^\s*•/.test(lines[i])) { para.push(lines[i]); i++ }
    out.push(<p key={k++} className="md-p">{mdInline(para.join(' '), 'p' + k)}</p>)
  }
  return out
}

function RulesModal({ onClose }) {
  const { t } = useT()
  return (
    <div className="log-overlay" onClick={onClose}>
      <div className="log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="log-head">
          <div className="log-title">📋 {t('btn.rules')}</div>
          <div className="log-actions">
            <button className="log-act log-close" onClick={onClose}>✕ {t('log.close')}</button>
          </div>
        </div>
        <div className="md-view">{renderMarkdown(handoffMd)}</div>
      </div>
    </div>
  )
}

function HelpModal({ tab, onClose }) {
  const { t, lang } = useT()
  const h = HELP[tab]
  return (
    <div className="log-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="log-head">
          <div className="log-title">❓ {h.title[lang]}</div>
          <div className="log-actions">
            <button className="log-act log-close" onClick={onClose}>✕ {t('log.close')}</button>
          </div>
        </div>
        <div className="help-body">
          <ol className="help-steps">
            {h.steps.map((s, i) => (
              <li key={i}>{s[lang]}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

function DragGhost({ id, state }) {
  const { t } = useT()
  const [kind, val] = id.split(':')
  const suffix = (l) => ' ' + (l === PW ? t('suffix.pw') : t('suffix.acid'))
  if (kind === 'rc') {
    const rc = state.runcards[val]
    return <div className="ghost rc-ghost">{rc?.id}</div>
  }
  if (kind === 'acid') {
    return (
      <div className="ghost acid-ghost" style={{ borderColor: COLORS[val] }}>
        <span className="acid-cap" style={{ background: COLORS[val] }} />
        {val}{suffix(val)}
      </div>
    )
  }
  if (kind === 'tankacid') {
    const liquid = state.tanks[val]?.acid
    if (!liquid) return null
    return (
      <div className="ghost acid-ghost" style={{ borderColor: COLORS[liquid] }}>
        <span className="acid-cap" style={{ background: COLORS[liquid] }} />
        {liquid}{suffix(liquid)}
      </div>
    )
  }
  if (kind === 'tank') {
    const tk = state.tanks[val]
    return <div className="ghost tank-ghost">⠿ {tk?.label}</div>
  }
  return null
}
