#!/usr/bin/env bash
# 組出 Cloudflare Pages 的靜態輸出目錄 dist/。
# 只複製前端實際引用的檔案（見 index.html / parq-form.html），不含 .env、*.py、tests 等。
# functions/ 不需複製：wrangler pages deploy 會從專案根目錄自動帶入。
# 用法：npm run build:pages  →  npm run deploy
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

# 1. 先驗證資產齊全，再動 dist/（避免缺檔時留下半套輸出）
for f in "${ASSETS[@]}"; do
  if [ ! -f "$ROOT/$f" ]; then
    echo "missing asset: $f" >&2
    exit 1
  fi
done

# 2. tailwind.css 是 commit 進 repo 的產物；來源比它新代表忘了 npm run build:css
for src in src/input.css tailwind.config.js; do
  if [ "$ROOT/$src" -nt "$ROOT/tailwind.css" ]; then
    echo "tailwind.css 比 $src 舊，請先執行 npm run build:css 並 commit" >&2
    exit 1
  fi
done

# 3. 語法檢查
for f in script.js multi-step-form.js parq-script.js; do
  node --check "$ROOT/$f"
done

mkdir -p "$OUT"
find "$OUT" -mindepth 1 -delete
for f in "${ASSETS[@]}"; do
  cp "$ROOT/$f" "$OUT/$f"
done

echo "dist/ ready: $(ls "$OUT" | wc -l | tr -d ' ') files"
