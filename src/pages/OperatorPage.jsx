import { useState } from 'react'
import { useStore, useT, scheduledRuncardFor, pulledAlertFor, allTanks } from '../store.jsx'

const fmt = (s) => {
  if (s == null) return '--:--'
  s = Math.max(0, Math.round(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString('zh-TW', { hour12: false }) : '--:--:--')

export default function OperatorPage() {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const [sideLeft, setSideLeft] = useState(false) // 黑/白兩區是否左右對調

  const tanks = allTanks(state)
  const tank = tanks.find((t) => t.id === state.operatorTankId) || tanks[0]
  const bench = state.benches[tank.benchId]
  const rc = tank.runcardId ? state.runcards[tank.runcardId] : null
  const pulled = tank.runcardId ? null : pulledAlertFor(state, tank.id) // 空槽且有零件被取出未放回
  const scheduled = pulled ? null : scheduledRuncardFor(state, tank.id)

  // 計時狀態與「異常」分開：異常只是疊加提示，不打斷計時
  let mode = 'idle' // idle | call | running | over | pulled
  if (tank.status === 'running') mode = 'running'
  else if (tank.status === 'over') mode = 'over'
  else if (pulled) mode = 'pulled'
  else if (scheduled) mode = 'call'
  const abnormal = tank.abnormal
  const over = mode === 'over'
  const overtime = tank.totalSec != null ? Math.max(0, (tank.elapsedSec || 0) - tank.totalSec) : 0

  const main = (
    <div className="op-main" key="main">
      <div className="op-toptime">
        <span className="op-toptime-label">{t('op.total')}</span>
        <span className="op-toptime-val">{fmt(tank.totalSec)}</span>
      </div>

      {abnormal && (
        <div className="op-abn-banner">⚠ {t('op.abnBanner')}</div>
      )}

      {mode === 'call' && (
        <div className="op-big op-call">
          <div className="op-big-zh">{t('op.placeReq')}</div>
          <div className="op-big-rc">{scheduled.id}</div>
        </div>
      )}
      {mode === 'pulled' && (
        <div className="op-big op-abn">
          <div className="op-big-zh">⚠ {t('op.pulledTitle')}</div>
          <div className="op-big-rc">{t('op.pulledSub', { id: pulled.id })}</div>
        </div>
      )}
      {(mode === 'running' || mode === 'over') && (
        <div className="op-big">
          <div className={'op-countdown' + (over || abnormal ? ' abn' : '')}>{fmt(tank.elapsedSec)}</div>
          {mode === 'over' && <div className="op-over-by">{t('op.overBy', { t: fmt(overtime) })}</div>}
        </div>
      )}
      {mode === 'idle' && (
        <div className="op-big op-idle">
          <div className="op-big-zh">{t('op.idle')}</div>
        </div>
      )}

      <div className="op-status">
        <div className="op-status-label">{t('op.statusLabel')}</div>
        <div className={'op-status-val' + (over || abnormal || mode === 'pulled' ? ' abn' : '')}>
          {abnormal && t('op.abnStatus') + ' · '}
          {(mode === 'idle' || mode === 'call') && t('op.waiting')}
          {mode === 'running' && t('op.soaking')}
          {mode === 'over' && t('op.over')}
          {mode === 'pulled' && t('op.pulledStatus')}
        </div>
      </div>
    </div>
  )

  const side = (
    <aside className="op-side" key="side">
      <div className="op-side-block">
        <div className="op-side-title">{t('op.statusBar')}</div>
        <div className="op-side-row"><span>{t('op.bench')}</span><b>{bench.name.replace('Soak Bench ', '')}</b></div>
        <div className="op-side-row tank-row">
          <span>{t('op.tank')}</span>
          <span className="op-tanktabs">
            {tanks.map((tk) => (
              <button
                key={tk.id}
                className={'op-tanktab' + (tk.id === tank.id ? ' active' : '')}
                onClick={() => dispatch({ type: 'SET_OPERATOR_VIEW', tankId: tk.id })}
              >
                {tk.label.replace('Tank ', '')}
              </button>
            ))}
          </span>
        </div>
        <div className="op-side-row"><span>{t('op.liquid')}</span><b>{tank.acid || '—'}</b></div>
        <div className="op-side-row"><span>{t('op.now')}</span><b className="mono">{clock(state.nowTs)}</b></div>
      </div>

      <div className="op-side-block">
        <div className="op-side-title">{t('op.partInfo')}</div>
        {rc || scheduled ? (
          <>
            <div className="op-side-row"><span>Runcard</span><b className="mono">{(rc || scheduled).id}</b></div>
            <div className="op-side-row"><span>PN</span><b className="mono">{(rc || scheduled).pn}</b></div>
            <div className="op-side-row"><span>SN</span><b className="mono">{(rc || scheduled).sn}</b></div>
            <div className="op-side-row"><span>{t('op.spec')}</span><b>{(rc || scheduled).requiredAcid}</b></div>
          </>
        ) : (
          <div className="op-side-empty">{t('op.noPart')}</div>
        )}
      </div>
    </aside>
  )

  return (
    <div className={'op-screen mode-' + mode + (abnormal || mode === 'pulled' ? ' is-abnormal' : '') + (sideLeft ? ' side-left' : '')}>
      <button className="op-swap" onClick={() => setSideLeft((v) => !v)} title={t('op.swap')}>
        ⇄ {t('op.swap')}
      </button>
      {sideLeft ? [side, main] : [main, side]}
    </div>
  )
}
