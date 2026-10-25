/* ClinPharmAI Hub – phần giao diện. Logic thuần nằm ở js/core.js (HubCore). */
(function () {
  'use strict';
  var C = window.HubCore;
  var KEY = 'cpai-hub:';
  var UNIT_NAMES = { '': 'Khoa Dược lâm sàng', 'phuong-nam': 'BVĐK Phương Nam', 'phuong-chau': 'Phương Châu' };
  var DESKTOP = window.matchMedia('(min-width: 960px)');

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    app: $('app'), nav: $('nav'), q: $('q'), clear: $('btnClear'), count: $('sCount'),
    home: $('home'), viewer: $('viewer'), frame: $('frame'), loader: $('loader'),
    menu: $('btnMenu'), close: $('btnClose'), scrim: $('scrim'),
    crumbGroup: $('crumbGroup'), crumbTitle: $('crumbTitle'),
    actions: $('pageActions'), prev: $('btnPrev'), next: $('btnNext'), reload: $('btnReload'), open: $('btnOpen'),
    net: $('net'), toast: $('toast'), ver: $('ver'), unit: $('unit'), unitName: $('unitName'), main: $('main')
  };

  var state = { catalog: null, byId: {}, groupById: {}, ordered: [], query: '', currentId: null, collapsed: {}, recent: [] };

  // ---------- Lưu tùy chọn (chỉ tùy chọn giao diện và id trang; không lưu dữ liệu người bệnh) ----------
  function load(k, fallback) {
    try { var v = localStorage.getItem(KEY + k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {} }
  function saveRaw(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) {} }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Tô sáng từ khóa trên chuỗi gốc (có dấu) bằng cách so khớp trên bản chuẩn hóa cùng độ dài ký tự.
  function highlight(text, query) {
    var terms = C.norm(query).split(' ').filter(Boolean);
    var src = String(text || '');
    if (!terms.length) return esc(src);
    var chars = Array.from(src);
    var normChars = chars.map(function (ch) { return C.norm(ch) || ch.toLowerCase(); });
    // Chỉ tô khi mỗi ký tự chuẩn hóa thành đúng 1 ký tự, nếu không trả về bản thường.
    if (normChars.some(function (n) { return n.length !== 1; })) return esc(src);
    var flat = normChars.join('');
    var mark = new Array(chars.length).fill(false);
    terms.forEach(function (t) {
      var i = flat.indexOf(t);
      while (i !== -1) { for (var k = i; k < i + t.length; k++) mark[k] = true; i = flat.indexOf(t, i + t.length); }
    });
    var out = '', open = false;
    chars.forEach(function (ch, i) {
      if (mark[i] && !open) { out += '<mark>'; open = true; }
      if (!mark[i] && open) { out += '</mark>'; open = false; }
      out += esc(ch);
    });
    return open ? out + '</mark>' : out;
  }

  function meta(rec) {
    return [rec.org, rec.year, rec.specialty].filter(Boolean).join(' · ');
  }

  // ---------- Sidebar ----------
  function renderNav() {
    var cat = state.catalog;
    var hits = C.search(cat.records, state.query);
    var searching = !!C.norm(state.query);
    var html = '<a class="nav-home" href="#/"' + (state.currentId ? '' : ' aria-current="page"') + '>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7M5 10v10h14V10"/></svg>Trang chủ</a>';
    C.groupRecords(hits, cat.groups).forEach(function (g) {
      if (!g.items.length) return;
      var expanded = searching || !state.collapsed[g.group.id];
      var listId = 'grp-' + g.group.id;
      html += '<div class="grp"><button class="grp-btn" type="button" data-grp="' + esc(g.group.id) + '" aria-expanded="' + expanded + '" aria-controls="' + listId + '">' +
        '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
        esc(g.group.label) + '<span class="cnt">' + g.items.length + '</span></button>' +
        '<ul class="grp-list" id="' + listId + '"' + (expanded ? '' : ' hidden') + '>';
      g.items.forEach(function (r) {
        html += '<li><a class="nav-link" href="' + C.buildRoute(r.id) + '" data-id="' + esc(r.id) + '"' +
          (r.id === state.currentId ? ' aria-current="page"' : '') + ' title="' + esc(r.title_goc) + '">' +
          '<span class="t">' + highlight(r.title, state.query) + '</span>' +
          (meta(r) ? '<span class="m">' + highlight(meta(r), state.query) + '</span>' : '') + '</a></li>';
      });
      html += '</ul></div>';
    });
    if (!hits.length) html += '<div class="nav-empty">Không tìm thấy tài liệu khớp “' + esc(state.query) + '”.</div>';
    el.nav.innerHTML = html;
    el.count.textContent = searching ? hits.length + ' / ' + cat.records.length + ' tài liệu khớp' : '';
    el.clear.hidden = !state.query;
  }

  // ---------- Trang chủ ----------
  function card(r, showGroup) {
    var g = state.groupById[r.group];
    var chips = (showGroup && g ? '<span class="chip acc">' + esc(g.short) + '</span>' : '') +
      [r.org, r.year, r.specialty].filter(Boolean).map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('');
    return '<a class="card" href="' + C.buildRoute(r.id) + '"><span class="t">' + highlight(r.title, state.query) + '</span>' +
      '<span class="o">' + esc(r.title_goc) + '</span>' + (chips ? '<span class="chips">' + chips + '</span>' : '') + '</a>';
  }

  function renderHome() {
    var cat = state.catalog;
    var searching = !!C.norm(state.query);
    var hits = C.search(cat.records, state.query);
    var html = '<div class="hero"><div class="eyebrow">Khoa Dược lâm sàng · ClinPharmAI</div>' +
      '<h1>Cổng tài liệu dược lâm sàng</h1>' +
      '<p>Tra cứu nhanh tóm tắt guideline, tài liệu thông tin thuốc, so sánh dược lý lâm sàng và thẩm định bằng chứng. Chọn tài liệu ở thanh bên trái hoặc gõ <b>/</b> để tìm kiếm không cần dấu.</p>' +
      '<div class="stats"><span class="stat"><b>' + cat.records.length + '</b>tài liệu</span>' +
      cat.groups.map(function (g) {
        var n = cat.records.filter(function (r) { return r.group === g.id; }).length;
        return '<span class="stat"><b>' + n + '</b>' + esc(g.short) + '</span>';
      }).join('') + '</div>' +
      (cat.status === 'unverified' ? '<div class="badge-warn">⚠ Nội dung từng trang chưa được thẩm định lại trong cổng này; đối chiếu nguồn ghi trong trang trước khi áp dụng.</div>' : '') +
      '</div>';

    if (searching) {
      html += '<div class="sec"><h2>Kết quả tìm kiếm <span>' + hits.length + ' tài liệu</span></h2>' +
        (hits.length ? '<div class="grid">' + hits.map(function (r) { return card(r, true); }).join('') + '</div>'
          : '<div class="empty">Không có tài liệu khớp. Thử từ khóa ngắn hơn, ví dụ “statin”, “hen”, “khang sinh”.</div>') + '</div>';
    } else {
      var recent = state.recent.map(function (id) { return state.byId[id]; }).filter(Boolean);
      if (recent.length) {
        html += '<div class="sec"><h2>Mở gần đây</h2><div class="grid">' + recent.map(function (r) { return card(r, true); }).join('') + '</div></div>';
      }
      C.groupRecords(cat.records, cat.groups).forEach(function (g) {
        html += '<div class="sec"><h2>' + esc(g.group.label) + ' <span>' + g.items.length + '</span></h2><div class="grid">' +
          g.items.map(function (r) { return card(r, false); }).join('') + '</div></div>';
      });
    }

    html += '<div class="legal">' +
      '<p><b>Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm</b> (Nghị định 13/2023/NĐ-CP). Đơn vị triển khai chịu trách nhiệm pháp lý và nên đối chiếu với bộ phận pháp chế.</p>' +
      '<p>Cổng chạy hoàn toàn trên trình duyệt: không thu thập, không gửi dữ liệu người bệnh. Chỉ lưu trên máy này tùy chọn giao diện và danh sách id trang mở gần đây.</p>' +
      '<p>Danh mục phiên bản ' + esc(cat.version) + ', cập nhật ' + esc(fmtDate(cat.updated)) + '. Nguồn: ' + esc(cat.source) + '</p>' +
      '</div>';
    el.home.innerHTML = html;
  }

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || '');
  }

  // ---------- Điều hướng ----------
  function route() {
    var r = C.parseRoute(location.hash);
    if (r.view === 'page' && !state.byId[r.id]) {
      toast('Không tìm thấy tài liệu “' + r.id + '”. Đã quay về trang chủ.');
      history.replaceState(null, '', C.buildRoute(null));
      r = { view: 'home' };
    }
    if (r.view === 'home') showHome(); else showPage(state.byId[r.id]);
    renderNav();
  }

  function showHome() {
    state.currentId = null;
    el.viewer.hidden = true;
    el.frame.removeAttribute('src');
    el.home.hidden = false;
    el.actions.hidden = true;
    el.crumbGroup.textContent = 'Trang chủ';
    el.crumbTitle.textContent = 'Cổng tài liệu dược lâm sàng';
    document.title = 'ClinPharmAI Hub';
    renderHome();
  }

  function showPage(rec) {
    var url = C.pageUrl(rec.file);
    var nb = C.neighbors(state.ordered, rec.id);
    var g = state.groupById[rec.group];
    state.currentId = rec.id;
    state.recent = C.pushRecent(state.recent, rec.id, 6);
    save('recent', state.recent);

    el.home.hidden = true;
    el.viewer.hidden = false;
    el.actions.hidden = false;
    el.crumbGroup.textContent = (g ? g.label : '') + ' · ' + (nb.index + 1) + '/' + nb.total;
    el.crumbTitle.textContent = rec.title;
    el.crumbTitle.title = rec.title_goc;
    document.title = rec.title + ' · ClinPharmAI Hub';
    el.open.href = url;
    setNav(el.prev, nb.prev, 'Trang trước');
    setNav(el.next, nb.next, 'Trang sau');

    if (el.frame.getAttribute('src') !== url) {
      el.loader.hidden = false;
      el.frame.setAttribute('src', url);
    }
  }

  function setNav(btn, rec, label) {
    btn.disabled = !rec;
    btn.dataset.id = rec ? rec.id : '';
    btn.title = rec ? label + ': ' + rec.title : label;
    btn.setAttribute('aria-label', btn.title);
  }

  function go(id) { location.hash = C.buildRoute(id); }

  // ---------- Sidebar: mở/đóng ----------
  function isDesktop() { return DESKTOP.matches; }
  function setSidebar(open) {
    if (isDesktop()) {
      el.app.dataset.sidebar = open ? 'open' : 'closed';
      save('sidebar', open);
    } else {
      el.app.dataset.drawer = open ? 'open' : 'closed';
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) setTimeout(function () { el.q.focus(); }, 50);
    }
    syncMenuBtn();
  }
  function sidebarOpen() { return isDesktop() ? el.app.dataset.sidebar === 'open' : el.app.dataset.drawer === 'open'; }
  function syncMenuBtn() { el.menu.setAttribute('aria-expanded', String(sidebarOpen())); }
  function closeDrawerIfMobile() { if (!isDesktop() && el.app.dataset.drawer === 'open') setSidebar(false); }

  // ---------- Thông báo ----------
  var toastTimer;
  function toast(msg, action) {
    clearTimeout(toastTimer);
    el.toast.innerHTML = '<span>' + esc(msg) + '</span>';
    if (action) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = action.label; b.onclick = action.run;
      el.toast.appendChild(b);
    }
    el.toast.hidden = false;
    if (!action) toastTimer = setTimeout(function () { el.toast.hidden = true; }, 4000);
  }

  // ---------- Theme và đơn vị ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    saveRaw('theme', t);
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-set') === t));
    });
  }
  function applyUnit(u) {
    if (u) document.documentElement.setAttribute('data-unit', u); else document.documentElement.removeAttribute('data-unit');
    saveRaw('unit', u);
    el.unit.value = u;
    el.unitName.textContent = UNIT_NAMES[u] || UNIT_NAMES[''];
  }

  // ---------- Sự kiện ----------
  function bind() {
    window.addEventListener('hashchange', route);

    var qTimer;
    el.q.addEventListener('input', function () {
      if (!state.catalog) return;
      clearTimeout(qTimer);
      qTimer = setTimeout(function () {
        state.query = el.q.value;
        renderNav();
        if (!state.currentId) renderHome();
      }, 80);
    });
    el.q.addEventListener('keydown', function (e) {
      if (!state.catalog) return;
      if (e.key === 'Enter') {
        // Tính từ giá trị ô tìm kiếm hiện tại, không đọc DOM (có thể chưa render lại do debounce).
        clearTimeout(qTimer);
        state.query = el.q.value;
        renderNav();
        var first = C.orderedRecords(C.search(state.catalog.records, state.query), state.catalog.groups)[0];
        if (first) { e.preventDefault(); go(first.id); closeDrawerIfMobile(); }
      } else if (e.key === 'ArrowDown') {
        clearTimeout(qTimer);
        state.query = el.q.value;
        renderNav();
        var link = el.nav.querySelector('.nav-link');
        if (link) { e.preventDefault(); link.focus(); }
      } else if (e.key === 'Escape' && el.q.value) {
        e.stopPropagation(); clearSearch();
      }
    });
    el.clear.addEventListener('click', function () { clearSearch(); el.q.focus(); });

    el.nav.addEventListener('click', function (e) {
      var gb = e.target.closest('.grp-btn');
      if (gb) {
        var id = gb.dataset.grp;
        state.collapsed[id] = gb.getAttribute('aria-expanded') === 'true';
        save('collapsed', state.collapsed);
        renderNav();
        var again = el.nav.querySelector('.grp-btn[data-grp="' + id + '"]');
        if (again) again.focus();
        return;
      }
      if (e.target.closest('a')) closeDrawerIfMobile();
    });
    el.nav.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var items = Array.prototype.slice.call(el.nav.querySelectorAll('a, .grp-btn'));
      var i = items.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      if (e.key === 'ArrowUp' && i === 0) { el.q.focus(); return; }
      var n = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      n.focus();
    });
    el.home.addEventListener('click', function (e) { if (e.target.closest('a.card')) el.main.focus({ preventScroll: true }); });

    el.menu.addEventListener('click', function () { setSidebar(!sidebarOpen()); });
    el.close.addEventListener('click', function () { setSidebar(false); el.menu.focus(); });
    el.scrim.addEventListener('click', function () { setSidebar(false); });
    DESKTOP.addEventListener('change', function () {
      el.app.dataset.drawer = 'closed';
      document.body.style.overflow = '';
      syncMenuBtn();
    });

    el.prev.addEventListener('click', function () { if (el.prev.dataset.id) go(el.prev.dataset.id); });
    el.next.addEventListener('click', function () { if (el.next.dataset.id) go(el.next.dataset.id); });
    el.reload.addEventListener('click', function () {
      el.loader.hidden = false;
      try { el.frame.contentWindow.location.reload(); } catch (err) { el.frame.src = el.frame.src; }
    });
    el.frame.addEventListener('load', function () { el.loader.hidden = true; });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (!sidebarOpen()) setSidebar(true);
        el.q.focus(); el.q.select();
      } else if (e.key === 'Escape' && !isDesktop() && el.app.dataset.drawer === 'open') {
        setSidebar(false); el.menu.focus();
      }
    });

    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.addEventListener('click', function () { applyTheme(b.getAttribute('data-theme-set')); });
    });
    el.unit.addEventListener('change', function () { applyUnit(el.unit.value); });

    function net() { el.net.hidden = navigator.onLine; }
    window.addEventListener('online', net);
    window.addEventListener('offline', net);
    net();
  }

  function clearSearch() {
    el.q.value = ''; state.query = '';
    if (!state.catalog) return;
    renderNav();
    if (!state.currentId) renderHome();
  }

  // ---------- Service worker (chỉ khi chạy qua http/https) ----------
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading) return; reloading = true; location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function offer(w) {
        toast('Đã có phiên bản mới của cổng.', { label: 'Cập nhật', run: function () { w.postMessage('skipWaiting'); } });
      }
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
        });
      });
    }).catch(function () { /* không chặn ứng dụng nếu SW lỗi */ });
  }

  // ---------- Khởi động ----------
  function fail(msg) {
    el.home.innerHTML = '<div class="err"><h2 style="margin-top:0">Không tải được danh mục tài liệu</h2><p>' + esc(msg) + '</p>' +
      (location.protocol === 'file:' ?
        '<p>Trình duyệt chặn đọc tệp dữ liệu khi mở trực tiếp <code>index.html</code>. Hãy nhấp đúp <code>Mo-ung-dung.cmd</code> trong thư mục ứng dụng, hoặc dùng bản đã đăng trên GitHub Pages.</p>' :
        '<p>Kiểm tra kết nối mạng rồi tải lại trang.</p>') + '</div>';
    el.nav.innerHTML = '';
  }

  function start(cat) {
    var errs = C.validateCatalog(cat);
    if (errs.length) { fail('Danh mục không hợp lệ: ' + errs.slice(0, 3).join('; ')); return; }
    state.catalog = cat;
    cat.records.forEach(function (r) { state.byId[r.id] = r; });
    cat.groups.forEach(function (g) { state.groupById[g.id] = g; });
    state.ordered = C.orderedRecords(cat.records, cat.groups);
    state.collapsed = load('collapsed', {}) || {};
    state.recent = (load('recent', []) || []).filter(function (id) { return state.byId[id]; });
    el.ver.textContent = 'Danh mục v' + cat.version + ' · ' + fmtDate(cat.updated) + (cat.status === 'unverified' ? ' · chưa kiểm chứng' : '');
    route();
  }

  applyTheme(document.documentElement.getAttribute('data-theme') || 'auto');
  applyUnit(document.documentElement.getAttribute('data-unit') || '');
  if (isDesktop() && load('sidebar', true) === false) el.app.dataset.sidebar = 'closed';
  syncMenuBtn();
  bind();
  registerSW();

  fetch('data/catalog.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(start)
    .catch(function (e) { fail(String(e && e.message || e)); });
})();
