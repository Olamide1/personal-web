/* Engraved plates, one per post. A title is turned into a small banknote vignette (a rosette, a sunburst or a lattice
   weave, in two pigments of the ceiling) by hashing it, so every post has its own and the same title always gives the same plate.
   On a post it adds: the plate above the title, "next room / previous room" at the end, and a note when you reach the end.
   Also used by og-card.html to print the share images. Needs scenes.js. */
(function (global) {
  'use strict';
  var doc = document;

  /* ---------- a title becomes numbers ---------- */
  function hash(str) {                                        // FNV-1a
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {                                        // mulberry32
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function sm(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

  /* ---------- the plate ---------- */
  function scene(key) {
    var S = global.Scenes;
    if (!S) return null;
    var h = hash(String(key)), id = 'plate-' + h.toString(36);
    if (S.by[id]) return id;
    var R = rng(h), motif = h % 3;
    var K = 5 + Math.floor(R() * 9), F = 38 + R() * 50, A = 0.35 + R() * 0.9, ph = R() * 6.28;
    var h0 = R(), h1 = (h0 + 0.25 + R() * 0.4) % 1, off = R() * 6, lx = 18 + R() * 30, ly = 14 + R() * 26;
    S.by[id] = {
      id: id,
      field: function (u, v, P) {
        var cx = P.a / 2, dx = u - cx, dy = v - 0.5, r = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx), d;
        if (motif === 0) d = 0.5 + 0.5 * Math.sin(r * F + A * Math.sin(ang * K + ph));
        else if (motif === 1) d = 0.5 + 0.5 * Math.sin(ang * K * 2 + ph + r * 6) * (1 - sm(0, 0.75, r)) + 0.25 * Math.sin(r * F * 0.6);
        else d = 0.5 + 0.5 * Math.sin(dx * F * 0.7 + Math.sin(dy * F * 0.5 + ph) * A * 2) * Math.sin(dy * F * 0.9);
        var fade = 1 - sm(0.22, 0.7, r * 1.5);
        var side = 0.1 + 0.3 * (0.5 + 0.5 * Math.sin(u * lx) * Math.sin(v * ly));      // a lattice weave at the sides
        d = side * (1 - fade) + d * fade * 0.85;
        if (r < 0.12) d = 0.05 + 0.06 * Math.sin(r * 90);                              // a clear medallion in the middle
        d += 0.7 * Math.exp(-Math.pow((r - 0.135) / 0.008, 2));                         // and a ring around it
        return d < 0 ? 0 : d > 1 ? 1 : d;
      },
      hue: function (u, v, P) {
        var dx = u - P.a / 2, dy = v - 0.5, r = Math.sqrt(dx * dx + dy * dy);
        var k = 0.5 + 0.5 * Math.sin(r * F * 0.3 + off + Math.atan2(dy, dx) * 2);
        return Math.max(0, Math.min(1, h0 + (h1 - h0) * k));
      }
    };
    return id;
  }

  function mount(root, key) {
    var id = scene(key);
    return id && global.Scenes.mount(root, id, { caption: false, spacing: 2.8 });
  }

  /* ---------- on a post ---------- */
  function fmt(d) { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function post() {
    var head = doc.querySelector('.post-header');
    if (!head || !global.Scenes || /[?&]og\b/.test(location.search)) return;
    var titleEl = head.querySelector('.post-title'), title = titleEl ? titleEl.textContent.replace(/\bNEW$/, '').trim() : doc.title;

    // the plate above the title
    var plate = doc.createElement('div');
    plate.className = 'art banner post-plate is-loading';
    plate.innerHTML = '<canvas role="img" aria-label="An engraved plate, made from the title of this post"></canvas>';
    head.parentNode.insertBefore(plate, head);
    mount(plate, title);

    // the end: the next room, the room before, and a note
    var nav = doc.querySelector('.post-navigation');
    if (!nav) return;
    var slug = location.pathname.replace(/^.*\//, '').replace(/\.html$/, '');
    fetch('/blog/index.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      var items = data && data.items || [], i = -1;
      items.forEach(function (p, n) { if (p.slug === slug) i = n; });
      if (i < 0) return;
      var newer = items[i - 1], older = items[i + 1], cards = '';
      [[newer, 'The next room'], [older, 'The room before']].forEach(function (c) {
        var p = c[0]; if (!p) return;
        cards += '<a class="card room" href="' + esc(p.path) + '"><span class="art mini is-loading" data-plate="' + esc(p.title) + '"><canvas aria-hidden="true"></canvas></span>' +
          '<span class="room-k">' + c[1] + '</span><span class="room-t">' + esc(p.title) + '</span><span class="room-d">' + fmt(p.date) + '</span></a>';
      });
      if (!cards) return;
      var rooms = doc.createElement('nav');
      rooms.className = 'post-rooms'; rooms.setAttribute('aria-label', 'Keep reading');
      rooms.innerHTML = '<h2 class="rooms-h">Keep walking</h2><div class="rooms-grid">' + cards + '</div>';
      nav.parentNode.insertBefore(rooms, nav);
      Array.prototype.forEach.call(rooms.querySelectorAll('[data-plate]'), function (el) { mount(el, el.getAttribute('data-plate')); });
      if ('IntersectionObserver' in global) {
        var io = new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting) return; io.disconnect();
          doc.documentElement.classList.add('post-done');
          if (global.Chapel) global.Chapel.play('end');
        }, { threshold: 0.5 });
        io.observe(rooms);
      }
    }).catch(function () {});
  }

  global.Plates = { scene: scene, mount: mount };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', post); else post();
})(window);
