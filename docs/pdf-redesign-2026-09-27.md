# PDF 報告重新設計 — 2026-09-27

## 原因與新呈現

舊版將整份 HTML 截成單張長圖，再以 A4 高度切頁。實際下載的運動處方第二頁在頁首切斷免責聲明，
其餘大多留白；PAR-Q+ 報告只有答案編號，沒有題目。兩個舊範例約 5.4／5.9 MB。

改為兩入口共用 `pdf-report.js`：原生 A4 文字與向量表格、嵌入中文字型、18 mm 左右邊界、
固定頁首／頁尾與頁碼。一般報告兩頁，先看個人概況與處方／完整問卷，第二頁接續建議與提醒。
內容較長時自動增加頁數，保留續頁標題；一般表格列與段落盡量保持完整，超長內容按行續頁。
無頁面截圖、不依螢幕尺寸、瀏覽器 CSS 或網頁字型決定 PDF 排版。

黑灰文字、少量萊姆綠識別、風險語意色與留白承接網站運動風格，保留列印閱讀性。
中文可選取、搜尋與複製。標準範例 107,617／109,423 bytes，較旧範例減少約 98%。

## 內容範圍

- 主處方使用 `lastPrescription` 的已顯示數值，完整保留 warnings／recommendations、
  心率／阻力訓練（適用時）、成人 BMI 與不適用熱量標示。
- PAR-Q+ 使用實際七題完整文字及所選答案；風險描述與後續建議從當下結果頁擷取，
  包含超過 45 歲提醒、效期、追蹤問題及高風險就醫要求，避免另一份 PDF 專用文案漂移。
- 這次只改報告呈現，未修改臨床計算、PAR-Q+ 分級、AI 模型或後端。
  `.claude/HANDOFF.md` 中四項既有醫療待複核仍有效；不代表本輪重新核定了全部臨床內容。

## 資產與效能

- `pdf-loader.js` 延遲載入既有 jsPDF 2.5.1 CDN／SRI，及本站字型；合併同時請求，失敗可重試。
- 移除 html2canvas 與隱藏的匯出 DOM。下載按鈕防重複，失敗恢復操作。
- 字型為改名的 Noto Sans TC 400 子集，5,962,068 bytes；只在首次下載 PDF 時取得並於頁面內重用，
  並非首頁初始載入。PDF 本身只嵌入使用的字形。
- 字型來源、SHA-256、OFL 授權與可重建腳本見 `assets/fonts/README.md`。共17個打包資產。

## 驗證與限制

- Node 測試18/18、打包17檔、十一套 Chromium 瀏覽器回歸。
- PDF 矩陣每個引擎10個案例：Chromium／WebKit共20；一般與手機、未成年與性別其他、
  高風險多疾病、6頁長段落／長表格；獨立 PAR-Q+ 全否、45歲以上、服藥與全是。
- 真正下載 PDF，再用 Poppler 擷取全文，比對每項報告資料、A4列印邊界、文字框不重疊、頁碼與非空頁。
  另外驗證網路延遲載入、字型503後重試、同時載入與重複下載防護、DOM清理。
- 標準報告在390／1440px產出的全文與頁數一致；渲染一般、高風險與長內容報告視覺抽查。
- 未逐款測試實體印表機或所有歷史瀏覽器。PDF 有文字層，但未建置 PDF/UA 標籤樹，不能宣稱完整 PDF/UA 認證。

執行：

```sh
npm test
npm run build:pages
bash tests/browser/run_all.sh
PDF_BROWSERS=webkit PYTHONPATH="$HOME/Library/Python/3.9/lib/python/site-packages" /usr/bin/python3 tests/browser/run_https.py tests/browser/test_pdf_export.py
```

本機證據：`.claude/audit/pdf-redesign-20260927/`（不提交個人工作證據）；
`before/`、`after/`、`verified/`、`browser-tests.log`、`webkit-pdf.log`、`node-tests.log`、`build.log`。
測試只用虛構資料，未呼叫 AI。
