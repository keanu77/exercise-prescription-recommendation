"""Preserve established typography, spacing and risk colors across compiler updates."""
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765')
with sync_playwright() as p:
    browser = getattr(p, os.environ.get('TAILWIND_BROWSER', 'chromium')).launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce',
                            ignore_https_errors=BASE.startswith('https://127.0.0.1:'))
    page.goto(BASE, wait_until='networkidle')
    result = page.evaluate('''() => {
      const root=document.createElement('section');
      root.innerHTML=`<p class="text-lg" style="font-size:14px">Existing smaller component text</p>
        <div class="space-y-6"><div style="height:10px"></div><div class="mt-8" style="height:10px"></div></div>
        <div class="bg-green-50 border-green-200 text-green-700"></div>
        <div class="bg-yellow-50 border-yellow-200 text-yellow-700"></div>
        <div class="bg-red-50 border-red-200 text-red-700"></div>
        <div class="bg-[#0003]"></div>`;
      document.body.append(root);
      const c=el=>getComputedStyle(el), blocks=root.children;
      const spaced=blocks[1].children;
      const result={lineHeight:c(blocks[0]).lineHeight,
        spacing:spaced[1].getBoundingClientRect().top-spaced[0].getBoundingClientRect().bottom,
        colors:[2,3,4].map(i=>[c(blocks[i]).backgroundColor,c(blocks[i]).borderTopColor,c(blocks[i]).color]),
        overlay:c(blocks[5]).backgroundColor};
      root.remove();return result;
    }''')
    assert result['lineHeight'] == '28px', result
    assert result['spacing'] == 24, result
    assert result['colors'] == [
        ['rgb(240, 253, 244)', 'rgb(187, 247, 208)', 'rgb(21, 128, 61)'],
        ['rgb(254, 252, 232)', 'rgb(254, 240, 138)', 'rgb(161, 98, 7)'],
        ['rgb(254, 242, 242)', 'rgb(254, 202, 202)', 'rgb(185, 28, 28)'],
    ], result
    assert result['overlay'] == 'rgba(0, 0, 0, 0.2)', result
    print('[OK] original line height, sibling spacing, three risk palettes and translucent overlay')
    browser.close()
