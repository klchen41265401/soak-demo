import { useStore, useT, COLORS, PW, acidInfo, scheduledRuncardFor, pulledAlertFor, tanksInBench } from '../store.jsx'

const fmt = (s) => {
  if (s == null) return '--:--'
  s = Math.max(0, Math.round(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString('zh-TW', { hour12: false }) : '--:--:--')

// 現場螢幕：一次一個 Bench，Tank A/B 同時顯示（一個 Bench 一個螢幕）
export default function OperatorPage() {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const benches = state.benchOrder.map((id) => state.benches[id])
  const curId = state.benches[state.operatorBenchId] ? state.operatorBenchId : state.benchOrder[0]
  const bench = state.benches[curId]
  const tanks = tanksInBench(state, curId)

  return (
    <div className="op2">
      <header className="op2-top">
        <div className="op2-benchtabs">
          {benches.map((b) => (
            <button
              key={b.id}
              className={'op2-benchtab' + (b.id === curId ? ' active' : '')}
              onClick={() => dispatch({ type: 'SET_OPERATOR_VIEW', benchId: b.id })}
            >
              {b.name}
            </button>
          ))}
        </div>
        <div className="op2-now">
          <span className="op2-now-label">{t('op.now')}</span>
          <span className="op2-now-val mono">{clock(state.nowTs)}</span>
        </div>
      </header>

      <div className={'op2-grid tanks-' + tanks.length}>
        {tanks.length === 0 && <div className="op2-empty">{t('bench.dropHere')}</div>}
        {tanks.map((tk) => (
          <OpTank key={tk.id} tank={tk} />
        ))}
      </div>
    </div>
  )
}

function OpTank({ tank }) {
  const { state } = useStore()
  const { t } = useT()
  const rc = tank.runcardId ? state.runcards[tank.runcardId] : null
  const pulled = tank.runcardId ? null : pulledAlertFor(state, tank.id)
  const scheduled = pulled ? null : scheduledRuncardFor(state, tank.id)
  const part = rc || pulled || scheduled
  const liquidColor = tank.acid ? COLORS[tank.acid] : '#94a3b8'
  const info = tank.acid ? acidInfo(tank.acid) : null
  const overtime = tank.totalSec != null ? Math.max(0, (tank.elapsedSec || 0) - tank.totalSec) : 0
  const abnormal = tank.abnormal

  let mode = 'idle' // idle | call | running | done | over | pulled
  if (tank.status === 'running') mode = 'running'
  else if (tank.status === 'done') mode = 'done'
  else if (tank.status === 'over') mode = 'over'
  else if (pulled) mode = 'pulled'
  else if (scheduled) mode = 'call'
  const alert = abnormal || mode === 'pulled' || mode === 'over'

  return (
    <div className={'op2-tank mode-' + mode + (alert ? ' alert' : '') + (mode === 'done' ? ' ok' : '')}>
      <div className="op2-tank-head">
        <span className="op2-tank-name">{tank.label}</span>
        {tank.acid ? (
          <span className="op2-acid" style={{ background: liquidColor }}>{tank.acid}</span>
        ) : (
          <span className="op2-acid empty">{t('tank.dropLiquid')}</span>
        )}
        <span className="op2-total">{t('op.total')} {fmt(tank.totalSec)}</span>
      </div>

      {tank.acid && info && (
        <div className="op2-acidinfo">
          <div className="op2-formula">{info.name}</div>
          <div className="op2-acidmeta">
            <span className="op2-tag">{info.type}</span>
            <span className="op2-owner">{t('acid.owner')} {info.owner}</span>
          </div>
        </div>
      )}

      <div className="op2-tank-body">
        {abnormal && <div className="op2-banner">⚠ {t('op.abnStatus')}</div>}

        {mode === 'call' && (
          <div className="op2-big op2-call">
            <div className="op2-big-zh">{t('op.placeReq')}</div>
            <div className="op2-big-rc">{scheduled.id}</div>
          </div>
        )}
        {mode === 'pulled' && (
          <div className="op2-big op2-alert">
            <div className="op2-big-zh">⚠ {t('op.pulledTitle')}</div>
            <div className="op2-big-rc">{t('op.pulledSub', { id: pulled.id })}</div>
          </div>
        )}
        {(mode === 'running' || mode === 'done' || mode === 'over') && (
          <div className="op2-big">
            <div className="op2-time">{fmt(tank.elapsedSec)}</div>
            {mode === 'over' && <div className="op2-overby">{t('op.overBy', { t: fmt(overtime) })}</div>}
          </div>
        )}
        {mode === 'idle' && (
          <div className="op2-big op2-idle">
            <div className="op2-big-zh">{t('op.idle')}</div>
          </div>
        )}

        <div className="op2-status">
          {abnormal && t('op.abnStatus') + ' · '}
          {(mode === 'idle' || mode === 'call') && t('op.waiting')}
          {mode === 'running' && t('op.soaking')}
          {mode === 'done' && t('op.ready')}
          {mode === 'over' && t('op.over')}
          {mode === 'pulled' && t('op.pulledStatus')}
        </div>
      </div>

      <div className="op2-part">
        {part ? (
          <>
            <div className="op2-part-row"><span>Runcard</span><b className="mono">{part.id}</b></div>
            <div className="op2-part-row"><span>PN</span><b className="mono">{part.pn}</b></div>
            <div className="op2-part-row"><span>SN</span><b className="mono">{part.sn}</b></div>
            <div className="op2-part-row"><span>{t('op.spec')}</span><b style={{ color: COLORS[part.requiredAcid] }}>{part.requiredAcid}</b></div>
          </>
        ) : (
          <div className="op2-part-empty">{t('op.noPart')}</div>
        )}
      </div>
    </div>
  )
}
