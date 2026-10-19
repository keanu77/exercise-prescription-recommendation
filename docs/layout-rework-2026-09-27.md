# 電腦首頁重新設計：2026-09-27

## 回報與調查

使用者回報「版型整個跑掉」，進一步確認是電腦首頁。本輪以 `3d1fea7` 為基準。

- 正式站 `tailwind.css` 與本機 SHA-256 相同；未發現這次回報來自正式檔案和本機不一致。
- 一般動畫設定下，桌面首頁在 DOMContentLoaded 時實測主文 opacity 約 0.05、主圖 opacity 0。原因是 `sports-enter` 以透明度 0 開始、帶延遲；先前主要用 reduced-motion 截圖，沒有覆盖正常初次載入的狀態。
- 這是確定存在的初次顯示問題，**無法據此斷言已完整重現使用者當時所有跑版現象**。本輪也重新設計首頁比例，回應使用者的版型回饋。
- 舊版在已測 390／820／1024／1440px Chromium 與 WebKit 的穩定畫面沒有水平溢出，但主視覺近正方形裁切、圖上大字、過大的段落間距，讓介紹與視覺分散。

## 最終版面

- 頁首、介紹、主圖與下方資訊採同一個最大 1184px 內容寬度。
- 電腦主區塊使用等寬兩欄、44px 以下標題；簡化介紹文字與操作層級。
- 圖片保留原始 3:2 比例，不再裁成近正方形或覆蓋大字；照片、生成標示與既有 srcset 保留。
- 移除首頁進場動畫，內容從第一次呈現即保持可见。
- 使用流程與年齡適用資訊改成較緊湊的排列，頁尾標語改為中文；運動感保留在照片、深色文字和萊姆綠操作按鈕。
- 右上製作者與六個追蹤目的地維持；小螢幕將製作者分行，保留字體大小。
- 899px 以下主表單改單欄，避免平板上側欄擠壓輸入區；其他臨床文字、表單資料與 JS 計算沒有變更。

## 驗證方法

新增 `test_desktop_layout.py`：兩入口、1024／1280／1440／1920px、一般動畫設定、網路字體正常／被阻擋、第一屏可見、完整照片比例、欄位／頁首不重疊、鍵盤跳轉與開始操作。

```sh
npm run build:css
npm test
npm run build:pages
bash tests/browser/run_all.sh
# 本機 WebKit 需 HTTPS（openssl 自動產生暫時憑證）
LAYOUT_BROWSERS=chromium,webkit PYTHONPATH="$HOME/Library/Python/3.9/lib/python/site-packages" \
/usr/bin/python3 tests/browser/run_https.py tests/browser/test_desktop_layout.py
# 線上 HTTPS 可選兩種引擎；預設本機 runner 使用 Chromium。
BASE_URL=https://exerciseprescription.sportsmedicine.tw \
LAYOUT_BROWSERS=chromium,webkit \
PYTHONPATH="$HOME/Library/Python/3.9/lib/python/site-packages" \
/usr/bin/python3 tests/browser/test_desktop_layout.py
```

WebKit 會把本機 HTTP 頁面的同源資產依 CSP `upgrade-insecure-requests` 升級成 HTTPS，因此本機兩引擎測試須使用 HTTPS。未放寬正式 CSP。自簽憑證例外只限 `https://127.0.0.1:<port>` 的測試網址。

macOS WebKit 的完整連結導覽使用 Option-Tab，對照 [Apple Safari 鍵盤說明](https://support.apple.com/en-jo/guide/safari/cpsh003/mac)；Chrome 使用 Tab。

證據保存：`.claude/audit/layout-rework-20260927/`。初次失敗重現 `first-paint-before.log`；最終本機／正式狀態依 `.claude/HANDOFF.md` 記錄。這些檢查不代表真實 Safari／Windows 全版本認證。

## 本機驗證結果

- `npm test`：18/18；`build:pages`：14 files；`git diff --check` 通過。
- 完整十一套 Chromium 瀏覽器腳本通過（`browser-tests.log`）。
- 桌面矩陣共 24 個引擎／入口／寬度／字體組合通過：Chromium 12 個、WebKit 12 個；WebKit 最終紀錄為 `webkit-final.log`。初次 HTTP／預設 Tab 失敗是測試環境差異，已用原始 CSP 的 HTTPS 與 Option-Tab 重驗，沒有修改網站安全策略。
- 已人工檢視桌面、手機與字體失敗截圖。公開站的後續版本與查驗記錄保存在 handoff，避免把本機成功當作部署成功。
