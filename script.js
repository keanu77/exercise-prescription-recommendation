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
  const actions = { nextStep, prevStep, downloadPDF, fetchAIRecommendation, toggleAdvancedAISettings };
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

// 生成運動處方（根據 ACSM FITT-VP 原則）
// PAR-Q+ 風險評估函數
// 題目為 PAR-Q+ 2025（PAR-Q+ Collaboration, eparmedx.com；官方中文版 2026-01）第 1 頁的 7 題一般健康問題。
// 官方規則：
//   - 全「否」→ 可進行身體活動；慢慢開始、循序漸進；超過 45 歲且不習慣規律劇烈運動者，進行劇烈強度前先諮詢合格運動專業人員
//   - 任一「是」→ 須完成第 2、3 頁追蹤問題（或 ePARmed-X+）；追蹤問題有「是」則需合格運動專業人員／醫師評估，
//     取得許可前僅能進行低強度身體活動（ePARmed-X+ 醫師許可表 2026）
//   - 暫緩：急性感冒發燒；懷孕（先與醫療人員討論）；健康狀況改變
// 本站無法施作第 2、3 頁，故任何「是」都導向「完成追蹤問題並諮詢」；分級只決定處方保守程度，對應
// ACSM 2015 運動前健康篩檢演算法（Riebe et al., MSSE 2015；GETP 11th ed.）：
//   * high     ＝ 徵候症狀（q2 胸痛、q3 頭暈失去平衡／失去意識）或醫囑只能在醫療監督下活動（q7）
//                → 任何強度前都需醫師評估；評估前僅低強度
//   * moderate ＝ 已知疾病或用藥（q1 心臟病／高血壓、q4 其他慢性病、q5 服用慢性病處方藥）或骨關節問題（q6）
//                → 未規律運動者開始前先評估；已規律運動且無症狀者可維持中等強度，進到劇烈強度前先評估
//   * low      ＝ 全「否」
// 心臟病／高血壓（q1）或服藥（q5）者心率反應可能不可靠，改用 RPE 與說話測試（ACSM）。
// 三處（本檔、parq-script.js assessParqLevel、functions/_lib/ai.js assessParqLevel）必須一致。
const PARQ_SYMPTOM_QUESTIONS = ["parq_q2", "parq_q3", "parq_q7"];
const PARQ_CARDIAC_DISEASE_QUESTIONS = ["parq_q1"];
const PARQ_MEDICATION_QUESTIONS = ["parq_q5"];

function assessPARQRisk(parqAnswers) {
  const answers = parqAnswers || {};
  const yesQuestions = Object.keys(answers).filter((q) => answers[q] === "yes");
  const result = {
    level: "low",
    yesCount: yesQuestions.length,
    symptomFlag: PARQ_SYMPTOM_QUESTIONS.some((q) => answers[q] === "yes"),
    cardiacDiseaseFlag: PARQ_CARDIAC_DISEASE_QUESTIONS.some(
      (q) => answers[q] === "yes",
    ),
    medicationFlag: PARQ_MEDICATION_QUESTIONS.some((q) => answers[q] === "yes"),
    recommendations: [],
  };

  if (result.symptomFlag) {
    result.level = "high";
    result.recommendations.push(
      "問卷顯示胸痛、頭暈／昏厥等症狀，或醫師曾指示只能在醫療監督下活動：開始任何強度的運動前，請先接受醫師評估（ACSM 運動前篩檢建議）",
    );
    result.recommendations.push(
      "在取得醫師許可前，僅進行低強度身體活動；症狀再出現時請立即就醫",
    );
  } else if (result.yesCount > 0) {
    result.level = "moderate";
    result.recommendations.push(
      "問卷有一項以上回答「是」：依 PAR-Q+ 規定，請至 eparmedx.com 完成第 2、3 頁的追蹤問題（或 ePARmed-X+），並諮詢合格運動專業人員或醫師",
    );
    if (result.cardiacDiseaseFlag || result.medicationFlag) {
      result.recommendations.push(
        "已知心臟病／高血壓或正在服藥：尚未規律運動者請先取得醫師同意再開始；已規律運動且無症狀者可維持中等強度，提高到劇烈強度前請先評估",
      );
    } else {
      result.recommendations.push("從低強度活動開始，逐步增加");
    }
  } else {
    result.level = "low";
    result.recommendations.push(
      "問卷全部回答「否」：可以進行身體活動，請慢慢開始、循序漸進",
    );
    result.recommendations.push(
      "運動中如有胸痛、頭暈、異常喘等不適，請立即停止並就醫",
    );
  }

  // PAR-Q+ 的暫緩條件
  result.recommendations.push(
    "若目前有感冒、發燒等急性不適，請等康復後再開始；懷孕或健康狀況改變時，請先與醫師討論",
  );

  // 針對特定題目
  if (answers.parq_q1 === "yes" || answers.parq_q5 === "yes") {
    result.recommendations.push("請攜帶此評估結果與您的醫師討論");
  }
  if (answers.parq_q3 === "yes") {
    result.recommendations.push("運動時請避免快速改變姿勢，注意安全");
  }
  if (answers.parq_q6 === "yes") {
    result.recommendations.push("請選擇關節友善的運動類型，避免高衝擊活動");
  }

  return result;
}

