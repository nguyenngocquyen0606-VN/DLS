/* ClinPharmAI Hub – lõi thuần (không chạm DOM). Dùng chung cho trình duyệt và bộ kiểm thử Node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HubCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PAGES_DIR = 'pages/';
  var ROUTE_PREFIX = '#/p/';

  // Chuẩn hóa để tìm kiếm không phân biệt dấu, hoa thường, khoảng trắng thừa.
  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function haystack(rec) {
    return norm([rec.title, rec.title_goc, rec.org, rec.year, rec.specialty, (rec.tags || []).join(' ')].join(' '));
  }

  // Mọi từ khóa phải xuất hiện (AND). Truy vấn rỗng trả lại toàn bộ, giữ thứ tự gốc.
  function search(records, query) {
    var terms = norm(query).split(' ').filter(Boolean);
    if (!terms.length) return records.slice();
    return records.filter(function (rec) {
      var h = haystack(rec);
      return terms.every(function (t) { return h.indexOf(t) !== -1; });
    });
  }

  // Gom theo thứ tự nhóm khai báo; record có nhóm lạ bị bỏ (validateCatalog báo lỗi riêng).
  function groupRecords(records, groups) {
    return groups.map(function (g) {
      return { group: g, items: records.filter(function (r) { return r.group === g.id; }) };
    });
  }

  // Thứ tự đọc tuần tự = thứ tự nhóm, rồi thứ tự record trong nhóm.
  function orderedRecords(records, groups) {
    return groupRecords(records, groups).reduce(function (acc, g) { return acc.concat(g.items); }, []);
  }

  function neighbors(ordered, id) {
    var i = -1;
    for (var k = 0; k < ordered.length; k++) if (ordered[k].id === id) { i = k; break; }
    if (i === -1) return { prev: null, next: null, index: -1, total: ordered.length };
    return {
      prev: i > 0 ? ordered[i - 1] : null,
      next: i < ordered.length - 1 ? ordered[i + 1] : null,
      index: i,
      total: ordered.length
    };
  }

  function buildRoute(id) {
    return id ? ROUTE_PREFIX + encodeURIComponent(id) : '#/';
  }

  // Trả { view: 'home' } hoặc { view: 'page', id }. Không kiểm tra id có tồn tại.
  function parseRoute(hash) {
    var h = String(hash || '');
    if (h.indexOf(ROUTE_PREFIX) !== 0) return { view: 'home' };
    var raw = h.slice(ROUTE_PREFIX.length).split(/[?#]/)[0];
    var id;
    try { id = decodeURIComponent(raw); } catch (e) { return { view: 'home' }; }
    return id ? { view: 'page', id: id } : { view: 'home' };
  }

  // Đường dẫn tương đối tới trang; mã hóa khoảng trắng và dấu tiếng Việt trong tên tệp.
  function pageUrl(file) {
    return PAGES_DIR + encodeURIComponent(file);
  }

  // Danh sách "mở gần đây": chỉ lưu id trang, không lưu dữ liệu người bệnh.
  function pushRecent(list, id, max) {
    var out = [id];
    (list || []).forEach(function (x) { if (x !== id && out.length < (max || 6)) out.push(x); });
    return out;
  }

  function validateCatalog(obj) {
    var errs = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['gốc JSON phải là đối tượng'];
    ['version', 'updated', 'source', 'records', 'groups'].forEach(function (k) {
      if (!(k in obj)) errs.push('thiếu trường "' + k + '"');
    });
    if ('version' in obj && !/^\d+\.\d+\.\d+$/.test(String(obj.version))) errs.push('version phải dạng x.y.z');
    if ('updated' in obj && !/^\d{4}-\d{2}-\d{2}$/.test(String(obj.updated))) errs.push('updated phải dạng yyyy-mm-dd');
    if (!String(obj.source || '').trim()) errs.push('source rỗng');
    if (obj.status !== 'verified' && obj.status !== 'unverified') errs.push('status phải là verified hoặc unverified');
    var groupIds = {};
    if (!Array.isArray(obj.groups) || !obj.groups.length) errs.push('groups phải là mảng không rỗng');
    else obj.groups.forEach(function (g) {
      if (!g || !g.id || !g.label) errs.push('group thiếu id hoặc label');
      else if (groupIds[g.id]) errs.push('group trùng id: ' + g.id);
      else groupIds[g.id] = true;
    });
    if (!Array.isArray(obj.records) || !obj.records.length) { errs.push('records phải là mảng không rỗng'); return errs; }
    var seenId = {}, seenFile = {};
    obj.records.forEach(function (r, i) {
      var tag = 'record #' + i + (r && r.id ? ' (' + r.id + ')' : '');
      if (!r || typeof r !== 'object') { errs.push(tag + ': không phải đối tượng'); return; }
      if (!r.id || !/^[a-z0-9-]+$/.test(r.id)) errs.push(tag + ': id phải gồm a-z, 0-9, gạch ngang');
      if (seenId[r.id]) errs.push(tag + ': id trùng');
      seenId[r.id] = true;
      if (!r.file || !/\.html$/i.test(r.file) || /[\/\\]|\.\./.test(r.file)) errs.push(tag + ': file phải là tên tệp .html, không chứa thư mục');
      if (seenFile[r.file]) errs.push(tag + ': file trùng');
      seenFile[r.file] = true;
      if (!String(r.title || '').trim()) errs.push(tag + ': thiếu title');
      if (!String(r.title_goc || '').trim()) errs.push(tag + ': thiếu title_goc');
      if (!groupIds[r.group]) errs.push(tag + ': group không tồn tại "' + r.group + '"');
      if (r.tags != null && !Array.isArray(r.tags)) errs.push(tag + ': tags phải là mảng');
    });
    return errs;
  }

  return {
    norm: norm,
    search: search,
    groupRecords: groupRecords,
    orderedRecords: orderedRecords,
    neighbors: neighbors,
    buildRoute: buildRoute,
    parseRoute: parseRoute,
    pageUrl: pageUrl,
    pushRecent: pushRecent,
    validateCatalog: validateCatalog
  };
});
