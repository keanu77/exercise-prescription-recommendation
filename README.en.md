# Exercise Prescription

**For people building an exercise habit and professionals preparing exercise education: complete a health questionnaire, receive a FITT-VP plan, and download a PDF. AI coaching is optional.**

[Live demo](https://exerciseprescription.sportsmedicine.tw/) · [繁體中文](README.md) · [Quick start](#quick-start) · [Changelog](CHANGELOG.md) · [Security](SECURITY.md)

[![Synthetic walkthrough: questionnaire, exercise plan, PDF download](docs/media/demo.gif)](https://exerciseprescription.sportsmedicine.tw/)

> The recording uses fictional data and makes no AI request. The application UI is in Traditional Chinese. Tailwind 4 requires Safari 16.4+, Chrome 111+, or Firefox 128+. Outputs are educational and do not replace diagnosis or an individual medical assessment.

## What you get

| Input or action | Output |
| --- | --- |
| Age, fitness, exercise habits, goals, and health screening | A rule-based FITT-VP plan and precautions |
| PAR-Q+ questionnaire | Conservative risk classification and follow-up guidance |
| Download prescription | An A4 PDF with selectable Chinese text; no AI key required |
| Optional context and an explicit AI request | Answers to a personal question, action rationale, alternatives, and a combined PDF |

## Quick start

Requires **Node.js 20 or newer**, npm, and Git. Use a maintained Node.js LTS release for a new installation. The standard prescription and PDF do not require an account or API key.

```bash
git clone https://github.com/keanu77/exercise-prescription-recommendation.git
cd exercise-prescription-recommendation
npm ci
npm run dev
```

Open http://127.0.0.1:3000 . No `.env` file is needed for the standard flow. Initial installation needs internet access. The page loads Google Fonts; the PDF library and Chinese font are served locally.

To test AI, copy `.env.example` to `.env`, supply your own `GROQ_API_KEY`, and restart. Never put a key in an issue or Git commit. Site-funded requests currently use Groq; candidate models require the visitor's own key.

```bash
npm test              # Backend and packaging tests; no real AI requests
npm run build:pages   # Validate CSS, JS, and assets; package into dist/
npm run build:css     # After changing Tailwind classes or src/input.css
```

See [Contributing](CONTRIBUTING.md) for browser/PDF test setup and [Security](SECURITY.md) for reporting and known dependency risks.

## Features

- Age-specific guidance for children, adolescents, adults, and older adults.
- FITT-VP: frequency, intensity, time, type, volume, and progression. Conditions, limitations, and screening results can only make the calculated plan more conservative.
- Seven-question PAR-Q+ 2025 screening. Any “yes” leads to follow-up and consultation; chest pain, dizziness/fainting, or an instruction to exercise only under medical supervision receive the highest application risk classification.
- MET-based energy estimates and BMI/BMR/TDEE calculations. Weight-loss calorie targets are hidden for minors, pregnancy, and underweight profiles.
- Optional Groq coaching, triggered by the user; advanced settings offer model selection and bring-your-own-key access.
- A questionnaire draft in the current tab; a clear action removes questionnaire data, the plan, AI results, and any supplied key from the page.
- Mobile summaries, edit controls, and expandable intensity/MET references.
- Independent prescription export, plus a combined prescription/AI report after a successful AI response. An AI error does not block the standard PDF. The standalone PAR-Q page also exports a PDF.

## Architecture

- **Frontend:** static HTML, precompiled Tailwind CSS, and vanilla JavaScript. `index.html`, `script.js`, and `ai-ui.js` form the main application. `parq-form.html` and `parq-script.js` provide standalone screening. There is a deployment packaging step, but no frontend framework runtime.
- **Shared rules:** `prescription-rules.js` is used in the browser and on the server. The server recalculates the prescription instead of trusting a client-supplied plan.
- **Backend:** Cloudflare Pages Functions in `functions/`. `POST /api/ai-recommendation` validates the questionnaire and optional context, then requests Groq narrative content. `GET /api/health` reports service/key availability; `GET /api/providers` returns the public model catalog, never keys.
- **Deployment:** `scripts/build-pages.sh` packages an explicit asset list into `dist/`; JS/CSS URLs contain content hashes. Headers are in `_headers`, bindings in `wrangler.toml`.
- **Reference scripts:** the root `*.py` files contain domain reference material and can run independently. They are not application runtime dependencies.

The server chooses the permitted actions and time windows within the existing prescription. AI answers the question and explains the reasoning and alternatives; it does not prescribe a separate numerical program. The complete rule-based flow works without AI credentials.

## Deploy your own Cloudflare Pages project

The [existing live demo](https://exerciseprescription.sportsmedicine.tw/) runs on Cloudflare. A second GitHub Pages deployment is unnecessary, and static GitHub Pages cannot execute this application's AI Functions.

Create your own Pages project and KV namespace. Replace `name` and `RATE_LIMIT_KV.id` in `wrangler.toml` with your own settings; do not reuse this project's KV ID. Substitute your project name below:

```bash
npx wrangler login
npx wrangler pages project create YOUR_PROJECT --production-branch main
npx wrangler pages secret put GROQ_API_KEY --project-name YOUR_PROJECT
npm run build:pages
npx wrangler pages deploy dist --project-name YOUR_PROJECT --branch main
```

AI is optional. Keep `ALLOWED_ORIGINS` empty to permit only same-origin API calls. After deployment, check `/api/health`, `/api/providers`, and a fictional test case. Manage API keys through Pages Secrets.

The build recompiles CSS and compares it with the committed output; stale CSS fails the build. The explicit public asset list excludes `.env`, tests, and internal documentation. This project's production site is uploaded through the CLI; merging a GitHub PR does not deploy it automatically.

## Security and data handling

- The public AI endpoint has no user authentication. A Cloudflare KV counter allows up to ten requests per IP per minute on a best-effort basis; it is not atomic. If KV is unavailable, site-funded requests fail closed. Only requests that actually use an explicitly selected bring-your-own key may continue; `auto` uses the site key.
- Models must be in `MODEL_ALLOWLIST`. Candidate models cannot spend the site's key budget.
- The server validates questionnaire fields and optional context, recalculates the baseline, checks structured responses, and rejects truncated, refused, malformed, or obviously prohibited output. These checks do **not** establish medical correctness.
- The browser renders model text as text, not HTML. CSP blocks inline scripts/event handlers; the application no longer loads DOMPurify.
- Visitor-supplied keys are proxied to the provider, not intentionally persisted or logged by this application. Provider processing and retention follow the provider's policies; this project does not promise zero provider retention.
- Questionnaire data is sent for inference only after the user requests AI coaching. The page explains that transfer. Optional coaching context is kept in page memory, not the questionnaire draft.
- Site keys are shared by visitors. The operator bears usage costs and should configure provider-side spending limits.
- The default daily site budget guard is US$2, configurable with `AI_DAILY_BUDGET_USD` up to US$10. KV races mean this is not a hard billing cap. AI output is limited to 2,800 tokens per attempt. The evaluator defaults to six synthetic cases and a US$1 reservation limit; failed attempts still retain their reserved budget.

See [SECURITY.md](SECURITY.md) for private reporting, key rotation, and dependency-audit limitations.

## References used by the project

These describe the sources used in the implementation, not an assertion that this project has completed a current clinical review.

- ACSM's Guidelines for Exercise Testing and Prescription, 11th edition: FITT-VP, intensity, and monitoring.
- WHO Guidelines on Physical Activity and Sedentary Behaviour, 2020.
- PAR-Q+ 2025, PAR-Q+ Collaboration, [eparmedx.com](https://eparmedx.com/); official Chinese version, 2026.
- ePARmed-X+ Physician Clearance Follow-Up, 2026.
- Riebe D, et al. Updating ACSM's Recommendations for Exercise Preparticipation Health Screening. *Medicine & Science in Sports & Exercise*, 2015.
- Compendium of Physical Activities for MET values.

## Limitations

This is an educational tool, not diagnosis or individualized medical advice. People with chronic conditions, cardiovascular risks, or symptoms during exercise should consult a clinician before starting a plan. Passing engineering tests is not clinical validation. The application UI has not been translated to English.

## Development records

The detailed engineering notes are in Traditional Chinese:

- [September 26 website review](docs/optimization-review-2026-09-26.md): usability, security, and performance findings.
- [September 27 UX/security work](docs/ux-security-optimization-2026-09-27.md): mobile results, data clearing, CSP, and PDF export.
- [Sports visual design](docs/sports-design-2026-09-27.md) and [desktop layout rework](docs/layout-rework-2026-09-27.md).
- [PDF design](docs/pdf-redesign-2026-09-27.md): native text, complete questionnaires, and pagination.
- [AI redesign plan](docs/ai-redesign-plan-2026-09-27.md), [implementation](docs/ai-redesign-implementation-2026-09-27.md), and [personal coaching design](docs/superpowers/specs/2026-09-28-personal-coaching-design.md).

## Author and license

Dr. Ethan Wu (吳易澄醫師), sports medicine.

[Website](https://sportsmedicine.tw/) · [YouTube](https://www.youtube.com/@sportsmedicinetw)

MIT License; see [LICENSE](LICENSE). Third-party assets keep their own notices, including [PDF font licensing](assets/fonts/OFL.txt). Use [CITATION.cff](CITATION.cff) when citing the software.
