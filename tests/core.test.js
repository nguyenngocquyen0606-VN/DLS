// Bộ ca kiểm thử cho js/core.js. Chạy: node tests/core.test.js
const path = require('path');
const fs = require('fs');
const C = require('../js/core.js');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'catalog.json'), 'utf8'));

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ` | nhận ${a}, mong đợi ${e}`));
}
const ids = (list) => list.map((r) => r.id);

// --- norm: bỏ dấu, đ/Đ, hoa thường, khoảng trắng ---
eq('norm bỏ dấu', C.norm('Đái Tháo Đường'), 'dai thao duong');
eq('norm gộp khoảng trắng', C.norm('  hen   phế quản '), 'hen phe quan');
eq('norm null -> rỗng', C.norm(null), '');
eq('norm undefined -> rỗng', C.norm(undefined), '');
eq('norm số', C.norm(2026), '2026');
eq('norm dạng tổ hợp (NFD) và dựng sẵn (NFC) cho cùng kết quả', C.norm('Thiếu sắt'.normalize('NFD')), C.norm('Thiếu sắt'.normalize('NFC')));

// --- search ---
const R = catalog.records;
eq('truy vấn rỗng trả toàn bộ', C.search(R, '').length, R.length);
eq('truy vấn chỉ khoảng trắng trả toàn bộ', C.search(R, '   ').length, R.length);
eq('không dấu khớp có dấu', ids(C.search(R, 'dai thao duong')), ['ada-easd-2026-dtd-tip-2', 'dtd-2023-2026-bao-ve-co-quan']);
eq('có dấu khớp như không dấu', ids(C.search(R, 'Đái tháo đường')), ids(C.search(R, 'dai thao duong')));
eq('không phân biệt hoa thường', ids(C.search(R, 'ppi')), ids(C.search(R, 'PPI')));
eq('nhiều từ = AND', ids(C.search(R, 'azithromycin bjog')), ['ebm-azithro-bjog-sr']);
eq('tìm theo tổ chức', ids(C.search(R, 'GINA')), ['gina-2026-hen']);
eq('tìm theo tag', ids(C.search(R, 'meropenem')), ['meronem-iv', 'so-sanh-carbapenem']);
eq('tìm theo title_goc', ids(C.search(R, 'Visual Clinical Hub')).length, 3);
eq('không khớp trả rỗng', C.search(R, 'xyz-khong-co').length, 0);
eq('search không làm đổi mảng gốc', (() => { const before = ids(R); C.search(R, 'hen'); return ids(R); })(), ids(R));
eq('search trả mảng mới khi rỗng', C.search(R, '') !== R, true);

// --- groupRecords / orderedRecords ---
const groups = C.groupRecords(R, catalog.groups);
eq('số nhóm', groups.length, catalog.groups.length);
eq('tổng record sau gom = tổng record', groups.reduce((n, g) => n + g.items.length, 0), R.length);
eq('đếm từng nhóm', groups.map((g) => g.items.length), [12, 3, 5, 2]);
eq('tìm KDIGO', ids(C.search(R, 'kdigo')), ['kdigo-2026-aki-akd']);
eq('tìm không dấu "ton thuong than cap"', ids(C.search(R, 'ton thuong than cap')), ['kdigo-2026-aki-akd']);
eq('tìm "viem bang quang"', ids(C.search(R, 'viem bang quang')), ['eau-2026-uti']);
const ordered = C.orderedRecords(R, catalog.groups);
eq('ordered đủ record', ordered.length, R.length);
eq('record có nhóm lạ bị bỏ khi gom', C.groupRecords([{ id: 'x', group: 'khong-co' }], catalog.groups).every((g) => g.items.length === 0), true);

// --- neighbors ---
eq('trang đầu không có prev', C.neighbors(ordered, ordered[0].id).prev, null);
eq('trang đầu next = thứ 2', C.neighbors(ordered, ordered[0].id).next.id, ordered[1].id);
eq('trang cuối không có next', C.neighbors(ordered, ordered[ordered.length - 1].id).next, null);
eq('trang giữa index đúng', C.neighbors(ordered, ordered[5].id).index, 5);
eq('id lạ -> index -1', C.neighbors(ordered, 'khong-co').index, -1);
eq('danh sách rỗng', C.neighbors([], 'a'), { prev: null, next: null, index: -1, total: 0 });

