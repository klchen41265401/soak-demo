import { useState } from 'react'
import { useStore, useT, COLORS, ALL_LIQUIDS, PW, scheduledRuncardFor, tanksInBench } from '../store.jsx'
import { Droppable, RuncardChip, AcidChip, TankAcidBottle, TankHandle } from '../components/dnd.jsx'

const fmt = (s) => {
  if (s == null) return '--:--'
  s = Math.max(0, Math.round(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function LinePage() {
  const { state } = useStore()
  const { t } = useT()
  const [coachOff, setCoachOff] = useState(false)
  const at = (loc) => state.order.map((id) => state.runcards[id]).filter((r) => r.location === loc)
  // 首次引導：還沒有任何卡離開待處理區時顯示
  const started = state.order.some((id) => state.runcards[id].location !== 'pool')
  const showCoach = !coachOff && !started
  const poolCards = at('pool')
  const hpwCards = at('hpw')
  const signinCards = at('signin')
  const iqcCards = at('iqc')
  const removedCards = at('removed')

  return (
    <div className="line-wrap">
      <div className="line-grid">
        {/* HPW */}
        <Droppable id="zone:hpw" accept={['rc']} className="hpw-zone zone">
          <div className="zone-title">{t('hpw.title')}</div>
          <div className="hpw-hint">{t('hpw.hint')}</div>
          <div className="hpw-cards">
            {hpwCards.map((rc) => (
              <RuncardChip key={rc.id} rc={rc} draggable={false} compact />
            ))}
          </div>
        </Droppable>

        {/* Soak Bench 1 / 移出區 / Soak Bench 2（Tank 可在兩槽台間拖動） */}
        <div className="bench-area">
          <BenchPanel benchId="SB1" />

          {/* 移出區：卡在 Soak Bench 1 / 2 中間 */}
          <Droppable id="zone:removed" accept={['rc']} className="removed-zone">
            <div className="tray-title removed-title">{t('removed.title')}</div>
            <div className="removed-hint">{t('removed.hint')}</div>
            <div className="removed-list removed-list-row">
              {removedCards.length === 0 && <div className="pool-empty">{t('removed.empty')}</div>}
              {removedCards.map((rc) => (
                <RuncardChip key={rc.id} rc={rc} compact />
              ))}
            </div>
          </Droppable>

          <BenchPanel benchId="SB2" />
        </div>

        {/* IQC */}
        <Droppable id="zone:iqc" accept={['rc']} className="iqc-zone zone tall" style={{ '--zc': COLORS.iqc }}>
          <div className="station-title">IQC</div>
          <div className="station-list">
            {iqcCards.length === 0 && <div className="station-hint">{t('station.drop')}</div>}
            {iqcCards.map((rc) => <RuncardChip key={rc.id} rc={rc} compact />)}
          </div>
        </Droppable>

        {/* Signin */}
        <Droppable id="zone:signin" accept={['rc']} className="signin-zone zone" style={{ '--zc': COLORS.signin }}>
          <div className="station-title light">Signin</div>
          <div className="station-list">
            {signinCards.length === 0 && <div className="station-hint light">{t('station.drop')}</div>}
            {signinCards.map((rc) => <RuncardChip key={rc.id} rc={rc} compact />)}
          </div>
        </Droppable>

        {/* Runcard pool + Acid tray + Removal zone */}
        <div className="tray-col">
          <Droppable id="zone:pool" accept={['rc']} className={'runcard-pool' + (showCoach ? ' coaching' : '')}>
            <div className="tray-title">{t('pool.title')}</div>
            {showCoach && (
              <div className="coach">
                <div className="coach-title">{t('coach.title')}</div>
                <div className="coach-body">{t('coach.body')}</div>
                <button className="coach-dismiss" onClick={() => setCoachOff(true)}>{t('coach.dismiss')}</button>
              </div>
            )}
            <div className="pool-list">
              {poolCards.length === 0 && <div className="pool-empty">{t('pool.empty')}</div>}
              {poolCards.map((rc) => (
                <RuncardChip key={rc.id} rc={rc} />
              ))}
            </div>
          </Droppable>

          <Droppable id="zone:acidtray" accept={['tankacid']} className="acid-tray">
            <div className="tray-title">{t('liquids.title')}</div>
            <div className="acid-list">
              {ALL_LIQUIDS.map((l) => (
                <AcidChip key={l} liquid={l} />
              ))}
            </div>
            <div className="tray-note">{t('liquids.note')}</div>
          </Droppable>
        </div>
      </div>

      <Legend />
    </div>
  )
}

// 一個 Soak Bench：可放置 Tank 的容器（Tank 可拖入 / 拖出）
function BenchPanel({ benchId }) {
  const { state } = useStore()
  const { t } = useT()
  const bench = state.benches[benchId]
  const tanks = tanksInBench(state, benchId)
  return (
    <Droppable id={'bench:' + benchId} accept={['tank']} className="bench">
      <div className="bench-title">{bench.name}</div>
      <div className="bench-tanks">
        {tanks.length === 0 && <div className="bench-empty">{t('bench.dropHere')}</div>}
        {tanks.map((tk) => (
          <TankCard key={tk.id} tank={tk} />
        ))}
      </div>
    </Droppable>
  )
}

function TankCard({ tank }) {
  const { state } = useStore()
  const { t } = useT()
  const rc = tank.runcardId ? state.runcards[tank.runcardId] : null
  const scheduled = scheduledRuncardFor(state, tank.id)
  const liquidColor = tank.acid ? COLORS[tank.acid] : '#cbd5e1'
  const over = tank.status === 'over'
  const overtime = tank.totalSec != null ? Math.max(0, (tank.elapsedSec || 0) - tank.totalSec) : 0
  const pct = tank.totalSec ? Math.min(100, ((tank.elapsedSec || 0) / tank.totalSec) * 100) : 0

  return (
    <div className={'tank' + (tank.abnormal ? ' abnormal' : '')}>
      <div className="tank-head">
        <TankHandle tankId={tank.id} />
        <span className="tank-name">{tank.label}</span>
        {tank.acid && (
          <span className="tank-acid-badge" style={{ background: liquidColor }}>
            {tank.acid} {tank.acid === PW ? t('suffix.pw') : t('suffix.acid')}
          </span>
        )}
        {tank.abnormal && <span className="tank-flag-abn">⚠ {t('tank.abnormal')}</span>}
      </div>

      <div className="tank-body">
        {/* 計時碼表（正常往上計時，超時不停） */}
        <div className="countdown-box">
          <div className="cd-label">{t('tank.countdown')}</div>
          <div className={'cd-time' + (over ? ' over' : tank.status === 'running' ? ' run' : '')}>
            {tank.elapsedSec == null ? '--:--' : fmt(tank.elapsedSec)}
          </div>
          <div className="cd-sub">
            {tank.totalSec != null
              ? over
                ? `${t('tank.over')} +${fmt(overtime)}　(${t('tank.reqShort')} ${fmt(tank.totalSec)})`
                : `${t('tank.reqShort')} ${fmt(tank.totalSec)}`
              : ''}
          </div>
          <div className="cd-status">
            {tank.status === 'running' && t('tank.soaking')}
            {over && t('tank.over')}
            {tank.status === 'idle' && (scheduled ? t('tank.callPlace', { id: scheduled.id }) : t('tank.waiting'))}
          </div>
          {tank.totalSec != null && (
            <div className="cd-bar">
              <div className="cd-fill" style={{ width: pct + '%', background: over ? '#dc2626' : liquidColor }} />
            </div>
          )}
        </div>

        {/* Runcard 綠色放置區 */}
        <Droppable id={'rcslot:' + tank.id} accept={['rc']} className={'rc-slot' + (rc ? ' filled' : '')}>
          <div className="slot-label">{t('tank.runcard')}</div>
          {rc ? (
            <RuncardChip rc={rc} compact />
          ) : scheduled ? (
            <div className="slot-call">{t('tank.callPlace', { id: scheduled.id })}</div>
          ) : (
            <div className="slot-empty">{t('tank.slotEmpty')}</div>
          )}
        </Droppable>
      </div>

      {/* Acid/PW 倒液區 */}
      <Droppable id={'acidslot:' + tank.id} accept={['acid', 'tankacid']} className="acid-slot" style={{ '--lc': liquidColor }}>
        <span className="slot-label">{t('tank.acidLabel')}</span>
        {tank.acid ? (
          <TankAcidBottle tankId={tank.id} liquid={tank.acid} disabled={!!rc} />
        ) : (
          <span className="acid-slot-val" style={{ color: '#94a3b8' }}>{t('tank.dropLiquid')}</span>
        )}
      </Droppable>
    </div>
  )
}

function Legend() {
  const { t } = useT()
  return (
    <div className="legend">
      <span className="lg"><i style={{ background: COLORS.signin }} /> {t('legend.signin')}</span>
      <span className="lg"><i style={{ background: COLORS.iqc }} /> {t('legend.iqc')}</span>
      <span className="lg"><i style={{ background: COLORS['STM-14'] }} /> STM-14</span>
      <span className="lg"><i style={{ background: COLORS['STM-31'] }} /> STM-31</span>
      <span className="lg"><i style={{ background: COLORS['STM-07'] }} /> STM-07</span>
      <span className="lg"><i style={{ background: COLORS.PW }} /> {t('legend.pw')}</span>
      <span className="lg-note">{t('legend.flow')}</span>
    </div>
  )
}
