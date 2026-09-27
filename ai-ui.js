// AI state is deliberately in memory only, never persisted with the form draft.
const AI_API_ENDPOINT = '/api/ai-recommendation';
const AI_CLIENT_TIMEOUT_MS = 40000;
let aiCatalog = null;
let aiCatalogPromise = null;
let aiRequestSeq = 0;
let aiAbortController = null;
let aiRetryUntil = 0;
let aiRetryScope = "all";
let aiRetryTimer = null;
let lastAIResult = null;
const aiEl = id => document.getElementById(id);
const actionTitles = ['今天怎麼開始','遇到限制怎麼調整','下次要觀察什麼'];
const adviceGroups = ['startToday','adaptations','checkIn'];

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
      aiEl('aiDestination').textContent = '暫時無法確認服務。按下「產生我的行動建議」可重新連線；確認服務後需再按一次才會傳送資料。';
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
  aiEl('aiDestination').textContent = p && model ? `本次資料將傳送至 ${p.name} · ${model.name}。${model.requiresKey?'需提供自己的金鑰。':''}` : '目前沒有可用的站方 AI 服務，可在進階設定使用自己的金鑰。';
  aiEl('apiKeyHint').textContent = model?.requiresKey ? '此模型需提供自己的金鑰，並適用該帳號的費用與資料處理條款。' : '可留空使用站方服務；填入時改用您的帳號與額度。';
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
}
function clearAIResult() {
  lastAIResult=null;
  aiEl('aiContent').replaceChildren();
  aiEl('aiProviderBadge').classList.add('hidden');
  aiEl('aiPdfOption').classList.add('hidden');
  aiEl('includeAiInPdf').checked=false;
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
  aiEl('aiRetryStatus').textContent=seconds?`請等候 ${seconds} 秒後再試。`:'';
  clearTimeout(aiRetryTimer);
  if(seconds) aiRetryTimer=setTimeout(updateRetryButtons,1000);
}
function element(tag,text,className) {
  const el=document.createElement(tag); if(text!==undefined) el.textContent=text;
  if(className) el.className=className; return el;
}
function validateAIResult(r) {
  const str=(v,n)=>typeof v==='string' && v.length>0 && v.length<=n;
  return r?.success===true && r.schemaVersion===2 && ['actions','consultation'].includes(r.mode) &&
    ['low','moderate','high'].includes(r.risk) && r.meta?.rulesVersion===ExerciseRules.rulesVersion &&
    str(r.meta.model,100) && str(r.meta.provider,30) && str(r.meta.promptVersion,60) &&
    Number.isFinite(Date.parse(r.meta.generatedAt)) && str(r.safety,500) && str(r.advice?.summary,300) &&
    adviceGroups.every(g=>Array.isArray(r.advice[g]) && r.advice[g].length===2 && r.advice[g].every(t=>str(t,300)));
}
function renderAIResult(r) {
  const root=aiEl('aiContent');root.replaceChildren();
  root.append(element('p',r.advice.summary,'action-summary'),element('p',r.safety,'action-safety'));
  const cards=element('div',undefined,'action-grid');
  adviceGroups.forEach((g,i)=>{
    const card=element('article',undefined,'action-item');
    card.append(element('span',`0${i+1}`,'action-number'),element('h4',r.mode==='consultation'?['就醫前整理','帶去詢問的問題','後續要觀察什麼'][i]:actionTitles[i]));
    const list=element('ul');for(const line of r.advice[g]) list.append(element('li',line));card.append(list);cards.append(card);
  }); root.append(cards);
  const details=element('details',undefined,'action-provenance');details.append(element('summary','依據與限制'));
  details.append(element('p',`${r.meta.model} · ${new Date(r.meta.generatedAt).toLocaleString('zh-TW')} · 處方 ${r.meta.rulesVersion} · 行動卡 ${r.meta.promptVersion}`));
  details.append(element('p','處方與必要提醒由本站規則產生；AI 僅選取適用的生活行動。尚未執行即時文獻檢索或個別醫療評估。'));
  // Source destination is site-controlled, never model-provided.
  const link=element('a','PAR-Q+ 官方問卷與追蹤評估 ↗');link.href='https://eparmedx.com/';link.target='_blank';link.rel='noopener noreferrer';details.append(link);root.append(details);
  aiEl('aiProviderName').textContent=r.meta.model;aiEl('aiProviderBadge').classList.remove('hidden');
  aiEl('aiPdfOption').classList.remove('hidden');
  lastAIResult=r;
}
async function fetchAIRecommendation() {
  if(retrySeconds()>0) return;
  if(!aiCatalog) {await loadAICatalog();return;} // Consent again after destination becomes known.
  const settings=getAISettings();
  // Pin the displayed destination. If server configuration changes, fail instead
  // of silently sending the profile to another provider under an old consent.
  if(settings.provider==='auto') {
    const shown=aiCatalog.providers.find(p=>p.id===aiCatalog.defaultProvider);
    const shownModel=shown?.models.find(m=>!m.requiresKey);
    if(!shownModel) {clearAIResult();aiEl('aiErrorMessage').textContent='目前沒有可用的站方 AI 服務，請在進階設定使用自己的金鑰。';setAIState('error');return;}
    settings.provider=shown.id;settings.model=shownModel.id;settings.customApiKey=null;
  }
  const selected=aiCatalog.providers.find(p=>p.id===settings.provider)?.models.find(m=>m.id===settings.model);
  if(settings.provider!=='auto' && selected?.requiresKey && !settings.customApiKey) {
    clearAIResult();aiEl('aiErrorMessage').textContent='此候選模型需要自己的 API 金鑰，請在進階設定填入。';setAIState('error');return;
  }
  aiAbortController?.abort();const controller=new AbortController();aiAbortController=controller;
  const seq=++aiRequestSeq;clearAIResult();setAIState('loading');
  const timeout=setTimeout(()=>controller.abort(),AI_CLIENT_TIMEOUT_MS);
  try {
    if(!window.lastFormData || !window.lastPrescription) throw new Error('請先完成評估，再產生行動建議。');
    const response=await fetch(AI_API_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schemaVersion:2,userData:window.lastFormData,...settings}),signal:controller.signal});
    const result=await response.json().catch(()=>{throw new Error('伺服器回應異常，請稍後重試。');});
    if(seq!==aiRequestSeq)return;
    const raw=response.headers.get('Retry-After');
    if(!response.ok && raw) {
      const seconds=/^\d+$/.test(raw)?Number(raw):Math.ceil((Date.parse(raw)-Date.now())/1000);
      if(Number.isFinite(seconds)&&seconds>0){aiRetryScope=result.retryScope==='site'?'site':'all';aiRetryUntil=Date.now()+Math.min(seconds,86400)*1000;updateRetryButtons();}
    }
    if(!response.ok || !result.success) throw new Error(result.error||'AI 服務暫時無法使用。');
    if(!validateAIResult(result)) throw new Error('AI 回應未通過完整性檢查，請重新整理頁面後再試。');
    renderAIResult(result);setAIState('content');
  } catch(error) {
    if(seq!==aiRequestSeq)return;
    aiEl('aiErrorMessage').textContent=error.name==='AbortError'?'等候 AI 回應逾時，請稍後重試。':error.message==='Failed to fetch'?'AI 服務暫時無法連線，請稍後重試。':error.message;
    setAIState('error');
  } finally {
    clearTimeout(timeout);
    if(seq===aiRequestSeq){aiAbortController=null;updateRetryButtons();}
  }
}
function aiActionPDFSections(r) {
  return [
    ...adviceGroups.map((g,i)=>({title:r.mode==='consultation'?['就醫前整理','帶去詢問的問題','後續要觀察什麼'][i]:actionTitles[i],kind:'list',items:[...r.advice[g]]})),
    {title:'產生紀錄',kind:'paragraph',items:[`${r.meta.model} / ${r.meta.generatedAt} / 處方 ${r.meta.rulesVersion} / 行動卡 ${r.meta.promptVersion}`,'PAR-Q+ 官方問卷與追蹤評估：https://eparmedx.com/']},
  ];
}
function aiPDFSections() {
  if(!lastAIResult || !aiEl('includeAiInPdf').checked) return [];
  const r=lastAIResult;
  return [
    {title:'附錄  AI 協助選取的生活行動',kind:'paragraph',newPage:true,appendix:true,items:[r.advice.summary,r.safety,'本附錄不是新處方，也未即時查詢研究。']},
    ...aiActionPDFSections(r),
  ];
}
function createAIPDFReport() {
  if(!lastAIResult) throw new Error('請先產生 AI 行動建議。');
  const r=lastAIResult;
  return {
    title:'AI 運動行動報告',
    compact:true,
    subtitle:r.mode==='consultation'?'整理就醫前的準備、問題與觀察重點。':'依據目前的運動處方，整理日常做法與提醒。',
    date:new Date(r.meta.generatedAt).toLocaleDateString('zh-TW'),
    notice:{level:r.risk,title:r.mode==='consultation'?'先完成醫療評估與諮詢':'依照目前處方安排活動',body:r.safety},
    sections:[{title:'行動摘要',kind:'paragraph',items:[r.advice.summary]},...aiActionPDFSections(r)],
    disclaimer:'AI 依個人條件從本站預設建議中選取重點，不另開處方，也未即時查詢研究。請搭配標準運動處方與安全提醒使用；內容僅供參考，不能取代個別醫療建議。',
  };
}
document.addEventListener('DOMContentLoaded',()=>{loadAICatalog();aiEl('modelSelect').addEventListener('change',updateAIDestination);aiEl('customApiKey').addEventListener('input',updateRetryButtons);});
