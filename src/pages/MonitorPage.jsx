import { useStore, useT, allTanks, PW } from '../store.jsx'

const fmt = (s) => {
  if (s == null) return '--:--'
  s = Math.max(0, Math.round(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString('zh-TW', { hour12: false }) : '--:--:--')
const NEAR = 8

export default function MonitorPage() {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const tanks = allTanks(state)
  const selId = tanks.some((t) => t.tank.id === state.monitorTankId) ? state.monitorTankId : tanks[0].tank.id
  const sel = tanks.find((t) => t.tank.id === selId)
  const tank = sel.tank
  const bench = state.benches[sel.benchId]
  const rc = tank.runcardId ? state.runcards[tank.runcardId] : null

  const abnormalCount = tanks.filter((t) => t.tank.abnormal).length

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

      {abnormalCount > 0 && (
        <div className="mon-banner">
          ⚠ <b>{abnormalCount}</b> {t('mon.bannerAbn')}
        </div>
      )}

      <div className="mon-tankbar">
        {tanks.map(({ tank: tk, benchId }) => (
          <button
            key={tk.id}
            className={'mon-tankbtn' + (tk.id === selId ? ' active' : '')}
            onClick={() => dispatch({ type: 'SET_MONITOR_TANK', tankId: tk.id })}
          >
            <span className="mtb-name">{state.benches[benchId].name} · {tk.label}</span>
            <span className="mtb-acid">{t('mon.liquid')} {tk.acid || '—'}</span>
            <span className="mtb-cnt">{tk.runcardId ? t('mon.inTank') : t('mon.empty')}{tk.abnormal ? ' · ' + t('mon.abnTag') : ''}</span>
          </button>
        ))}
      </div>

      <div className="mon-card">
        <div className="mon-head">
          <div className="mon-acidbadge">{tank.acid || '—'}</div>
          <div className="mon-headmeta">
            <div className="t">{bench.name} · {tank.label}</div>
            <div className="d">{t('mon.headDesc')}</div>
          </div>
        </div>

        <div className="mon-subhead">
          <h2>{t('mon.partsInTank')}</h2>
          <span className="mon-count">{(rc ? 1 : 0)}{t('mon.unit')}</span>
        </div>

        <table className="mon-tbl">
          <thead>
            <tr>
              <th>{t('mon.th.runcard')}</th><th>{t('mon.th.pnsn')}</th><th>{t('mon.th.req')}</th>
              <th>{t('mon.th.remain')}</th><th>{t('mon.th.prog')}</th><th>{t('mon.th.status')}</th>
            </tr>
          </thead>
          <tbody>{rc ? <PartRow tank={tank} rc={rc} /> : null}</tbody>
        </table>
        {!rc && <div className="mon-empty">{t('mon.noPart')}</div>}
      </div>

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

function PartRow({ tank, rc }) {
  const { t } = useT()
  const pct = tank.totalSec ? Math.min(100, ((tank.totalSec - tank.remaining) / tank.totalSec) * 100) : 0
  let cls = 'p-soak', txt = t('mon.st.soaking'), rowCls = ''
  if (tank.abnormal) { cls = 'p-over'; txt = t('mon.st.abnormal'); rowCls = 'row-over' }
  else if (tank.status === 'done') { cls = 'p-done'; txt = t('mon.st.done'); rowCls = 'row-done' }
  else if (tank.remaining <= NEAR) { cls = 'p-near'; txt = t('mon.st.near') }
  return (
    <tr className={rowCls}>
      <td data-l="Runcard"><span className="mon-rc">{rc.id}</span></td>
      <td data-l="PN/SN"><div className="mon-pnsn"><div>{rc.pn}</div><div className="dim">{rc.sn}</div></div></td>
      <td data-l="Req"><span className="mon-num">{fmt(tank.totalSec)}</span></td>
      <td data-l="Remain"><span className="mon-num big">{fmt(tank.remaining)}</span></td>
      <td data-l="Progress"><div className="mon-bar"><div className="mon-fill" style={{ width: pct + '%' }} /></div></td>
      <td data-l="Status"><span className={'mon-pillst ' + cls}>{txt}</span></td>
    </tr>
  )
}

function RecordRow({ r }) {
  const { t } = useT()
  const map = {
    abnormal: { cls: 'r-over', txt: t('mon.res.abnormal') },
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
      <td data-l="Actual"><span className="mon-num">{fmt(r.actualSec)}</span></td>
      <td data-l="Result"><span className={'mon-res ' + m.cls}>{m.txt}</span></td>
      <td data-l="Out"><span className="dim mono">{clock(r.out)}</span></td>
    </tr>
  )
}
