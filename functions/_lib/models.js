// Server-owned catalog. Candidate models require BYOK until separately evaluated.
export const MODELS = {
  groq: { name: 'Groq', envKey: 'GROQ_API_KEY', models: [
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', siteEnabled: true, inputUSD: 0.15, outputUSD: 0.60 },
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', siteEnabled: false, inputUSD: 0.075, outputUSD: 0.30 },
  ] },
  openai: { name: 'OpenAI', envKey: 'OPENAI_API_KEY', models: [
    { id: 'gpt-6-luna', name: 'GPT-6 Luna', siteEnabled: false, inputUSD: 0.10, outputUSD: 0.50 },
    { id: 'gpt-6-sol', name: 'GPT-6 Sol', siteEnabled: false, inputUSD: 2, outputUSD: 10 },
  ] },
  claude: { name: 'Claude', envKey: 'ANTHROPIC_API_KEY', models: [
    { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', siteEnabled: false, inputUSD: 2, outputUSD: 10 },
  ] },
  gemini: { name: 'Gemini', envKey: 'GEMINI_API_KEY', models: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', siteEnabled: false, inputUSD: 0.75, outputUSD: 3.75 },
  ] },
};
export const DEFAULT_MODELS = Object.fromEntries(Object.entries(MODELS).map(([p,v])=>[p,v.models[0].id]));
export const MODEL_ALLOWLIST = Object.fromEntries(Object.entries(MODELS).map(([p,v])=>[p,v.models.map(m=>m.id)]));
export function publicCatalog(env) {
  // Keep other adapters internal; the website currently offers Groq only.
  const providers = Object.entries(MODELS).filter(([id])=>id==='groq').map(([id,p])=>({ id, name:p.name, models:p.models.map(m=>({id:m.id, name:m.name, requiresKey:!m.siteEnabled || !env[p.envKey], status:m.siteEnabled?'本站基準':'候選模型・尚未完成本站品質評測'})) }));
  const defaultProvider = providers.find(p=>p.models.some(m=>!m.requiresKey))?.id || null;
  return {schemaVersion:2, providers, defaultProvider, available:Object.fromEntries(providers.map(p=>[p.id,p.models.some(m=>!m.requiresKey)]))};
}
