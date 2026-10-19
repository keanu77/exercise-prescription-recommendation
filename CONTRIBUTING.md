# 開發與貢獻 / Contributing

歡迎回報可重現的操作問題、改善無障礙或文件。請使用虛構資料；醫療規則變更需說明依據，不能只以工程測試視為臨床正確。安全漏洞請走 [私密回報](SECURITY.md)，不要開公開 issue。

Reproducible bug reports, accessibility fixes, and documentation improvements are welcome. Use synthetic data. Clinical rule changes need source-based review in addition to tests. Report security issues privately.

## Local setup

Follow [README](README.md#快速開始). Node.js 20+ is required; prefer a currently maintained LTS release. The standard flow works without `.env` or API credentials.

```bash
npm ci
npm test
npm run build:pages
```

`npm run dev` serves only `127.0.0.1`, with an in-memory development KV. It is not a production server. `npm run build:css` is required after editing classes or `src/input.css`; commit the generated `tailwind.css` too.

## Browser and PDF tests

Python 3.10+ and a virtual environment are recommended. Install Poppler using your OS package manager (`brew install poppler` on macOS, or `sudo apt-get install poppler-utils` on Ubuntu).

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install playwright
python -m playwright install chromium
# Ubuntu may need: python -m playwright install --with-deps chromium
PY="$PWD/.venv/bin/python" bash tests/browser/run_all.sh test_form_journey.py test_sports_design.py test_pdf_export.py
```

Omit the filenames to run all suites. The runner starts and stops a local static server with the deployment CSP. PDF checks require `pdftotext` and use simulated AI responses, not paid inference. Some optional WebKit/HTTPS suites need WebKit installed and the HTTPS runner. Do not run `scripts/evaluate-ai.mjs` casually: it makes real provider requests and consumes budget.

## Scope and review

- Keep a PR focused. Describe the user-visible issue, change, and verification.
- Do not change risk classification, exercise doses, consent, or safety copy as an incidental UI refactor. Read `CLAUDE.md` before modifying rules.
- Preserve the full prescription and safety notices in PDF output.
- Do not add patient information, API keys, `.env`, generated audit dumps, or private screenshots to a PR.
- Runtime assets must be listed in `scripts/build-pages.sh` and covered by its existing tests. Documentation media belongs under `docs/media/`, outside the production allowlist.
- Static deployment and GitHub publishing are separate. A PR or release does not update the production website.

## Demo recording

```bash
# Use a clean checkout with no .env and start npm run dev first.
python scripts/record-demo.py --base-url http://127.0.0.1:3000 --output /tmp/exercise-demo
```

The script records a fictional questionnaire and standard PDF export, and asserts that no AI request occurs. FFmpeg is needed to convert WebM into MP4/GIF. See [media notes](docs/media/README.md). Do not record patient sessions or credentials.
