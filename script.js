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
  },
};

// 即時欄位驗證函數（由外部事件監聽器觸發）
const FIELD_LABELS = {
  age: { label: "年齡", unit: "歲" },
  height: { label: "身高", unit: "公分" },
  weight: { label: "體重", unit: "公斤" },
};

function getFieldValidationMessage(input) {
  const meta = FIELD_LABELS[input.id] || { label: "數值", unit: "" };
  if (input.validity.stepMismatch) {
    return input.id === "age"
      ? "年齡請填寫整數"
      : `${meta.label}最多填寫一位小數`;
  }
  return `${meta.label}需介於 ${input.min}–${input.max} ${meta.unit}`;
}

function validateField(input, min, max) {
  const value = parseFloat(input.value);
  const icon = DOMCache.get(input.id + "Icon");
  const message = document.getElementById(input.id + "Msg");

  if (!icon) return;

  const setMessage = (text) => {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("hidden", !text);
  };

  if (input.value === "") {
    input.classList.remove("field-valid", "field-invalid");
    input.removeAttribute("aria-invalid");
    icon.textContent = "";
    icon.className = "validation-icon";
    setMessage("");
    return;
  }

  if (!isNaN(value) && value >= min && value <= max && input.validity.valid) {
    input.classList.remove("field-invalid");
    input.classList.add("field-valid");
    input.removeAttribute("aria-invalid");
    icon.textContent = "✓";
    icon.className = "validation-icon icon-valid";
    icon.setAttribute("aria-hidden", "true");
    setMessage("");
  } else {
    input.classList.remove("field-valid");
    input.classList.add("field-invalid");
    input.setAttribute("aria-invalid", "true");
    icon.textContent = "✗";
    icon.className = "validation-icon icon-invalid";
    icon.setAttribute("aria-hidden", "true");
    setMessage(getFieldValidationMessage(input));
  }
}

// PDF 載入 Modal 控制
function showLoadingModal() {
  const modal = document.getElementById("loadingModal");
  if (modal) {
    modal.classList.add("active");
  }
}

