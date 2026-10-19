# 2026-09-27 運動風格整體設計

## 使用者指定方向

整體版型提升；明確選擇運動風格。右上製作者、追蹤連結及頁首介紹參考 [運動傷害影片圖鑑](https://injury.sportsmedicine.tw/)。本輪以 113018e 為基準，實作首頁、主表單、結果頁與獨立 PAR-Q+ 的共用視覺系統。

## 設計與操作

- 黑、米白、萊姆綠；粗體中文標題，Barlow Condensed 英文與數字；俐落邊角、分隔線及一致的間距。紅／黃／綠風險提示仍保留原語意。
- 頁首左側網站名稱，右側製作者連到 `https://sportsmedicine.tw/`。介紹列為分享資訊導覽與六個追蹤圖示，目的地逐一對照指定網站目前的 HTML。
- 首頁以個人化運動處方的用途、開始按鈕與跑道主視覺為主，再接依據、三步流程與不同年齡的運動需求。沒有虛構成效數字或見證。
- 桌面表單的步驟與進度放在左側，輸入區置右；手機回到單欄與橫向步驟。單選／複選有選取背景與鍵盤焦點。
- 結果將頻率、時間、訓練量設為主要數字，FITT-VP 使用一致字母標記。提醒、AI 同意、修改、資料清除與 PDF 均保留。
- 短暫進場動畫只用於桌面首頁；尊重 `prefers-reduced-motion`。追蹤圖示點擊區 44px，全部具可讀名稱。
- 處方規則、PAR-Q 分級、輸入範圍與計算公式沒有變更。

## 圖片

使用內建 `image_gen` 產生一張原創運動情境圖，無文字或品牌標誌，頁面註明 AI 生成示意。文字、按鈕、數據均以 HTML 呈現。

- 原始檔：`/Users/ethanwu/.codex/generated_images/01a0de09-9b40-7332-a466-1ea52f8250c4/exec-a24fd457-acd2-4601-9b44-a8134a38489f.png`。
- 部署資產：`assets/running-track-720.webp`（38,562 bytes）、`assets/running-track-1440.webp`（97,138 bytes）。由 cwebp 品質 82 縮放／編碼；原始檔保留。
- `srcset` 依裝置選圖，固定寬高避免版面位移，首頁高優先載入。表單和結果不加入圖片請求。
- 圖片原始提示詞保存在 [image-prompt.md](../assets/image-prompt.md)。本機未使用 API key 或 CLI fallback 生成圖片。

## 追蹤目的地

| 名稱 | 網址 |
| --- | --- |
| 衛教部落格 | https://blog.sportsmedicine.tw/ |
| Facebook | https://www.facebook.com/EthanWuMD/ |
| Instagram | https://www.instagram.com/ethan77wu/ |
| GitHub | https://github.com/keanu77 |
| LINE | https://line.me/R/ti/p/@521cvffb |
| 個人網站 | https://sportsmedicine.tw/ |

來源網站以 curl 與實際 Chromium 頁面讀取；不是從舊記憶推測帳號。外部平台登入／追蹤動作未執行。

## 驗證與維護

```sh
npm run build:css
npm test
npm run build:pages
bash tests/browser/run_all.sh
git diff --check
```

新增 `test_sports_design.py`，涵蓋 320／390／768／1440px、兩入口、圖片實際載入、srcset、製作者與六追蹤連結、44px 點擊區、鍵盤跳轉與首頁開始操作。原有表單、AI、CSP、資料清除、規則引擎、PDF 測試仍執行。

本機驗證結果：
- `npm test`：18/18 通過；`npm run build:pages`：14 files；`git diff --check` 通過。
- 全部十組瀏覽器測試通過。舊測試綁定灰色步驟文字，改為驗證桌面深色側欄／手機淺底的實際對比，分別 9.94:1／4.71:1。
- 桌面、平板與手機截圖已人工檢視。最後將非互動資訊的箭頭移除，並讓表單頁的「使用流程」可以回到首頁對應段落、保留填寫內容；該導覽另加回歸驗證。
- 兩入口真實 PDF 下載、重複點擊及失敗重試通過。主處方 PDF 抽看兩頁：採既有點陣輸出，跨頁仍可能切到文字；本輪未重做 PDF 分頁引擎，不能視為完整 PDF 排版審查。

完整執行紀錄：`.claude/audit/sports-design-20260927/browser-tests.log`；導覽收尾驗證：`browser-design-final.log`；截圖：同目錄 `final/`。

`scripts/build-pages.sh` 明確包含两張 WebP，依子目錄複製並計算 14 個資產；不將提示詞或稽核檔案部署。圖片壓縮大小與版面檢查不等於真實使用者的 Core Web Vitals，也不宣稱取得任何設計排名或無障礙認證。

本機截圖、執行紀錄與後續部署查驗保存於 `.claude/audit/sports-design-20260927/`，最新上線狀態以 `.claude/HANDOFF.md` 與 Cloudflare 實際部署為準。
