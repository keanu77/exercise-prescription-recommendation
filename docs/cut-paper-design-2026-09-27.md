# D 剪紙拼貼：網站設計

## 使用者選定的方向

使用者從四個候選版本選擇 D，並要求依圖片風格調整網站。延伸為自然、溫暖的紙面介面：以運動、年齡與內容為重心，搭配輕薄紙層、柔和色塊和可讀的字體。

## 實作

- 原圖：`assets/hero-options/d-cut-paper-collage.png`。八種運動、兒童至長者的構圖完整保留；共用於主首頁及 PAR-Q+ 首頁。
- 部署圖：`assets/sports-paper-720.webp`、`assets/sports-paper-1440.webp`，維持 3:2、srcset、固定寬高與優先載入。沿用使用者先前要求：首頁兩個 PAR-Q 連結、圖片說明文字維持移除。
- 主色：暖米白 `#f6f1e7`、紙面 `#fffdf7`、森林綠 `#315548`、陶土橘 `#a64c35`。輔色取自插畫的鼠尾草綠、淺藍與杏色。
- 品牌及主要標題使用 Noto Serif TC；正文維持 Noto Sans TC；英文及數字保留 Barlow Condensed。字體使用 `display=swap` 與本機 fallback。
- 首頁：插畫佔比略加大、暖白紙框、輕薄偏移陰影、不同邊角；三步流程以淡色紙卡呈現。背景的 SVG 紙紋低透明度重複鋪排，沒有額外網路資產。
- 表單：森林綠桌面步驟欄、杏色目前步驟、暖白輸入區；手機維持橫向步驟。選取、鍵盤焦點、錯誤狀態清楚可辨。
- 結果：紙面摘要及細節卡、森林綠數據區、生活行動卡的淺色卡面；頁尾與清除確認視窗同步配色。
- 編輯集中在 HTML、`src/input.css`、生成的 `tailwind.css`、打包資產清單及對應測試 fixture。處方公式、PAR-Q 分級、醫療風險色、AI 同意／請求流程及 PDF renderer 沒有修改。

## 驗證範圍

以既有 browser suites 檢查 320／390／768／1024／1280／1440／1920px、兩入口、字體載入失敗、圖片比例、鍵盤操作、完整填表、資料清除、AI mock 行動卡及 PDF 匯出。Node 測試及 Pages 打包另行執行；所有 AI 測試使用模擬回應，沒有正式健康資料或付費模型請求。

此文件記錄本機實作，不代表部署。正式發布需依當下工作目錄和最新部署狀態另行驗證。

## 本機結果

- `npm test`：23/23 通過；`npm run build:pages`：19 個資產；`git diff --check` 通過。
- 10 組 Chromium browser suites 全部通過：`test_desktop_layout`、`test_sports_design`、`test_a11y`、`test_frontend_cleanup`、`test_form_journey`、`test_parq_interactions`、`test_ai_flow`、`test_data_reset`、`test_csp`、`test_pdf_export`。
- 桌面 1024／1280／1440／1920px 及字體失敗版面、320／390／768／1440px 響應式版面通過。完整表單／AI／清除操作另涵蓋 320／390／1280px。
- 未到達步驟文字對比：390px 為 5.50:1、1280px 為 6.58:1。原有風險背景色與警示驗證通過。
- 11 份真實 PDF 下載通過全文、頁碼、無重疊與列印邊界檢查，含長報告與 AI 附錄。
- 人工檢視桌面首頁、手機首頁、桌面表單、手機結果與桌面／手機行動卡截圖。預覽與資產指紋在 `.claude/audit/cut-paper-20260927/`。
- 以上為部署前的本機紀錄；使用者另於 2026-09-27 授權部署。正式發布及線上驗證另記錄於 `.claude/audit/cut-paper-20260927/`。這組本機測試使用 Chromium。
