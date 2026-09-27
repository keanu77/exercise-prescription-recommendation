# 生活行動卡實作與驗證

本輪承接 `ai-redesign-plan-2026-09-27.md`，將 AI 任務收斂為「依個人條件選取可執行重點」。

## 後續調整：Groq 設定與獨立 PDF

- 依使用者要求，公開服務目錄與進階設定只保留 Groq。其他 adapter 隱藏，既有處方規則及 AI 選取邏輯不變。
- 成功產生行動卡後可按「下載 AI 報告 PDF」，包含摘要、三組行動、安全提醒、模型與產生紀錄；不需勾選合併附錄。原本勾選併入標準處方的方式仍可使用。
- 共用下載鎖、延遲載入、失敗恢復與產生當下的內容快照；重新產生、取消或清除後不提供舊 AI 下載。獨立 PDF 縮減留白、保留字級。
- 回歸案例新增獨立一般／手機／諮詢 AI PDF，以及跨按鈕防重複、載入失敗重試與清除；使用合成 AI 回應，不重跑付費品質評測。

## 原始改版實作

- 三張卡片：今天怎麼開始、遇到限制怎麼調整、下次要觀察什麼。每張兩點；一般情況約 350–600 字。PAR-Q 任一是、孕婦、心臟病史或心悸，改為諮詢準備，沒有新增訓練課表。
- `prescription-rules.js` 由 a917885 的純規則區段原樣抽出，前後端共用。伺服器要求完整問卷、拒絕不一致選項，忽略 client 提供的處方與 BMI，重新計算完整 baseline。
- 與初版方案的具體調整：模型回傳各組適用的 **行動 ID**，而非自由撰寫醫療文字；伺服器檢查資格、重複值、欄位與數量，再轉成固定文案。可避免模型擅自變更強度、猜測藥物或編造引用。這是 AI 協助選取的預設建議，不宣稱生成個別醫療處方。
- 截斷、拒答、錯誤 schema 或不適用 ID 不呈現為完成結果；前端只用 DOM textContent。移除不再需要的 DOMPurify CDN。
- 明列資料目的地、主動同意、真實等待狀態、取消、Retry-After 倒數、重設與過期回應隔離。取得服務目錄失敗時，再次取得成功也不自動送出健康資料。
- 來源固定為 PAR-Q+ 官方問卷；未做文獻檢索，不宣稱有最新研究支持每個生活行動。原處方必要 warnings 仍在主報告。
- 勾選後 PDF 加入獨立附錄，標示 AI 任務、模型、時間、規則與提示版本；重新產生／清除後取消勾選及舊結果。使用提醒保留在基礎報告，附錄另起一頁，避免提醒孤立到尾頁。
- 供應商目錄集中 `functions/_lib/models.js`，`/api/providers` 公開不含金鑰的目錄。Groq GPT-OSS 120B 保持站方基準；20B、GPT-6 Luna/Sol、Claude Sonnet 5、Gemini 3.8 Flash 標示待評測，僅使用者自帶金鑰可呼叫，不消耗站方其他模型額度。
- OpenAI 採 Responses + strict JSON / store:false；Groq strict JSON；Claude output_config.format；Gemini generateContent + responseJsonSchema、thinkingLevel low。其他模型的有效帳號相容與人工品質分數仍須實測，不以 mock 當成成功呼叫。
- 每次上限 1,800 output tokens；上游 30 秒、前端 40 秒涵蓋讀取 response body。每 IP 10 次／分鐘，站方 KV 不可用時 fail-closed。站方額度／KV的等候只限制站方金鑰，改用自帶金鑰可繼續；IP限流仍共同適用。每日預留預算預設 US$2，可設 `AI_DAILY_BUDGET_USD`（上限 $10），每次依 UTF-8 bytes 推算保守輸入 token 上界及最大輸出先預留，失敗不退還。**KV get/put 非原子，是盡力預算防線；要硬性帳單上限仍需供應商帳號限制／原子儲存。**
- 提示 v3 只傳核對後的處方重點、個人條件及短行動標籤；完整 warnings 與卡片文字留在伺服器，減少重複傳輸與 token 配額壓力。
- 日誌只有 provider/model/version/time/tokens/latency/錯誤碼，不記表單、提示、回應全文或金鑰。不自動跨供應商重試。前端把同意前顯示的 provider/model 明確寫入請求；站方設定改變時也不默默改送別家。

## 驗證方法

