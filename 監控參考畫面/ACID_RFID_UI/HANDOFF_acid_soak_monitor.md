# 酸洗浸泡監控站 — 工程交接文件 (Handoff)

> 給接手工程師 / Agent：本文件描述「酸洗浸泡監控站 Acid Soak Monitor」原型的**業務規則、資料模型、狀態機、整合契約**。原型 (`acid_soak_monitor.html`) 為**純前端、含模擬資料**的可運行 demo，目的在凍結 UI/UX 與判定邏輯；你的工作是把模擬資料層換成真實的 **RFID 讀取**與**上位系統 (Host/MES)** 串接，並補上後端與紀錄持久化。

- **狀態**：原型完成、邏輯凍結；待生產化串接。
- **目前所有時間數值（要求/上限分鐘、RSSI 門檻、demo 加速倍率）均為示意**，正式值須向 **ROY (酸洗流程 Runcard owner)** 取得。
- **語言**：UI 為繁中 (zh-TW)；程式識別字、API 欄位用英文。

---

## 1. 專案目的

工廠半導體零件「酸洗」時，零件貼有 RFID tag、置入酸桶浸泡。本系統即時監控**每件零件在酸桶中的浸泡時間**，依該零件規格要求判定是否「達標 / 不足 / 過浸 / 錯槽」，並在離槽時留下可稽核紀錄。取代舊版 `RFID_Worker_Frontend`（僅單一全域 60s 倒數、無酸種、無過浸、無分鐘判定）。

---

## 2. 交付物

| 檔案 | 說明 |
|---|---|
| `acid_soak_monitor.html` | 單檔前端原型（HTML+CSS+JS，無外部框架，僅引用 Google Fonts）。含模擬資料、模擬上位系統、模擬 RFID/RSSI。 |
| `HANDOFF_acid_soak_monitor.md` | 本文件。 |

原型可直接以瀏覽器開啟。所有狀態（浸泡中、即將達標、達標可取出、過浸、訊號微弱、錯槽、查詢上位系統中）在載入時即同時呈現，方便對照。

---

## 3. 三條核心業務規則（**不可變動**，已與需求方確認）

### 規則 1 — 現場到「秒」，判定/紀錄到「分」
- **浸泡過程（現場 Live）**：實際浸泡時間、剩餘時間、過浸超時，全部顯示到**秒** (`M:SS`)。
- **離槽後的最終判定與紀錄**：實際浸泡時間**四捨五入到分鐘** (`actualMin = round(elapsedSec / 60)`)，要求/實際/差異與 PASS 判定皆以**分鐘**為單位。
- **必然的邊界行為**：現場可能因超過上限「秒數」而短暫顯示過浸警示，但離槽以分鐘認定時若仍在範圍內會判 PASS。這是**刻意設計**，目的為「不因差幾秒被誤判 NG」。請勿在判定端改用秒。
- ⚠️ **開放項**：分鐘換算用 `round`（四捨五入）還是 `floor`（無條件捨去，代表「完成的整分鐘數」）須向 ROY 確認。原型用 `round`。

### 規則 2 — 一桶一酸（酸種為酸桶層級屬性）
- 同一酸桶**只裝一種酸液**。酸代號**不是**零件層級可選欄位，而是**酸桶的設定**。
- UI 以**酸桶為主視角**：上方酸桶切換、桶頭顯示該桶單一酸種；槽內零件共用該桶酸種，Live 表格不再有「酸代號」欄。
- 衍生防呆：若某件零件的**規格酸種**（由 PN/SN 從上位系統查得）≠ **本桶酸種** → 觸發「**錯槽 (WRONG)**」警示。錯槽是「一桶一酸」可稽核的防呆。
- ⚠️ **開放項**：錯槽是「僅警示」還是「禁止進槽/需簽核」由現場流程決定。原型為警示。

