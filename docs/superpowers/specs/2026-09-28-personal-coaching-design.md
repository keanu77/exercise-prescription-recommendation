# 個人化運動行動報告設計

使用者已選「整合實作型：具體安排、原因、替代方案與個人問題回答」，本文件將該方向落成可驗證介面

## 現況與選擇
原模型僅選六個句庫 ID，後續六節由模板組合。單改文字或加長內容不能解決差異不足
三種方案：整合實作型（採用，問答＋安排＋障礙備案）、教練問答型（較少安排）、深入訓練計畫型（需要更多負荷與臨床資料）

## 輸入
結果頁 AI 區塊加入可略過的生活情境，不增加原健康問卷必填數
頂層 coachingContext：question（最多400字），availableDays（mon..sun，空陣列表示未提供），sessionMinutes（null或10/15/20/30/45/60/90），timeOfDay（flexible/morning/lunch/evening），setting（flexible/home/outdoors/gym/pool），equipment（none/mat/bands/dumbbells/machines/bike，最多6項，none互斥），preferences（walking/running/cycling/swimming/strength/dance/ball/mindbody/play，最多3項）
未提供表示未知，不捏造時間、器材、職業或能力。欄位改動即中止舊請求並使舊報告/PDF失效；取消保留輸入，清除評估清空輸入。只存在目前頁面記憶體，不寫草稿
發送前明示生活情境與自填問題會一起送至畫面所示Groq，提醒不填姓名聯絡方式

## 輸出與架構
schemaVersion:3；providers仍沿用schemaVersion:2目錄
AI 真正撰寫繁體中文個人化解讀、優先順序理由、情境行動、替代方案與問題回答，不再只選固定段落
伺服器先正規化問卷與新欄位，重算原baseline，建立可信安排邊界，使用Groq strict JSON schema，驗證後再組報告
保留取消、序號隔離、Retry-After、BYOK、預算、無跨供應商fallback、完整性檢查與textContent
清單項目違反內容規則時可整項省略後重新驗證，不能拆開成對內容、移除臨床旗標或讓必要章節留白。摘要、臨床原因與追問也不得省略。網頁及 PDF 同步說明省略情形；至多一次同模型修正、共用整體時限與預算預留，不對限流或網路錯誤自動重試
回應：{success:true,schemaVersion:3,report:{version:2,summary,sections},mode:actions|consultation,risk:low|moderate|high,safety,baseline,sources,meta}
sections固定六節依序：answer「先回答你的問題」、priorities「最值得先做的事」、plan「依你的生活安排」、barriers「遇到阻礙時的替代方案」、review「如何回顧與下一步」、safety「需要留意的事」
每節 {id,title,kind:list|rows,items:string[]|[string,string][]}；每節1..30項，每段上限2000字，summary上限500字
前端/PDF共用同一份sections，不重覆渲染舊三張模板卡；依據與限制收在原生details

## 臨床邊界與安排
既有prescription-rules.js不改、30 baseline與128 PAR-Q測試保留
AI不產生任意劑量、藥物調整、診斷或研究來源。實際時間/頻率/強度由伺服器提供，無法匹配使用者時段時明示差距，不宣稱達到原處方
安排僅是原處方下的執行片段，不能加倍補課或把肌力/有氧全部以總時數任意替換；非成人、consultation或身體症狀/醫療問題不得自動另開數字課表
自由問題當作不可信資料而不是模型指令；未提供的資訊標示未知，不以模型臆測補齊。高風險仍能獲得具體個人問題整理與諮詢清單，而非每節重複一句諮詢醫師
所有必要原warnings與篩檢提醒完整保留在末節；模型醫療品質仍需醫師審閱，schema不保證事實正確

## 提示詞品質
明確回答：此人的關鍵障礙是什麼、為何先處理、下次在何時何地做哪項具體準備、計画受阻如何應對、怎樣知道安排可行、還缺哪項關鍵資訊
要求每項理由連結實際輸入，避免只是覆述年齡、BMI、籠統鼓勵與重複免責；回答個人問題放最前
資料足夠給可操作選項，資料不足提供條件式選項與一個釐清問題，不假装已知道答案

## 驗證
先建立新欄位／回應／安排安全的失敗測試，再實作；對不同時間、器材、問題、成人/兒少/高風險案例做固定測試
以少量合成真實Groq案例對照舊句庫，記錄輸入回覆、耗時、成本估算與失敗，人工檢視是否回答問題與有具體差異
預算預留與adapter輸出token上限必須一致，token增長不得繞過日額度。付費評測先小量，費用上限US$1，不做90次盲目重跑
Chromium/WebKit的320/390/1280、輸入修改後失效、取消、清除、錯誤重試、PDF全文與快取回歸
保留使用者已接受的配色/字體/圖片/無句點，AI PDF位置維持最下方

## 參考
Groq strict JSON schema僅約束格式而非醫療品質：https://console.groq.com/docs/structured-outputs
Groq GPT-OSS reasoning設定：https://console.groq.com/docs/reasoning
NICE PH49成人個人行為改變之目標、行動與因應計畫僅作報告結構參考，不延伸成兒少處方：https://www.nice.org.uk/guidance/ph49/chapter/Recommendations
