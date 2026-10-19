import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// HTML must point to the matching JS/CSS even when a CDN overrides cache TTLs.
const output = path.resolve(process.argv[2]);
const versioned = new Map();
for (const page of ['index.html', 'parq-form.html']) {
  const htmlPath = path.join(output, page);
  let html = await readFile(htmlPath, 'utf8');
  for (const match of html.matchAll(/\b(?:src|href)=(['"])([^'"]+\.(?:js|css))\1/g)) {
    const url = match[2];
    if (/^(?:[a-z]+:|\/\/)/i.test(url)) continue;
    if (!versioned.has(url)) {
      const source = path.resolve(output, url.replace(/^\//, ''));
      if (!source.startsWith(output + path.sep)) throw new Error(`Asset outside output: ${url}`);
      const bytes = await readFile(source);
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
      const ext = path.extname(source);
      const target = `/assets/app/${path.basename(source, ext)}.${hash}${ext}`;
      await mkdir(path.join(output, 'assets/app'), { recursive: true });
      await writeFile(path.join(output, target.slice(1)), bytes);
      versioned.set(url, target);
    }
  }
  html = html.replace(/\b(src|href)=(['"])([^'"]+)\2/g,
    (match, attr, quote, url) => versioned.has(url) ? `${attr}=${quote}${versioned.get(url)}${quote}` : match);
  await writeFile(htmlPath, html);
}
