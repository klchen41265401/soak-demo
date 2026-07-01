import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { tr } from './i18n.js'

/* =========================================================================
 *  共用狀態 Shared store  (Context + reducer)
 *  所有頁面讀同一份 state、丟同一組 actions（prop 互丟）。
 *  RESET → 一鍵回到 makeInitialState() 的最原始狀態。
 * ========================================================================= */

/* ---- 常數 Constants ---- */
export const ACID_TYPES = ['STM-14', 'STM-31', 'STM-07'] // 酸種
export const PW = 'PW' // 超純水 ultra-pure water
export const ALL_LIQUIDS = [...ACID_TYPES, PW]

// 顏色：signin / iqc 邊框疊加色、各液體色
export const COLORS = {
  signin: '#ef4444', // signin 紅
  iqc: '#f59e0b', // iqc 琥珀
  'STM-14': '#0f9d8f', // teal
  'STM-31': '#7c3aed', // violet
  'STM-07': '#0284c7', // sky
  PW: '#06b6d4', // cyan
}

// 零件規格庫（依 PN 帶回酸種 / 浸泡秒數；demo 已加速）
const PART_DB = {
  'PN-AX5074': { acid: 'STM-14', soakSec: 30, name: 'AMAX-5074 噴淋盤 Spray Plate' },
  'PN-RING332': { acid: 'STM-14', soakSec: 24, name: 'Edge Ring 邊環' },
  'PN-SH2210': { acid: 'STM-31', soakSec: 40, name: 'Showerhead 噴淋頭' },
  'PN-LID0488': { acid: 'STM-07', soakSec: 34, name: 'Lid 蓋板' },
}

let snSeq = 386000
const newSn = () => 'SN-' + ++snSeq

function makeRuncard(id, pn) {
  const spec = PART_DB[pn]
  return {
    id,
    pn,
    sn: newSn(),
    partName: spec.name,
    requiredAcid: spec.acid, // 規格酸種（固定徽章）
    soakSec: spec.soakSec, // 要求浸泡秒
    signin: false,
    iqc: false,
    acidSoaked: false, // 是否已泡過酸（PW 槽前置條件）
    abnormal: false, // 曾在未達標時被移出 → 異常（持續提示，直到進 HPW / 重置）
    elapsedSec: null, // 被移出時保留的已計時秒，再放入時接續往上計時
    pulledFromTank: null, // 最近一次被（異常）取出的來源 Tank；仍在槽外時該槽會警告「請放回」
    location: 'pool', // pool | signin | iqc | <tankId> | hpw | removed
    done: false,
  }
}

function makeTank(id, label, benchId) {
  return {
    id,
    label,
    benchId, // 目前所在的 Soak Bench（可拖動更換）
    acid: null, // 桶內液體（拖酸種瓶倒入）；一桶一酸
    runcardId: null,
    totalSec: null, // 要求浸泡秒（目標）
    elapsedSec: null, // 已計時秒（正常往上計時，超時不停）
    status: 'idle', // idle | running（未達標）| over（已達標/超時）
    abnormal: false, // 未達標即被取出 → 異常
  }
}

