# Repo launch 狀態 — 2026-10-19

## 已完成

- GitHub description、homepage 與 11 個 topics 已更新；移除過時的 Express 標籤。
- GitHub private vulnerability reporting 已啟用。
- PR #1：https://github.com/keanu77/exercise-prescription-recommendation/pull/1
- v2.1.0 release 草稿已建立，附完整影片、短片與社群預覽圖。草稿不代表公開發佈。
- 中英文 README、無金鑰 quick start、CONTRIBUTING、SECURITY、CHANGELOG 已完成。
- 24.6秒示範影片、13秒短片、約1MB GIF與1280×640預覽圖已實際檢視；沒有真實資料或AI呼叫。
- Node 22／24 的分支與 PR CI 均通過，PR 可合併且無衝突。
- Ubuntu 24.04 arm64 新 VM、Node 24.19.0：候選分支乾淨 clone，`npm ci`、104項測試、打包、無金鑰 health 通過。
- Ubuntu 補齊 Chromium 系統函式庫後：填表、兩頁四尺寸、16個 PDF 案例通過；移除 macOS 路徑後再驗填表、清除資料與16個PDF案例，全通過。
- 使用未登入 Chromium 直接檢視 GitHub 公開分支，README GIF載入與英文入口正常。

## 發佈順序

1. 檢查並合併 PR #1，讓預設 main 包含已部署應用及新 README。合併不會自動部署 Cloudflare。
2. 在 GitHub Settings → General → Social preview 上傳 `docs/media/social-preview.png`。
3. 檢查 Releases 中 v2.1.0 草稿與素材，確定 target 指向已審查的來源後再公開。
4. 社群貼文使用 `social-drafts.md`，完整影片與短片在 `docs/media/`。文案不含使用量數字，尚未發送。

## 必須保留的限制

- 本輪是 repo 展示與可安裝性整理，沒有臨床規則或 AI 模型品質改版。
- SECURITY.md 記錄 Tailwind 開發依賴 audit 的8項已知風險；未做大版本遷移，未宣稱無弱點。
- main 原先比正式站落後74筆提交，PR含已部署歷史；4e6282e之後的本輪變更為文件、素材與CI。
- 使用既有 Cloudflare Live Demo，不另建無法執行 Functions 的 GitHub Pages 副本。

## 乾淨環境的界線

驗證使用候選分支 `repo-launch/2026-10-19`，不是尚未合併的預設 main。初次瀏覽器測試因缺 `libatk-1.0.so.0` 無法啟動，依官方 Playwright 的 `install-deps chromium` 安裝系統依賴後通過；CONTRIBUTING 已將此列為 Ubuntu 明確步驟。不存在 `.env`，health 回報所有 AI provider key 皆未設定；瀏覽器回歸的 AI 回覆為 fixture，未使用真實金鑰或患者資料。

主要工具：Node.js v24.19.0、npm 11.17.0、Ubuntu 24.04 arm64、Python venv、Playwright Chromium、Poppler。macOS 的畫面及正式站驗證是另一組證據，沒有將兩者混成同一次測試。

本輪應用程式檔案、Functions、處方規則、依賴鎖檔與正式部署設定相對 `4e6282e` 沒有改動。測試可攜性修改只影響 Python 選擇與產物暫存路徑。
