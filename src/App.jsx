import { useState, useEffect } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { useStore, useT, COLORS, PW } from './store.jsx'
import LinePage from './pages/LinePage.jsx'
import OperatorPage from './pages/OperatorPage.jsx'
import MonitorPage from './pages/MonitorPage.jsx'

const TABS = [
  { key: 'line', k: 'nav.line' },
  { key: 'operator', k: 'nav.operator' },
  { key: 'monitor', k: 'nav.monitor' },
]

export default function App() {
  const { state, dispatch } = useStore()
  const { t, lang } = useT()
  const [tab, setTab] = useState('line')
  const [activeId, setActiveId] = useState(null)
  const [showLog, setShowLog] = useState(false)
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
      <div className="app">
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
          <button className="log-btn" onClick={() => setShowLog(true)}>
            ▤ {t('btn.log')}{state.logs.length ? ` (${state.logs.length})` : ''}
          </button>
          <button className="lang-btn" onClick={() => dispatch({ type: 'TOGGLE_LANG' })} title="中 / EN">
            🌐 {t('btn.lang')}
          </button>
          <button className="reset-btn" onClick={() => dispatch({ type: 'RESET' })} title={lang === 'zh' ? '重置所有頁面到最原始狀態' : 'Reset all pages to initial state'}>
            ⟲ {t('btn.reset')}
          </button>
        </header>

        {showLog && <LogPanel onClose={() => setShowLog(false)} />}

        <main className="page">
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
  const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString('zh-TW', { hour12: false }) : '--:--:--')
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
    // val = tankId；找出該槽液體顏色
    let liquid = null
    for (const b of Object.values(state.benches))
      for (const tk of Object.values(b.tanks)) if (tk.id === val) liquid = tk.acid
    if (!liquid) return null
    return (
      <div className="ghost acid-ghost" style={{ borderColor: COLORS[liquid] }}>
        <span className="acid-cap" style={{ background: COLORS[liquid] }} />
        {liquid}{suffix(liquid)}
      </div>
    )
  }
  return null
}
