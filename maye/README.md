# 估價嗎耶通

最方便的語音估價單：打開網頁，按麥克風說施工內容，說完就出估價單，再自己改數量與單價。

GitHub Pages 請用這個網址開啟，以免快取到舊檔：

`https://liupinyi1010-boop.github.io/test/maye/?v=1`

若要從 LINE 開啟並使用麥克風，建議加上強制外部瀏覽器參數：

`https://liupinyi1010-boop.github.io/test/maye/?v=1&openExternalBrowser=1`

## 檔案
- `index.html`：估價嗎耶通網頁（以手機為主，大字、大按鈕）
- `styles.css`、`app.js`、`ai-adapter.js`：畫面與邏輯
- `price_db.json`：水電／木工／油漆市場行情（不虛構單價）
- `taigi_terms.json`：台語／工地用語對照
- `exceljs.min.js`：匯出 Excel 用

麥克風需在 https 網址下才能使用。台語辨識與雲端估價走既有轉接服務；打字產生估價單不扣辨識次數。沒有行情的項目標「待填」。
