"""Responsive sports layout, creator/follow destinations, image and navigation."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765')
OUT = Path.cwd() / '.claude/audit/sports-design-20260927/final'
OUT.mkdir(parents=True, exist_ok=True)
FOLLOW = [
    'https://blog.sportsmedicine.tw/', 'https://www.facebook.com/EthanWuMD/',
    'https://www.instagram.com/ethan77wu/', 'https://github.com/keanu77',
    'https://line.me/R/ti/p/@521cvffb', 'https://sportsmedicine.tw/',
]

def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), page.url

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in [320, 390, 768, 1440]:
        page = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for path in ['/', '/parq-form.html']:
            page.goto(BASE.rstrip('/') + path, wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            no_overflow(page)
            assert page.locator('h1').count() == 1
            author = page.locator('.site-author')
            expect(author).to_have_attribute('href', 'https://sportsmedicine.tw/')
            expect(author).to_be_visible()
            assert author.bounding_box()['y'] < 100
            links = page.locator('.home-follow a')
            assert links.evaluate_all('(els) => els.map(el => el.href)') == FOLLOW
            for link in links.all():
                box = link.bounding_box()
                assert box['width'] >= 44 and box['height'] >= 44
                assert link.get_attribute('aria-label')
                assert 'noopener' in link.get_attribute('rel')
            hero = page.locator('.hero-visual img')
            assert hero.evaluate('(el) => el.complete && el.naturalWidth > 0')
            assert hero.get_attribute('width') and hero.get_attribute('height')
            assert hero.get_attribute('alt')
            if width <= 390:
                assert '720.webp' in hero.evaluate('(el) => el.currentSrc')
            # Tab-first skip link is usable and the primary action remains above the fold.
            page.keyboard.press('Tab')
            expect(page.get_by_role('link', name='跳至主要內容')).to_be_focused()
            start = page.get_by_role('button', name='開始使用' if path == '/' else '開始評估', exact=True)
            box = start.bounding_box()
            assert box['y'] + box['height'] < 844
            page.locator('body').click(position={'x': 1, 'y': 1})
            page.screenshot(path=str(OUT / f'{"home" if path == "/" else "parq"}-{width}.png'), full_page=True)
            start.click()
            no_overflow(page)
            expect(page.locator('#age')).to_be_visible()
            if path == '/':
                page.fill('#age', '35'); page.select_option('#gender', 'male')
                page.fill('#height', '170.5'); page.fill('#weight', '70.5')
                expect(page.locator('#progressText')).to_have_text('27%')
                page.evaluate('window.scrollTo(0,0)')
                page.screenshot(path=str(OUT / f'form-{width}.png'), full_page=True)
                page.locator('.form-step.active').get_by_role('button', name='下一步').click()
                no_overflow(page)
                if width == 1440:
                    page.get_by_role('link', name='使用流程', exact=True).click()
                    expect(page.locator('#how-it-works')).to_be_in_viewport()
                    expect(page.locator('#how-it-works')).to_be_focused()
                    page.get_by_role('button', name='開始使用', exact=True).click()
                    expect(page.locator('#age')).to_have_value('35')
            print(f'[OK] {path} {width}px: image, creator, 6 follow links, touch targets, skip link and start flow')
        assert not errors, errors
        page.close()
    browser.close()