// --- route ---
eq('buildRoute id', C.buildRoute('so-sanh-ppi'), '#/p/so-sanh-ppi');
eq('buildRoute null -> trang chủ', C.buildRoute(null), '#/');
eq('parseRoute rỗng', C.parseRoute(''), { view: 'home' });
eq('parseRoute #/', C.parseRoute('#/'), { view: 'home' });
eq('parseRoute trang', C.parseRoute('#/p/gina-2026-hen'), { view: 'page', id: 'gina-2026-hen' });
eq('parseRoute bỏ query', C.parseRoute('#/p/gina-2026-hen?x=1'), { view: 'page', id: 'gina-2026-hen' });
eq('parseRoute id rỗng -> trang chủ', C.parseRoute('#/p/'), { view: 'home' });
eq('parseRoute mã hóa hỏng -> trang chủ', C.parseRoute('#/p/%E0%A4%A'), { view: 'home' });
eq('parseRoute khứ hồi', C.parseRoute(C.buildRoute('ab-c')).id, 'ab-c');
eq('parseRoute hash lạ -> trang chủ', C.parseRoute('#abc'), { view: 'home' });

// --- pageUrl: tên tệp có khoảng trắng và dấu ---
eq('pageUrl thường', C.pageUrl('a-b.html'), 'pages/a-b.html');
eq('pageUrl mã hóa khoảng trắng + dấu', C.pageUrl('Guideline đái tháo đường 2023 2026.html'),
  'pages/Guideline%20%C4%91%C3%A1i%20th%C3%A1o%20%C4%91%C6%B0%E1%BB%9Dng%202023%202026.html');

// --- pushRecent ---
eq('recent thêm đầu', C.pushRecent(['a', 'b'], 'c', 6), ['c', 'a', 'b']);
eq('recent không trùng', C.pushRecent(['a', 'b', 'c'], 'b', 6), ['b', 'a', 'c']);
eq('recent giới hạn', C.pushRecent(['a', 'b', 'c'], 'd', 3), ['d', 'a', 'b']);
eq('recent từ null', C.pushRecent(null, 'a', 6), ['a']);

// --- validateCatalog ---
eq('catalog thật hợp lệ', C.validateCatalog(catalog), []);
const bad = JSON.parse(JSON.stringify(catalog));
bad.records[1].id = bad.records[0].id;
eq('bắt id trùng', C.validateCatalog(bad).some((e) => /id trùng/.test(e)), true);
const bad2 = JSON.parse(JSON.stringify(catalog));
bad2.records[0].file = '../x.html';
eq('bắt file chứa thư mục', C.validateCatalog(bad2).some((e) => /file phải/.test(e)), true);
const bad3 = JSON.parse(JSON.stringify(catalog));
bad3.records[0].group = 'khong-co';
eq('bắt nhóm không tồn tại', C.validateCatalog(bad3).some((e) => /group không tồn tại/.test(e)), true);
eq('bắt version sai', C.validateCatalog({ ...catalog, version: '1.0' }).some((e) => /version/.test(e)), true);
eq('bắt updated sai', C.validateCatalog({ ...catalog, updated: '25/10/2026' }).some((e) => /updated/.test(e)), true);
eq('bắt source rỗng', C.validateCatalog({ ...catalog, source: ' ' }).some((e) => /source/.test(e)), true);
eq('bắt status sai', C.validateCatalog({ ...catalog, status: 'ok' }).some((e) => /status/.test(e)), true);
eq('bắt records rỗng', C.validateCatalog({ ...catalog, records: [] }).some((e) => /records/.test(e)), true);
eq('gốc là mảng', C.validateCatalog([]), ['gốc JSON phải là đối tượng']);

console.log(`\nTổng: ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
