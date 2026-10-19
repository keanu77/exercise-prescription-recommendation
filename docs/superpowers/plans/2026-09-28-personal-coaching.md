# Personal Coaching Implementation Plan

> **For agentic workers:** Use subagent-driven-development with a backend implementer and separate spec/quality reviews; root handles UI and integration

**Goal:** Produce useful scenario-specific answers, reasons, execution plans and alternatives from Groq, synchronized to PDF
**Architecture:** Validated optional context → server-owned prescription and contextual decisions → model answers and indexed explanations → six-section report shared by UI/PDF
**Tech Stack:** Vanilla JavaScript, Cloudflare Pages Functions, Groq strict JSON, Node tests and Python Playwright

- [x] Backend: add coaching context/contract module and semantic checks; preserve original rule file; integrate request schemaVersion 3 in functions/api/ai-recommendation.js; parameterize provider prompt/schema/output bound and budget reservation together
- [x] Backend tests: invalid enums/lengths/contradictions rejected before KV; unknown defaults; different contexts reach model; invalid/dose-changing/injection outputs rejected; consultation/minors cannot gain new dose; all baseline fixtures remain unchanged
- [x] Backend fixture helper: tests/helpers/coaching-fixture.mjs exports createCoachingResponse(data,coachingContext={}) returning a valid full schemaVersion3 response for browser/PDF tests
- [x] Frontend: index.html optional contextual fields with labels and examples; ai-ui.js collection, request v3, response v2 report rendering, field invalidation/cancellation/reset, identical sections in PDF; script.js clearAssessment clears context
- [x] Browser/PDF fixture migration: existing AI, cached assets and PDF tests consume createCoachingResponse; test answer/priorities/plan/barriers/review/safety; verify changed question invalidates report and aborts requests without losing context on cancel
- [x] Local commands: npm test; npm run build:css; npm run build:pages; bash tests/browser/run_all.sh test_ai_flow.py test_asset_updates.py test_data_reset.py test_form_journey.py test_a11y.py; full relevant PDF checks with two engines
- [x] Review backend against specification, then code quality; root resolves integration and final review findings before release
- [x] Bounded synthetic real Groq comparison to old examples; no logs containing keys, user real health data or raw upstream errors; preserve costs/failures, evaluate specificity and conflict behavior; no claim of clinician quality approval
- Release execution: commit only named files, preserve untracked assets, build an exact archive and deploy under existing session authorization; record source hashes, live UI/PDF results and final completion in `.claude/HANDOFF.md` and ignored `release.json`

Contract and exact enum strings: ../specs/2026-09-28-personal-coaching-design.md
Readiness gate: a person can identify what to do next, why it suits their stated constraint, what alternative to use and what to review, without receiving a duplicated generic template

## Local evidence before deployment
- The decision-frame architecture passed all 13 browser suites and the original 30 prescription fixtures plus 128 PAR-Q combinations without changing `prescription-rules.js`
- Latest bounded barrier-reason recovery passed 104 Node tests including the v14 minor anchors; Chromium/WebKit AI flows passed at 320/390/1280 widths and 30 PDF exports retained all original prescription and AI text
- Context lifecycle checks cover explicit consent, validation, none-equipment exclusion, cancellation, stale responses, report/PDF invalidation and clearing inputs
- Fixed-index recovery replaces at most two invalid barrier explanations with the corresponding server reason, fully revalidating after each replacement; action explanations, scalar fields and clinical flags cannot use this recovery
- Shared UI/PDF disclosure states that incomplete AI content may be omitted or replaced by explanations based on the supplied conditions
- Independent spec and quality reviews are recorded under `.claude/audit/ai-coaching-20260928/`; medical correctness still requires clinical review
- The complete original prescription precedes the AI appendix in downloaded PDFs
- No dependency, environment or migration change is required; build includes JavaScript syntax, asset completeness and compiled CSS freshness checks

## Actual-model evidence and release gates
- Use Groq GPT-OSS 120B as the default; Qwen and GPT-OSS 20B were evaluated but not adopted for the site key, and remain BYOK candidates only
- Keep every failed run and cost reservation; do not reroll already accepted outputs to inflate the success rate
- Four adult cases from v12 are retained: home-short, gym-long, unknown-context and consultation; their initial system/user prompts remain byte-identical and their reports pass the newer strict validator
- v12 minor and symptom-question reports failed content review despite HTTP 200: unsupported physiological adequacy and safety assurances respectively
- v13 removes physiological prescription fields from the minor model input and rejects the reproduced claims; suitability questions remain allowed
- The latest symptom-question report passed independent engineering content review after safety-assurance validation and bounded barrier recovery; earlier failures remain in the audit
- v14 gives minor explanations short, same-index practical rationale anchors without changing adult prompts, trusted instructions or validators; the actual minor report passed independent content review on its first attempt, with one invalid barrier explanation transparently replaced by its trusted reason
- The six-case content gate uses four retained v12 adult reports, the corrected v13 symptom report and the corrected v14 minor report; this is affected-case validation across versions, not six fresh v14 calls
- Actual-model samples and automated checks are not clinician approval and do not estimate general reliability
- The content gate passed on 2026-09-29; exact-source deployment, live asset comparison, real UI generation and PDF downloads in both engines remain the release verification procedure, with `8d2f27f` retained as the rollback snapshot
- Final source, deployment ID, custom-domain evidence and rollback location belong in ignored `release.json` and `.claude/HANDOFF.md`, so deployment proof never depends only on a source push