// FITT-VP 計算邏輯（根據 WHO 2020 與 ACSM 2022 指引）
function calculateFITTVP(data) {
  const prescription = {
    frequency: 3,
    intensity: "moderate",
    time: 30,
    type: [],
    volume: 450,
    progression: "每2-4週增加10%運動時間或頻率",
    warnings: [],
    recommendations: [],
    ageGroup: getAgeGroup(data.age),
    // 新增：心率區間建議
    heartRateZone: null,
    // 新增：每週總運動時間目標
    weeklyMinutes: 150,
    // 新增：阻力訓練建議
    resistanceTraining: null,
  };

  // 安全上限：疾病 / 限制 / PAR-Q 只「設上限」，不直接改處方；
  // 所有規則跑完後由 applySafetyCaps 統一套用，後面的體能分支不可能再把它加回去。
  const caps = {
    intensity: null, // INTENSITY_RANK 的 key
    frequency: Infinity,
    time: Infinity,
    hrZoneUnsafe: false, // 心率不可靠（服藥、心臟病史、心悸）時改用 RPE
  };
  const capIntensity = (key) => {
    if (
      !caps.intensity ||
      INTENSITY_RANK[key] < INTENSITY_RANK[caps.intensity]
    ) {
      caps.intensity = key;
    }
  };
  const capFrequency = (n) => {
    caps.frequency = Math.min(caps.frequency, n);
  };
  const capTime = (n) => {
    caps.time = Math.min(caps.time, n);
  };

  // 根據年齡層調整基本參數
  if (data.age >= 6 && data.age <= 11) {
    // 兒童 (6-11歲) - WHO 2020: 每日至少60分鐘中高強度身體活動
    prescription.frequency = 7; // 每日活動
    prescription.time = 60; // 每日至少60分鐘
    prescription.intensity = "moderate-vigorous";
    prescription.type = ["自由遊戲", "體能遊戲", "基礎運動技能"];
    prescription.volume = 0; // 兒童不用MET計算
    prescription.weeklyMinutes = 420; // 7天 × 60分鐘
    prescription.progression = "逐漸增加活動的複雜性和技能挑戰";
    prescription.recommendations.push(
      "WHO建議：每日累積60分鐘以上中高強度身體活動",
    );
    prescription.recommendations.push("包含高強度有氧活動，每週至少3天");
    prescription.recommendations.push("包含肌肉與骨骼強化活動，每週至少3天");
    prescription.recommendations.push("減少久坐時間，每30分鐘起身活動");
    prescription.warnings.push("避免過度專項化訓練，強調多元發展");
  } else if (data.age >= 12 && data.age <= 17) {
    // 青少年 (12-17歲) - WHO 2020: 每日至少60分鐘中高強度身體活動
    prescription.frequency = 7; // 每日活動
    prescription.time = 60; // 每日至少60分鐘
    prescription.intensity = "moderate-vigorous";
    prescription.type = ["有氧運動", "肌力訓練", "團體運動"];
    prescription.volume = 0; // 青少年以每日60分鐘為準
    prescription.weeklyMinutes = 420;
    prescription.progression = "每2-3週增加運動強度或技能難度";
    prescription.recommendations.push(
      "WHO建議：每日累積60分鐘以上中高強度身體活動",
    );
    prescription.recommendations.push(
      "高強度有氧運動每週至少3天（如跑步、游泳、球類）",
    );
    prescription.recommendations.push("肌肉與骨骼強化活動每週至少3天");
    prescription.recommendations.push("限制螢幕休閒時間，增加身體活動機會");
    prescription.warnings.push("注意運動傷害預防，確保適當休息與恢復");
  } else if (data.age >= 18 && data.age <= 64) {
    // 成人 (18-64歲) - WHO 2020 與 ACSM 2022 整合建議
    prescription.frequency = 5;
    prescription.time = 30;
    prescription.intensity = "moderate";
    prescription.type.push("有氧運動", "肌力訓練");
    prescription.volume = 500; // WHO建議：500-1000 MET-min/週
    prescription.weeklyMinutes = 150;
    prescription.heartRateZone = "最大心率 64-76%（中等強度）";
    prescription.resistanceTraining = "每週2-3天，涵蓋主要肌群，每組8-12次";
    prescription.progression =
      "每2週增加5-10%運動量，目標達到每週150-300分鐘中強度或75-150分鐘高強度";
    prescription.recommendations.push(
      "WHO建議：每週150-300分鐘中等強度有氧運動",
    );
    prescription.recommendations.push("或每週75-150分鐘高強度有氧運動");
    prescription.recommendations.push("肌力訓練每週至少2天，涵蓋所有主要肌群");
    prescription.recommendations.push("減少久坐時間，以任何強度的身體活動取代");
  } else if (data.age >= 65) {
    // 銀髮族 (65歲以上) - WHO 2020: 與成人相同 + 多元運動 + 平衡訓練
    prescription.frequency = 5;
    prescription.time = 30;
    prescription.intensity = "moderate";
    prescription.type.push("有氧運動", "肌力訓練", "平衡訓練", "柔軟度訓練");
    prescription.volume = 500;
    prescription.weeklyMinutes = 150;
    prescription.heartRateZone = "最大心率 57-67%（中等強度，較保守）";
    prescription.resistanceTraining = "每週2-3天，中低負荷，每組10-15次";
    prescription.progression = "每2-4週增加5%運動量，重視功能性與平衡能力";
    prescription.recommendations.push(
      "WHO建議：每週150-300分鐘中等強度有氧運動",
    );
    prescription.recommendations.push(
      "每週至少3天進行多元運動（平衡、柔軟度、功能性訓練）",
    );
    prescription.recommendations.push("肌力訓練每週至少2天，預防肌少症");
    prescription.recommendations.push("平衡訓練每週至少3天，降低跌倒風險");
    prescription.warnings.push("運動前充分暖身，注意環境安全");
    prescription.warnings.push("如有頭暈、胸悶等不適，應立即停止並就醫");
  }

  // 根據體能水平微調WHO基準（僅對成人和銀髮族）
  if (data.age >= 18) {
    switch (data.fitness_level) {
      case "poor":
        // 體能差：降低至WHO最低建議
        prescription.frequency = 3; // 減少頻率但保持每週總時間約90分鐘
        prescription.time = 30;
        prescription.intensity = "light";
        prescription.volume = 270; // 3.0 METs × 30分鐘 × 3次
        prescription.progression =
          "每週增加10%運動量，逐步達到ACSM建議（每週150-300分鐘中強度或75-150分鐘高強度有氧）";
        break;
      case "fair":
        // 一般：WHO基準的80%
        prescription.frequency = 4; // 略低於WHO建議
        prescription.time = 30;
        prescription.intensity = "light-moderate";
        prescription.volume = 420; // 3.5 METs × 30分鐘 × 4次
        prescription.progression =
          "每週增加10%運動量，逐步達到ACSM建議（每週150-300分鐘中強度或75-150分鐘高強度有氧）";
        break;
      case "good":
        // 良好：維持WHO建議
        // 保持原設定：每週5次，每次30分鐘
        break;
      case "excellent":
        // 優秀：超過WHO建議，達到額外健康益處
        prescription.frequency = 6; // 超過WHO建議
        prescription.time = 40; // 總計240分鐘/週，改為整數
        prescription.volume = 840; // 3.5 METs × 40分鐘 × 6次
        prescription.progression = "可維持高頻率或增加運動強度";
        break;
    }

    // 根據BMI調整建議
    if (data.bmi) {
      if (data.bmi < 18.5) {
        prescription.recommendations.push(
          "體重過輕：建議增加肌力訓練，配合適當營養補充",
        );
        prescription.type.push("肌力訓練重點");
      } else if (data.bmi >= 24 && data.bmi < 27) {
        prescription.recommendations.push(
          "體重過重：建議增加有氧運動頻率，控制飲食",
        );
        prescription.frequency = Math.min(prescription.frequency + 1, 6);
      } else if (data.bmi >= 27) {
        prescription.recommendations.push(
          "BMI偏高：建議以低衝擊有氧運動為主，配合飲食管理",
        );
        prescription.type = ["低衝擊有氧", "水中運動", "肌力訓練"];
        prescription.warnings.push(
          "建議諮詢運動醫學科醫師或營養師制定完整的體重管理計畫",
        );
      }
    }
  } else {
    // 兒童青少年根據體能水平微調時間，但不改變每日活動的原則
    switch (data.fitness_level) {
      case "poor":
        prescription.time = Math.max(30, prescription.time); // 至少30分鐘
        prescription.recommendations.push(
          "可分段進行，如每次10-15分鐘，分2-3次完成",
        );
        break;
      case "fair":
        prescription.time = Math.max(45, prescription.time);
        break;
      case "good":
        prescription.time = Math.max(60, prescription.time);
        break;
      case "excellent":
        prescription.time = 80; // 改為整數
        prescription.recommendations.push("可增加運動技能挑戰和競技元素");
        break;
    }
  }

  // ===== 根據「目前運動習慣」調整起始處方（避免運動量驟增）=====
  if (data.age >= 18) {
    // 先記錄年齡 + 體能水平計算出的「目標處方」
    const targetFreq = prescription.frequency;
    const targetTime = prescription.time;
    const targetIntensity = prescription.intensity;

    switch (data.exercise_habit) {
      case "none":
        // 無運動習慣：從非常保守的起點開始
        prescription.frequency = Math.min(targetFreq, 3);
        prescription.time = Math.min(targetTime, 20);
        if (
          targetIntensity === "moderate" ||
          targetIntensity === "moderate-vigorous"
        ) {
          prescription.intensity = "light";
        }
        prescription.progression = `前4週：每週${prescription.frequency}次、每次${prescription.time}分鐘輕度運動 → 之後每2週增加10%，目標達到每週${targetFreq}次、每次${targetTime}分鐘`;
        prescription.recommendations.push(
          "目前無運動習慣，建議從散步、伸展等輕度活動開始",
        );
        prescription.recommendations.push("前2-4週以適應為主，不追求運動量");
        break;
      case "light":
        // 偶爾運動（1-2次/週）：略為保守
        prescription.frequency = Math.min(targetFreq, 3);
        prescription.time = Math.min(targetTime, 25);
        if (targetIntensity === "moderate-vigorous") {
          prescription.intensity = "light-moderate";
        }
        prescription.progression = `目前每週1-2次 → 先穩定至每週${prescription.frequency}次，再每2週增加10%，目標每週${targetFreq}次、每次${targetTime}分鐘`;
        prescription.recommendations.push(
          "目前運動量偏低，先穩定頻率再逐步增加時間和強度",
        );
        break;
      case "moderate":
        // 規律運動（3-4次/週）：接近目標，微調即可
        // 保持體能水平計算的處方，不額外降低
        break;
      case "active":
        // 經常運動：可以接受較高起點
        prescription.frequency = Math.max(targetFreq, 5);
        prescription.time = Math.max(targetTime, 30);
        break;
      case "student_athlete":
        // 專業訓練：可以接受高強度
        prescription.frequency = Math.max(targetFreq, 5);
        prescription.time = Math.max(targetTime, 40);
        if (
          targetIntensity === "light" ||
          targetIntensity === "light-moderate"
        ) {
          prescription.intensity = "moderate";
        }
        break;
    }
  }

  // ===== 根據「運動目標」微調處方重點 =====
  if (data.age >= 18) {
    switch (data.exercise_goal) {
      case "weight_loss":
        // 減重：優先增加有氧頻率與時間，中等強度
        prescription.frequency = Math.max(prescription.frequency, 4);
        if (!prescription.type.includes("有氧運動")) {
          prescription.type.unshift("有氧運動");
        }
        prescription.recommendations.push(
          "減重目標：建議每週累積200-300分鐘中等強度有氧運動",
        );
        prescription.recommendations.push(
          "搭配飲食控制效果更佳，建議每日減少300-500大卡",
        );
        break;
      case "muscle_building":
        // 增肌：強調阻力訓練
        if (!prescription.type.includes("肌力訓練")) {
          prescription.type.push("肌力訓練");
        }
        prescription.resistanceTraining =
          prescription.resistanceTraining ||
          "每週2-3天，涵蓋主要肌群，每組8-12次";
        prescription.recommendations.push(
          "增肌目標：阻力訓練為核心，搭配足夠蛋白質攝取（每公斤體重1.2-1.6g）",
        );
        break;
      case "endurance":
        // 增強體能：漸進式增加強度
        prescription.recommendations.push(
          "體能提升目標：可逐步加入間歇訓練（如快跑30秒＋慢走60秒）",
        );
        prescription.recommendations.push(
          "以RPE（自覺用力程度）6-7分為訓練基準",
        );
        break;
      case "rehabilitation":
        // 復健：保守、安全優先
        capIntensity("light");
        capFrequency(4);
        capTime(25);
        prescription.warnings.push("復健階段：請在醫療人員指導下循序漸進");
        prescription.recommendations.push(
          "復健目標：以恢復基本功能和活動度為優先",
        );
        break;
      case "performance":
        // 運動表現：較高量，需有基礎
        if (data.exercise_habit === "none" || data.exercise_habit === "light") {
          prescription.recommendations.push(
            "提醒：目前運動基礎較弱，建議先建立規律運動習慣（4-8週），再進入專項訓練",
          );
        } else {
          prescription.recommendations.push(
            "表現提升目標：可納入週期化訓練（基礎期→強化期→比賽期→恢復期）",
          );
        }
        break;
      case "health":
      default:
        // 健康維護：標準WHO建議
        break;
    }
  }

  // 重新計算 weeklyMinutes 和 volume（反映習慣/目標調整後的值）
  if (data.age >= 18) {
    prescription.weeklyMinutes = prescription.frequency * prescription.time;
    if (prescription.volume > 0) {
      const metValue = getIntensityMET(prescription.intensity);
      prescription.volume = Math.round(
        metValue * prescription.time * prescription.frequency,
      );
    }
  }

  // 根據疾病史調整運動類型和注意事項
  if (data.diseases.includes("hypertension")) {
    prescription.type.push("有氧運動");
    prescription.warnings.push("避免閉氣用力動作，運動中保持呼吸順暢");
    prescription.recommendations.push("建議每次運動前後測量血壓");
  }

  if (data.diseases.includes("diabetes")) {
    prescription.type.push("有氧運動", "阻力訓練");
    prescription.warnings.push("運動前後檢查血糖，攜帶糖果備用");
    prescription.recommendations.push("建議餐後1-2小時運動");
  }

  if (data.diseases.includes("arthritis")) {
    prescription.type.push("水中運動", "柔軟度訓練");
    prescription.warnings.push("避免高衝擊運動，關節疼痛時應停止");
    capTime(30);
  }

  if (data.diseases.includes("heart_recovery")) {
    capIntensity("light-moderate");
    caps.hrZoneUnsafe = true;
    prescription.warnings.push("出現胸痛、心悸或異常喘立即停止");
    prescription.recommendations.push("建議在運動醫學科醫師監督下開始運動計畫");
  }

  if (data.diseases.includes("asthma")) {
    prescription.warnings.push(
      "運動前備妥醫師處方的急救型吸入劑，出現喘鳴、胸悶或咳嗽不止時立即停止",
    );
    prescription.warnings.push("避免在寒冷乾燥或空氣品質不佳的環境運動");
    prescription.recommendations.push(
      "延長暖身至10-15分鐘，有助於降低運動誘發型氣喘",
    );
    prescription.recommendations.push("游泳等溫暖潮濕環境的運動通常較易耐受");
  }

  if (data.diseases.includes("sarcopenia")) {
    prescription.type.push("阻力訓練"); // 移除「蛋白質營養」，這不是運動類型
    prescription.recommendations.push("重點加強肌力訓練，每週至少3次阻力運動");
    prescription.recommendations.push("建議搭配營養師指導，確保足夠蛋白質攝取");
    prescription.warnings.push("漸進式增加負重，避免過度訓練造成傷害");
    // 肌少症患者需要更頻繁的肌力訓練，確保至少4次但不降低已有頻率
    if (data.age >= 18) {
      prescription.frequency = Math.max(prescription.frequency, 4);
    }
  }

  if (data.diseases.includes("pregnant")) {
    capIntensity("light");
    capFrequency(4);
    capTime(30);
    prescription.type = ["有氧運動", "柔軟度訓練", "骨盆底肌訓練"];
    prescription.warnings.push("避免仰躺運動、高衝擊運動和有跌倒風險的活動");
    prescription.warnings.push("懷孕期間運動強度不宜過高，以能說話為準");
    prescription.warnings.push(
      "出現任何不適症狀應立即停止並諮詢運動醫學科醫師",
    );
    prescription.recommendations.push(
      "建議選擇游泳、散步、孕婦瑜珈等低衝擊運動",
    );
    prescription.recommendations.push(
      "運動前請先諮詢運動醫學科醫師，確認身體狀況適合運動",
    );
    prescription.recommendations.push("避免過熱環境運動，補充充足水分");
  }

  if (data.diseases.includes("hyperlipidemia")) {
    prescription.type.push("有氧運動", "阻力訓練");
    prescription.warnings.push(
      "高血脂患者運動前建議諮詢運動醫學科醫師，了解適合的運動強度",
    );
    prescription.warnings.push("運動中注意身體反應，避免過度勞累");
    prescription.recommendations.push("建議以有氧運動為主，有助於改善血脂代謝");
    prescription.recommendations.push("配合適當阻力訓練，增強肌肉量提升代謝");
    prescription.recommendations.push("定期監測血脂指標，評估運動效果");
    prescription.recommendations.push("搭配健康飲食，控制飽和脂肪攝取");
  }

  // 根據運動限制調整
  if (data.limitations.includes("pain")) {
    capIntensity("light");
    prescription.warnings.push("疼痛時立即停止運動");
  }

  if (data.limitations.includes("balance")) {
    prescription.type.push("平衡訓練", "太極");
    prescription.warnings.push("運動時應有支撐物在旁");
    prescription.warnings.push("避免需要快速方向改變的運動，建議有人陪伴");
  }

  if (data.limitations.includes("palpitation")) {
    capIntensity("light-moderate");
    caps.hrZoneUnsafe = true;
    prescription.warnings.push(
      "心悸或心跳不規則時立即停止並休息，反覆發生請就醫",
    );
  }

  // 確保基本運動類型（僅對成人和銀髮族）
  if (data.age >= 18) {
    if (prescription.type.length === 0) {
      prescription.type.push("有氧運動");
    }

    // 添加基本運動類型
    if (!prescription.type.includes("有氧運動")) {
      prescription.type.unshift("有氧運動");
    }
  }

  // 根據 PAR-Q 評估調整運動處方
  const parqRisk = assessPARQRisk(data.parq_answers);

  // ACSM 定義的「規律運動」：近 3 個月每週 ≥3 天、每次 ≥30 分鐘中等強度；本站以運動習慣選項近似
  const regularlyActive = ["moderate", "active", "student_athlete"].includes(
    data.exercise_habit,
  );
  const accustomedToVigorous = ["active", "student_athlete"].includes(
    data.exercise_habit,
  );

  if (parqRisk.cardiacDiseaseFlag || parqRisk.medicationFlag) {
    // 心臟病／高血壓或服用處方藥（可能含 β 阻斷劑）：心率反應不可靠，改用 RPE 與說話測試（ACSM）
    caps.hrZoneUnsafe = true;
  }

  switch (parqRisk.level) {
    case "high":
      // 有徵候症狀或醫囑須醫療監督：任何強度前都需醫師評估；評估前僅低強度（ePARmed-X+）
      prescription.warnings.unshift(
        "⚠️ PAR-Q+ 顯示需先接受醫師評估再開始運動；取得許可前僅進行低強度活動",
      );
      prescription.recommendations.unshift("請在開始運動前諮詢運動醫學科醫師");
      prescription.warnings.push(
        "建議在運動醫學科醫師或合格運動專業人員監督下開始運動",
      );
      caps.hrZoneUnsafe = true;
      capIntensity("light");
      if (data.age >= 18) {
        capFrequency(Math.max(2, Math.floor(prescription.frequency * 0.5)));
        capTime(15); // 非常保守的起始時間
        prescription.progression = "在醫師同意下，每週增加5%運動量";
      } else {
        prescription.progression = "請先由醫師評估，再依醫師建議恢復每日活動";
      }
      break;

    case "moderate":
      // PAR-Q+：任一「是」→ 完成追蹤問題並諮詢
      prescription.warnings.push(
        "根據 PAR-Q+，請先完成追蹤問題並諮詢合格運動專業人員或醫師",
      );
      prescription.recommendations.push("如有不適請立即停止並諮詢專業人員");
      if (
        (parqRisk.cardiacDiseaseFlag || parqRisk.medicationFlag) &&
        regularlyActive
      ) {
        // ACSM：已知疾病但已規律運動且無症狀 → 可維持中等強度，進到劇烈強度前需評估
        capIntensity("moderate");
      } else {
        // 未規律運動（ACSM：開始前先評估）或其他「是」（骨關節、其他慢性病）：保守起點
        capIntensity("light-moderate");
        if (data.age >= 18) {
          capFrequency(Math.max(3, Math.floor(prescription.frequency * 0.7)));
          capTime(20); // 保守的起始時間
          prescription.progression = "每週增加5-10%運動量，密切監控身體反應";
        }
      }
      break;

    case "low":
      // 低風險：可以按標準處方進行
      prescription.recommendations.push("PAR-Q+ 未發現運動風險因子");

      // PAR-Q+ 2025：超過 45 歲且不習慣規律劇烈運動者，進到劇烈強度前先諮詢合格運動專業人員
      if (data.age > 45 && !accustomedToVigorous) {
        capIntensity("moderate");
        prescription.recommendations.push(
          "45 歲以上且不習慣劇烈運動：維持輕至中等強度即可，若要提高到劇烈強度，請先諮詢合格運動專業人員（PAR-Q+）",
        );
      }

      // 體能微調只適用於成人且已有規律運動習慣者；
      // 兒童青少年維持每日活動原則，無/偶爾運動者維持前面的適應期起點
      if (data.age >= 18 && !["none", "light"].includes(data.exercise_habit)) {
        if (data.fitness_level === "excellent") {
          prescription.frequency = Math.min(prescription.frequency + 1, 6);
          prescription.time = Math.min(prescription.time + 10, 45);
          prescription.progression = "可按標準進度增加運動量";
        } else if (data.fitness_level === "poor") {
          prescription.frequency = Math.max(
            3,
            Math.floor(prescription.frequency * 0.8),
          );
          prescription.time = 20;
          prescription.progression = "每週增加10%運動量，逐步達到建議標準";
        }
      }
      break;
  }

  // 添加 PAR-Q 相關建議
  if (parqRisk.recommendations.length > 0) {
    prescription.recommendations.push(...parqRisk.recommendations);
  }

  applySafetyCaps(prescription, caps, data);

  // 清理重複的運動類型並整理優先順序
  prescription.type = cleanupExerciseTypes(prescription.type);

  // 統一生成針對不同運動類型的建議事項
  generateExerciseSpecificRecommendations(prescription, data);

  return prescription;
}

