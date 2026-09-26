"""Run a browser test with HTTPS and the unmodified production CSP.

Usage: python3 tests/browser/run_https.py tests/browser/test_desktop_layout.py
Requires openssl. The temporary self-signed certificate is deleted on exit.
"""
import os,ssl,subprocess,sys,tempfile
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
if len(sys.argv) < 2:
    raise SystemExit('Usage: run_https.py <test_script.py>')
root=Path(__file__).resolve().parents[2]
csp=next(l.split(':',1)[1].strip() for l in (root/'_headers').read_text().splitlines() if l.strip().startswith('Content-Security-Policy:'))
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def end_headers(self):
        self.send_header('Content-Security-Policy',csp);super().end_headers()
with tempfile.TemporaryDirectory(prefix='exercise-local-tls-') as folder:
    cert=str(Path(folder)/'cert.pem');key=str(Path(folder)/'key.pem')
    subprocess.run(['openssl','req','-x509','-nodes','-newkey','rsa:2048','-keyout',key,'-out',cert,'-days','1','-subj','/CN=127.0.0.1'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)))
    tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);tls.load_cert_chain(cert,key)
    server.socket=tls.wrap_socket(server.socket,server_side=True)
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        env={**os.environ,'BASE_URL':f'https://127.0.0.1:{server.server_port}','PYTHONUNBUFFERED':'1'}
        result=subprocess.run([sys.executable,*sys.argv[1:]],env=env,cwd=root)
    finally:
        server.shutdown();server.server_close();thread.join()
    sys.exit(result.returncode)
