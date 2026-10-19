# 運動處方推薦系統

**給想建立運動習慣的人與運動衛教工作者：填寫健康條件，取得 FITT-VP 運動處方與可下載 PDF；AI 行動建議為選用功能。**

[立即試用](https://exerciseprescription.sportsmedicine.tw/) · [English](README.en.md) · [快速開始](#快速開始) · [版本紀錄](CHANGELOG.md) · [安全回報](SECURITY.md)

[![虛構案例操作示範：填表、產生處方、下載 PDF](docs/media/demo.gif)](https://exerciseprescription.sportsmedicine.tw/)

> 示範使用虛構資料，沒有呼叫 AI。網站介面為繁體中文。瀏覽器需 Safari 16.4+、Chrome 111+ 或 Firefox 128+（Tailwind 4）。輸出僅供衛教，不能取代診斷或個別醫療評估。

## 你可以得到什麼

| 輸入與操作 | 產出 |
| --- | --- |
| 年齡、體能、運動習慣、目標與健康篩檢 | 依共用規則產生 FITT-VP 處方與提醒 |
| PAR-Q+ 問卷 | 保守的活動風險分級與追蹤指引 |
| 下載運動處方 | 可選取中文字的 A4 PDF，不需要 AI 金鑰 |
| 選填生活情境並主動啟用 AI | 回答個人問題、說明行動理由與備案，可與原處方合併下載 |

## 快速開始

需要 **Node.js 20 或更新版本**、npm 與 Git；新安裝建議使用仍受維護的 Node.js LTS。一般處方與 PDF 不需要帳號或 API 金鑰。

```bash
git clone https://github.com/keanu77/exercise-prescription-recommendation.git
cd exercise-prescription-recommendation
npm ci
npm run dev
```

開啟 http://127.0.0.1:3000 。不需要先建立 `.env`。初次安裝需網路；頁面字型使用 Google Fonts，PDF 函式庫與中文字型由本站載入。

需要測試 AI 時，再複製 `.env.example` 為 `.env`，填入自己的 `GROQ_API_KEY` 並重啟；不要把金鑰貼到 issue 或提交進 Git。站方模式目前僅使用 Groq，候選模型需自帶金鑰。

```bash
npm test              # 後端與打包測試，不呼叫真實 AI
npm run build:pages   # 驗證 CSS、JS 與資產後打包至 dist/
npm run build:css     # 修改 Tailwind class 或 src/input.css 後執行
```

瀏覽器與 PDF 回歸的環境安裝見 [開發與貢獻](CONTRIBUTING.md)。已知依賴風險與回報方式見 [SECURITY.md](SECURITY.md)。

## 功能

- 年齡適性建議，涵蓋兒童、青少年、成人與銀髮族
- FITT-VP 處方：頻率、強度、時間、類型、總量、漸進；疾病、運動限制與 PAR-Q 結果只會把處方往保守方向修正
- PAR-Q+ 2025 運動前健康篩檢（官方 7 題）：任一題「是」導向完成追蹤問題並諮詢；胸痛、頭暈／昏厥或醫囑須醫療監督者列為最高風險（依 ACSM 2015 運動前篩檢演算法）
- MET 活動資料庫與熱量估算；BMI、BMR、TDEE 計算（未成年、懷孕、體重過輕不顯示減重熱量）
- AI 個人化行動報告（選用、使用者主動觸發），使用 Groq；進階設定可選 Groq 模型與自帶金鑰
- 表單自動暫存在此分頁，可確認後清除問卷、處方、AI 回覆與自帶金鑰
- 手機版處方摘要、修改資料，以及可展開的強度與 MET 參考
- 結果頁最下方左側「下載運動處方」可獨立匯出完整處方；右側「運動處方＆AI分析」在 AI 完成後匯出完整處方、個人化 AI 報告、安全提醒與產生紀錄，AI 暫時失敗不影響一般處方下載

## 架構

- **前端**：純靜態頁面（HTML + 預編譯 Tailwind CSS + vanilla JavaScript），前端直接執行，部署前有資產打包檢查。`index.html` + `script.js` + `ai-ui.js` 是主應用，`prescription-rules.js` 為前後端共用規則；`parq-form.html` + `parq-script.js` 是獨立的 PAR-Q+ 問卷頁。
- **後端**：Cloudflare Pages Functions（`functions/`）。`POST /api/ai-recommendation` 驗證並正規化問卷資料後，依 `provider` 轉發給 AI 供應商；`GET /api/health` 回服務狀態，`GET /api/providers` 回不含金鑰的模型目錄與可用性。API 金鑰放在 Pages Secrets，不會出現在前端。
- **部署**：Cloudflare Pages，靜態檔由 `scripts/build-pages.sh` 打包到 `dist/`，安全標頭與快取策略在 `_headers`，Functions 設定在 `wrangler.toml`。
- `*.py` 是領域知識參考腳本（FITT-VP、MET、特殊族群等科學依據），各自可獨立執行印出內容，不是執行期依賴。

處方先由共用規則在前端計算，送出 AI 時由伺服器重算。AI 依個人問題與情境撰寫分析、理由及備案，具體時間窗口由伺服器在原處方範圍內安排。沒有設定任何 AI 金鑰時，規則式處方仍完整可用。

## 部署到自己的 Cloudflare Pages

本專案已有 [正式 Live Demo](https://exerciseprescription.sportsmedicine.tw/)，不需要另外啟用 GitHub Pages。純靜態 GitHub Pages 無法執行本專案的 AI Functions。

自行部署前，在 Cloudflare 建立自己的 Pages 專案與 KV namespace，將 `wrangler.toml` 的 `name`、`RATE_LIMIT_KV.id` 換成自己的值；不要沿用本專案的 KV ID。把專案名稱帶入以下指令：

```bash
npx wrangler login
npx wrangler pages project create YOUR_PROJECT --production-branch main
npx wrangler pages secret put GROQ_API_KEY --project-name YOUR_PROJECT
npm run build:pages
npx wrangler pages deploy dist --project-name YOUR_PROJECT --branch main
```

AI 是選用功能；沒有金鑰時，一般處方仍可用。`ALLOWED_ORIGINS` 留空只允許同站 `/api` 呼叫；部署後應檢查 `/api/health`、`/api/providers` 與一筆虛構案例。API 金鑰使用 Pages Secrets 管理。

`build:pages` 會重新編譯並比對已提交的 CSS；若不一致會拒絕打包。公開輸出採明列資產清單，不包含 `.env`、測試或內部文件。本站使用 CLI 上傳，GitHub PR 合併不會自動部署正式網站。

## 安全模型

- AI 端點沒有使用者認證，任何能連到網站的人都能觸發 AI 呼叫。防濫用機制是每個 IP 每分鐘最多 10 次，以 Cloudflare KV 計數（盡力而為，非嚴格）。限流服務不可用時，使用站方金鑰的請求一律拒絕，明確選定供應商且實際使用自帶金鑰者照常放行；`auto` 仍使用站方金鑰。
- `model` 參數只接受 `functions/_lib/models.js` 的 `MODEL_ALLOWLIST`，避免用站方金鑰打高價模型。
- 所有問卷欄位在伺服器端走白名單與範圍檢查後才進入提示詞；伺服器重算處方，schemaVersion:3 額外驗證選填生活情境。模型回結構化內容，截斷、拒答、錯誤格式與明顯違規內容會拒絕，前端只以純文字呈現；這些檢查不代表醫療語義正確性。
- 使用者可自帶 API 金鑰，經伺服器中轉直接送往供應商；本站不將金鑰持久儲存或記錄。
- 兩入口不使用行內 JavaScript；CSP 禁止行內 script／事件屬性，AI 區塊不接受模型 HTML，也不再載入 DOMPurify。第三方 AI 對資料的處理依各供應商規範，本站不宣稱供應商不會留存。
- 部署者的金鑰會被所有訪客共用，額度風險由部署者承擔。建議只放有免費額度或已設消費上限的金鑰。
- 健康資料只在使用者按下「產生我的行動建議」後才送出，送出前頁面會說明資料用途。

站方每日 AI 預算防線預設 US$2，可設定 `AI_DAILY_BUDGET_USD`（最高10）。KV 非原子，硬性帳單上限須由供應商端另設。輸出上限共用 2800 tokens，評測預設六個合成情境各一次、US$1 預留上限；失敗也保留成本預留。

## 參考依據

- ACSM's Guidelines for Exercise Testing and Prescription, 11th ed.（FITT-VP 原則、強度分級 %HRmax／RPE、服藥者以 RPE 監測）
- WHO Guidelines on Physical Activity and Sedentary Behaviour, 2020
- PAR-Q+ 2025（Physical Activity Readiness Questionnaire for Everyone，PAR-Q+ Collaboration，eparmedx.com；官方中文版 2026）
- ePARmed-X+ Physician Clearance Follow-Up（2026）
- Riebe D, et al. Updating ACSM's Recommendations for Exercise Preparticipation Health Screening. Med Sci Sports Exerc. 2015（運動前篩檢演算法）
- MET 值出處：Compendium of Physical Activities

## 免責聲明

本工具輸出僅供衛教參考，不構成診斷或個人化醫療建議。有慢性疾病、心血管風險或運動中曾出現不適者，開始運動計畫前請先諮詢醫師。

## 作者

運動醫學科 吳易澄醫師
網站：https://sportsmedicine.tw/

YouTube：https://www.youtube.com/@sportsmedicinetw

## License

MIT License，全文見 [LICENSE](LICENSE)。

## 優化驗證紀錄

[2026-09-26 網站分析與修正](docs/optimization-review-2026-09-26.md)：操作流程、安全與效能審計、重現證據、驗證範圍及待辦。

[2026-09-27 全面優化與驗證](docs/ux-security-optimization-2026-09-27.md)：首頁與手機版面、結果閱讀順序、資料清除、CSP、共用 PDF 載入及實際匯出。

[2026-09-27 運動風格設計](docs/sports-design-2026-09-27.md)：完整頁面設計、主視覺、製作者／追蹤連結與響應式驗證。

[2026-09-27 電腦首頁重新設計](docs/layout-rework-2026-09-27.md)：初次顯示問題、圖文比例重整與 Chromium／WebKit 驗證。

[2026-09-27 PDF 重新設計](docs/pdf-redesign-2026-09-27.md)：原生 A4 文字、完整問卷、段落與表格分頁、桌面／手機一致匯出。

[AI 補充說明改版方案](docs/ai-redesign-plan-2026-09-27.md)：現況問題、官方最新模型查核、費用及分階段實作規劃。已實作內容、模型限制與驗證見 [生活行動卡實作](docs/ai-redesign-implementation-2026-09-27.md)。