// 強度排序（由低到高），供 safety caps 比較
const INTENSITY_RANK = {
  light: 1,
  "light-moderate": 2,
  moderate: 3,
  "moderate-vigorous": 4,
};

// 依最終強度給心率區間。來源：ACSM GETP 11th ed.（沿用 Garber et al. 2011 position stand）
// %HRmax：輕度 57-63、中等 64-76、劇烈 77-95；兩段式強度取跨區間。
// 最大心率以 220-年齡 估算誤差大；服藥或心臟病者不用心率（見 applySafetyCaps）。
const HEART_RATE_ZONES = {
  light: "最大心率 57-63%（輕度）",
  "light-moderate": "最大心率 57-69%（輕度至中度下緣）",
  moderate: "最大心率 64-76%（中等強度）",
  "moderate-vigorous": "最大心率 64-95%（中等至劇烈；劇烈為 77-95%）",
};

/**
 * 套用安全上限並重算衍生欄位。所有規則跑完後呼叫一次，
 * 之後不得再修改 frequency / time / intensity。
 */
function applySafetyCaps(prescription, caps, data) {
  if (
    caps.intensity &&
    INTENSITY_RANK[prescription.intensity] > INTENSITY_RANK[caps.intensity]
  ) {
    prescription.intensity = caps.intensity;
  }
  prescription.frequency = Math.min(prescription.frequency, caps.frequency);
  prescription.time = Math.min(prescription.time, caps.time);

  // 運動時間取 5 分鐘倍數，最少 10 分鐘
  prescription.time = Math.max(10, Math.round(prescription.time / 5) * 5);

  // 週總分鐘與 MET-minutes 一律以最終處方重算
  prescription.weeklyMinutes = prescription.frequency * prescription.time;
  if (prescription.volume > 0) {
    prescription.volume = Math.round(
      getIntensityMET(prescription.intensity) *
        prescription.time *
        prescription.frequency,
    );
  }

  // 心率區間：只給成人，且心率可靠時才給；否則改用 RPE / 說話測試
  if (data.age >= 18) {
    if (caps.hrZoneUnsafe) {
      prescription.heartRateZone = null;
      prescription.recommendations.push(
        "因服用處方藥或有心血管狀況，心率反應可能不準確，請改以自覺用力程度（RPE）與說話測試控制強度（ACSM 建議）",
      );
    } else {
      prescription.heartRateZone = HEART_RATE_ZONES[prescription.intensity];
    }
  } else {
    prescription.heartRateZone = null;
  }
}

