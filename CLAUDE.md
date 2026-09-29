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
- **瀏覽器回歸**：`bash tests/browser/run_all.sh` 使用 Python Playwright，自動在隨機可用埠啟動本 checkout 的靜態伺服器並於結束關閉；十三支腳本包含規則引擎、AI、生活情境與舊快取更新、無障礙、前端資源、兩入口填表、資料清除競態、CSP 、實際 PDF 匯出與四尺寸運動風格版面／追蹤連結，以及桌面初次顯示／字體失敗版面。伺服器套用 `_headers` 的同一份 CSP，避免開發時正常、部署後被攔截。可加檔名只跑單支（例如 `bash tests/browser/run_all.sh test_form_journey.py`）。預設使用 `/usr/bin/python3` 與 macOS 的使用者套件目錄，可用 `PY` / `PYTHONPATH` 覆寫；自行起伺服器時可設定 `BASE_URL`。後端與打包測試用 `npm test`。PDF 測試另外需要 Poppler `pdftotext`，會驗證完整文字、頁碼、無重疊及列印邊界；`PDF_BROWSERS=webkit` 可搭配 HTTPS runner 驗證 WebKit。
- `archive/blogger/` 內是舊的 Blogger 嵌入副本（已封存），用 Tailwind CDN、沒有 PAR-Q、邏輯與主站各自漂移，不會部署。改主站時**不要**同步它們；要嵌入請用 iframe 指向線上網址（見 `archive/blogger/README.md`）。

## 架構重點（需跨檔閱讀才能理解的部分）

### 兩段式處方：共用規則＋選用個人化 AI 報告
1. `prescription-rules.js` 包含原樣抽出的 `calculateFITTVP`、PAR-Q 與 safety caps，供瀏覽器及 Pages Function 共用。修改規則時在此檔操作；`script.js` 處理表單與顯示。
2. `ai-ui.js` 先讀取 `/api/providers` 目錄，使用者同意後送 schemaVersion:3、表單資料與選填 coachingContext（個人問題、時間、場地、器材與偏好）。伺服器嚴格驗證完整問卷、忽略 client 處方並重算可信 baseline。
3. `functions/_lib/coaching.js` 建立可信處方邊界，由伺服器 decisionFrame 固定適用行動、條件式備案與回顧，AI 專責問題回答、行動／備案理由及追問措辭；伺服器組成 report version 2 的六節報告，保留所有 warnings。成人模型提示取得處方活動類型、強度、年齡層與定性的可用時間；兒少僅以喜歡且熟悉的活動為目標，不傳送處方類型／強度供模型推斷生理效果，精確劑量與完整原處方留在伺服器呈現；模型不得另開數字課表；具體日期與可用時間由伺服器在原處方內安排，缺資料明示未知。有症狀、需諮詢或兒少者不新增數字課表；模型只能提高需諮詢警戒，不能降低原問卷風險。明顯違規文字會拒收，但驗證不代表醫療正確性。前端只用 textContent。`advice.js` / `report.js` 保留作舊模板比較及既有 baseline context，不再使用舊 ID-only 回覆流程。
4. 規則不變證據是 `tests/fixtures/ai-cases.json`：抽取前 30 案例輸出逐欄比對；另測 128 組 PAR-Q。醫療待複核項仍有效。

### 運動風格與圖片
- 兩入口使用 `.site-app` 共用剪紙風格：米白紙面、亮萊姆綠主色，搭配海藍／霧藍與跑道磚紅紙層；主表單 desktop 左側步驟欄、mobile 橫向步驟。標題與正文 Noto Sans TC 無襯線、英文及數字採正常字寬 system-ui；899px 以下評估頁回到單欄。原始圖片來源見 `docs/cut-paper-design-2026-09-27.md`；最新亮綠／藍／跑道色與字體調整見 `docs/blue-typography-2026-09-27.md`。
- 首頁版型重整見 `docs/layout-rework-2026-09-27.md`：1184px 共用寬度，3:2 原圖、無進場隱藏。禁止重新加入預設隱藏主內容的動畫；`test_desktop_layout.py` 預設 Chromium，可透過 `LAYOUT_BROWSERS=chromium,webkit` 在 HTTPS 驗證。
- 首頁圖片在 `assets/sports-paper-{720,1440}.webp`，有 srcset、固定尺寸與優先載入；使用者選定 D 剪紙拼貼，原圖 `assets/hero-options/d-cut-paper-collage.png`，完整提示詞在同目錄 `d-cut-paper-collage-prompt.md`。兩入口共用，維持無圖片說明文字；圖片不承載文字，標語仍是 HTML。
- 右上製作者及 6 個追蹤目的地依使用者指定的 injury.sportsmedicine.tw；追蹤連結有可讀名稱、44px 點擊區與新分頁保護。
- 目前 20 個原始打包資產（含 PDF renderer、中文字型與授權），另產生 8 個內容雜湊 JS/CSS，共 28 檔；`build-pages.sh` 明列兩張 WebP 並處理子目錄，`fingerprint-assets.mjs` 將兩入口 HTML 的 JS/CSS 引用改為 `/assets/app/<name>.<sha256前16碼>.<ext>`。原始路徑保留相容，不作為正式 HTML 的引用；測試 fixture 同步。
- 視覺變更不可改動風險分級語意色、醫療提醒、AI 同意流程或處方公式。