function hideLoadingModal() {
  const modal = document.getElementById("loadingModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

// MET 活動資料庫
const MET_ACTIVITIES = {
  light: [
    { name: "緩慢走路", met: 2.0, examples: ["漫步", "輕鬆散步", "購物走路"] },
    { name: "輕度家務", met: 2.5, examples: ["洗碗", "整理房間", "烹飪"] },
    { name: "伸展運動", met: 2.3, examples: ["瑜伽伸展", "太極", "簡單拉筋"] },
    { name: "辦公室工作", met: 1.8, examples: ["打字", "閱讀", "會議"] },
  ],
  moderate: [
    { name: "快走", met: 3.5, examples: ["健走", "快速步行", "爬樓梯"] },
    {
      name: "騎自行車(休閒)",
      met: 4.0,
      examples: ["平地騎車", "休閒單車", "通勤騎車"],
    },
    {
      name: "游泳(輕鬆)",
      met: 4.5,
      examples: ["蛙式慢游", "水中走路", "水中有氧"],
    },
    { name: "舞蹈", met: 4.8, examples: ["社交舞", "有氧舞蹈", "廣場舞"] },
    {
      name: "網球(雙打)",
      met: 5.0,
      examples: ["雙打網球", "羽毛球雙打", "桌球"],
    },
  ],
  vigorous: [
    { name: "跑步", met: 8.0, examples: ["慢跑", "中速跑步", "間歇跑"] },
    {
      name: "騎自行車(快速)",
      met: 8.5,
      examples: ["競速騎車", "山地車", "高強度騎車"],
    },
    { name: "游泳(快速)", met: 10.0, examples: ["自由式", "蝶式", "競技游泳"] },
    { name: "籃球", met: 6.5, examples: ["全場籃球", "激烈對戰", "比賽"] },
    {
      name: "重量訓練",
      met: 6.0,
      examples: ["高強度重訓", "CrossFit", "功能性訓練"],
    },
  ],
};

// 計算熱量消耗
function calculateCalories(metValue, weightKg, durationMinutes) {
  const hours = durationMinutes / 60;
  return Math.round(metValue * weightKg * hours * 10) / 10;
}

// 生成 MET 活動 HTML
// 處方強度 → MET 活動表的強度分級；活動推薦必須跟著最終處方走，不另外看年齡/體能自評
const PRESCRIPTION_TO_MET_LEVEL = {
  light: "light",
  "light-moderate": "light",
  moderate: "moderate",
  "moderate-vigorous": "vigorous",
};

function getMETActivitiesHtml(prescription) {
  const weight = parseFloat(document.getElementById("weight")?.value) || 70;
  const intensity =
    PRESCRIPTION_TO_MET_LEVEL[prescription?.intensity] || "moderate";

  const activities = MET_ACTIVITIES[intensity].slice(0, 3); // 取前3個活動

  const activitiesHtml = activities
    .map((activity) => {
      const calories30min = calculateCalories(activity.met, weight, 30);
      return `
            <div class="bg-white p-3 rounded border">
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="font-semibold text-gray-800">${activity.name}</h5>
                        <p class="text-sm text-gray-600">${activity.met} METs</p>
                        <p class="text-sm text-gray-600">例子: ${activity.examples.join("、")}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-semibold text-blue-600">${calories30min} 卡路里</p>
                        <p class="text-sm text-gray-600">30分鐘</p>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  const intensityName =
    intensity === "light"
      ? "輕度"
      : intensity === "moderate"
        ? "中度"
        : "高強度";
  const metRange =
    intensity === "light"
      ? "1.6-2.9"
      : intensity === "moderate"
        ? "3.0-5.9"
        : "≥6.0";

  return `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-yellow-800 mb-3">推薦 ${intensityName} 活動 (${metRange} METs)</h4>
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
  overweight: "體重過重",
  asthma: "氣喘",
  hypertension: "高血壓",
  diabetes: "糖尿病",
  arthritis: "關節問題",
  heart_recovery: "心臟疾病",
  sarcopenia: "肌少症",
  pregnant: "孕婦",
  hyperlipidemia: "高血脂",
};

// 將疾病代碼轉換為中文名稱
function getDiseaseName(code) {
  return diseaseMap[code] || code;
}

// BMI 計算功能
function calculateBMI() {
  const age = parseInt(document.getElementById("age").value);
  const height = parseFloat(document.getElementById("height").value);
  const weight = parseFloat(document.getElementById("weight").value);

  // 檢查年齡，小於18歲不計算BMI
  if (age && age < 18) {
    document.getElementById("bmiValue").textContent = "未滿18歲";
    document.getElementById("bmiCategory").textContent = "不適用";
    document.getElementById("bmiCategory").className =
      "text-sm px-2 py-1 rounded bg-gray-100 text-gray-600";
    // 但仍計算 BMR 和 TDEE
    calculateBMR();
    return;
  }

  if (height && weight && height > 0 && weight > 0) {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    const bmiRounded = Math.round(bmi * 10) / 10;

    // 更新BMI值
    document.getElementById("bmiValue").textContent = bmiRounded;

    const { label: category, badgeClass: categoryClass } = getBMICategory(bmi);

    const categoryElement = document.getElementById("bmiCategory");
    categoryElement.textContent = category;
    categoryElement.className = `text-sm px-2 py-1 rounded ${categoryClass}`;

    // 計算 BMR 和 TDEE
    calculateBMR();
  } else {
    document.getElementById("bmiValue").textContent = "待計算";
    document.getElementById("bmiCategory").textContent = "";
    document.getElementById("bmiCategory").className =
      "text-sm px-2 py-1 rounded";
    // 身高或體重清空時，BMR / TDEE / 熱量建議一併重置（不留上一次的數值）
    calculateBMR();
  }
}

// BMI 分級（衛福部國健署成人標準）；輸入頁、結果頁、PDF 共用同一套
const BMI_CATEGORIES = [
  {
    max: 18.5,
    label: "體重過輕",
    badgeClass: "bg-blue-100 text-blue-800",
    textClass: "text-blue-700",
  },
  {
    max: 24,
    label: "正常範圍",
    badgeClass: "bg-green-100 text-green-800",
    textClass: "text-green-700",
  },
  {
    max: 27,
    label: "體重過重",
    badgeClass: "bg-yellow-100 text-yellow-800",
    textClass: "text-yellow-800",
  },
  {
    max: 30,
    label: "輕度肥胖",
    badgeClass: "bg-orange-100 text-orange-800",
    textClass: "text-orange-700",
  },
  {
    max: 35,
    label: "中度肥胖",
    badgeClass: "bg-red-100 text-red-800",
    textClass: "text-red-700",
  },
  {
    max: Infinity,
    label: "重度肥胖",
    badgeClass: "bg-red-200 text-red-900",
    textClass: "text-red-800",
  },
];

function getBMICategory(bmi) {
  return BMI_CATEGORIES.find((c) => bmi < c.max) || BMI_CATEGORIES.at(-1);
}

// BMR 基礎代謝率計算（使用 Mifflin-St Jeor 公式）
function calculateBMR() {
  const age = parseInt(document.getElementById("age").value);
  const gender = document.getElementById("gender").value;
  const height = parseFloat(document.getElementById("height").value);
  const weight = parseFloat(document.getElementById("weight").value);
  const bmrElement = document.getElementById("bmrValue");

  if (!age || !gender || !height || !weight) {
    bmrElement.textContent = "待計算";
    calculateTDEE();
    return;
  }

  let bmr;
  if (gender === "male") {
    // 男性：BMR = (10 × 體重kg) + (6.25 × 身高cm) - (5 × 年齡) + 5
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === "female") {
    // 女性：BMR = (10 × 體重kg) + (6.25 × 身高cm) - (5 × 年齡) - 161
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    // Mifflin-St Jeor 只有男女兩套係數；性別「其他」不估算，並清掉前一次的數值
    bmrElement.textContent = "不適用";
    calculateTDEE();
    return;
  }

  bmrElement.textContent = Math.round(bmr);

  // 自動計算 TDEE
  calculateTDEE();
}

// TDEE 每日總消耗熱量計算
function calculateTDEE() {
  const bmrElement = document.getElementById("bmrValue");
  const tdeeElement = document.getElementById("tdeeValue");
  const activityLevel =
    parseFloat(document.getElementById("activityLevel")?.value) || 1.375;
  const bmr = parseInt(bmrElement?.textContent);

  if (!bmrElement || Number.isNaN(bmr)) {
    tdeeElement.textContent =
      bmrElement?.textContent === "不適用" ? "不適用" : "待計算";
    document.getElementById("calorieAdvice")?.classList.add("hidden");
    return;
  }

  const tdee = Math.round(bmr * activityLevel);
  tdeeElement.textContent = tdee;

  // 顯示熱量建議
  showCalorieAdvice(tdee);
}

/**
 * 減重熱量赤字不適用的情況：未成年（仍在生長）、懷孕、體重過輕。
 * 回傳原因文字；適用時回傳 null。
 */
function getCalorieDeficitBlockReason() {
  const age = parseInt(document.getElementById("age")?.value);
  const height = parseFloat(document.getElementById("height")?.value);
  const weight = parseFloat(document.getElementById("weight")?.value);
  const pregnant = document.querySelector(
    'input[name="diseases"][value="pregnant"]:checked',
  );

  if (pregnant) return "懷孕期間不建議刻意減重，熱量需求請由醫師或營養師評估";
  if (age && age < 18) return "未滿18歲仍在生長發育，不建議以熱量赤字減重";
  if (height && weight) {
    const bmi = weight / Math.pow(height / 100, 2);
    if (bmi < 18.5) return "目前體重過輕，不建議減重，請優先確保足夠營養";
  }
  return null;
}

// 顯示熱量攝取建議
function showCalorieAdvice(tdee) {
  const calorieAdviceDiv = document.getElementById("calorieAdvice");
  const maintainElement = document.getElementById("maintainCalories");
  const loseElement = document.getElementById("loseCalories");
  const gainElement = document.getElementById("gainCalories");
  const loseRow = document.getElementById("loseCaloriesRow");
  const loseNote = document.getElementById("loseCaloriesNote");

  if (!calorieAdviceDiv || !maintainElement || !loseElement || !gainElement) {
    return;
  }

  maintainElement.textContent = tdee;
  gainElement.textContent = tdee + 300;

  const blockReason = getCalorieDeficitBlockReason();
  if (blockReason) {
    loseElement.textContent = "";
    loseRow?.classList.add("hidden");
    if (loseNote) {
      loseNote.textContent = `• ${blockReason}`;
      loseNote.classList.remove("hidden");
    }
  } else {
    loseElement.textContent = Math.max(1200, tdee - 500); // 最低不低於1200卡
    loseRow?.classList.remove("hidden");
    loseNote?.classList.add("hidden");
  }

  calorieAdviceDiv.classList.remove("hidden");
}

// 頁面路由管理
const PAGE_TITLES = {
  homePage: "運動處方推薦系統",
  formPage: "健康評估問卷｜運動處方推薦系統",
  resultPage: "您的個人化運動處方｜運動處方推薦系統",
};

function showPage(pageId) {
  // 隱藏所有頁面
  const pages = document.querySelectorAll(".page");
  pages.forEach((page) => {
    page.classList.remove("active");
  });

  // 顯示指定頁面
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // 滾動到頂部
  window.scrollTo(0, 0);

  // 更新分頁標題並把焦點移到新頁面的主標題（初次載入不搶焦點）
  document.title = PAGE_TITLES[pageId] || PAGE_TITLES.homePage;
  const heading = targetPage?.querySelector("h2");
  if (heading && document.readyState === "complete") {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  // 移除了清除儲存資料的功能

  // 如果是表單頁，初始化多步驟表單
  if (pageId === "formPage") {
    if (typeof initMultiStepForm === "function") initMultiStepForm();
  }
}

// 舊的 setupRealTimeValidation 已移除，統一使用 validateField() 系統

// 清除欄位錯誤
function clearFieldError(field) {
  field.classList.remove("field-invalid", "field-valid");
  const existingError = field.parentElement.querySelector(".field-error");
  if (existingError) {
    existingError.remove();
  }
}

// 移除了 LocalStorage 自動儲存功能以避免多人使用時的困擾

// 表單進度更新
function updateFormProgress() {
  const progressForm = DOMCache.get("healthForm");
  if (!progressForm) return;

  const requiredFields = [
    "age",
    "gender",
    "height",
    "weight",
    { name: "fitness_level", type: "radio" },
    { name: "health_status", type: "radio" },
    { name: "exercise_habit", type: "radio" },
    { name: "exercise_goal", type: "radio" },
    { name: "parq_q1", type: "radio" },
    { name: "parq_q2", type: "radio" },
    { name: "parq_q3", type: "radio" },
    { name: "parq_q4", type: "radio" },
    { name: "parq_q5", type: "radio" },
    { name: "parq_q6", type: "radio" },
    { name: "parq_q7", type: "radio" },
  ];

  let completed = 0;
  let total = requiredFields.length;

  requiredFields.forEach((field) => {
    if (typeof field === "string") {
      const element = DOMCache.get(field);
      if (element && element.value && element.validity.valid) {
        completed++;
      }
    } else if (field.type === "radio") {
      const checked = document.querySelector(
        `input[name="${field.name}"]:checked`,
      );
      if (checked) {
        completed++;
      }
    }
  });

  const percentage = Math.round((completed / total) * 100);
  const progressBar = DOMCache.get("progressBar");
  const progressText = DOMCache.get("progressText");

  if (progressBar) {
    progressBar.style.width = percentage + "%";
  }
  if (progressText) {
    progressText.textContent = percentage + "%";
  }
  DOMCache.get("progressTrack")?.setAttribute("aria-valuenow", String(percentage));

  // 當進度達到100%時，顯示完成提示
  if (progressBar) {
    progressBar.style.background = percentage === 100 ? "#15803d" : "";
  }
}

// ===== 表單自動暫存（sessionStorage）：避免重整 / 誤觸返回 / AI 逾時後重整時丟失整份填寫 =====
const FORM_DRAFT_KEY = "exerciseRxFormDraft";
let pendingFormActivity = null;

function setDraftStatus(message) {
  const status = document.getElementById("draftStatus");
  if (status && status.textContent !== message) status.textContent = message;
}

function saveFormDraft() {
  const form = document.getElementById("healthForm");
  if (!form) return;
  const data = {};
  form.querySelectorAll("input, select").forEach((el) => {
    const key = el.name || el.id;
    if (!key) return;
    if (el.type === "checkbox") {
      if (!data[key]) data[key] = [];
      if (el.checked) data[key].push(el.value);
    } else if (el.type === "radio") {
      if (el.checked) data[key] = el.value;
    } else {
      data[key] = el.value;
    }
  });
  try {
    sessionStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(data));
    setDraftStatus("填寫內容已暫存在此分頁。");
  } catch (e) {
    setDraftStatus("此瀏覽器無法暫存，重新整理會失去填寫內容。");
  }
}

function restoreFormDraft() {
  let raw;
  try {
    raw = sessionStorage.getItem(FORM_DRAFT_KEY);
  } catch (e) {
    return;
  }
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  const form = document.getElementById("healthForm");
  if (!form) return;
  form.querySelectorAll("input, select").forEach((el) => {
    const key = el.name || el.id;
    if (!key || !(key in data)) return;
    const val = data[key];
    if (el.type === "checkbox") {
      el.checked = Array.isArray(val) && val.includes(el.value);
    } else if (el.type === "radio") {
      el.checked = el.value === val;
    } else {
      el.value = val;
    }
  });
  setDraftStatus("已還原此分頁上次的填寫內容。");
  // 還原後重算 BMI/BMR/TDEE 與進度
  try {
    if (typeof calculateBMI === "function") calculateBMI();
    if (typeof updateFormProgress === "function") updateFormProgress();
  } catch (e) {
    /* 還原後重算失敗不影響填寫 */
  }
}

function clearFormDraft() {
  try {
    sessionStorage.removeItem(FORM_DRAFT_KEY);
  } catch (e) {
    /* 略過 */
  }
}

function debounce(fn, wait) {
  let timer = null;
  const run = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  run.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  return run;
}

// 只有確認對話框的清除按鈕呼叫；同時清掉衍生資料與尚未完成的 AI 回應。
function clearAssessment() {
  pendingFormActivity?.cancel();
  clearFormDraft();
  const form = document.getElementById("healthForm");
  form.reset();
  form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  for (const id of ["age", "height", "weight"]) {
    const field = document.getElementById(id);
    validateField(field, Number(field.min), Number(field.max));
  }
  const ageInfo = document.getElementById("ageInfo");
  ageInfo.textContent = "";
  ageInfo.classList.add("hidden");
  calculateBMI();
  for (const id of ["maintainCalories", "loseCalories", "gainCalories", "loseCaloriesNote"]) {
    document.getElementById(id).textContent = "";
  }
  window.lastFormData = null;
  window.lastPrescription = null;
  for (const id of ["prescriptionSummary", "fittpDetails", "exerciseGuidelines"]) {
    document.getElementById(id).replaceChildren();
  }
  resetAISection();
  document.getElementById("customApiKey").value = "";
  document.getElementById("aiProviderSelect").value = "auto";
  onProviderChange();
  document.getElementById("advancedAISettings").classList.add("hidden");
  document.getElementById("toggleAdvancedAI").setAttribute("aria-expanded", "false");
  document.getElementById("advancedAIIcon").style.transform = "rotate(0deg)";
  document.querySelectorAll("#resultPage details").forEach((panel) => { panel.open = false; });
  hideStepError();
  document.getElementById("clearAssessmentDialog").close();
  showPage("formPage");
  setDraftStatus("已清除填寫內容，可以重新開始。");
  document.getElementById("age").focus({ preventScroll: true });
}

// 年齡檢查功能
document.addEventListener("DOMContentLoaded", function () {
  // 僅綁定已知操作，不解析或執行 HTML 屬性中的程式碼。
  const actions = { nextStep, prevStep, downloadPDF, downloadAIPDF, fetchAIRecommendation, cancelAIRecommendation, toggleAdvancedAISettings };
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = actions[button.dataset.action];
    if (action) button.addEventListener("click", () => action());
  });
  for (const id of ["age", "height", "weight"]) {
    const field = document.getElementById(id);
    field.addEventListener("input", () => {
      validateField(field, Number(field.min), Number(field.max));
      calculateBMI();
    });
  }
  document.getElementById("gender").addEventListener("change", calculateBMR);
  document.getElementById("activityLevel").addEventListener("change", calculateTDEE);
  document.getElementById("aiProviderSelect").addEventListener("change", onProviderChange);

  // 還原上次未完成的填寫（同分頁 session 內有效）
  restoreFormDraft();

  document.querySelectorAll("[data-clear-assessment]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById("clearAssessmentDialog").showModal());
  });
  document.getElementById("confirmClearAssessment").addEventListener("click", clearAssessment);

  // 勾選「孕婦」會影響減重熱量建議是否顯示
  document
    .querySelector('input[name="diseases"][value="pregnant"]')
    ?.addEventListener("change", calculateTDEE);

  // 設置進度監聽 + 自動暫存
  const formElement = DOMCache.get("healthForm");
  if (formElement) {
    // input 與 change 常連續觸發；合併並 debounce，避免每個按鍵都掃全表單、寫 sessionStorage
    pendingFormActivity = debounce(() => {
      updateFormProgress();
      saveFormDraft();
    }, 150);
    formElement.addEventListener("input", pendingFormActivity);
    formElement.addEventListener("change", pendingFormActivity);
    formElement.addEventListener("change", (event) => {
      const field = event.target;
      if (!field.validity?.valid) return;
      if (field.type === "radio") {
        formElement.querySelectorAll(`input[name="${field.name}"]`).forEach((radio) => {
          radio.removeAttribute("aria-invalid");
        });
      } else {
        field.removeAttribute("aria-invalid");
      }
    });
  }

  const ageInput = document.getElementById("age");
  const ageInfo = document.getElementById("ageInfo");

  ageInput.addEventListener("input", function () {
    const age = parseInt(this.value);
    updateAgeInfo(age);
  });

  function updateAgeInfo(age) {
    if (!age || age < 6) {
      ageInfo.classList.add("hidden");
      return;
    }

    let message = "";
    let bgColor = "";

    if (age >= 6 && age <= 11) {
      message =
        "兒童族群：重點在趣味性體能活動，建議每日累積60分鐘以上身體活動";
      bgColor = "bg-blue-100 border-blue-300 text-blue-700";
    } else if (age >= 12 && age <= 17) {
      message = "青少年族群：多元運動發展，建議每日60分鐘中到劇烈強度身體活動";
      bgColor = "bg-green-100 border-green-300 text-green-700";
    } else if (age >= 18 && age <= 64) {
      message = "成人族群：健康維護與體能提升，建議每週150分鐘中等強度有氧運動";
      bgColor = "bg-purple-100 border-purple-300 text-purple-700";
    } else if (age >= 65) {
      message = "銀髮族群：著重安全與功能性運動，特別注意平衡與跌倒預防";
      bgColor = "bg-orange-100 border-orange-300 text-orange-700";
    }

    ageInfo.className = `mt-2 p-3 rounded-lg border ${bgColor}`;
    ageInfo.innerHTML = `<p>${message}</p>`;
    ageInfo.classList.remove("hidden");
  }

  updateAgeInfo(parseInt(ageInput.value));

  // 健康狀態互斥邏輯：選「健康狀況良好」時清除疾病勾選
  const healthRadios = document.querySelectorAll('input[name="health_status"]');
  const diseaseCheckboxes = document.querySelectorAll('input[name="diseases"]');

  healthRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      if (this.value === "healthy") {
        diseaseCheckboxes.forEach((cb) => {
          cb.checked = false;
        });
      }
    });
  });

  diseaseCheckboxes.forEach((cb) => {
    cb.addEventListener("change", function () {
      if (this.checked) {
        const hasConditions = document.querySelector(
          'input[name="health_status"][value="has_conditions"]',
        );
        if (hasConditions) {
          hasConditions.checked = true;
        }
      }
    });
  });

  // 表單提交處理
  const healthForm = document.getElementById("healthForm");
  if (healthForm) {
    healthForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Enter 在前兩步與「下一步」一致；最終送出會重新檢查所有步驟。
      if (currentStep < totalSteps) {
        nextStep();
        return;
      }

      if (validateForm()) {
        generatePrescription();
        pendingFormActivity?.cancel();
        clearFormDraft(); // 成功產生處方後清除暫存
        showPage("resultPage");
      }
      // validateForm() 已在失敗時自動顯示錯誤訊息
    });
  }
});

