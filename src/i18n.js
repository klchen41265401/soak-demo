/* =========================================================================
 *  i18n 字典 · 中 / 英 全站切換
 *  原則：每種語言「純語言」呈現；僅保留無法翻譯的專有名詞
 *  （Runcard / PN / SN / STM-xx / Tank / HPW / IQC / Signin / PW / RFID / NG）。
 *  用法：t('key')；可帶內插 t('key', { id: 'RC-1' })，字典內以 {id} 標記。
 * ========================================================================= */
export const STR = {
  // ---- app / nav ----
  'app.title': { zh: '酸洗浸泡產線模擬', en: 'Soak Line Demo' },
  'app.sub': { zh: 'RFID 標籤產線流動 · 互動拖拉原型', en: 'RFID tag line flow · interactive prototype' },
  'nav.line': { zh: '產線俯視圖', en: 'Line Map' },
  'nav.operator': { zh: '現場螢幕', en: 'Operator Screen' },
  'nav.monitor': { zh: '監控站', en: 'Monitor' },
  'btn.reset': { zh: '重置', en: 'Reset' },
  'btn.lang': { zh: 'EN', en: '中文' }, // 按鈕顯示「切換到的語言」
  'btn.log': { zh: '紀錄', en: 'Log' },
  'btn.rules': { zh: '業務規則', en: 'Rules' },
  'btn.toDark': { zh: '夜間', en: 'Night' }, // 按鈕顯示「切換到的模式」
  'btn.toLight': { zh: '日間', en: 'Day' },
  'btn.help': { zh: '本頁說明', en: 'What is this page?' },
  'set.soakLabel': { zh: '浸泡', en: 'Soak' },
  'set.sec': { zh: '秒', en: 's' },
  'set.soakTitle': { zh: '全域浸泡秒數（所有 Runcard 共用，可自訂）', en: 'Global soak seconds (all runcards; editable)' },

  // 首次進站引導
  'coach.title': { zh: '從這裡開始 👇', en: 'Start here 👇' },
  'coach.body': { zh: '抓一張 Runcard 拖到 Signin，開始整個流程', en: 'Grab a runcard and drop it on Signin to begin' },
  'coach.dismiss': { zh: '知道了', en: 'Got it' },

  // ---- log panel ----
  'log.title': { zh: '操作紀錄', en: 'Activity Log' },
  'log.copy': { zh: '複製 Markdown', en: 'Copy Markdown' },
  'log.copied': { zh: '已複製', en: 'Copied' },
  'log.download': { zh: '下載 .md', en: 'Download .md' },
  'log.clear': { zh: '清除', en: 'Clear' },
  'log.colTime': { zh: '時間', en: 'Time' },
  'log.colType': { zh: '類型', en: 'Type' },
  'log.colMsg': { zh: '訊息', en: 'Message' },
  'log.close': { zh: '關閉', en: 'Close' },
  'log.empty': { zh: '尚無紀錄', en: 'No entries yet' },
  'log.count': { zh: '共 {n} 筆', en: '{n} entries' },

  // ---- line page: zones ----
  'hpw.title': { zh: 'HPW 最終潤洗', en: 'HPW · Final Rinse' },
  'hpw.hint': { zh: '流程結束放置區，放入後解除所有標示', en: 'Drop here to finish — clears all marks' },
  'bench.dropHere': { zh: '拖曳 Tank 到此槽台', en: 'Drag a tank here' },
  'station.drop': { zh: '拖入', en: 'Drop tag' },
  'pool.title': { zh: 'Runcard 待處理', en: 'Runcards' },
  'pool.empty': { zh: '（皆已上線）', en: '(all on line)' },
  'liquids.title': { zh: '酸種瓶', en: 'Liquids' },
  'liquids.note': {
    zh: '拖到 Tank 的 Acid/PW 區倒入；槽內酸瓶可拖回此處倒掉',
    en: "Drop onto a tank's slot to fill · drag a tank's bottle back here to empty",
  },
  'removed.title': { zh: '移出區', en: 'Removal Zone' },
  'removed.hint': {
    zh: '模擬零件被（異常）取出的暫置處，僅可放 Runcard',
    en: 'Parts pulled / abnormally removed — runcards only',
  },
  'removed.empty': { zh: '（目前無移出零件）', en: '(no removed parts)' },

  // ---- tank ----
  'tank.countdown': { zh: '碼表計時', en: 'Timer' },
  'tank.soaking': { zh: '作業中', en: 'Soaking' },
  'tank.ready': { zh: '可取出', en: 'Ready' },
  'tank.over': { zh: '超時・請取出', en: 'Over — remove' },
  'tank.reqShort': { zh: '要求', en: 'Req' },
  'tank.waiting': { zh: '等待', en: 'Waiting' },
  'tank.callPlace': { zh: '請放入 {id}', en: 'Place {id}' },
  'tank.runcard': { zh: 'Runcard', en: 'Runcard' },
  'tank.slotEmpty': { zh: '放置 Runcard', en: 'Place runcard' },
  'tank.acidLabel': { zh: 'Acid / PW', en: 'Acid / PW' },
  'tank.dropLiquid': { zh: '拖入酸種瓶', en: 'Drop liquid' },
  'tank.abnormal': { zh: '異常', en: 'Abnormal' },
  'suffix.acid': { zh: '酸', en: 'Acid' },
  'suffix.pw': { zh: '超純水', en: 'PW Water' },
  'acid.owner': { zh: '負責', en: 'Owner' },
  'acid.type': { zh: '材質', en: 'Material' },
  'acid.formula': { zh: '配方', en: 'Formula' },
  'flag.soaked': { zh: '已泡酸 ✓', en: 'Soaked ✓' },

  // ---- legend ----
  'legend.signin': { zh: 'Signin 邊框', en: 'Signin ring' },
  'legend.iqc': { zh: 'IQC 邊框', en: 'IQC ring' },
  'legend.pw': { zh: 'PW 超純水', en: 'PW water' },
  'legend.flow': {
    zh: '單向流程（不可回頭 / 跳站）：Signin → IQC → Tank（↔ 移出區）→ HPW',
    en: 'One-way (no back/skip): Signin → IQC → Tank (↔ Removal) → HPW',
  },

  // ---- operator screen ----
  'op.total': { zh: '總時間', en: 'Total' },
  'op.placeReq': { zh: '請放入', en: 'Please place' },
  'op.idle': { zh: '等待中', en: 'Idle' },
  'op.statusLabel': { zh: '狀態', en: 'Status' },
  'op.waiting': { zh: '等待進入', en: 'Waiting' },
  'op.soaking': { zh: '作業中', en: 'Soaking' },
  'op.ready': { zh: '可取出', en: 'Ready to remove' },
  'op.over': { zh: '超時 · 請取出', en: 'Over — remove' },
  'op.overBy': { zh: '超時 +{t}', en: 'Over by +{t}' },
  'op.abnStatus': { zh: '異常', en: 'Abnormal' },
  'op.abnBanner': { zh: '異常：此零件曾被取出，請通知產線人員（倒數已接續）', en: 'Abnormal: part was removed — notify line staff (countdown resumed)' },
  'op.pulledTitle': { zh: '未偵測到 Tag', en: 'Tag not detected' },
  'op.pulledSub': { zh: '請放回零件 {id}', en: 'Return part {id}' },
  'op.pulledStatus': { zh: '異常・請放回', en: 'Abnormal — return part' },
  'op.statusBar': { zh: '狀態列', en: 'Status Bar' },
  'op.bench': { zh: '槽台', en: 'Bench' },
  'op.tank': { zh: '槽', en: 'Tank' },
  'op.liquid': { zh: '液體', en: 'Liquid' },
  'op.now': { zh: '現在時間', en: 'Now' },
  'op.partInfo': { zh: '零件資訊', en: 'Part Info' },
  'op.spec': { zh: '規格酸', en: 'Spec acid' },
  'op.noPart': { zh: '無零件', en: 'No part' },
  'op.swap': { zh: '左右切換', en: 'Swap' },

  // ---- monitor ----
  'mon.title': { zh: '酸洗浸泡監控站', en: 'Acid Soak Monitor' },
  'mon.sub': { zh: '以酸桶為單位監控，一桶一酸，由產線俯視圖即時帶入', en: 'Per-tank monitoring · one acid per tank · live from the line map' },
  'mon.connected': { zh: '已連線', en: 'Connected' },
  'mon.now': { zh: '現在時間', en: 'Now' },
  'mon.bannerAbn': { zh: '槽發生異常（倒數中被取出，請確認）', en: 'tank(s) abnormal (removed mid-countdown)' },
  'mon.bannerPulled': { zh: '零件被取出未放回（未偵測到 Tag，請放回）', en: 'part(s) removed & not returned (tag lost — return them)' },
  'mon.liquid': { zh: '液體', en: 'Liquid' },
  'mon.inTank': { zh: '槽內 1 件', en: '1 part' },
  'mon.empty': { zh: '空', en: 'Empty' },
  'mon.abnTag': { zh: '異常', en: 'abnormal' },
  'mon.headDesc': { zh: '單槽單一酸種，浸泡參數由 Runcard 帶入', en: 'One acid per tank · soak params from runcard' },
  'mon.partsInTank': { zh: '槽內零件', en: 'Parts in tank' },
  'mon.records': { zh: '出槽紀錄', en: 'Left-tank records' },
  'mon.unit': { zh: ' 件', en: ' pcs' },
  'mon.recUnit': { zh: ' 筆', en: ' rec' },
  'mon.th.runcard': { zh: '流程卡', en: 'Runcard' },
  'mon.th.pnsn': { zh: 'PN / SN', en: 'PN / SN' },
  'mon.th.req': { zh: '要求', en: 'Required' },
  'mon.th.remain': { zh: '剩餘', en: 'Remaining' },
  'mon.th.elapsed': { zh: '已計時', en: 'Elapsed' },
  'mon.th.prog': { zh: '進度', en: 'Progress' },
  'mon.th.status': { zh: '狀態', en: 'Status' },
  'mon.th.liquid': { zh: '液體', en: 'Liquid' },
  'mon.th.actual': { zh: '實際', en: 'Actual' },
  'mon.th.result': { zh: '結果', en: 'Result' },
  'mon.th.inTime': { zh: '入槽時間', en: 'In time' },
  'mon.th.outTime': { zh: '出槽時間', en: 'Out time' },
  'mon.st.soaking': { zh: '浸泡中', en: 'Soaking' },
  'mon.st.abnormal': { zh: '異常', en: 'Abnormal' },
  'mon.st.done': { zh: '達標・可取出', en: 'Ready' },
  'mon.st.over': { zh: '超時', en: 'Over' },
  'mon.st.near': { zh: '即將達標', en: 'Near' },
  'mon.res.abnormal': { zh: '異常 NG', en: 'Abnormal NG' },
  'mon.res.pass': { zh: '達標 PASS', en: 'PASS' },
  'mon.res.over': { zh: '超時 OVER', en: 'Over' },
  'mon.res.rinse': { zh: '潤洗完成', en: 'PW done' },
  'mon.noPart': { zh: '本槽目前沒有零件', en: 'No part in tank' },
  'mon.noRec': { zh: '尚無零件離槽', en: 'No records yet' },
  'mon.foot': { zh: 'RFID 智慧站 · 範例介面 — 倒數時間已加速以便展示', en: 'RFID Smart Station · demo — countdown accelerated for display' },
}

export function tr(key, lang, vars) {
  const e = STR[key]
  let s = (e && (e[lang] ?? e.zh)) ?? key
  if (vars) for (const k of Object.keys(vars)) s = s.replaceAll('{' + k + '}', vars[k])
  return s
}
