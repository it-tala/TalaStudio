// Run after `npm run build` and before you push: node scripts/verify-build.mjs
// Fails (exit 1) if any built page would show as plain HTML: no stylesheet, a missing or empty
// CSS file, or no design rules in it. No dependencies. Cloudflare serves exactly what is in dist/.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = 'dist';
if (!existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === 'index.html' || name === '404.html') pages.push(p);
  }
})(dist);

const problems = [];
const cssChecked = new Map();

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const label = '/' + relative(dist, page).replace(/\\/g, '/').replace(/index\.html$/, '');
  if (/<meta http-equiv="refresh"/.test(html)) continue; // a switched-off page that only sends visitors on (see disabledPages)
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(\/_astro\/[^"]+\.css)"/g)].map((m) => m[1]);
  const inline = (html.match(/<style[\s>]/g) || []).length;

  if (hrefs.length === 0 && inline === 0) {
    problems.push(`${label}: no stylesheet and no inline styles (would be plain HTML)`);
    continue;
  }
  for (const href of hrefs) {
    if (!cssChecked.has(href)) {
      const file = join(dist, href);
      if (!existsSync(file)) { cssChecked.set(href, 'missing'); }
      else {
        const css = readFileSync(file, 'utf8');
        cssChecked.set(href, css.length < 2000 || !css.includes('--bg') ? 'empty or without design rules' : 'ok');
      }
    }
    if (cssChecked.get(href) !== 'ok') problems.push(`${label}: ${href} is ${cssChecked.get(href)}`);
  }
}

console.log(`Checked ${pages.length} pages and ${cssChecked.size} stylesheet file(s).`);
if (problems.length) {
  console.error('\nPROBLEMS:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log('OK: every page links a real stylesheet with the design rules.');
