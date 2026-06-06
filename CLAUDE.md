# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

運動處方推薦系統：依 ACSM FITT-VP 原則與 WHO 2020 身體活動指引產生個人化運動處方。前端為純靜態頁面（無 build step），後端為單一 Express server，作為多家 AI 供應商的 proxy。

## 常用指令

```bash
npm start          # 啟動 server（= node server.js），預設 port 3000
npm run dev        # 同上
npm install        # 安裝依賴（Zeabur build 指令也是這個；runtime 不需 devDeps）
npm run build:css  # 重新編譯 Tailwind：src/input.css → tailwind.css（改動 class 後必跑）

# Python 檔案是「可獨立執行的領域知識參考腳本」，非執行期依賴
python met_introduction.py          # 各檔皆有 __main__ demo，直接印出該領域知識
```

- **Tailwind 是預編譯的，不是 CDN**：`index.html` / `parq-form.html` 載入 `/tailwind.css`（由 `src/input.css` 經 tailwind CLI 編譯，已 commit）。**新增/修改 class（含 JS 動態產生的）後必須 `npm run build:css` 重編譯並 commit**，否則新 class 被 purge 掉不會生效。動態 `${parqColor}` 類別靠 `tailwind.config.js` 的 safelist 保留。**Zeabur 的 nodejs builder 會自動執行 `npm run build`**（只要 package.json 有 `build` script），但部署容器的 `npm install` 只裝 production deps、不裝 devDeps（`tailwindcss` 在 devDependencies）。因此 `build` script 必須維持 **no-op echo**，靠 commit 進去的 `tailwind.css` 服務；**絕對不要把 `build` 改成 `npm run build:css`**，否則部署容器找不到 tailwindcss 會 `exit 127` 部署失敗（2026-06 曾因此連兩次部署失敗）。
  - `blogger_version.html` / `blogger-embed-code.html` 仍用 Tailwind CDN（供貼進 Blogger，外部網域不受本站 CSP 限制）；直接在本站網域開這兩個檔不會套到樣式，屬預期。
- **沒有自動化測試框架**：用 Playwright（Python，`PYTHONPATH=~/Library/Python/3.9/lib/python/site-packages /usr/bin/python3`，chromium 在 `~/Library/Caches/ms-playwright/chromium_headless_shell-1217/...`）以 `page.evaluate` 直接驅動函式驗證。
- 本機驗證 server 改動：啟動後打 `GET /api/health`（回傳各 provider 是否已設定金鑰）。

## 架構重點（需跨檔閱讀才能理解的部分）

### 兩段式處方：client 算 baseline，AI 只做「加強版」
1. 使用者填完 `index.html` 的多步驟表單後，**`script.js` 在前端完成確定性計算**：`calculateFITTVP()` 產生 FITT-VP 處方、`assessPARQRisk()` 算 PAR-Q 風險、`calculateBMI/BMR/TDEE()`、MET 熱量。這份結果先直接顯示。
2. 使用者另外按下 AI 建議時，才把 `userData`（含前端算好的 `prescription`）POST 到 `/api/ai-recommendation`。**server 不重算處方**，只是把 `prescription` 連同其他欄位餵給 AI。
   → 改處方邏輯要改 `script.js` 的 `calculateFITTVP`；改 AI 輸出要改 `server.js` 的 `SYSTEM_PROMPT`。兩者是獨立的兩套邏輯。

### server.js：四家 AI provider 的統一 proxy
- 單一核心端點 `POST /api/ai-recommendation`，支援 `provider` = `auto | groq | claude | gemini | openai`。
- `auto` 的 fallback 順序固定為 **Groq → Claude → Gemini → OpenAI**（Groq 為免費基本款）。
- 金鑰來源：後端 env 變數，或 request 內使用者自帶的 `customApiKey`（會經 `sanitizeApiKey()` 清洗）。
- `buildUserSummary()` 把表單代碼（如 `hypertension`、`weight_loss`）轉成中文摘要，再接上 `SYSTEM_PROMPT` 送給 AI。新增表單選項時，這裡的對照表（`diseaseMap`/`goalMap`/`limitationMap` 等）必須同步補。
- **AI 輸出是 HTML 不是 markdown**：`SYSTEM_PROMPT` 強制要求 `<div class="ai-section">…</div>` 結構，前端直接 `innerHTML` 塞入。改輸出格式時 prompt 與前端 CSS 要一起改。
- 預設模型在 `DEFAULT_MODELS`（server.js 頂部附近），不是寫死在各 call 函式裡。

### Python 檔案＝領域知識來源，不是執行期程式
`fitt_vp_framework.py`、`met_introduction.py`、`age_specific_recommendations.py`、`special_populations.py`、`exercise_prescription_framework.py` 都是獨立 demo 腳本（各有 `__main__`），**沒有被 server.js 或任何 JS import**。它們是 FITT-VP / MET / 特殊族群等科學依據的 source of truth，JS 實作與 `SYSTEM_PROMPT` 都源自這些檔。需要查「正確的醫學數值/分組」時讀這些，但改它們不會影響線上行為。

### 前端多入口（彼此獨立，勿混用）
- `index.html` → 載入 `script.js` + `multi-step-form.js`（主應用）。
- `parq-form.html` → 載入 `parq-script.js`（獨立的 PAR-Q+ 問卷版本，自帶一份 `showPage()`，與 script.js 的同名函式無關）。
- `blogger_version.html` / `blogger-embed-code.html` → Blogger 嵌入版，是 index.html 的衍生副本（仍用 Tailwind CDN）。**改主版面時這些不會自動同步**，需評估是否一併更新。（`simple_fix.html`、`test_parq_only.html` 測試殘留已刪除。）

## 部署與 CSP（最容易踩雷處）

- 部署平台為 **Zeabur**（`zeabur.json` / `zeabur.yaml`，nodejs，git 連結 main 自動部署，`npm install` → `npm run build`(no-op) → `npm start`）。服務為 git-connected（push main 自動觸發 build），非 CLI 上傳。
- `app.set('trust proxy', 1)` 是反向代理（Zeabur）下 rate-limit 正常運作的必要設定，勿移除。
- **新增任何外部資源時，必須同步更新 `server.js` 的 helmet CSP `directives`**，否則資源被擋：
  - 外部 JS（DOMPurify/jsPDF/html2canvas 等 cdnjs）→ `scriptSrc`；Google Fonts → `styleSrc` / `fontSrc`
  - HTML 內聯 `onclick` 事件 → 依賴 `scriptSrcAttr: ["'unsafe-inline'"]`（目前保留）
  - 新的 AI API host → 必須加進 `connectSrc`，否則前端打不到。
- **CSP 已移除 `unsafe-eval`**（Tailwind 改預編譯）。不要為了塞某個套件又把它加回來——先找不需要 eval 的版本。`scriptSrc`/`styleSrc`/`scriptSrcAttr` 仍保留 `unsafe-inline`（內聯 script、on* 事件、以及 AI 回傳的 inline `style=` 需要）。
- **AI 回傳的 HTML 一律先經 `DOMPurify.sanitize()` 再 `innerHTML`**（`script.js` 的 `fetchAIRecommendation`），勿改回直接塞。
- env 變數見 `.env.example`；至少需一組 AI 金鑰（建議 `GROQ_API_KEY` 免費）。`ALLOWED_ORIGINS`（CORS 白名單，現已生效）、`NODE_ENV=production` 部署時要設。
