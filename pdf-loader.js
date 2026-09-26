// 兩入口共用：按需載入、合併同時請求，失敗後可重試。
let pdfLibrariesPromise = null;
const pdfScriptLoads = new Map();

function loadPDFLibraries() {
    if (window.jspdf?.jsPDF && typeof window.html2canvas === 'function') {
        return Promise.resolve();
    }
    if (pdfLibrariesPromise) return pdfLibrariesPromise;
    pdfLibrariesPromise = Promise.all([
        window.jspdf?.jsPDF || loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                   'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk'),
        window.html2canvas || loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
                   'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H')
    ]).finally(() => {
        pdfLibrariesPromise = null;
    });
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
        script.onload = resolve;
        script.onerror = () => {
            script.remove();
            pdfScriptLoads.delete(src);
            reject(new Error('PDF 元件載入失敗，請稍後再試。'));
        };
        document.head.appendChild(script);
    });
    pdfScriptLoads.set(src, pending);
    return pending;
}
