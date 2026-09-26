# Blogger 嵌入版（已封存，2026-09-26）

這兩個檔案是主站早期的 Blogger 嵌入副本，用 Tailwind CDN、沒有 PAR-Q 篩檢，處方邏輯與主站各自漂移，**不再維護、不會部署**（不在 `scripts/build-pages.sh` 白名單內）。

- `blogger_version.html`：表單與結果只有佔位內容，無法完成流程。
- `blogger-embed-code.html`：另一套簡化的處方計算（`generateSimplePrescription`），沒有疾病、限制與 PAR-Q 守門。

要在部落格或其他網站嵌入，請用 iframe 指向線上網址：

```html
<iframe src="https://exerciseprescription.sportsmedicine.tw/" width="100%" height="900" style="border:0" loading="lazy" title="運動處方推薦系統"></iframe>
```

若部落格仍貼著這裡的舊版程式碼，請換成上面的 iframe，否則對外仍是舊邏輯。