// 清理和整理運動類型
function cleanupExerciseTypes(types) {
  // 定義運動類型的合併規則
  const typeMapping = {
    有氧運動: ["有氧運動", "低衝擊有氧"],
    肌力訓練: ["肌力訓練", "阻力訓練", "肌力訓練重點"],
    水中運動: ["水中運動"],
    平衡訓練: ["平衡訓練", "太極"],
    柔軟度訓練: ["柔軟度訓練", "伸展運動"],
    自由遊戲: ["自由遊戲"],
    體能遊戲: ["體能遊戲"],
    基礎運動技能: ["基礎運動技能"],
    團體運動: ["團體運動"],
    專項訓練: ["專項技能訓練", "競技表現提升", "專項訓練"],
  };

  // 優先順序（重要性排序）
  const priority = [
    "有氧運動",
    "肌力訓練",
    "平衡訓練",
    "柔軟度訓練",
    "水中運動",
    "自由遊戲",
    "體能遊戲",
    "基礎運動技能",
    "團體運動",
    "專項訓練",
  ];

  const result = [];
  const processed = new Set();

  // 按優先順序處理
  for (const mainType of priority) {
    const subtypes = typeMapping[mainType];
    if (subtypes && types.some((type) => subtypes.includes(type))) {
      if (!processed.has(mainType)) {
        result.push(mainType);
        processed.add(mainType);
        // 標記所有相關子類型為已處理
        subtypes.forEach((subtype) => processed.add(subtype));
      }
    }
  }

  // 處理其他未映射的類型
  for (const type of types) {
    if (!processed.has(type) && type && type !== "蛋白質營養") {
      result.push(type);
    }
  }

  return result;
}