// 表單驗證（使用頁面內提示取代 alert）
function validateForm() {
  for (let step = 1; step <= totalSteps; step++) {
    if (!validateCurrentStep(step)) {
      showStep(step);
      showStepError();
      return false;
    }
  }
  hideStepError();
  return true;
}

// 收集表單資料
function collectFormData() {
  try {
    const ageElement = document.getElementById("age");
    const genderElement = document.getElementById("gender");
    const heightElement = document.getElementById("height");
    const weightElement = document.getElementById("weight");
    const fitnessElement = document.querySelector(
      'input[name="fitness_level"]:checked',
    );
    const healthStatusElement = document.querySelector(
      'input[name="health_status"]:checked',
    );

    // 收集 PAR-Q 答案
    const parqAnswers = {};
    const parqQuestions = [
      "parq_q1",
      "parq_q2",
      "parq_q3",
      "parq_q4",
      "parq_q5",
      "parq_q6",
      "parq_q7",
    ];
    for (let question of parqQuestions) {
      const answer = document.querySelector(
        `input[name="${question}"]:checked`,
      );
      if (answer) {
        parqAnswers[question] = answer.value;
      }
    }

    if (
      !ageElement ||
      !genderElement ||
      !heightElement ||
      !weightElement ||
      !fitnessElement ||
      !healthStatusElement
    ) {
      throw new Error("表單資料不完整");
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
    if (healthStatusElement.value === "has_conditions") {
      diseases = Array.from(
        document.querySelectorAll('input[name="diseases"]:checked'),
      ).map((cb) => cb.value);
    }

    // 收集運動習慣
    const exerciseHabitElement = document.querySelector(
      'input[name="exercise_habit"]:checked',
    );
    const exerciseHabit = exerciseHabitElement
      ? exerciseHabitElement.value
      : "none";

    // 收集運動目標
    const exerciseGoalElement = document.querySelector(
      'input[name="exercise_goal"]:checked',
    );
    const exerciseGoal = exerciseGoalElement
      ? exerciseGoalElement.value
      : "health";

    // 收集運動限制
    const limitations = Array.from(
      document.querySelectorAll('input[name="limitations"]:checked'),
    ).map((cb) => cb.value);

    // 活動係數：與螢幕端 calculateTDEE() 同源，讓 PDF 的 TDEE 與畫面一致
    const activityLevel =
      parseFloat(document.getElementById("activityLevel")?.value) || 1.375;

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
      activityLevel: activityLevel,
      parq_answers: parqAnswers,
    };

    return formData;
  } catch (error) {
    console.error("收集表單資料時發生錯誤:", error);
    throw error;
  }
}

