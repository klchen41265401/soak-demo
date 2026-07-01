import { useStore, useT, allTanks, COLORS, PW } from '../store.jsx'

const fmt = (s) => {
  if (s == null) return '--:--'
  s = Math.max(0, Math.round(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString('zh-TW', { hour12: false }) : '--:--:--')
const NEAR = 8

export default function MonitorPage() {
  const { state } = useStore()
  const { t } = useT()
  const tanks = allTanks(state)
  const abnormalCount = tanks.filter((t) => t.abnormal).length
  const pulledCount = Object.values(state.runcards).filter((r) => r.abnormal && !r.done && !state.tanks[r.location]).length

  return (
    <div className="mon">
      <div className="mon-top">
        <div className="mon-brand">
          <span className="mon-logo">⚗︎</span>
          <div>
            <h1>{t('mon.title')}</h1>
            <div className="mon-sub">{t('mon.sub')}</div>
          </div>
        </div>
        <div className="mon-pill">
          <span className="mon-dot" /> {t('mon.connected')}
          <span className="mon-pill-sep" /> {t('mon.now')} <b className="mono">{clock(state.nowTs)}</b>
        </div>
      </div>

      {(abnormalCount > 0 || pulledCount > 0) && (
        <div className="mon-banner">
          {abnormalCount > 0 && <span>⚠ <b>{abnormalCount}</b> {t('mon.bannerAbn')}</span>}
          {pulledCount > 0 && <span>{abnormalCount > 0 ? '　／　' : '⚠ '}<b>{pulledCount}</b> {t('mon.bannerPulled')}</span>}
        </div>
      )}

      {/* 所有酸槽一次看 */}
      <div className="mon-tanks">
        {tanks.map((tk) => <MonTank key={tk.id} tank={tk} />)}
      </div>

      {/* 出槽紀錄 */}
      <div className="mon-card">
        <div className="mon-subhead">
          <h2>{t('mon.records')}</h2>
          <span className="mon-count">{state.records.length}{t('mon.recUnit')}</span>
        </div>
        <table className="mon-tbl">
          <thead>
            <tr>
              <th>{t('mon.th.runcard')}</th><th>{t('mon.th.pnsn')}</th><th>{t('mon.th.liquid')}</th><th>{t('mon.th.req')}</th>
              <th>{t('mon.th.actual')}</th><th>{t('mon.th.result')}</th><th>{t('mon.th.outTime')}</th>
            </tr>
          </thead>
          <tbody>{state.records.map((r) => <RecordRow key={r.id} r={r} />)}</tbody>
        </table>
        {state.records.length === 0 && <div className="mon-empty">{t('mon.noRec')}</div>}
      </div>

      <div className="mon-foot">{t('mon.foot')}</div>
    </div>
  )
}

function MonTank({ tank }) {
  const { state } = useStore()
  const { t } = useT()
  const bench = state.benches[tank.benchId]
  const rc = tank.runcardId ? state.runcards[tank.runcardId] : null
  const total = tank.totalSec || 0
  const elapsed = tank.elapsedSec || 0
  const remaining = Math.max(0, total - elapsed)
  const overtime = Math.max(0, elapsed - total)
  const over = tank.status === 'over'
  const done = tank.status === 'done'
  const pct = total ? Math.min(100, (elapsed / total) * 100) : 0
  const acidColor = tank.acid ? COLORS[tank.acid] : '#5c748f'

  // 被取出未放回？
  const pulled = !rc && Object.values(state.runcards).find((r) => r.abnormal && !r.done && r.pulledFromTank === tank.id && !state.tanks[r.location])

  let cls = 'p-soak', txt = t('mon.st.soaking')
  if (tank.abnormal) { cls = 'p-over'; txt = t('mon.st.abnormal') }
  else if (over) { cls = 'p-over'; txt = t('mon.st.over') }
  else if (done) { cls = 'p-done'; txt = t('mon.st.done') }
  else if (remaining <= NEAR) { cls = 'p-near'; txt = t('mon.st.near') }
  const alert = tank.abnormal || over || !!pulled

  return (
    <div className={'mon-tk' + (alert ? ' alert' : '')}>
      <div className="mon-tk-head">
        <span className="mon-tk-acid" style={{ color: acidColor, borderColor: acidColor }}>
          {tank.acid ? (tank.acid === PW ? 'PW' : tank.acid) : '—'}
        </span>
        <span className="mon-tk-name">{bench.name} · {tank.label}</span>
      </div>

      {rc ? (
        <div className="mon-tk-body">
          <div className="mon-tk-rc">{rc.id}</div>
          <div className="mon-tk-pnsn">{rc.pn} · {rc.sn}</div>
          <div className="mon-tk-times">
            <span className="dim">{t('mon.th.req')} {fmt(total)}</span>
            <span className={over ? 'over' : done ? 'ok' : ''}>{t('mon.th.elapsed')} {fmt(elapsed)}{over ? ` (+${fmt(overtime)})` : ''}</span>
          </div>
          <div className="mon-bar"><div className={'mon-fill' + (over ? ' over' : done ? ' done' : '')} style={{ width: pct + '%' }} /></div>
          <div className="mon-tk-foot"><span className={'mon-pillst ' + cls}>{txt}</span></div>
        </div>
      ) : pulled ? (
        <div className="mon-tk-empty alert">⚠ {t('mon.st.abnormal')} · {pulled.id}</div>
      ) : (
        <div className="mon-tk-empty">{tank.acid ? t('mon.empty') : t('tank.dropLiquid')}</div>
      )}
    </div>
  )
}

function RecordRow({ r }) {
  const { t } = useT()
  const map = {
    abnormal: { cls: 'r-over', txt: t('mon.res.abnormal') },
    over: { cls: 'r-over', txt: t('mon.res.over') },
    pass: { cls: 'r-pass', txt: t('mon.res.pass') },
    rinse: { cls: 'r-pass', txt: t('mon.res.rinse') },
  }
  const m = map[r.result] || { cls: '', txt: r.result }
  return (
    <tr>
      <td data-l="Runcard"><span className="mon-rc">{r.rc}</span></td>
      <td data-l="PN/SN"><div className="mon-pnsn"><div>{r.pn}</div><div className="dim">{r.sn}</div></div></td>
      <td data-l="Liquid"><span className="mon-acidv">{r.acid === PW ? 'PW' : r.acid || '—'}</span></td>
      <td data-l="Req"><span className="mon-num">{fmt(r.reqSec)}</span></td>
      <td data-l="Actual"><span className="mon-num">{fmt(r.actualSec)}</span>{r.overtimeSec > 0 ? <span className="mon-ot"> +{fmt(r.overtimeSec)}</span> : null}</td>
      <td data-l="Result"><span className={'mon-res ' + m.cls}>{m.txt}</span></td>
      <td data-l="Out"><span className="dim mono">{clock(r.out)}</span></td>
    </tr>
  )
}