// 生成針對不同運動類型的具體建議事項
function generateExerciseSpecificRecommendations(prescription, data) {
  // 清除重複的建議，重新生成
  prescription.recommendations = prescription.recommendations.filter(
    (rec) =>
      !rec.includes("每週至少") ||
      rec.includes("劇烈強度") ||
      rec.includes("骨骼強化") ||
      rec.includes("肌肉強化"),
  );

  const exerciseTypes = prescription.type;

  // 有氧運動建議
  if (
    exerciseTypes.includes("有氧運動") ||
    exerciseTypes.includes("低衝擊有氧")
  ) {
    if (data.age >= 18 && data.age <= 64) {
      prescription.recommendations.push(
        "有氧運動：建議快走、游泳、騎車等，每次持續20-60分鐘",
      );
    } else if (data.age >= 65) {
      prescription.recommendations.push(
        "有氧運動：選擇低衝擊活動如快走、水中運動，每次20-40分鐘",
      );
    }
  }

  // 阻力/肌力訓練建議
  if (
    exerciseTypes.includes("肌力訓練") ||
    exerciseTypes.includes("阻力訓練") ||
    exerciseTypes.includes("肌力訓練重點")
  ) {
    if (data.age >= 18 && data.age <= 64) {
      prescription.recommendations.push(
        "肌力訓練：每週2-3次，針對主要肌群，每組8-12次重複",
      );
    } else if (data.age >= 65) {
      prescription.recommendations.push(
        "肌力訓練：每週2次，使用輕重量或彈力帶，每組10-15次重複",
      );
    }
  }

  // 平衡訓練建議
  if (exerciseTypes.includes("平衡訓練") || exerciseTypes.includes("太極")) {
    if (data.age >= 65) {
      prescription.recommendations.push(
        "平衡訓練：每週3次，包含單腳站立、太極等，每次15-20分鐘",
      );
    } else if (data.age >= 18) {
      prescription.recommendations.push(
        "平衡訓練：每週2-3次，提升身體穩定性，預防跌倒風險",
      );
    }
  }

  // 柔軟度訓練建議 - 對所有成人都推薦
  if (data.age >= 18) {
    if (
      exerciseTypes.includes("柔軟度訓練") ||
      exerciseTypes.includes("伸展運動")
    ) {
      prescription.recommendations.push(
        "柔軟度訓練：每週至少2-3次，每個伸展動作維持15-30秒",
      );
    } else {
      // 即使沒有明確包含柔軟度訓練，也給予基本建議
      prescription.recommendations.push(
        "伸展運動：每次運動前後進行5-10分鐘，改善關節活動度",
      );
    }
  }

  // 水中運動建議
  if (exerciseTypes.includes("水中運動")) {
    prescription.recommendations.push(
      "水中運動：適合關節問題者，水溫28-30°C，每次30-45分鐘",
    );
  }
}

