# Soak Line Demo · 酸洗浸泡產線模擬

互動式 UI 原型（React + Vite + @dnd-kit），模擬 RFID Tag 在酸洗浸泡產線的流動。純前端、無後端業務邏輯。

## 三個頁面
- **產線俯視圖 Line Map**：拖拉 Runcard 走單向流程 `Signin → IQC → 清洗區 Tank → HPW`（清洗區 ↔ 移出區 可互換）；酸種瓶倒入 Tank 的 Acid/PW 區；拖曳時全畫面變暗、只亮可放入點。
- **現場螢幕 Operator Screen**：Tank 前的大字倒數 / 請放入 / 異常提示；左右切換面板、切換 Tank。
- **監控站 Monitor**：以酸桶為單位的即時狀態與出槽紀錄。

特色：中／英 i18n 一鍵切換、全頁 RWD、一鍵重置、扁平銳利無漸層風格。

## 開發 Development
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產出 dist/
npm run preview  # 預覽 build 結果
```

## 部署 Deploy
`vite.config.js` 已設 `base: './'`（相對路徑），可直接部署到網域根目錄或 GitHub Pages 子路徑。
