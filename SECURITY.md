# Security policy / 安全回報

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/keanu77/exercise-prescription-recommendation/security/advisories/new). Do not disclose a working exploit, credentials, or patient information in a public issue.

Include the affected commit or URL, minimal reproduction steps using synthetic data, expected/actual behavior, and impact. Remove authorization headers, API keys, IP addresses, and health information from logs. Reports are reviewed by the maintainer; there is no guaranteed response time or security SLA.

請使用上方 GitHub 私密漏洞回報。重現範例必須去識別且以虛構資料為主；勿在公開 issue 貼上金鑰、病人資料或可直接利用的攻擊細節。一般 UI 問題可開公開 issue。

## Supported scope

Fixes target the current maintained application. The `zeabur-final` tag and `archive/blogger/` are historical snapshots, not maintained deployments. An old release is not guaranteed to receive backports. Report a clinical-content concern separately from a software security vulnerability, without including identifiable health data.

## Secrets and rotation

- Keep `.env`, Groq/provider keys, Cloudflare API credentials, and visitor-supplied keys out of Git, screenshots, public logs, issues, and sample files.
- Production provider keys belong in Cloudflare Pages Secrets. Personal deployments must use their own account, project, and KV namespace.
- If a key is exposed, revoke it at the provider, create a replacement, update the relevant Pages Secret or local `.env`, and redeploy if required by the platform. Review provider usage and billing. Deleting a Git commit or issue alone does not revoke a key.
- Never include the exposed value in the incident report. If it reached Git history, coordinate history cleanup after revocation.

## Boundaries

The public AI endpoint has no authentication. KV rate and daily budget guards are best-effort and non-atomic; configure provider spending limits. The frontend stores the questionnaire draft in tab-scoped session storage; optional coaching context remains in memory. AI requests transfer submitted information through the server to Groq. Provider retention is governed by the provider's policy.

The development server is loopback-only and is not hardened for public hosting. Production uses Cloudflare Pages Functions and `_headers`. The normal build copies an explicit asset list, not the repository or `.env`.

## Known dependency-audit limitations (2026-10-19)

The installed lockfile audit reports **8 findings: 6 high and 2 moderate**, in the Tailwind development-tool dependency tree. This repository has no npm production dependencies, but that does not establish that the browser application or vendored libraries are vulnerability-free. Some suggested fixes require a Tailwind major-version migration; this documentation release does not silently make that migration.

Recheck with `npm audit`. Evaluate package advisories, build-time exposure, and output changes before updating; do not run `npm audit fix --force` as an unattended release step. The vendored PDF library and fonts are outside npm audit coverage and require separate review.

Security tests and input validation do not establish clinical correctness or regulatory approval.
