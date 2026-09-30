// AI state is deliberately in memory only, never persisted with the form draft.
const AI_API_ENDPOINT = '/api/ai-recommendation';
const AI_CLIENT_TIMEOUT_MS = 65000;
let aiCatalog = null;
let aiCatalogPromise = null;
let aiRequestSeq = 0;
let aiAbortController = null;
let aiRetryUntil = 0;
let aiRetryScope = "all";
let aiRetryTimer = null;
let lastAIResult = null;
const aiEl = id => document.getElementById(id);
const reportSectionIds = ['answer','priorities','plan','barriers','review','safety'];

function getCoachingContext() {
  const checked=name=>[...document.querySelectorAll(`#aiContextFields input[name="${name}"]:checked`)].map(el=>el.value);
  const question=aiEl('aiQuestion').value.trim();
  const preferences=checked('aiPreferences');
  if(question.length>400) throw new Error('請將問題縮短至 400 字以內');
  if(preferences.length>3) throw new Error('想做或喜歡的活動最多選 3 項，請留下最在意的選擇');
  return {question,availableDays:checked('aiDays'),sessionMinutes:aiEl('aiSessionMinutes').value?Number(aiEl('aiSessionMinutes').value):null,
    timeOfDay:aiEl('aiTimeOfDay').value,setting:aiEl('aiSetting').value,equipment:checked('aiEquipment'),preferences};
}
function clearCoachingContext() {
  aiEl('aiQuestion').value='';
  aiEl('aiContextFields').querySelectorAll('input').forEach(el=>{el.checked=false;});
  aiEl('aiContextFields').querySelectorAll('select').forEach(el=>{el.selectedIndex=0;});
  aiEl('aiContextError').textContent='';aiEl('aiContextError').classList.add('hidden');
  aiEl('aiContextPanel').open=true;
}
function onCoachingInput(event) {
  const target=event.target;
  if(target.name==='aiEquipment' && target.checked) {
    aiEl('aiContextFields').querySelectorAll('input[name="aiEquipment"]').forEach(el=>{
      if(el!==target && (target.value==='none'||el.value==='none')) el.checked=false;
    });
  }
  // Context stays editable while generating; a change cancels the old snapshot.
  resetAISection();
  aiEl('aiContextError').textContent='';aiEl('aiContextError').classList.add('hidden');
}

