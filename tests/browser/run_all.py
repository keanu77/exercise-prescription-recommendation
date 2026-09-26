"""Run each browser test against this checkout, without reusing an occupied port."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import subprocess
import sys
from threading import Thread

ROOT = Path(__file__).resolve().parents[2]
SITE_CSP = next(line.split(':', 1)[1].strip() for line in (ROOT / '_headers').read_text().splitlines()
                if line.strip().startswith('Content-Security-Policy:'))


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def end_headers(self):
        # Exercise the exact deployment script policy during every browser flow.
        self.send_header('Content-Security-Policy', SITE_CSP)
        super().end_headers()


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
env = {**os.environ, 'BASE_URL': f'http://127.0.0.1:{server.server_port}', 'PYTHONUNBUFFERED': '1'}
failed = []
try:
    tests = [Path(__file__).parent / name for name in sys.argv[1:]] if len(sys.argv) > 1 else sorted(Path(__file__).parent.glob('test_*.py'))
    for test in tests:
        print(f'===== {test.stem} =====', flush=True)
        result = subprocess.run([sys.executable, str(test)], cwd=ROOT, env=env)
        if result.returncode:
            failed.append(test.name)
finally:
    server.shutdown()
    server.server_close()
    thread.join()

print(f'Browser suites: {"PASS" if not failed else "FAIL " + ", ".join(failed)}', flush=True)
sys.exit(bool(failed))
