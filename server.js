/**
 * 運動處方 AI 建議系統 - 後端 API 服務
 * 支援多種 AI 提供商：Groq（免費）、Claude、Gemini、OpenAI
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 信任反向代理（Zeabur、Vercel、Heroku 等雲端平台需要）
app.set('trust proxy', 1);

// ============== 安全性 Middleware ==============

// 安全標頭 (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.groq.com", "https://api.anthropic.com", "https://generativelanguage.googleapis.com", "https://api.openai.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "data:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS 配置 - 限制允許的來源
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: function(origin, callback) {
        // 允許無 origin 的請求（如同源請求或 Postman）
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('CORS 政策不允許此來源'));
        }
    },
    credentials: true
}));

// 速率限制 - API 端點
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 分鐘
    max: 10, // 每分鐘最多 10 次 AI 請求
    message: {
        success: false,
        error: '請求過於頻繁，請稍後再試（每分鐘最多 10 次）'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 一般速率限制
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { success: false, error: '請求過於頻繁' }
});

app.use('/api/ai-recommendation', apiLimiter);
app.use('/api/', generalLimiter);

// JSON 解析 - 限制請求大小
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 靜態檔案服務
app.use(express.static(path.join(__dirname)));

// ============== 輸入驗證函數 ==============
function validateUserData(userData) {
    const errors = [];

    if (!userData || typeof userData !== 'object') {
        return { valid: false, errors: ['用戶資料格式錯誤'] };
    }

    // 驗證年齡
    if (userData.age !== undefined) {
        const age = parseInt(userData.age);
        if (isNaN(age) || age < 1 || age > 120) {
            errors.push('年齡必須在 1-120 歲之間');
        }
    }

    // 驗證身高
    if (userData.height !== undefined) {
        const height = parseFloat(userData.height);
        if (isNaN(height) || height < 50 || height > 300) {
            errors.push('身高必須在 50-300 公分之間');
        }
    }

    // 驗證體重
    if (userData.weight !== undefined) {
        const weight = parseFloat(userData.weight);
        if (isNaN(weight) || weight < 10 || weight > 500) {
            errors.push('體重必須在 10-500 公斤之間');
        }
    }

    // 驗證性別
    const validGenders = ['male', 'female', 'other'];
    if (userData.gender && !validGenders.includes(userData.gender)) {
        errors.push('性別選項無效');
    }

    // 驗證運動目標
    const validGoals = ['health', 'weight_loss', 'muscle_building', 'endurance', 'rehabilitation', 'performance'];
    if (userData.exercise_goal && !validGoals.includes(userData.exercise_goal)) {
        errors.push('運動目標選項無效');
    }

    return { valid: errors.length === 0, errors };
}

// 清理 API 金鑰（移除危險字元）
function sanitizeApiKey(key) {
    if (!key || typeof key !== 'string') return null;
    // API 金鑰只允許字母數字和連字號/底線
    return key.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 200);
}

// API 配置
const GROQ_API_KEY = process.env.GROQ_API_KEY;           // 基本款（免費）
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // 進階版
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;       // 進階版
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;       // 進階版

// 運動處方 AI 系統提示詞
const SYSTEM_PROMPT = `# Role (角色設定)
你是一位資深的運動醫學專科醫師與臨床研究員，熟悉最新的 ACSM (美國運動醫學會) 指引、WHO 2020 身體活動指南與相關實證文獻。

# Task (任務)
請根據提供的用戶資料，制定一份具備「實證基礎」且「臨床可行」的個人化運動處方。

# Output Format (輸出格式)
請使用以下 HTML 結構輸出，確保格式清晰、專業：

<div class="ai-section">
<h4>🔬 第一部分：臨床推理與運動效益</h4>

<p><strong>📋 個人化評估摘要</strong></p>
<p>[根據用戶資料，簡述其健康狀況、體能水平、運動目標的綜合評估]</p>

<p><strong>🧬 運動改善機轉</strong></p>
<p>[說明運動如何改善用戶主要健康問題的生理機制，例如：]</p>
<ul>
<li>代謝改善：GLUT4 轉位增加、胰島素敏感性提升</li>
<li>心血管效益：血管內皮功能改善、血壓調節</li>
<li>肌肉骨骼：肌力維持、骨密度保護</li>
<li>神經心理：抗發炎細胞激素、情緒調節</li>
</ul>

<p><strong>⚡ 運動前安全篩檢</strong></p>
<p>絕對禁忌症（若有以下情況請勿運動，先就醫）：</p>
<ul>[根據用戶疾病列出]</ul>
<p>相對禁忌症（需經醫師評估後方可運動）：</p>
<ul>[根據用戶疾病列出]</ul>
</div>

<div class="ai-section">
<h4>📊 第二部分：FITT-VP 運動處方</h4>

<p><strong>🏃 有氧運動處方</strong></p>
<table style="width:100%; border-collapse: collapse; margin: 10px 0;">
<tr style="background:#f3f4f6;">
<th style="border:1px solid #ddd; padding:8px; text-align:left;">項目</th>
<th style="border:1px solid #ddd; padding:8px; text-align:left;">處方內容</th>
</tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Frequency 頻率</strong></td><td style="border:1px solid #ddd; padding:8px;">[每週 X 天]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Intensity 強度</strong></td><td style="border:1px solid #ddd; padding:8px;">[RPE X-X/10 或 X-X% HRR，若服用β阻斷劑請用 RPE]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Time 時間</strong></td><td style="border:1px solid #ddd; padding:8px;">[每次 X-X 分鐘]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Type 類型</strong></td><td style="border:1px solid #ddd; padding:8px;">[具體運動項目，考量功能限制]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Volume 總量</strong></td><td style="border:1px solid #ddd; padding:8px;">[每週總計 X 分鐘]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Progression 進程</strong></td><td style="border:1px solid #ddd; padding:8px;">[每 X 週增加 X%，漸進原則]</td></tr>
</table>

<p><strong>🏋️ 阻力訓練處方</strong></p>
<table style="width:100%; border-collapse: collapse; margin: 10px 0;">
<tr style="background:#f3f4f6;">
<th style="border:1px solid #ddd; padding:8px; text-align:left;">項目</th>
<th style="border:1px solid #ddd; padding:8px; text-align:left;">處方內容</th>
</tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Frequency 頻率</strong></td><td style="border:1px solid #ddd; padding:8px;">[每週 X 天，間隔至少 48 小時]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Intensity 強度</strong></td><td style="border:1px solid #ddd; padding:8px;">[X-X% 1RM 或 RPE X-X/10]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Sets × Reps</strong></td><td style="border:1px solid #ddd; padding:8px;">[X 組 × X-X 次]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Type 類型</strong></td><td style="border:1px solid #ddd; padding:8px;">[訓練動作，見下方詳細列表]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Progression 進程</strong></td><td style="border:1px solid #ddd; padding:8px;">[當可完成目標次數時，增加 X% 負荷]</td></tr>
</table>

<p><strong>💪 具體訓練動作</strong></p>
<p><em>上肢動作：</em></p>
<ul>
[列出 2-3 個動作，每個包含：動作名稱、組數×次數、動作要領、居家替代選項]
</ul>
<p><em>下肢動作：</em></p>
<ul>
[列出 2-3 個動作，格式同上，注意避開功能限制]
</ul>
<p><em>核心動作：</em></p>
<ul>
[列出 1-2 個動作，格式同上]
</ul>

<p><strong>🧘 柔軟度訓練處方</strong></p>
<table style="width:100%; border-collapse: collapse; margin: 10px 0;">
<tr style="background:#f3f4f6;">
<th style="border:1px solid #ddd; padding:8px; text-align:left;">項目</th>
<th style="border:1px solid #ddd; padding:8px; text-align:left;">處方內容</th>
</tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Frequency</strong></td><td style="border:1px solid #ddd; padding:8px;">[每週 X 天，建議每日]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Intensity</strong></td><td style="border:1px solid #ddd; padding:8px;">[伸展至緊繃但不疼痛]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Time</strong></td><td style="border:1px solid #ddd; padding:8px;">[每個動作維持 X-X 秒，重複 X 次]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Type</strong></td><td style="border:1px solid #ddd; padding:8px;">[靜態伸展動作列表]</td></tr>
</table>

<p><strong>⚖️ 神經肌肉/平衡訓練</strong>（適用於銀髮族或有跌倒風險者）</p>
<table style="width:100%; border-collapse: collapse; margin: 10px 0;">
<tr style="background:#f3f4f6;">
<th style="border:1px solid #ddd; padding:8px; text-align:left;">項目</th>
<th style="border:1px solid #ddd; padding:8px; text-align:left;">處方內容</th>
</tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Frequency</strong></td><td style="border:1px solid #ddd; padding:8px;">[每週 X 天]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Type</strong></td><td style="border:1px solid #ddd; padding:8px;">[太極、單腳站立、動態平衡等]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;"><strong>Time</strong></td><td style="border:1px solid #ddd; padding:8px;">[每次 X-X 分鐘]</td></tr>
</table>
</div>

<div class="ai-section">
<h4>📅 第三部分：每週訓練計畫範例</h4>
<table style="width:100%; border-collapse: collapse; margin: 10px 0;">
<tr style="background:#f3f4f6;">
<th style="border:1px solid #ddd; padding:8px;">星期</th>
<th style="border:1px solid #ddd; padding:8px;">訓練內容</th>
<th style="border:1px solid #ddd; padding:8px;">時間</th>
</tr>
<tr><td style="border:1px solid #ddd; padding:8px;">週一</td><td style="border:1px solid #ddd; padding:8px;">[內容]</td><td style="border:1px solid #ddd; padding:8px;">[分鐘]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;">週二</td><td style="border:1px solid #ddd; padding:8px;">[內容]</td><td style="border:1px solid #ddd; padding:8px;">[分鐘]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;">週三</td><td style="border:1px solid #ddd; padding:8px;">[內容]</td><td style="border:1px solid #ddd; padding:8px;">[分鐘]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;">週四</td><td style="border:1px solid #ddd; padding:8px;">[內容]</td><td style="border:1px solid #ddd; padding:8px;">[分鐘]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;">週五</td><td style="border:1px solid #ddd; padding:8px;">[內容]</td><td style="border:1px solid #ddd; padding:8px;">[分鐘]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;">週六</td><td style="border:1px solid #ddd; padding:8px;">[內容]</td><td style="border:1px solid #ddd; padding:8px;">[分鐘]</td></tr>
<tr><td style="border:1px solid #ddd; padding:8px;">週日</td><td style="border:1px solid #ddd; padding:8px;">[休息或輕度活動]</td><td style="border:1px solid #ddd; padding:8px;">-</td></tr>
</table>
</div>

<div class="ai-section">
<h4>⚠️ 第四部分：衛教與風險管理</h4>

<p><strong>🚨 紅旗徵兆（出現以下症狀請立即停止運動並就醫）</strong></p>
<ul>
[根據用戶疾病列出具體警示症狀，例如：]
<li>胸痛、胸悶或壓迫感</li>
<li>異常呼吸困難</li>
<li>頭暈、意識模糊</li>
<li>心悸或心跳不規則</li>
</ul>

<p><strong>💊 藥物與運動交互作用</strong></p>
<ul>
[根據用戶用藥情況說明，例如：]
<li>β阻斷劑：心率反應鈍化，請改用 RPE 評估強度</li>
<li>降血糖藥/胰島素：運動前後監測血糖，準備含糖食物</li>
<li>降血壓藥：避免快速姿勢變換，注意姿勢性低血壓</li>
</ul>

<p><strong>🛡️ 運動安全守則</strong></p>
<ul>
<li>熱身：運動前 5-10 分鐘低強度活動</li>
<li>收操：運動後 5-10 分鐘緩和伸展</li>
<li>水分補充：運動前中後適量飲水</li>
<li>環境注意：避免極端溫度環境運動</li>
</ul>
</div>

<div class="ai-section">
<h4>🌟 給您的鼓勵</h4>
<p>[一段溫暖、專業的鼓勵話語，強調運動的長期效益，並給予持續的信心和支持]</p>
</div>

# Important Principles (重要原則)
- 始終使用繁體中文回覆
- 處方必須具體可執行（明確的數值：組數、次數、時間、強度）
- 考量用戶的疾病限制，避免禁忌動作
- 若用戶服用影響心率藥物（如 β阻斷劑），強度指標必須改用 RPE
- 提供居家與健身房兩種選項
- 對於高風險用戶（PAR-Q 多項為「是」），強調就醫評估的重要性
- 保持專業但易懂的語氣，適合一般民眾閱讀
- 不提供診斷或治療建議，僅提供運動指導

# Reference Exercise Database (參考動作庫)
- 上肢：伏地挺身（跪姿/標準/窄距）、啞鈴肩推、啞鈴划船、彈力帶拉伸、牆壁伏地挺身
- 下肢：深蹲（椅子深蹲/高腳杯深蹲）、弓箭步、臀橋、單腳硬舉、小腿上提、靠牆靜蹲
- 核心：棒式（跪姿/標準）、死蟲式、鳥狗式、仰臥捲腹、側棒式
- 平衡：單腳站立、腳跟腳尖走路、太極、坐站練習
- 柔軟度：股四頭肌伸展、腿後肌伸展、胸肌伸展、上背伸展、髖屈肌伸展`;

// 建構用戶資料摘要
function buildUserSummary(data) {
    const {
        age, gender, height, weight, bmi,
        health_status, diseases, fitness_level,
        exercise_habit, exercise_goal, limitations,
        parq_answers, prescription
    } = data;

    // 性別轉換
    const genderText = gender === 'male' ? '男性' : gender === 'female' ? '女性' : '其他';

    // 體能水平轉換
    const fitnessMap = {
        'excellent': '良好',
        'good': '尚可',
        'fair': '容易疲勞',
        'poor': '日常活動困難'
    };

    // 運動習慣轉換
    const habitMap = {
        'none': '沒有運動習慣',
        'light': '偶爾運動（每週1-2次）',
        'moderate': '規律運動（每週3-4次）',
        'active': '經常運動（每週5次以上）',
        'student_athlete': '學生運動員或專業訓練'
    };

    // 運動目標轉換
    const goalMap = {
        'health': '健康維護',
        'weight_loss': '減重瘦身',
        'muscle_building': '增肌塑形',
        'endurance': '增強體能',
        'rehabilitation': '復健治療',
        'performance': '運動表現提升'
    };

    // 疾病轉換
    const diseaseMap = {
        'overweight': '體重過重',
        'asthma': '氣喘',
        'hypertension': '高血壓',
        'diabetes': '糖尿病',
        'arthritis': '關節問題',
        'heart_recovery': '心臟疾病',
        'sarcopenia': '肌少症',
        'pregnant': '孕婦',
        'hyperlipidemia': '高血脂'
    };

    // 限制轉換
    const limitationMap = {
        'none': '無特別限制',
        'time': '時間限制',
        'motivation': '缺乏動機',
        'pain': '疼痛問題',
        'injury_history': '運動傷害史',
        'balance': '平衡感不佳',
        'palpitation': '呼吸困難',
        'equipment': '缺乏運動設備'
    };

    // PAR-Q 評估
    const parqYesCount = Object.values(parq_answers || {}).filter(v => v === 'yes').length;
    const parqRiskLevel = parqYesCount === 0 ? '低風險' : parqYesCount === 1 ? '中度風險' : '高風險';

    // 年齡分組
    let ageGroup = '';
    if (age >= 6 && age <= 11) ageGroup = '兒童（6-11歲）';
    else if (age >= 12 && age <= 17) ageGroup = '青少年（12-17歲）';
    else if (age >= 18 && age <= 64) ageGroup = '成人（18-64歲）';
    else if (age >= 65) ageGroup = '銀髮族（65歲以上）';

    return `
【用戶基本資料】
- 年齡：${age} 歲（${ageGroup}）
- 性別：${genderText}
- 身高：${height} 公分
- 體重：${weight} 公斤
${bmi ? `- BMI：${bmi}` : '- BMI：未計算（未成年）'}

【健康狀況】
- 整體健康：${health_status === 'healthy' ? '健康狀況良好' : '有健康狀況需注意'}
- 相關疾病：${diseases && diseases.length > 0 ? diseases.map(d => diseaseMap[d] || d).join('、') : '無'}
- 體能自評：${fitnessMap[fitness_level] || fitness_level}

【運動習慣與目標】
- 目前運動習慣：${habitMap[exercise_habit] || exercise_habit}
- 運動目標：${goalMap[exercise_goal] || exercise_goal}
- 運動限制：${limitations && limitations.length > 0 ? limitations.map(l => limitationMap[l] || l).join('、') : '無'}

【PAR-Q 運動準備評估】
- 風險等級：${parqRiskLevel}
- 回答「是」的問題數：${parqYesCount}/7

【系統計算的處方建議】
- 建議頻率：每週 ${prescription.frequency} 次
- 建議時間：每次 ${prescription.time} 分鐘
- 建議強度：${prescription.intensity}
- 運動類型：${prescription.type.join('、')}
`;
}

// ============== 預設模型配置 ==============
const DEFAULT_MODELS = {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
    claude: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash-exp'
};

// ============== AI 提供商呼叫函數 ==============

// 呼叫 Groq API（免費基本款）
async function callGroqAPI(userSummary, apiKey = GROQ_API_KEY, model = DEFAULT_MODELS.groq) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `請根據以下用戶資料，提供個人化的運動處方建議：\n\n${userSummary}` }
            ],
            max_tokens: 2048,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Groq API 錯誤: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { content: data.choices[0].message.content, model: model };
}

// 呼叫 Claude API
async function callClaudeAPI(userSummary, apiKey = ANTHROPIC_API_KEY, model = DEFAULT_MODELS.claude) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `請根據以下用戶資料，提供個人化的運動處方建議：\n\n${userSummary}`
                }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API 錯誤: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { content: data.content[0].text, model: model };
}

// 呼叫 Gemini API
async function callGeminiAPI(userSummary, apiKey = GEMINI_API_KEY, model = DEFAULT_MODELS.gemini) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `${SYSTEM_PROMPT}\n\n請根據以下用戶資料，提供個人化的運動處方建議：\n\n${userSummary}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.7
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API 錯誤: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { content: data.candidates[0].content.parts[0].text, model: model };
}

// 呼叫 OpenAI API
async function callOpenAIAPI(userSummary, apiKey = OPENAI_API_KEY, model = DEFAULT_MODELS.openai) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `請根據以下用戶資料，提供個人化的運動處方建議：\n\n${userSummary}` }
            ],
            max_tokens: 2048,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API 錯誤: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { content: data.choices[0].message.content, model: model };
}

// ============== API 端點 ==============

// AI 建議 API 端點
app.post('/api/ai-recommendation', async (req, res) => {
    try {
        const { userData, provider = 'auto', model = null, customApiKey = null } = req.body;

        if (!userData) {
            return res.status(400).json({
                success: false,
                error: '缺少用戶資料'
            });
        }

        // 輸入驗證
        const validation = validateUserData(userData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: `資料驗證失敗: ${validation.errors.join(', ')}`
            });
        }

        // 驗證 provider
        const validProviders = ['auto', 'groq', 'claude', 'gemini', 'openai'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({
                success: false,
                error: 'AI 提供商選項無效'
            });
        }

        // 清理自訂 API 金鑰
        const sanitizedApiKey = customApiKey ? sanitizeApiKey(customApiKey) : null;

        // 建構用戶摘要
        const userSummary = buildUserSummary(userData);

        let result;
        let usedProvider;

        // 選擇 AI 提供商
        switch (provider) {
            case 'groq':
                // Groq（使用後端金鑰或用戶提供的金鑰）
                const groqKey = sanitizedApiKey || GROQ_API_KEY;
                if (!groqKey) {
                    return res.status(500).json({
                        success: false,
                        error: '未設定 Groq API 金鑰'
                    });
                }
                result = await callGroqAPI(userSummary, groqKey, model || DEFAULT_MODELS.groq);
                usedProvider = `Groq (${result.model})`;
                break;

            case 'claude':
                // Claude（用戶提供金鑰或後端金鑰）
                const claudeKey = sanitizedApiKey || ANTHROPIC_API_KEY;
                if (!claudeKey) {
                    return res.status(400).json({
                        success: false,
                        error: '請提供 Claude API 金鑰'
                    });
                }
                result = await callClaudeAPI(userSummary, claudeKey, model || DEFAULT_MODELS.claude);
                usedProvider = `Claude (${result.model})`;
                break;

            case 'gemini':
                // Gemini（用戶提供金鑰或後端金鑰）
                const geminiKey = sanitizedApiKey || GEMINI_API_KEY;
                if (!geminiKey) {
                    return res.status(400).json({
                        success: false,
                        error: '請提供 Gemini API 金鑰'
                    });
                }
                result = await callGeminiAPI(userSummary, geminiKey, model || DEFAULT_MODELS.gemini);
                usedProvider = `Gemini (${result.model})`;
                break;

            case 'openai':
                // OpenAI（用戶提供金鑰或後端金鑰）
                const openaiKey = sanitizedApiKey || OPENAI_API_KEY;
                if (!openaiKey) {
                    return res.status(400).json({
                        success: false,
                        error: '請提供 OpenAI API 金鑰'
                    });
                }
                result = await callOpenAIAPI(userSummary, openaiKey, model || DEFAULT_MODELS.openai);
                usedProvider = `OpenAI (${result.model})`;
                break;

            case 'auto':
            default:
                // 自動選擇：優先使用 Groq（免費），然後依序嘗試其他
                if (GROQ_API_KEY) {
                    result = await callGroqAPI(userSummary, GROQ_API_KEY, DEFAULT_MODELS.groq);
                    usedProvider = `Groq (${result.model})`;
                } else if (ANTHROPIC_API_KEY) {
                    result = await callClaudeAPI(userSummary, ANTHROPIC_API_KEY, DEFAULT_MODELS.claude);
                    usedProvider = `Claude (${result.model})`;
                } else if (GEMINI_API_KEY) {
                    result = await callGeminiAPI(userSummary, GEMINI_API_KEY, DEFAULT_MODELS.gemini);
                    usedProvider = `Gemini (${result.model})`;
                } else if (OPENAI_API_KEY) {
                    result = await callOpenAIAPI(userSummary, OPENAI_API_KEY, DEFAULT_MODELS.openai);
                    usedProvider = `OpenAI (${result.model})`;
                } else {
                    return res.status(500).json({
                        success: false,
                        error: '未設定任何 AI API 金鑰'
                    });
                }
                break;
        }

        res.json({
            success: true,
            recommendation: result.content,
            provider: usedProvider,
            model: result.model
        });

    } catch (error) {
        console.error('AI 建議生成錯誤:', error);
        // 避免洩漏敏感錯誤資訊
        const safeErrorMessage = error.message?.includes('API')
            ? 'AI 服務暫時無法使用，請檢查 API 金鑰是否正確'
            : 'AI 服務暫時無法使用，請稍後再試';
        res.status(500).json({
            success: false,
            error: safeErrorMessage
        });
    }
});

// 健康檢查端點
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        aiProviders: {
            groq: !!GROQ_API_KEY,
            claude: !!ANTHROPIC_API_KEY,
            gemini: !!GEMINI_API_KEY,
            openai: !!OPENAI_API_KEY
        }
    });
});

// 可用提供商查詢端點
app.get('/api/providers', (req, res) => {
    res.json({
        available: {
            groq: !!GROQ_API_KEY,
            claude: !!ANTHROPIC_API_KEY,
            gemini: !!GEMINI_API_KEY,
            openai: !!OPENAI_API_KEY
        },
        defaultProvider: GROQ_API_KEY ? 'groq' :
                        ANTHROPIC_API_KEY ? 'claude' :
                        GEMINI_API_KEY ? 'gemini' :
                        OPENAI_API_KEY ? 'openai' : null
    });
});

// 首頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`運動處方 AI 建議系統運行於 http://localhost:${PORT}`);
    console.log(`AI 提供商狀態:
  - Groq (免費): ${GROQ_API_KEY ? '已設定 ✓' : '未設定'}
  - Claude: ${ANTHROPIC_API_KEY ? '已設定 ✓' : '未設定'}
  - Gemini: ${GEMINI_API_KEY ? '已設定 ✓' : '未設定'}
  - OpenAI: ${OPENAI_API_KEY ? '已設定 ✓' : '未設定'}`);
});

module.exports = app;
