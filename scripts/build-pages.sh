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
  prescription-rules.js
  ai-ui.js
  multi-step-form.js
  parq-script.js
  pdf-loader.js
  pdf-report.js
  assets/vendor/jspdf.umd.min.js
  assets/fonts/ExerciseReportSans-Regular.ttf
  assets/fonts/OFL.txt
  tailwind.css
  favicon.ico
  favicon.svg
  apple-touch-icon.png
  og-image.png
  _headers
  assets/sports-paper-720.webp
  assets/sports-paper-1440.webp
)

# 1. 先驗證資產齊全，再動 dist/（避免缺檔時留下半套輸出）
for f in "${ASSETS[@]}"; do
  if [ ! -f "$ROOT/$f" ]; then
    echo "missing asset: $f" >&2
    exit 1
  fi
done

# 2. 以實際編譯結果核對已 commit 的 CSS，涵蓋 HTML/JS class 且不依賴 checkout 時間。
TAILWIND_BIN="$ROOT/node_modules/.bin/tailwindcss"
if [ ! -x "$TAILWIND_BIN" ]; then
  echo "找不到 Tailwind CLI，請先執行 npm ci，再重新打包" >&2
  exit 1
fi
CSS_CHECK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/exercise-rx-css.XXXXXX")"
trap 'rm -rf "$CSS_CHECK_DIR"' EXIT
if ! (
  cd "$ROOT"
  "$TAILWIND_BIN" --config ./tailwind.config.js --input ./src/input.css \
    --output "$CSS_CHECK_DIR/tailwind.css" --minify >"$CSS_CHECK_DIR/build.log" 2>&1
); then
  cat "$CSS_CHECK_DIR/build.log" >&2
  echo "Tailwind 編譯失敗，dist/ 尚未變更" >&2
  exit 1
fi
if ! cmp -s "$ROOT/tailwind.css" "$CSS_CHECK_DIR/tailwind.css"; then
  echo "tailwind.css 與目前來源不一致，請先執行 npm run build:css 並 commit" >&2
  exit 1
fi

# 3. 語法檢查
for f in script.js prescription-rules.js ai-ui.js multi-step-form.js parq-script.js pdf-loader.js pdf-report.js; do
  node --check "$ROOT/$f"
done

mkdir -p "$OUT"
find "$OUT" -mindepth 1 -delete
for f in "${ASSETS[@]}"; do
  mkdir -p "$(dirname "$OUT/$f")"
  cp "$ROOT/$f" "$OUT/$f"
done

echo "dist/ ready: $(find "$OUT" -type f | wc -l | tr -d ' ') files"
