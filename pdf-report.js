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
        return doc.splitTextToSize(cleanPDFText(value), maxWidth);
    };
    const rule = (at, color = line) => {
        doc.setDrawColor(color); doc.setLineWidth(0.25); doc.line(left, at, right, at);
    };
    function header(first = false) {
        text('MOVE WITH PURPOSE', left, 17, 10, ink);
        font(9, muted); doc.text(report.date, right, 17, { align: 'right' });
        rule(22, ink);
        doc.setFillColor('#C4D959'); doc.rect(left, 21.4, 14, 1.2, 'F');
        if (first) {
            text(report.title, left, 37, 22);
            text(report.subtitle, left, 46, 10, muted);
            y = 54;
        } else {
            text(report.title, left, 32, 11, muted);
            y = 41;
        }
    }
    function sectionHeading(continued = false) {
        const heading = currentSection.title + (continued ? '（續）' : '');
        text(heading, left, y + 5, 13);
        rule(y + 8);
        y += 13;
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
        const leading = size * 0.352778 * 1.5;
        const height = lines.length * leading + 3;
        ensure(height <= 190 ? height : leading * 2 + 3);
        lines.forEach((part, index) => {
            ensure(leading + 2);
            if (bullet && index === 0) {
                doc.setFillColor(color); doc.circle(left + 1.1, y + 2.5, 0.65, 'F');
            }
            text(part, x, y + size * 0.352778, size, color);
            y += leading;
        });
        y += 3;
    }
    function tableRow(label, value) {
        const labelLines = wrap(label, 32, 10);
        const valueLines = wrap(value, width - 43);
        const leading = 5.6;
        // A row normally stays together; unusually long values can flow over
        // pages, with their label repeated so the context is never lost.
        let offset = 0;
        while (offset < valueLines.length) {
            const remaining = valueLines.length - offset;
            const fullHeight = Math.max(labelLines.length, remaining) * leading + 7;
            if (fullHeight <= 190) ensure(fullHeight);
            else ensure(Math.max(labelLines.length, 2) * leading + 7);
            const count = Math.min(remaining, Math.floor((bottom - y - 7) / leading));
            const rowHeight = Math.max(labelLines.length, count) * leading + 7;
            doc.setFillColor('#F5F6F2'); doc.rect(left, y, 37, rowHeight, 'F');
            labelLines.forEach((part, index) => text(part, left + 3, y + 6 + index * leading, 10, muted));
            valueLines.slice(offset, offset + count).forEach((part, index) => text(part, left + 41, y + 6 + index * leading));
            y += rowHeight; rule(y); offset += count;
            if (offset < valueLines.length) nextPage();
        }
    }
    header(true);
    if (report.notice) {
        const { level, title, body } = report.notice;
        const lines = wrap(body, width - 10);
        const height = 17 + lines.length * 5.5;
        doc.setFillColor(riskFills[level] || riskFills.low); doc.rect(left, y, width, height, 'F');
        text(title, left + 5, y + 7, 12, riskColors[level]);
        lines.forEach((part, index) => text(part, left + 5, y + 14 + index * 5.5));
        y += height + 8;
    }
    let disclaimerDrawn = false;
    function drawDisclaimer() {
        currentSection = null;
        ensure(13 + wrap(report.disclaimer, width, 9).length * 4.7625 + 3);
        rule(y);
        y += 5;
        text('使用提醒', left, y + 4, 10, muted);
        y += 8;
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
            ? Math.max(wrap(first[0], 32, 10).length, wrap(first[1], width - 43).length) * 5.6 + 7
            : section.kind === 'facts' ? 13 : wrap(first, width - 5).length * 5.6 + 3;
        ensure(13 + (firstHeight <= 190 ? firstHeight : 35));
        currentSection = section;
        sectionHeading();
        if (section.kind === 'facts') {
            for (let i = 0; i < section.items.length; i += 2) {
                const cells = section.items.slice(i, i + 2).map(([label, value]) => ({ label, lines: wrap(value, 56) }));
                const height = Math.max(...cells.map(cell => cell.lines.length)) * 5.5 + 5;
                ensure(height);
                cells.forEach((cell, index) => {
                    const x = left + index * 90;
                    text(cell.label, x, y + 4, 9, muted);
                    cell.lines.forEach((part, j) => text(part, x + 28, y + 4 + j * 5.5));
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
        y += 5;
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
