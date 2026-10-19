// Native A4 report layout, independent of browser CSS and viewport size.
// All dimensions are millimetres; Chinese is embedded as selectable text.
function cleanPDFText(value) {
    return String(value ?? '')
        .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
        .replace(/^[\s•✓✅]+/u, '').replace(/\s+/g, ' ').trim();
}

function renderPDFReport(report) {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
    doc.addFileToVFS('ExerciseReportSans.ttf', pdfFontData);
    doc.addFont('ExerciseReportSans.ttf', 'ExerciseReportSans', 'normal');
    doc.setFont('ExerciseReportSans');
    doc.setProperties({ title: report.title, author: '運動醫學科 吳易澄醫師', subject: '個人運動評估報告', creator: '運動處方推薦系統' });
    doc.setLanguage('zh-TW');

    const left = 18, right = 192, width = right - left, bottom = 273;
    // Fit more complete content by tightening whitespace, never the body font.
    const sectionSpace = report.compact ? 9 : 13;
    const sectionGap = report.compact ? 2 : 5;
    const paragraphGap = report.compact ? 1 : 3;
    // The embedded CJK font's full glyph bounds need at least 1.45em leading.
    const lineSpacing = report.compact ? 1.45 : 1.5;
    const rowLeading = report.compact ? 5.4 : 5.6;
    const rowPadding = report.compact ? 3.5 : 7;
    const rowBaseline = report.compact ? 5 : 6;
    const factLeading = report.compact ? 5.4 : 5.5;
    const factGap = report.compact ? 3 : 5;
    const ink = '#202820', muted = '#60675F', line = '#DCE0D7';
    const riskColors = { low: '#306743', moderate: '#855600', high: '#A33030' };
    const riskFills = { low: '#F0F5ED', moderate: '#FAF4E6', high: '#FAEEEE' };
    let y = 0, currentSection = null;
    const font = (size, color = ink) => { doc.setFontSize(size); doc.setTextColor(color); };
    const text = (value, x, baseline, size = 10.5, color = ink) => {
        font(size, color); doc.text(cleanPDFText(value), x, baseline);
    };
    const wrap = (value, maxWidth, size = 10.5) => {
        font(size);
        const cleaned = cleanPDFText(value);
        // Mixed Chinese/numeric prose should wrap by glyph width, rather than
        // treating the entire Chinese sentence after a space as one long word.
        if (report.compact && /[\u3400-\u9fff]/u.test(cleaned)) {
            const lines = []; let line = '';
            for (const char of cleaned) {
                if (line && doc.getTextWidth(line + char) > maxWidth) {
                    lines.push(line.trimEnd()); line = char.trimStart();
                } else line += char;
            }
            if (line) lines.push(line);
            return lines;
        }
        return doc.splitTextToSize(cleaned, maxWidth);
    };
    const rule = (at, color = line) => {
        doc.setDrawColor(color); doc.setLineWidth(0.25); doc.line(left, at, right, at);
    };
    function header(first = false) {
        text(!first && report.compact ? report.title : 'MOVE WITH PURPOSE', left, 17, 10, ink);
        font(9, muted); doc.text(report.date, right, 17, { align: 'right' });
        rule(22, ink);
        doc.setFillColor('#C4D959'); doc.rect(left, 21.4, 14, 1.2, 'F');
        if (first) {
            text(report.title, left, report.compact ? 33 : 37, 22);
            text(report.subtitle, left, report.compact ? 41 : 46, 10, muted);
            y = report.compact ? 48 : 54;
        } else if (report.compact) {
            y = 28;
        } else {
            text(report.title, left, 32, 11, muted);
            y = 41;
        }
    }
    function sectionHeading(continued = false) {
        const heading = currentSection.title + (continued ? '（續）' : '');
        text(heading, left, y + 5, 13);
        rule(y + 8);
        y += sectionSpace;
    }
    function nextPage(continued = true) {
        doc.addPage(); header();
        if (continued && currentSection) sectionHeading(true);
    }
    function ensure(height) {
        if (y + height > bottom) nextPage();
    }
    // Keep ordinary paragraphs intact. Very long paragraphs flow line by line,
    // always inside the printable area, with a repeated section heading.
    function paragraph(value, { bullet = false, size = 10.5, color = ink } = {}) {
        const x = left + (bullet ? 5 : 0);
        const lines = wrap(value, right - x, size);
        const leading = size * 0.352778 * lineSpacing;
        const height = lines.length * leading + paragraphGap;
        ensure(height <= 190 ? height : leading * 2 + paragraphGap);
        lines.forEach((part, index) => {
            ensure(leading + 2);
            if (bullet && index === 0) {
                doc.setFillColor(color); doc.circle(left + 1.1, y + 2.5, 0.65, 'F');
            }
            text(part, x, y + size * 0.352778, size, color);
            y += leading;
        });
        y += paragraphGap;
    }
    function tableRow(label, value) {
        const labelLines = wrap(label, 32, 10);
        const valueLines = wrap(value, width - 43);
        const leading = rowLeading;
        // A row normally stays together; unusually long values can flow over
        // pages, with their label repeated so the context is never lost.
        let offset = 0;
        while (offset < valueLines.length) {
            const remaining = valueLines.length - offset;
            const fullHeight = Math.max(labelLines.length, remaining) * leading + rowPadding;
            if (fullHeight <= 190) ensure(fullHeight);
            else ensure(Math.max(labelLines.length, 2) * leading + rowPadding);
            const count = Math.min(remaining, Math.floor((bottom - y - rowPadding) / leading));
            const rowHeight = Math.max(labelLines.length, count) * leading + rowPadding;
            doc.setFillColor('#F5F6F2'); doc.rect(left, y, 37, rowHeight, 'F');
            labelLines.forEach((part, index) => text(part, left + 3, y + rowBaseline + index * leading, 10, muted));
            valueLines.slice(offset, offset + count).forEach((part, index) => text(part, left + 41, y + rowBaseline + index * leading));
            y += rowHeight; rule(y); offset += count;
            if (offset < valueLines.length) nextPage();
        }
    }
    header(true);
    if (report.notice) {
        const { level, title, body } = report.notice;
        const lines = wrap(body, width - 10);
        const noticeLeading = report.compact ? 5.4 : 5.5;
        const height = (report.compact ? 15 : 17) + lines.length * noticeLeading;
        doc.setFillColor(riskFills[level] || riskFills.low); doc.rect(left, y, width, height, 'F');
        text(title, left + 5, y + 7, 12, riskColors[level]);
        lines.forEach((part, index) => text(part, left + 5, y + 14 + index * noticeLeading));
        y += height + (report.compact ? 4 : 8);
    }
    let disclaimerDrawn = false;
    function drawDisclaimer() {
        currentSection = null;
        const before = report.compact ? 2 : 5;
        const heading = report.compact ? 6 : 8;
        ensure(before + heading + wrap(report.disclaimer, width, 9).length * (9 * 0.352778 * lineSpacing) + paragraphGap);
        rule(y);
        y += before;
        text('使用提醒', left, y + 4, 10, muted);
        y += heading;
        paragraph(report.disclaimer, { size: 9, color: muted });
        disclaimerDrawn = true;
    }
    for (const section of report.sections) {
        if (!section.items?.length) continue;
        // Keep the clinical report disclaimer with its report, before optional appendices.
        if (section.appendix && !disclaimerDrawn) drawDisclaimer();
        currentSection = null;
        if (section.newPage) nextPage(false);
        // Keep a heading with at least the first item, not alone at the page foot.
        const first = section.items[0];
        const firstHeight = section.kind === 'rows'
            ? Math.max(wrap(first[0], 32, 10).length, wrap(first[1], width - 43).length) * rowLeading + rowPadding
            : section.kind === 'facts' ? 13 : wrap(first, width - 5).length * (10.5 * 0.352778 * lineSpacing) + paragraphGap;
        ensure(sectionSpace + (firstHeight <= 190 ? firstHeight : 35));
        currentSection = section;
        sectionHeading();
        if (section.kind === 'facts') {
            for (let i = 0; i < section.items.length; i += 2) {
                const cells = section.items.slice(i, i + 2).map(([label, value]) => ({ label, lines: wrap(value, 56) }));
                const height = Math.max(...cells.map(cell => cell.lines.length)) * factLeading + factGap;
                ensure(height);
                cells.forEach((cell, index) => {
                    const x = left + index * 90;
                    text(cell.label, x, y + 4, 9, muted);
                    cell.lines.forEach((part, j) => text(part, x + 28, y + 4 + j * factLeading));
                });
                y += height;
            }
        } else if (section.kind === 'rows') {
            section.items.forEach(([label, value]) => tableRow(label, value));
        } else {
            section.items.forEach(item => paragraph(item, {
                bullet: section.kind === 'list', color: section.warning ? '#903030' : ink,
            }));
        }
        y += sectionGap;
    }
    if (!disclaimerDrawn) drawDisclaimer();

    const total = doc.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
        doc.setPage(page); rule(281);
        text('運動醫學科 吳易澄醫師  |  sportsmedicine.tw', left, 287, 8, muted);
        font(8, muted); doc.text(`${page} / ${total}`, right, 287, { align: 'right' });
    }
    return doc;
}