- `npm test`：完整 body 限制、串流 UTF-8、CORS、fail-closed、預算、模型白名單、各家 adapter 請求／回應、拒答／截斷、ID 不合規、30 個固定輸出與 128 組 PAR-Q 組合。
- `tests/fixtures/ai-cases.json` 的 expected 在抽出規則前由舊版計算，含來源 commit / SHA-256；比較每一個欄位，沒有借抽取修改醫療規則。
- Chromium / WebKit：320、390、1280px；資料不自動傳送、內容布局、HTML 注入、取消後舊請求回流、429、金鑰清除與附錄選擇。
- PDF 真實下載與 Poppler 比對所有文字、邊界、重疊、頁碼，新增 AI 附錄案例。
- `scripts/evaluate-ai.mjs` 使用 30 個合成案例 × 3 次，每次先以最大 token 成本預留，US$10 上限即停；輸出到 gitignored `.claude/audit/`。醫師盲評仍標記 pending，不自動代填人工分數。

```sh
AI_EVAL_URL=https://exerciseprescription.sportsmedicine.tw/api/ai-recommendation node scripts/evaluate-ai.mjs
# 其他候選須在環境安全地提供對應供應商 key，不貼進指令或 log。
AI_BROWSERS=webkit PYTHONPATH="$HOME/Library/Python/3.9/lib/python/site-packages" /usr/bin/python3 tests/browser/run_https.py tests/browser/test_ai_flow.py
```

## 範圍與限制

四項既有醫療規則待複核仍保留於 HANDOFF；本輪不聲稱已完成醫療內容審查。
「依週分配課表」與自由追問保留後續，避免在此階段擴大為第二套處方引擎。
其他候選模型的付費比較與醫師人工評分，須在有效帳號及實際評閱後補上，不能以型號新舊推論品質。

官方接口依據（2026-09-27）：
[Groq strict JSON](https://console.groq.com/docs/structured-outputs)、
[OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、
[Claude structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)、
[Gemini generateContent](https://ai.google.dev/api/generate-content)。

## 最終發布與實測結果

正式版本：`b18230801fffda589739c83f3425946c8de5f57d`；Cloudflare Production
`fdb5585c-1fb3-49f8-beec-50811a698176`，
[正式網站](https://exerciseprescription.sportsmedicine.tw/)。
本輪使用獨立乾淨快照發布，沒有把同時進行中的首頁換圖修改一併提交。

| 項目 | 實際結果 |
|---|---|
| Node／打包測試 | 23/23；19個部署檔案 |
| 瀏覽器回歸 | 獨立版本11套Chromium通過；後續變更另測相關AI／PDF案例 |
| AI操作 | Chromium、WebKit，各320／390／1280px，本機與正式皆通過 |
| PDF | 每引擎主處方6種＋PAR-Q5種，共22例；正式真實下載、完整文字、無重疊、邊界與頁碼皆通過 |
| 最終正式資產 | 18個公開檔案SHA-256全符合release；CSP/HSTS存在，health為ok |
| 真實Groq評測 | 30個合成案例×3次，90/90成功；均為`action-cards-3` |
| 回應合規核對 | 90/90：處方重算一致、符合風險的模式、每卡兩項且不重複、全部文字來自適用項目、來源ID符合白名單 |
| 延遲 | 端到端中位數2,099ms、p95 2,521ms；上游p95 897ms |
| Tokens | input 54,717；output 12,411 |
| 費用 | 本批依價格與回傳用量估算US$0.01565415；預留上界US$0.13500495；不是帳單實付金額 |
| 人工醫療品質／其他模型 | 未完成；不可將格式驗證、model mock 或型號新舊當成醫療品質評分 |

保留較早v2的連續呼叫結果：53次紀錄，48成功、5次上游429。精簡提示後完整重跑v3，
同樣每次至少間隔7秒，本輪未再出現429。兩輪合計預留費用US$0.2361，低於US$10上限。
同一個合成案例的單次 smoke，輸入token由1,331降至586，估算費用由US$0.00027465
降至US$0.0001407。這是單次案例比較，不宣稱所有情境都能減少相同比例。
Groq官方公開免費方案列[每分鐘8K tokens](https://console.groq.com/docs/rate-limits)，
但未讀取帳號實際方案／quota，不能把公開表當成此帳號設定的證明。

證據保留於 `.claude/audit/ai-redesign-20260927/`（gitignored）：
`evaluation-baseline-v2.json`、`evaluation.json`、`evaluation-audit.json`、
`audit-results.mjs`、`blind-review.csv`（人工評分欄空白）、
`live-ai-complete.log`、`live-pdf-complete.log`、`live-assets-complete.json`、
`deployments-complete.json`、`deploy-v3.log`、`browser-release.log`。
資產核對需`curl -L`跟隨Pages的HTML標準網址重新導向；早期未跟隨的空白body差異已另外保留，並非部署檔案錯誤。

候選模型、醫師盲評與原有四項醫療待複核仍須後續處理；沒有自動改用未評測模型。
