# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

運動處方推薦系統：依 ACSM FITT-VP 原則與 WHO 2020 身體活動指引產生個人化運動處方。前端為純靜態頁面（無 build step），後端為 **Cloudflare Pages Functions**（`functions/`），作為多家 AI 供應商的 proxy。線上：https://exerciseprescription.sportsmedicine.tw/

## 常用指令

```bash
npm run dev        # 本機開發伺服器（scripts/dev-server.mjs，直接載入 functions/ handler，可離線）
npm test           # Pages Functions 與打包回歸測試（tests/*.test.mjs，node --test，mock 上游）
npm run build:css  # 重新編譯 Tailwind：src/input.css → tailwind.css（改動 class 後必跑並 commit）
npm run build:pages   # 打包 dist/（含資產齊全、tailwind.css 新鮮度、JS 語法檢查）
npm run deploy     # build:pages → wrangler pages deploy dist

python met_introduction.py   # *.py 為可獨立執行的領域知識參考腳本，非執行期依賴
```

- **Tailwind 是預編譯的，不是 CDN**：`index.html` / `parq-form.html` 載入 `/tailwind.css`，由 `src/input.css` 經 tailwind CLI 編譯後 commit。新增/修改 class（含 JS 動態產生的）後必須 `npm run build:css`，否則新 class 被 purge 掉不會生效。`build-pages.sh` 會在暫存目錄重新編譯並比對 `tailwind.css`；內容不一致就拒絕打包，涵蓋 HTML/JS class，且不依賴檔案修改時間。動態 `${parqColor}` 類別靠 `tailwind.config.js` 的 safelist 保留。
- **瀏覽器回歸**：`bash tests/browser/run_all.sh` 使用 Python Playwright，自動在隨機可用埠啟動本 checkout 的靜態伺服器並於結束關閉；九支腳本包含規則引擎、AI、無障礙、前端資源、兩入口填表、資料清除競態、CSP 與實際 PDF 匯出。伺服器套用 `_headers` 的同一份 CSP，避免開發時正常、部署後被攔截。可加檔名只跑單支（例如 `bash tests/browser/run_all.sh test_form_journey.py`）。預設使用 `/usr/bin/python3` 與 macOS 的使用者套件目錄，可用 `PY` / `PYTHONPATH` 覆寫；自行起伺服器時可設定 `BASE_URL`。後端與打包測試用 `npm test`。
- `archive/blogger/` 內是舊的 Blogger 嵌入副本（已封存），用 Tailwind CDN、沒有 PAR-Q、邏輯與主站各自漂移，不會部署。改主站時**不要**同步它們；要嵌入請用 iframe 指向線上網址（見 `archive/blogger/README.md`）。

## 架構重點（需跨檔閱讀才能理解的部分）

### 兩段式處方：client 算 baseline，AI 只做「補充說明」
1. 使用者填完 `index.html` 的多步驟表單後，**`script.js` 在前端完成確定性計算**：`calculateFITTVP()` 產生 FITT-VP 處方、`assessPARQRisk()` 算 PAR-Q 分級、`calculateBMI/BMR/TDEE()`、MET 熱量。這份結果先直接顯示。
2. 結果頁的 AI 區塊先顯示資料用途說明，**使用者按下按鈕後**才把 `userData`（含前端算好的 `prescription`）POST 到 `/api/ai-recommendation`。server 不重算處方，只把正規化後的資料餵給 AI。
   → 改處方邏輯要改 `script.js` 的 `calculateFITTVP`；改 AI 輸出要改 `functions/_lib/ai.js` 的 `SYSTEM_PROMPT`。兩者是獨立的兩套邏輯。

### 表單與輸出流程
- 主入口先呈現標準處方與下載／修改操作，AI 是選用補充；強度與 MET 參考使用原生 `details`，醫療提醒仍直接顯示。
- 草稿只用本分頁 `sessionStorage` 的 `exerciseRxFormDraft`。`clearAssessment()` 須取消 debounce、清除表單／衍生結果／自帶金鑰，並透過 `resetAISection()` 中止 AI 請求與隔離舊回應，避免已清除資料回流。
- `pdf-loader.js` 由兩入口共用，依需求載入 jsPDF／html2canvas、合併同時請求、失敗可重試。两入口的 `downloadPDF()` 各有防重複與 `finally` 清理。新增前端資產須同步 `scripts/build-pages.sh` 與 `tests/build.test.mjs`。
- DOMPurify CDN 固定 3.4.16，搭配 SRI；升級需重新計算 SRI 並跑 AI 與 CSP 瀏覽器測試。

### calculateFITTVP 的規則優先序（改規則前必讀）
- 年齡層基準 → 體能 → 運動習慣（起始量）→ 目標 → 疾病 → 限制 → PAR-Q，**但疾病 / 限制 / PAR-Q 只透過 `caps` 設「安全上限」**（`capIntensity` / `capFrequency` / `capTime` / `hrZoneUnsafe`），不直接改處方。
- 所有規則跑完後由 `applySafetyCaps()` 統一套用上限，並重算 `weeklyMinutes`、`volume`、`heartRateZone`。**任何新規則都不得在 `applySafetyCaps` 之後再改 frequency / time / intensity。**
- `intensity` 一律是 enum key（`light` / `light-moderate` / `moderate` / `moderate-vigorous`），顯示文字由對照表產生；後端驗證只接受這四個值。
- 心率區間依最終強度給（`HEART_RATE_ZONES`，ACSM %HRmax：輕 57-63、中 64-76、劇 77-95）；PAR-Q+ q1 心臟病／高血壓、q5 服藥、疾病選項心臟病史、心悸、PAR-Q+ 高風險時 `heartRateZone = null` 改用 RPE（Borg 6-20：輕 9-11、中 12-13、劇 14-17）。
- 兒童青少年維持每日活動原則，PAR-Q+ 低風險的體能微調只套用於成人且有規律運動習慣者。

