#!/usr/bin/env bash
# 一鍵跑所有 Playwright 驗證：起靜態伺服器 → 逐支執行 → 關閉。任一失敗回傳非 0。
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PY="${PY:-/usr/bin/python3}"
export PYTHONPATH="${PYTHONPATH:-$HOME/Library/Python/3.9/lib/python/site-packages}"
cd "$ROOT" && python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!; sleep 1; RC=0
for t in test_rules_engine test_ai_flow test_a11y test_frontend_cleanup; do
  echo "===== $t ====="
  "$PY" "tests/browser/$t.py" || RC=1
done
kill $SRV 2>/dev/null
exit $RC
