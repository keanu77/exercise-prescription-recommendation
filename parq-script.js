// PAR-Q+ 問卷系統 JavaScript

// 全局變量
let parqAnswers = {};
let basicInfo = {};

// 頁面路由管理
const PARQ_PAGE_TITLES = {
    homePage: 'PAR-Q+ 運動準備問卷系統',
    basicInfoPage: '基本資料｜PAR-Q+ 運動準備問卷',
    parqPage: '健康篩檢問題｜PAR-Q+ 運動準備問卷',
    resultPage: '評估結果｜PAR-Q+ 運動準備問卷'
};

function showPage(pageId, { focusHeading = true } = {}) {
    const targetPage = document.getElementById(pageId);
    if (!targetPage) return;

    // 隱藏所有頁面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // 顯示指定頁面
    targetPage.classList.add('active');
    document.title = PARQ_PAGE_TITLES[pageId] || PARQ_PAGE_TITLES.homePage;
    const heading = targetPage.querySelector('h2');
    if (focusHeading && heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
    }

    // 滾動到頂部
    window.scrollTo(0, 0);
}

// 使用欄位既有的 required、min、max、step，避免無效資料進入即時計算。
function readValidNumber(id) {
    const input = document.getElementById(id);
    return input?.value && input.validity.valid && Number.isFinite(input.valueAsNumber)
        ? input.valueAsNumber
        : null;
}

// BMI 計算功能
function calculateBMI() {
    const height = readValidNumber('height');
    const weight = readValidNumber('weight');

    if (height && weight && height > 0 && weight > 0) {
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        const bmiRounded = Math.round(bmi * 10) / 10;

        // 更新BMI值
        document.getElementById('bmiValue').textContent = bmiRounded;

        // 判斷BMI分類
        let category = '';
        let categoryClass = '';

        if (bmi < 18.5) {
            category = '體重過輕';
            categoryClass = 'bg-blue-100 text-blue-800';
        } else if (bmi < 24) {
            category = '正常範圍';
            categoryClass = 'bg-green-100 text-green-800';
        } else if (bmi < 27) {
            category = '體重過重';
            categoryClass = 'bg-yellow-100 text-yellow-800';
        } else if (bmi < 30) {
            category = '輕度肥胖';
            categoryClass = 'bg-orange-100 text-orange-800';
        } else if (bmi < 35) {
            category = '中度肥胖';
            categoryClass = 'bg-red-100 text-red-800';
        } else {
            category = '重度肥胖';
            categoryClass = 'bg-red-200 text-red-900';
        }

        const categoryElement = document.getElementById('bmiCategory');
        categoryElement.textContent = category;
        categoryElement.className = `text-sm px-2 py-1 rounded ${categoryClass}`;

    } else {
        document.getElementById('bmiValue').textContent = '待計算';
        document.getElementById('bmiCategory').textContent = '';
        document.getElementById('bmiCategory').className = 'text-sm px-2 py-1 rounded';
    }
    // 輸入清空或無效時也要同步清除衍生資料。
    calculateBMR();
}

