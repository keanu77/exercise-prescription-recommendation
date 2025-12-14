// DOM 元素快取
const DOMCache = {
    elements: {},
    get(id) {
        if (!this.elements[id]) {
            this.elements[id] = document.getElementById(id);
        }
        return this.elements[id];
    },
    query(selector) {
        if (!this.elements[selector]) {
            this.elements[selector] = document.querySelector(selector);
        }
        return this.elements[selector];
    },
    queryAll(selector) {
        // queryAll 不快取，因為可能會動態變化
        return document.querySelectorAll(selector);
    },
    clear() {
        this.elements = {};
    }
};

// MET 活動資料庫
const MET_ACTIVITIES = {
    light: [
        { name: '緩慢走路', met: 2.0, examples: ['漫步', '輕鬆散步', '購物走路'] },
        { name: '輕度家務', met: 2.5, examples: ['洗碗', '整理房間', '烹飪'] },
        { name: '伸展運動', met: 2.3, examples: ['瑜伽伸展', '太極', '簡單拉筋'] },
        { name: '辦公室工作', met: 1.8, examples: ['打字', '閱讀', '會議'] }
    ],
    moderate: [
        { name: '快走', met: 3.5, examples: ['健走', '快速步行', '爬樓梯'] },
        { name: '騎自行車(休閒)', met: 4.0, examples: ['平地騎車', '休閒單車', '通勤騎車'] },
        { name: '游泳(輕鬆)', met: 4.5, examples: ['蛙式慢游', '水中走路', '水中有氧'] },
        { name: '舞蹈', met: 4.8, examples: ['社交舞', '有氧舞蹈', '廣場舞'] },
        { name: '網球(雙打)', met: 5.0, examples: ['雙打網球', '羽毛球雙打', '桌球'] }
    ],
    vigorous: [
        { name: '跑步', met: 8.0, examples: ['慢跑', '中速跑步', '間歇跑'] },
        { name: '騎自行車(快速)', met: 8.5, examples: ['競速騎車', '山地車', '高強度騎車'] },
        { name: '游泳(快速)', met: 10.0, examples: ['自由式', '蝶式', '競技游泳'] },
        { name: '籃球', met: 6.5, examples: ['全場籃球', '激烈對戰', '比賽'] },
        { name: '重量訓練', met: 6.0, examples: ['高強度重訓', 'CrossFit', '功能性訓練'] }
    ]
};

// 計算熱量消耗
function calculateCalories(metValue, weightKg, durationMinutes) {
    const hours = durationMinutes / 60;
    return Math.round(metValue * weightKg * hours * 10) / 10;
}