// 顯示用：M:SS
const fmtSec = (s) => {
  s = Math.max(0, Math.round(s || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
// 判定到「分」：達標後給 1 分鐘寬限（可取出/綠），超過 1 分鐘才算超時（紅）
export const OVER_GRACE = 60
const tankStatus = (elapsed, total) =>
  elapsed >= total + OVER_GRACE ? 'over' : elapsed >= total ? 'done' : 'running'

export function makeInitialState() {
  snSeq = 386000
  const runcards = [
    makeRuncard('RC-202606301', 'PN-AX5074'),
    makeRuncard('RC-202606302', 'PN-RING332'),
    makeRuncard('RC-202606303', 'PN-SH2210'),
    makeRuncard('RC-202606304', 'PN-LID0488'),
    makeRuncard('RC-202606305', 'PN-AX5074'),
  ]
  const byId = {}
  runcards.forEach((r) => (byId[r.id] = r))
  return {
    runcards: byId,
    order: runcards.map((r) => r.id),
    // 兩個槽台（metadata）；Tank 為扁平結構、各自帶 benchId 可任意移動
    benches: {
      SB1: { id: 'SB1', name: 'Soak Bench 1' },
      SB2: { id: 'SB2', name: 'Soak Bench 2' },
    },
    benchOrder: ['SB1', 'SB2'],
    tanks: {
      'SB1-A': makeTank('SB1-A', 'Tank A', 'SB1'),
      'SB1-B': makeTank('SB1-B', 'Tank B', 'SB1'),
    },
    tankOrder: ['SB1-A', 'SB1-B'],
    records: [], // 出槽紀錄（給監控站）
    operatorTankId: 'SB1-A', // 現場螢幕看哪一槽
    monitorTankId: 'SB1-A',
    toast: null, // { id, msg, en, type }
    logs: [], // 操作紀錄 { id, ts, zh, en, type }
    nowTs: 0,
    lang: 'zh', // 'zh' | 'en'
    theme: 'light', // 'light' | 'dark'（日 / 夜）
  }
}

/* ---- 工具（扁平 tanks）---- */
const getTank = (state, tankId) => state.tanks[tankId] || null
const setTank = (state, tankId, tank) => ({ ...state, tanks: { ...state.tanks, [tankId]: tank } })
const allTanks = (state) => state.tankOrder.map((id) => state.tanks[id]).filter(Boolean)
const tanksInBench = (state, benchId) => state.tankOrder.map((id) => state.tanks[id]).filter((t) => t && t.benchId === benchId)

let toastSeq = 0
const toast = (msg, en, type = 'warn') => ({ id: ++toastSeq, msg, en, type })

/* =========================================================================
 *  Reducer
 *  外層 reducer 會把每一次「新 toast」自動寫入 logs（操作紀錄）。
 * ========================================================================= */
function reducer(state, action) {
  const next = baseReducer(state, action)
  // 有新的 toast（id 不同）→ 記一筆 log
  if (next.toast && next.toast.id !== (state.toast && state.toast.id)) {
    const tt = next.toast
    const entry = { id: tt.id, ts: action.ts || Date.now(), zh: tt.msg, en: tt.en, type: tt.type }
    return { ...next, logs: [...next.logs, entry] }
  }
  return next
}

function baseReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      // 語言 / 主題 / 操作紀錄為 UI 層，重置不還原；並記一筆「已重置」
      return {
        ...makeInitialState(),
        lang: state.lang,
        theme: state.theme,
        logs: state.logs,
        toast: toast('已重置全部狀態', 'All state reset', 'ok'),
      }

    case 'CLEAR_LOGS':
      return { ...state, logs: [] }

    case 'TOGGLE_LANG':
      return { ...state, lang: state.lang === 'zh' ? 'en' : 'zh' }

    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' }

    case 'TICK': {
      const tanks = { ...state.tanks }
      let changed = false
      for (const id of Object.keys(tanks)) {
        const t = tanks[id]
        // 槽內有零件就持續往上計時（達標後不停，進入超時）
        if (t.runcardId && t.elapsedSec != null) {
          const el = t.elapsedSec + 1
          tanks[id] = { ...t, elapsedSec: el, status: tankStatus(el, t.totalSec) }
          changed = true
        }
      }
      if (!changed) return { ...state, nowTs: action.ts }
      return { ...state, tanks, nowTs: action.ts }
    }

    case 'SET_OPERATOR_VIEW':
      return { ...state, operatorTankId: action.tankId }

    case 'SET_MONITOR_TANK':
      return { ...state, monitorTankId: action.tankId }

    case 'DISMISS_TOAST':
      return { ...state, toast: null }

    case 'DROP':
      return handleDrop(state, action.activeId, action.overId)

    default:
      return state
  }
}

/* ---- 拖放核心 ---- */
function handleDrop(state, activeId, overId) {
  if (!activeId || !overId) return state
  const [aKind, aVal] = activeId.split(':')

  /* ===== 拖「Tank」到某個 Soak Bench → 移動整個槽 ===== */
  if (aKind === 'tank') {
    let benchId = null
    if (overId.startsWith('bench:')) benchId = overId.slice('bench:'.length)
    else if (overId.startsWith('rcslot:')) benchId = getTank(state, overId.slice('rcslot:'.length))?.benchId
    else if (overId.startsWith('acidslot:')) benchId = getTank(state, overId.slice('acidslot:'.length))?.benchId
    if (!benchId) return state
    return moveTank(state, aVal, benchId)
  }

  /* ===== 從 tray 拖「酸種瓶」到 Tank 的 Acid/PW 區 ===== */
  if (aKind === 'acid') {
    if (!overId.startsWith('acidslot:')) return state
    const tankId = overId.slice('acidslot:'.length)
    const tank = getTank(state, tankId)
    if (!tank) return state
    if (tank.runcardId) {
      return { ...state, toast: toast('槽內有零件，無法換液', 'Tank occupied — cannot change liquid', 'error') }
    }
    return setTankLiquid(state, tankId, aVal)
  }

  /* ===== 拖「槽內已倒入的酸瓶」→ 倒掉 / 移到別槽 ===== */
  if (aKind === 'tankacid') {
    const fromId = aVal
    const from = getTank(state, fromId)
    if (!from) return state
    if (from.runcardId) {
      return { ...state, toast: toast('槽內有零件，無法移除液體', 'Tank occupied — cannot remove liquid', 'error') }
    }
    // 倒入另一個 Tank 的 Acid/PW 區 → 移動液體
    if (overId.startsWith('acidslot:')) {
      const toId = overId.slice('acidslot:'.length)
      if (toId === fromId) return state
      const to = getTank(state, toId)
      if (!to) return state
      if (to.runcardId) {
        return { ...state, toast: toast('目標槽有零件，無法換液', 'Target tank occupied', 'error') }
      }
      const liquid = from.acid
      let s = emptyTankAcid(state, fromId, true)
      s = setTankLiquid(s, toId, liquid)
      return s
    }
    // 拖到其他任何放置區 → 倒掉本槽液體
    return emptyTankAcid(state, fromId)
  }

  /* ===== 拖「Runcard」 ===== */
  if (aKind === 'rc') {
    const rc = state.runcards[aVal]
    if (!rc || rc.done) return state
    const fromTank = isTankLoc(rc.location) ? rc.location : null

    // 放回原站 → 不動作（避免同槽重啟倒數）
    if (overId === 'zone:' + rc.location || overId === 'rcslot:' + rc.location) return state

    // 流程關卡：單向、不可回頭 / 跳站（清洗區 ↔ 移出區 例外）
    if (rcTargetZone(overId) && !flowAllows(rc, overId)) {
      return { ...state, toast: toast('流程不可回頭或跳站', 'Flow is forward-only — no back/skip', 'error') }
    }

    if (overId === 'zone:signin') return moveToSignin(state, rc, fromTank)
    if (overId === 'zone:iqc') return moveToIqc(state, rc, fromTank)
    if (overId === 'zone:hpw') return moveToHpw(state, rc, fromTank)
    if (overId === 'zone:pool') return moveToPool(state, rc, fromTank)
    if (overId === 'zone:removed') return moveToRemoved(state, rc, fromTank)
    if (overId.startsWith('rcslot:')) {
      const tankId = overId.slice('rcslot:'.length)
      return moveToTank(state, rc, tankId, fromTank)
    }
  }
  return state
}

// 移動整個 Tank 到另一個 Soak Bench
function moveTank(state, tankId, benchId) {
  const tank = getTank(state, tankId)
  const bench = state.benches[benchId]
  if (!tank || !bench || tank.benchId === benchId) return state
  const s = setTank(state, tankId, { ...tank, benchId })
  return { ...s, toast: toast(`${tank.label} 已移到 ${bench.name}`, `${tank.label} moved to ${bench.name}`, 'ok') }
}

function setTankLiquid(state, tankId, liquid) {
  const tank0 = getTank(state, tankId)
  if (!tank0) return state
  const tank = { ...tank0, acid: liquid }
  const zhName = liquid === PW ? 'PW 超純水' : liquid
  const enName = liquid === PW ? 'PW water' : liquid
  return {
    ...setTank(state, tankId, tank),
    toast: toast(`${tank.label} 已倒入 ${zhName}`, `${tank.label} filled with ${enName}`, 'ok'),
  }
}

function emptyTankAcid(state, tankId, silent) {
  const tank0 = getTank(state, tankId)
  if (!tank0) return state
  const tank = { ...tank0, acid: null }
  const s = setTank(state, tankId, tank)
  if (silent) return s
  return { ...s, toast: toast(`${tank.label} 已倒掉液體`, `${tank.label} liquid emptied`, 'ok') }
}

// 若 runcard 原本在某槽，先把它從槽中取出（判定是否異常），回傳新 state
// 未達標就被取出 → 在 Runcard 上保留已計時秒（elapsedSec）並標記 abnormal，
//                之後再放入任何 Tank 時可「接續計時」。
let otSeq = 0
function detachFromTank(state, rc, fromTank) {
  const t = getTank(state, fromTank)
  if (!t) return { state, abnormal: false }
  const total = t.totalSec || 0
  const elapsed = t.elapsedSec || 0
  const underTime = elapsed < total // 未達標就被取出 → 異常
  const rawOver = Math.max(0, elapsed - total)
  const isOver = rawOver >= OVER_GRACE // 只有超過 1 分鐘才算超時（1 分鐘內視為達標）
  const overtimeSec = isOver ? rawOver : 0
  const wasAbnormal = underTime || rc.abnormal // 本次未達標取出，或本來就帶異常歷史
  // 紀錄：出槽（判定到「分」寬限）
  const record = {
    id: rc.id + '@' + Date.now() + Math.random(),
    rc: rc.id,
    pn: rc.pn,
    sn: rc.sn,
    acid: t.acid,
    reqSec: total,
    actualSec: elapsed,
    overtimeSec,
    result: wasAbnormal ? 'abnormal' : isOver ? 'over' : t.acid === PW ? 'rinse' : 'pass',
    out: state.nowTs,
  }
  const newTank = { ...t, runcardId: null, status: 'idle', elapsedSec: null, totalSec: null, abnormal: false }
  let newState = {
    ...setTank(state, fromTank, newTank),
    records: [record, ...state.records],
  }
  // 超時取出 → 直接寫一筆 log（記錄超時多久）
  if (overtimeSec > 0) {
    const ts = state.nowTs || 0
    const entry = {
      id: 'ot-' + ++otSeq,
      ts,
      zh: `${rc.id} 超時 ${fmtSec(overtimeSec)} 後取出（要求 ${fmtSec(total)}，實際 ${fmtSec(elapsed)}）`,
      en: `${rc.id} removed ${fmtSec(overtimeSec)} over limit (req ${fmtSec(total)}, actual ${fmtSec(elapsed)})`,
      type: 'error',
    }
    newState = { ...newState, logs: [...newState.logs, entry] }
  }
  // 在 Runcard 上記錄狀態，跟著零件走
  const rcPatch = {}
  if (underTime) {
    rcPatch.abnormal = true
    rcPatch.elapsedSec = elapsed // 保留已計時秒，再放入時接續往上計時
  }
  if (wasAbnormal) rcPatch.pulledFromTank = fromTank // 記住來源槽 → 該槽現場螢幕警告「請放回」
  if (!underTime && t.acid && t.acid !== PW) rcPatch.acidSoaked = true // 完成酸泡
  if (Object.keys(rcPatch).length) newState = patchRc(newState, rc.id, rcPatch)
  return { state: newState, abnormal: underTime }
}

function patchRc(state, id, patch) {
  return { ...state, runcards: { ...state.runcards, [id]: { ...state.runcards[id], ...patch } } }
}

function moveToSignin(state, rc, fromTank) {
  let s = state
  let abnormal = false
  if (fromTank) {
    const d = detachFromTank(s, rc, fromTank)
    s = d.state
    abnormal = d.abnormal
  }
  s = patchRc(s, rc.id, { signin: true, location: 'signin' })
  if (abnormal) return { ...s, toast: toast(`${rc.id} 倒數中被取出 → 異常`, `${rc.id} removed mid-countdown → ABNORMAL`, 'error') }
  if (!fromTank) s = { ...s, toast: toast(`${rc.id} 已 Signin`, `${rc.id} signed in`, 'ok') }
  return s
}

function moveToIqc(state, rc, fromTank) {
  if (!rc.signin) {
    return { ...state, toast: toast(`${rc.id} 需先 Signin 才能 IQC`, `${rc.id} must Sign in before IQC`, 'error') }
  }
  let s = state
  let abnormal = false
  if (fromTank) {
    const d = detachFromTank(s, rc, fromTank)
    s = d.state
    abnormal = d.abnormal
  }
  s = patchRc(s, rc.id, { iqc: true, location: 'iqc' })
  if (abnormal) return { ...s, toast: toast(`${rc.id} 倒數中被取出 → 異常`, `${rc.id} removed mid-countdown → ABNORMAL`, 'error') }
  if (!fromTank) s = { ...s, toast: toast(`${rc.id} 已 IQC`, `${rc.id} IQC done`, 'ok') }
  return s
}

function moveToPool(state, rc, fromTank) {
  let s = state
  let abnormal = false
  if (fromTank) {
    const d = detachFromTank(s, rc, fromTank)
    s = d.state
    abnormal = d.abnormal
  }
  s = patchRc(s, rc.id, { location: 'pool' })
  if (abnormal) return { ...s, toast: toast(`${rc.id} 倒數中被取出 → 異常`, `${rc.id} removed mid-countdown → ABNORMAL`, 'error') }
  return s
}

function moveToRemoved(state, rc, fromTank) {
  let s = state
  let abnormal = false
  if (fromTank) {
    const d = detachFromTank(s, rc, fromTank)
    s = d.state
    abnormal = d.abnormal
  }
  s = patchRc(s, rc.id, { location: 'removed' })
  return {
    ...s,
    toast: abnormal
      ? toast(`${rc.id} 倒數中被移出 → 異常（剩餘時間已保留，可繼續）`, `${rc.id} removed mid-countdown → ABNORMAL (time kept)`, 'error')
      : toast(`${rc.id} 已移出`, `${rc.id} moved to removal zone`, 'warn'),
  }
}

function moveToHpw(state, rc, fromTank) {
  let s = state
  if (fromTank) {
    const d = detachFromTank(s, rc, fromTank)
    s = d.state
    if (d.abnormal) {
      // 倒數中直接拖到 HPW 也算異常，但流程仍結束
    }
  }
  // 進 HPW → 流程結束，解除所有標示 / border
  s = patchRc(s, rc.id, {
    location: 'hpw',
    done: true,
    signin: false,
    iqc: false,
    acidSoaked: false,
    abnormal: false,
    elapsedSec: null,
    pulledFromTank: null,
  })
  return { ...s, toast: toast(`${rc.id} 已進入 HPW，流程結束`, `${rc.id} entered HPW — flow complete`, 'ok') }
}

function moveToTank(state, rc, tankId, fromTank) {
  const tank = getTank(state, tankId)
  if (!tank) return state

  // 流程關卡：強制 Signin → IQC → Tank
  if (!rc.signin || !rc.iqc) {
    return { ...state, toast: toast(`${rc.id} 需完成 Signin + IQC 才能進槽`, `${rc.id} needs Signin + IQC first`, 'error') }
  }
  if (tank.runcardId && tank.runcardId !== rc.id) {
    return { ...state, toast: toast(`${tank.label} 已有零件`, `${tank.label} already occupied`, 'error') }
  }
  if (!tank.acid) {
    return { ...state, toast: toast(`${tank.label} 尚未倒入酸液/PW`, `${tank.label} has no liquid yet`, 'error') }
  }
  // 酸種配對
  if (tank.acid === PW) {
    if (!rc.acidSoaked) {
      return { ...state, toast: toast(`PW 槽需先泡過酸：${rc.id} 尚未泡酸`, `PW tank requires prior acid soak`, 'error') }
    }
  } else {
    if (rc.requiredAcid !== tank.acid) {
      return {
        ...state,
        toast: toast(`錯槽：${rc.id} 規格為 ${rc.requiredAcid}，本槽為 ${tank.acid}`, `WRONG TANK: ${rc.id} spec ${rc.requiredAcid} ≠ ${tank.acid}`, 'error'),
      }
    }
  }

  let s = state
  if (fromTank && fromTank !== tankId) {
    const d = detachFromTank(s, rc, fromTank)
    s = d.state
  }
  const rcNow = s.runcards[rc.id] // detach 可能已更新 abnormal / elapsedSec
  // 接續計時：若帶有保留的已計時秒，就從該秒接續往上計時；否則從 0 開始
  const resume = rcNow.elapsedSec != null
  const elapsed = resume ? rcNow.elapsedSec : 0
  const carryAbnormal = !!rcNow.abnormal
  const newTank = {
    ...getTank(s, tankId),
    runcardId: rc.id,
    totalSec: rcNow.soakSec,
    elapsedSec: elapsed,
    status: tankStatus(elapsed, rcNow.soakSec),
    abnormal: carryAbnormal, // 異常提示跟著零件，繼續顯示
  }
  s = setTank(s, tankId, newTank)
  s = patchRc(s, rc.id, { location: tankId, elapsedSec: null, pulledFromTank: null }) // 已計時秒交給 Tank；回到槽內 → 清除「請放回」
  const msg = resume
    ? carryAbnormal
      ? toast(`${rc.id} 放入 ${tank.label}，接續計時（異常提示中）`, `${rc.id} resumed in ${tank.label} (abnormal flagged)`, 'warn')
      : toast(`${rc.id} 放入 ${tank.label}，接續計時`, `${rc.id} resumed in ${tank.label}`, 'ok')
    : toast(`${rc.id} 已放入 ${tank.label}，開始計時`, `${rc.id} placed in ${tank.label} — timing`, 'ok')
  return { ...s, toast: msg }
}

/* =========================================================================
 *  Selectors（排班提示等衍生資料）
 * ========================================================================= */
// 哪些 runcard 已 signin+IQC、在 pool/iqc、尚未完成 → 待排班
export function readyRuncards(state) {
  return state.order
    .map((id) => state.runcards[id])
    .filter((r) => r.signin && r.iqc && !r.done && (r.location === 'iqc' || r.location === 'pool' || r.location === 'signin'))
}

// 某 tank 目前應呼叫哪一張 runcard 進來（排班）
export function scheduledRuncardFor(state, tankId) {
  const tank = getTank(state, tankId)
  if (!tank || tank.runcardId || !tank.acid) return null
  const ready = readyRuncards(state)
  const match = ready.find((r) =>
    tank.acid === PW ? r.acidSoaked : r.requiredAcid === tank.acid,
  )
  return match || null
}

// 某 tank 是否有「被取出、尚未放回任何槽」的異常零件 → 現場螢幕警告請放回 / 未偵測到 tag
export function pulledAlertFor(state, tankId) {
  return (
    Object.values(state.runcards).find(
      (r) => r.abnormal && !r.done && r.pulledFromTank === tankId && !state.tanks[r.location],
    ) || null
  )
}

export function findTank(state, tankId) {
  return getTank(state, tankId)
}
export { allTanks, tanksInBench }

/* ---- 流程關卡：嚴格單向 Signin → IQC → 清洗區(Tank) → HPW ----
 * 不能回頭、不能跳站；清洗區(Tank) ↔ 移出區(removed) 可自由互換。 */
const STATION_LOCS = ['pool', 'signin', 'iqc', 'hpw', 'removed']
const isTankLoc = (loc) => !STATION_LOCS.includes(loc)
const stageOf = (loc) =>
  loc === 'pool' ? 0 : loc === 'signin' ? 1 : loc === 'iqc' ? 2 : loc === 'hpw' ? 4 : 3 // removed / tank = 3

function rcTargetZone(overId) {
  if (overId === 'zone:signin') return 'signin'
  if (overId === 'zone:iqc') return 'iqc'
  if (overId === 'zone:hpw') return 'hpw'
  if (overId === 'zone:pool') return 'pool'
  if (overId === 'zone:removed') return 'removed'
  if (overId.startsWith('rcslot:')) return 'tank'
  return null
}

// 純流程站序判定（不含酸種/占用等其他規則）
export function flowAllows(rc, overId) {
  const z = rcTargetZone(overId)
  const stage = stageOf(rc.location)
  switch (z) {
    case 'signin': return stage === 0 // 僅能從 pool 進 Signin
    case 'iqc': return stage === 1 // 僅能從 Signin 進 IQC
    case 'tank': return stage === 2 || stage === 3 // 從 IQC 進清洗區；或清洗區內/移出區互換
    case 'removed': return isTankLoc(rc.location) // 只能從 Tank 移出
    case 'hpw': return stage === 3 // 只能從清洗區(含移出區)結束
    case 'pool': return false // 不可回頭
    default: return false
  }
}

/* 拖曳時：判斷某 droppable 是否為「有效放入點」（給聚光燈提示用） */
export function canDrop(state, activeId, overId) {
  if (!activeId || !overId) return false
  const [kind, val] = activeId.split(':')

  // 拖 Tank → 任何「不是它目前所在」的 Soak Bench 皆可放
  if (kind === 'tank') {
    if (!overId.startsWith('bench:')) return false
    const tank = getTank(state, val)
    return !!tank && tank.benchId !== overId.slice('bench:'.length)
  }

  if (kind === 'acid') {
    if (!overId.startsWith('acidslot:')) return false
    const tank = getTank(state, overId.slice('acidslot:'.length))
    return !!tank && !tank.runcardId // 槽內無零件才能倒液
  }

  if (kind === 'tankacid') {
    if (overId === 'zone:acidtray') return true // 拖回 tray 倒掉
    if (overId.startsWith('acidslot:')) {
      const toId = overId.slice('acidslot:'.length)
      if (toId === val) return false
      const tank = getTank(state, toId)
      return !!tank && !tank.runcardId
    }
    return false
  }

  if (kind === 'rc') {
    const rc = state.runcards[val]
    if (!rc || rc.done) return false
    if (!flowAllows(rc, overId)) return false // 先過流程關卡（單向、不跳站）
    if (overId.startsWith('rcslot:')) {
      // 進清洗區還要過酸種/占用規則
      const tank = getTank(state, overId.slice('rcslot:'.length))
      if (!tank) return false
      if (tank.runcardId && tank.runcardId !== rc.id) return false
      if (!tank.acid) return false
      if (tank.acid === PW) return rc.acidSoaked
      return rc.requiredAcid === tank.acid
    }
    return true // signin / iqc / hpw / removed：流程允許即可
  }
  return false
}

/* =========================================================================
 *  Provider / hooks
 * ========================================================================= */
const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState)

  // 全域每秒心跳：推進倒數
  const ref = useRef()
  ref.current = state
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'TICK', ts: Date.now() }), 1000)
    return () => clearInterval(t)
  }, [])

  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

// i18n 便利 hook：回傳 lang 與翻譯函式 t(key, vars)
export function useT() {
  const { state } = useStore()
  const lang = state.lang
  return { lang, t: (key, vars) => tr(key, lang, vars) }
}
