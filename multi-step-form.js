// 多步驟表單管理
let currentStep = 1;
const totalSteps = 3;
// 記錄當前步驟第一個未完成欄位，供 showStepError 顯示具體訊息並捲動聚焦
let lastStepError = null;

// 初始化多步驟表單
function initMultiStepForm() {
  // 檢查是否有表單步驟
  const allSteps = document.querySelectorAll(".form-step");

  // 列出所有步驟的詳細信息
  allSteps.forEach((step, index) => {});

  // 顯示第一步
  showStep(1);

  // 更新步驟指示器
  updateStepIndicator();
}

// 顯示指定步驟
function showStep(step) {
  // 隱藏所有步驟
  const allSteps = document.querySelectorAll(".form-step");

  allSteps.forEach((s, index) => {
    s.classList.remove("active");
    s.style.display = "none";
  });

  // 顯示當前步驟
  const currentStepElement = document.querySelector(
    `.form-step[data-step="${step}"]`,
  );

  if (currentStepElement) {
    currentStepElement.classList.add("active");
    currentStepElement.style.display = "block";

    // 特別檢查第三步的內容
    if (step === 3) {
      const parqContent = currentStepElement.querySelector(".space-y-6");
      if (parqContent) {
      }
    }
  } else {
    console.error("Could not find step element for step:", step);
    allSteps.forEach((s) => {});
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// 上一步
function prevStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// 驗證當前步驟
function validateCurrentStep() {
  lastStepError = null;

  switch (currentStep) {
    case 1: {
      // 驗證基本資料：回報第一個未填欄位
      const fields = [
        { id: "age", label: "年齡" },
        { id: "gender", label: "性別" },
        { id: "height", label: "身高" },
        { id: "weight", label: "體重" },
      ];
      for (const f of fields) {
        const el = document.getElementById(f.id);
        if (!el?.value) {
          lastStepError = { message: `請填寫「${f.label}」`, focusId: f.id };
          return false;
        }
      }
      break;
    }

    case 2: {
      // 驗證健康狀況
      if (!document.querySelector('input[name="health_status"]:checked')) {
        lastStepError = {
          message: "請選擇您的健康狀況",
          focusName: "health_status",
        };
        return false;
      }
      if (!document.querySelector('input[name="fitness_level"]:checked')) {
        lastStepError = {
          message: "請選擇您的體能自評",
          focusName: "fitness_level",
        };
        return false;
      }
      break;
    }

    case 3: {
      // 驗證 PAR-Q 問題：指出是第幾題未回答
      const parqQuestions = [
        "parq_q1",
        "parq_q2",
        "parq_q3",
        "parq_q4",
        "parq_q5",
        "parq_q6",
        "parq_q7",
      ];
      for (let i = 0; i < parqQuestions.length; i++) {
        if (
          !document.querySelector(`input[name="${parqQuestions[i]}"]:checked`)
        ) {
          lastStepError = {
            message: `請回答第 ${i + 1} 題健康篩檢問題`,
            focusName: parqQuestions[i],
          };
          return false;
        }
      }
      break;
    }
  }

  return true;
}

// 更新步驟指示器
function updateStepIndicator() {
  const indicators = document.querySelectorAll(".step-indicator");

  indicators.forEach((indicator, index) => {
    const stepNum = index + 1;

    // 移除所有狀態
    indicator.classList.remove("active", "completed");

    if (stepNum === currentStep) {
      // 當前步驟
      indicator.classList.add("active");
    } else if (stepNum < currentStep) {
      // 已完成步驟
      indicator.classList.add("completed");

      // 更新圓圈內容為勾號
      const circle = indicator.querySelector(".step-circle");
      if (circle && !circle.innerHTML.includes("✓")) {
        circle.innerHTML = "✓";
      }
    } else {
      // 未到達步驟 - 恢復數字
      const circle = indicator.querySelector(".step-circle");
      if (circle && circle.innerHTML.includes("✓")) {
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
  // 找到當前步驟的按鈕
  const currentStepElement = document.querySelector(
    `.form-step[data-step="${currentStep}"]`,
  );

  if (currentStepElement) {
    const submitButton = currentStepElement.querySelector(
      'button[type="submit"]',
    );
    const nextButton = currentStepElement.querySelector(
      'button[onclick="nextStep()"]',
    );

    if (currentStep === 3) {
      // 第3步應該顯示提交按鈕
      if (submitButton) {
        submitButton.style.display = "inline-flex";
      }
      if (nextButton) {
        nextButton.style.display = "none";
      }
    } else {
      // 其他步驟顯示下一步按鈕
      if (submitButton) {
        submitButton.style.display = "none";
      }
      if (nextButton) {
        nextButton.style.display = "inline-flex";
      }
    }
  }
}

// 顯示步驟錯誤
function showStepError() {
  const errorDiv = document.getElementById("formError");
  if (!errorDiv) return;

  const msg =
    (lastStepError && lastStepError.message) || "請完成當前步驟的必填欄位";
  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden");

  // 捲動並聚焦到第一個未完成的欄位，方便使用者直接修正
  if (lastStepError) {
    let target = null;
    if (lastStepError.focusId) {
      target = document.getElementById(lastStepError.focusId);
    } else if (lastStepError.focusName) {
      target = document.querySelector(
        `input[name="${lastStepError.focusName}"]`,
      );
    }
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof target.focus === "function") {
        try {
          target.focus({ preventScroll: true });
        } catch (e) {
          target.focus();
        }
      }
    }
  }

  // 5秒後自動隱藏
  setTimeout(() => {
    errorDiv.classList.add("hidden");
  }, 5000);
}

// 將函數添加到 window 對象以便全局訪問
window.nextStep = nextStep;
window.prevStep = prevStep;
window.showStep = showStep;

// 當 DOM 載入完成時初始化
document.addEventListener("DOMContentLoaded", function () {
  // 延遲執行以確保所有元素都載入完成
  setTimeout(initMultiStepForm, 100);
});
