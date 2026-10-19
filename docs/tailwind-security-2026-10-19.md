# Tailwind 開發工具鏈安全修正 — 2026-10-19

## 結果與範圍

完整 `npm audit`（包含 dev dependencies）由8項（6 high／2 moderate）降至0項。使用 Tailwind CSS／CLI 4.3.3、官方 Parcel watcher 2.6.0 override；source-map-js 鎖定解析為1.2.2。沒有隱藏 audit 項目、排除 dev dependencies 或加入 audit exception。

這是建置工具與樣式相容性修正。處方規則、AI prompt、伺服器與醫療文字未修改；PAR-Q 腳本只有半透明底色 class 改為 `bg-[#0003]`。尚未部署正式站。

## 根因

| 根源套件 | 原問題 | 處理方式 |
| --- | --- | --- |
| braces ≤3.0.3 | 深層巢狀 pattern 可耗盡呼叫堆疊；官方沒有修補版 | 移除 Tailwind3 的 glob/parser依賴鏈；CLI watcher指定為2.6.0，排除micromatch/braces |
| postcss-selector-parser <7.1.6 | 惡意 flat selector 可造成二次方運算量 | 遷移後不再安裝此套件 |
| source-map-js <1.2.2 | 不合法source-map section offset可阻塞事件迴圈 | lockfile使用1.2.2 |

Tailwind4.3.3 CLI仍固定watcher2.5.1，因此僅更新Tailwind會剩4項間接警示。官方watcher2.6.0改用picomatch；override須等上游採用安全版本後再評估移除。

來源：[braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)、[selector parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)、[source map](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)、[Tailwind升級指南](https://tailwindcss.com/docs/upgrade-guide)。

## 外觀與建置相容性

- `src/input.css` 明列6個HTML／JS來源，用 `@source inline` 保留動態PAR-Q顏色，不掃描文件與測試資料。
- `tailwind.config.js` 固定原來的十六進位配色，避免v4預設OKLCH調色改變安全語意色。
- 保留原版固定行高、placeholder／border／cursor／dialog reset，以及實際使用的 sibling spacing 與圓角。v4 spacing把margin移到前一元素，會影響既有mt-*及隱藏步驟，因此採專案範圍的相容規則。
- 更新build fixture，仍驗證新HTML或JS class會讓過期CSS打包失敗，並保留既有dist。
- 新增 `test_tailwind_compat.py`：驗證原行高、間距、三種風險配色與半透明底色；既有a11y測試改為檢查實際透明度。
- CI新增完整 `npm audit --audit-level=moderate` 閘門，不排除開發依賴。

## 驗證

- Node 104/104測試與Pages打包通過。
- 完整既有瀏覽器回歸通過；樣式收尾後另重跑相容性、a11y、填表、PAR-Q與四尺寸版面。
- 390／1280px × 首頁／PAR-Q × 首頁／表單／結果共12狀態：DOM元素位置、尺寸、字型、行距、顏色、圓角與陰影與原版一致；僅PAR-Q底色元素的class文字改名。已檢視實際截圖。
- Chromium／WebKit透過HTTPS及正式CSP完成32個PDF案例與Tailwind樣式相容性檢查。
- macOS與Ubuntu的watcher2.6.0檔案建立事件均通過。
- Ubuntu 24.04 arm64獨立乾淨checkout：Node24.19.0／npm11.17.0，`npm ci --ignore-scripts`、完整audit 0項、104項測試、CSS一致性與Pages打包通過；相容性、三尺寸填表、兩入口四尺寸版面及16個Chromium PDF案例通過。
- GitHub Ubuntu CI的Node22／24均通過（[執行紀錄](https://github.com/keanu77/exercise-prescription-recommendation/actions/runs/39271050115)）。[PR #2](https://github.com/keanu77/exercise-prescription-recommendation/pull/2)保留最終檢查狀態。

## 發佈邊界

Tailwind4最低瀏覽器需求是Safari16.4、Chrome111、Firefox128，已列於中英文README。舊瀏覽器不在此次相容性保證範圍，正式部署前需接受這個限制。

0項npm audit僅代表查核時已知npm advisories；不涵蓋vendored PDF程式庫與字型，也不是全面安全或臨床認證。
