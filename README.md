# 運動處方推薦系統

基於美國運動醫學會（ACSM）FITT-VP 原則與世界衛生組織（WHO）2020 身體活動指引的運動處方工具。使用者填寫多步驟問卷後，前端以確定性規則計算 FITT-VP 處方、PAR-Q+ 風險分級、BMI/BMR/TDEE 與 MET 熱量估算；另可在結果頁按下按鈕，由 AI 產生補充說明。

線上使用：https://exerciseprescription.sportsmedicine.tw/

## 功能

- 年齡適性建議，涵蓋兒童、青少年、成人與銀髮族
- FITT-VP 處方：頻率、強度、時間、類型、總量、漸進；疾病、運動限制與 PAR-Q 結果只會把處方往保守方向修正
- PAR-Q+ 運動前健康篩檢：任一題「是」即建議先諮詢醫師；心臟病史或胸痛列為最高風險
- MET 活動資料庫與熱量估算；BMI、BMR、TDEE 計算（未成年、懷孕、體重過輕不顯示減重熱量）
- AI 個人化說明（選用、使用者主動觸發），支援 Groq、Anthropic Claude、Google Gemini、OpenAI

## 架構

- **前端**：純靜態頁面（HTML + 預編譯 Tailwind CSS + vanilla JavaScript），沒有 build step。`index.html` + `script.js` 是主應用；`parq-form.html` + `parq-script.js` 是獨立的 PAR-Q+ 問卷頁。
- **後端**：Cloudflare Pages Functions（`functions/`）。`POST /api/ai-recommendation` 驗證並正規化問卷資料後，依 `provider` 轉發給 AI 供應商；`GET /api/health`、`GET /api/providers` 只回各家金鑰是否已設定。API 金鑰放在 Pages Secrets，不會出現在前端。
- **部署**：Cloudflare Pages，靜態檔由 `scripts/build-pages.sh` 打包到 `dist/`，安全標頭與快取策略在 `_headers`，Functions 設定在 `wrangler.toml`。
- `*.py` 是領域知識參考腳本（FITT-VP、MET、特殊族群等科學依據），各自可獨立執行印出內容，不是執行期依賴。

處方本身由前端規則引擎計算完成，AI 只負責產生補充說明。沒有設定任何 AI 金鑰時，規則式處方仍完整可用。

## 本機開發

```bash
npm install                # 只有 tailwindcss 一個 devDependency
cp .env.example .env       # 填入至少一組 AI API 金鑰（建議 Groq，有免費額度）
npm run dev                # http://127.0.0.1:3000，直接載入 functions/ 的 handler，可離線
npm test                   # Pages Functions 單元測試（node --test）
npm run build:css          # 改動 Tailwind class 後必跑，並把 tailwind.css 一起 commit
```

## 部署

```bash
npx wrangler login
npx wrangler pages secret put GROQ_API_KEY --project-name exercise-prescription
npm run deploy             # build:pages（含資產與 tailwind.css 新鮮度檢查）→ wrangler pages deploy dist
```

`wrangler.toml` 已綁定 `RATE_LIMIT_KV`；`ALLOWED_ORIGINS` 留空代表只允許同站呼叫 `/api`。

## 安全模型

- AI 端點沒有使用者認證，任何能連到網站的人都能觸發 AI 呼叫。防濫用機制是每個 IP 每分鐘最多 10 次，以 Cloudflare KV 計數（盡力而為，非嚴格）。限流服務不可用時，使用站方金鑰的請求一律拒絕，自帶金鑰者照常放行。
- `model` 參數只接受 `functions/_lib/ai.js` 的 `MODEL_ALLOWLIST`，避免用站方金鑰打高價模型。
- 所有問卷欄位在伺服器端走白名單與範圍檢查後才進入提示詞；AI 回傳的 HTML 在前端一律經 DOMPurify 清洗後才顯示，清洗器未載入時不顯示。
- 使用者可自帶 API 金鑰，經伺服器中轉直接送往供應商，不儲存、不記錄。
- 部署者的金鑰會被所有訪客共用，額度風險由部署者承擔。建議只放有免費額度或已設消費上限的金鑰。
- 健康資料只在使用者按下「取得 AI 建議」後才送出，送出前頁面會說明資料用途。

## 參考依據

- ACSM's Guidelines for Exercise Testing and Prescription（FITT-VP 原則）
- WHO Guidelines on Physical Activity and Sedentary Behaviour, 2020
- PAR-Q+（Physical Activity Readiness Questionnaire for Everyone）
- MET 值出處：Compendium of Physical Activities

## 免責聲明

本工具輸出僅供衛教參考，不構成診斷或個人化醫療建議。有慢性疾病、心血管風險或運動中曾出現不適者，開始運動計畫前請先諮詢醫師。

## 作者

運動醫學科 吳易澄醫師
Blog: https://wycswimming.blogspot.com/

## License

MIT License，全文見 [LICENSE](LICENSE)。