### PAR-Q+ 分級（三處必須一致）
題目為 **PAR-Q+ 2025 第 1 頁 7 題**（eparmedx.com，官方中文版 2026-01 轉繁體），不是舊版 PAR-Q 2002。`script.js assessPARQRisk`、`parq-script.js assessParqLevel`、`functions/_lib/ai.js assessParqLevel` 三處規則相同：
- 官方規則是二元：全「否」→ 可開始（>45 歲且不習慣劇烈運動者，劇烈強度前先諮詢合格運動專業人員）；任一「是」→ 完成第 2、3 頁追蹤問題／ePARmed-X+ 並諮詢；取得許可前僅低強度（ePARmed-X+ 醫師許可表 2026）。
- 分級只決定處方保守程度，對應 ACSM 2015 運動前篩檢演算法（GETP 11th）：q2 胸痛、q3 頭暈／失去意識（徵候症狀）、q7 醫囑須醫療監督 → `high`（任何強度前先評估，cap light）；其他任一「是」→ `moderate`（已知疾病／服藥且已規律運動者 cap moderate，否則 cap light-moderate）；全「否」→ `low`。
- q1 心臟病／高血壓、q5 服用處方藥 → `hrZoneUnsafe`，不給心率區間改用 RPE（ACSM）。
- 改規則要三處一起改，並更新 README 的說明。

### functions/：四家 AI provider 的統一 proxy
- `functions/api/ai-recommendation.js`：CORS → 讀 body（100KB）→ `validateUserData` 正規化 → 限流 → 依 `provider` 呼叫 → 統一 JSON。`auto` 依 `AUTO_ORDER`（Groq → Claude → Gemini → OpenAI）挑第一家有金鑰的，**沒有失敗 fallback**（避免默默燒付費額度）。
- `functions/_lib/ai.js`：`validateUserData` 回傳 `{valid, errors, data}`，**`buildUserSummary` 只吃 `data`**。所有 enum（含 `diseases` / `limitations` 元素、`prescription.intensity`）走白名單；新增表單選項時要同步補 `diseaseMap` / `limitationMap` 等對照表（它們同時是白名單來源）。
- `MODEL_ALLOWLIST` / `DEFAULT_MODELS` 在 `ai.js`；**前端 `script.js` 的 `AI_PROVIDERS` 清單必須同步**，否則後端回 400。
- 限流（`functions/_lib/http.js checkRateLimit`）是 KV 計數、盡力而為；回傳 `degraded` 時，站方金鑰的請求 fail-closed 回 503，只有實際使用自帶金鑰的請求放行（`auto` 一律使用站方金鑰）。
- **AI 輸出是 HTML 不是 markdown**：`SYSTEM_PROMPT` 要求 `<div class="ai-section">…</div>` 結構，前端 `DOMPurify.sanitize()` 後才 `innerHTML`；DOMPurify 未載入時顯示錯誤，不 fallback。回應含 `truncated` 旗標時前端會顯示提示。

### 表單驗證與前端多入口
- 主表單 `novalidate` 由 `validateCurrentStep(step)` 統一處理 required、min/max、step 與單選；最終送出重新驗證全部步驟，顯示並聚焦第一個錯誤。身高／體重接受一位小數，年齡維持整數。
- 三個 `.form-step` 必須都是 `#healthForm` 的後代，事件委派與草稿查詢依賴此結構；不可只檢查 `input.form`。
- 進度計算包含 15 組必填資訊，在 `updateFormProgress()` 同步視覺與 `aria-valuenow`。

### 前端多入口（彼此獨立，勿混用）
- `index.html` → `script.js` + `multi-step-form.js`（主應用）。
- `parq-form.html` → `parq-script.js`（獨立的 PAR-Q+ 問卷版本，自帶一份 `showPage()`）。

## 部署與 CSP（最容易踩雷處）

- 部署為 Cloudflare Pages（CLI 上傳，非 git 連結）：`npm run deploy`。Secrets 用 `npx wrangler pages secret put <KEY> --project-name exercise-prescription`；非機密設定在 `wrangler.toml` 的 `[vars]`。
- **安全標頭與快取全在 `_headers`**（不是程式碼）。新增外部資源時必須同步更新 CSP：cdnjs 的 JS → `script-src`；Google Fonts → `style-src` / `font-src`。瀏覽器不直連 AI 供應商，`connect-src` 只有 `'self'`。
- CSP 的 `script-src` 不允許 `unsafe-inline` 或 `unsafe-eval`，`script-src-attr` 為 `none`。兩入口只載入外部 JS；互動用 `data-action` / `data-page` 與明確的 `addEventListener`，不可新增行內 script 或 onclick。`style-src` 保留 `unsafe-inline` 供既有版面與 PDF 使用。
- JS/CSS 沒有內容 hash，`_headers` 對 `/*.js` `/*.css` 設 `max-age=0, must-revalidate`，靠 ETag 避免新 HTML 搭舊 JS；不要改回長快取。
- Zeabur 版 Express server 已於 2026-09-26 移除（git tag `zeabur-final` 可回溯）。本機開發一律 `npm run dev`。
