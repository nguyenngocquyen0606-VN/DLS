// Kiểm tra trước khi giao (bản Node của validate_cdss.py, thêm kiểm tra riêng cho cổng).
// Dùng: node tools/validate.mjs
//  1. node --check mọi tệp JS của cổng và script nội tuyến trong index.html
//  2. Cân bằng <div>/<style>/<script> trong index.html; id HTML không trùng
//  3. Schema data/*.json (version, updated, source, status, records có id duy nhất)
//  4. Danh mục khớp thư mục pages/: mỗi record có tệp, mỗi tệp có record, title_goc khớp nguyên văn <title>
//  5. Mọi tệp trong SHELL_FILES của sw.js tồn tại
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const C = createRequire(import.meta.url)('../js/core.js');
const errors = [], warns = [];
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

function nodeCheck(file, label) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
  catch (e) { errors.push(`JS ${label}: ${String(e.stderr).split('\n').slice(0, 3).join(' ')}`); }
}

// 1. JS
const jsFiles = ['js/core.js', 'js/app.js', 'sw.js', 'tools/serve.mjs', 'tests/core.test.js'];
jsFiles.forEach((f) => nodeCheck(join(ROOT, f), f));
const html = read('index.html');
const tmp = mkdtempSync(join(tmpdir(), 'hub-'));
let inline = 0;
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/src=|application\/json/i.test(m[1]) || !m[2].trim()) continue;
  const p = join(tmp, `inline${inline++}.js`);
  writeFileSync(p, m[2]);
  nodeCheck(p, `index.html script nội tuyến #${inline}`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`[JS] ${jsFiles.length} tệp + ${inline} script nội tuyến`);

// 2. Thẻ và id
const count = (re) => (html.match(re) || []).length;
const tags = {
  div: [count(/<div\b/gi), count(/<\/div>/gi)],
  style: [count(/<style\b/gi), count(/<\/style>/gi)],
  script: [count(/<script\b/gi), count(/<\/script>/gi)]
};
for (const [t, [o, c]] of Object.entries(tags)) if (o !== c) errors.push(`index.html: <${t}> không cân bằng (${o} mở / ${c} đóng)`);
const stripped = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
const htmlIds = [...stripped.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
const dupIds = htmlIds.filter((x, i) => htmlIds.indexOf(x) !== i);
if (dupIds.length) errors.push(`index.html: id trùng ${[...new Set(dupIds)]}`);
console.log('[Thẻ]', JSON.stringify(tags), `| id: ${htmlIds.length}, trùng: ${dupIds.length}`);

// id được app.js tra bằng $('...') phải có trong index.html
const appIds = [...read('js/app.js').matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]);
const missing = appIds.filter((x) => !htmlIds.includes(x));
if (missing.length) errors.push(`app.js tra id không có trong index.html: ${missing}`);

// 3. Schema dữ liệu
const dataFiles = readdirSync(join(ROOT, 'data')).filter((f) => f.endsWith('.json'));
let catalog;
for (const f of dataFiles) {
  let obj;
  try { obj = JSON.parse(read(join('data', f))); } catch (e) { errors.push(`${f}: không parse được (${e.message})`); continue; }
  C.validateCatalog(obj).forEach((e) => errors.push(`${f}: ${e}`));
  if (obj.status === 'unverified') warns.push(`${f}: dữ liệu CHƯA KIỂM CHỨNG (giao diện đã hiện nhãn)`);
  if (f === 'catalog.json') catalog = obj;
}
console.log(`[JSON] ${dataFiles.length} tệp`);

// 4. Danh mục ↔ pages/
if (catalog) {
  const pageFiles = readdirSync(join(ROOT, 'pages')).filter((f) => /\.html$/i.test(f));
  const listed = new Set(catalog.records.map((r) => r.file));
  for (const r of catalog.records) {
    if (!existsSync(join(ROOT, 'pages', r.file))) { errors.push(`catalog: thiếu tệp pages/${r.file}`); continue; }
    const t = (read(join('pages', r.file)).match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    const title = t == null ? null : t.replace(/\s+/g, ' ').trim();
    if (title !== r.title_goc) errors.push(`catalog ${r.id}: title_goc khác <title> của trang ("${title}")`);
  }
  pageFiles.filter((f) => !listed.has(f)).forEach((f) => errors.push(`pages/${f} chưa có trong danh mục`));
  console.log(`[Danh mục] ${catalog.records.length} record, ${pageFiles.length} tệp trong pages/`);
}

// 5. Tệp lưu sẵn của service worker
const shell = (read('sw.js').match(/SHELL_FILES\s*=\s*\[([\s\S]*?)\]/) || [])[1] || '';
const shellFiles = [...shell.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
shellFiles.filter((f) => !existsSync(join(ROOT, f))).forEach((f) => errors.push(`sw.js: SHELL_FILES thiếu tệp ${f}`));
console.log(`[SW] ${shellFiles.length} tệp khung`);

warns.forEach((w) => console.log('CẢNH BÁO:', w));
errors.forEach((e) => console.log('LỖI:', e));
console.log('KẾT QUẢ:', errors.length ? `${errors.length} LỖI` : 'ĐẠT');
process.exit(errors.length ? 1 : 0);
