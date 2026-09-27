// 兩入口共用：按需載入、合併同時請求，失敗後可重試。
let pdfLibrariesPromise = null;
const pdfScriptLoads = new Map();

let pdfFontData = null;
let pdfFontPromise = null;

function loadPDFFont() {
    if (pdfFontData) return Promise.resolve(pdfFontData);
    if (pdfFontPromise) return pdfFontPromise;
    pdfFontPromise = fetch('assets/fonts/ExerciseReportSans-Regular.ttf', {signal:AbortSignal.timeout(20000)})
        .then(response => {
            if (!response.ok) throw new Error('PDF 字型載入失敗，請稍後再試。');
            return response.arrayBuffer();
        })
        .then(buffer => {
            const bytes = new Uint8Array(buffer);
            // TrueType sfnt header. Fail visibly instead of exporting missing text.
            if (bytes.length < 12 || bytes[0] !== 0 || bytes[1] !== 1 || bytes[2] !== 0 || bytes[3] !== 0) {
                throw new Error('PDF 字型格式錯誤，請重新載入頁面後再試。');
            }
            const chunks = [];
            for (let i = 0; i < bytes.length; i += 8192) {
                chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
            }
            pdfFontData = chunks.join('');
            return pdfFontData;
        }).finally(() => { pdfFontPromise = null; });
    return pdfFontPromise;
}

function loadPDFLibraries() {
    if (window.jspdf?.jsPDF && pdfFontData) return Promise.resolve();
    if (pdfLibrariesPromise) return pdfLibrariesPromise;
    pdfLibrariesPromise = Promise.all([
        window.jspdf?.jsPDF || loadScript('assets/vendor/jspdf.umd.min.js',
                   'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk'),
        loadPDFFont()
    ]).finally(() => { pdfLibrariesPromise = null; });
    return pdfLibrariesPromise;
}

function loadScript(src, integrity) {
    if (pdfScriptLoads.has(src)) return pdfScriptLoads.get(src);
    const pending = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        if (integrity) {
            script.integrity = integrity;
            script.crossOrigin = 'anonymous';
        }
        const failed = () => {
            clearTimeout(timer);
            script.remove();
            pdfScriptLoads.delete(src);
            reject(new Error('PDF 元件載入失敗，請稍後再試。'));
        };
        const timer = setTimeout(failed, 20000);
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = failed;
        document.head.appendChild(script);
    });
    pdfScriptLoads.set(src, pending);
    return pending;
}
