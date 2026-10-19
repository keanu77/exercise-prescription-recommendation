# 社群發佈草稿

尚未發佈。依使用者選擇，省略所有使用量與使用人數；待 README PR 合併後再貼，確保連入 repo 能看到示範與文件。

## X 串文

### 1

想開始運動，常卡在不知道怎麼把自己的健康狀況、時間和目標整理成計畫。

我把運動處方工具開源了：填寫問卷後，就能拿到一份規則式處方並下載 PDF。一般功能不需要 AI 金鑰。

試用：https://exerciseprescription.sportsmedicine.tw/

附件：`docs/media/demo-short.mp4`

### 2

處方依 FITT-VP 原則整理頻率、強度、時間與類型，並納入 PAR-Q+ 篩檢與健康限制。

結果會保留提醒，也能匯出有中文字層的 PDF，方便閱讀與保存。這是衛教工具，不能取代個別醫療評估。

### 3

AI 是選用功能。可以補上自己最想問的問題、可用時間與場地，讓 Groq 說明行動理由和替代方案。

運動量仍沿用規則產生的原處方。沒有使用 AI，或 AI 暫時失敗，一般處方仍可下載。

### 4

程式碼、英文文件與本機安裝方式：
https://github.com/keanu77/exercise-prescription-recommendation

Node.js 20+，建議使用仍受維護的 LTS：
`git clone https://github.com/keanu77/exercise-prescription-recommendation.git`
`cd exercise-prescription-recommendation`
`npm ci && npm run dev`

歡迎用虛構資料試用，回報可重現的問題。

## Facebook 草稿

想開始運動時，除了知道「要多動」，也需要把健康狀況、平常的活動習慣和目標整理一下。

我把自己維護的運動處方工具整理成開源專案。填完問卷後，可以看到運動頻率、強度、時間與類型，也能下載完整 PDF。一般處方不需要帳號或 AI 金鑰。

如果想多問一步，例如下班常加班、下雨時要怎麼調整，可以選擇 AI 行動建議，補上自己的生活條件。AI 用來說明安排與備案，運動量仍沿用原處方。

影片用的是虛構案例，示範從填表到下載 PDF 的操作。工具提供衛教參考，不能取代醫師評估；也請不要在公開留言或 GitHub issue 留下可辨識個人的健康資料。

試用：https://exerciseprescription.sportsmedicine.tw/
程式碼：https://github.com/keanu77/exercise-prescription-recommendation

如果你也在做運動衛教、復健或健康工具，歡迎看看，或回報實際操作時遇到的問題。

附件：`docs/media/demo.mp4`