// 根據強度描述取得對應 MET 值（用於 volume 計算）
function getIntensityMET(intensity) {
  const metMap = {
    light: 2.5,
    "light-moderate": 3.0,
    moderate: 3.5,
    "moderate-vigorous": 6.0,
  };
  return metMap[intensity] || 3.5;
}

// 年齡分組函數
function getAgeGroup(age) {
  if (age >= 6 && age <= 11) return "child";
  if (age >= 12 && age <= 17) return "adolescent";
  if (age >= 18 && age <= 64) return "adult";
  if (age >= 65) return "senior";
  return "unknown";
}

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
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
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
        <div class="bg-${parqColor}-50 rounded-lg p-4 mb-4 border border-${parqColor}-200">
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
                <h4 class="font-semibold text-lg">Frequency (頻率)</h4>
                <p class="text-gray-600">${frequencyText}</p>
            </div>
            
            <div class="border-l-4 border-green-500 pl-4">
                <h4 class="font-semibold text-lg">Intensity (強度)</h4>
                <p class="text-gray-600">${intensityDescription}</p>
            </div>
            
            <div class="border-l-4 border-purple-500 pl-4">
                <h4 class="font-semibold text-lg">Time (時間)</h4>
                <p class="text-gray-600">${prescription.frequency === 7 ? "每日" : "每次運動"} ${prescription.time} 分鐘</p>
            </div>
            
            <div class="border-l-4 border-orange-500 pl-4">
                <h4 class="font-semibold text-lg">Type (類型)</h4>
                <p class="text-gray-600">${prescription.type.join("、")}</p>
            </div>
            
            <div class="border-l-4 border-red-500 pl-4">
                <h4 class="font-semibold text-lg">Volume (總量)</h4>
                <p class="text-gray-600">${prescription.volume === 0 ? "重點在活動多樣性與趣味性" : `每週約 ${prescription.volume} MET-minutes`}</p>
                ${prescription.weeklyMinutes ? `<p class="text-gray-500 text-sm mt-1">每週總運動時間目標：${prescription.weeklyMinutes} 分鐘</p>` : ""}
            </div>

            <div class="border-l-4 border-gray-500 pl-4">
                <h4 class="font-semibold text-lg">Progression (進展)</h4>
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
  if (pdfDownloadInProgress) return;
  pdfDownloadInProgress = true;
  const downloadButton = document.getElementById("downloadPrescription");
  if (downloadButton) downloadButton.disabled = true;
  try {
    // 顯示載入 Modal
    showLoadingModal();

    // 確保 PDF 函式庫已載入
    if (typeof loadPDFLibraries === "function") {
      await loadPDFLibraries();
    }

    // 檢查函式庫是否可用
    if (!window.jspdf || !window.html2canvas) {
      console.error("函式庫檢查:", {
        jspdf: !!window.jspdf,
        html2canvas: !!window.html2canvas,
      });
      throw new Error("PDF 函式庫載入失敗");
    }

    // 創建一個臨時的PDF內容容器
    const pdfContent = createPDFContent();
    if (!pdfContent) {
      throw new Error("無法創建 PDF 內容");
    }

    document.body.appendChild(pdfContent);

    // 使用 html2canvas 將內容轉換為圖片，確保 DOM 清理
    let canvas;
    try {
      canvas = await html2canvas(pdfContent, {
        scale: 1.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });
    } finally {
      if (pdfContent.parentNode) {
        document.body.removeChild(pdfContent);
      }
    }

    // 創建 PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    // 計算圖片尺寸以適應 A4
    const imgWidth = 210; // A4 寬度 mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // 轉換為圖片數據
    const imgData = canvas.toDataURL("image/png");

    // 添加圖片到 PDF
    const pageHeight = 297; // A4 高度 mm
    if (imgHeight <= pageHeight) {
      // 單頁
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      // 多頁處理：每頁顯示圖片的不同區段
      let yOffset = 0;

      // 第一頁
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      yOffset += pageHeight;
      while (yOffset < imgHeight) {
        pdf.addPage();
        // 將圖片向上偏移，使下一段內容顯示在頁面頂部
        pdf.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);
        yOffset += pageHeight;
      }
    }

    // 生成檔案名稱
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;

    // 下載 PDF
    pdf.save(`運動處方建議_${dateStr}.pdf`);

  } catch (error) {
    console.error("PDF 生成錯誤:", error);
    alert("PDF 生成失敗，請稍後再試。可能是瀏覽器不支援或網路問題。");
  } finally {
    hideLoadingModal();
    pdfDownloadInProgress = false;
    if (downloadButton) downloadButton.disabled = false;
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

// 創建PDF內容的HTML結構
function createPDFContent() {
  const data = window.lastFormData || {};
  // 沿用畫面上顯示的那份處方，避免 PDF 與畫面因重算而不一致
  const prescription = window.lastPrescription || calculateFITTVP(data);

  // 獲取網頁上的實際內容
  const prescriptionSummary = document.getElementById("prescriptionSummary");
  const fittpDetails = document.getElementById("fittpDetails");
  const exerciseGuidelines = document.getElementById("exerciseGuidelines");

  const container = document.createElement("div");
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
                            ${
                              data.age >= 18 && data.bmi
                                ? `
                            <div style="margin-bottom: 5px;"><strong>BMI 指數：</strong>${data.bmi} ${getBMICategory(data.bmi).label}</div>
                            `
                                : ""
                            }
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
                                <span>${prescription.frequency === 7 ? "每日身體活動" : `每週 ${prescription.frequency} 次運動`}</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">強度 (Intensity)：</strong>
                                <span>${getIntensityText(prescription.intensity)}</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">時間 (Time)：</strong>
                                <span>${prescription.frequency === 7 ? "每日" : "每次運動"} ${prescription.time} 分鐘</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">類型 (Type)：</strong>
                                <span>${prescription.type.join("、")}</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">總量 (Volume)：</strong>
                                <span>${prescription.volume === 0 ? "重點在活動多樣性與趣味性" : `每週約 ${prescription.volume} MET-minutes`}</span>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">進展 (Progression)：</strong>
                                <span>${prescription.progression}</span>
                            </div>
                            ${
                              prescription.heartRateZone
                                ? `<div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">心率區間：</strong>
                                <span>${prescription.heartRateZone}</span>
                            </div>`
                                : ""
                            }
                            ${
                              prescription.resistanceTraining
                                ? `<div style="margin-bottom: 6px;">
                                <strong style="color: #059669;">阻力訓練：</strong>
                                <span>${prescription.resistanceTraining}</span>
                            </div>`
                                : ""
                            }
                            ${
                              prescription.weeklyMinutes
                                ? `<div>
                                <strong style="color: #059669;">每週目標：</strong>
                                <span>${prescription.weeklyMinutes} 分鐘</span>
                            </div>`
                                : ""
                            }
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
                                ${prescription.type.join("、")}
                            </div>
                            <div style="font-size: 14px; font-weight: bold; color: #1e40af;">
                                ${prescription.frequency === 7 ? "每日" : "每週" + prescription.frequency + "次"} × ${prescription.time}分鐘
                            </div>
                            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                                強度：${getIntensityText(prescription.intensity)}
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center; font-size: 10px;">
                            <div style="background: white; padding: 8px; border-radius: 4px;">
                                <div style="font-size: 14px; font-weight: bold; color: #3b82f6;">
                                    ${prescription.frequency === 7 ? "每日" : prescription.frequency}
                                </div>
                                <div style="color: #6b7280;">${prescription.frequency === 7 ? "身體活動" : "次/週"}</div>
                            </div>
                            <div style="background: white; padding: 8px; border-radius: 4px;">
                                <div style="font-size: 14px; font-weight: bold; color: #22c55e;">
                                    ${prescription.time}
                                </div>
                                <div style="color: #6b7280;">分鐘${prescription.frequency === 7 ? "/日" : "/次"}</div>
                            </div>
                            <div style="background: white; padding: 8px; border-radius: 4px;">
                                <div style="font-size: 14px; font-weight: bold; color: #8b5cf6;">
                                    ${prescription.volume === 0 ? "多樣化" : prescription.volume}
                                </div>
                                <div style="color: #6b7280;">${prescription.volume === 0 ? "活動類型" : "MET-min/週"}</div>
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
                            ${exerciseExamples.replace(/class="[^"]*"/g, "").replace(/span/g, 'span style="display: inline-block; background: white; padding: 2px 8px; border-radius: 12px; margin-right: 6px; margin-bottom: 4px;"')}
                        </div>
                    </div>
                </div>

                ${
                  prescription.warnings.length > 0
                    ? `
                <div style="margin-bottom: 15px;">
                    <h2 style="font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #ef4444; padding-bottom: 3px;">
                        重要注意事項
                    </h2>
                    <div style="background: #fef2f2; padding: 12px; border-radius: 6px; border-left: 4px solid #ef4444;">
                        <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #991b1b; line-height: 1.4;">
                            ${prescription.warnings.map((warning) => `<li style="margin-bottom: 4px;">${warning}</li>`).join("")}
                        </ul>
                    </div>
                </div>
                `
                    : ""
                }

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
        
        ${
          prescription.recommendations.length > 0
            ? `
        <div style="margin-bottom: 15px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 8px; border-bottom: 2px solid #f59e0b; padding-bottom: 3px;">
                建議事項
            </h2>
            <div style="background: #fffbeb; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <ul style="margin: 0; padding-left: 15px; font-size: 12px; color: #92400e;">
                    ${prescription.recommendations.map((rec) => `<li style="margin-bottom: 6px;">${rec}</li>`).join("")}
                </ul>
            </div>
        </div>
        `
            : ""
        }
        
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <h3 style="font-size: 14px; font-weight: bold; color: #1f2937; margin-bottom: 8px;">免責聲明</h3>
            <p style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 10px;">
                本系統提供的運動處方僅供參考，不可取代專業醫療診斷與建議。建議在開始任何運動計畫前，
                請諮詢專業醫療人員、運動醫學科醫師或合格的運動專業人士。
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280;">
                <div>製作者：運動醫學科 吳易澄醫師 | https://wycswimming.blogspot.com/</div>
                <div>生成日期：${new Date().toLocaleDateString("zh-TW")}</div>
            </div>
        </div>
    `;

  return container;
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

// ==================== AI 建議功能 ====================

// AI API 端點（根據部署環境調整）
const AI_API_ENDPOINT = "/api/ai-recommendation";

// 儲存最後的處方資料（供 AI 使用）
window.lastPrescription = null;

// AI 提供商資訊與模型選項
// 模型清單必須與 functions/_lib/ai.js 的 MODEL_ALLOWLIST 同步，否則後端會回 400
const AI_PROVIDERS = {
  auto: {
    name: "自動選擇（使用站方設定）",
    hint: "使用本站已設定的供應商",
    needsKey: false,
    models: [],
  },
  groq: {
    name: "Groq",
    hint: "可使用站方設定，或前往 https://console.groq.com 取得自己的金鑰；部分模型需要特定帳號權限",
    needsKey: true,
    models: [
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B（推薦）", description: "推理能力強" },
      { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", description: "較快" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", description: "需企業存取權限" },
    ],
  },
  openai: {
    name: "OpenAI",
    hint: "前往 https://platform.openai.com/api-keys 取得金鑰",
    needsKey: true,
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini（推薦）", description: "快速且經濟" },
      { id: "gpt-4o", name: "GPT-4o", description: "較強" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "新版輕量" },
      { id: "gpt-4.1", name: "GPT-4.1", description: "新版完整" },
    ],
  },
  claude: {
    name: "Claude (Anthropic)",
    hint: "前往 https://console.anthropic.com 取得金鑰",
    needsKey: true,
    models: [
      { id: "claude-opus-5", name: "Claude Opus 5（推薦）", description: "最強" },
      { id: "claude-sonnet-5", name: "Claude Sonnet 5", description: "平衡效能與成本" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", description: "快速且經濟" },
    ],
  },
  gemini: {
    name: "Gemini (Google)",
    hint: "前往 https://aistudio.google.com/app/apikey 取得金鑰；Gemini 2.5 系列目前限既有使用者存取",
    needsKey: true,
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "限既有使用者" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "限既有使用者" },
    ],
  },
};

// 切換進階 AI 設定顯示
function toggleAdvancedAISettings() {
  const settings = document.getElementById("advancedAISettings");
  const icon = document.getElementById("advancedAIIcon");
  const toggle = document.getElementById("toggleAdvancedAI");

  if (settings.classList.contains("hidden")) {
    settings.classList.remove("hidden");
    icon.style.transform = "rotate(180deg)";
    toggle.setAttribute("aria-expanded", "true");
  } else {
    settings.classList.add("hidden");
    icon.style.transform = "rotate(0deg)";
    toggle.setAttribute("aria-expanded", "false");
  }
}

// 當選擇的 AI 提供商改變時
function onProviderChange() {
  const select = document.getElementById("aiProviderSelect");
  const keySection = document.getElementById("customApiKeySection");
  const keyInput = document.getElementById("customApiKey");
  const keyLabel = document.getElementById("apiKeyLabel");
  const keyHint = document.getElementById("apiKeyHint");
  const modelSection = document.getElementById("modelSelectSection");
  const modelSelect = document.getElementById("modelSelect");

  const provider = select.value;
  const providerInfo = AI_PROVIDERS[provider];

  // 處理 API 金鑰區塊
  if (providerInfo.needsKey) {
    keySection.classList.remove("hidden");
    keyLabel.textContent = `${providerInfo.name} API 金鑰`;
    keyHint.textContent = providerInfo.hint;
    keyInput.placeholder = `輸入您的 ${providerInfo.name} API 金鑰`;
  } else {
    keySection.classList.add("hidden");
    keyInput.value = "";
  }

  // 處理模型選擇區塊
  if (providerInfo.models && providerInfo.models.length > 0) {
    modelSection.classList.remove("hidden");
    modelSelect.innerHTML = providerInfo.models
      .map(
        (model, index) =>
          `<option value="${model.id}" ${index === 0 ? "selected" : ""}>
                ${model.name} - ${model.description}
            </option>`,
      )
      .join("");
  } else {
    modelSection.classList.add("hidden");
    modelSelect.innerHTML = "";
  }
}

// 獲取當前選擇的 AI 設定
function getAISettings() {
  const providerSelect = document.getElementById("aiProviderSelect");
  const apiKeyInput = document.getElementById("customApiKey");
  const modelSelect = document.getElementById("modelSelect");

  return {
    provider: providerSelect ? providerSelect.value : "auto",
    customApiKey: apiKeyInput ? apiKeyInput.value.trim() : null,
    model: modelSelect && modelSelect.value ? modelSelect.value : null,
  };
}

// ===== AI 建議：使用者主動觸發，回應以 DOMPurify 清洗後才寫入 =====
const AI_CLIENT_TIMEOUT_MS = 40000;
let aiRequestSeq = 0; // 每次產生處方或發出請求 +1；舊請求的回應一律丟棄
let aiAbortController = null;

function setAIState(state) {
  const panels = {
    idle: "aiConsent",
    loading: "aiLoading",
    content: "aiContent",
    error: "aiError",
  };
  for (const [key, id] of Object.entries(panels)) {
    document.getElementById(id)?.classList.toggle("hidden", key !== state);
  }
  document
    .getElementById("aiRecommendationSection")
    ?.setAttribute("aria-busy", state === "loading" ? "true" : "false");
  document
    .getElementById("refreshAiBtn")
    ?.classList.toggle("hidden", state === "idle");
}

// 產生新處方時呼叫：取消進行中的請求、清空舊內容、回到「等待使用者按下」狀態
function resetAISection() {
  if (aiAbortController) aiAbortController.abort();
  aiAbortController = null;
  aiRequestSeq++;
  const contentEl = document.getElementById("aiContent");
  if (contentEl) contentEl.innerHTML = "";
  document.getElementById("aiProviderBadge")?.classList.add("hidden");
  document.getElementById("aiTruncatedNote")?.classList.add("hidden");
  const refreshBtn = document.getElementById("refreshAiBtn");
  if (refreshBtn) {
    refreshBtn.disabled = false;
    refreshBtn.classList.remove("opacity-50");
  }
  document.getElementById("aiErrorMessage").textContent = "";
  document.getElementById("aiProviderName").textContent = "AI";
  setAIState("idle");
}

function describeClientError(error) {
  if (error?.name === "AbortError") {
    return "AI 回應逾時，請稍後再試一次。";
  }
  if (
    error?.message?.includes("Failed to fetch") ||
    error?.message?.includes("NetworkError")
  ) {
    return "AI 服務暫時無法連線，請查看本頁的標準運動處方建議。";
  }
  return error?.message || "AI 服務暫時無法使用，請查看本頁的標準運動處方建議。";
}

// 獲取 AI 建議
async function fetchAIRecommendation() {
  const contentEl = document.getElementById("aiContent");
  const errorMsgEl = document.getElementById("aiErrorMessage");
  const providerBadge = document.getElementById("aiProviderBadge");
  const providerName = document.getElementById("aiProviderName");
  const refreshBtn = document.getElementById("refreshAiBtn");
  const truncatedNote = document.getElementById("aiTruncatedNote");

  // 沒有清洗器就不顯示任何外部產生的 HTML（fail-closed）
  if (!window.DOMPurify) {
    errorMsgEl.textContent =
      "安全過濾元件未載入，為保護您的資料，AI 建議暫不顯示。請重新整理頁面後再試。";
    setAIState("error");
    return;
  }

  if (aiAbortController) aiAbortController.abort();
  const controller = new AbortController();
  aiAbortController = controller;
  const seq = ++aiRequestSeq;

  setAIState("loading");
  providerBadge.classList.add("hidden");
  truncatedNote?.classList.add("hidden");
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.classList.add("opacity-50");
  }

  try {
    const formData = window.lastFormData;
    const prescription = window.lastPrescription;
    if (!formData || !prescription) {
      throw new Error("缺少表單或處方資料");
    }

    const userData = {
      ...formData,
      prescription: {
        frequency: prescription.frequency,
        intensity: prescription.intensity,
        time: prescription.time,
        type: prescription.type,
        volume: prescription.volume,
      },
    };
    const aiSettings = getAISettings();

    const timeoutId = setTimeout(() => controller.abort(), AI_CLIENT_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(AI_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userData,
          provider: aiSettings.provider,
          model: aiSettings.model,
          customApiKey: aiSettings.customApiKey || null,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const result = await response.json().catch(() => ({
      success: false,
      error: `伺服器回應異常（${response.status}）`,
    }));

    if (seq !== aiRequestSeq) return; // 已有更新的請求或新處方，丟棄這份回應

    if (!result.success) {
      throw new Error(result.error || "AI 服務回應錯誤");
    }

    contentEl.innerHTML = window.DOMPurify.sanitize(result.recommendation);
    setAIState("content");
    truncatedNote?.classList.toggle("hidden", !result.truncated);

    if (result.provider) {
      providerName.textContent = result.provider;
      providerBadge.classList.remove("hidden");
    }
  } catch (error) {
    if (seq !== aiRequestSeq) return;
    console.error("AI 建議獲取失敗:", error);
    errorMsgEl.textContent = describeClientError(error);
    setAIState("error");
  } finally {
    if (seq === aiRequestSeq && refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.classList.remove("opacity-50");
    }
  }
}

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
