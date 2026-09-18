#!/usr/bin/env bash
# 組出 Cloudflare Pages 的靜態輸出目錄 dist/。
# 只複製前端實際引用的檔案（見 index.html / parq-form.html），
# 不含 server.js、.env、*.py 等後端或敏感檔案。
# 用法：bash scripts/build-pages.sh && wrangler pages deploy dist
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"

ASSETS=(
  index.html
  parq-form.html
  script.js
  multi-step-form.js
  parq-script.js
  tailwind.css
  favicon.ico
  favicon.svg
  apple-touch-icon.png
  og-image.png
  _headers
)

mkdir -p "$OUT"
find "$OUT" -mindepth 1 -delete

for f in "${ASSETS[@]}"; do
  if [ ! -f "$ROOT/$f" ]; then
    echo "missing asset: $f" >&2
    exit 1
  fi
  cp "$ROOT/$f" "$OUT/$f"
done

echo "dist/ ready: $(ls "$OUT" | wc -l | tr -d ' ') files"
