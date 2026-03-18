# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

運動處方推薦系統 — 基於 ACSM FITT-VP 原則與 WHO 身體活動建議指引的個人化運動處方靜態網頁應用。由運動醫學科吳易澄醫師開發。

## Tech Stack

- 純靜態網站：HTML5 + Tailwind CSS (CDN) + 原生 JavaScript（無框架、無打包工具）
- 字體：Google Fonts Noto Sans TC
- PDF 生成：html2canvas + jsPDF（延遲載入）
- 部署：Zeabur（使用 `serve` 靜態伺服器）

## Commands

```bash
npm install          # 安裝 serve 依賴
npm start            # 啟動靜態伺服器 (serve -s . -p $PORT)
```

沒有 build 步驟、沒有 lint、沒有測試。`npm run build` 只是 `echo`。

## Architecture

### 核心檔案

- **`index.html`** (~1200 行)：所有 HTML 結構，使用 `.page` class 搭配 `showPage()` 實現多步驟表單的頁面切換（SPA 路由模式）
- **`script.js`** (~2000 行)：所有業務邏輯，為單一大檔案

### 表單流程（多步驟）

使用者依序填寫：基本資料 → PAR-Q+ 健康問卷 → 運動目標/習慣 → 生成處方結果

頁面切換透過 `showPage(pageId)` 控制 `.page.active` class 的顯示/隱藏。

### script.js 關鍵模組

1. **DOMCache**：DOM 元素快取工具
2. **MET 活動資料庫**：`MET_ACTIVITIES` 物件，分 light/moderate/vigorous 三級強度，含活動名稱、MET 值、範例
3. **BMI/BMR/TDEE 計算**：`calculateBMI()`, `calculateBMR()`, `calculateTDEE()` — BMR 使用 Mifflin-St Jeor 公式
4. **PAR-Q+ 風險評估**：`assessPARQRisk()` — 評估健康問卷回答的風險等級
5. **FITT-VP 處方引擎**：`calculateFITTVP(data)` — 核心演算法，根據年齡、體能、疾病狀況生成 Frequency/Intensity/Time/Type/Volume/Progression 處方
6. **結果顯示**：`displayPrescriptionSummary()`, `displayFITTPDetails()`, `displayExerciseGuidelines()`
7. **PDF 匯出**：`createPDFContent()` — 生成離線 HTML 結構後用 html2canvas 截圖轉 PDF

### 疾病特殊處理

`diseaseMap` 定義 10 種疾病代碼（overweight, asthma, hypertension, diabetes, arthritis, heart_recovery, sarcopenia, pregnant, hyperlipidemia, cancer_recovery），FITT-VP 引擎會根據這些疾病調整處方。

### 其他檔案

- **`parq-form.html` / `parq-script.js`**：獨立的 PAR-Q+ 問卷頁面（與主系統分開）
- **`blogger_version.html` / `blogger-embed-code.html`**：Blogger 嵌入版本
- **`*.py` 檔案**：Python 參考腳本（`age_specific_recommendations.py`, `fitt_vp_framework.py` 等），為醫學知識的結構化參考，不在前端使用
- **`test_*.html` / `debug_test.html` / `simple_fix.html`**：測試/除錯用頁面（已在 .gitignore 中）

## Deployment

Zeabur 部署設定在 `zeabur.json`：build command 為 `npm install`，start command 為 `npm start`。

## 注意事項

- `script.js` 是 2000 行的單體檔案，修改時注意函式間的依賴關係，特別是 `calculateFITTVP()` 與各 display 函式之間
- 所有 CSS 使用 Tailwind CDN（`cdn.tailwindcss.com`），自訂樣式寫在 `index.html` 的 `<style>` 區塊
- PDF 匯出在 `createPDFContent()` 中使用 inline style 而非 Tailwind class（因為 html2canvas 需要）