### 規則 3 — 浸泡參數來自上位系統（依 PN/SN 帶回）
- 酸種與浸泡時間**不寫死**。RFID 讀到零件 **PN/SN** 後，向**上位系統**查詢，回傳該零件的 `{酸種, 要求分鐘, 上限分鐘}`。
- 同一桶內**不同零件可有不同要求時間**（要求是 per-PN，不是 per-tank）。例：原型中 `PN-AX5074` 要求 1 分、`PN-RING332` 要求 2 分，兩者同為 STM-14 酸。
- 進槽當下有「**查詢上位系統參數中…**」過渡狀態（原型以 `FETCH_MS` 模擬延遲）。查得參數前不啟動計時、不可取出。

---

## 4. 資料模型

### 4.1 酸桶 Tank（規則 2）
```js
{ id:'T1', name:'1 號槽 Tank 1', station:'B3 2F Cleanroom', acid:'STM-14' }
```
- `acid` 為該桶**唯一**酸種。生產時來自酸桶設定/MES，不由零件決定。

### 4.2 上位系統回傳（規則 3）
RFID 讀到 `PN` →（查上位系統）→
```js
{ acid:'STM-14', reqMin:1, maxMin:2, name:'AMAX-5074 噴淋盤' }
```
- `reqMin` 要求浸泡分鐘（最少）。
- `maxMin` 上限分鐘（超過視為過浸）。**若實際流程只有「最少浸泡」、無上限，`maxMin` 可移除，判定只留 UNDER/PASS。** ← 待 ROY 確認。

### 4.3 槽內零件 Part（執行期）
```js
{
  id, tankId,            // 所屬酸桶
  rc,                    // 流程卡 Runcard
  pn, sn,                // RFID 讀回的 PN / SN
  host:{acid,reqMin,maxMin,name} | null,  // 上位系統參數；查詢中為 null
  start: <ms epoch> | null,               // 進槽時間（RFID 進槽事件時戳）；查詢中為 null
  rssi,                  // 即時訊號 dBm
  fetching: bool         // 是否仍在查詢上位系統
}
```

### 4.4 出槽紀錄 Record（規則 1，分鐘）
```js
{ rc, pn, sn, acid,                 // acid = 實際所浸泡之「桶內酸種」
  reqMin, actualMin, delta,         // 全部為分鐘；delta = actualMin - reqMin
  result:'pass'|'under'|'over'|'wrong',
  out:<出槽時間字串> }
```

---

## 5. 狀態機與警示邏輯

### 5.1 即時狀態判定（秒）— 對應原型 `evalPart()`
令 `reqSec=reqMin*60`、`maxSec=maxMin*60`、`elapsed=(now-start)`（秒）、`remaining=reqSec-elapsed`。
判定優先序（**由上而下，先命中先採用**）：

| 狀態 | 條件 | 顏色 | 文案 |
|---|---|---|---|
| `fetch` 查詢中 | `fetching === true` | 灰 | 查詢上位系統參數中… |
| `wrong` 錯槽 | `host.acid !== tank.acid` | 紫 | 錯槽・規格為 {規格酸種} |
| `over` 過浸 | `elapsed > maxSec` | 紅 | 過浸 {超時} 超上限 |
| `done` 達標可取出 | `reqSec ≤ elapsed ≤ maxSec` | 綠 | 達標・可取出 |
| `near` 即將達標 | `0 < remaining ≤ NEAR_WINDOW(15s)` | 琥珀 | 即將達標 |
| `soak` 浸泡中 | 其他 | 青 | 浸泡中 |

**獨立疊加警示**：`weak`（訊號微弱）當 `rssi < RSSI_THRESHOLD(-50 dBm)`。代表零件可能不在槽內，文案「訊號微弱・確認在槽內」。在非 over/wrong 狀態時覆蓋顯示。

### 5.2 最終結果判定（分鐘）— 對應原型 `removePart()`
離槽時：`actualMin = round(elapsed/60)`
| `result` | 條件 | 標籤 |
|---|---|---|
| `wrong` | 該件處於錯槽 | 錯槽 NG（紫） |
| `under` | `actualMin < reqMin` | 不足 UNDER（琥珀） |
| `over` | `actualMin > maxMin` | 過浸 OVER（紅） |
| `pass` | `reqMin ≤ actualMin ≤ maxMin` | PASS 達標（綠） |

