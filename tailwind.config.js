/** @type {import('tailwindcss').Config} */
module.exports = {
  // 掃描所有會用到 class 的檔案，避免 purge 掉動態產生的類別
  content: ["./index.html", "./parq-form.html", "./*.js"],
  safelist: [
    // script.js 以 ${parqColor} 動態組出的類別（green / yellow / red）
    { pattern: /(bg|border|text)-(green|yellow|red)-(50|200|600|700)/ },
  ],
  theme: { extend: {} },
  plugins: [],
};