// BMR 基礎代謝率計算（使用 Mifflin-St Jeor 公式）
function calculateBMR() {
    const age = readValidNumber('age');
    const gender = document.getElementById('gender').value;
    const height = readValidNumber('height');
    const weight = readValidNumber('weight');

    if (!age || !gender || !height || !weight) {
        document.getElementById('bmrValue').textContent = '待計算';
        calculateTDEE();
        return;
    }

    let bmr;
    if (gender === 'male') {
        // 男性：BMR = (10 × 體重kg) + (6.25 × 身高cm) - (5 × 年齡) + 5
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        // 女性：BMR = (10 × 體重kg) + (6.25 × 身高cm) - (5 × 年齡) - 161
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    bmr = Math.round(bmr);
    document.getElementById('bmrValue').textContent = bmr;

    // 自動計算 TDEE
    calculateTDEE();
}

// TDEE 每日總消耗熱量計算
function calculateTDEE() {
    const bmrElement = document.getElementById('bmrValue');
    const activityLevel = parseFloat(document.getElementById('activityLevel')?.value) || 1.375;

    const bmr = Number(bmrElement?.textContent);
    if (!Number.isFinite(bmr) || !readValidNumber('age') ||
        !readValidNumber('height') || !readValidNumber('weight') ||
        !document.getElementById('gender').value) {
        document.getElementById('tdeeValue').textContent = '待計算';
        document.getElementById('calorieAdvice').classList.add('hidden');
        for (const id of ['maintainCalories', 'loseCalories', 'gainCalories']) {
            document.getElementById(id).textContent = '';
        }
        return;
    }

    const tdee = Math.round(bmr * activityLevel);

    document.getElementById('tdeeValue').textContent = tdee;

    // 顯示熱量建議
    showCalorieAdvice(tdee);
}

// PAR-Q+ 2025 分級規則（與 script.js assessPARQRisk、functions/_lib/ai.js assessParqLevel 一致）：
// 官方規則是二元：任一「是」→ 完成第 2、3 頁追蹤問題並諮詢；全「否」→ 循序漸進開始。
// 分級依 ACSM 2015 運動前篩檢演算法：q2 胸痛、q3 頭暈／失去意識為徵候症狀，q7 醫囑須醫療監督 → high；
// 其他任一「是」（q1 心臟病／高血壓、q4 其他慢性病、q5 服藥、q6 骨關節）→ moderate；全「否」→ low。
const PARQ_SYMPTOM_QUESTIONS = ['q2', 'q3', 'q7'];
const PARQ_CARDIAC_DISEASE_QUESTIONS = ['q1', 'q5'];

function assessParqLevel(answers) {
    const yesCount = Object.values(answers).filter(a => a === 'yes').length;
    const symptomFlag = PARQ_SYMPTOM_QUESTIONS.some(q => answers[q] === 'yes');
    const cardiacDiseaseFlag = PARQ_CARDIAC_DISEASE_QUESTIONS.some(q => answers[q] === 'yes');
    const level = symptomFlag ? 'high' : yesCount > 0 ? 'moderate' : 'low';
    return { level, yesCount, symptomFlag, cardiacDiseaseFlag };
}

// 減重熱量赤字不適用：未成年、體重過輕（本頁無懷孕欄位）
function getCalorieDeficitBlockReason() {
    const age = parseInt(document.getElementById('age')?.value);
    const height = parseFloat(document.getElementById('height')?.value);
    const weight = parseFloat(document.getElementById('weight')?.value);
    if (age && age < 18) return '未滿18歲仍在生長發育，不建議以熱量赤字減重';
    if (height && weight && weight / Math.pow(height / 100, 2) < 18.5) {
        return '目前體重過輕，不建議減重，請優先確保足夠營養';
    }
    return null;
}

// 顯示熱量攝取建議
function showCalorieAdvice(tdee) {
    const calorieAdviceDiv = document.getElementById('calorieAdvice');
    const maintainElement = document.getElementById('maintainCalories');
    const loseElement = document.getElementById('loseCalories');
    const gainElement = document.getElementById('gainCalories');
    const loseRow = document.getElementById('loseCaloriesRow');
    const loseNote = document.getElementById('loseCaloriesNote');

    if (!calorieAdviceDiv || !maintainElement || !loseElement || !gainElement) return;

    maintainElement.textContent = tdee;
    gainElement.textContent = tdee + 300;

    const blockReason = getCalorieDeficitBlockReason();
    if (blockReason) {
        loseElement.textContent = '';
        loseRow?.classList.add('hidden');
        if (loseNote) {
            loseNote.textContent = `• ${blockReason}`;
            loseNote.classList.remove('hidden');
        }
    } else {
        loseElement.textContent = Math.max(1200, tdee - 500); // 最低不低於1200卡
        loseRow?.classList.remove('hidden');
        loseNote?.classList.add('hidden');
    }

    calorieAdviceDiv.classList.remove('hidden');
}

// 進入 PAR-Q+ 問卷
function proceedToPARQ() {
    // 驗證基本資料是否完整
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const height = document.getElementById('height').value;
    const weight = document.getElementById('weight').value;

    if (!age || !gender || !height || !weight) {
        alert('請完成所有基本資料後再繼續');
        return;
    }
    // HTML 的 min/max 不會在 type="button" 前進時自動阻擋，這裡明確檢查範圍
    for (const id of ['age', 'height', 'weight']) {
        const el = document.getElementById(id);
        if (el && typeof el.checkValidity === 'function' && !el.checkValidity()) {
            alert(el.validationMessage || '請確認輸入數值在允許範圍內');
            el.focus();
            return;
        }
    }

    // 確保摘要與通過驗證的欄位一致。
    calculateBMI();

    // 保存基本資料
    basicInfo = {
        age: parseInt(age),
        gender: gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        bmi: parseFloat(document.getElementById('bmiValue').textContent) || null,
        bmr: parseInt(document.getElementById('bmrValue').textContent) || null,
        tdee: parseInt(document.getElementById('tdeeValue').textContent) || null,
        activityLevel: parseFloat(document.getElementById('activityLevel').value)
    };

    showPage('parqPage');
}

// PAR-Q+ 問題選擇處理
function selectAnswer(questionNumber, answer) {
    // 保存答案
    parqAnswers[`q${questionNumber}`] = answer;

    // 更新UI樣式
    const questionCard = document.querySelector(`input[name="q${questionNumber}"]`).closest('.card');
    const options = questionCard.querySelectorAll('.radio-option');

    options.forEach(option => {
        option.classList.remove('selected', 'yes-selected');
        const input = option.querySelector('input');
        if (input.value === answer) {
            input.checked = true;
            option.classList.add('selected');
            if (answer === 'yes') {
                option.classList.add('yes-selected');
            }
        } else {
            input.checked = false;
        }
    });

}

// 生成評估結果
function generateAssessment() {
    // 檢查是否所有問題都已回答
    for (let i = 1; i <= 7; i++) {
        if (!parqAnswers[`q${i}`]) {
            alert(`請回答問題 ${i}`);
            return;
        }
    }

    const risk = assessParqLevel(parqAnswers);

    // 顯示結果頁
    showPage('resultPage');

    // 生成風險評估
    displayRiskAssessment(risk);

    // 生成運動建議
    displayExerciseRecommendations(risk);
}

// 顯示風險評估結果
function displayRiskAssessment(risk) {
    const container = document.getElementById('riskAssessment');
    const { level, yesCount } = risk;

    let riskLevel, riskDescription, riskClass, recommendations;

    if (level === 'low') {
        // 低風險 - 綠燈
        riskLevel = '低風險';
        riskClass = 'risk-low';
        riskDescription = '問卷全部回答「否」：可以進行身體活動，請慢慢開始、循序漸進';
        recommendations = [
            '✅ 可以開始輕到中等強度的運動',
            '✅ 建議從低強度開始，逐步增加',
            '✅ 運動中如有胸痛、頭暈、異常喘等不適，請立即停止並就醫',
            (basicInfo.age > 45 ? '⚠️ 超過 45 歲且不習慣規律劇烈運動者，進行劇烈強度前請先諮詢合格運動專業人員' : '✅ 可循 WHO 各年齡層身體活動指引逐步增加'),
            '✅ 問卷效期 12 個月，健康狀況改變時請重新填寫'
        ];
    } else if (level === 'moderate') {
        // 中等風險 - 黃燈
        riskLevel = '中等風險';
        riskClass = 'risk-medium';
        riskDescription = '問卷有一項以上回答「是」：依 PAR-Q+ 規定，請完成第 2、3 頁追蹤問題（eparmedx.com）並諮詢合格運動專業人員或醫師';
        recommendations = [
            '⚠️ 建議諮詢醫師後再開始運動',
            '⚠️ 選擇低強度運動開始',
            '⚠️ 運動時需要密切監控',
            '⚠️ 定期追蹤健康狀況'
        ];
    } else {
        // 高風險 - 紅燈（心臟病史或胸痛）
        riskLevel = '高風險';
        riskClass = 'risk-high';
        riskDescription = '問卷顯示胸痛、頭暈／昏厥等症狀，或醫囑須醫療監督：開始任何強度的運動前，請先接受醫師評估';
        recommendations = [
            '🛑 開始任何強度的運動前，先接受醫師評估',
            '🛑 取得許可前僅進行低強度身體活動（ePARmed-X+）',
            '🛑 運動計畫需要醫療監督',
            '🛑 在醫師同意前，僅進行日常活動與輕度活動'
        ];
    }

    container.innerHTML = `
        <div class="${riskClass} p-6 rounded-lg text-center">
            <h3 class="text-3xl font-bold mb-4">風險評估：${riskLevel}</h3>
            <p class="text-xl mb-4">${riskDescription}</p>
            <div class="bg-black bg-opacity-20 rounded-lg p-4">
                <p class="text-lg font-semibold mb-2">PAR-Q+ 評分：${yesCount}/7 個「是」</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                    ${recommendations.map(rec => `<div>${rec}</div>`).join('')}
                </div>
            </div>
        </div>
    `;
}

// 顯示運動建議
function displayExerciseRecommendations(risk) {
    const container = document.getElementById('exerciseRecommendations');
    const { level } = risk;

    let exerciseAdvice, precautions;

    if (level === 'low') {
        // 低風險運動建議
        exerciseAdvice = {
            title: '🟢 推薦運動計畫',
            content: `
                <h4 class="font-semibold text-green-800 mb-3">有氧運動建議</h4>
                <ul class="space-y-2 text-green-700">
                    <li>• 每週 150-300 分鐘中等強度有氧運動</li>
                    <li>• 或每週 75-150 分鐘劇烈強度有氧運動</li>
                    <li>• 推薦活動：快走、游泳、騎車、慢跑</li>
                </ul>

                <h4 class="font-semibold text-green-800 mb-3 mt-4">肌力訓練建議</h4>
                <ul class="space-y-2 text-green-700">
                    <li>• 每週至少 2 次肌力訓練</li>
                    <li>• 針對主要肌群，每組 8-12 次重複</li>
                    <li>• 漸進式增加負重和強度</li>
                </ul>
            `,
            bgColor: 'bg-green-50 border-green-200'
        };

        precautions = {
            title: '📋 注意事項',
            content: `
                <ul class="space-y-2 text-gray-700">
                    <li>• 運動前進行 5-10 分鐘暖身</li>
                    <li>• 運動後進行 5-10 分鐘緩和運動</li>
                    <li>• 保持充足水分補充</li>
                    <li>• 如有不適立即停止運動</li>
                    <li>• 建議每年重新評估健康狀況</li>
                </ul>
            `,
            bgColor: 'bg-blue-50 border-blue-200'
        };

    } else if (level === 'moderate') {
        // 中等風險運動建議
        exerciseAdvice = {
            title: '🟡 謹慎運動計畫',
            content: `
                <h4 class="font-semibold text-amber-800 mb-3">建議運動類型</h4>
                <ul class="space-y-2 text-amber-700">
                    <li>• 低到中等強度有氧運動</li>
                    <li>• 每週 3-4 次，每次 20-30 分鐘</li>
                    <li>• 推薦：走路、水中運動、伸展</li>
                    <li>• 避免高強度間歇訓練</li>
                </ul>

                <h4 class="font-semibold text-amber-800 mb-3 mt-4">醫療建議</h4>
                <ul class="space-y-2 text-amber-700">
                    <li>• 完成 PAR-Q+ 追蹤問題並諮詢合格運動專業人員或醫師</li>
                    <li>• 心臟病／高血壓或服藥者：以自覺用力程度與說話測試控制強度，不以心率為準</li>
                    <li>• 定期監控健康指標</li>
                </ul>
            `,
            bgColor: 'bg-amber-50 border-amber-200'
        };

        precautions = {
            title: '⚠️ 重要警告',
            content: `
                <ul class="space-y-2 text-gray-700">
                    <li>• 運動時密切注意身體反應</li>
                    <li>• 出現胸痛、氣喘立即停止</li>
                    <li>• 建議有人陪伴運動</li>
                    <li>• 攜帶緊急聯絡資訊</li>
                    <li>• 定期醫療追蹤檢查</li>
                </ul>
            `,
            bgColor: 'bg-orange-50 border-orange-200'
        };

    } else {
        // 高風險運動建議
        exerciseAdvice = {
            title: '🔴 醫療監督運動',
            content: `
                <h4 class="font-semibold text-red-800 mb-3">當前建議</h4>
                <ul class="space-y-2 text-red-700">
                    <li>• 暫停自主運動計畫</li>
                    <li>• 必須接受完整醫學評估</li>
                    <li>• 運動計畫需醫療專業監督</li>
                    <li>• 可能需要心臟專科評估</li>
                </ul>

                <h4 class="font-semibold text-red-800 mb-3 mt-4">允許的活動</h4>
                <ul class="space-y-2 text-red-700">
                    <li>• 日常生活基本活動</li>
                    <li>• 輕度步行（經醫師同意）</li>
                    <li>• 醫療監督下的復健運動</li>
                </ul>
            `,
            bgColor: 'bg-red-50 border-red-200'
        };

        precautions = {
            title: '🚨 緊急提醒',
            content: `
                <ul class="space-y-2 text-gray-700">
                    <li>• 立即諮詢醫療專業人員</li>
                    <li>• 出現症狀時尋求急診</li>
                    <li>• 不可自行開始運動計畫</li>
                    <li>• 攜帶醫療識別卡</li>
                    <li>• 定期專科醫師追蹤</li>
                </ul>
            `,
            bgColor: 'bg-red-50 border-red-200'
        };
    }

    // 加入基本資料摘要
    const basicInfoSummary = `
        <div class="card ${precautions.bgColor} border mb-4">
            <h3 class="text-xl font-bold text-gray-800 mb-4">📊 個人資料摘要</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div><strong>年齡：</strong>${basicInfo.age} 歲</div>
                <div><strong>性別：</strong>${basicInfo.gender === 'male' ? '男' : '女'}</div>
                <div><strong>BMI：</strong>${basicInfo.bmi || 'N/A'}</div>
                <div><strong>BMR：</strong>${basicInfo.bmr || 'N/A'} 大卡/天</div>
                <div><strong>TDEE：</strong>${basicInfo.tdee || 'N/A'} 大卡/天</div>
                <div><strong>活動水平：</strong>${getActivityLevelText(basicInfo.activityLevel)}</div>
            </div>
        </div>
    `;

    container.innerHTML = `
        ${basicInfoSummary}

        <div class="card ${exerciseAdvice.bgColor} border">
            <h3 class="text-xl font-bold text-gray-800 mb-4">${exerciseAdvice.title}</h3>
            ${exerciseAdvice.content}
        </div>

        <div class="card ${precautions.bgColor} border">
            <h3 class="text-xl font-bold text-gray-800 mb-4">${precautions.title}</h3>
            ${precautions.content}
        </div>
    `;
}

// 獲取活動水平文字描述
function getActivityLevelText(level) {
    const levels = {
        1.2: '久坐',
        1.375: '輕度活動',
        1.55: '中度活動',
        1.725: '高度活動',
        1.9: '非常高度活動'
    };
    return levels[level] || '未知';
}

// PDF 下載功能
let pdfDownloadInProgress = false;

async function downloadPDF() {
    if (pdfDownloadInProgress) return;
    pdfDownloadInProgress = true;
    let loadingMsg = null;
    const downloadButton = document.getElementById('downloadPdfButton');
    if (downloadButton) downloadButton.disabled = true;
    try {
        // 顯示載入中提示
        loadingMsg = document.createElement('div');
        loadingMsg.id = 'pdfLoadingStatus';
        loadingMsg.setAttribute('role', 'status');
        loadingMsg.textContent = '正在準備 PDF 下載...';
        loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#3b82f6;color:white;padding:20px;border-radius:8px;z-index:10000;';
        document.body.appendChild(loadingMsg);

        const report = createPDFReport();
        await loadPDFLibraries();
        const pdf = renderPDFReport(report);

        // 生成檔案名稱
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;

        // 下載 PDF
        pdf.save(`PAR-Q+評估報告_${dateStr}.pdf`);

    } catch (error) {
        console.error('PDF 生成錯誤:', error);
        alert('PDF 生成失敗，請稍後再試');
    } finally {
        loadingMsg?.remove();
        if (downloadButton) downloadButton.disabled = false;
        pdfDownloadInProgress = false;
    }
}

// Reuse the visible assessment wording so printed safety advice cannot drift.
function createPDFReport() {
    const risk = assessParqLevel(parqAnswers);
    const riskNode = document.getElementById('riskAssessment');
    const recommendations = [...riskNode.querySelectorAll('.grid > div')].map(el => cleanPDFText(el.textContent));
    const questions = Array.from({ length: 7 }, (_, i) => [
        `第 ${i + 1} 題：${parqAnswers[`q${i + 1}`] === 'yes' ? '是' : '否'}`,
        document.getElementById(`parq-question-${i + 1}`).textContent.trim().replace(/^\d+\.\s*/, '')
    ]);
    const sections = [
        { title: '01  個人概況', kind: 'facts', items: [
            ['年齡／性別', `${basicInfo.age} 歲／${basicInfo.gender === 'male' ? '男' : '女'}`],
            ['身高／體重', `${basicInfo.height} cm／${basicInfo.weight} kg`],
            ['BMI', basicInfo.bmi ?? '待計算'], ['活動水平', getActivityLevelText(basicInfo.activityLevel)],
            ['基礎代謝 BMR', basicInfo.bmr ? `${basicInfo.bmr} 大卡／天` : '待計算'],
            ['每日消耗 TDEE', basicInfo.tdee ? `${basicInfo.tdee} 大卡／天` : '待計算'],
        ] },
        { title: '02  PAR-Q+ 問卷與回答', kind: 'rows', items: questions },
        { title: '03  評估後的下一步', kind: 'list', newPage: true, items: recommendations },
    ];
    // Skip the personal-data card already represented above; keep all subsequent
    // headings and advice, including high-risk restrictions and expiry reminders.
    const cards = [...document.querySelectorAll('#exerciseRecommendations > .card')].slice(1);
    for (const [index, card] of cards.entries()) {
        const items = [...card.querySelectorAll('h4, li')].map(el => cleanPDFText(el.textContent));
        sections.push({ title: `${String(index + 4).padStart(2, '0')}  ${cleanPDFText(card.querySelector('h3').textContent)}`, kind: 'list', items });
    }
    return {
        title: 'PAR-Q+ 運動準備報告', subtitle: '整理您的回答，掌握開始活動前的下一步。',
        date: new Date().toLocaleDateString('zh-TW'),
        notice: {
            level: risk.level,
            title: `${cleanPDFText(riskNode.querySelector('h3').textContent)}  /  ${risk.yesCount} 題回答「是」`,
            body: cleanPDFText(riskNode.querySelector('p').textContent),
        },
        sections,
        disclaimer: 'PAR-Q+ 問卷僅為初步健康篩檢工具，無法取代完整的醫學檢查。如有任何健康疑慮，請諮詢專業醫療人員。',
    };
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    const actions = { proceedToPARQ, generateAssessment, downloadPDF };
    document.querySelectorAll('[data-page]').forEach((button) => {
        button.addEventListener('click', () => showPage(button.dataset.page));
    });
    document.querySelectorAll('[data-action]').forEach((button) => {
        const action = actions[button.dataset.action];
        if (action) button.addEventListener('click', () => action());
    });
    document.getElementById('age').addEventListener('input', calculateBMR);
    document.getElementById('gender').addEventListener('change', calculateBMR);
    for (const id of ['height', 'weight']) {
        document.getElementById(id).addEventListener('input', calculateBMI);
    }
    document.getElementById('activityLevel').addEventListener('change', calculateTDEE);
    document.getElementById('parqForm').addEventListener('change', (event) => {
        const input = event.target;
        const question = /^q([1-7])$/.exec(input.name || '');
        if (question && input.type === 'radio' && input.checked) {
            selectAnswer(Number(question[1]), input.value);
        }
    });
    // 確保首頁為預設顯示頁面
    showPage('homePage', { focusHeading: false });
});
