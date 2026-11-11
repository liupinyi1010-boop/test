# 估價嗎耶通

最方便的語音估價單：打開網頁，按麥克風說施工內容，也可以順便說客戶姓名、電話和地址。說完就在下方出現整份報價單預覽（跟列印／PDF 同一種格式），再按「下載報價單」選 PDF 或 Excel。如需修改，請在 Excel 裡自行調整。

GitHub Pages 請用這個網址開啟，以免快取到舊檔（v3 在 `maye3/` 資料夾）：

`https://liupinyi1010-boop.github.io/test/maye3/?v=3.4`

若要從 LINE 開啟並使用麥克風／語音辨識，建議加上強制外部瀏覽器參數：

`https://liupinyi1010-boop.github.io/test/maye3/?v=3.4&openExternalBrowser=1`

## 檔案
- `index.html`：估價嗎耶通網頁（以手機為主，大字、大按鈕）
- `styles.css`、`app.js`、`ai-adapter.js`：畫面與邏輯
- `price_db.json`：水電／木工／油漆市場行情（不虛構單價）
- `taigi_terms.json`：台語／工地用語與同音字變體
- `user_corrections.json`：師傅確認的語音聽寫優先修正（可再追加；產生估價單前先套用，不在畫面列出原文）
- `exceljs.min.js`：匯出 Excel 用

語音使用瀏覽器內建辨識（需 https）。若瀏覽器不支援，請改打字、用鍵盤聽寫，或改用 Safari／Chrome。雲端估價走既有轉接服務。沒有行情的項目標「待填」。離開再回來資料會保留，除非重新錄音或按清除。產生後直接顯示整份報價單預覽（不是一列一個框，也不再列出辨識原文）；不能在畫面上改欄位；下載的 Excel 可改數量與單價，複價與合計會自動重算。錄音時麥克風下方會出現簡短即時文字。
