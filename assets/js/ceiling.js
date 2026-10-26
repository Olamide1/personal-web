/* The ceiling, to wander. The nine Genesis panels hang in a long vault; the view drifts slowly along it
   and can be dragged, scrolled, or moved with the arrow keys. The panel in the middle comes forward.
   Loaded only when someone asks for it (see fx.js), so it costs nothing until then. Needs scenes.js. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement, win = window;
  var reduce = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUTO = 16;                                              // px per second of slow drift
  var root = null, world, strip, sky, panels = [], list = [], cap = {}, opener = null;
  var x = 0, minX = 0, maxX = 0, vx = 0, dir = 1, target = null, drag = null, moved = 0, auto = true, resume = 0;
  var raf = 0, last = 0, focusIdx = -1, drawn = false, open = false, vw = 0, vh = 0, rt = 0;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  function Chapel(name, a) { if (win.Chapel) win.Chapel.play(name, a); }

  /* ---------- build ---------- */
  function build() {
    list = (win.Scenes && win.Scenes.list) || [];
    root = doc.createElement('div');
    root.className = 'ceil'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'The ceiling, to wander');
    var items = '';
    list.forEach(function (s, i) {
      items += (i ? '<li class="ceil-gem" aria-hidden="true"></li>' : '') +
        '<li class="ceil-panel ' + (i % 2 ? 'sm' : 'lg') + ' is-loading" data-i="' + i + '"><a href="' + s.href + '" aria-label="Scena ' + s.roman + ', ' + s.page + ': ' + s.en + '">' +
        '<canvas aria-hidden="true"></canvas></a><span class="ceil-label" aria-hidden="true"><b>' + s.roman + '</b>' + s.page + '</span></li>';
    });
    root.innerHTML =
      '<div class="ceil-sky" aria-hidden="true"><i></i><i></i></div>' +
      '<div class="ceil-band t" aria-hidden="true"></div><div class="ceil-band b" aria-hidden="true"></div>' +
      '<div class="ceil-head"><div><span class="ceil-kicker">The ceiling</span><p>Drag, scroll or use the arrow keys. Choose a panel to walk into it.</p></div>' +
      '<button class="ceil-close" type="button">Close</button></div>' +
      '<div class="ceil-world"><ol class="ceil-strip" aria-label="The nine scenes">' + items + '</ol></div>' +
      '<div class="ceil-cap" aria-hidden="true"><b></b><span></span><em></em></div>' +
      '<button class="ceil-step prev" type="button" aria-label="Previous scene">&larr;</button><button class="ceil-step next" type="button" aria-label="Next scene">&rarr;</button>';
    doc.body.appendChild(root);
    world = root.querySelector('.ceil-world'); strip = root.querySelector('.ceil-strip'); sky = root.querySelectorAll('.ceil-sky i');
    panels = Array.prototype.slice.call(root.querySelectorAll('.ceil-panel'));
    cap = { b: root.querySelector('.ceil-cap b'), s: root.querySelector('.ceil-cap span'), e: root.querySelector('.ceil-cap em'), box: root.querySelector('.ceil-cap') };

    root.querySelector('.ceil-close').addEventListener('click', close);
    root.querySelector('.ceil-step.prev').addEventListener('click', function () { go(focusIdx - 1); });
    root.querySelector('.ceil-step.next').addEventListener('click', function () { go(focusIdx + 1); });
    panels.forEach(function (p, i) {
      p.querySelector('a').addEventListener('focus', function () { go(i); });
      p.querySelector('a').addEventListener('click', function (e) { if (moved > 6) e.preventDefault(); });   // a drag is not a click
    });

    // drag (mouse, pen or finger), with a little momentum
    root.addEventListener('pointerdown', function (e) {
      if (e.button || (e.target.closest && e.target.closest('button'))) return;
      drag = { x0: e.clientX, cam: x, lx: e.clientX, lt: performance.now(), from: focusIdx }; moved = 0; vx = 0; target = null; stopAuto();
      try { root.setPointerCapture(e.pointerId); } catch (_) {}
      root.classList.add('grab');
    });
    root.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var now = performance.now(), dt = Math.max(1, now - drag.lt);
      moved = Math.max(moved, Math.abs(e.clientX - drag.x0));
      x = clamp(drag.cam - (e.clientX - drag.x0), minX, maxX);
      vx = vx * 0.6 + (-(e.clientX - drag.lx) / dt * 1000) * 0.4; drag.lx = e.clientX; drag.lt = now;
      kick();
    });
    function up() {
      if (!drag) return;
      var swiped = moved > 6, from = drag.from, delta = x - drag.cam; drag = null; root.classList.remove('grab'); setTimeout(function () { moved = 0; }, 0);
      if (swiped) {                                             // a swipe lands on a panel: the one your flick was heading for
        var proj = x + vx * 0.22, best = 0, bd = 1e9;
        panels.forEach(function (p, i) { var d = Math.abs(centreOf(i) - proj); if (d < bd) { bd = d; best = i; } });
        if (best === from && Math.abs(delta) > 40) best = clamp(from + (delta > 0 ? 1 : -1), 0, panels.length - 1);   // any clear swipe moves on
        vx = 0; go(best);
      }
      kick();
    }
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
    root.addEventListener('wheel', function (e) {
      e.preventDefault(); stopAuto(); target = null;
      x = clamp(x + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 1.1, minX, maxX); vx = 0; kick();
    }, { passive: false });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {                                    // keep focus inside the ceiling
        var f = root.querySelectorAll('a[href], button'); if (!f.length) return;
        var first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && doc.activeElement === lastEl) { e.preventDefault(); first.focus(); }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(focusIdx + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(focusIdx - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(list.length - 1); }
      else if (e.key === 'Enter' && doc.activeElement === root) { var a = panels[focusIdx] && panels[focusIdx].querySelector('a'); if (a) a.click(); }
    });
    win.addEventListener('resize', function () { if (!open) return; measure(); clearTimeout(rt); rt = setTimeout(drawAll, 320); });
  }

  /* ---------- geometry and the view ---------- */
  function measure() {
    vw = win.innerWidth; vh = win.innerHeight;
    var c = function (p) { return p.offsetLeft + p.offsetWidth / 2; };
    minX = c(panels[0]); maxX = c(panels[panels.length - 1]);
    x = clamp(x, minX, maxX);
    paint(true);
  }
  function centreOf(i) { var p = panels[clamp(i, 0, panels.length - 1)]; return p.offsetLeft + p.offsetWidth / 2; }
  function go(i) {
    i = clamp(i, 0, panels.length - 1); stopAuto(); vx = 0;
    target = centreOf(i); kick();
  }
  function stopAuto() { auto = false; clearTimeout(resume); resume = setTimeout(function () { auto = true; kick(); }, 6000); }

  function paint(force) {
    world.style.transform = 'translate3d(' + (vw / 2 - x).toFixed(1) + 'px,0,0)';
    var k = x * 0.35, w = 180;
    sky[0].style.transform = 'translate3d(' + (-(k % w)).toFixed(1) + 'px,0,0)';
    sky[1].style.transform = 'translate3d(' + (-((x * 0.15) % 260)).toFixed(1) + 'px,0,0)';
    var best = 0, bd = 1e9;
    panels.forEach(function (p, i) {
      var cx = p.offsetLeft + p.offsetWidth / 2, d = (cx - x) / (vw * 0.55), ad = Math.abs(d);
      if (ad < bd) { bd = ad; best = i; }
      if (reduce) { p.style.transform = ''; return; }
      p.style.transform = 'perspective(1100px) rotateY(' + (clamp(d, -1.4, 1.4) * -16).toFixed(2) + 'deg) scale(' + (1.07 - Math.min(ad, 1.2) * 0.12).toFixed(3) + ')';
    });
    if (best !== focusIdx || force) {
      var was = focusIdx; focusIdx = best;
      panels.forEach(function (p, i) { p.classList.toggle('focus', i === best); });
      var s = list[best]; cap.b.textContent = 'Scena ' + s.roman; cap.s.textContent = s.latin; cap.e.textContent = s.en;
      if (was !== -1 && was !== best) { Chapel('note', best); Chapel('buzz'); }
    }
  }

  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var busy = false;
    if (drag) busy = true;
    else if (target !== null) { x += (target - x) * Math.min(1, dt * 5.5); if (Math.abs(target - x) < 0.6) { x = target; target = null; } busy = true; }
    else if (Math.abs(vx) > 8) { x += vx * dt; vx *= Math.pow(0.05, dt); busy = true; }
    else if (auto && !reduce) { x += dir * AUTO * dt; if (x >= maxX) { x = maxX; dir = -1; } else if (x <= minX) { x = minX; dir = 1; } busy = true; }
    x = clamp(x, minX, maxX);
    paint();
    if (open && !doc.hidden && (busy || auto)) raf = requestAnimationFrame(frame); else last = 0;
  }
  function kick() { if (!raf && open) raf = requestAnimationFrame(frame); }

  /* ---------- drawing the panels (staggered, starting where you are) ---------- */
  function drawAll() {
    if (!win.Scenes) return;
    var order = panels.map(function (p, i) { return i; }).sort(function (a, b) { return Math.abs(a - focusIdx) - Math.abs(b - focusIdx); });
    order.forEach(function (i, n) {
      setTimeout(function () {
        if (!open) return;
        var p = panels[i], cv = p.querySelector('canvas');
        function done() { p.classList.remove('is-loading'); }
        var ok = win.Scenes.draw(cv, list[i].id, { spacing: 2.8, done: done });
        if (list[i].id !== 'adam') done();
        if (!ok) done();
      }, 120 + n * 90);
    });
    drawn = true;
  }

  /* ---------- opening and closing ---------- */
  function openIt(from) {
    if (open) return;
    if (!root) build();
    opener = from || doc.activeElement;
    var r = opener && opener.getBoundingClientRect ? opener.getBoundingClientRect() : { left: win.innerWidth / 2, top: win.innerHeight / 2, width: 0, height: 0 };
    root.style.setProperty('--ox', (r.left + r.width / 2) + 'px'); root.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
    root.hidden = false; open = true; html.classList.add('ceil-open');
    // start on the scene you are standing in
    var path = location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '');
    var here = 0; list.forEach(function (s, i) { var h = s.href.replace(/\.html$/, ''); if (h === path || (h !== '/' && path.indexOf(h) === 0)) here = i; });
    if (path === '' || path === '/') here = 3;
    measure(); focusIdx = -1; x = centreOf(here); paint(true);
    void root.offsetWidth; root.classList.add('open');
    doc.addEventListener('keydown', esc, true);
    Chapel('whoosh', true);
    if (!drawn) drawAll(); else panels.forEach(function (p) { p.classList.remove('is-loading'); });
    last = 0; kick();
    setTimeout(function () { if (open) { var b = root.querySelector('.ceil-close'); if (b) b.focus({ preventScroll: true }); } }, reduce ? 0 : 500);
  }
  function esc(e) { if (e.key === 'Escape') { e.stopPropagation(); e.stopImmediatePropagation(); close(); } }
  function close() {
    if (!open) return;
    open = false; root.classList.remove('open'); doc.removeEventListener('keydown', esc, true);
    cancelAnimationFrame(raf); raf = 0; drag = null;
    Chapel('whoosh', false);
    var done = false;
    function fin() { if (done) return; done = true; root.hidden = true; html.classList.remove('ceil-open'); if (opener && opener.focus) opener.focus({ preventScroll: true }); }
    if (reduce) return fin();
    root.addEventListener('transitionend', function te(e) { if (e.target === root && e.propertyName === 'clip-path') { root.removeEventListener('transitionend', te); fin(); } });
    setTimeout(fin, 1000);
  }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) { last = 0; kick(); } });

  win.Ceiling = { open: openIt, close: close };
})();
