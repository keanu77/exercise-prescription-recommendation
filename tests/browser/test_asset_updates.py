"""A cached old AI script must not break a new result page after deployment."""
import json, os, ssl, subprocess, tempfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
DIST = Path(os.environ.get('BUILT_SITE_DIR', str(ROOT/'dist')))
if 'BUILT_SITE_DIR' not in os.environ:
    subprocess.run(['npm', 'run', 'build:pages'], cwd=ROOT, check=True, capture_output=True)
fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {readFileSync} from 'node:fs';
import {createCoachingResponse} from './tests/helpers/coaching-fixture.mjs';
import {publicCatalog} from './functions/_lib/models.js';
const data=JSON.parse(readFileSync('tests/fixtures/ai-cases.json')).cases[0].data;
const report=createCoachingResponse(data);
console.log(JSON.stringify({data,report,catalog:publicCatalog({GROQ_API_KEY:'fixture'})}));
"""], cwd=ROOT))
CSP = next(line.split(':',1)[1].strip() for line in (ROOT/'_headers').read_text().splitlines() if line.strip().startswith('Content-Security-Policy:'))

class Handler(SimpleHTTPRequestHandler):
    old_script_hits = 0
    ai_requests = 0
    def log_message(self, *_args): pass
    def reply(self, body, content_type, cache='no-store'):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', cache)
        self.end_headers()
        self.wfile.write(body.encode())
    def do_GET(self):
        if self.path == '/warm-cache':
            self.reply('<script src="/ai-ui.js"></script>', 'text/html')
        elif self.path == '/ai-ui.js':
            # Simulate the incompatible script already stored by a previous visit.
            Handler.old_script_hits += 1
            self.reply('window.staleAI = true;', 'application/javascript', 'public, max-age=14400')
        elif self.path == '/api/providers':
            self.reply(json.dumps(fixture['catalog']), 'application/json')
        else:
            super().do_GET()
    def do_POST(self):
        assert self.path == '/api/ai-recommendation'
        payload=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        assert payload['schemaVersion']==3 and payload['provider']=='groq'
        Handler.ai_requests += 1
        self.reply(json.dumps(fixture['report']), 'application/json')
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        super().end_headers()

certificate=tempfile.TemporaryDirectory(prefix='exercise-asset-cache-')
cert=Path(certificate.name)/'cert.pem';key=Path(certificate.name)/'key.pem'
subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','1','-subj','/CN=127.0.0.1'],check=True,capture_output=True)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(DIST)))
tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);tls.load_cert_chain(cert,key)
server.socket=tls.wrap_socket(server.socket,server_side=True)
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'https://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        for engine in os.environ.get('ASSET_BROWSERS','chromium,webkit').split(','):
            browser=getattr(p,engine).launch()
            page=browser.new_page(viewport={'width':390,'height':844},ignore_https_errors=True)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base+'/warm-cache',wait_until='load')
            assert page.evaluate('window.staleAI===true')
            # Confirm real browser cache reuse, with no Playwright routing/cache bypass.
            hits=Handler.old_script_hits
            page.goto(base+'/warm-cache',wait_until='load')
            assert Handler.old_script_hits==hits
            page.goto(base,wait_until='load')
            assert page.evaluate('window.staleAI !== true'), f'{engine}: new page reused incompatible cached AI script'
            assert not errors, errors
            page.evaluate('''data=>{window.lastFormData=data;window.lastPrescription=calculateFITTVP(data);displayPrescriptionSummary(lastPrescription);showPage('resultPage');resetAISection();}''',fixture['data'])
            expect(page.locator('#aiDestination')).to_contain_text('Groq')
            count=Handler.ai_requests
            page.get_by_role('button',name='產生我的行動建議',exact=True).click()
            expect(page.locator('#aiContent')).to_be_visible()
            assert Handler.ai_requests==count+1
            assert page.locator('.ai-report-section').count()==6
            expect(page.get_by_role('button',name='運動處方＆AI分析',exact=True)).to_be_enabled()
            assert not errors,errors
            print(f'[OK] {engine}: retained old cache, new version loads, one click produces full report and enables PDF')
            browser.close()
finally:
    server.shutdown();server.server_close();thread.join();certificate.cleanup()