async function loadAICatalog() {
  if (aiCatalogPromise) return aiCatalogPromise;
  aiCatalogPromise = (async () => {
    try {
      const response = await fetch('/api/providers', { signal: AbortSignal.timeout(6000) });
      const result = await response.json();
      if (!response.ok || result.schemaVersion !== 2 || !Array.isArray(result.providers)) throw new Error('catalog');
      // Also filter older catalog responses during rolling deployments.
      aiCatalog = {...result, providers:result.providers.filter(p=>p.id==='groq'), defaultProvider:result.defaultProvider==='groq'?'groq':null};
      const select = aiEl('aiProviderSelect');
      select.replaceChildren(new Option('使用站方 Groq 服務','auto'), ...aiCatalog.providers.map(p=>new Option('自行設定 Groq 模型與金鑰',p.id)));
      onProviderChange();
    } catch {
      aiEl('aiDestination').textContent = '暫時無法確認服務；按下「產生我的行動建議」可重新連線；確認服務後需再按一次才會傳送資料';
    } finally { aiEl('generateAiBtn').disabled = false; aiCatalogPromise = null; }
  })();
  return aiCatalogPromise;
}
function toggleAdvancedAISettings() {
  const hidden=aiEl('advancedAISettings').classList.toggle('hidden');
  aiEl('toggleAdvancedAI').setAttribute('aria-expanded',String(!hidden));
  aiEl('advancedAIIcon').textContent=hidden?'⌄':'⌃';
}
function onProviderChange() {
  const provider=aiCatalog?.providers.find(p=>p.id===aiEl('aiProviderSelect').value);
  aiEl('customApiKey').value='';
  aiEl('customApiKeySection').classList.toggle('hidden',!provider);
  aiEl('modelSelectSection').classList.toggle('hidden',!provider);
  aiEl('modelSelect').replaceChildren(...(provider?.models||[]).map(m=>new Option(`${m.name} · ${m.status}`,m.id)));
  if(provider) aiEl('apiKeyLabel').textContent=provider.name+' API 金鑰';
  updateAIDestination();
}
function updateAIDestination() {
  const settings=getAISettings();
  const p=aiCatalog?.providers.find(p=>p.id===(settings.provider==='auto'?aiCatalog.defaultProvider:settings.provider));
  const model=settings.provider==='auto'?p?.models.find(m=>!m.requiresKey):p?.models.find(m=>m.id===settings.model);
  aiEl('aiDestination').textContent = p && model ? `本次資料將傳送至 ${p.name} · ${model.name}${model.requiresKey?'；需提供自己的金鑰':''}` : '目前沒有可用的站方 AI 服務，可在進階設定使用自己的金鑰';
  aiEl('apiKeyHint').textContent = model?.requiresKey ? '此模型需提供自己的金鑰，並適用該帳號的費用與資料處理條款' : '可留空使用站方服務；填入時改用您的帳號與額度';
  updateRetryButtons();
}
function getAISettings() {
  return {provider:aiEl('aiProviderSelect').value,model:aiEl('modelSelect').value||null,customApiKey:aiEl('customApiKey').value.trim()||null};
}
function setAIState(state) {
  for(const [name,id] of Object.entries({idle:'aiConsent',loading:'aiLoading',content:'aiContent',error:'aiError'})) aiEl(id).classList.toggle('hidden',name!==state);
  aiEl('aiRecommendationSection').setAttribute('aria-busy',String(state==='loading'));
  aiEl('refreshAiBtn').classList.toggle('hidden',state==='idle'||state==='loading');
  aiEl('advancedAISettings').querySelectorAll('input,select').forEach(el=>{el.disabled=state==='loading';});
  aiEl('aiDownloadHint').textContent=state==='content'?'可下載運動處方，或包含完整運動處方、安全提醒與 AI 分析的合併報告':state==='loading'?'運動處方可先下載；AI 分析產生中，完成後可下載合併報告':state==='error'?'仍可下載運動處方；重新產生 AI 分析後可下載合併報告':'可直接下載運動處方；AI 分析完成後可下載合併報告';
  updatePDFButtons();
}
function clearAIResult() {
  lastAIResult=null;
  clearPDFDownload({aiOnly:true});
  aiEl('aiErrorDetails').open=false;aiEl('aiErrorDetails').classList.add('hidden');
  aiEl('aiErrorDiagnostic').textContent='';
  aiEl('aiContent').replaceChildren();
  aiEl('aiProviderBadge').classList.add('hidden');
}
function resetAISection() {
  aiAbortController?.abort(); aiAbortController=null; aiRequestSeq++;
  clearAIResult();
  aiEl('aiErrorMessage').textContent='';
  aiEl('aiProviderName').textContent='AI';
  setAIState('idle');
  updateRetryButtons();
}
function cancelAIRecommendation() { resetAISection(); aiEl('generateAiBtn').focus(); }
function retrySeconds() {
  const settings=getAISettings();
  if(aiRetryScope==='site' && settings.provider!=='auto' && settings.customApiKey) return 0;
  return Math.max(0,Math.ceil((aiRetryUntil-Date.now())/1000));
}
function updateRetryButtons() {
  const seconds=retrySeconds();
  for(const id of ['generateAiBtn','refreshAiBtn']) aiEl(id).disabled=seconds>0;
  aiEl('aiRetryStatus').textContent=seconds?`請等候 ${seconds} 秒後再試`:'';
  clearTimeout(aiRetryTimer);
  if(seconds) aiRetryTimer=setTimeout(updateRetryButtons,1000);
}
function siteCopy(text) {
  return String(text).replace(/。(?=\s*$)/u,'').replaceAll('。','；');
}
function element(tag,text,className) {
  const el=document.createElement(tag); if(text!==undefined) el.textContent=siteCopy(text);
  if(className) el.className=className; return el;
}
function validateAIResult(r) {
  const str=(v,n)=>typeof v==='string' && v.length>0 && v.length<=n;
  return r?.success===true && r.schemaVersion===3 && ['actions','consultation'].includes(r.mode) &&
    ['low','moderate','high'].includes(r.risk) && r.meta?.rulesVersion===ExerciseRules.rulesVersion &&
    str(r.meta.model,100) && str(r.meta.provider,30) && str(r.meta.promptVersion,60) &&
    (r.meta.omittedItems===undefined || Number.isInteger(r.meta.omittedItems) && r.meta.omittedItems>=0 && r.meta.omittedItems<=18) &&
    Number.isFinite(Date.parse(r.meta.generatedAt)) && str(r.safety,500) && validateDetailedReport(r.report);
}
function validateDetailedReport(report) {
  const text=v=>typeof v==='string' && v.length>0 && v.length<=2000;
  return report?.version===2 && text(report.summary) && report.summary.length<=500 && Array.isArray(report.sections) && report.sections.length===reportSectionIds.length &&
    report.sections.every((s,i)=>s?.id===reportSectionIds[i] && text(s.title) && ['list','rows'].includes(s.kind) && Array.isArray(s.items) && s.items.length>0 && s.items.length<=30 &&
      s.items.every(item=>s.kind==='rows'?Array.isArray(item)&&item.length===2&&item.every(text):text(item)));
}
function aiOmissionNotice(r) {
  return Number.isInteger(r.meta.omittedItems) && r.meta.omittedItems>0 ? '部分 AI 建議未能完整整理，已省略或改用依填寫條件整理的說明；請搭配原處方與安全提醒使用' : '';
}
function renderAIResult(r) {
  const root=aiEl('aiContent');root.replaceChildren();
  aiEl('aiContextPanel').open=false;
  root.append(element('p',r.report.summary,'action-summary'));
  const omissionNotice=aiOmissionNotice(r);
  if(omissionNotice) {const note=element('p',omissionNotice,'action-note');note.dataset.aiOmissionNotice='true';root.append(note);}
  if(r.mode==='consultation') root.append(element('p',r.safety,'action-safety'));
  const report=element('div',undefined,'ai-report-details');
  for(const section of r.report.sections) {
    const block=element('section',undefined,'ai-report-section');
    block.dataset.reportSection=section.id;
    block.append(element('h4',section.title));
    const content=element(section.kind==='rows'?'dl':'ul');
    for(const item of section.items) {
      if(section.kind==='rows') {
        const row=element('div');row.append(element('dt',item[0]),element('dd',item[1]));content.append(row);
      } else content.append(element('li',item));
    }
    block.append(content);report.append(block);
  }
  root.append(report);
  const details=element('details',undefined,'action-provenance');details.append(element('summary','依據與限制'));
  details.append(element('p',`${r.meta.model} · ${new Date(r.meta.generatedAt).toLocaleString('zh-TW')} · 處方 ${r.meta.rulesVersion} · 報告 ${r.meta.promptVersion}`));
  details.append(element('p','行動與備案依你填寫的條件整理，AI 回答個人問題並說明選擇理由；運動量沿用原處方；未即時查詢文獻，也未完成個別醫療評估'));
  // Source destination is site-controlled, never model-provided.
  const link=element('a','PAR-Q+ 官方問卷與追蹤評估 ↗');link.href='https://eparmedx.com/';link.target='_blank';link.rel='noopener noreferrer';details.append(link);root.append(details);
  aiEl('aiProviderName').textContent=r.meta.model;aiEl('aiProviderBadge').classList.remove('hidden');
  lastAIResult=r;
}
async function fetchAIRecommendation() {
  if(retrySeconds()>0) return;
  if(!aiCatalog) {await loadAICatalog();return;} // Consent again after destination becomes known.
  let coachingContext;
  try {coachingContext=getCoachingContext();}
  catch(error) {
    aiEl('aiContextPanel').open=true;
    aiEl('aiContextError').textContent=error.message;aiEl('aiContextError').classList.remove('hidden');
    aiEl(error.message.includes('400')?'aiQuestion':'aiContextError').scrollIntoView({block:'center'});
    return;
  }
  const settings=getAISettings();
  // Pin the displayed destination. If server configuration changes, fail instead
  // of silently sending the profile to another provider under an old consent.
  if(settings.provider==='auto') {
    const shown=aiCatalog.providers.find(p=>p.id===aiCatalog.defaultProvider);
    const shownModel=shown?.models.find(m=>!m.requiresKey);
    if(!shownModel) {clearAIResult();aiEl('aiErrorMessage').textContent='目前沒有可用的站方 AI 服務，請在進階設定使用自己的金鑰';setAIState('error');return;}
    settings.provider=shown.id;settings.model=shownModel.id;settings.customApiKey=null;
  }
  const selected=aiCatalog.providers.find(p=>p.id===settings.provider)?.models.find(m=>m.id===settings.model);
  if(settings.provider!=='auto' && selected?.requiresKey && !settings.customApiKey) {
    clearAIResult();aiEl('aiErrorMessage').textContent='此候選模型需要自己的 API 金鑰，請在進階設定填入';setAIState('error');return;
  }
  aiAbortController?.abort();const controller=new AbortController();aiAbortController=controller;
  const seq=++aiRequestSeq;clearAIResult();setAIState('loading');
  const timeout=setTimeout(()=>controller.abort(),AI_CLIENT_TIMEOUT_MS);
  try {
    if(!window.lastFormData || !window.lastPrescription) throw new Error('請先完成評估，再產生行動建議');
    const response=await fetch(AI_API_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schemaVersion:3,userData:window.lastFormData,coachingContext,...settings}),signal:controller.signal});
    if(seq!==aiRequestSeq)return;
    // Read failures (including AbortError) must keep their real category instead
    // of being reported as malformed JSON. Never render an HTML error body.
    const responseText=await response.text();
    if(seq!==aiRequestSeq)return;
    let result;
    try { result=JSON.parse(responseText); } catch { /* Edge errors may be HTML or plain text. */ }
    if(!result || typeof result!=='object' || Array.isArray(result)) result=null;
    const raw=response.headers.get('Retry-After');
    if(!response.ok && raw) {
      const seconds=/^\d+$/.test(raw)?Number(raw):Math.ceil((Date.parse(raw)-Date.now())/1000);
      if(Number.isFinite(seconds)&&seconds>0){aiRetryScope=result?.retryScope==='site'?'site':'all';aiRetryUntil=Date.now()+Math.min(seconds,86400)*1000;updateRetryButtons();}
    }
    if(!response.ok || !result) {
      const ray=response.headers.get('CF-Ray');
      const reference=/^[a-f0-9]{16}(?:-[a-z]{3})?$/i.test(ray||'')?` · 識別碼 ${ray}`:'';
      aiEl('aiErrorDiagnostic').textContent=`HTTP ${response.status}${reference} · ${new Date().toLocaleString('zh-TW')}`;
      aiEl('aiErrorDetails').classList.remove('hidden');
    }
    if(!result) {
      throw new Error(response.status===429||response.status===503?'AI 服務目前忙碌，請稍後按「重新產生」':response.status===403?'本次連線未通過服務驗證，請重新整理頁面後再試':response.status===504||response.status===524?'服務等候回應逾時，請稍後按「重新產生」':'未收到完整的 AI 回應，請稍後按「重新產生」');
    }
    if(!response.ok || !result.success) throw new Error(result.error||'AI 服務暫時無法使用');
    if(!validateAIResult(result)) throw new Error('AI 回應未通過完整性檢查，請重新整理頁面後再試');
    renderAIResult(result);setAIState('content');
  } catch(error) {
    if(seq!==aiRequestSeq)return;
    aiEl('aiErrorMessage').textContent=error.name==='AbortError'?'等候 AI 回應逾時，請稍後重試':['Failed to fetch','Load failed','NetworkError when attempting to fetch resource.'].includes(error.message)?'AI 服務暫時無法連線，請稍後重試':siteCopy(error.message);
    setAIState('error');
  } finally {
    clearTimeout(timeout);
    if(seq===aiRequestSeq){aiAbortController=null;updateRetryButtons();}
  }
}
function aiActionPDFSections(r) {
  return [
    ...r.report.sections.map(s=>({title:s.title,kind:s.kind,items:s.items.map(item=>Array.isArray(item)?[...item]:item)})),
    {title:'產生紀錄',kind:'paragraph',items:[`${r.meta.model} / ${r.meta.generatedAt} / 處方 ${r.meta.rulesVersion} / 報告 ${r.meta.promptVersion}`,'PAR-Q+ 官方問卷與追蹤評估：https://eparmedx.com/']},
  ];
}
function createAIPDFReport() {
  if(!lastAIResult) throw new Error('請先產生 AI 行動建議。');
  if(!window.lastFormData || !window.lastPrescription) throw new Error('請先完成評估，產生運動處方。');
  const r=lastAIResult;
  // Reuse the complete displayed prescription; snapshot both parts before loading PDF assets.
  const prescriptionReport=createPDFReport();
  return {
    ...prescriptionReport,
    title:'運動處方與 AI 行動報告',
    compact:true,
    subtitle:'完整運動處方、你的問題、選擇理由、執行安排與替代方案',
    date:new Date(r.meta.generatedAt).toLocaleDateString('zh-TW'),
    sections:[
      ...prescriptionReport.sections,
      // Keep the prescription disclaimer before AI, then flow into available space.
      {title:'07  AI 行動建議',kind:'paragraph',appendix:true,items:[r.report.summary,r.safety,...(aiOmissionNotice(r)?[aiOmissionNotice(r)]:[])]},
      ...aiActionPDFSections(r),
      {title:'AI 說明與限制',kind:'paragraph',items:['行動與備案依填寫的條件整理，AI 回答個人問題並說明選擇理由，運動量沿用原處方；未即時查詢研究，亦未完成個別醫療評估；請搭配本報告前段的運動處方與安全提醒使用，不能取代個別醫療建議']},
    ],
  };
}
document.addEventListener('DOMContentLoaded',()=>{
  loadAICatalog();aiEl('modelSelect').addEventListener('change',updateAIDestination);aiEl('customApiKey').addEventListener('input',updateRetryButtons);
  aiEl('aiContextFields').addEventListener('input',onCoachingInput);
});
