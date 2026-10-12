/* Site chrome: the ceiling plan (how the site opens and closes), page-to-page iris,
   navigation loading states, per-page pigments. Needs scenes.js for the nine panels. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SC = function () { return (window.Scenes && window.Scenes.list) || []; };

  /* ---------- pigments ---------- */
  (function pigments() {
    var c = (getComputedStyle(doc.body).getPropertyValue('--pg') || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(c)) {
      var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='60' height='18' viewBox='0 0 60 18'><path d='M0 9C10 0 20 0 30 9S50 18 60 9' fill='none' stroke='%23" + c.slice(1) + "' stroke-width='1.1'/><path d='M0 9C10 18 20 18 30 9S50 0 60 9' fill='none' stroke='%23" + c.slice(1) + "' stroke-width='1.1'/></svg>";
      html.style.setProperty('--braid-pg', 'url("data:image/svg+xml;utf8,' + svg + '")');
    }
    var cycle = ['#B5322B', '#2F8F78', '#8A46A8', '#C98A14'];
    Array.prototype.forEach.call(doc.querySelectorAll('.callout'), function (el, i) { el.style.setProperty('--cc', cycle[i % cycle.length]); });
  })();

  /* ---------- which scene is this page? ---------- */
  function currentId() {
    var p = location.pathname.replace(/index\.html$/, '');
    if (doc.querySelector('.error-page')) return 'diluvium';
    if (p === '/' || p === '') return 'adam';
    if (/^\/about/.test(p)) return 'lux';
    if (/^\/projects/.test(p)) return 'sol';
    if (/^\/now/.test(p)) return 'terra';
    if (/^\/contact/.test(p)) return 'eva';
    if (/^\/blog/.test(p)) return 'arbor';
    if (/^\/consulting/.test(p)) return 'noe';
    return null;
  }

  /* ---------- the nine tiles ---------- */
  function tile(sc, i, cur, extra) {
    return '<li class="plan-item' + (extra || '') + '" style="--i:' + i + '"><a class="plan-tile" href="' + sc.href + '"' + (cur === sc.id ? ' aria-current="page"' : '') + '>' +
      '<span class="medallion is-loading" data-tile="' + sc.id + '"><canvas aria-hidden="true"></canvas></span>' +
      '<span class="rn">Scena ' + sc.roman + '</span><span class="pn">' + sc.page + '</span><span class="lt">' + sc.latin + '</span></a></li>';
  }
  function drawTiles(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-tile]'), function (m, i) {
      setTimeout(function () {
        var canvas = m.querySelector('canvas'), id = m.getAttribute('data-tile');
        function done() { m.classList.remove('is-loading'); }
        var ok = window.Scenes.draw(canvas, id, { spacing: 2.2, done: done });
        if (id !== 'adam') done();
        if (!ok) done();
      }, i * 45);
    });
  }

  /* ---------- the ceiling plan overlay ---------- */
  var sheet = null, menuBtn = doc.getElementById('menuBtn'), lastFocus = null, drawn = false;
  function build() {
    sheet = doc.createElement('div');
    sheet.className = 'plan-sheet'; sheet.id = 'planSheet'; sheet.hidden = true;
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'planTitle');
    var cur = currentId();
    sheet.innerHTML =
      '<div class="plan-wrap">' +
      '<div class="plan-head"><div><span class="plan-kicker">The ceiling plan</span><h2 id="planTitle">Nine scenes, nine pages</h2></div><button class="plan-close" type="button">Close</button></div>' +
      '<ol class="plan-grid">' + SC().map(function (s, i) { return tile(s, i, cur); }).join('') + '</ol>' +
      '<p class="plan-foot">After the nine Genesis panels of Michelangelo’s Sistine ceiling, 1508–1512, engraved here in the manner of a banknote.</p>' +
      '</div>';
    doc.body.appendChild(sheet);
    sheet.querySelector('.plan-close').addEventListener('click', close);
    sheet.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = sheet.querySelectorAll('a[href], button'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  function open() {
    if (!window.Scenes) return;
    if (!sheet) build();
    var r = menuBtn.getBoundingClientRect();
    sheet.style.setProperty('--ox', (r.left + r.width / 2) + 'px'); sheet.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
    lastFocus = menuBtn; sheet.hidden = false; html.classList.add('plan-open');
    void sheet.offsetWidth; sheet.classList.add('open'); menuBtn.setAttribute('aria-expanded', 'true');
    if (!drawn) { drawn = true; drawTiles(sheet); }
    setTimeout(function () { var a = sheet.querySelector('[aria-current="page"]') || sheet.querySelector('.plan-tile'); if (a && sheet.classList.contains('open')) a.focus({ preventScroll: true }); }, reduce ? 0 : 700);
  }
  function close() {
    if (!sheet || !sheet.classList.contains('open')) return;
    sheet.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    var finished = false;
    function fin() {
      if (finished) return; finished = true;
      sheet.hidden = true; html.classList.remove('plan-open');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    if (reduce) return fin();
    sheet.addEventListener('transitionend', function te(e) { if (e.target === sheet && e.propertyName === 'clip-path') { sheet.removeEventListener('transitionend', te); fin(); } });
    setTimeout(fin, 1100);
  }
  if (menuBtn) {
    menuBtn.setAttribute('aria-controls', 'planSheet'); menuBtn.setAttribute('aria-haspopup', 'dialog'); menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.addEventListener('click', function () { if (sheet && sheet.classList.contains('open')) close(); else open(); });
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  /* ---------- the same nine, inline on the home page ---------- */
  (function inline() {
    var host = doc.querySelector('[data-plan-inline]');
    if (!host || !window.Scenes) return;
    var cur = currentId();
    host.innerHTML = '<ol class="plan-grid">' + SC().map(function (s, i) { return tile(s, i, cur, ' reveal-item'); }).join('') + '</ol>';
    var go = function () {
      drawTiles(host);
      Array.prototype.forEach.call(host.querySelectorAll('.reveal-item'), function (el) { el.classList.add('in'); });
    };
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { threshold: 0.15 });
      io.observe(host);
    } else { Array.prototype.forEach.call(host.querySelectorAll('.reveal-item'), function (el) { el.classList.remove('reveal-item'); }); go(); }
  })();

  /* ---------- footer: the plan as a strip of panels, alternating large and small ---------- */
  (function strip() {
    var footer = doc.querySelector('.footer'); if (!footer || !window.Scenes) return;
    var cur = currentId(), ul = doc.createElement('ul');
    ul.className = 'plan-strip'; ul.setAttribute('aria-label', 'The ceiling plan');
    ul.innerHTML = SC().map(function (s, i) {
      return '<li class="' + (i % 2 ? 'sm' : 'lg') + '"><a href="' + s.href + '" title="Scena ' + s.roman + ' · ' + s.latin + ' (' + s.page + ')" aria-label="' + s.page + ', scene ' + s.roman + '"' + (cur === s.id ? ' aria-current="page"' : '') + '></a></li>';
    }).join('');
    footer.insertBefore(ul, footer.firstChild);
  })();

  /* ---------- navigating: the iris opens where you clicked; a gold line crosses the top ---------- */
  var bar = doc.createElement('div'); bar.className = 'nav-progress'; bar.setAttribute('aria-hidden', 'true'); doc.body.appendChild(bar);
  var navT = 0;
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.origin !== location.origin || a.hasAttribute('download')) return;
    if (a.pathname === location.pathname && a.search === location.search) return;
    if (/\.(xml|json|pdf)$/i.test(a.pathname)) return;
    var x = e.clientX, y = e.clientY;
    if (!x && !y) { var r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    try { sessionStorage.setItem('vtxy', Math.round(x) + ',' + Math.round(y)); } catch (_) {}
    clearTimeout(navT); navT = setTimeout(function () { html.classList.add('navigating'); }, 140);
  });
  window.addEventListener('pageshow', function () { clearTimeout(navT); html.classList.remove('navigating'); });
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    try {
      var v = sessionStorage.getItem('vtxy');
      if (v) { var p = v.split(','); html.style.setProperty('--vx', p[0] + 'px'); html.style.setProperty('--vy', p[1] + 'px'); sessionStorage.removeItem('vtxy'); }
    } catch (_) {}
  });
})();
