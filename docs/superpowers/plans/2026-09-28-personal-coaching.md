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
- [ ] Bounded synthetic real Groq comparison to old examples; no logs containing keys, user real health data or raw upstream errors; preserve costs/failures, evaluate specificity and conflict behavior; no claim of clinician quality approval
- [ ] Commit only named files, integrate branch without touching untracked assets, exact archive build, deploy under existing session authorization and verify source hashes/live UI/PDF; update handoff with evidence and limitations

Contract and exact enum strings: ../specs/2026-09-28-personal-coaching-design.md
Readiness gate: a person can identify what to do next, why it suits their stated constraint, what alternative to use and what to review, without receiving a duplicated generic template

## Local evidence before deployment
- Decision-frame architecture: 84/84 Node tests and build:pages (28 files) passed on b121c2f; subsequent focused changes require their own verification
- All 13 browser suites passed; Chromium/WebKit PDF checks covered 30 exports, including combined prescriptions, minors, consultation, long text and actual downloads
- Context lifecycle tests passed on both engines: explicit consent, validation, none-equipment exclusion, cancel retains fields, edits abort stale responses/PDF and clear removes context
- Spec review initially found negation false positives, consultation-directive escapes and occupation-word false positives; a1af1e9 resolves the reproduced cases (41 backend/report tests plus reviewer 27 targeted assertions)
- Concurrent production update 8d2f27f is merged: AI PDF retains the complete original prescription before the AI supplement
- No dependency/environment/migration changes; plain JavaScript has no TypeScript project, syntax checks are part of the production build
- Production secret presence confirmed by name only; preview has no Groq key, so real-model validation must follow a reviewed candidate release, with 8d2f27f rollback snapshot available
- Mock/synthetic checks and pattern validation do not establish clinical correctness; actual-model usefulness still pending
- The fixed v11 GPT-OSS batch returned four reports, then stopped on a diagnosed daily token limit; it failed the minor content gate because the answer endorsed a weight-loss goal. These results are retained in the local audit and do not count as a six-case pass
- Decision-frame UI and PDF integration passed Chromium/WebKit at 320/390/1280 widths and 30 actual PDF exports after the contract change
- Final code quality review found no critical/important blockers; evaluator failed/incomplete runs now exit nonzero, verified with success/failure mocks (0/1)
