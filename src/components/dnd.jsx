import { useDraggable, useDroppable } from '@dnd-kit/core'
import { COLORS, PW, useT, useStore, canDrop } from '../store.jsx'

/* 可拖曳包裝 Draggable */
export function Draggable({ id, children, disabled, data }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled, data })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={'draggable' + (isDragging ? ' dragging' : '') + (disabled ? ' disabled' : '')}
      style={{ opacity: isDragging ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'grab', touchAction: 'none' }}
    >
      {children}
    </div>
  )
}

/* 可放置區 Droppable
 * 拖曳時：有效放入點 → 聚光燈（.spotlight，浮在全畫面變暗的遮罩之上）。 */
export function Droppable({ id, children, className = '', style = {} }) {
  const { state } = useStore()
  const { setNodeRef, isOver, active } = useDroppable({ id })
  const spotlight = !!active && canDrop(state, String(active.id), id)
  const cls =
    className +
    (active ? ' drag-on' : '') +
    (spotlight ? ' spotlight' : '') +
    (isOver && spotlight ? ' over' : '')
  return (
    <div ref={setNodeRef} className={cls} style={style}>
      {children}
    </div>
  )
}

/* Runcard 籌碼（含 signin / iqc 疊加邊框、規格酸種徽章） */
export function RuncardChip({ rc, draggable = true, compact = false }) {
  const { t } = useT()
  // 疊加 border：先 signin（外圈），再 iqc（內圈）
  const rings = []
  if (rc.signin) rings.push(`0 0 0 3px ${COLORS.signin}`)
  if (rc.iqc) rings.push(`0 0 0 6px ${COLORS.iqc}`)
  const boxShadow = rings.length ? rings.join(', ') : '0 1px 3px rgba(0,0,0,.18)'
  const acidColor = COLORS[rc.requiredAcid] || '#64748b'

  const body = (
    <div className={'rc-chip' + (compact ? ' compact' : '') + (rc.done ? ' done' : '')} style={{ boxShadow }}>
      <div className="rc-id">{rc.id}</div>
      {!rc.done && (
        <div className="rc-meta">
          {/* 酸種徽章：除了進 HPW（done）外一律保持顯示 */}
          <span className="rc-acid" style={{ background: acidColor }}>{rc.requiredAcid}</span>
          {!compact && <span className="rc-pn">{rc.pn}</span>}
        </div>
      )}
      <div className="rc-flags">
        {rc.signin && <span className="flag" style={{ background: COLORS.signin }}>Signin</span>}
        {rc.iqc && <span className="flag" style={{ background: COLORS.iqc }}>IQC</span>}
        {rc.acidSoaked && <span className="flag soaked">{t('flag.soaked')}</span>}
      </div>
    </div>
  )
  if (!draggable || rc.done) return body
  return <Draggable id={'rc:' + rc.id}>{body}</Draggable>
}

/* 酸種瓶籌碼 Acid bottle chip（tray 內的來源） */
export function AcidChip({ liquid }) {
  const { t } = useT()
  const color = COLORS[liquid]
  const isPw = liquid === PW
  return (
    <Draggable id={'acid:' + liquid}>
      <div className="acid-chip" style={{ borderColor: color }}>
        <span className="acid-cap" style={{ background: color }} />
        <span className="acid-name">{liquid}</span>
        <span className="acid-sub">{isPw ? t('suffix.pw') : t('suffix.acid')}</span>
      </div>
    </Draggable>
  )
}

/* 已倒入 Tank 的酸瓶（放在 Acid/PW 槽內的 div，可再拖出 / 移槽） */
export function TankAcidBottle({ tankId, liquid, disabled }) {
  const { t } = useT()
  const color = COLORS[liquid]
  const isPw = liquid === PW
  return (
    <Draggable id={'tankacid:' + tankId} disabled={disabled}>
      <div className="acid-bottle-in" style={{ borderColor: color }}>
        <span className="acid-cap" style={{ background: color }} />
        <span className="acid-bottle-name">{liquid}</span>
        <span className="acid-bottle-sub">{isPw ? t('suffix.pw') : t('suffix.acid')}</span>
      </div>
    </Draggable>
  )
}