// 生成 MET 活動 HTML
function getMETActivitiesHtml(prescription) {
    const weight = parseFloat(document.getElementById('weight')?.value) || 70;
    let intensity = 'moderate'; // 預設中度
    
    // 根據年齡和體能狀況調整強度
    const age = parseInt(document.getElementById('age')?.value) || 30;
    const fitnessLevelElement = document.querySelector('input[name="fitness_level"]:checked');
    const fitnessLevel = fitnessLevelElement ? fitnessLevelElement.value : 'good';
    
    if (age >= 65 || fitnessLevel === 'poor') {
        intensity = 'light';
    } else if (fitnessLevel === 'excellent' && age < 50) {
        intensity = 'vigorous';
    }
    
    const activities = MET_ACTIVITIES[intensity].slice(0, 3); // 取前3個活動
    
    const activitiesHtml = activities.map(activity => {
        const calories30min = calculateCalories(activity.met, weight, 30);
        return `
            <div class="bg-white p-3 rounded border">
                <div class="flex justify-between items-start">
                    <div>
                        <h6 class="font-semibold text-gray-800">${activity.name}</h6>
                        <p class="text-sm text-gray-600">${activity.met} METs</p>
                        <p class="text-xs text-gray-500">例子: ${activity.examples.join('、')}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-semibold text-blue-600">${calories30min} 卡路里</p>
                        <p class="text-xs text-gray-500">30分鐘</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const intensityName = intensity === 'light' ? '輕度' : intensity === 'moderate' ? '中度' : '高強度';
    const metRange = intensity === 'light' ? '1.6-2.9' : intensity === 'moderate' ? '3.0-5.9' : '≥6.0';
    
    return `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h5 class="font-semibold text-yellow-800 mb-3">推薦 ${intensityName} 活動 (${metRange} METs)</h5>
            <div class="space-y-2">
                ${activitiesHtml}
            </div>
            <div class="mt-3 p-2 bg-yellow-100 rounded text-sm text-yellow-700">
                <strong>MET計算說明：</strong>MET值 × 體重(${weight}kg) × 時間 = 熱量消耗<br>
                <strong>建議目標：</strong>成人每週累積 500-1000 MET-分鐘
            </div>
        </div>
    `;
}

// 健康狀況處理：現在所有選項都直接顯示，不需要特別的切換功能
// 用戶可以選擇「健康狀況良好」並且同時不勾選任何疾病選項
// 或者選擇「有健康狀況需注意」並勾選相應的疾病選項

// 疾病代碼到中文名稱的映射
const diseaseMap = {
    'overweight': '體重過重',
    'asthma': '氣喘',
    'hypertension': '高血壓',
    'diabetes': '糖尿病',
    'arthritis': '關節問題',
    'heart_recovery': '心臟疾病',
    'sarcopenia': '肌少症',
    'pregnant': '孕婦',
    'hyperlipidemia': '高血脂',
    'cancer_recovery': '癌症康復'
};

// 將疾病代碼轉換為中文名稱
function getDiseaseName(code) {
    return diseaseMap[code] || code;
}

// 將疾病代碼數組轉換為中文名稱字符串
function formatDiseases(diseases) {
    if (!diseases || diseases.length === 0) {
        return '健康狀況良好';
    }
    return diseases.map(getDiseaseName).join('、');
}

// BMI 計算功能
function calculateBMI() {
    console.log('calculateBMI 被調用');
    const age = parseInt(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    console.log('BMI 計算數據:', { age, height, weight });

    // 檢查年齡，小於18歲不計算BMI
    if (age && age < 18) {
        document.getElementById('bmiValue').textContent = '未滿18歲';
        document.getElementById('bmiCategory').textContent = '不適用';
        document.getElementById('bmiCategory').className = 'text-sm px-2 py-1 rounded bg-gray-100 text-gray-600';
        // 但仍計算 BMR 和 TDEE
        calculateBMR();
        return;
    }

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
    console.log('calculateBMR 被調用');
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    console.log('BMR 計算數據:', { age, gender, height, weight });

    if (!age || !gender || !height || !weight) {
        console.log('BMR 計算失敗 - 缺少必要數據:', { age: !!age, gender: !!gender, height: !!height, weight: !!weight });
        document.getElementById('bmrValue').textContent = '待計算';
        return;
    }

    let bmr;
    console.log('性別判斷:', gender, gender === 'male', gender === 'female');
    if (gender === 'male') {
        // 男性：BMR = (10 × 體重kg) + (6.25 × 身高cm) - (5 × 年齡) + 5
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        console.log('使用男性公式計算BMR');
    } else if (gender === 'female') {
        // 女性：BMR = (10 × 體重kg) + (6.25 × 身高cm) - (5 × 年齡) - 161
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        console.log('使用女性公式計算BMR');
    } else {
        console.log('未識別的性別值:', gender);
        return;
    }

    bmr = Math.round(bmr);
    console.log('計算出的BMR:', bmr);
    document.getElementById('bmrValue').textContent = bmr;

    // 自動計算 TDEE
    calculateTDEE();
}

// TDEE 每日總消耗熱量計算
function calculateTDEE() {
    console.log('calculateTDEE 被調用');
    const bmrElement = document.getElementById('bmrValue');
    const activityLevel = parseFloat(document.getElementById('activityLevel')?.value) || 1.375;
    console.log('TDEE 計算數據:', { bmrValue: bmrElement?.textContent, activityLevel });

    if (!bmrElement || bmrElement.textContent === '待計算') {
        document.getElementById('tdeeValue').textContent = '待計算';
        return;
    }

    const bmr = parseInt(bmrElement.textContent);
    const tdee = Math.round(bmr * activityLevel);
    console.log('計算出的TDEE:', tdee);

    document.getElementById('tdeeValue').textContent = tdee;

    // 顯示熱量建議
    showCalorieAdvice(tdee);
}

// 顯示熱量攝取建議
function showCalorieAdvice(tdee) {
    const calorieAdviceDiv = document.getElementById('calorieAdvice');
    const maintainElement = document.getElementById('maintainCalories');
    const loseElement = document.getElementById('loseCalories');
    const gainElement = document.getElementById('gainCalories');

    if (calorieAdviceDiv && maintainElement && loseElement && gainElement) {
        maintainElement.textContent = tdee;
        loseElement.textContent = Math.max(1200, tdee - 500); // 最低不低於1200卡
        gainElement.textContent = tdee + 300;

        calorieAdviceDiv.classList.remove('hidden');
    }
}

// 頁面路由管理
function showPage(pageId) {
    // 隱藏所有頁面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // 顯示指定頁面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 滾動到頂部
    window.scrollTo(0, 0);

    // 移除了清除儲存資料的功能

    // 如果是表單頁，初始化多步驟表單
    if (pageId === 'formPage') {
        setTimeout(() => {
            if (typeof initMultiStepForm === 'function') {
                console.log('Initializing multi-step form from showPage...');
                initMultiStepForm();
            }
        }, 100);
    }
}

// 即時表單驗證功能
function setupRealTimeValidation() {
    // 年齡驗證
    const ageInput = DOMCache.get('age');
    if (ageInput) {
        ageInput.addEventListener('blur', function() {
            const age = parseInt(this.value);
            if (age && (age < 6 || age > 120)) {
                showFieldError(this, '請輸入 6-120 歲之間的年齡');
            } else {
                clearFieldError(this);
            }
        });
    }

    // 身高驗證
    const heightInput = DOMCache.get('height');
    if (heightInput) {
        heightInput.addEventListener('blur', function() {
            const height = parseFloat(this.value);
            if (height && (height < 100 || height > 250)) {
                showFieldError(this, '請輸入 100-250 公分之間的身高');
            } else {
                clearFieldError(this);
            }
        });
    }

    // 體重驗證
    const weightInput = DOMCache.get('weight');
    if (weightInput) {
        weightInput.addEventListener('blur', function() {
            const weight = parseFloat(this.value);
            if (weight && (weight < 20 || weight > 300)) {
                showFieldError(this, '請輸入 20-300 公斤之間的體重');
            } else {
                clearFieldError(this);
            }
        });
    }

    // 性別驗證
    const genderSelect = DOMCache.get('gender');
    if (genderSelect) {
        genderSelect.addEventListener('change', function() {
            if (this.value) {
                clearFieldError(this);
                markFieldComplete(this);
            }
        });
    }
}

// 顯示欄位錯誤
function showFieldError(field, message) {
    clearFieldError(field);
    field.style.borderColor = '#ef4444';

    const errorMsg = document.createElement('div');
    errorMsg.className = 'field-error';
    errorMsg.style.cssText = 'color:#ef4444;font-size:14px;margin-top:4px;';
    errorMsg.textContent = message;
    field.parentElement.appendChild(errorMsg);
}

// 清除欄位錯誤
function clearFieldError(field) {
    field.style.borderColor = '';
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// 標記欄位完成
function markFieldComplete(field) {
    field.style.borderColor = '#10b981';
    setTimeout(() => {
        field.style.borderColor = '';
    }, 2000);
}

// 移除了 LocalStorage 自動儲存功能以避免多人使用時的困擾

// 表單進度更新
function updateFormProgress() {
    const progressForm = DOMCache.get('healthForm');
    if (!progressForm) return;

    const requiredFields = [
        'age', 'gender', 'height', 'weight',
        { name: 'fitness_level', type: 'radio' },
        { name: 'health_status', type: 'radio' },
        { name: 'parq_q1', type: 'radio' },
        { name: 'parq_q2', type: 'radio' },
        { name: 'parq_q3', type: 'radio' },
        { name: 'parq_q4', type: 'radio' },
        { name: 'parq_q5', type: 'radio' },
        { name: 'parq_q6', type: 'radio' },
        { name: 'parq_q7', type: 'radio' }
    ];

    let completed = 0;
    let total = requiredFields.length;

    requiredFields.forEach(field => {
        if (typeof field === 'string') {
            const element = DOMCache.get(field);
            if (element && element.value) {
                completed++;
            }
        } else if (field.type === 'radio') {
            const checked = document.querySelector(`input[name="${field.name}"]:checked`);
            if (checked) {
                completed++;
            }
        }
    });

    const percentage = Math.round((completed / total) * 100);
    const progressBar = DOMCache.get('progressBar');
    const progressText = DOMCache.get('progressText');

    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    if (progressText) {
        progressText.textContent = percentage + '%';
    }

    // 當進度達到100%時，顯示完成提示
    if (percentage === 100) {
        if (progressBar) {
            progressBar.style.background = 'linear-gradient(to right, #10b981, #22c55e)';
        }
    }
}

// 年齡檢查功能
document.addEventListener('DOMContentLoaded', function() {
    setupRealTimeValidation();

    // 移除了載入和自動儲存功能

    // 設置進度監聽
    const formElement = DOMCache.get('healthForm');
    if (formElement) {
        formElement.addEventListener('input', () => {
            updateFormProgress();
        });
        formElement.addEventListener('change', () => {
            updateFormProgress();
        });
    }

    const ageInput = document.getElementById('age');
    const ageInfo = document.getElementById('ageInfo');

    ageInput.addEventListener('input', function() {
        const age = parseInt(this.value);
        updateAgeInfo(age);
    });
    
    function updateAgeInfo(age) {
        if (!age || age < 6) {
            ageInfo.classList.add('hidden');
            return;
        }
        
        let message = '';
        let bgColor = '';
        
        if (age >= 6 && age <= 11) {
            message = '兒童族群：重點在趣味性體能活動，建議每日累積60分鐘以上身體活動';
            bgColor = 'bg-blue-100 border-blue-300 text-blue-700';
        } else if (age >= 12 && age <= 17) {
            message = '青少年族群：多元運動發展，建議每日60分鐘中到劇烈強度身體活動';
            bgColor = 'bg-green-100 border-green-300 text-green-700';
        } else if (age >= 18 && age <= 64) {
            message = '成人族群：健康維護與體能提升，建議每週150分鐘中等強度有氧運動';
            bgColor = 'bg-purple-100 border-purple-300 text-purple-700';
        } else if (age >= 65) {
            message = '銀髮族群：著重安全與功能性運動，特別注意平衡與跌倒預防';
            bgColor = 'bg-orange-100 border-orange-300 text-orange-700';
        }
        
        ageInfo.className = `mt-2 p-3 rounded-lg border ${bgColor}`;
        ageInfo.innerHTML = `<p>${message}</p>`;
        ageInfo.classList.remove('hidden');
    }
    
    // 表單提交處理
    const healthForm = document.getElementById('healthForm');
    if (healthForm) {
        healthForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (validateForm()) {
                generatePrescription();
                showPage('resultPage');
            } else {
                showFormError();
            }
        });
    }
});

// 表單驗證
function validateForm() {
    // 檢查年齡
    const age = document.getElementById('age').value;
    if (!age || age < 6 || age > 120) {
        alert('請輸入有效的年齡 (6-120歲)');
        return false;
    }
    
    // 檢查性別
    const gender = document.getElementById('gender').value;
    if (!gender) {
        alert('請選擇性別');
        return false;
    }
    
    // 檢查身高
    const height = document.getElementById('height').value;
    if (!height || height < 100 || height > 250) {
        alert('請輸入有效的身高 (100-250公分)');
        return false;
    }
    
    // 檢查體重
    const weight = document.getElementById('weight').value;
    if (!weight || weight < 20 || weight > 300) {
        alert('請輸入有效的體重 (20-300公斤)');
        return false;
    }
    
    // 檢查體能水平 (radio button)
    const fitnessLevel = document.querySelector('input[name="fitness_level"]:checked');
    if (!fitnessLevel) {
        alert('請選擇您的體能水平');
        return false;
    }
    
    // 檢查 PAR-Q 問題
    const parqQuestions = ['parq_q1', 'parq_q2', 'parq_q3', 'parq_q4', 'parq_q5', 'parq_q6', 'parq_q7'];
    for (let question of parqQuestions) {
        const answer = document.querySelector(`input[name="${question}"]:checked`);
        if (!answer) {
            alert('請完成所有 PAR-Q 問題');
            return false;
        }
    }
    
    // 檢查健康狀況 (radio button)
    const healthStatus = document.querySelector('input[name="health_status"]:checked');
    if (!healthStatus) {
        alert('請選擇您的健康狀況');
        return false;
    }
    
    return true;
}

// 顯示表單錯誤
function showFormError() {
    const errorDiv = document.getElementById('formError');
    errorDiv.classList.remove('hidden');
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 收集表單資料
function collectFormData() {
    try {
        const ageElement = document.getElementById('age');
        const genderElement = document.getElementById('gender');
        const heightElement = document.getElementById('height');
        const weightElement = document.getElementById('weight');
        const fitnessElement = document.querySelector('input[name="fitness_level"]:checked');
        const healthStatusElement = document.querySelector('input[name="health_status"]:checked');

        // 收集 PAR-Q 答案
        const parqAnswers = {};
        const parqQuestions = ['parq_q1', 'parq_q2', 'parq_q3', 'parq_q4', 'parq_q5', 'parq_q6', 'parq_q7'];
        for (let question of parqQuestions) {
            const answer = document.querySelector(`input[name="${question}"]:checked`);
            if (answer) {
                parqAnswers[question] = answer.value;
            }
        }

        if (!ageElement || !genderElement || !heightElement || !weightElement || !fitnessElement || !healthStatusElement) {
            throw new Error('表單資料不完整');
        }
        
        // 計算BMI (僅成年人)
        const age = parseInt(ageElement.value);
        const height = parseFloat(heightElement.value);
        const weight = parseFloat(weightElement.value);
        let bmi = null;
        
        if (age >= 18) {
            bmi = weight / Math.pow(height / 100, 2);
            bmi = Math.round(bmi * 10) / 10;
        }
        
        // 收集疾病資料：如果選擇健康狀況良好，則設為空陣列
        let diseases = [];
        if (healthStatusElement.value === 'has_conditions') {
            diseases = Array.from(document.querySelectorAll('input[name="diseases"]:checked')).map(cb => cb.value);
        }

        // 收集運動習慣
        const exerciseHabitElement = document.querySelector('input[name="exercise_habit"]:checked');
        const exerciseHabit = exerciseHabitElement ? exerciseHabitElement.value : 'none';

        // 收集運動目標
        const exerciseGoalElement = document.querySelector('input[name="exercise_goal"]:checked');
        const exerciseGoal = exerciseGoalElement ? exerciseGoalElement.value : 'health';

        // 收集運動限制
        const limitations = Array.from(document.querySelectorAll('input[name="limitations"]:checked')).map(cb => cb.value);

        const formData = {
            age: age,
            gender: genderElement.value,
            height: height,
            weight: weight,
            bmi: bmi, // 未成年為null
            health_status: healthStatusElement.value,
            diseases: diseases,
            fitness_level: fitnessElement.value,
            exercise_habit: exerciseHabit,
            exercise_goal: exerciseGoal,
            limitations: limitations,
            parq_answers: parqAnswers
        };
        
        return formData;
    } catch (error) {
        console.error('收集表單資料時發生錯誤:', error);
        throw error;
    }
}

// 生成運動處方（根據 ACSM FITT-VP 原則）
function generatePrescription() {
    try {
        const data = collectFormData();
        console.log('Collected form data:', data);
        
        // 保存表單數據供顯示函數使用
        window.lastFormData = data;
        
        const prescription = calculateFITTVP(data);
        console.log('Generated prescription:', prescription);
        
        displayPrescriptionSummary(prescription);
        displayFITTPDetails(prescription);
        displayExerciseGuidelines(prescription);
        
        console.log('Prescription displayed successfully');
    } catch (error) {
        console.error('Error generating prescription:', error);
        alert('生成運動處方時發生錯誤，請檢查輸入資料');
    }
}

// PAR-Q 風險評估函數
function assessPARQRisk(parqAnswers) {
    const result = {
        level: 'low',
        yesCount: 0,
        recommendations: []
    };

    // 計算回答「是」的問題數量
    Object.values(parqAnswers).forEach(answer => {
        if (answer === 'yes') {
            result.yesCount++;
        }
    });

    // 根據 PAR-Q 標準評估風險
    if (result.yesCount === 0) {
        result.level = 'low';
        result.recommendations.push('您可以安全地開始運動計畫');
    } else if (result.yesCount === 1) {
        result.level = 'moderate';
        result.recommendations.push('建議在開始運動前與運動醫學科醫師討論');
        result.recommendations.push('從低強度活動開始，逐步增加');
    } else {
        result.level = 'high';
        result.recommendations.push('強烈建議在開始運動前諮詢運動醫學科醫師');
        result.recommendations.push('需要專業監督下進行運動');
    }

    // 針對特定問題給予建議
    if (parqAnswers.parq_q1 === 'yes' || parqAnswers.parq_q6 === 'yes') {
        result.recommendations.push('請攜帶此評估結果與您的運動醫學科醫師討論');
    }

    if (parqAnswers.parq_q2 === 'yes' || parqAnswers.parq_q3 === 'yes') {
        result.recommendations.push('如有胸痛症狀，請立即就醫檢查');
    }

    if (parqAnswers.parq_q4 === 'yes') {
        result.recommendations.push('運動時請避免快速改變姿勢，注意安全');
    }

    if (parqAnswers.parq_q5 === 'yes') {
        result.recommendations.push('請選擇關節友善的運動類型，避免高衝擊活動');
    }

    return result;
}

// FITT-VP 計算邏輯
function calculateFITTVP(data) {
    const prescription = {
        frequency: 3,
        intensity: 'moderate',
        time: 30,
        type: [],
        volume: 450,
        progression: '每2-4週增加10%運動時間或頻率',
        warnings: [],
        recommendations: [],
        ageGroup: getAgeGroup(data.age)
    };
    
    // 根據年齡層調整基本參數
    if (data.age >= 6 && data.age <= 11) {
        // 兒童 (6-11歲) - ACSM建議每日至少60分鐘身體活動
        prescription.frequency = 7; // 每日活動
        prescription.time = 60; // 每日至少60分鐘
        prescription.intensity = 'moderate-vigorous';
        prescription.type = ['自由遊戲', '體能遊戲', '基礎運動技能']; // 直接設定，不用push
        prescription.volume = 0; // 兒童不用MET計算
        prescription.progression = '逐漸增加活動的複雜性和技能挑戰';
        prescription.recommendations.push('重點在趣味性和多樣性，而非競技表現');
        prescription.recommendations.push('包含骨骼強化活動，每週至少3次');
        prescription.recommendations.push('包含肌肉強化活動，每週至少3次');
        prescription.warnings.push('避免過度專項化訓練');
        
    } else if (data.age >= 12 && data.age <= 17) {
        // 青少年 (12-17歲) - ACSM建議每日至少60分鐘身體活動
        prescription.frequency = 7; // 每日活動
        prescription.time = 60; // 每日至少60分鐘
        prescription.intensity = 'moderate-vigorous';
        prescription.type = ['有氧運動', '肌力訓練', '團體運動']; // 直接設定
        prescription.volume = 0; // 青少年以每日60分鐘為準
        prescription.progression = '每2-3週增加運動強度或技能難度';
        prescription.recommendations.push('每週至少3次劇烈強度有氧運動');
        prescription.recommendations.push('每週至少3次肌肉和骨骼強化活動');
        prescription.warnings.push('注意運動傷害預防和適當休息');
        
    } else if (data.age >= 18 && data.age <= 64) {
        // 成人 (18-64歲) - WHO建議：每週150分鐘中等強度有氧運動
        prescription.frequency = 5; // WHO建議每週至少5次，每次30分鐘 = 150分鐘
        prescription.time = 30;
        prescription.intensity = 'moderate';
        prescription.type.push('有氧運動', '肌力訓練');
        prescription.volume = 525; // 3.5 METs × 30分鐘 × 5次
        prescription.progression = '每週增加10%運動量，逐步達到ACSM建議（每週150-300分鐘中強度或75-150分鐘高強度有氧）';
        
    } else if (data.age >= 65) {
        // 銀髮族 (65歲以上) - WHO建議：與成人相同，但加強平衡訓練
        prescription.frequency = 5; // WHO建議與成人相同，每週150分鐘
        prescription.time = 30;
        prescription.intensity = 'moderate';
        prescription.type.push('有氧運動', '肌力訓練', '平衡訓練', '柔軟度訓練');
        prescription.volume = 525; // 3.5 METs × 30分鐘 × 5次
        prescription.progression = '每週增加10%運動量，逐步達到ACSM建議（每週150-300分鐘中強度或75-150分鐘高強度有氧），並加強平衡訓練';
        prescription.warnings.push('高齡使用者請特別注意運動安全');
        prescription.recommendations.push('每週至少3次平衡訓練，預防跌倒');
    }
    
    // 根據體能水平微調WHO基準（僅對成人和銀髮族）
    if (data.age >= 18) {
        switch (data.fitness_level) {
            case 'poor':
                // 體能差：降低至WHO最低建議
                prescription.frequency = 3; // 減少頻率但保持每週總時間約90分鐘
                prescription.time = 30;
                prescription.intensity = 'light';
                prescription.volume = 270; // 3.0 METs × 30分鐘 × 3次
                prescription.progression = '每週增加10%運動量，逐步達到ACSM建議（每週150-300分鐘中強度或75-150分鐘高強度有氧）';
                break;
            case 'fair':
                // 一般：WHO基準的80%
                prescription.frequency = 4; // 略低於WHO建議
                prescription.time = 30;
                prescription.intensity = 'light-moderate';
                prescription.volume = 420; // 3.5 METs × 30分鐘 × 4次
                prescription.progression = '每週增加10%運動量，逐步達到ACSM建議（每週150-300分鐘中強度或75-150分鐘高強度有氧）';
                break;
            case 'good':
                // 良好：維持WHO建議
                // 保持原設定：每週5次，每次30分鐘
                break;
            case 'excellent':
                // 優秀：超過WHO建議，達到額外健康益處
                prescription.frequency = 6; // 超過WHO建議
                prescription.time = 40; // 總計240分鐘/週，改為整數
                prescription.volume = 840; // 3.5 METs × 40分鐘 × 6次
                prescription.progression = '可維持高頻率或增加運動強度';
                break;
        }
        
        // 根據BMI調整建議
        if (data.bmi) {
            if (data.bmi < 18.5) {
                prescription.recommendations.push('體重過輕：建議增加肌力訓練，配合適當營養補充');
                prescription.type.push('肌力訓練重點');
            } else if (data.bmi >= 24 && data.bmi < 27) {
                prescription.recommendations.push('體重過重：建議增加有氧運動頻率，控制飲食');
                prescription.frequency = Math.min(prescription.frequency + 1, 6);
            } else if (data.bmi >= 27) {
                prescription.recommendations.push('BMI偏高：建議以低衝擊有氧運動為主，配合飲食管理');
                prescription.type = ['低衝擊有氧', '水中運動', '肌力訓練'];
                prescription.warnings.push('建議諮詢運動醫學科醫師或營養師制定完整的體重管理計畫');
            }
        }
    } else {
        // 兒童青少年根據體能水平微調時間，但不改變每日活動的原則
        switch (data.fitness_level) {
            case 'poor':
                prescription.time = Math.max(30, prescription.time); // 至少30分鐘
                prescription.recommendations.push('可分段進行，如每次10-15分鐘，分2-3次完成');
                break;
            case 'fair':
                prescription.time = Math.max(45, prescription.time);
                break;
            case 'good':
                prescription.time = Math.max(60, prescription.time);
                break;
            case 'excellent':
                prescription.time = 80; // 改為整數
                prescription.recommendations.push('可增加運動技能挑戰和競技元素');
                break;
        }
    }
    
    
    // 根據疾病史調整運動類型和注意事項
    if (data.diseases.includes('hypertension')) {
        prescription.type.push('有氧運動');
        prescription.warnings.push('避免閉氣用力動作，運動中保持呼吸順暢');
        prescription.recommendations.push('建議每次運動前後測量血壓');
    }
    
    if (data.diseases.includes('diabetes')) {
        prescription.type.push('有氧運動', '阻力訓練');
        prescription.warnings.push('運動前後檢查血糖，攜帶糖果備用');
        prescription.recommendations.push('建議餐後1-2小時運動');
    }
    
    if (data.diseases.includes('arthritis')) {
        prescription.type.push('水中運動', '柔軟度訓練');
        prescription.warnings.push('避免高衝擊運動，關節疼痛時應停止');
        prescription.time = Math.min(prescription.time, 30);
    }
    
    if (data.diseases.includes('heart_recovery')) {
        prescription.intensity = 'light-moderate';
        prescription.warnings.push('嚴格監控心率，出現胸痛立即停止');
        prescription.recommendations.push('建議在運動醫學科醫師監督下開始運動計畫');
    }
    
    if (data.diseases.includes('sarcopenia')) {
        prescription.type.push('阻力訓練'); // 移除「蛋白質營養」，這不是運動類型
        prescription.recommendations.push('重點加強肌力訓練，每週至少3次阻力運動');
        prescription.recommendations.push('建議搭配營養師指導，確保足夠蛋白質攝取');
        prescription.warnings.push('漸進式增加負重，避免過度訓練造成傷害');
        // 肌少症患者需要更頻繁的肌力訓練，但不過度
        if (data.age >= 18) {
            prescription.frequency = Math.min(prescription.frequency + 1, 4);
        }
    }

    if (data.diseases.includes('pregnant')) {
        prescription.intensity = 'light';
        prescription.type = ['有氧運動', '柔軟度訓練', '骨盆底肌訓練'];
        prescription.frequency = Math.min(prescription.frequency, 4);
        prescription.time = Math.min(prescription.time, 30);
        prescription.warnings.push('避免仰躺運動、高衝擊運動和有跌倒風險的活動');
        prescription.warnings.push('懷孕期間運動強度不宜過高，以能說話為準');
        prescription.warnings.push('出現任何不適症狀應立即停止並諮詢運動醫學科醫師');
        prescription.recommendations.push('建議選擇游泳、散步、孕婦瑜珈等低衝擊運動');
        prescription.recommendations.push('運動前請先諮詢運動醫學科醫師，確認身體狀況適合運動');
        prescription.recommendations.push('避免過熱環境運動，補充充足水分');
    }

    if (data.diseases.includes('hyperlipidemia')) {
        prescription.type.push('有氧運動', '阻力訓練');
        prescription.warnings.push('高血脂患者運動前建議諮詢運動醫學科醫師，了解適合的運動強度');
        prescription.warnings.push('運動中注意身體反應，避免過度勞累');
        prescription.recommendations.push('建議以有氧運動為主，有助於改善血脂代謝');
        prescription.recommendations.push('配合適當阻力訓練，增強肌肉量提升代謝');
        prescription.recommendations.push('定期監測血脂指標，評估運動效果');
        prescription.recommendations.push('搭配健康飲食，控制飽和脂肪攝取');
    }
    
    if (data.diseases.includes('cancer_recovery')) {
        if (data.age >= 18) {
            prescription.frequency = Math.min(prescription.frequency, 3); // 不超過3次，避免過度
        }
        prescription.type.push('有氧運動', '阻力訓練');
        prescription.warnings.push('依據治療階段調整運動強度');
    }
    
    // 根據運動限制調整
    if (data.limitations.includes('pain')) {
        prescription.intensity = 'light';
        prescription.warnings.push('疼痛時立即停止運動');
    }
    
    if (data.limitations.includes('fall_risk')) {
        prescription.type.push('平衡訓練');
        prescription.warnings.push('避免需要快速方向改變的運動');
        prescription.recommendations.push('建議在安全環境下運動，有人陪伴');
    }
    
    if (data.limitations.includes('balance')) {
        prescription.type.push('平衡訓練', '太極');
        prescription.warnings.push('運動時應有支撐物在旁');
    }
    
    if (data.limitations.includes('palpitation')) {
        prescription.intensity = 'light-moderate';
        prescription.warnings.push('心跳過快時立即停止並休息');
    }
    
    // 確保基本運動類型（僅對成人和銀髮族）
    if (data.age >= 18) {
        if (prescription.type.length === 0) {
            prescription.type.push('有氧運動');
        }
        
        // 添加基本運動類型
        if (!prescription.type.includes('有氧運動')) {
            prescription.type.unshift('有氧運動');
        }
    }
    
    // 根據 PAR-Q 評估調整運動處方
    const parqRisk = assessPARQRisk(data.parq_answers);

    switch (parqRisk.level) {
        case 'high':
            // 高風險：強烈建議醫師諮詢
            prescription.warnings.unshift('⚠️ 根據 PAR-Q 評估，您可能有運動風險因子');
            prescription.recommendations.unshift('請在開始運動前諮詢運動醫學科醫師');
            prescription.warnings.push('建議在運動醫學科醫師或運動專業人員監督下開始運動');

            // 保守的運動處方
            if (data.age >= 18) {
                prescription.frequency = Math.max(2, Math.floor(prescription.frequency * 0.5));
                prescription.time = 15; // 非常保守的起始時間
                prescription.intensity = '輕度 (50-60% HRmax)';
                prescription.progression = '在運動醫學科醫師同意下，每週增加5%運動量';
            }
            break;

        case 'moderate':
            // 中度風險：謹慎開始
            prescription.warnings.push('根據 PAR-Q 評估，建議謹慎開始運動計畫');
            prescription.recommendations.push('如有不適請立即停止並諮詢專業人員');

            // 較保守的運動處方
            if (data.age >= 18) {
                prescription.frequency = Math.max(3, Math.floor(prescription.frequency * 0.7));
                prescription.time = 20; // 保守的起始時間
                prescription.progression = '每週增加5-10%運動量，密切監控身體反應';
            }
            break;

        case 'low':
            // 低風險：可以按標準處方進行
            prescription.recommendations.push('PAR-Q 評估顯示您適合開始運動計畫');

            // 根據體能水平調整
            if (data.fitness_level === 'excellent') {
                prescription.frequency = Math.min(prescription.frequency + 1, 6);
                prescription.time = Math.min(prescription.time + 10, 45);
                prescription.progression = '可按標準進度增加運動量';
            } else if (data.fitness_level === 'poor') {
                prescription.frequency = Math.max(3, Math.floor(prescription.frequency * 0.8));
                prescription.time = 20;
                prescription.progression = '每週增加10%運動量，逐步達到建議標準';
            }
            break;
    }

    // 添加 PAR-Q 相關建議
    if (parqRisk.recommendations.length > 0) {
        prescription.recommendations.push(...parqRisk.recommendations);
    }
    
    // 清理重複的運動類型並整理優先順序
    prescription.type = cleanupExerciseTypes(prescription.type);
    
    // 確保運動時間為整數（5分鐘的倍數）
    prescription.time = Math.round(prescription.time / 5) * 5;
    
    // 重新計算 MET-minutes (如果適用)
    if (prescription.volume > 0) {
        prescription.volume = Math.round(3.5 * prescription.time * prescription.frequency);
    }
    
    // 統一生成針對不同運動類型的建議事項
    generateExerciseSpecificRecommendations(prescription, data);
    
    return prescription;
}

// 清理和整理運動類型
function cleanupExerciseTypes(types) {
    // 定義運動類型的合併規則
    const typeMapping = {
        '有氧運動': ['有氧運動', '低衝擊有氧'],
        '肌力訓練': ['肌力訓練', '阻力訓練', '肌力訓練重點'],
        '水中運動': ['水中運動'],
        '平衡訓練': ['平衡訓練', '太極'],
        '柔軟度訓練': ['柔軟度訓練', '伸展運動'],
        '自由遊戲': ['自由遊戲'],
        '體能遊戲': ['體能遊戲'],
        '基礎運動技能': ['基礎運動技能'],
        '團體運動': ['團體運動'],
        '專項訓練': ['專項技能訓練', '競技表現提升', '專項訓練']
    };
    
    // 優先順序（重要性排序）
    const priority = [
        '有氧運動', '肌力訓練', '平衡訓練', '柔軟度訓練', '水中運動',
        '自由遊戲', '體能遊戲', '基礎運動技能', '團體運動', '專項訓練'
    ];
    
    const result = [];
    const processed = new Set();
    
    // 按優先順序處理
    for (const mainType of priority) {
        const subtypes = typeMapping[mainType];
        if (subtypes && types.some(type => subtypes.includes(type))) {
            if (!processed.has(mainType)) {
                result.push(mainType);
                processed.add(mainType);
                // 標記所有相關子類型為已處理
                subtypes.forEach(subtype => processed.add(subtype));
            }
        }
    }
    
    // 處理其他未映射的類型
    for (const type of types) {
        if (!processed.has(type) && type && type !== '蛋白質營養') {
            result.push(type);
        }
    }
    
    return result;
}

// 生成針對不同運動類型的具體建議事項
function generateExerciseSpecificRecommendations(prescription, data) {
    // 清除重複的建議，重新生成
    prescription.recommendations = prescription.recommendations.filter(rec => 
        !rec.includes('每週至少') || rec.includes('劇烈強度') || rec.includes('骨骼強化') || rec.includes('肌肉強化')
    );
    
    const exerciseTypes = prescription.type;
    
    // 有氧運動建議
    if (exerciseTypes.includes('有氧運動') || exerciseTypes.includes('低衝擊有氧')) {
        if (data.age >= 18 && data.age <= 64) {
            prescription.recommendations.push('有氧運動：建議快走、游泳、騎車等，每次持續20-60分鐘');
        } else if (data.age >= 65) {
            prescription.recommendations.push('有氧運動：選擇低衝擊活動如快走、水中運動，每次20-40分鐘');
        }
    }
    
    // 阻力/肌力訓練建議
    if (exerciseTypes.includes('肌力訓練') || exerciseTypes.includes('阻力訓練') || exerciseTypes.includes('肌力訓練重點')) {
        if (data.age >= 18 && data.age <= 64) {
            prescription.recommendations.push('肌力訓練：每週2-3次，針對主要肌群，每組8-12次重複');
        } else if (data.age >= 65) {
            prescription.recommendations.push('肌力訓練：每週2次，使用輕重量或彈力帶，每組10-15次重複');
        }
    }
    
    // 平衡訓練建議
    if (exerciseTypes.includes('平衡訓練') || exerciseTypes.includes('太極')) {
        if (data.age >= 65) {
            prescription.recommendations.push('平衡訓練：每週3次，包含單腳站立、太極等，每次15-20分鐘');
        } else if (data.age >= 18) {
            prescription.recommendations.push('平衡訓練：每週2-3次，提升身體穩定性，預防跌倒風險');
        }
    }
    
    // 柔軟度訓練建議 - 對所有成人都推薦
    if (data.age >= 18) {
        if (exerciseTypes.includes('柔軟度訓練') || exerciseTypes.includes('伸展運動')) {
            prescription.recommendations.push('柔軟度訓練：每週至少2-3次，每個伸展動作維持15-30秒');
        } else {
            // 即使沒有明確包含柔軟度訓練，也給予基本建議
            prescription.recommendations.push('伸展運動：每次運動前後進行5-10分鐘，改善關節活動度');
        }
    }
    
    // 水中運動建議
    if (exerciseTypes.includes('水中運動')) {
        prescription.recommendations.push('水中運動：適合關節問題者，水溫28-30°C，每次30-45分鐘');
    }
}

// 年齡分組函數
function getAgeGroup(age) {
    if (age >= 6 && age <= 11) return 'child';
    if (age >= 12 && age <= 17) return 'adolescent';
    if (age >= 18 && age <= 64) return 'adult';
    if (age >= 65) return 'senior';
    return 'unknown';
}

// 顯示運動處方摘要
function displayPrescriptionSummary(prescription) {
    const container = document.getElementById('prescriptionSummary');
    if (!container) {
        console.error('找不到 prescriptionSummary 元素');
        return;
    }
    
    const intensityText = {
        'light': '輕度強度',
        'light-moderate': '輕度至中度強度', 
        'moderate': '中度強度',
        'moderate-vigorous': '中度至劇烈強度'
    }[prescription.intensity] || '中度強度';
    
    const exerciseTypes = prescription.type.join('、');
    
    // 根據年齡層調整顯示方式
    let frequencyText = '';
    let timeText = '';
    let volumeSection = '';
    
    if (prescription.ageGroup === 'child' || prescription.ageGroup === 'adolescent') {
        frequencyText = prescription.frequency === 7 ? '每日' : `每週${prescription.frequency}次`;
        timeText = `${prescription.time}分鐘`;
        volumeSection = `
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-2xl font-bold text-purple-600">多樣化</div>
                <div class="text-sm text-gray-600">活動類型</div>
            </div>
        `;
    } else {
        frequencyText = `每週${prescription.frequency}次`;
        timeText = `${prescription.time}分鐘/次`;
        volumeSection = `
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-2xl font-bold text-purple-600">${prescription.volume}</div>
                <div class="text-sm text-gray-600">MET-min/週</div>
            </div>
        `;
    }
    
    // 獲取BMI資訊 (僅成年人顯示)
    const data = window.lastFormData || {};
    let bmiSection = '';
    if (data.age >= 18 && data.bmi) {
        let bmiCategory = '';
        let bmiColor = '';
        
        if (data.bmi < 18.5) {
            bmiCategory = '體重過輕';
            bmiColor = 'text-blue-600';
        } else if (data.bmi < 24) {
            bmiCategory = '正常範圍';
            bmiColor = 'text-green-600';
        } else if (data.bmi < 27) {
            bmiCategory = '體重過重';
            bmiColor = 'text-yellow-600';
        } else {
            bmiCategory = '肥胖';
            bmiColor = 'text-red-600';
        }
        
        bmiSection = `
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <div class="text-center">
                    <span class="text-sm text-gray-600">BMI 指數：</span>
                    <span class="text-lg font-bold ${bmiColor}">${data.bmi}</span>
                    <span class="ml-2 px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">${bmiCategory}</span>
                </div>
            </div>
        `;
    } else if (data.age < 18) {
        bmiSection = `
            <div class="bg-blue-50 rounded-lg p-4 mb-4">
                <div class="text-center">
                    <span class="text-sm text-blue-600">
                        兒童青少年：BMI計算不適用，請依生長曲線評估
                    </span>
                </div>
            </div>
        `;
    }
    
    // 計算 PAR-Q 分數
    const parqRisk = assessPARQRisk(data.parq_answers || {});
    let parqSection = '';
    let parqColor = 'green';
    if (parqRisk.level === 'moderate') parqColor = 'yellow';
    if (parqRisk.level === 'high') parqColor = 'red';

    parqSection = `
        <div class="bg-${parqColor}-50 rounded-lg p-4 mb-4 border border-${parqColor}-200">
            <div class="flex justify-between items-center">
                <div>
                    <span class="text-sm text-gray-600">PAR-Q 評估：</span>
                    <span class="text-lg font-bold text-${parqColor}-600">${parqRisk.yesCount}/7 項風險因子</span>
                </div>
                <div class="text-sm text-${parqColor}-700">
                    ${parqRisk.recommendations[0]}
                </div>
            </div>
        </div>
    `;

    // 運動目標顯示
    const goalText = {
        'health': '健康維護',
        'weight_loss': '減重瘦身',
        'muscle_building': '增肌塑形',
        'endurance': '增強體能',
        'rehabilitation': '復健治療',
        'performance': '運動表現提升'
    }[data.exercise_goal] || '健康維護';

    // 運動習慣顯示
    const habitText = {
        'none': '無運動習慣',
        'light': '偶爾運動',
        'moderate': '規律運動',
        'active': '經常運動',
        'student_athlete': '專業訓練'
    }[data.exercise_habit] || '無運動習慣';

    container.innerHTML = `
        <div class="text-center mb-6">
            <h3 class="text-3xl font-bold text-blue-800 mb-2">您的個人化運動處方</h3>
            <div class="text-xl text-gray-700">
                <strong>${exerciseTypes} ${timeText} × ${frequencyText}</strong>
            </div>
            <div class="text-lg text-gray-600 mt-2">強度：${intensityText}</div>
        </div>

        <!-- 個人資訊摘要 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <div class="grid md:grid-cols-3 gap-4 text-sm">
                <div><span class="font-semibold">年齡：</span>${data.age}歲 | <span class="font-semibold">性別：</span>${data.gender === 'male' ? '男' : data.gender === 'female' ? '女' : '其他'}</div>
                <div><span class="font-semibold">運動目標：</span>${goalText}</div>
                <div><span class="font-semibold">運動習慣：</span>${habitText}</div>
            </div>
        </div>

        ${bmiSection}
        ${parqSection}

        <div class="grid md:grid-cols-3 gap-4 text-center mb-4">
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-2xl font-bold text-blue-600">${prescription.frequency === 7 ? '每日' : prescription.frequency}</div>
                <div class="text-sm text-gray-600">${prescription.frequency === 7 ? '身體活動' : '次/週'}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-2xl font-bold text-green-600">${prescription.time}</div>
                <div class="text-sm text-gray-600">分鐘${prescription.frequency === 7 ? '/日' : '/次'}</div>
            </div>
            ${volumeSection}
        </div>

        ${data.limitations && data.limitations.length > 0 ? `
        <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h4 class="font-semibold text-orange-800 mb-2">考量您的限制因素</h4>
            <ul class="text-sm text-orange-700 list-disc list-inside">
                ${data.limitations.map(limitation => {
                    const limitText = {
                        'none': '無特別限制',
                        'time': '時間限制',
                        'motivation': '缺乏動機',
                        'pain': '疼痛問題',
                        'injury_history': '運動傷害史',
                        'balance': '平衡感不佳',
                        'palpitation': '呼吸困難',
                        'equipment': '缺乏運動設備'
                    }[limitation] || limitation;
                    return `<li>${limitText}</li>`;
                }).join('')}
            </ul>
        </div>
        ` : ''}
    `;
}

// 顯示 FITT-VP 詳細說明
function displayFITTPDetails(prescription) {
    const container = document.getElementById('fittpDetails');
    if (!container) {
        console.error('找不到 fittpDetails 元素');
        return;
    }
    
    const intensityDescription = {
        'light': 'RPE 3-4，能輕鬆說話和唱歌',
        'light-moderate': 'RPE 4-5，能說話但唱歌稍有困難',
        'moderate': 'RPE 5-6，能說話但無法唱歌',
        'moderate-vigorous': 'RPE 6-7，說話略感困難'
    }[prescription.intensity] || 'RPE 5-6，能說話但無法唱歌';
    
    let frequencyText = '';
    if (prescription.frequency === 7) {
        frequencyText = '每日身體活動';
    } else {
        frequencyText = `每週 ${prescription.frequency} 次運動`;
    }
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="border-l-4 border-blue-500 pl-4">
                <h4 class="font-semibold text-lg">Frequency (頻率)</h4>
                <p class="text-gray-600">${frequencyText}</p>
            </div>
            
            <div class="border-l-4 border-green-500 pl-4">
                <h4 class="font-semibold text-lg">Intensity (強度)</h4>
                <p class="text-gray-600">${intensityDescription}</p>
            </div>
            
            <div class="border-l-4 border-purple-500 pl-4">
                <h4 class="font-semibold text-lg">Time (時間)</h4>
                <p class="text-gray-600">${prescription.frequency === 7 ? '每日' : '每次運動'} ${prescription.time} 分鐘</p>
            </div>
            
            <div class="border-l-4 border-orange-500 pl-4">
                <h4 class="font-semibold text-lg">Type (類型)</h4>
                <p class="text-gray-600">${prescription.type.join('、')}</p>
            </div>
            
            <div class="border-l-4 border-red-500 pl-4">
                <h4 class="font-semibold text-lg">Volume (總量)</h4>
                <p class="text-gray-600">${prescription.volume === 0 ? '重點在活動多樣性與趣味性' : `每週約 ${prescription.volume} MET-minutes`}</p>
            </div>
            
            <div class="border-l-4 border-gray-500 pl-4">
                <h4 class="font-semibold text-lg">Progression (進展)</h4>
                <p class="text-gray-600">${prescription.progression}</p>
            </div>
        </div>
    `;
}

// 顯示運動指南與注意事項
function displayExerciseGuidelines(prescription) {
    const container = document.getElementById('exerciseGuidelines');
    if (!container) {
        console.error('找不到 exerciseGuidelines 元素');
        return;
    }
    
    let warningsHtml = '';
    if (prescription.warnings.length > 0) {
        warningsHtml = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h5 class="font-semibold text-red-800 mb-2">重要注意事項</h5>
                <ul class="list-disc list-inside space-y-1 text-red-700">
                    ${prescription.warnings.map(warning => `<li>${warning}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // MET 活動範例與熱量計算
    const metActivitiesHtml = getMETActivitiesHtml(prescription);
    
    let recommendationsHtml = '';
    if (prescription.recommendations.length > 0) {
        recommendationsHtml = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h5 class="font-semibold text-green-800 mb-2">建議事項</h5>
                <ul class="list-disc list-inside space-y-1 text-green-700">
                    ${prescription.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    const exerciseExamples = getExerciseExamples(prescription.type);
    
    container.innerHTML = `
        ${warningsHtml}
        ${metActivitiesHtml}
        ${recommendationsHtml}
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 class="font-semibold text-blue-800 mb-2">推薦運動範例</h5>
            <div class="text-blue-700 space-y-2">
                ${exerciseExamples}
            </div>
        </div>
        
        <div class="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 class="font-semibold text-gray-800 mb-2">運動前準備</h5>
            <ul class="list-disc list-inside space-y-1 text-gray-600">
                <li>運動前進行5-10分鐘暖身</li>
                <li>穿著舒適的運動服裝和鞋子</li>
                <li>準備充足的水分補充</li>
                <li>運動後進行5-10分鐘緩和運動</li>
            </ul>
        </div>
    `;
}

// 獲取運動範例
function getExerciseExamples(types) {
    const examples = {
        '有氧運動': ['快走', '游泳', '騎腳踏車', '爬樓梯', '健走'],
        '阻力訓練': ['彈力帶運動', '輕重量啞鈴', '徒手肌力訓練', '阻力機器', '硬舉', '腿推', '划船', '彈力繩'],
        '肌力訓練': ['伏地挺身', '深蹲', '橋式', '死蟲式', '棒式', '啞鈴訓練'],
        '平衡訓練': ['單腳站立', '太極', '瑜珈', '平衡墊運動'],
        '柔軟度訓練': ['伸展運動', '瑜珈', '太極', '關節活動度運動'],
        '水中運動': ['水中走路', '水中有氧', '游泳', '水中太極'],
        '太極': ['太極拳', '太極劍', '八段錦', '五禽戲'],
        '自由遊戲': ['捉迷藏', '跳房子', '踢毽子', '跳繩', '騎腳踏車'],
        '體能遊戲': ['老鷹捉小雞', '紅綠燈遊戲', '障礙賽跑', '接力賽'],
        '基礎運動技能': ['拋接球', '踢球', '跳躍', '攀爬', '平衡走'],
        '團體運動': ['籃球', '足球', '排球', '羽毛球', '桌球'],
        '專項技能訓練': ['技術動作練習', '戰術訓練', '專項體能', '競技技巧'],
        '競技表現提升': ['速度訓練', '爆發力訓練', '耐力提升', '技術精進'],
        '專項訓練': ['專業指導訓練', '競技準備', '表現分析', '恢復訓練'],
        '跌倒預防': ['平衡練習', '肌力強化', '反應訓練', '步態訓練']
    };
    
    let allExamples = [];
    types.forEach(type => {
        if (examples[type]) {
            allExamples = allExamples.concat(examples[type]);
        }
    });
    
    // 去重並限制數量
    const uniqueExamples = [...new Set(allExamples)].slice(0, 8);
    
    return uniqueExamples.map(example => `<span class="inline-block bg-white px-3 py-1 rounded-full text-sm mr-2 mb-2">${example}</span>`).join('');
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
            console.log('開始載入 PDF 函式庫...');
            await loadPDFLibraries();
            console.log('PDF 函式庫載入完成');
        }

        // 檢查函式庫是否可用
        if (!window.jspdf || !window.html2canvas) {
            console.error('函式庫檢查:', { jspdf: !!window.jspdf, html2canvas: !!window.html2canvas });
            throw new Error('PDF 函式庫載入失敗');
        }

        // 移除載入提示
        setTimeout(() => document.body.removeChild(loadingMsg), 500);

        console.log('開始創建 PDF 內容...');
        // 創建一個臨時的PDF內容容器
        const pdfContent = createPDFContent();
        if (!pdfContent) {
            throw new Error('無法創建 PDF 內容');
        }
        console.log('PDF 內容創建完成');

        document.body.appendChild(pdfContent);
        console.log('PDF 內容已添加到頁面');

        // 使用 html2canvas 將內容轉換為圖片
        console.log('開始轉換為圖片...');
        const canvas = await html2canvas(pdfContent, {
            scale: 1.2, // 降低解析度以減少記憶體使用
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794, // A4 寬度 (px)
            scrollX: 0,
            scrollY: 0,
            logging: false // 關閉 html2canvas 日誌
        });
        console.log('圖片轉換完成，尺寸:', canvas.width, 'x', canvas.height);

        // 移除臨時容器
        document.body.removeChild(pdfContent);
        console.log('臨時容器已移除');
        
        console.log('開始創建 PDF...');
        // 創建 PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // 計算圖片尺寸以適應 A4
        const imgWidth = 210; // A4 寬度 mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        console.log('PDF 尺寸計算:', { imgWidth, imgHeight });

        // 轉換為圖片數據
        const imgData = canvas.toDataURL('image/png');
        console.log('圖片數據已生成');

        // 添加圖片到 PDF
        if (imgHeight <= 297) {
            // 單頁
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        } else {
            // 多頁處理
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            heightLeft -= 297;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= 297;
            }
        }

        console.log('PDF 創建完成');

        // 生成檔案名稱
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;

        // 下載 PDF
        console.log('開始下載 PDF...');
        pdf.save(`運動處方建議_${dateStr}.pdf`);
        console.log('PDF 下載已開始');
        
    } catch (error) {
        console.error('PDF 生成錯誤:', error);
        alert('PDF 生成失敗，請稍後再試。可能是瀏覽器不支援或網路問題。');
    }
}

// Helper functions for PDF content
function getGoalText(goal) {
    const goalTexts = {
        'health': '健康維護',
        'weight_loss': '減重瘦身',
        'muscle_building': '增肌塑形',
        'endurance': '增強體能',
        'rehabilitation': '復健治療',
        'performance': '運動表現提升'
    };
    return goalTexts[goal] || '健康維護';
}

function getHabitText(habit) {
    const habitTexts = {
        'none': '無運動習慣',
        'light': '偶爾運動（每週1-2次）',
        'moderate': '規律運動（每週3-4次）',
        'active': '經常運動（每週5次以上）',
        'student_athlete': '學生運動員或專業訓練'
    };
    return habitTexts[habit] || '無運動習慣';
}

function getPARQScore(data) {
    const parqRisk = assessPARQRisk(data.parq_answers || {});
    return `${parqRisk.yesCount}/7`;
}

function getPARQRecommendation(data) {
    const parqRisk = assessPARQRisk(data.parq_answers || {});
    return parqRisk.recommendations[0] || '您可以安全地開始運動計畫';
}

function calculateBMRForPDF(data) {
    if (!data.age || !data.gender || !data.height || !data.weight) {
        return '待計算';
    }

    let bmr;
    if (data.gender === 'male') {
        // Harris-Benedict 公式 (男性)
        bmr = 88.362 + (13.397 * data.weight) + (4.799 * data.height) - (5.677 * data.age);
    } else if (data.gender === 'female') {
        // Harris-Benedict 公式 (女性)
        bmr = 447.593 + (9.247 * data.weight) + (3.098 * data.height) - (4.330 * data.age);
    } else {
        // 使用平均值
        const maleBmr = 88.362 + (13.397 * data.weight) + (4.799 * data.height) - (5.677 * data.age);
        const femaleBmr = 447.593 + (9.247 * data.weight) + (3.098 * data.height) - (4.330 * data.age);
        bmr = (maleBmr + femaleBmr) / 2;
    }

    return Math.round(bmr);
}

function calculateTDEEForPDF(data) {
    const bmr = calculateBMRForPDF(data);
    if (bmr === '待計算') return '待計算';

    // 根據運動習慣決定活動係數
    let activityFactor = 1.375; // 預設為輕度活動

    switch(data.exercise_habit) {
        case 'none':
            activityFactor = 1.2; // 久坐
            break;
        case 'light':
            activityFactor = 1.375; // 輕度活動
            break;
        case 'moderate':
            activityFactor = 1.55; // 中度活動
            break;
        case 'active':
            activityFactor = 1.725; // 高度活動
            break;
        case 'student_athlete':
            activityFactor = 1.9; // 非常高度活動
            break;
    }

    return Math.round(bmr * activityFactor);
}

// 創建PDF內容的HTML結構
function createPDFContent() {
    const data = window.lastFormData || {};
    const prescription = calculateFITTVP(data);
    
    // 獲取網頁上的實際內容
    const prescriptionSummary = document.getElementById('prescriptionSummary');
    const fittpDetails = document.getElementById('fittpDetails');
    const exerciseGuidelines = document.getElementById('exerciseGuidelines');
    
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
    
    // 獲取運動範例
    const exerciseExamples = getExerciseExamples(prescription.type);
    
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px 0; color: #1e40af;">
                個人化運動處方建議
            </h1>
            <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">
                基於 ACSM FITT-VP 原則與 WHO 身體活動建議指引
            </p>
        </div>

        <!-- 兩欄布局 -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">

            <!-- 左欄 -->
            <div style="min-height: 400px;">
                <!-- 個人評估資料 -->
                <div style="margin-bottom: 15px;">
                    <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #f59e0b; padding-bottom: 3px;">
                        個人評估資料
                    </h2>
                    <div style="background: #fffbeb; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b; color: #000;">
                        <div style="font-size: 12px; line-height: 1.6;">
                            <div style="margin-bottom: 5px;"><strong>運動目標：</strong>${getGoalText(data.exercise_goal)}</div>
                            <div style="margin-bottom: 5px;"><strong>運動習慣：</strong>${getHabitText(data.exercise_habit)}</div>
                            ${data.age >= 18 && data.bmi ? `
                            <div style="margin-bottom: 5px;"><strong>BMI 指數：</strong>${data.bmi} ${data.bmi < 18.5 ? '體重過輕' : data.bmi < 24 ? '正常範圍' : data.bmi < 27 ? '體重過重' : '肥胖'}</div>
                            ` : ''}
                            <div style="margin-bottom: 5px;"><strong>PAR-Q 評估：</strong>${getPARQScore(data)} 項風險因子</div>
                            <div style="margin-bottom: 8px;"><strong>${getPARQRecommendation(data)}</strong></div>

                            <!-- BMR 和 TDEE 資訊 -->
                            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px;">
                                <div style="background: white; padding: 8px; border-radius: 4px; text-align: center;">
                                    <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px;">BMR 基礎代謝率</div>
                                    <div style="font-size: 14px; font-weight: bold; color: #3b82f6; margin-bottom: 2px;">
                                        ${calculateBMRForPDF(data)} 大卡/天
                                    </div>
                                    <div style="font-size: 9px; color: #666;">完全靜態時的熱量消耗</div>
                                </div>
                                <div style="background: white; padding: 8px; border-radius: 4px; text-align: center;">
                                    <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px;">TDEE 每日總消耗</div>
                                    <div style="font-size: 14px; font-weight: bold; color: #22c55e; margin-bottom: 2px;">
                                        ${calculateTDEEForPDF(data)} 大卡/天
                                    </div>
                                    <div style="font-size: 9px; color: #666;">包含活動的總熱量消耗</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- FITT-VP 詳細說明 -->
                <div style="margin-bottom: 15px;">
                    <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #22c55e; padding-bottom: 3px;">
                        FITT-VP 運動原則
                    </h2>
                    <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 4px solid #22c55e;">
                        <div style="font-size: 11px; line-height: 1.5;">
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">頻率 (Frequency)：</strong>
                                <span>${prescription.frequency === 7 ? '每日身體活動' : `每週 ${prescription.frequency} 次運動`}</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">強度 (Intensity)：</strong>
                                <span>${getIntensityText(prescription.intensity)}</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">時間 (Time)：</strong>
                                <span>${prescription.frequency === 7 ? '每日' : '每次運動'} ${prescription.time} 分鐘</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">類型 (Type)：</strong>
                                <span>${prescription.type.join('、')}</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">總量 (Volume)：</strong>
                                <span>${prescription.volume === 0 ? '重點在活動多樣性與趣味性' : `每週約 ${prescription.volume} MET-minutes`}</span>
                            </div>
                            <div>
                                <strong style="color: #059669;">進展 (Progression)：</strong>
                                <span>${prescription.progression}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右欄 -->
            <div style="min-height: 400px;">
                <!-- 運動處方摘要 -->
                <div style="margin-bottom: 15px;">
                    <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 3px;">
                        您的運動處方
                    </h2>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                        <div style="text-align: center; margin-bottom: 10px;">
                            <div style="font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 4px;">
                                ${prescription.type.join('、')}
                            </div>
                            <div style="font-size: 14px; font-weight: bold; color: #1e40af;">
                                ${prescription.frequency === 7 ? '每日' : '每週' + prescription.frequency + '次'} × ${prescription.time}分鐘
                            </div>
                            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                                強度：${getIntensityText(prescription.intensity)}
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center; font-size: 10px;">
                            <div style="background: white; padding: 8px; border-radius: 4px;">
                                <div style="font-size: 14px; font-weight: bold; color: #3b82f6;">
                                    ${prescription.frequency === 7 ? '每日' : prescription.frequency}
                                </div>
                                <div style="color: #6b7280;">${prescription.frequency === 7 ? '身體活動' : '次/週'}</div>
                            </div>
                            <div style="background: white; padding: 8px; border-radius: 4px;">
                                <div style="font-size: 14px; font-weight: bold; color: #22c55e;">
                                    ${prescription.time}
                                </div>
                                <div style="color: #6b7280;">分鐘${prescription.frequency === 7 ? '/日' : '/次'}</div>
                            </div>
                            <div style="background: white; padding: 8px; border-radius: 4px;">
                                <div style="font-size: 14px; font-weight: bold; color: #8b5cf6;">
                                    ${prescription.volume === 0 ? '多樣化' : prescription.volume}
                                </div>
                                <div style="color: #6b7280;">${prescription.volume === 0 ? '活動類型' : 'MET-min/週'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 運動範例 -->
                <div style="margin-bottom: 15px;">
                    <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #8b5cf6; padding-bottom: 3px;">
                        建議運動範例
                    </h2>
                    <div style="background: #faf5ff; padding: 12px; border-radius: 6px; border-left: 4px solid #8b5cf6;">
                        <div style="font-size: 11px; line-height: 1.5; color: #581c87;">
                            ${exerciseExamples.replace(/class="[^"]*"/g, '').replace(/span/g, 'span style="display: inline-block; background: white; padding: 2px 8px; border-radius: 12px; margin-right: 6px; margin-bottom: 4px;"')}
                        </div>
                    </div>
                </div>

                ${prescription.warnings.length > 0 ? `
                <div style="margin-bottom: 15px;">
                    <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #ef4444; padding-bottom: 3px;">
                        重要注意事項
                    </h2>
                    <div style="background: #fef2f2; padding: 12px; border-radius: 6px; border-left: 4px solid #ef4444;">
                        <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #991b1b; line-height: 1.4;">
                            ${prescription.warnings.map(warning => `<li style="margin-bottom: 4px;">${warning}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}

                <!-- 一般注意事項 -->
                <div style="margin-bottom: 15px;">
                    <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #6b7280; padding-bottom: 3px;">
                        運動安全提醒
                    </h2>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid #6b7280;">
                        <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #374151; line-height: 1.4;">
                            <li style="margin-bottom: 4px;">運動前請做適當暖身</li>
                            <li style="margin-bottom: 4px;">運動中如感到不適請立即停止</li>
                            <li style="margin-bottom: 4px;">循序漸進增加運動強度</li>
                            <li style="margin-bottom: 4px;">保持充足水分補充</li>
                            <li>本建議僅供參考，如有疑慮請諮詢專業人員</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        ${prescription.recommendations.length > 0 ? `
        <div style="margin-bottom: 15px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #f59e0b; padding-bottom: 3px;">
                建議事項
            </h2>
            <div style="background: #fffbeb; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <ul style="margin: 0; padding-left: 15px; font-size: 12px; color: #92400e;">
                    ${prescription.recommendations.map(rec => `<li style="margin-bottom: 6px;">${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}
        
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <h3 style="font-size: 14px; font-weight: bold; color: #1f2937; margin-bottom: 8px;">免責聲明</h3>
            <p style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 10px;">
                本系統提供的運動處方僅供參考，不可取代專業醫療診斷與建議。建議在開始任何運動計畫前，
                請諮詢專業醫療人員、運動醫學科醫師或合格的運動專業人士。
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280;">
                <div>製作者：運動醫學科 吳易澄醫師 | https://wycswimming.blogspot.com/</div>
                <div>生成日期：${new Date().toLocaleDateString('zh-TW')}</div>
            </div>
        </div>
    `;
    
    return container;
}

// 輔助函數
function getFitnessLevelText(level) {
    const levels = {
        'poor': '日常活動困難',
        'fair': '容易疲勞',
        'good': '尚可',
        'excellent': '良好'
    };
    return levels[level] || level;
}

function getExerciseHabitText(habit) {
    const habits = {
        'none': '沒有運動習慣',
        'light': '偶爾運動（每週1-2次）',
        'moderate': '規律運動（每週3-4次）',
        'active': '經常運動（每週5次以上）',
        'student_athlete': '學生運動員或專業訓練'
    };
    return habits[habit] || habit;
}

function getIntensityText(intensity) {
    const intensities = {
        'light': '輕度強度 (RPE 3-4)',
        'light-moderate': '輕度至中度強度 (RPE 4-5)',
        'moderate': '中度強度 (RPE 5-6)',
        'moderate-vigorous': '中度至劇烈強度 (RPE 6-7)'
    };
    return intensities[intensity] || intensity;
}

// 響應式設計支援
window.addEventListener('resize', function() {
    // 處理視窗大小變化時的佈局調整
    // 目前使用 Tailwind CSS 的響應式類別已經足夠
});


// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 確保首頁為預設顯示頁面
    showPage('homePage');

    // 隱藏表單錯誤訊息
    const errorDiv = document.getElementById('formError');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
});

// ==================== AI 建議功能 ====================

// AI API 端點（根據部署環境調整）
const AI_API_ENDPOINT = '/api/ai-recommendation';

// 儲存最後的處方資料（供 AI 使用）
window.lastPrescription = null;

// AI 提供商資訊與模型選項
const AI_PROVIDERS = {
    auto: {
        name: '自動選擇（免費版）',
        hint: '使用系統預設的免費 Groq API',
        needsKey: false,
        models: []
    },
    groq: {
        name: 'Groq',
        hint: '免費 API，前往 https://console.groq.com 取得金鑰',
        needsKey: false,
        models: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B（推薦）', description: '最強大、最準確' },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: '快速回應' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: '平衡效能' },
            { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google 輕量模型' }
        ]
    },
    openai: {
        name: 'OpenAI',
        hint: '前往 https://platform.openai.com/api-keys 取得金鑰',
        needsKey: true,
        models: [
            { id: 'gpt-4o', name: 'GPT-4o（推薦）', description: '最強大的多模態模型' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '快速且經濟' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '高效能版本' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '經濟實惠' }
        ]
    },
    claude: {
        name: 'Claude (Anthropic)',
        hint: '前往 https://console.anthropic.com 取得金鑰',
        needsKey: true,
        models: [
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4（推薦）', description: '最新最強' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '平衡效能與成本' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: '快速且經濟' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: '最高品質' }
        ]
    },
    gemini: {
        name: 'Gemini (Google)',
        hint: '前往 https://makersuite.google.com/app/apikey 取得金鑰',
        needsKey: true,
        models: [
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash（推薦）', description: '最新實驗版本' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '進階推理能力' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: '快速回應' },
            { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: '穩定版本' }
        ]
    }
};

// 切換進階 AI 設定顯示
function toggleAdvancedAISettings() {
    const settings = document.getElementById('advancedAISettings');
    const icon = document.getElementById('advancedAIIcon');

    if (settings.classList.contains('hidden')) {
        settings.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        settings.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

// 當選擇的 AI 提供商改變時
function onProviderChange() {
    const select = document.getElementById('aiProviderSelect');
    const keySection = document.getElementById('customApiKeySection');
    const keyInput = document.getElementById('customApiKey');
    const keyLabel = document.getElementById('apiKeyLabel');
    const keyHint = document.getElementById('apiKeyHint');
    const modelSection = document.getElementById('modelSelectSection');
    const modelSelect = document.getElementById('modelSelect');

    const provider = select.value;
    const providerInfo = AI_PROVIDERS[provider];

    // 處理 API 金鑰區塊
    if (providerInfo.needsKey) {
        keySection.classList.remove('hidden');
        keyLabel.textContent = `${providerInfo.name} API 金鑰`;
        keyHint.textContent = providerInfo.hint;
        keyInput.placeholder = `輸入您的 ${providerInfo.name} API 金鑰`;
    } else {
        keySection.classList.add('hidden');
        keyInput.value = '';
    }

    // 處理模型選擇區塊
    if (providerInfo.models && providerInfo.models.length > 0) {
        modelSection.classList.remove('hidden');
        modelSelect.innerHTML = providerInfo.models.map((model, index) =>
            `<option value="${model.id}" ${index === 0 ? 'selected' : ''}>
                ${model.name} - ${model.description}
            </option>`
        ).join('');
    } else {
        modelSection.classList.add('hidden');
        modelSelect.innerHTML = '';
    }
}

// 獲取當前選擇的 AI 設定
function getAISettings() {
    const providerSelect = document.getElementById('aiProviderSelect');
    const apiKeyInput = document.getElementById('customApiKey');
    const modelSelect = document.getElementById('modelSelect');

    return {
        provider: providerSelect ? providerSelect.value : 'auto',
        customApiKey: apiKeyInput ? apiKeyInput.value.trim() : null,
        model: modelSelect && modelSelect.value ? modelSelect.value : null
    };
}

// 獲取 AI 建議
async function fetchAIRecommendation() {
    const loadingEl = document.getElementById('aiLoading');
    const contentEl = document.getElementById('aiContent');
    const errorEl = document.getElementById('aiError');
    const errorMsgEl = document.getElementById('aiErrorMessage');
    const providerBadge = document.getElementById('aiProviderBadge');
    const providerName = document.getElementById('aiProviderName');
    const refreshBtn = document.getElementById('refreshAiBtn');

    // 顯示載入狀態
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    providerBadge.classList.add('hidden');

    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.classList.add('opacity-50');
    }

    try {
        // 準備要發送的資料
        const formData = window.lastFormData;
        const prescription = window.lastPrescription;

        if (!formData || !prescription) {
            throw new Error('缺少表單或處方資料');
        }

        const userData = {
            ...formData,
            prescription: {
                frequency: prescription.frequency,
                intensity: prescription.intensity,
                time: prescription.time,
                type: prescription.type,
                volume: prescription.volume
            }
        };

        // 獲取 AI 設定（提供商、模型、API 金鑰）
        const aiSettings = getAISettings();

        // 呼叫 AI API
        const response = await fetch(AI_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userData,
                provider: aiSettings.provider,
                model: aiSettings.model,
                customApiKey: aiSettings.customApiKey || null
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'AI 服務回應錯誤');
        }

        // 顯示 AI 建議
        loadingEl.classList.add('hidden');
        contentEl.innerHTML = result.recommendation;
        contentEl.classList.remove('hidden');

        // 顯示提供商標示
        if (result.provider) {
            providerName.textContent = result.provider;
            providerBadge.classList.remove('hidden');
        }

    } catch (error) {
        console.error('AI 建議獲取失敗:', error);

        // 顯示錯誤狀態
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsgEl.textContent = 'AI 服務暫時無法連線，請查看下方的標準運動處方建議。';
        } else {
            errorMsgEl.textContent = error.message || 'AI 服務暫時無法使用，請查看下方的標準運動處方建議。';
        }
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('opacity-50');
        }
    }
}

// 修改原有的 generatePrescription 函數，整合 AI 功能
const originalGeneratePrescription = generatePrescription;

generatePrescription = function() {
    try {
        const data = collectFormData();
        console.log('Collected form data:', data);

        // 保存表單數據
        window.lastFormData = data;

        const prescription = calculateFITTVP(data);
        console.log('Generated prescription:', prescription);

        // 保存處方資料供 AI 使用
        window.lastPrescription = prescription;

        displayPrescriptionSummary(prescription);
        displayFITTPDetails(prescription);
        displayExerciseGuidelines(prescription);

        console.log('Prescription displayed successfully');

        // 自動觸發 AI 建議獲取
        setTimeout(() => {
            fetchAIRecommendation();
        }, 100);

    } catch (error) {
        console.error('Error generating prescription:', error);
        alert('生成運動處方時發生錯誤，請檢查輸入資料');
    }
};

// 檢查 AI 服務健康狀態（可選）
async function checkAIHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('AI 服務狀態:', data);
        return data.status === 'ok';
    } catch (error) {
        console.log('AI 服務無法連線（可能是純靜態部署）');
        return false;
    }
}

// 頁面載入時檢查 AI 服務
document.addEventListener('DOMContentLoaded', function() {
    checkAIHealth().then(isAvailable => {
        if (!isAvailable) {
            // 如果 AI 服務不可用，可以隱藏 AI 區塊或顯示提示
            const aiSection = document.getElementById('aiRecommendationSection');
            if (aiSection) {
                // 保持顯示但會自動顯示錯誤訊息
                console.log('AI 服務不可用，將顯示標準處方');
            }
        }
    });
});