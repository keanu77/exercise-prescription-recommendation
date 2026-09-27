# AI 補充說明：重新評估與改版方案

查核日期：2026-09-27。範圍是現有程式、正式環境公開設定與供應商官方文件。
本文件是可實作的規劃，尚未切換正式模型，也未進行新模型的付費品質比較。
模型文件列為可用，不代表本站帳號已取得權限或已通過繁體中文運動衛教評測。

## 建議決策

將「AI 補充說明（選用）」改為「把運動計畫帶進生活」，提供精簡、可執行的解說。
優先完成內容結構及安全限制，再用同一批案例比較新模型。建議先保留已運作的
Groq GPT-OSS 120B 作基準；GPT-6 Luna／Sol、Gemini 3.8 Flash、Claude Sonnet 5
列入下一輪比較。預設採通過驗收且總成本最低的模型，不以廠商的最強標籤決定。
Opus 5.5／GPT-6 Astra／Fable 5.1 留給經驗證有收益的複雜任務，不直接成為一般使用者預設。

## 現況與主要問題

| 項目 | 已確認現況 | 影響與處理 |
|---|---|---|
| 正式可用服務 | `/api/providers` 當日回傳只有 Groq=true，其他三家=false | 更換選單不會讓其他站方服務自動可用；需要有效帳號、額度與實際測試 |
| OpenAI | `functions/_lib/ai.js` 的預設是 `gpt-4o-mini`，選單最高到 GPT-4.1 | 已落後官方現行 GPT-6 系列；需連 API 參數一起遷移 |
| Claude | 預設 `claude-opus-5`，另有 Sonnet 5／Haiku 4.5 | 部分仍是現行選項，但 Opus 5 的「最強」標示已過時；日常補充不必預設最高價 |
| Gemini | 僅 2.5 Flash／Pro | 官方已有穩定版 3.8 Flash；重新評估舊型號、帳號及資料使用條款 |
| Groq | GPT-OSS 120B／20B，另列 Enterprise Llama 3.1 8B | GPT-OSS 仍可作基準；Enterprise 選項應依權限顯示，不能當作通用免費選項 |
| 任務定義 | `SYSTEM_PROMPT` 要求扮演專科醫師，重新制定處方，輸出五大段與多個表格 | 與「補充說明」定位不一致，重複結果頁、增加閱讀量，可能重寫強度與處方數字 |
| 量表 | 提示詞模板有 RPE `/10`、HRR，網站主要結果用 Borg 6–20 與 %HRmax | 需明確鎖定量表與原處方，避免同頁出現不同尺度；不可只靠模型自行換算 |
| 個人化資料 | 摘要僅帶入 frequency／time／intensity／type；未傳完整 caps、warning、心率不適用等結果 | 新契約要提供完整、由伺服器驗證的限制；藥名未知時不得推斷個別藥物 |
| 結果格式 | 模型產生 HTML，再以 DOMPurify 清洗 | 防 XSS 不等於內容正確；改成 schema 驗證過的 JSON，由網站畫固定卡片 |
| 延遲／成本 | 上游 30 秒、瀏覽器 40 秒；大篇幅輸出，缺使用量回傳 | 較強推理可能延遲更久；先縮短任務，記錄無健康內容的使用量與延遲，再決定逾時門檻 |
| 安全邊界 | 處方目前在瀏覽器計算，伺服器只驗證輸入欄位與範圍 | 不能把 client 傳入的處方當成可信上限；共用規則模組由 server 重算是新驗證層的前置工作 |

以上是程式檢視，不代表已對每一個舊模型作帳號實測，也不把「非最新」等同「已停用」。
定位：`functions/_lib/ai.js` 的 SYSTEM_PROMPT／MODEL_ALLOWLIST／call*API、
`functions/api/ai-recommendation.js`、`functions/api/providers.js`、`script.js` 的 AI_PROVIDERS／AI 狀態流程。

## 官方候選模型與成本快照

單位：美元／一百萬 tokens，標準即時文字輸入／輸出；不含快取、批次、工具、稅。
估算欄以一次 2,000 input + 1,000 billed output tokens 示範，**不是本站實測費用**；
推理 tokens、重試及較長輸出會增加費用。

| 候選與 API ID | 輸入／輸出 | 示範單次成本 | 建議用途 |
|---|---:|---:|---|
| Groq `openai/gpt-oss-120b` | 0.15／0.60 | 0.0009 | 現有基準，先改善提示詞與 JSON 契約 |
| OpenAI `gpt-6-luna` | 0.10／0.50 | 0.0007 | 精簡補充的成本候選，繁中品質待比較 |
| OpenAI `gpt-6-sol` | 2／10 | 0.014 | 品質與成本比較候選 |
| Google `gemini-3.8-flash` | 0.75／3.75 | 0.00525 | 多語文字解說候選；此價至 2026-12-31 |
| Anthropic `claude-sonnet-5` | 2／10 | 0.014 | 清楚解說與遵循限制的比較候選 |
| Anthropic `claude-opus-5-5` | 4／20 | 0.028 | 僅在實測勝出且有需求時啟用 |

Gemini 上表官方已公告 2027-01-01 起為 1.50／7.50；免費與付費層的資料使用條款不同，
健康資料不能因「免費」直接導向未評估的方案。採用前確認實際專案適用條款。
以上用途為本次架構建議，並非官方醫療能力排名。

