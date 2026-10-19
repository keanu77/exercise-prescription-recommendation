// Shared deterministic rules; extracted unchanged from a917885.
(function (root) {
"use strict";
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

root.ExerciseRules = Object.freeze({ rulesVersion: "a917885-1", assessPARQRisk,calculateFITTVP,getAgeGroup,getIntensityMET,applySafetyCaps,cleanupExerciseTypes,generateExerciseSpecificRecommendations,INTENSITY_RANK,HEART_RATE_ZONES });
})(globalThis);
