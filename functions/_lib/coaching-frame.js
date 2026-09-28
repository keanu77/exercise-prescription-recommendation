const preferenceLabels = { walking: '走路', running: '跑步', cycling: '騎車', swimming: '游泳', strength: '肌力活動', dance: '舞蹈', ball: '球類', mindbody: '身心活動', play: '遊戲' };
const equipmentLabels = { none: '無器材', mat: '墊子', bands: '彈力帶', dumbbells: '啞鈴', machines: '器械', bike: '腳踏車' };
const action = (title, instruction, reasonFallback) => ({ title, instruction, reasonFallback });
const barrier = (title, alternative, reasonFallback) => ({ title, alternative, reasonFallback });

// Only structured, validated answers supply facts. Free text is sent separately
// as untrusted data and cannot establish a room, skill, routine or medical fact.
export function buildDecisionFrame(ctx, consultation = ctx.consult) {
  const c = ctx.coachingContext;
  const preferred = c.preferences.map(key => preferenceLabels[key]).join('、');
  const equipment = c.equipment.map(key => equipmentLabels[key]).join('、');
  const timeWindow = c.sessionMinutes === null ? 'unknown' : c.sessionMinutes <= 20 ? 'short' : c.sessionMinutes <= 45 ? 'medium' : 'long';
  const known = { setting: c.setting === 'flexible' ? null : c.setting, timeOfDay: c.timeOfDay === 'flexible' ? null : c.timeOfDay, timeWindow, datesProvided: c.availableDays.length > 0, preferences: [...c.preferences], equipment: [...c.equipment] };
  const unknown = ['familiarActivities', 'startCue', ...(c.setting === 'home' ? ['space'] : ['access']), ...(!c.availableDays.length || c.sessionMinutes === null ? ['availableTime'] : []), ...(!c.preferences.length ? ['preferences'] : []), ...(!c.equipment.length ? ['equipment'] : c.equipment.includes('none') ? [] : ['equipmentFamiliarity'])];
  if (consultation) return {
    known, unknown: [...unknown, 'clinicalAssessment'],
    summary: '先把身體變化、生活限制與想釐清的問題整理好，讓專業諮詢能對應你的實際困難',
    actions: [
      action('記下身體變化與發生情境', `${ctx.minor ? '和家長或照顧者一起' : ''}整理何時出現身體變化、當時在做什麼及如何影響生活，連同問卷與原處方帶去諮詢`, '具體情境能協助專業人員釐清問題，減少只用活動名稱描述時的資訊缺口'),
      action('把個人問題變成諮詢重點', '寫下最想恢復的生活安排與最難配合的限制，詢問哪些事項須先評估，以及如何判斷後續安排是否適合', '先說明希望解決的困難，較容易得到能帶回生活中使用的回答'),
    ],
    barriers: [
      barrier('若不確定怎麼描述', '從最近印象清楚的情境開始記錄，不確定的地方標成待確認，避免自行推測原因', '保留不確定性比補上猜測更有助於後續釐清'),
      barrier('若暫時還沒完成諮詢', '先整理已有的問卷、原處方與問題，確認可聯繫的專業資源，依原安全提醒處理身體變化', '準備紀錄可以先進行，是否適合活動仍需依評估結果確認'),
    ],
    reviewGuidance: ['諮詢後記下已獲回答與仍待釐清的問題，核對專業人員說明的限制及後續安排'],
    questionFocus: { field: 'clinicalAssessment', prompt: ctx.minor ? '你和家長或照顧者最希望專業人員先釐清哪個身體變化與發生情境？' : '你最希望專業人員先釐清哪個身體變化，以及它會在什麼情境出現？' },
  };
  if (ctx.minor) return {
    known, unknown: [...unknown, 'caregiverSupport'],
    summary: '先和家長或照顧者一起選喜歡且熟悉的活動，確認場地與陪伴，再對照原處方安排',
    actions: [
      action('一起選喜歡的熟悉活動', preferred ? `和家長或照顧者討論偏好的${preferred}，確認哪些已熟悉且符合原處方，遊戲也要依場地與能力選擇` : '和家長或照顧者一起討論喜歡的遊戲或活動，先確認熟悉程度，再對照原處方選擇', '從孩子喜歡且熟悉的內容討論，能讓孩子參與選擇，也保留尋求指導的空間'),
      action('確認陪伴與可用場地', '一起確認誰能陪伴、場地是否適合，以及生活中哪些時段確實可行，不先假定已有固定安排', '能一起協調陪伴與場地，才容易把喜歡的活動放進生活'),
    ],
    barriers: [
      barrier('若場地或陪伴不確定', '先和照顧者確認可用資源，條件未確認前保留待安排，不臨時加入陌生活動', '場地與陪伴是安排條件，不能只憑喜歡就假定已經具備'),
      barrier('若對原本選擇失去興趣', '一起說出不喜歡或卡住的原因，再從已熟悉、符合原處方的喜好中討論可行選擇', '了解不喜歡的原因，比直接要求完成更能幫助後續協調'),
    ],
    reviewGuidance: ['和家長或照顧者聊聊哪些部分有趣、哪些地方卡住，再一起決定要改善的安排條件'],
    questionFocus: { field: 'caregiverSupport', prompt: '可以和哪位家長或照顧者一起確認喜歡的活動、場地與陪伴？' },
  };

  const familiarChoice = preferred ? `從你偏好的${preferred}中確認哪些已熟悉且符合原處方` : '從原處方中選出你喜歡且已熟悉的活動';
  const cue = c.timeOfDay === 'flexible' ? '選生活中原本就會發生、適合提醒準備的事件，不先假定你的作息' : `在你選的${{ morning: '早上', lunch: '午間', evening: '晚上' }[c.timeOfDay]}安排中，找原本就會發生的生活事件作為準備提示`;
  let summary, first, firstBarrier, questionFocus;
  if (c.setting === 'home') {
    summary = '家中的活動空間仍需確認，先核對熟悉活動是否適合，再用生活提示減少開始前的準備負擔';
    first = action('先確認家中空間是否合適', `先確認家中是否有適合熟悉活動的空間，再${familiarChoice}，不確定是否適合時先記下限制並尋求指導`, '選在家中可以減少外出安排，但仍需先核對空間與熟悉程度');
    firstBarrier = barrier('若家中空間不適合', '先記下不適合的條件，確認原處方中是否有你已熟悉且適合現有空間的選擇，沒有就保留待詢問，不自行編排新動作', '場地限制尚未解決時，不能把其他活動直接視為可用替代');
    questionFocus = { field: 'space', prompt: '家中是否有適合你原處方中熟悉活動的空間，目前最不確定的是什麼？' };
  } else if (c.setting !== 'flexible') {
    const setting = { gym: '健身房', outdoors: '戶外場地', pool: '泳池' }[c.setting];
    summary = `先確認${setting}是否可用與活動熟悉程度，把到場和準備納入安排，再核對原處方`;
    first = action(`確認${setting}與熟悉項目`, `先${familiarChoice}，把熟悉項目與待確認的用品列出，出發前核對${setting}的使用條件${equipment && !c.equipment.includes('none') ? `，你填寫的${equipment}也需核對是否可用及是否熟悉` : ''}，不熟悉的部分先尋求指導`, '選定場地與填寫偏好不代表已確認使用條件，先核對可減少到場後重新決定的負擔');
    firstBarrier = barrier(`若${setting}當時無法使用`, '先查明使用條件，另找你已確認可用的時段，場地或活動的替代選擇須先確認適合及本人同意', '先確認能否使用，能避免在受阻時臨時換成不熟悉的安排');
    questionFocus = { field: 'access', prompt: `你選的${setting}目前有哪些使用條件還沒確認？` };
  } else {
    summary = '場地與熟悉程度仍需釐清，先從喜好確認可行活動，再找實際可用的生活時段';
    first = action('先確認喜歡且熟悉的項目', `${familiarChoice}，再確認可用場地，若還沒有熟悉項目就先尋求指導`, '偏好有助於縮小選擇，但活動是否熟悉與場地是否可用仍要分別確認');
    firstBarrier = barrier('若還沒有適合的場地或熟悉項目', '先列出待確認的使用條件與指導需求，不急著添購器材或把陌生活動排入計畫', '先釐清缺少的條件，較容易找到真正有幫助的資源');
    questionFocus = { field: preferred ? 'familiarActivities' : 'preferences', prompt: preferred ? '你偏好的活動中，哪些已經熟悉且有可用場地？' : '原處方的活動類型中，你比較喜歡且已經熟悉哪些項目？' };
  }
  const timeUnknown = unknown.includes('availableTime');
  const second = timeUnknown
    ? action('先找確實可用的生活時段', c.availableDays.length ? '在已選的日子裡核對真正可空出的時間，連準備及整理一起考慮，再對照原處方' : c.sessionMinutes !== null ? '選出確實可行的日子，把已提供的時間窗口連同準備與整理一起核對，再對照原處方' : '列出確實可行的日子與可用時段，連準備及整理所需的時間一起核對，再對照原處方', '尚未提供完整時間條件時，先確認可用窗口才能判斷安排是否可行')
    : action('把準備接到生活提示', `把必要用品列成可重用的簡短清單，${cue}，再核對準備與整理能否放進已提供的窗口`, '可用窗口包含準備與整理，減少臨時決定能讓真正的阻力更容易被看見');
  const secondBarrier = timeWindow === 'short'
    ? barrier('若準備占去太多可用時間', '先記下卡在找用品、切換事情或整理的哪個環節，調整準備方式後核對與原處方的差距，不把短窗口視為已完成目標', '短窗口的限制需要被看見，準備變順手也不等於處方份量已經足夠')
    : barrier('若原訂時段被其他事情打斷', '記下被打斷的原因，重新找已確認可行的時段，再對照原處方，不加倍補回錯過的活動', '記錄中斷原因能區分時間不足與準備不順，方便下次改善安排');
  if (timeUnknown && c.setting !== 'home') questionFocus = { field: 'availableTime', prompt: c.availableDays.length ? '已選的日子裡，每次包含準備與整理大約能空出多久？' : c.sessionMinutes !== null ? '你提供的可用時間窗口，可以安排在哪些日子？' : '哪些日子和時段確實能留下活動、準備與整理的時間？' };
  return { known, unknown, summary, actions: [first, second], barriers: [firstBarrier, secondBarrier], reviewGuidance: ['比較原訂安排與實際執行，記下時間、場地或準備卡住的環節，下次先改善安排條件，活動份量仍核對原處方'], questionFocus };
}
