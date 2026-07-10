# GitHub Pages 部署（純前端選項）

> **重要警告**：GitHub Pages 只能託管靜態檔案，跑不了 Express server。
> 本專案的 AI 建議功能依賴 `server.js` 的 `/api/ai-recommendation` 端點，
> 照本文部署後 **AI 建議功能不可用**，只剩前端的規則式處方（FITT-VP 計算、
> PAR-Q 風險分級、BMI/BMR/TDEE、MET 熱量）。
>
> 要完整功能請部署到能跑 Node.js 的平台（例如 Zeabur、Render、Fly.io），
> 執行 `npm install && npm start` 並設定 `.env` 即可。

## 部署步驟

1. 在 GitHub 建立 public repository。
2. 上傳這些檔案：`index.html`、`script.js`、`multi-step-form.js`、`tailwind.css`、`parq-form.html`、`parq-script.js`、favicon 相關檔案。不需要上傳 `server.js`、`package.json`、`*.py`。
3. 到 repository 的 Settings → Pages，Source 選 Deploy from a branch，Branch 選 main、Folder 選 `/ (root)`，按 Save。
4. 等幾分鐘後網站會出現在 `https://<你的帳號>.github.io/<repo 名稱>/`。

## 注意事項

- 頁面上的 AI 建議按鈕會因為打不到 `/api/*` 而失敗，這是預期行為。
- 更新檔案後需等幾分鐘才會生效。
- 需要嵌入其他網站（如 Blogger）時，用 iframe 指向上面的網址即可。