### 5.3 全槽彙總警示（橫幅 Banner）
任何桶（不限當前檢視）存在 `over` 或 `wrong` 時顯示頂部紅色橫幅，列出件數。

### 5.4 進度條（signature 元件）
單一進度條同時表達「要求 / 實際 / 過浸」三件事：灰刻度線 = 要求位置；填滿到綠 = 可取出區間；續長到紅 = 過浸區。比例尺以 `1.35×reqSec` 為滿格，過浸仍可見。

---

## 6. 原型主要函式（程式地圖）

| 函式 | 職責 |
|---|---|
| `evalPart(p)` | 由 `start/host/rssi/tank` 算出當下狀態（5.1）。**純函式，邏輯核心，串接時保留。** |
| `renderTanks()` | 渲染酸桶切換列與各桶件數。 |
| `selectTank(id)` | 切換當前檢視酸桶。 |
| `renderLive()` | 渲染當前桶的槽內零件表 + 桶頭 + 彙總橫幅。 |
| `removePart(id)` | 離槽 → 算 `actualMin` → 判定 → 寫入 records（5.2）。 |
| `renderRecords()` | 渲染出槽紀錄表（分鐘）。 |
| `addBtn.onclick` | 模擬「RFID 進槽」：建 part(`fetching`) → `setTimeout(FETCH_MS)` 後由 `HOST_DB` 帶回參數 → 啟動計時。**此處即上位系統串接點。** |
| `tick()` | 每秒：更新時鐘、漂移 RSSI、重繪 Live。 |

可調常數（檔頂）：`RSSI_THRESHOLD=-50`、`NEAR_WINDOW=15`、`FETCH_MS=1300`、`SPEED=3`（demo 加速，**生產設 1**）。

---

## 7. 整合點：目前 mock vs 需接真實系統

> 核心原則：**`evalPart()` / 判定 / 渲染邏輯維持不變**，只替換「資料從哪來」。

### 7.1 上位系統 (Host/MES) — 取代 `HOST_DB`
原型用本地物件查表；生產改為 API。建議契約：

**Request**：`GET /host/process-params?pn={PN}&sn={SN}`
**Response**：
```json
{
  "pn": "PN-AX5074",
  "sn": "SN-386098",
  "acid": "STM-14",
  "reqMin": 1,
  "maxMin": 2,
  "partName": "AMAX-5074 噴淋盤"
}
```
- 找不到 PN → 回 404/錯誤碼；UI 應呈現「查無參數，請洽工程」之失敗狀態（原型未含失敗狀態，**需補**）。
- `maxMin` 若實際無上限：回 `null`，判定端只跑 UNDER/PASS。

### 7.2 RFID / RSSI 即時來源 — 取代 `addBtn` 與 `tick()` 的 RSSI 漂移
需要一條即時事件流（建議 WebSocket / SSE）提供：
- **進槽事件**：`{tankId, pn, sn, rc, ts}` → 建立 part、`start=ts`、觸發 7.1 查參數。
- **離槽事件**：`{tankId, sn, ts}` → 呼叫 `removePart()`（以 `ts` 為離槽時間計算 `actualMin`）。
- **RSSI 更新**：`{sn, rssi, ts}` → 更新該 part 的 `rssi`（用於 weak 判定與「是否仍在槽內」）。

> 「在槽 / 離槽」判讀方式（持續讀到 tag = 在槽；讀不到逾時 = 離槽）由 RFID 中介軟體決定門檻；`RSSI_THRESHOLD` 僅作弱訊號提示，不等於離槽。請與硬體確認。

### 7.3 酸桶設定 — 取代 `TANKS`
來自 MES / 酸桶管理：`{tankId, station, acid}`。換酸時更新 `acid`，並決定既有槽內零件如何處理（重新判錯槽）。