### 表單與輸出流程
- 主入口先呈現標準處方與修改操作，AI 是選用補充；強度與 MET 參考使用原生 `details`，醫療提醒仍直接顯示。
- 草稿只用本分頁 `sessionStorage` 的 `exerciseRxFormDraft`。`clearAssessment()` 須取消 debounce、清除表單／生活情境／衍生結果／自帶金鑰，並透過 `resetAISection()` 中止 AI 請求與隔離舊回應，避免已清除資料回流。
- `pdf-loader.js` 由兩入口共用，依需求載入本站 `assets/vendor/jspdf.umd.min.js`（原 pinned 2.5.1 與 SRI）及本機中文字型，20秒逾時、合併同時請求、失敗可重試。两入口的 `downloadPDF()` 各有防重複與 `finally` 清理。`pdf-report.js` 以可選取的原生文字／向量表格輸出 A4，段落與表格列自動分頁，不再截取長圖。字型來源及重建步驟見 `assets/fonts/README.md`。新增前端資產須同步 `scripts/build-pages.sh` 與 `tests/build.test.mjs`。
- AI 不再載入 DOMPurify；模型無法注入 HTML。主結果頁僅保留「下載 AI 報告 PDF」，位於所有報告內容與參考說明之後、頁尾之前；AI 未完成時 disabled 並說明原因。一般處方下載按鈕及合併附錄勾選已移除，PAR-Q 獨立頁的下載仍保留。`createAIPDFReport()` 沿用 `createPDFReport()` 的完整處方、風險提醒與免責說明，再另頁附上六節個人化 AI 報告；Blob 儲存／預覽連結、載入鎖、序號隔離與重設撤銷 URL 維持。合併 PDF 用 compact 留白，字級不縮小。

### calculateFITTVP 的規則優先序（改規則前必讀）
- 年齡層基準 → 體能 → 運動習慣（起始量）→ 目標 → 疾病 → 限制 → PAR-Q，**但疾病 / 限制 / PAR-Q 只透過 `caps` 設「安全上限」**（`capIntensity` / `capFrequency` / `capTime` / `hrZoneUnsafe`），不直接改處方。
- 所有規則跑完後由 `applySafetyCaps()` 統一套用上限，並重算 `weeklyMinutes`、`volume`、`heartRateZone`。**任何新規則都不得在 `applySafetyCaps` 之後再改 frequency / time / intensity。**
- `intensity` 一律是 enum key（`light` / `light-moderate` / `moderate` / `moderate-vigorous`），顯示文字由對照表產生；後端驗證只接受這四個值。
- 心率區間依最終強度給（`HEART_RATE_ZONES`，ACSM %HRmax：輕 57-63、中 64-76、劇 77-95）；PAR-Q+ q1 心臟病／高血壓、q5 服藥、疾病選項心臟病史、心悸、PAR-Q+ 高風險時 `heartRateZone = null` 改用 RPE（Borg 6-20：輕 9-11、中 12-13、劇 14-17）。
- 兒童青少年維持每日活動原則，PAR-Q+ 低風險的體能微調只套用於成人且有規律運動習慣者。

### PAR-Q+ 分級（共用引擎與獨立問卷須一致）
題目為 **PAR-Q+ 2025 第 1 頁 7 題**（eparmedx.com，官方中文版 2026-01 轉繁體），不是舊版 PAR-Q 2002。`prescription-rules.js assessPARQRisk`（主表單及後端共用）、`parq-script.js assessParqLevel` 規則相同：
- 官方規則是二元：全「否」→ 可開始（>45 歲且不習慣劇烈運動者，劇烈強度前先諮詢合格運動專業人員）；任一「是」→ 完成第 2、3 頁追蹤問題／ePARmed-X+ 並諮詢；取得許可前僅低強度（ePARmed-X+ 醫師許可表 2026）。
- 分級只決定處方保守程度，對應 ACSM 2015 運動前篩檢演算法（GETP 11th）：q2 胸痛、q3 頭暈／失去意識（徵候症狀）、q7 醫囑須醫療監督 → `high`（任何強度前先評估，cap light）；其他任一「是」→ `moderate`（已知疾病／服藥且已規律運動者 cap moderate，否則 cap light-moderate）；全「否」→ `low`。
- q1 心臟病／高血壓、q5 服用處方藥 → `hrZoneUnsafe`，不給心率區間改用 RPE（ACSM）。
- 改規則要共用引擎與獨立問卷一起核對，並更新 README 的說明。

