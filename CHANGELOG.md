# Changelog

This file describes user-visible releases. Dates refer to publication, not clinical guideline review. The application version is `2.1.0`; the repository previously had no GitHub release.

## Unreleased — repository launch preparation

- Chinese and English getting-started guides, a synthetic walkthrough, and downloadable demo media.
- Contribution instructions, private vulnerability reporting guidance, and an explicit dependency-risk note.
- Repository metadata updated to describe Cloudflare Pages and optional AI.
- Release preparation does not itself deploy the website or certify clinical content.

## 2.1.0 — application snapshot prepared for release

- Generate a rule-based FITT-VP exercise prescription from a questionnaire, with PAR-Q+ screening and age/health precautions.
- Add optional Groq coaching: personal question, practical context, action explanations, alternatives, and review prompts, while retaining the server-calculated prescription.
- Download the complete prescription independently of AI; optionally include the AI report in a compact PDF with selectable Chinese text.
- Restore a tab-local draft, clear entered information, and invalidate stale AI results after edits.
- Serve the site and API on Cloudflare Pages/Functions with fingerprinted frontend assets.
- Add YouTube follow links and wrap the links on narrow screens.

Validation on 2026-10-19: 104 Node tests; real production questionnaire flows at three viewport widths; 32 Chromium/WebKit PDF regression cases with simulated AI; one successful synthetic real-Groq case with a two-page prescription and three-page combined PDF. These checks are engineering evidence, not a comprehensive clinical review.

Earlier development history remains in Git and the dated documents under `docs/`. The `zeabur-final` tag preserves the retired Express deployment.