來源：[OpenAI 現行模型與價格](https://developers.openai.com/api/docs/models)、
[Claude 型號與價格](https://platform.claude.com/docs/en/models/overview)、
[Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)、
[Gemini 價格與資料使用](https://ai.google.dev/gemini-api/docs/pricing)、
[Groq 支援型號與價格](https://console.groq.com/docs/models)。

## 使用者會看到的新版

1. 標題「把運動計畫帶進生活」，一句說明：「依照上方處方，整理容易開始的做法與提醒。」
2. 明列將傳送的資料類別及服務商；沿用使用者主動觸發。主要按鈕「產生我的行動建議」。
3. 一般使用者不用選模型。進階設定收合，才提供已驗證的自帶金鑰與模型選项。
4. 結果先呈現三張短卡：「今天怎麼開始」「遇到限制怎麼調整」「下次要觀察什麼」。
   每張最多三點、總計約 350–600 中文字；數值以原處方為準。
5. 低風險者可展開由系統安排、符合原處方的週計畫；AI 僅解釋安排理由。
   高風險者改為「就醫前整理」：問卷重點、可帶去詢問的問題，避免產生新訓練課表。
6. 保留重新產生、取消、錯誤重試、清除資料及過期結果隔離。
   429 顯示實際 Retry-After；部分輸出或驗證失敗不可當成完成報告。
7. 「依據與限制」收合區列原處方版本、模型、產生時間與經核定的來源。
   未接檢索前，不宣稱已查詢最新研究；來源網址由網站白名單渲染，模型只回來源 ID。
8. PDF 的 AI 內容另作明確標示的選用附錄；基礎處方與 AI 說明分開，沿用本輪原生分頁引擎。

## 實作契約與驗證

- 把既有確定性規則抽成前後端共用純函數；先用既有測試證明處方輸出逐欄一致。
  不藉此重寫臨床規則，HANDOFF 中既有四項醫療待複核仍需另處理。
- request：`schemaVersion`、正規化 `userData`、`mode`、受限 `modelId`。server 重算可信 baseline，
  不接受 client 自稱的風險等級／放寬安全上限。
- response：`schemaVersion`、`summary`、`startToday[]`、`adaptations[]`、`checkIn[]`、
  `questionsForClinician[]`、`sourceIds[]`；model/provider/promptVersion/rulesVersion/usage/duration 由 server 加入。
  數值課表、風險徽章與必要停止運動提醒由規則層產生，不交給 AI 自由改寫。
- 文字仍可能違反醫療限制：JSON 合格只是格式合格。採禁止新增處方數值的契約、動作白名單、
  風險對應內容限制與內容驗證，驗證失敗回到既有標準處方；醫師人工複核代表性案例。
- 新版提供商 adapter 分開處理參數。OpenAI 建議 Responses API；reasoning 非 none 時移除 temperature。
  Gemini 3.8 thinking 使用 low／medium／high，不能傳 minimal。
  Groq GPT-OSS 支援 strict JSON，但官方目前說 structured outputs 不支援 streaming／tool use，
  因此第一版統一完整 JSON 回應，顯示真實等待狀態，不畫虛構進度百分比。
- 單一 server 模型目錄包含 ID、權限、schema 能力、參數設定、成本與最後驗證日期，前端由 API 取得。
  模型不能因廠商目錄新增就自動進正式白名單；退役日期與可用權限需定期核對。
- 請求上限、每日總預算、單次 token 上限及每 IP 限流並用；紀錄模型／tokens／延遲／錯誤碼，
  不記錄健康表單、提示全文或金鑰。站方金鑰與自帶金鑰的責任範圍保留。
- 預設不自動跨供應商重試，避免健康資料多傳一份與成本增加；重試需有明確目的地與既有同意涵蓋。

參數依據：[OpenAI 遷移說明](https://developers.openai.com/api/docs/guides/latest-model)、
[Groq Structured Outputs](https://console.groq.com/docs/structured-outputs)、
[Gemini 3.8 能力與 thinking 參數](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)。

## 執行順序與驗收

| 階段 | 交付 | 完成條件 |
|---|---|---|
| 1. 契約與基準 | 共用規則、固定卡片、Groq JSON adapter、mock fixtures | 既有處方逐欄相同；高風險不產生新課表；schema／數值／來源限制可測 |
| 2. 模型比較 | 同一批合成案例、盲評表、成本與延遲記錄 | 30 案例 × 每模型 3 次；包含未成年、孕婦、服藥、胸痛、暈厥、時間／器材限制及資料不一致 |
| 3. 有限上線 | 通過的預設模型、進階 BYOK、健康檢查 | 逐模型有效金鑰 smoke；參數相容、逾時／拒答／截斷／429 正常；設定可回滾 |
| 4. 後續擴充 | 核定來源資料庫、PDF 附錄、有限追問 | 引用逐條可追溯；不新增未驗證數值處方；只有證明有用才擴大 |

品質門檻：必要安全訊息與上限遵循 100%、不得捏造藥物／疾病／來源、輸出驗證成功率至少 99%、
醫師對清晰度與可執行性評分平均至少 4/5。延遲目標 p95 ≤15 秒（待量測，不是已達成），
評測先設美元 10 的總花費硬上限，超過就停止該批；費用與 tokens 完整回報。
目前只完成程式／文件評估，未執行此付費評測，以上門檻都是未來驗收標準。
