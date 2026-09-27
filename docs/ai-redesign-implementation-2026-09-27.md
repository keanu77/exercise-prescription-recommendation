# 生活行動卡實作與驗證

本輪承接 `ai-redesign-plan-2026-09-27.md`，將 AI 任務收斂為「依個人條件選取可執行重點」。

## 已實作

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
