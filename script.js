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
        const exerciseElement = document.querySelector('input[name="exercise_habit"]:checked');
        const healthStatusElement = document.querySelector('input[name="health_status"]:checked');
        
        if (!ageElement || !genderElement || !heightElement || !weightElement || !fitnessElement || !exerciseElement || !healthStatusElement) {
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

        const formData = {
            age: age,
            gender: genderElement.value,
            height: height,
            weight: weight,
            bmi: bmi, // 未成年為null
            health_status: healthStatusElement.value,
            diseases: diseases,
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
        // 成人 (18-64歲) - WHO建議：每週150分鐘中等強度有氧運動
        prescription.frequency = 5; // WHO建議每週至少5次，每次30分鐘 = 150分鐘
        prescription.time = 30;
        prescription.intensity = 'moderate';
        prescription.type.push('有氧運動', '肌力訓練');
        prescription.volume = 525; // 3.5 METs × 30分鐘 × 5次
        prescription.progression = '每2-4週增加10%運動時間或頻率，目標達到ACSM建議：每週至少150分鐘中強度或75分鐘高強度有氧運動';
        
    } else if (data.age >= 65) {
        // 銀髮族 (65歲以上) - WHO建議：與成人相同，但加強平衡訓練
        prescription.frequency = 5; // WHO建議與成人相同，每週150分鐘
        prescription.time = 30;
        prescription.intensity = 'moderate';
        prescription.type.push('有氧運動', '肌力訓練', '平衡訓練', '柔軟度訓練');
        prescription.volume = 525; // 3.5 METs × 30分鐘 × 5次
        prescription.progression = '每2-4週增加10%運動時間或頻率，目標達到ACSM建議：每週至少150分鐘中強度有氧運動，並加強平衡訓練';
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
                prescription.progression = '前8週建立習慣，之後逐步增加至ACSM建議（每週150分鐘中強度有氧運動）';
                break;
            case 'fair':
                // 一般：WHO基準的80%
                prescription.frequency = 4; // 略低於WHO建議
                prescription.time = 30;
                prescription.intensity = 'light-moderate';
                prescription.volume = 420; // 3.5 METs × 30分鐘 × 4次
                prescription.progression = '每4週增加1次運動，達到ACSM建議（每週150分鐘中強度有氧運動）';
                break;
            case 'good':
                // 良好：維持WHO建議
                // 保持原設定：每週5次，每次30分鐘
                break;
            case 'excellent':
                // 優秀：超過WHO建議，達到額外健康益處
                prescription.frequency = 6; // 超過WHO建議
                prescription.time = 35; // 總計210分鐘/週
                prescription.volume = 735; // 3.5 METs × 35分鐘 × 6次
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
        prescription.type.push('阻力訓練'); // 移除「蛋白質營養」，這不是運動類型
        prescription.recommendations.push('重點加強肌力訓練，每週至少3次阻力運動');
        prescription.recommendations.push('建議搭配營養師指導，確保足夠蛋白質攝取');
        prescription.warnings.push('漸進式增加負重，避免過度訓練造成傷害');
        // 肌少症患者需要更頻繁的肌力訓練，但不過度
        if (data.age >= 18) {
            prescription.frequency = Math.min(prescription.frequency + 1, 4);
        }
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
    
    // 根據運動習慣微調WHO基準
    switch (data.exercise_habit) {
        case 'none':
            // 沒有運動習慣：從WHO建議的60%開始
            if (data.age >= 18) {
                prescription.frequency = Math.max(3, Math.floor(prescription.frequency * 0.6)); // 至少3次
                prescription.time = Math.max(20, Math.floor(prescription.time * 0.7)); // 至少20分鐘
                prescription.progression = '前4週每週3次建立習慣，8週後逐步達到ACSM建議（每週150分鐘中強度有氧運動）';
            }
            break;
        case 'light':
            // 偶爾運動：WHO建議的80%
            if (data.age >= 18) {
                prescription.frequency = Math.max(4, Math.floor(prescription.frequency * 0.8));
                prescription.time = Math.floor(prescription.time * 0.9);
                prescription.progression = '每4週增加1次運動頻率，逐步達到ACSM建議（每週150分鐘中強度有氧運動）';
            }
            break;
        case 'moderate':
            // 規律運動：維持WHO建議或略增
            // 保持原設定，不調整
            break;
        case 'active':
            // 經常運動：超過WHO建議，追求額外健康益處
            if (data.age >= 18) {
                prescription.frequency = Math.min(prescription.frequency + 1, 6);
                prescription.time = Math.min(prescription.time + 5, 45);
                prescription.progression = '可維持現有頻率或追求更高運動目標';
            }
            break;
        case 'student_athlete':
            // 專業訓練：高於WHO建議的專業訓練量
            if (data.age <= 17) {
                prescription.type.push('專項技能訓練', '競技表現提升');
                prescription.recommendations.push('配合專業教練指導');
                prescription.warnings.push('注意訓練負荷管理，避免過度訓練');
            } else {
                prescription.frequency = Math.min(prescription.frequency + 1, 6);
                prescription.time = Math.min(prescription.time + 10, 60);
                prescription.type.push('專項訓練');
                prescription.progression = '在專業指導下可維持高訓練量';
            }
            break;
    }
    
    // 清理重複的運動類型並整理優先順序
    prescription.type = cleanupExerciseTypes(prescription.type);
    
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
        // 創建一個臨時的PDF內容容器
        const pdfContent = createPDFContent();
        document.body.appendChild(pdfContent);
        
        // 使用 html2canvas 將內容轉換為圖片
        const canvas = await html2canvas(pdfContent, {
            scale: 1.5, // 適中解析度
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794, // A4 寬度 (px)
            scrollX: 0,
            scrollY: 0
        });
        
        // 移除臨時容器
        document.body.removeChild(pdfContent);
        
        // 創建 PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // 計算圖片尺寸以適應 A4
        const imgWidth = 210; // A4 寬度 mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;
        
        // 添加第一頁
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297; // A4 高度 mm
        
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
        pdf.save(`運動處方建議_${dateStr}.pdf`);
        
    } catch (error) {
        console.error('PDF 生成錯誤:', error);
        alert('PDF 生成失敗，請稍後再試。可能是瀏覽器不支援或網路問題。');
    }
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
        padding: 30px;
        box-sizing: border-box;
    `;
    
    // 獲取運動範例
    const exerciseExamples = getExerciseExamples(prescription.type);
    
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: #1e40af;">
                個人化運動處方建議
            </h1>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 15px;">
                基於 ACSM FITT-VP 原則與 WHO 身體活動建議指引
            </p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px;">
                您的運動處方
            </h2>
            <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <div style="font-size: 20px; font-weight: bold; color: #1e40af; margin-bottom: 5px;">
                        ${prescription.type.join('、')} ${prescription.frequency === 7 ? '每日' : '每週' + prescription.frequency + '次'} × ${prescription.time}分鐘
                    </div>
                    <div style="font-size: 14px; color: #6b7280;">
                        強度：${getIntensityText(prescription.intensity)}
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center; font-size: 12px;">
                    <div style="background: white; padding: 10px; border-radius: 4px;">
                        <div style="font-size: 16px; font-weight: bold; color: #3b82f6;">
                            ${prescription.frequency === 7 ? '每日' : prescription.frequency}
                        </div>
                        <div style="color: #6b7280;">${prescription.frequency === 7 ? '身體活動' : '次/週'}</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 4px;">
                        <div style="font-size: 16px; font-weight: bold; color: #22c55e;">
                            ${prescription.time}
                        </div>
                        <div style="color: #6b7280;">分鐘${prescription.frequency === 7 ? '/日' : '/次'}</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 4px;">
                        <div style="font-size: 16px; font-weight: bold; color: #8b5cf6;">
                            ${prescription.volume === 0 ? '多樣化' : prescription.volume}
                        </div>
                        <div style="color: #6b7280;">${prescription.volume === 0 ? '活動類型' : 'MET-min/週'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-bottom: 2px solid #22c55e; padding-bottom: 4px;">
                FITT-VP 運動原則
            </h2>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #22c55e;">
                <div style="display: grid; gap: 8px; font-size: 12px;">
                    <div style="display: flex;">
                        <div style="width: 120px; font-weight: bold; color: #059669;">頻率 (Frequency)：</div>
                        <div>${prescription.frequency === 7 ? '每日身體活動' : `每週 ${prescription.frequency} 次運動`}</div>
                    </div>
                    <div style="display: flex;">
                        <div style="width: 120px; font-weight: bold; color: #059669;">強度 (Intensity)：</div>
                        <div>${getIntensityText(prescription.intensity)}</div>
                    </div>
                    <div style="display: flex;">
                        <div style="width: 120px; font-weight: bold; color: #059669;">時間 (Time)：</div>
                        <div>${prescription.frequency === 7 ? '每日' : '每次運動'} ${prescription.time} 分鐘</div>
                    </div>
                    <div style="display: flex;">
                        <div style="width: 120px; font-weight: bold; color: #059669;">類型 (Type)：</div>
                        <div>${prescription.type.join('、')}</div>
                    </div>
                    <div style="display: flex;">
                        <div style="width: 120px; font-weight: bold; color: #059669;">總量 (Volume)：</div>
                        <div>${prescription.volume === 0 ? '重點在活動多樣性與趣味性' : `每週約 ${prescription.volume} MET-minutes`}</div>
                    </div>
                    <div style="display: flex;">
                        <div style="width: 120px; font-weight: bold; color: #059669;">進展 (Progression)：</div>
                        <div>${prescription.progression}</div>
                    </div>
                </div>
            </div>
        </div>
        
        ${prescription.warnings.length > 0 ? `
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-bottom: 2px solid #ef4444; padding-bottom: 4px;">
                重要注意事項
            </h2>
            <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
                <ul style="margin: 0; padding-left: 15px; font-size: 12px; color: #991b1b;">
                    ${prescription.warnings.map(warning => `<li style="margin-bottom: 6px;">${warning}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}
        
        ${prescription.recommendations.length > 0 ? `
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-bottom: 2px solid #f59e0b; padding-bottom: 4px;">
                建議事項
            </h2>
            <div style="background: #fffbeb; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <ul style="margin: 0; padding-left: 15px; font-size: 12px; color: #92400e;">
                    ${prescription.recommendations.map(rec => `<li style="margin-bottom: 6px;">${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 12px; border-bottom: 2px solid #8b5cf6; padding-bottom: 4px;">
                推薦運動範例
            </h2>
            <div style="background: #f5f3ff; padding: 15px; border-radius: 6px; border-left: 4px solid #8b5cf6;">
                ${exerciseExamples}
            </div>
        </div>
        
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