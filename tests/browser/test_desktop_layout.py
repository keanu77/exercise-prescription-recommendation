"""Hero first paint, image geometry and readable desktop layout, with font fallback.

Set LAYOUT_BROWSERS=chromium,webkit for the release browser matrix.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765')
OUT = Path(os.environ.get('LAYOUT_SCREENSHOTS', '.claude/audit/layout-rework-20260927/verified'))
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    for engine in os.environ.get('LAYOUT_BROWSERS', 'chromium').split(','):
        browser = getattr(p, engine).launch(headless=True)
        for width, fonts in [(1024, True), (1280, True), (1440, True), (1920, True), (1024, False), (1440, False)]:
            page = browser.new_page(viewport={'width': width, 'height': 900}, reduced_motion='no-preference',
                                    ignore_https_errors=BASE.startswith('https://127.0.0.1:'))
            if not fonts:
                page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
                page.route('https://fonts.gstatic.com/**', lambda route: route.abort())
            for path in ['/', '/parq-form.html']:
                page.goto(BASE.rstrip('/') + path, wait_until='domcontentloaded')
                # The headline and photograph must not start invisible behind an animation.
                assert page.locator('.hero-copy, .hero-visual').evaluate_all(
                    '(els) => els.every(el => Number(getComputedStyle(el).opacity) === 1)')
                page.wait_for_load_state('networkidle')
                page.evaluate('document.fonts.ready')
                image = page.locator('.hero-visual img')
                assert image.evaluate('(el) => el.complete && el.naturalWidth > 0')
                photo = image.bounding_box()
                hero = page.locator('.landing-hero').bounding_box()
                copy = page.locator('.hero-copy').bounding_box()
                assert abs(photo['width'] / photo['height'] - 1.5) < .01, 'Preserve the full 3:2 image'
                assert photo['x'] >= copy['x'] + copy['width'] + 20, 'Desktop columns overlap'
                assert photo['x'] + photo['width'] <= hero['x'] + hero['width']
                assert hero['y'] + hero['height'] <= 760, 'Hero extends beyond the desktop first screen'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                for selector in ['.brand', '.site-author', '.nav-links', '.hero-copy', '.hero-visual', '.home-follow']:
                    assert page.locator(selector).evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), selector
                author = page.locator('.site-author').bounding_box()
                nav = page.locator('.nav-links').bounding_box()
                assert nav['x'] + nav['width'] <= author['x'], 'Navigation and creator overlap'
                # macOS WebKit uses Option-Tab to include links in keyboard navigation.
                page.keyboard.press('Alt+Tab' if engine == 'webkit' else 'Tab')
                expect(page.get_by_role('link', name='跳至主要內容')).to_be_focused()
                page.keyboard.press('Enter')
                expect(page.locator('#mainContent')).to_be_focused()
                start = page.get_by_role('button', name='開始使用' if path == '/' else '開始評估', exact=True)
                expect(start).to_be_in_viewport()
                page.evaluate('document.activeElement.blur(); scrollTo(0,0)')
                suffix = 'fonts' if fonts else 'fallback'
                prefix = 'home' if path == '/' else 'parq'
                page.screenshot(path=str(OUT / f'{engine}-{prefix}-{width}-{suffix}.png'), full_page=True)
                start.click()
                expect(page.locator('#age')).to_be_visible()
                print(f'[OK] {engine} {path} {width}px {suffix}: first paint, photo ratio, columns, header, skip link and start')
            page.close()
        browser.close()
