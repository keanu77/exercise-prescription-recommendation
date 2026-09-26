// PAR-Q+ 問卷系統 JavaScript

// 全局變量
let parqAnswers = {};
let basicInfo = {};

// 頁面路由管理
function showPage(pageId) {
    // 隱藏所有頁面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // 顯示指定頁面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 滾動到頂部
    window.scrollTo(0, 0);
}

// BMI 計算功能
function calculateBMI() {
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);

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

        // 計算 BMR 和 TDEE
        calculateBMR();

    } else {
        document.getElementById('bmiValue').textContent = '待計算';
        document.getElementById('bmiCategory').textContent = '';
        document.getElementById('bmiCategory').className = 'text-sm px-2 py-1 rounded';
    }
}

// BMR 基礎代謝率計算（使用 Mifflin-St Jeor 公式）
function calculateBMR() {
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);

    if (!age || !gender || !height || !weight) {
        document.getElementById('bmrValue').textContent = '待計算';
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

    if (!bmrElement || bmrElement.textContent === '待計算') {
        document.getElementById('tdeeValue').textContent = '待計算';
        return;
    }

    const bmr = parseInt(bmrElement.textContent);
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
async function downloadPDF() {
    try {
        // 顯示載入中提示
        const loadingMsg = document.createElement('div');
        loadingMsg.innerHTML = '正在準備 PDF 下載...';
        loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#3b82f6;color:white;padding:20px;border-radius:8px;z-index:10000;';
        document.body.appendChild(loadingMsg);

        // 確保 PDF 函式庫已載入
        if (typeof loadPDFLibraries === 'function') {
            await loadPDFLibraries();
        }

        // 移除載入提示
        setTimeout(() => document.body.removeChild(loadingMsg), 500);

        // 創建一個臨時的PDF內容容器
        const pdfContent = createPDFContent();
        document.body.appendChild(pdfContent);

        // 使用 html2canvas 將內容轉換為圖片
        const canvas = await html2canvas(pdfContent, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            scrollX: 0,
            scrollY: 0
        });

        // 移除臨時容器
        document.body.removeChild(pdfContent);

        // 創建 PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // 計算圖片尺寸以適應 A4
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // 添加第一頁
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;

        // 如果內容超過一頁，添加更多頁面
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= 297;
        }

        // 生成檔案名稱
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;

        // 下載 PDF
        pdf.save(`PAR-Q+評估報告_${dateStr}.pdf`);

    } catch (error) {
        console.error('PDF 生成錯誤:', error);
        alert('PDF 生成失敗，請稍後再試。');
    }
}

// 創建PDF內容的HTML結構
function createPDFContent() {
    const risk = assessParqLevel(parqAnswers);
    const yesCount = risk.yesCount;

    const container = document.createElement('div');
    container.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 794px;
        background: white;
        font-family: 'Noto Sans TC', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        padding: 8px 30px;
        box-sizing: border-box;
    `;

    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: #1e40af;">
                PAR-Q+ 運動準備問卷評估報告
            </h1>
            <p style="font-size: 14px; color: #6b7280; margin: 0;">
                評估日期：${new Date().toLocaleDateString('zh-TW')}
            </p>
        </div>

        <!-- 個人基本資料 -->
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">
                個人基本資料
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                <div>年齡：${basicInfo.age} 歲</div>
                <div>性別：${basicInfo.gender === 'male' ? '男' : '女'}</div>
                <div>身高：${basicInfo.height} 公分</div>
                <div>體重：${basicInfo.weight} 公斤</div>
                <div>BMI：${basicInfo.bmi || 'N/A'}</div>
                <div>BMR：${basicInfo.bmr || 'N/A'} 大卡/天</div>
                <div>TDEE：${basicInfo.tdee || 'N/A'} 大卡/天</div>
                <div>活動水平：${getActivityLevelText(basicInfo.activityLevel)}</div>
            </div>
        </div>

        <!-- PAR-Q+ 問卷結果 -->
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">
                PAR-Q+ 問卷結果
            </h2>
            <div style="font-size: 12px;">
                <p style="margin-bottom: 10px;"><strong>總評分：${yesCount}/7 個「是」</strong></p>
                ${generateAnswerSummary()}
            </div>
        </div>

        <!-- 風險評估 -->
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">
                風險評估與建議
            </h2>
            <div style="font-size: 12px;">
                ${generateRiskSummaryForPDF(risk)}
            </div>
        </div>

        <!-- 免責聲明 -->
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <h3 style="font-size: 14px; font-weight: bold; color: #1f2937; margin-bottom: 8px;">免責聲明</h3>
            <p style="font-size: 10px; color: #6b7280; line-height: 1.4;">
                PAR-Q+ 問卷僅為初步健康篩檢工具，無法取代完整的醫學檢查。
                如有任何健康疑慮，請諮詢專業醫療人員。
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280; margin-top: 10px;">
                <div>製作者：運動醫學科 吳易澄醫師</div>
                <div>基於 PAR-Q+ 國際標準</div>
            </div>
        </div>
    `;

    return container;
}

// 生成問答摘要
function generateAnswerSummary() {
    const questions = [
        '醫師是否曾告訴您患有心臟病或高血壓？',
        '休息、日常生活或身體活動時是否會胸痛？',
        '過去 12 個月內是否曾因頭暈失去平衡或失去意識？',
        '是否曾被診斷其他慢性疾病（心臟病與高血壓除外）？',
        '目前是否正在服用治療慢性疾病的處方藥？',
        '是否有可能因增加活動而加重的骨骼、關節或軟組織問題？',
        '醫師是否曾告訴您只能在醫療監督下進行身體活動？'
    ];

    let summary = '';
    for (let i = 1; i <= 7; i++) {
        const answer = parqAnswers[`q${i}`] === 'yes' ? '是' : '否';
        summary += `<div style="margin-bottom: 5px;">${i}. ${answer}</div>`;
    }
    return summary;
}

// 生成PDF用的風險摘要
function generateRiskSummaryForPDF(risk) {
    if (risk.level === 'low') {
        return `
            <div style="color: #059669; font-weight: bold;">風險等級：低風險 ✅</div>
            <div style="margin-top: 10px;">
                <div>• 一般可從低至中等強度開始逐步增加活動；運動中如有不適請立即停止並就醫</div>
                <div>• 建議從低強度開始逐步增加</div>
                <div>• 每週150-300分鐘中等強度有氧運動</div>
                <div>• 每週至少2次肌力訓練</div>
            </div>
        `;
    } else if (risk.level === 'moderate') {
        return `
            <div style="color: #d97706; font-weight: bold;">風險等級：中等風險 ⚠️</div>
            <div style="margin-top: 10px;">
                <div>• 建議運動前諮詢醫療專業人員</div>
                <div>• 選擇低到中等強度運動</div>
                <div>• 運動時需要密切監控身體反應</div>
                <div>• 定期追蹤健康狀況</div>
            </div>
        `;
    } else {
        return `
            <div style="color: #dc2626; font-weight: bold;">風險等級：高風險 🛑</div>
            <div style="margin-top: 10px;">
                <div>• 必須先接受完整醫療評估</div>
                <div>• 運動計畫需要醫療監督</div>
                <div>• 取得許可前僅進行低強度身體活動</div>
                <div>• 在醫師同意前，僅進行日常活動與輕度活動</div>
            </div>
        `;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 確保首頁為預設顯示頁面
    showPage('homePage');
});