// Shared with the server: one deterministic prescription engine.
const { assessPARQRisk,calculateFITTVP,getAgeGroup,getIntensityMET,applySafetyCaps,cleanupExerciseTypes,generateExerciseSpecificRecommendations,INTENSITY_RANK,HEART_RATE_ZONES } = ExerciseRules;

// 顯示運動處方摘要
function displayPrescriptionSummary(prescription) {
  const container = document.getElementById("prescriptionSummary");
  if (!container) {
    console.error("找不到 prescriptionSummary 元素");
    return;
  }

  const intensityText =
    {
      light: "輕度強度",
      "light-moderate": "輕度至中度強度",
      moderate: "中度強度",
      "moderate-vigorous": "中度至劇烈強度",
    }[prescription.intensity] || "中度強度";

  const exerciseTypes = prescription.type.join("、");

  // 根據年齡層調整顯示方式
  let frequencyText = "";
  let timeText = "";
  let volumeSection = "";

  if (
    prescription.ageGroup === "child" ||
    prescription.ageGroup === "adolescent"
  ) {
    frequencyText =
      prescription.frequency === 7 ? "每日" : `每週${prescription.frequency}次`;
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
  let bmiSection = "";
  if (data.age >= 18 && data.bmi) {
    const { label: bmiCategory, textClass: bmiColor } = getBMICategory(
      data.bmi,
    );

    bmiSection = `
            <div class="bmi-summary bg-gray-50 rounded-lg p-4 mb-4">
                <div class="text-center">
                    <span class="text-sm text-gray-600">BMI 指數：</span>
                    <span class="text-lg font-bold ${bmiColor}">${data.bmi}</span>
                    <span class="ml-2 px-2 py-1 rounded text-sm bg-gray-200 text-gray-700">${bmiCategory}</span>
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
  let parqSection = "";
  let parqColor = "green";
  if (parqRisk.level === "moderate") parqColor = "yellow";
  if (parqRisk.level === "high") parqColor = "red";

  parqSection = `
        <div class="risk-summary bg-${parqColor}-50 rounded-lg p-4 mb-4 border border-${parqColor}-200">
            <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
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
  const goalText =
    {
      health: "健康維護",
      weight_loss: "減重瘦身",
      muscle_building: "增肌塑形",
      endurance: "增強體能",
      rehabilitation: "復健治療",
      performance: "運動表現提升",
    }[data.exercise_goal] || "健康維護";

  // 運動習慣顯示
  const habitText =
    {
      none: "無運動習慣",
      light: "偶爾運動",
      moderate: "規律運動",
      active: "經常運動",
      student_athlete: "專業訓練",
    }[data.exercise_habit] || "無運動習慣";

  container.innerHTML = `
        <div class="summary-heading text-center mb-6">
            <h3 class="text-3xl font-bold text-blue-800 mb-2">你的運動起點</h3>
            <div class="text-xl text-gray-700">
                <strong>${exerciseTypes} ${timeText} × ${frequencyText}</strong>
            </div>
            <div class="text-lg text-gray-600 mt-2">強度：${intensityText}</div>
        </div>

        <!-- 個人資訊摘要 -->
        <div class="profile-summary bg-gray-50 rounded-lg p-4 mb-4">
            <div class="grid md:grid-cols-3 gap-4 text-sm">
                <div><span class="font-semibold">年齡：</span>${data.age}歲 | <span class="font-semibold">性別：</span>${data.gender === "male" ? "男" : data.gender === "female" ? "女" : "其他"}</div>
                <div><span class="font-semibold">運動目標：</span>${goalText}</div>
                <div><span class="font-semibold">運動習慣：</span>${habitText}</div>
            </div>
        </div>

        ${bmiSection}
        ${parqSection}

        <div class="summary-metrics grid md:grid-cols-3 gap-4 text-center mb-4">
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-2xl font-bold text-blue-600">${prescription.frequency === 7 ? "每日" : prescription.frequency}</div>
                <div class="text-sm text-gray-600">${prescription.frequency === 7 ? "身體活動" : "次/週"}</div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-2xl font-bold text-green-600">${prescription.time}</div>
                <div class="text-sm text-gray-600">分鐘${prescription.frequency === 7 ? "/日" : "/次"}</div>
            </div>
            ${volumeSection}
        </div>

        ${
          data.limitations && data.limitations.length > 0
            ? `
        <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h4 class="font-semibold text-orange-800 mb-2">考量您的限制因素</h4>
            <ul class="text-sm text-orange-700 list-disc list-inside">
                ${data.limitations
                  .map((limitation) => {
                    const limitText =
                      {
                        none: "無特別限制",
                        time: "時間限制",
                        motivation: "缺乏動機",
                        pain: "疼痛問題",
                        injury_history: "運動傷害史",
                        balance: "平衡感不佳",
                        palpitation: "心悸",
                        equipment: "缺乏運動設備",
                      }[limitation] || limitation;
                    return `<li>${limitText}</li>`;
                  })
                  .join("")}
            </ul>
        </div>
        `
            : ""
        }
    `;
}

// 顯示 FITT-VP 詳細說明
function displayFITTPDetails(prescription) {
  const container = document.getElementById("fittpDetails");
  if (!container) {
    console.error("找不到 fittpDetails 元素");
    return;
  }

  const intensityDescription =
    {
      light: "RPE 9-11（Borg 6-20 量表，輕鬆），能輕鬆說話和唱歌",
      "light-moderate": "RPE 11-12（Borg 6-20 量表），能說話，唱歌稍有困難",
      moderate: "RPE 12-13（Borg 6-20 量表，有點吃力），能說話但無法唱歌",
      "moderate-vigorous":
        "RPE 13-15（Borg 6-20 量表，吃力），只能說短句",
    }[prescription.intensity] || "RPE 12-13（Borg 6-20 量表），能說話但無法唱歌";

  let frequencyText = "";
  if (prescription.frequency === 7) {
    frequencyText = "每日身體活動";
  } else {
    frequencyText = `每週 ${prescription.frequency} 次運動`;
  }

  container.innerHTML = `
        <div class="space-y-4">
            <div class="border-l-4 border-blue-500 pl-4">
                <h4 class="font-semibold text-lg"><span class="fitt-code" aria-hidden="true">F</span><span>頻率 <small lang="en">Frequency</small></span></h4>
                <p class="text-gray-600">${frequencyText}</p>
            </div>
            
            <div class="border-l-4 border-green-500 pl-4">
                <h4 class="font-semibold text-lg"><span class="fitt-code" aria-hidden="true">I</span><span>強度 <small lang="en">Intensity</small></span></h4>
                <p class="text-gray-600">${intensityDescription}</p>
            </div>
            
            <div class="border-l-4 border-purple-500 pl-4">
                <h4 class="font-semibold text-lg"><span class="fitt-code" aria-hidden="true">T</span><span>時間 <small lang="en">Time</small></span></h4>
                <p class="text-gray-600">${prescription.frequency === 7 ? "每日" : "每次運動"} ${prescription.time} 分鐘</p>
            </div>
            
            <div class="border-l-4 border-orange-500 pl-4">
                <h4 class="font-semibold text-lg"><span class="fitt-code" aria-hidden="true">T</span><span>類型 <small lang="en">Type</small></span></h4>
                <p class="text-gray-600">${prescription.type.join("、")}</p>
            </div>
            
            <div class="border-l-4 border-red-500 pl-4">
                <h4 class="font-semibold text-lg"><span class="fitt-code" aria-hidden="true">V</span><span>總量 <small lang="en">Volume</small></span></h4>
                <p class="text-gray-600">${prescription.volume === 0 ? "重點在活動多樣性與趣味性" : `每週約 ${prescription.volume} MET-minutes`}</p>
                ${prescription.weeklyMinutes ? `<p class="text-gray-500 text-sm mt-1">每週總運動時間目標：${prescription.weeklyMinutes} 分鐘</p>` : ""}
            </div>

            <div class="border-l-4 border-gray-500 pl-4">
                <h4 class="font-semibold text-lg"><span class="fitt-code" aria-hidden="true">P</span><span>進展 <small lang="en">Progression</small></span></h4>
                <p class="text-gray-600">${prescription.progression}</p>
            </div>

            ${
              prescription.heartRateZone
                ? `
            <div class="border-l-4 border-pink-500 pl-4">
                <h4 class="font-semibold text-lg">心率區間建議</h4>
                <p class="text-gray-600">${prescription.heartRateZone}</p>
            </div>
            `
                : ""
            }

            ${
              prescription.resistanceTraining
                ? `
            <div class="border-l-4 border-indigo-500 pl-4">
                <h4 class="font-semibold text-lg">阻力訓練建議</h4>
                <p class="text-gray-600">${prescription.resistanceTraining}</p>
            </div>
            `
                : ""
            }
        </div>
    `;
}

// 顯示運動指南與注意事項
function displayExerciseGuidelines(prescription) {
  const container = document.getElementById("exerciseGuidelines");
  if (!container) {
    console.error("找不到 exerciseGuidelines 元素");
    return;
  }

  let warningsHtml = "";
  if (prescription.warnings.length > 0) {
    warningsHtml = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-red-800 mb-2">重要注意事項</h4>
                <ul class="list-disc list-inside space-y-1 text-red-700">
                    ${prescription.warnings.map((warning) => `<li>${warning}</li>`).join("")}
                </ul>
            </div>
        `;
  }

  // MET 活動範例與熱量計算
  const metActivitiesHtml = getMETActivitiesHtml(prescription);

  let recommendationsHtml = "";
  if (prescription.recommendations.length > 0) {
    recommendationsHtml = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-green-800 mb-2">建議事項</h4>
                <ul class="list-disc list-inside space-y-1 text-green-700">
                    ${prescription.recommendations.map((rec) => `<li>${rec}</li>`).join("")}
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
            <h4 class="font-semibold text-blue-800 mb-2">推薦運動範例</h4>
            <div class="text-blue-700 space-y-2">
                ${exerciseExamples}
            </div>
        </div>
        
        <div class="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 class="font-semibold text-gray-800 mb-2">運動前準備</h4>
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
    有氧運動: ["快走", "游泳", "騎腳踏車", "爬樓梯", "健走"],
    阻力訓練: [
      "彈力帶運動",
      "輕重量啞鈴",
      "徒手肌力訓練",
      "阻力機器",
      "硬舉",
      "腿推",
      "划船",
      "彈力繩",
    ],
    肌力訓練: ["伏地挺身", "深蹲", "橋式", "死蟲式", "棒式", "啞鈴訓練"],
    平衡訓練: ["單腳站立", "太極", "瑜珈", "平衡墊運動"],
    柔軟度訓練: ["伸展運動", "瑜珈", "太極", "關節活動度運動"],
    水中運動: ["水中走路", "水中有氧", "游泳", "水中太極"],
    太極: ["太極拳", "太極劍", "八段錦", "五禽戲"],
    自由遊戲: ["捉迷藏", "跳房子", "踢毽子", "跳繩", "騎腳踏車"],
    體能遊戲: ["老鷹捉小雞", "紅綠燈遊戲", "障礙賽跑", "接力賽"],
    基礎運動技能: ["拋接球", "踢球", "跳躍", "攀爬", "平衡走"],
    團體運動: ["籃球", "足球", "排球", "羽毛球", "桌球"],
    專項技能訓練: ["技術動作練習", "戰術訓練", "專項體能", "競技技巧"],
    競技表現提升: ["速度訓練", "爆發力訓練", "耐力提升", "技術精進"],
    專項訓練: ["專業指導訓練", "競技準備", "表現分析", "恢復訓練"],
    跌倒預防: ["平衡練習", "肌力強化", "反應訓練", "步態訓練"],
  };

  let allExamples = [];
  types.forEach((type) => {
    if (examples[type]) {
      allExamples = allExamples.concat(examples[type]);
    }
  });

  // 去重並限制數量
  const uniqueExamples = [...new Set(allExamples)].slice(0, 8);

  return uniqueExamples
    .map(
      (example) =>
        `<span class="inline-block bg-white px-3 py-1 rounded-full text-sm mr-2 mb-2">${example}</span>`,
    )
    .join("");
}

// PDF 下載功能
let pdfDownloadInProgress = false;

async function downloadPDF() {
  return savePDFReport(createPDFReport, "運動處方建議");
}

async function downloadAIPDF() {
  if (!lastAIResult) return;
  return savePDFReport(createAIPDFReport, "AI運動行動報告");
}

async function savePDFReport(buildReport, filePrefix) {
  if (pdfDownloadInProgress) return;
  pdfDownloadInProgress = true;
  const downloadButtons = ["downloadPrescription", "downloadAiReport"].map(id => document.getElementById(id)).filter(Boolean);
  downloadButtons.forEach(button => { button.disabled = true; });
  try {
    // 顯示載入 Modal
    showLoadingModal();

    // Snapshot the displayed result before asynchronous font/library loading.
    const report = buildReport();
    await loadPDFLibraries();
    const pdf = renderPDFReport(report);

    // 生成檔案名稱
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;

    // 下載 PDF
    pdf.save(`${filePrefix}_${dateStr}.pdf`);

  } catch (error) {
    console.error("PDF 生成錯誤:", error);
    alert("PDF 生成失敗，請稍後再試。可能是瀏覽器不支援或網路問題。");
  } finally {
    hideLoadingModal();
    pdfDownloadInProgress = false;
    downloadButtons.forEach(button => { button.disabled = false; });
  }
}

// Helper functions for PDF content
function getGoalText(goal) {
  const goalTexts = {
    health: "健康維護",
    weight_loss: "減重瘦身",
    muscle_building: "增肌塑形",
    endurance: "增強體能",
    rehabilitation: "復健治療",
    performance: "運動表現提升",
  };
  return goalTexts[goal] || "健康維護";
}

function getHabitText(habit) {
  const habitTexts = {
    none: "無運動習慣",
    light: "偶爾運動（每週1-2次）",
    moderate: "規律運動（每週3-4次）",
    active: "經常運動（每週5次以上）",
    student_athlete: "學生運動員或專業訓練",
  };
  return habitTexts[habit] || "無運動習慣";
}

function getPARQScore(data) {
  const parqRisk = assessPARQRisk(data.parq_answers || {});
  return `${parqRisk.yesCount}/7`;
}

function getPARQRecommendation(data) {
  const parqRisk = assessPARQRisk(data.parq_answers || {});
  return (
    parqRisk.recommendations[0] ||
    "依問卷結果，一般可從低至中等強度開始逐步增加活動；運動中如有不適請立即停止並就醫"
  );
}

function calculateBMRForPDF(data) {
  if (!data.age || !data.gender || !data.height || !data.weight) {
    return "待計算";
  }

  // 與畫面端 calculateBMR() 一致，統一採 Mifflin-St Jeor，避免螢幕與 PDF 數值不同
  let bmr;
  if (data.gender === "male") {
    bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;
  } else if (data.gender === "female") {
    bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;
  } else {
    // 與畫面端一致：Mifflin-St Jeor 只有男女係數，性別「其他」不估算
    return "不適用";
  }

  return Math.round(bmr);
}

function calculateTDEEForPDF(data) {
  const bmr = calculateBMRForPDF(data);
  if (typeof bmr !== "number") return bmr;

  // 活動係數：優先採用畫面端使用者選的 activityLevel（與螢幕 TDEE 一致），
  // 沒有時才退回依運動習慣推估
  let activityFactor = data.activityLevel;
  if (!activityFactor) {
    activityFactor = 1.375; // 預設為輕度活動
    switch (data.exercise_habit) {
      case "none":
        activityFactor = 1.2; // 久坐
        break;
      case "light":
        activityFactor = 1.375; // 輕度活動
        break;
      case "moderate":
        activityFactor = 1.55; // 中度活動
        break;
      case "active":
        activityFactor = 1.725; // 高度活動
        break;
      case "student_athlete":
        activityFactor = 1.9; // 非常高度活動
        break;
    }
  }

  return Math.round(bmr * activityFactor);
}

// Build report data without hidden HTML or viewport-dependent layout.
function createPDFReport() {
  const data = window.lastFormData || {};
  const prescription = window.lastPrescription || calculateFITTVP(data);
  const risk = assessPARQRisk(data.parq_answers || {});
  const riskLabel = { low: "低風險", moderate: "中等風險", high: "高風險" }[risk.level];
  const gender = { male: "男", female: "女", other: "其他" }[data.gender] || "未填寫";
  const energy = value => typeof value === "number" ? `${value} 大卡／天` : value;
  const examples = document.createElement("template");
  examples.innerHTML = getExerciseExamples(prescription.type);
  const rows = [
    ["F  頻率", prescription.frequency === 7 ? "每日身體活動" : `每週 ${prescription.frequency} 次運動`],
    ["I  強度", `${getIntensityText(prescription.intensity)}，Borg 6–20 量表`],
    ["T  時間", `${prescription.frequency === 7 ? "每日" : "每次運動"} ${prescription.time} 分鐘`],
    ["T  類型", prescription.type.join("、")],
    ["V  總量", prescription.volume === 0 ? "重點在活動多樣性與趣味性" : `每週約 ${prescription.volume} MET-minutes`],
    ["P  進展", prescription.progression],
  ];
  if (prescription.weeklyMinutes) rows[4][1] += `；每週總運動時間目標：${prescription.weeklyMinutes} 分鐘`;
  if (prescription.heartRateZone) rows.push(["心率區間", prescription.heartRateZone]);
  if (prescription.resistanceTraining) rows.push(["阻力訓練", prescription.resistanceTraining]);
  return {
    title: "個人運動處方", subtitle: "從了解自己開始，讓每一次活動都有方向。",
    date: new Date().toLocaleDateString("zh-TW"),
    notice: { level: risk.level, title: `PAR-Q+：${riskLabel}  /  ${risk.yesCount} 題回答「是」`, body: risk.recommendations[0] },
    sections: [
      { title: "01  個人概況", kind: "facts", items: [
        ["年齡／性別", `${data.age} 歲／${gender}`], ["身高／體重", `${data.height} cm／${data.weight} kg`],
        ["BMI", data.age >= 18 ? (data.weight / ((data.height / 100) ** 2)).toFixed(1) : "未滿 18 歲不作成人判讀"], ["運動目標", getGoalText(data.exercise_goal)],
        ["基礎代謝 BMR", energy(calculateBMRForPDF(data))], ["每日消耗 TDEE", energy(calculateTDEEForPDF(data))],
        ["運動習慣", getHabitText(data.exercise_habit)],
      ] },
      { title: "02  FITT-VP 運動計畫", kind: "rows", items: rows },
      { title: "03  重要注意事項", kind: "list", newPage: true, warning: true,
        items: prescription.warnings.length ? [...prescription.warnings] : ["運動中如感到不適，請立即停止；如有健康疑慮，請諮詢專業醫療人員。"] },
      { title: "04  執行建議", kind: "list", items: [...prescription.recommendations] },
      { title: "05  推薦運動範例", kind: "paragraph", items: [[...examples.content.querySelectorAll("span")].map(el => el.textContent).join("、")] },
      { title: "06  運動安全提醒", kind: "list", items: ["運動前請做適當暖身；循序漸進增加運動強度。", "保持充足水分補充；運動中如感到不適請立即停止。"] },
      ...aiPDFSections(),
    ],
    disclaimer: "本系統提供的運動處方僅供參考，不可取代專業醫療診斷與建議。開始運動計畫前，請諮詢專業醫療人員、運動醫學科醫師或合格的運動專業人士。",
  };
}

function getIntensityText(intensity) {
  const intensities = {
    light: "輕度強度 (RPE 9-11)",
    "light-moderate": "輕度至中度強度 (RPE 11-12)",
    moderate: "中度強度 (RPE 12-13)",
    "moderate-vigorous": "中度至劇烈強度 (RPE 13-15)",
  };
  return intensities[intensity] || intensity;
}


// 初始化
document.addEventListener("DOMContentLoaded", function () {
  // 確保首頁為預設顯示頁面
  showPage("homePage");

  // 隱藏表單錯誤訊息
  const errorDiv = document.getElementById("formError");
  if (errorDiv) {
    errorDiv.classList.add("hidden");
  }
});

window.lastPrescription = null;

// 產生處方：前端確定性計算並顯示；AI 建議改由使用者按鈕觸發（見 fetchAIRecommendation）
function generatePrescription() {
  try {
    const data = collectFormData();
    // 保存表單數據
    window.lastFormData = data;

    const prescription = calculateFITTVP(data);

    // 保存處方資料供 AI 使用
    window.lastPrescription = prescription;

    displayPrescriptionSummary(prescription);
    displayFITTPDetails(prescription);
    displayExerciseGuidelines(prescription);

    // AI 區塊回到「等待使用者同意並按下」狀態；不自動把健康資料送出
    resetAISection();
  } catch (error) {
    console.error("Error generating prescription:", error);
    alert("生成運動處方時發生錯誤，請檢查輸入資料");
  }
}
