#!/usr/bin/env bash
# 使用獨立的暫時埠號；結束時由 Python 關閉自己的伺服器。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PY="${PY:-/usr/bin/python3}"
export PYTHONPATH="${PYTHONPATH:-$HOME/Library/Python/3.9/lib/python/site-packages}"
exec "$PY" "$ROOT/tests/browser/run_all.py" "$@"
