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

// BMI 計算功能
function calculateBMI() {
    const age = parseInt(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    
    // 檢查年齡，小於18歲不計算BMI
    if (age && age < 18) {
        document.getElementById('bmiValue').textContent = '未滿18歲';
        document.getElementById('bmiCategory').textContent = '不適用';
        document.getElementById('bmiCategory').className = 'text-sm px-2 py-1 rounded bg-gray-100 text-gray-600';
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
        
    } else {
        document.getElementById('bmiValue').textContent = '待計算';
        document.getElementById('bmiCategory').textContent = '';
        document.getElementById('bmiCategory').className = 'text-sm px-2 py-1 rounded';
    }
}

// 頁面路由管理
function showPage(pageId) {
    // 隱藏所有頁面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // 顯示指定頁面
    document.getElementById(pageId).classList.add('active');
    
    // 滾動到頂部
    window.scrollTo(0, 0);
}

// 年齡檢查功能
document.addEventListener('DOMContentLoaded', function() {
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
    const form = document.getElementById('healthForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            generatePrescription();
            showPage('resultPage');
        } else {
            showFormError();
        }
    });
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
    
    // 檢查運動習慣 (radio button)
    const exerciseHabit = document.querySelector('input[name="exercise_habit"]:checked');
    if (!exerciseHabit) {
        alert('請選擇您的運動習慣');
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
        const exerciseElement = document.querySelector('input[name="exercise_habit"]:checked');
        
        if (!ageElement || !genderElement || !heightElement || !weightElement || !fitnessElement || !exerciseElement) {
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
        
        const formData = {
            age: age,
            gender: genderElement.value,
            height: height,
            weight: weight,
            bmi: bmi, // 未成年為null
            diseases: Array.from(document.querySelectorAll('input[name="diseases"]:checked')).map(cb => cb.value),
            fitness_level: fitnessElement.value,
            exercise_habit: exerciseElement.value,
            limitations: Array.from(document.querySelectorAll('input[name="limitations"]:checked')).map(cb => cb.value)
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
        // 成人 (18-64歲)
        prescription.frequency = 4;
        prescription.time = 38; // 約150分鐘/週 ÷ 4次
        prescription.intensity = 'moderate';
        prescription.type.push('有氧運動', '肌力訓練');
        prescription.volume = 500;
        prescription.recommendations.push('每週至少2次肌力訓練');
        
    } else if (data.age >= 65) {
        // 銀髮族 (65歲以上)
        prescription.frequency = Math.max(3, prescription.frequency);
        prescription.type.push('平衡訓練', '跌倒預防');
        prescription.warnings.push('高齡使用者請特別注意運動安全');
        prescription.recommendations.push('每週至少2次平衡訓練');
    }
    
    // 根據體能水平調整（僅對成人和銀髮族）
    if (data.age >= 18) {
        switch (data.fitness_level) {
            case 'poor':
                prescription.frequency = 3;
                prescription.time = 15;
                prescription.intensity = 'light';
                prescription.volume = 225;
                prescription.progression = '每4週增加5-10%運動時間';
                break;
            case 'fair':
                prescription.frequency = 3;
                prescription.time = 20;
                prescription.intensity = 'light-moderate';
                prescription.volume = 300;
                break;
            case 'good':
                prescription.frequency = 4;
                prescription.time = 35;
                prescription.volume = 525;
                break;
            case 'excellent':
                prescription.frequency = 5;
                prescription.time = 45;
                prescription.volume = 675;
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
                prescription.warnings.push('建議諮詢醫師或營養師制定完整的體重管理計畫');
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
                prescription.time = Math.max(75, prescription.time);
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
        prescription.recommendations.push('建議在醫師監督下開始運動計畫');
    }
    
    if (data.diseases.includes('sarcopenia')) {
        prescription.type.push('阻力訓練', '蛋白質營養');
        prescription.recommendations.push('重點加強肌力訓練，每週至少3次阻力運動');
        prescription.recommendations.push('建議搭配營養師指導，確保足夠蛋白質攝取');
        prescription.warnings.push('漸進式增加負重，避免過度訓練造成傷害');
        // 肌少症患者需要更頻繁的肌力訓練
        if (data.age >= 18) {
            prescription.frequency = Math.max(prescription.frequency, 4);
        }
    }
    
    if (data.diseases.includes('cancer_recovery')) {
        if (data.age >= 18) {
            prescription.frequency = Math.max(3, prescription.frequency);
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
    
    // 根據運動習慣調整
    switch (data.exercise_habit) {
        case 'none':
            if (data.age >= 18) {
                prescription.frequency = 3;
                prescription.time = Math.min(prescription.time, 20);
                prescription.progression = '前4週每週增加5分鐘，之後每2週增加5分鐘';
            }
            break;
        case 'light':
            if (data.age >= 18) {
                prescription.time = Math.min(prescription.time, 30);
            }
            break;
        case 'moderate':
            // 維持計算值
            break;
        case 'active':
            if (data.age >= 18) {
                prescription.frequency = Math.max(4, prescription.frequency);
                prescription.time = Math.max(40, prescription.time);
            }
            break;
        case 'student_athlete':
            if (data.age <= 17) {
                prescription.type.push('專項技能訓練', '競技表現提升');
                prescription.recommendations.push('配合專業教練指導');
                prescription.warnings.push('注意訓練負荷管理，避免過度訓練');
            } else {
                prescription.frequency = Math.max(5, prescription.frequency);
                prescription.time = Math.max(60, prescription.time);
                prescription.type.push('專項訓練');
            }
            break;
    }
    
    return prescription;
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
    
    container.innerHTML = `
        <div class="text-center mb-6">
            <h3 class="text-3xl font-bold text-blue-800 mb-2">您的運動處方</h3>
            <div class="text-xl text-gray-700">
                <strong>${exerciseTypes} ${timeText} × ${frequencyText}</strong>
            </div>
            <div class="text-lg text-gray-600 mt-2">強度：${intensityText}</div>
        </div>
        
        ${bmiSection}
        
        <div class="grid md:grid-cols-3 gap-4 text-center">
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
        '阻力訓練': ['彈力帶運動', '輕重量啞鈴', '徒手肌力訓練', '阻力機器'],
        '肌力訓練': ['伏地挺身', '深蹲', '仰臥起坐', '啞鈴訓練'],
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

// PDF 下載功能（目前為模擬）
function downloadPDF() {
    alert('PDF 下載功能開發中！\n\n目前您可以：\n1. 截圖保存本頁面\n2. 列印此頁面為PDF\n3. 複製重要資訊到記事本');
    
    // TODO: 實際的 PDF 生成功能
    // 可以使用 jsPDF 或其他 PDF 生成庫
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