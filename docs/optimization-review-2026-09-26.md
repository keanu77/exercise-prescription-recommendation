# 2026-09-26 網站分析與優化

> 後續狀態：CSP 行內事件移除、清除資料介面、版面整理與真實 PDF 匯出已在 [2026-09-27 第二輪](ux-security-optimization-2026-09-27.md) 完成。下列大小、資產数與測試數是第一輪當時紀錄。

## 範圍與版本

- 基線：`optimize/2026-09` / `61a58df`，開始時工作目錄乾淨。
- 已唯讀查詢遠端：`main=af0579c`、`optimize/2026-09=61a58df`；原交接的「未 push」記錄已過時。
- 審查主表單、獨立 PAR-Q+ 頁、AI proxy、安全保護、CSS 與打包流程；先掃描候選，再依實際原始碼／重現排除假陽性。
- 本輪修正留在工作目錄，沒有 commit、push、merge 或部署。未改處方計算規則、PAR-Q 分級、心率／RPE 區間或熱量公式。

## 已修正的問題

共 14 項：P1 4 項、P2 10 項。小數輸入與隱藏欄位驗證合併處理，形成 13 組修復。

| 優先級 | 問題與重現 | 修正與驗證 |
| --- | --- | --- |
| P1 | `auto` 加任意 `customApiKey`，KV 故障時仍可用站方金鑰呼叫 AI | provider 解析回傳實際金鑰來源；缺 KV、讀取失敗、寫入失敗均回 503 且零上游呼叫。明確 BYOK 仍使用使用者金鑰。 |
| P1 | 超範圍數值能進入下一步，送出被隱藏欄位的原生驗證攔住 | 主表單統一逐步驗證 required、range、step；送出前回驗三步並顯示／聚焦錯誤欄位；Enter 在前兩步執行下一步。 |
| P1 | `170.5 cm / 70.5 kg` 被預設 `step=1` 拒絕 | 兩入口身高與體重明定 `step=0.1`，以實際填表和送出驗證。年齡維持整數。 |
| P1 | 多餘 `</div>` 使後兩步離開 `healthForm` 的 DOM 子樹；進度與草稿漏接 | 移除多餘標籤；斷言三步都在表單內，並驗證 15 組資訊進度、PAR-Q 草稿儲存及重新載入還原。原本 `input.form` 仍指向表單，單看它會漏掉問題。 |
| P2 | Body 100KiB 限制在完整讀完後才生效 | 改為按 bytes 逐塊計數，超量立即取消；2MiB 串流在第二個 64KiB chunk 就停止。覆蓋跨 chunk 中文 UTF-8、恰好上限與讀取失敗。 |
| P2 | 獨立 PAR-Q 清空資料後殘留 TDEE／熱量建議 | 清空或無效輸入時同步重設衍生數值；正常資料恢復後重新計算。 |
| P2 | 進度漏算運動習慣／目標，讀屏進度只在換步時更新 | 納入 15 組必填資訊，無效數值不算完成，百分比和 `aria-valuenow` 同步。 |
| P2 | 獨立 PAR-Q 換頁後焦點停在隱藏頁 | 更新文件標題並聚焦新頁標題，首次載入不搶焦點。 |
| P2 | 獨立 PAR-Q 是／否選项沒有題目群組名稱 | 七個具名 `radiogroup`；原生 `change` 同步答案與樣式，實測方向鍵作答。 |
| P2 | AI 選單／金鑰 label 沒關聯、展開狀態不明 | 補 `for`、`aria-describedby`、`aria-controls` 與同步的 `aria-expanded`。 |
| P2 | 驗證邊框覆蓋已填欄位唯一的焦點提示 | 加上獨立 `focus-visible` outline，保留有效／無效狀態色。 |
| P2 | Tailwind safelist 過度匹配 | 錨定 regex，明確列出前端來源，保留動態風險色彩。CSS 79,727 → 31,406 bytes，減少約 61%。此為檔案大小比較，未聲稱相同比例的載入時間改善。 |
| P2 | 打包只看部分檔案 mtime，HTML/JS 新 class 缺樣式仍可通過 | 在暫存目錄重新編譯並比對 CSS；測試證明 checkout 時間無影響、新 class 缺 CSS 會失敗，且保留原 `dist/`。 |
| P2 | 獨立 PAR-Q PDF 失敗後遺留載入提示／報告 DOM | `finally` 清理，防重複點擊並恢復按鈕；載入 script 失敗可重試。以 mock 模擬載入、canvas 失敗及後續成功。 |

另外將手機首頁的「開始使用」移至標題後，320／390px 的第一個畫面就能操作；表單換頁初始化改成同步，避免延後回到第一步。測試啟動器使用隨機埠並自動關閉自己的伺服器，避免誤用舊服務。

## 驗證

```bash
npm test
npm run build:pages
bash tests/browser/run_all.sh
git diff --check
```

- Node：18/18 通過，涵蓋 Functions 與隔離打包測試。
- Build：`dist/ ready: 11 files`；CSS 編譯比對與 JavaScript 語法檢查通過。
- 主表單真實互動：320／390／1280px 通過；數值／小數、錯誤復原、鍵盤、進度、草稿重載、結果頁與 AI label 均覆蓋，結果頁無水平溢出。
- 獨立頁互動：小數、失效數值清除、鍵盤問卷、標題焦點與 PDF 失敗重試通過。
- 六組完整瀏覽器回歸全數通過。紀錄：`.claude/audit/codex-20260926/browser-final.log` 與 `node-final.log`；手機前後截圖在同一目錄。
- 無新增／升級套件；`npm audit --omit=dev` 回報 0，僅涵蓋 npm production 依賴，不涵蓋 CDN 函式庫。專案沒有 TypeScript／typecheck 設定，使用 JS 語法與執行測試。
- AI upstream 全部 mock，未送出真實健康資料或消耗供應商額度。PDF 新增測試驗證錯誤清理與重試，不等同完整下載 PDF 的排版驗證。

## 尚待處理

- 公開首頁於本輪瀏覽器唯讀檢查回傳 200，但 CSP 仍是先前版本（允許直連 AI 供應商），未含本地新 HSTS。未部署本輪修正；本機通過不代表線上已更新。
- 原交接的四項醫療內容待醫師複核仍保留：q7 分級、q1 高血壓的心率限制、asthma 文案依據、兒少高風險每日活動原則。本輪不是醫療內容查核。
- 模型 ID 的即時供應狀態、Cloudflare 登入與部署方式、Blogger 嵌入版本尚未重新查證。前後端模型清單一致性有測試，不能替代供應商可用性驗證。
- 原有的 CSP inline handlers、sessionStorage 清除介面、AI streaming／fallback、文字層 PDF，仍是後續獨立工作。

本機細部候選、對抗複核與重現位於 `.claude/audit/codex-20260926/`（gitignored）；本文件保留可隨版本交付的摘要。
