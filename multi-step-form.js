// 多步驟表單管理
let currentStep = 1;
const totalSteps = 3;

// 初始化多步驟表單
function initMultiStepForm() {
    console.log('Initializing multi-step form...');

    // 檢查是否有表單步驟
    const allSteps = document.querySelectorAll('.form-step');
    console.log('Total form steps found:', allSteps.length);

    // 列出所有步驟的詳細信息
    allSteps.forEach((step, index) => {
        console.log(`Step ${index + 1}:`, step.dataset.step, step.classList.toString());
    });

    // 顯示第一步
    showStep(1);

    // 更新步驟指示器
    updateStepIndicator();

    console.log('Multi-step form initialized, current step:', currentStep);
}

// 顯示指定步驟
function showStep(step) {
    console.log('showStep called with step:', step);

    // 隱藏所有步驟
    const allSteps = document.querySelectorAll('.form-step');
    console.log('Found form steps:', allSteps.length);

    allSteps.forEach((s, index) => {
        console.log(`Hiding step ${index + 1} (data-step=${s.dataset.step})`);
        s.classList.remove('active');
        s.style.display = 'none';
    });

    // 顯示當前步驟
    const currentStepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    console.log('Current step element for step', step, ':', currentStepElement);

    if (currentStepElement) {
        currentStepElement.classList.add('active');
        currentStepElement.style.display = 'block';
        console.log('Step', step, 'is now visible');
        console.log('Element classes:', currentStepElement.classList.toString());
        console.log('Element display style:', currentStepElement.style.display);

        // 特別檢查第三步的內容
        if (step === 3) {
            const parqContent = currentStepElement.querySelector('.space-y-6');
            console.log('PAR-Q content found:', !!parqContent);
            if (parqContent) {
                console.log('PAR-Q content children:', parqContent.children.length);
            }

        }
    } else {
        console.error('Could not find step element for step:', step);
        console.log('Available steps:');
        allSteps.forEach(s => {
            console.log('- Step with data-step:', s.dataset.step);
        });
    }

    currentStep = step;
    updateStepIndicator();
}

// 下一步
function nextStep() {
    // 驗證當前步驟
    if (!validateCurrentStep()) {
        showStepError();
        return;
    }

    if (currentStep < totalSteps) {
        showStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });

    }
}

// 上一步
function prevStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 驗證當前步驟
function validateCurrentStep() {
    let isValid = true;

    switch(currentStep) {
        case 1:
            // 驗證基本資料
            const age = document.getElementById('age');
            const gender = document.getElementById('gender');
            const height = document.getElementById('height');
            const weight = document.getElementById('weight');

            if (!age?.value || !gender?.value || !height?.value || !weight?.value) {
                isValid = false;
            }
            break;

        case 2:
            // 驗證健康狀況
            const healthStatus = document.querySelector('input[name="health_status"]:checked');
            const fitnessLevel = document.querySelector('input[name="fitness_level"]:checked');

            if (!healthStatus || !fitnessLevel) {
                isValid = false;
            }
            break;

        case 3:
            // 驗證 PAR-Q 問題
            const parqQuestions = ['parq_q1', 'parq_q2', 'parq_q3', 'parq_q4', 'parq_q5', 'parq_q6', 'parq_q7'];

            for (let question of parqQuestions) {
                const answer = document.querySelector(`input[name="${question}"]:checked`);
                if (!answer) {
                    isValid = false;
                    break;
                }
            }
            break;
    }

    return isValid;
}

// 更新步驟指示器
function updateStepIndicator() {
    const indicators = document.querySelectorAll('.step-indicator');

    indicators.forEach((indicator, index) => {
        const stepNum = index + 1;

        // 移除所有狀態
        indicator.classList.remove('active', 'completed');

        if (stepNum === currentStep) {
            // 當前步驟
            indicator.classList.add('active');
        } else if (stepNum < currentStep) {
            // 已完成步驟
            indicator.classList.add('completed');

            // 更新圓圈內容為勾號
            const circle = indicator.querySelector('.step-circle');
            if (circle && !circle.innerHTML.includes('✓')) {
                circle.innerHTML = '✓';
            }
        } else {
            // 未到達步驟 - 恢復數字
            const circle = indicator.querySelector('.step-circle');
            if (circle && circle.innerHTML.includes('✓')) {
                circle.innerHTML = stepNum.toString();
            }
        }
    });

    // 更新進度條
    updateFormProgress();

    // 確保正確的按鈕顯示
    updateNavigationButtons();
}

// 更新導航按鈕
function updateNavigationButtons() {
    console.log('Updating navigation buttons for step:', currentStep);

    // 找到當前步驟的按鈕
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);

    if (currentStepElement) {
        const submitButton = currentStepElement.querySelector('button[type="submit"]');
        const nextButton = currentStepElement.querySelector('button[onclick="nextStep()"]');

        console.log('Submit button found:', !!submitButton);
        console.log('Next button found:', !!nextButton);

        if (currentStep === 3) {
            // 第3步應該顯示提交按鈕
            if (submitButton) {
                submitButton.style.display = 'inline-flex';
                console.log('Submit button displayed');
            }
            if (nextButton) {
                nextButton.style.display = 'none';
                console.log('Next button hidden');
            }
        } else {
            // 其他步驟顯示下一步按鈕
            if (submitButton) {
                submitButton.style.display = 'none';
            }
            if (nextButton) {
                nextButton.style.display = 'inline-flex';
            }
        }
    }
}

// 顯示步驟錯誤
function showStepError() {
    const errorDiv = document.getElementById('formError');
    if (errorDiv) {
        errorDiv.textContent = '請完成當前步驟的必填欄位';
        errorDiv.classList.remove('hidden');

        // 3秒後自動隱藏
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 3000);
    }
}

// 將函數添加到 window 對象以便全局訪問
window.nextStep = nextStep;
window.prevStep = prevStep;
window.showStep = showStep;

// 當 DOM 載入完成時初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延遲執行以確保所有元素都載入完成
    setTimeout(initMultiStepForm, 100);
});