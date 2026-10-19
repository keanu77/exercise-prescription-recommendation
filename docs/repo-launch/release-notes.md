填寫健康條件後取得 FITT-VP 運動處方，並下載完整中文 PDF。一般處方不需要 AI 金鑰；需要個人問題說明時，可選擇 Groq 行動建議，再下載處方與 AI 合併報告。

- [立即試用](https://exerciseprescription.sportsmedicine.tw/)
- 繁體中文介面，附完整英文安裝與開發文件。
- PAR-Q+ 篩檢、年齡與健康限制會影響規則式處方；AI 不另開數字課表。
- PDF 保留原處方與安全提醒，AI 暫時失敗時仍可下載一般處方。
- 首頁與 PAR-Q 頁提供 YouTube 追蹤連結，支援窄螢幕換行。

驗證：104 項 Node 測試、桌面與手機填表、Chromium/WebKit PDF 回歸及一筆虛構資料的真實 Groq 回覆。示範影片使用虛構資料且未呼叫 AI。

限制：輸出僅供衛教，不是診斷、個別醫療評估或臨床認證。安全修正版改用 Tailwind 4，完整 npm audit 在驗證時為0項；瀏覽器需求為 Safari 16.4+、Chrome 111+、Firefox 128+，詳見 SECURITY.md。AI 功能需要可用的供應商金鑰與額度；使用費用由金鑰持有人承擔。

This release provides a Traditional Chinese exercise-education app with rule-based FITT-VP prescriptions, optional AI coaching, and PDF export. See README.en.md for complete setup, deployment, data-handling, and limitation details.
