# 運動處方推薦系統

基於美國運動醫學會（ACSM）FITT-VP 原則與世界衛生組織（WHO）2020 身體活動指引的運動處方工具。使用者填寫多步驟問卷後，前端以確定性規則計算 FITT-VP 處方、PAR-Q 風險分級、BMI/BMR/TDEE 與 MET 熱量估算，另可選擇由 AI 產生加強版的個人化說明。

線上使用：https://exerciseprescription.sportsmedicine.tw/

## 功能

- 年齡適性建議，涵蓋兒童、青少年、成人與銀髮族
- FITT-VP 處方：頻率、強度、時間、類型、總量、漸進
- PAR-Q+ 運動前健康篩檢與風險分級
- MET 活動資料庫與熱量估算
- BMI、BMR、TDEE 計算
- AI 個人化建議（選用），支援 Groq、Anthropic Claude、Google Gemini、OpenAI 四家

## 架構

前端是純靜態頁面（HTML + 預編譯 Tailwind CSS + vanilla JavaScript），沒有 build step。後端是單一 Express server（`server.js`），做兩件事：

1. 提供靜態頁面。
2. 作為 AI proxy：前端把問卷摘要 POST 到 `/api/ai-recommendation`，server 依 `provider` 參數轉發給 Groq、Anthropic、Gemini 或 OpenAI。API key 全部放在 server-side 的 `.env`，不會出現在前端程式碼或瀏覽器。

處方本身由前端規則引擎計算完成，AI 只負責產生補充說明。沒有設定任何 AI key 時，規則式處方仍完整可用。

`*.py` 檔案是領域知識參考腳本（FITT-VP、MET、特殊族群等科學依據），各自可獨立執行印出內容，不是執行期依賴。

## 安裝與執行

```bash
npm install
cp .env.example .env   # 填入至少一組 AI API key（建議 Groq，有免費額度）
npm start              # 預設 http://localhost:3000
```

環境變數說明見 `.env.example`。`ALLOWED_ORIGINS` 是 CORS 跨來源白名單，同源請求一律放行。

## 安全模型

部署前請先了解這個工具的信任邊界：

- AI 端點（`/api/ai-recommendation`）沒有使用者認證，任何能連到你網站的人都能觸發 AI 呼叫。
- 防濫用機制是 rate limit：每個 IP 每分鐘最多 10 次 AI 請求，一般 API 每分鐘 100 次。
- 使用者可以在前端自帶自己的 API key，key 經伺服器中轉直接送往 AI 供應商，伺服器不儲存、不記錄。
- 部署者的 `.env` key 會被所有訪客共用，API 額度風險由部署者自行承擔。建議只放有免費額度或已設消費上限的 key（例如 Groq 免費方案），不要放綁高額信用卡的 key。

## 參考依據

- ACSM's Guidelines for Exercise Testing and Prescription（FITT-VP 原則）
- WHO Guidelines on Physical Activity and Sedentary Behaviour, 2020
- MET 值出處：Compendium of Physical Activities

## 免責聲明

本工具輸出僅供衛教參考，不構成診斷或個人化醫療建議。有慢性疾病、心血管風險或運動中曾出現不適者，開始運動計畫前請先諮詢醫師。

## 作者

運動醫學科 吳易澄醫師
Blog: https://wycswimming.blogspot.com/

## License

MIT License，全文見 [LICENSE](LICENSE)。
