# PDF Chinese font

`ExerciseReportSans-Regular.ttf` is a renamed, static weight-400 subset of
[Noto Sans TC from Google Fonts](https://github.com/google/fonts/tree/main/ofl/notosanstc),
retrieved 2026-09-27. Distributed under the included [SIL Open Font License 1.1](OFL.txt).
The license is also deployed alongside the font. Original copyright/license records are retained.

- Source: `https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf`
- Source SHA-256: `864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f`
- Output SHA-256: `02e34eae9af18d301ae5c3da5711c89996acbf937f75e9610b5532baef18136a`
- Output: 5,962,068 bytes. Downloaded only on first PDF request; reused in the page.
- Covers Latin, general punctuation, common symbols, CJK punctuation/kana,
  CJK Extension A/basic ideographs/compatibility and fullwidth forms.
- Decorative emoji are removed from PDF text; clinical wording stays intact.
- jsPDF embeds only used glyphs in each PDF. Browser web fonts are unrelated.

Rebuild from the repository root with an isolated Python environment containing
`fonttools==4.61.1`:

```sh
python scripts/build-report-font.py /path/to/NotoSansTC-variable.ttf
```

The input should match the source hash above. The upstream main URL can change;
verify its hash rather than silently regenerating from a new font release.
