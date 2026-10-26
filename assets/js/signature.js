/* One moment of its own for three pages (loaded by fx.js, only on these pages):
   About    (Scena I, light from darkness)     a divider sweeps the engraving: light on one side, night on the other.
   Projects (Scena II, the sun and the moon)   a sun travels down the list and lights each project as it passes.
   Now      (Scena III, land from water)       a tide stands over the page and ebbs as you read down it. */
(function () {
  'use strict';
  var doc = document, win = window;
  var reduce = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var path = location.pathname.replace(/\.html$/, '');
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  function make(tag, cls, parent) { var e = doc.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true'); if (parent) parent.appendChild(e); return e; }
  function chapel(name, a) { if (win.Chapel) win.Chapel.play(name, a); }

  /* ================= About: the separation of light from darkness ================= */
  function about() {
    var art = doc.querySelector('.art.banner[data-scene="lux"]');
    var base = art && art.querySelector('canvas');
    if (!base) return;
    var night = make('div', 'lux-night', art), nc = doc.createElement('canvas'), line = make('div', 'lux-line', art);
    nc.setAttribute('aria-hidden', 'true'); night.appendChild(nc);
    make('span', 'lux-tag l', art).textContent = 'Lux';
    make('span', 'lux-tag r', art).textContent = 'Tenebrae';
    var nctx = nc.getContext('2d'), w = 0, cut = 0, px = null, visible = false, raf = 0, t = 0, last = 0, lastCopy = 0, idleT = 0;

    function copy() {
      if (nc.width !== base.width || nc.height !== base.height) { nc.width = base.width; nc.height = base.height; }
      nctx.drawImage(base, 0, 0);
    }
    function place() {
      night.style.transform = 'translate3d(' + cut.toFixed(1) + 'px,0,0)';
      nc.style.transform = 'translate3d(' + (-cut).toFixed(1) + 'px,0,0)';
      line.style.transform = 'translate3d(' + cut.toFixed(1) + 'px,0,0)';
    }
    function frame(now) {
      raf = 0;
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; t += dt;
      w = art.clientWidth;
      var goal = px !== null ? px : w * (0.5 + 0.36 * Math.sin(t * 0.42));     // left to itself, the line sweeps back and forth
      if (reduce) goal = w * 0.62;
      cut += (goal - cut) * (px !== null ? 0.22 : 0.06);
      place();
      if (now - lastCopy > 45) { lastCopy = now; copy(); }
      if (visible && !doc.hidden) raf = requestAnimationFrame(frame); else last = 0;
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
    function at(e) { var r = art.getBoundingClientRect(); px = clamp(e.clientX - r.left, 0, r.width); clearTimeout(idleT); kick(); }
    function release() { clearTimeout(idleT); idleT = setTimeout(function () { px = null; }, 1800); }
    art.addEventListener('pointermove', at);
    art.addEventListener('pointerdown', at);
    art.addEventListener('pointerleave', function () { px = null; });
    art.addEventListener('pointerup', release); art.addEventListener('pointercancel', release);
    if ('IntersectionObserver' in win) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { last = 0; kick(); } }, { threshold: 0.1 }).observe(art);
    } else { visible = true; kick(); }
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) { last = 0; kick(); } });
    w = art.clientWidth; cut = w * 0.5; place();
  }

  /* ================= Projects: the sun passes over each one ================= */
  function projects() {
    var cards = Array.prototype.slice.call(doc.querySelectorAll('.project'));
    if (cards.length < 2) return;
    var rail = make('div', 'sun-rail', doc.body), orb = make('i', 'sun-orb', rail);
    cards.forEach(function (c, i) {
      var n = c.querySelector('.medal b'), tick = make('span', 'sun-tick', rail);
      tick.style.top = (i / (cards.length - 1) * 100) + '%'; tick.textContent = n ? n.textContent : '';
    });
    var lit = -1, pend = false;
    function update() {
      pend = false;
      var y = win.innerHeight * 0.45, centres = cards.map(function (c) { var r = c.getBoundingClientRect(); return r.top + r.height / 2; });
      var frac = 0;
      if (y >= centres[centres.length - 1]) frac = cards.length - 1;
      else if (y > centres[0]) { for (var i = 0; i < centres.length - 1; i++) if (y >= centres[i] && y < centres[i + 1]) { frac = i + (y - centres[i]) / (centres[i + 1] - centres[i]); break; } }
      orb.style.top = (frac / (cards.length - 1) * 100) + '%';
      rail.classList.toggle('moon', frac > cards.length - 1.15);
      var first = cards[0].getBoundingClientRect(), lastC = cards[cards.length - 1].getBoundingClientRect();
      rail.classList.toggle('on', first.top < win.innerHeight * 0.8 && lastC.bottom > win.innerHeight * 0.2);
      var near = Math.round(frac);
      if (near !== lit) {
        if (lit !== -1) chapel('note', near);
        lit = near; cards.forEach(function (c, i) { c.classList.toggle('lit', i === near); });
      }
    }
    function onScroll() { if (!pend) { pend = true; requestAnimationFrame(update); } }
    win.addEventListener('scroll', onScroll, { passive: true }); win.addEventListener('resize', onScroll);
    update();
  }

  /* ================= Now: the tide ebbs as you read ================= */
  function now() {
    if (reduce) return;
    var tide = make('div', 'tide', doc.body);
    make('i', 'tide-wave a', tide); make('i', 'tide-wave b', tide); make('i', 'tide-body', tide);
    var pend = false;
    function update() {
      pend = false;
      var max = doc.documentElement.scrollHeight - win.innerHeight, p = max > 20 ? clamp((win.pageYOffset || 0) / (max * 0.85), 0, 1) : 0.35;
      tide.style.transform = 'translate3d(0,' + (p * 118).toFixed(1) + '%,0)';
    }
    function onScroll() { if (!pend) { pend = true; requestAnimationFrame(update); } }
    win.addEventListener('scroll', onScroll, { passive: true }); win.addEventListener('resize', onScroll);
    update();
  }

  function init() {
    if (/^\/about/.test(path)) about();
    else if (/^\/projects/.test(path)) projects();
    else if (/^\/now/.test(path)) now();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
