/* The hands of Michelangelo's Creation of Adam, engraved in the browser (see engrave.js).
   Every [data-hands] element becomes a living engraving: it breathes, follows the pointer,
   and the fingers touch when you click, hover a call to action, or scroll to the finale.
   #intro is the one-time opening: the hands close in, touch, and the page lifts like a curtain. */
(function () {
  'use strict';
  if (!window.Engrave) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var html = document.documentElement;
  var INK = '#1A2F8F', PAPER = '#EBE4D0', NAVY = '#0F1C5C', CREAM = '#EFE6D2';

  // dxL, dxR (art units: hands move apart as they grow), glow
  var POSE = {
    far:   [-320, 320, 0],
    apart: [-110, 110, 0.2],
    rest:  [-24, 24, 0.8],
    near:  [-8, 8, 1],
    touch: [12.6, -12.6, 1.6]
  };

  // pigments of the restored ceiling; the lighter set is for engravings on a dark ground
  var PIG_DARK = ['#8A46A8', '#2F8F78', '#C98A14', '#B5322B', '#8A46A8'];
  var PIG_LIGHT = ['#C9A6E0', '#7FD1B5', '#F6DE95', '#F29A8C', '#C9A6E0'];
  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function blend(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')';
  }
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };

  var easeOut = function (k) { return 1 - Math.pow(1 - k, 3); };
  var easeInOut = function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

  var hands = null, waiting = [];
  function withHands(cb) { if (hands) cb(hands); else waiting.push(cb); }

  function HandsArt(root, cfg) {
    var canvas = root.querySelector('canvas');
    var s = { l: cfg.start[0], r: cfg.start[1], g: cfg.start[2] };
    var raf = 0, idleRaf = 0, lastIdle = 0, breath = 0, visible = true, tagA = null, tagB = null, ov = null;

    if (cfg.labels) {
      ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ov.setAttribute('class', 'art-overlay'); ov.setAttribute('aria-hidden', 'true');
      ov.innerHTML = '<line/><circle r="3.2"/><line/><circle r="3.2"/>';
      tagA = document.createElement('span'); tagA.className = 'art-tag'; tagA.textContent = cfg.labels[0];
      tagB = document.createElement('span'); tagB.className = 'art-tag'; tagB.textContent = cfg.labels[1];
      root.appendChild(ov); root.appendChild(tagA); root.appendChild(tagB);
    }

    // on narrow screens "fit" would crop to the fingertips; show more of both hands instead
    function zoom() {
      var z = cfg.zoom || 'fit';
      return (z === 'fit' && canvas.clientWidth < 640) ? (cfg.mobileZoom || 1.35) : z;
    }
    // iris printing: as the fingers close, the ink shifts through the ceiling's pigments, centred on the touch
    function bloomAmt() {
      var b = cfg.bloomAt || [0.9, 1.6];
      return clamp01((s.g - b[0]) / (b[1] - b[0]));
    }
    function ink(ctx, cw) {
      var base = cfg.ink || INK, b = bloomAmt();
      if (!cfg.iris || b < 0.01) return base;
      var t = tips(), c = Math.min(0.85, Math.max(0.15, ((t.ax + t.gx) / 2) / cw)), P = cfg.inverse ? PIG_LIGHT : PIG_DARK, g = ctx.createLinearGradient(0, 0, cw, 0);
      var stops = [[0, base], [c - 0.4, P[0]], [c - 0.2, P[1]], [c, P[2]], [c + 0.2, P[3]], [c + 0.4, P[4]], [1, base]];
      stops.forEach(function (st) { g.addColorStop(Math.max(0, Math.min(1, st[0])), st[1] === base ? base : blend(base, st[1], b)); });
      return g;
    }
    function opts() {
      return { focusY: cfg.focusY || 215, focusX: cfg.focusX || 500, zoom: zoom(),
        ink: ink, paper: cfg.paper || PAPER, inverse: !!cfg.inverse,
        hair: cfg.hair || 0.38, spacing: cfg.spacing || 3.2,
        dxL: s.l + breath, dxR: s.r - breath, glow: s.g };
    }
    function render() {
      if (!canvas.clientWidth || !canvas.clientHeight) return;
      Engrave.render(canvas, hands, opts());
      if (ov) place();
      root.classList.remove('is-loading');
    }
    function tips() {
      var cw = canvas.clientWidth, ch = canvas.clientHeight;
      var mp = Engrave.map(cw, ch, cfg.focusY || 215, cfg.focusX || 500, zoom());
      return {
        cw: cw, ch: ch,
        ax: mp.ox + (Engrave.TIP_A[0] + s.l + breath) * mp.sc, ay: mp.oy + Engrave.TIP_A[1] * mp.sc,
        gx: mp.ox + (Engrave.TIP_G[0] + s.r - breath) * mp.sc, gy: mp.oy + Engrave.TIP_G[1] * mp.sc
      };
    }
    function place() {
      var t = tips(), narrow = t.cw < 560, up = Math.max(70, t.ch * (narrow ? 0.34 : 0.4));
      var lx = Math.max(60, t.ax - (narrow ? 50 : 44)), ly = Math.max(30, t.ay - up);
      var rx = Math.min(t.cw - 60, t.gx + (narrow ? 50 : 52)), ry = Math.max(30, t.gy - up * 0.85);
      tagA.style.left = lx + 'px'; tagA.style.top = ly + 'px';
      tagB.style.left = rx + 'px'; tagB.style.top = ry + 'px';
      var L = ov.querySelectorAll('line'), C = ov.querySelectorAll('circle');
      L[0].setAttribute('x1', lx); L[0].setAttribute('y1', ly); L[0].setAttribute('x2', t.ax); L[0].setAttribute('y2', t.ay);
      C[0].setAttribute('cx', t.ax); C[0].setAttribute('cy', t.ay);
      L[1].setAttribute('x1', rx); L[1].setAttribute('y1', ry); L[1].setAttribute('x2', t.gx); L[1].setAttribute('y2', t.gy);
      C[1].setAttribute('cx', t.gx); C[1].setAttribute('cy', t.gy);
    }

    function to(target, dur, ease, done) {
      cancelAnimationFrame(raf); raf = 0;
      if (reduce || !dur) { s.l = target[0]; s.r = target[1]; s.g = target[2]; render(); if (done) done(); return; }
      var f = { l: s.l, r: s.r, g: s.g }, t0 = performance.now(), fn = ease || easeOut;
      (function tick(now) {
        var k = Math.min(1, (now - t0) / dur), e = fn(k);
        s.l = f.l + (target[0] - f.l) * e; s.r = f.r + (target[1] - f.r) * e; s.g = f.g + (target[2] - f.g) * e;
        render();
        if (k < 1) raf = requestAnimationFrame(tick); else { raf = 0; if (done) done(); }
      })(t0);
    }

    // a ring of light where the fingertips meet
    function spark() {
      if (reduce) return;
      var t = tips(), x = (t.ax + t.gx) / 2, y = (t.ay + t.gy) / 2;
      ['#B98F35', cfg.inverse ? CREAM : INK, '#D2AA52'].forEach(function (c, i) {
        var d = document.createElement('span'); d.className = 'spark';
        d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.setProperty('--c', c); d.style.animationDelay = (i * 110) + 'ms';
        root.appendChild(d); setTimeout(function () { d.remove(); }, 1500 + i * 110);
      });
    }

    function idle(now) {
      idleRaf = requestAnimationFrame(idle);
      if (!visible || raf || document.hidden || now - lastIdle < 42) return;
      lastIdle = now; breath = Math.sin(now / 1500) * 2.4; render();
    }
    if (cfg.idle && !reduce) idleRaf = requestAnimationFrame(idle);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var was = visible; visible = e.isIntersecting;
          if (visible && !was) render();
          if (visible && !cfg.noDraw) root.classList.add('drawn');
          if (cfg.onVisible && visible) { var f = cfg.onVisible; cfg.onVisible = null; f(api); }
        });
      }, { threshold: 0.25 }).observe(root);
    } else { root.classList.add('drawn'); if (cfg.onVisible) { var f0 = cfg.onVisible; cfg.onVisible = null; f0(api); } }

    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 120); });

    if (cfg.pointer) {
      var pend = false, px = 0;
      root.addEventListener('pointermove', function (e) {
        px = e.clientX; if (pend) return; pend = true;
        requestAnimationFrame(function () {
          pend = false;
          var r = root.getBoundingClientRect(), k = 1 - Math.min(1, Math.abs((px - (r.left + r.width / 2)) / (r.width / 2)));
          var u = -12.6 + 62 * Math.pow(1 - k, 1.4);          // centre = fingertips touch; edges = far apart
          to([-u, u, 0.5 + 1.1 * k * k], 380);
        });
      });
      root.addEventListener('pointerleave', function () { to(cfg.rest || POSE.rest, 900); });
      root.addEventListener('pointerdown', function () { to(POSE.touch, 420, easeOut, spark); });
    }

    var api = { to: to, render: render, spark: spark, root: root, pose: POSE };
    render();
    return api;
  }

  var PRESETS = {
    hero:    { start: POSE.far, rest: POSE.rest, labels: ['Human', 'Agent'], pointer: true, idle: true, iris: true, hair: 0.38, spacing: 3.2 },
    contact: { start: POSE.far, rest: POSE.rest, labels: ['You', 'Me'], pointer: true, idle: true, iris: true, hair: 0.38, spacing: 3.2 },
    lost:    { start: [-230, 230, 0.2], rest: [-230, 230, 0.2], labels: ['You', 'This page'], idle: true, hair: 0.38, spacing: 3.2 },
    banner:  { start: POSE.rest, rest: POSE.rest, zoom: 2.7, focusX: 541, focusY: 232, idle: true, hair: 0.34, spacing: 2.6 },
    wall:    { start: [-16, 16, 0.5], inverse: true, iris: true, bloomAt: [0.55, 1], ink: CREAM, paper: NAVY, hair: 0.3, spacing: 3.8 }
  };

  var arts = {};
  function mount() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-hands]'), function (root) {
      var name = root.getAttribute('data-hands'), cfg = {}, p = PRESETS[name];
      if (!p) return;
      for (var k in p) cfg[k] = p[k];
      var introPending = html.classList.contains('intro-on');

      if (name === 'hero' || name === 'contact') {
        // arrive from far apart, then settle one gesture short of touching
        cfg.onVisible = function (a) { if (!introPending) a.to(POSE.rest, 2200, easeOut); };
      } else if (name === 'wall') {
        cfg.onVisible = function (a) { a.to([14, -14, 1], 2800, easeInOut, a.spark); };
      } else if (name === 'lost') {
        cfg.onVisible = function (a) { a.to([-190, 190, 0.3], 2200, easeOut); };
      }
      var art = HandsArt(root, cfg);
      arts[name] = art;
      if (introPending && (name === 'hero')) {
        document.addEventListener('introdone', function () { art.to(POSE.rest, 2400, easeOut); }, { once: true });
      }
    });

    // a call to action brings the hands together
    Array.prototype.forEach.call(document.querySelectorAll('[data-hands-trigger]'), function (el) {
      var art = arts[el.getAttribute('data-hands-trigger')];
      if (!art) return;
      var back = art.root.getAttribute('data-hands') === 'lost' ? [-190, 190, 0.3] : POSE.rest;
      ['mouseenter', 'focus'].forEach(function (ev) { el.addEventListener(ev, function () { art.to(POSE.near, 650); }); });
      ['mouseleave', 'blur'].forEach(function (ev) { el.addEventListener(ev, function () { art.to(back, 800); }); });
      el.addEventListener('click', function () { art.to(POSE.touch, 400, easeOut, art.spark); });
    });
    // expose for page scripts (contact page touches before it leaves)
    window.HandsArts = arts;
  }

  /* ================= the opening ================= */
  function intro() {
    var el = document.getElementById('intro');
    if (!el) return;
    if (!html.classList.contains('intro-on')) { el.remove(); return; }

    var over = false, art = null, timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function finish() {
      if (over) return; over = true;
      timers.forEach(clearTimeout);
      try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
      el.classList.add('lift');
      document.dispatchEvent(new Event('introdone'));
      setTimeout(function () { html.classList.remove('intro-on'); el.remove(); }, 1100);
    }
    el.querySelector('.intro-skip').addEventListener('click', finish);
    el.addEventListener('click', finish);
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { finish(); document.removeEventListener('keydown', onKey); } });
    later(finish, 8000);                                       // never trap anyone

    var serial = document.getElementById('introSerial'), final = '';
    function rollSerial(ms) {
      var t0 = performance.now(), end = 100000 + Math.floor(Math.random() * 899999);
      final = 'No. ' + String(end).replace(/(\d{3})(\d{3})/, '$1 $2');
      (function tick(now) {
        if (over) return;
        var k = Math.min(1, (now - t0) / ms);
        if (k < 1) { serial.textContent = 'No. ' + String(100000 + Math.floor(Math.random() * 899999)).replace(/(\d{3})(\d{3})/, '$1 $2'); requestAnimationFrame(tick); }
        else serial.textContent = final;
      })(t0);
    }

    var gave = setTimeout(finish, 4500);                       // the art never loaded: just open the site
    var fontsReady = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1200); })]) : Promise.resolve();
    withHands(function () {
      clearTimeout(gave);
      if (over) return;
      fontsReady.then(play);
    });
    function play() {
      if (over) return;
      art = HandsArt(el.querySelector('[data-intro-art]'), { iris: true, noDraw: true, start: POSE.far, spacing: 4.2, hair: 0.4, zoom: 'fit', mobileZoom: 1.7, idle: false });
      requestAnimationFrame(function () {
        el.classList.add('go');
        rollSerial(2300);
        art.to(POSE.near, 2000, easeInOut, function () {
          art.to(POSE.touch, 360, easeOut, function () {
            art.spark(); el.classList.add('touched');
            later(finish, 1700);
          });
        });
      });
    }
  }

  function begin() {
    if (!document.querySelector('[data-hands], #intro')) return;
    Engrave.load(function (h) {
      if (!h) {                                                // decoding failed: never leave the opening covering the site
        var i = document.getElementById('intro');
        if (i) i.remove();
        html.classList.remove('intro-on');
        return;
      }
      hands = h;
      mount();
      intro();
      waiting.splice(0).forEach(function (cb) { cb(h); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else begin();
})();
