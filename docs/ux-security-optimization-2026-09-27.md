# 2026-09-27 全面優化與驗證

## 範圍

使用者指定同時改善操作、手機版面、視覺、效能與安全。本輪接續 [第一輪分析](optimization-review-2026-09-26.md)，保留原有未提交變更，未改動臨床處方規則、PAR-Q 分級、心率／RPE 區間或熱量公式。

分支為 `optimize/2026-09`，基準 HEAD 為 `61a58df2554070936b74ecd5e83e81a24fb84232`。本報告完成驗證時，變更尚未提交；使用者隨後於 2026-09-27 指示 commit 與 push。目前未合併至 main 或部署，下列結果均為本機驗證。

## 使用者可見的改變

| 問題 | 完成的改善 |
| --- | --- |
| 首頁層次密集，手機使用者不易快速開始 | 重整標題、簡介、開始按鈕及三步驟說明；使用柔和藍灰、簡單分隔線及留白；320px 與 390px 首屏可操作開始按鈕。 |
| 結果頁的 AI 與參考說明干擾主要處方閱讀 | 醫療提醒之後先顯示標準處方摘要，接著提供下載／修改；AI 移至詳細處方之後；強度與 MET 參考使用可由鍵盤操作的 `details`。 |
| 草稿自動儲存卻沒有清除入口 | 顯示暫存／還原狀態，新增原生確認對話框；取消與 Escape 保留資料，確認後清除問卷、衍生數值、處方、AI 回覆與自帶金鑰。 |
| 清除時仍有延遲儲存或 AI 請求 | 清除前取消 debounce，送出成功也取消尚未執行的儲存；中止 AI 並更新請求序號，避免即使忽略 abort 的舊回應重新顯示資料。 |
| PDF 同時點擊或元件下載失敗時難以恢復 | 共用 `pdf-loader.js`，合併同時的元件載入、保留成功下載、失敗可重試；兩入口下載時停用按鈕，完成／失敗後清理並恢復。 |
| AI 用途說明對第三方留存及免費服務過度承諾 | 說明資料會轉送至第三方；自動模式依本站設定；模型提示反映官方文件的帳號限制，Groq 支援選填自帶金鑰。 |

## 安全與載入

- 兩個 HTML 入口已移除行內 script、onclick、oninput、onchange，改由外部 JS 的明確事件綁定處理。CSP `script-src` 移除 `unsafe-inline`，`script-src-attr` 設為 `none`；`style-src` 仍保留既有 inline style 支援。
- DOMPurify 固定為 3.4.16；下載 CDN 實際內容後計算 SHA-384 SRI，瀏覽器確認版本、清洗惡意 HTML 與清洗器缺失時拒絕顯示。這是維護與防護更新，不代表已證明原版曾遭利用。
- CSS 最終為 **36,566 bytes**，相對優化前的 79,727 bytes 減少約 **54%**。相較第一輪 31,406 bytes，本輪新增版面樣式增加 5,160 bytes。此為未壓縮檔案大小，沒有宣稱等比例的載入時間改善。
- 共用 PDF loader 為 1,611 bytes；jsPDF／html2canvas 仍到下載時才載入，同時呼叫只下載兩個元件各一次。未加入新的 npm 依賴。

## 驗證範圍

```bash
npm test
npm run build:pages
bash tests/browser/run_all.sh
git diff --check
```

- Node：18/18，包括 Functions 與打包隔離測試。
- 打包：12 個資產；CSS 內容比對與 JS 語法檢查。
- 九組瀏覽器測試使用與 `_headers` 相同的 CSP：無障礙、AI 流程、CSP、資料清除、真實多步填表、資源清理、獨立 PAR-Q 互動、PDF 匯出、規則引擎。
- 320／390／1280px：小數輸入、錯誤聚焦、完整表單送出、草稿重載、進度、取消／確認清除、舊回應隔離，以及結果頁無水平溢出。
- CSP：行內 script 與事件屬性實際被瀏覽器阻擋，外部應用程式正常運作。AI mock 的惡意 HTML 被清洗；沒有呼叫付費 AI 上游或使用真實健康資料。
- PDF：兩入口在正式 CSP 與真實 CDN/SRI 下完成下載，檔案有有效 `%PDF-` 開頭且非空；也覆蓋重複點擊、載入失敗與重試。檔案大小約 5.4MB／5.9MB，仍為原本的整頁影像 PDF，本輪未做逐頁排版／文字層審查。
- 舊無障礙測試把全部群組硬編碼為 13 且只接受 `aria-labelledby`；新增的結果操作使用合法 `aria-label`。已改成維持 13 個表單群組，並檢查全頁所有群組均有可讀名稱。

最終執行結果與截圖位於 `.claude/audit/ux-20260927/`（gitignored）；可重跑的測試保留於 `tests/browser/`。沒有 TypeScript 設定，不宣稱 typecheck 或 WCAG 全面認證。

## 供應商文件查證

查證時間：2026-09-26 至 27；未使用實際帳號逐一呼叫模型，官方列出不等於本站金鑰具有存取權。

- [DOMPurify releases](https://github.com/cure53/DOMPurify/releases)：3.4.16；前端固定 CDN 版本與 SRI。
- [Groq models](https://console.groq.com/docs/models)：GPT-OSS 120B／20B 列於支援模型，Llama 3.1 8B Instant 列有 Enterprise 帳號限制；更新介面提示，未改 allowlist。
- [Gemini models](https://ai.google.dev/gemini-api/docs/models)：2.5 Flash／Pro 有既有使用者限制；移除無條件推荐措辭並顯示限制。
- [OpenAI GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1) 與 [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini)：官方模型頁確認 ID。其餘模型的現有設定維持，不把本輪文件核對當作所有模型的實際可用性驗證。

## 未完成的外部事項

- 本輪尚未發布；線上仍需在部署後獨立驗證，不可將本機測試當成上線證明。
- `.claude/HANDOFF.md` 原有四項醫療複核保留：q7 分級、q1 高血壓心率限制、asthma 文案來源、兒少高風險每日活動原則。
- Cloudflare 登入與實際部署方式、帳號模型權限、Blogger 嵌入版本尚未查證；AI streaming、auto fallback、嚴格集中式限流、文字層 PDF 未在本輪實作。