### 7.4 紀錄持久化（原型缺，需新增後端）
`removePart()` 產生的 record 須寫入資料庫供稽核/報表。建議欄位即 §4.4，另加 `tankId, enterTs, leaveTs, elapsedSec, operator, hostParamsSnapshot`（保留當下上位系統參數快照，利於追溯）。

---

## 8. 建議生產架構（參考，非強制）

```
[RFID reader / middleware] --(進/離槽, RSSI 事件)--> [Backend]
                                                       |  └─ 查 [Host/MES API] (PN/SN → 酸種, reqMin, maxMin)
                                                       |  └─ 寫 [DB: 出槽紀錄]
                                                       └─(WebSocket/SSE 推播 + REST)
[Frontend 監控站 (本原型演進)] <----------------------┘
```
- 判定邏輯（`evalPart` 等）可放前端即時呈現；但**最終 result 應由後端在離槽事件時計算並落庫**（前端僅顯示），避免前端時鐘/離線造成不一致。
- 多酸桶可做成多面板或維持本原型的酸桶切換。

---

## 9. 驗收條件 (Acceptance Criteria)

1. 進槽：讀到 PN/SN → 顯示「查詢上位系統中」→ 取得參數後開始計時；查無參數有明確失敗提示。
2. 現場計時到秒；剩餘、過浸超時皆為秒。
3. 離槽：以分鐘認定，依 §5.2 正確判 PASS / UNDER / OVER / WRONG，並落庫。
4. 規則 2：同桶僅一酸；規格酸種 ≠ 本桶 → 錯槽警示；over/wrong 觸發頂部橫幅。
5. 規則 1 邊界：實際 130 秒、要求 1 分/上限 2 分 → 現場曾過浸但離槽判 **PASS（2 分 ≤ 上限 2 分）**（若改 `floor` 規則須一併調整測例）。
6. 弱訊號：`rssi < -50` → 訊號微弱提示，不等於離槽。
7. `SPEED=1`，時間為真實秒。

---

## 10. 待 ROY 確認的開放問題（**動工前釐清**）

| # | 問題 | 原型暫定 |
|---|---|---|
| 1 | 酸洗有無「浸泡上限」？只看最少浸泡的話 `maxMin` 取消，判定只留 UNDER/PASS。 | 有上限 = 要求+1~2 分 |
| 2 | 分鐘換算用 `round` 還是 `floor`（完成整分鐘）？ | `round` |
| 3 | 各酸種 / 各 PN 的實際 `reqMin` / `maxMin` 數值。 | STM-14=1、STM-31=3、STM-07=2（皆示意） |
| 4 | 錯槽是「僅警示」還是「禁止進槽 / 需簽核」？ | 僅警示 |
| 5 | 「在槽 / 離槽」由 RFID 如何判讀？RSSI 門檻與逾時值。 | `-50 dBm` 僅作弱訊號 |
| 6 | 一個現場同時監看幾個酸桶？是否需多桶同畫面。 | 酸桶切換（單桶檢視） |
| 7 | 找一張**實際含酸洗 step 的 Runcard**作為欄位/數值校準依據。 | — |

---

## 11. 詞彙表

| 詞 | 說明 |
|---|---|
| 酸代號 / 酸種 | 酸液配方代號（STM-14、STM-31…），酸桶層級屬性。 |
| 要求 reqMin | 規格要求之最少浸泡分鐘，per-PN 由上位系統提供。 |
| 上限 maxMin | 過浸門檻分鐘；超過視為過浸。 |
| 過浸 OVER | 浸泡超過上限，恐損傷零件。 |
| 錯槽 WRONG | 零件規格酸種與所在酸桶酸種不符。 |
| 上位系統 Host/MES | 依 PN/SN 提供製程參數之上層系統。 |
| RC / Runcard / 流程卡 | 該零件之製程卡。 |
| PN / SN | 料號 / 序號，由 RFID tag 讀回。 |

---

*本文件描述至原型凍結時點之規則；§3 三條規則為需求方確認、§10 為待確認項。實作前請先取得 §10 之答覆與一張實際酸洗 Runcard。*
