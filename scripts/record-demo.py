"""Record a synthetic, no-AI walkthrough. Requires Python Playwright + FFmpeg.
Start a clean checkout with `npm run dev`, then:
  python scripts/record-demo.py --base-url http://127.0.0.1:3000 --output /tmp/exercise-demo
Never record real patient data, credentials, or a logged-in production session.
"""
import argparse,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url',default='http://127.0.0.1:3000')
parser.add_argument('--output',type=Path,default=Path('/tmp/exercise-demo'))
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)

def card(page,eyebrow,title,body):
 page.set_content(f'''<html lang="zh-Hant"><body style="margin:0;background:#f7f6ee;color:#203f32;font-family:system-ui,'PingFang TC',sans-serif"><main style="padding:105px 90px"><div style="font-size:22px;color:#285575;letter-spacing:3px">{eyebrow}</div><h1 style="font-size:58px;line-height:1.4;margin:36px 0">{title}</h1><div style="height:8px;width:120px;background:#d5ef71;margin-bottom:36px"></div><p style="font-size:27px;line-height:1.8">{body}</p></main></body></html>''')

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(viewport={'width':1280,'height':720},record_video_dir=str(args.output),record_video_size={'width':1280,'height':720},reduced_motion='reduce',accept_downloads=True)
 page=context.new_page();calls=[]
 page.on('request',lambda r:calls.append(r.url) if '/api/ai-recommendation' in r.url else None)
 card(page,'EXERCISE PRESCRIPTION · 開源運動衛教工具','填寫條件，帶走一份運動處方','虛構成人案例示範 · 一般處方與 PDF 不需 AI 金鑰')
 page.wait_for_timeout(3000)
 page.goto(args.base_url,wait_until='networkidle');page.wait_for_timeout(1800)
 page.get_by_role('button',name='開始使用',exact=True).click()
 page.locator('#age').press_sequentially('35',delay=140)
 page.select_option('#gender','male')
 page.locator('#height').press_sequentially('170',delay=100)
 page.locator('#weight').press_sequentially('70',delay=130)
 page.wait_for_timeout(800)
 page.locator('.form-step.active').get_by_role('button',name='下一步').click()
 page.locator('input[name="health_status"][value="healthy"]').check();page.wait_for_timeout(500)
 page.locator('input[name="fitness_level"][value="good"]').check();page.wait_for_timeout(600)
 page.locator('.form-step.active').get_by_role('button',name='下一步').click()
 for i in range(1,8):
  page.locator(f'input[name="parq_q{i}"][value="no"]').check();page.wait_for_timeout(240)
 page.locator('input[name="exercise_habit"][value="moderate"]').check()
 page.locator('input[name="exercise_goal"][value="health"]').check();page.wait_for_timeout(800)
 page.locator('button[type="submit"]').click();expect(page.locator('#resultPage')).to_be_visible()
 page.wait_for_timeout(2200)
 page.locator('#resultPage').get_by_text('FITT-VP 運動原則',exact=False).first.scroll_into_view_if_needed();page.wait_for_timeout(2400)
 page.locator('#downloadPrescription').scroll_into_view_if_needed();page.wait_for_timeout(800)
 with page.expect_download(timeout=30000) as download:page.locator('#downloadPrescription').click()
 download.value.save_as(args.output/'synthetic-prescription.pdf')
 page.wait_for_timeout(1800)
 assert not calls,'Recording must not make an AI request'
 card(page,'TRY IT · FORK IT · BUILD ON IT','完整處方 ＋ 可下載 PDF','Demo：exerciseprescription.sportsmedicine.tw<br>GitHub：keanu77/exercise-prescription-recommendation<br><span style="font-size:21px">繁體中文介面 · AI 為選用補充 · 僅供衛教，不能取代醫療評估</span>')
 page.wait_for_timeout(4000)
 video=page.video
 context.close();video.save_as(args.output/'walkthrough.webm');browser.close()
 print(args.output/'walkthrough.webm')