### functions/：Groq 個人化報告與既有 provider adapter
- `ai-recommendation.js`：CORS、100KiB body、schemaVersion:3、完整問卷與生活情境正規化、10次/IP/分鐘、站方預算、可信規則、Groq strict JSON 與 narrative 驗證。舊版本回409要求重整，截斷／拒答不呈现為完整結果。
- 模型單一目錄在 `functions/_lib/models.js`；前端不可硬編碼模型。公開 `/api/providers` 及進階設定只顯示 Groq；其他 adapter 留在共用工具供相容測試，個人化端點只接受 Groq。候選模型僅 BYOK，可用站方模型由 `siteEnabled` 控制；目前基準為 Groq GPT-OSS120B。沒有跨供應商自動重試。
- `ai.js` 管理正規化與 provider 呼叫；`coaching.js` 管理提示詞、schema、明顯違規檢查與報告組裝；`coaching-runner.js` 管理同一 Groq 的至多一次修正。禁止把自由輸入或 upstream 錯誤正文寫到 logs。錯誤回應只附固定允許的 code／reason／field／doseKind 分類，供診斷，不回傳被拒文字、問卷或金鑰。
- 模型契約是 answer、固定索引的 actionReasons／barrierReasons、nextQuestion 與臨床旗標／原因。answer 最多整項省略一項且仍須保留有效回答；不合格的 barrierReasons 最多兩項可用同索引的伺服器備案理由取代，每次都重新完整驗證，不能刪除錯配、重複替換或套用無效備援。actionReasons、追問、臨床旗標／原因與 schema 不以備援掩蓋。模型提高臨床警戒時以可信諮詢內容取代一般行動與理由。回應 `meta.omittedItems` 只含數量，網頁及 PDF 同步提示；無法保留必要內容才進入受限修正流程。
- `budget.js` 預設每日 US$2，`AI_DAILY_BUDGET_USD` 可調、最高10；在上游呼叫前，按兩次最大輸入／輸出 token 與固定修正提示成本預留。KV 非原子，這是盡力防線，非帳單硬上限。站方 KV 故障 fail-closed；自帶金鑰由使用者帳號付費。
- `coaching-limits.js` 共用每次 2800 output token、最多兩次、整體 45 秒期限，adapter、站方預算與 evaluator 一致；client 65 秒。只有內容驗證或 Groq 已知生成格式錯誤可同供應商修正一次，逾時、拒答、截斷、429、認證或網路錯誤不自動重試，修正提示不含被拒原文。`scripts/evaluate-ai.mjs` 預設六個合成情境各一次，可先用 AI_EVAL_CASES 小量檢查，預設案例間隔 65 秒以降低 token 限流，先預留兩次可能成本、US$1 上限即停止，保留失敗與舊模板對照。不要對真實健康資料跑評測；人工醫療評分不可由腳本代填。

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
- `_headers` 對原始 `/*.js` `/*.css` 設 `max-age=0, must-revalidate`，但實測自訂網域會覆寫為四小時瀏覽器快取。正式 HTML 因此使用打包時產生的內容雜湊檔名，避免新頁面搭舊 JS；不要依賴快取標頭或手動更新版本字串。`test_asset_updates.py` 使用真實瀏覽器快取驗證部署更新後仍可一鍵產生 AI 報告。
- Zeabur 版 Express server 已於 2026-09-26 移除（git tag `zeabur-final` 可回溯）。本機開發一律 `npm run dev`。

### AI 個人化報告
- 最新設計與執行計畫：`docs/superpowers/specs/2026-09-28-personal-coaching-design.md`、`docs/superpowers/plans/2026-09-28-personal-coaching.md`。補充欄位只留目前頁面記憶體，不寫草稿；編輯時中止請求、使報告與 PDF 失效，取消保留輸入，清除評估清空輸入
- 舊版規劃 `docs/ai-redesign-plan-2026-09-27.md`；本轮實作、可執行驗證與限制見 `docs/ai-redesign-implementation-2026-09-27.md`。其他候選模型與人工評分仍待有效帳號實測，不能以 mock 推論醫療品質。
