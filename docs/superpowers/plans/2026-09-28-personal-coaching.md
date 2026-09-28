# Personal Coaching Implementation Plan

> **For agentic workers:** Use subagent-driven-development with a backend implementer and separate spec/quality reviews; root handles UI and integration

**Goal:** Produce useful scenario-specific answers, reasons, execution plans and alternatives from Groq, synchronized to PDF
**Architecture:** Validated optional context → server-owned prescription constraints → structured model narrative → six-section report shared by UI/PDF
**Tech Stack:** Vanilla JavaScript, Cloudflare Pages Functions, Groq strict JSON, Node tests and Python Playwright

- [ ] Backend: add coaching context/contract module and semantic checks; preserve original rule file; integrate request schemaVersion 3 in functions/api/ai-recommendation.js; parameterize provider prompt/schema/output bound and budget reservation together
- [ ] Backend tests: invalid enums/lengths/contradictions rejected before KV; unknown defaults; different contexts reach model; invalid/dose-changing/injection outputs rejected; consultation/minors cannot gain new dose; all baseline fixtures remain unchanged
- [ ] Backend fixture helper: tests/helpers/coaching-fixture.mjs exports createCoachingResponse(data,coachingContext={}) returning a valid full schemaVersion3 response for browser/PDF tests
- [ ] Frontend: index.html optional contextual fields with labels and examples; ai-ui.js collection, request v3, response v2 report rendering, field invalidation/cancellation/reset, identical sections in PDF; script.js clearAssessment clears context
- [ ] Browser/PDF fixture migration: existing AI, cached assets and PDF tests consume createCoachingResponse; test answer/priorities/plan/barriers/review/safety; verify changed question invalidates report and aborts requests without losing context on cancel
- [ ] Local commands: npm test; npm run build:css; npm run build:pages; bash tests/browser/run_all.sh test_ai_flow.py test_asset_updates.py test_data_reset.py test_form_journey.py test_a11y.py; full relevant PDF checks with two engines
- [ ] Review backend against specification, then code quality; root resolves integration and final review findings before release
- [ ] Bounded synthetic real Groq comparison to old examples; no logs containing keys, user real health data or raw upstream errors; preserve costs/failures, evaluate specificity and conflict behavior; no claim of clinician quality approval
- [ ] Commit only named files, integrate branch without touching untracked assets, exact archive build, deploy under existing session authorization and verify source hashes/live UI/PDF; update handoff with evidence and limitations

Contract and exact enum strings: ../specs/2026-09-28-personal-coaching-design.md
Readiness gate: a person can identify what to do next, why it suits their stated constraint, what alternative to use and what to review, without receiving a duplicated generic template
