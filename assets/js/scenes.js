/* The nine Genesis panels of the Sistine ceiling, engraved from scratch.
   Same banknote technique as the hands (wavy lines whose thickness follows tone), but the tone
   comes from small mathematical drawings instead of a photograph. Ink colour can change along a
   line ("iris printing"), which is how the restored ceiling's pigments get into the engravings.
   Scenes: lux, sol, terra, adam (the real hands, via engrave.js), eva, arbor, noe, diluvium, ebrietas. */
(function (global) {
  'use strict';
  var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- pigments ---------- */
  var C = { lapis: '#1A2F8F', verdigris: '#2F8F78', ochre: '#C98A14', vermilion: '#B5322B', lilac: '#8A46A8', rose: '#C9626C', azure: '#3A6FB0', navy: '#0F1C5C', paper: '#EBE4D0', gold: '#D2AA52' };
  var PAL = [C.lapis, C.verdigris, C.ochre, C.vermilion, C.lilac];     // hue 0 .. 1 walks through these
  var rgbCache = {};
  function rgb(h) {
    if (rgbCache[h]) return rgbCache[h];
    return (rgbCache[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  }
  function palColor(t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var f = t * (PAL.length - 1), i = Math.min(PAL.length - 2, Math.floor(f)), k = f - i, a = rgb(PAL[i]), b = rgb(PAL[i + 1]);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')';
  }
  var QN = 24, QCOL = [];
  for (var qi = 0; qi < QN; qi++) QCOL.push(palColor(qi / (QN - 1)));

  /* ---------- small maths ---------- */
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function sm(a, b, x) { var t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function len(x, y) { return Math.sqrt(x * x + y * y); }
  function nz(x, y) { return 0.5 + 0.5 * Math.sin(x * 1.7 + Math.sin(y * 2.3) * 1.3) * Math.sin(y * 1.9 + Math.sin(x * 1.1) * 1.7); }
  function fbm(x, y) { return nz(x, y) * 0.6 + nz(x * 2.1 + 3, y * 2.1 - 1) * 0.3 + nz(x * 4.3 - 2, y * 4.3 + 5) * 0.1; }
  function disc(u, v, cx, cy, r, s) { return 1 - sm(r - s, r + s, len(u - cx, v - cy)); }
  function band(x, c, w) { return 1 - sm(w * 0.5, w, Math.abs(x - c)); }
  function seg(u, v, ax, ay, bx, by) {                       // distance to a segment
    var px = u - ax, py = v - ay, dx = bx - ax, dy = by - ay, h = cl((px * dx + py * dy) / (dx * dx + dy * dy));
    return len(px - dx * h, py - dy * h);
  }


  /* ---------- shared geometry, so colour never strays outside the drawing ---------- */
  function noeShape(u, v, P) {
    var cx = P.a / 2, o = { altar: Math.abs(u - cx) < 0.13 && v > 0.7 && v < 0.94, flame: false, core: false, smoke: false };
    var t = (0.7 - v) / 0.22;
    if (t > 0 && t < 1) {
      var w = 0.065 * Math.sin(Math.PI * Math.pow(t, 0.8)) * (1 + 0.18 * Math.sin(v * 44 + P.t * 8)), dx = Math.abs(u - cx - 0.01 * Math.sin(v * 30 + P.t * 6));
      if (dx < w) { o.flame = true; o.core = dx < w - 0.012; }
    }
    if (v < 0.48 && v > 0.1) { var sx = cx + 0.05 * Math.sin(v * 18 + P.t * 1.5), sw = 0.016 + 0.05 * (0.48 - v); o.smoke = Math.abs(u - sx) < sw; }
    return o;
  }
  function waterline(u, P) { return 0.7 + 0.025 * Math.sin(u * 14 + P.t * 1.3) + 0.012 * Math.sin(u * 31 - P.t * 2); }
  function arkShape(u, v, P) {
    var a = P.a, cx = a * 0.56, ay = waterline(cx, P) - 0.012 + 0.008 * Math.sin(P.t * 1.3), o = {};
    var th = (v - (ay - 0.06)) / 0.06;                                                    // 0 at the deck, 1 at the keel
    o.hull = th >= 0 && th <= 1 && Math.abs(u - cx) < 0.2 - 0.09 * th * th;
    o.cabin = v > ay - 0.13 && v < ay - 0.06 && Math.abs(u - cx) < 0.11;
    var tr = (v - (ay - 0.2)) / 0.07;
    o.roof = tr >= 0 && tr <= 1 && Math.abs(u - cx) < 0.15 * tr;
    o.win = o.cabin && (Math.abs(u - cx - 0.05) < 0.012 || Math.abs(u - cx + 0.05) < 0.012) && v > ay - 0.115 && v < ay - 0.09;
    o.rock = v > 0.46 + 3.4 * Math.abs(u - a * 0.12) && v < waterline(u, P) + 0.08;
    o.ppl = Math.max(disc(u, v, a * 0.105, 0.52, 0.011, 0.002), disc(u, v, a * 0.14, 0.56, 0.011, 0.002), disc(u, v, a * 0.12, 0.49, 0.01, 0.002)) > 0.5;
    return o;
  }
  function vineShape(u, v, cx) {
    var o = { grape: false, edge: 0 };
    for (var j = 0; j < 5; j++) {
      var n = 5 - j;
      for (var i = 0; i < n; i++) {
        var q = len(u - (cx - 0.2 + (i - (n - 1) / 2) * 0.072), v - (0.2 + j * 0.06));
        if (q < 0.04) { o.grape = true; o.edge = Math.max(o.edge, band(q, 0.036, 0.008)); }
      }
    }
    o.leaf = len((u - (cx - 0.02)) / 0.12, (v - 0.1) / 0.045) < 1;
    o.tend = Math.abs(len(u - (cx + 0.27), v - 0.22) - 0.05) < 0.008 && (u > cx + 0.27 || v < 0.22);
    var bx = cx + 0.18;
    o.bowl = len(u - bx, v - 0.66) < 0.12 && v > 0.66;
    o.wine = o.bowl && v < 0.72;
    o.stem = (Math.abs(u - bx) < 0.012 && v > 0.78 && v < 0.93) || (v > 0.93 && v < 0.96 && Math.abs(u - bx) < 0.09);
    return o;
  }

  /* ---------- the nine panels ---------- */
  var SCENES = [
    { id: 'lux', roman: 'I', latin: 'Separatio lucis a tenebris', en: 'The separation of light from darkness', page: 'About', href: '/about.html',
      field: function (u, v, P) {
        var cx = P.a / 2, dx = u - cx, dy = v - 0.5, r = len(dx, dy), ang = Math.atan2(dy, dx);
        var edge = cx + 0.06 * Math.sin(v * 9 + P.t * 0.6) + 0.03 * Math.sin(v * 21);
        var dark = 1 - sm(edge - 0.025, edge + 0.025, u);
        var rays = 0.5 + 0.5 * Math.sin(ang * 18 + P.t * 0.4);
        var dl = 0.06 + 0.3 * rays * sm(0.1, 0.7, r);
        var dd = 0.7 + 0.22 * fbm(u * 6, v * 6) - 0.5 * sm(0.965, 1, nz(u * 53, v * 47));          // stars in the dark
        var d = mix(dl, dd, dark);
        d = d * (1 - disc(u, v, cx, 0.5, 0.11, 0.006)) + 0.85 * band(r, 0.125, 0.016);
        return d;
      },
      hue: function (u, v, P) {
        var cx = P.a / 2, r = len(u - cx, v - 0.5), edge = cx + 0.06 * Math.sin(v * 9 + P.t * 0.6) + 0.03 * Math.sin(v * 21);
        var dark = 1 - sm(edge - 0.03, edge + 0.03, u);
        return mix(mix(0.5, 0.8, sm(0.1, 0.6, r)), 0, dark);
      } },

    { id: 'sol', roman: 'II', latin: 'Creatio solis, lunae et plantarum', en: 'The creation of the sun, moon and plants', page: 'Projects', href: '/projects.html',
      field: function (u, v, P) {
        var a = P.a, sx = a * 0.3, sy = 0.4, R = 0.17, mx = a * 0.72, my = 0.44;
        var r = len(u - sx, v - sy), ang = Math.atan2(v - sy, u - sx);
        var d = 0.06 + 0.12 * nz(u * 4, v * 4);
        var rays = 0.5 + 0.5 * Math.sin(ang * 24 + P.t * 0.5);
        d += 0.5 * rays * (1 - sm(R, R + 0.34, r)) * (r > R ? 1 : 0);
        d = d * (1 - disc(u, v, sx, sy, R, 0.006)) + disc(u, v, sx, sy, R, 0.006) * (0.1 + 0.25 * r / R) + 0.9 * band(r, R + 0.014, 0.014);
        var cres = disc(u, v, mx, my, 0.14, 0.004) * (1 - disc(u, v, mx + 0.065, my - 0.03, 0.13, 0.004));
        d = Math.max(d * (1 - disc(u, v, mx, my, 0.14, 0.004)), 0) + 0.78 * cres + 0.3 * band(len(u - mx, v - my), 0.14, 0.01);
        var blade = 0.87 - 0.1 * Math.abs(Math.sin(u * 27 + Math.sin(u * 5))) - 0.04 * Math.sin(P.t * 0.8 + u * 9) * Math.sin(u * 3);
        if (v > blade) d = 0.8 + 0.12 * Math.sin(u * 120);
        return d;
      },
      hue: function (u, v, P) {
        var a = P.a, rs = len(u - a * 0.3, v - 0.4), rm = len(u - a * 0.72, v - 0.44), blade = 0.87 - 0.1 * Math.abs(Math.sin(u * 27 + Math.sin(u * 5)));
        if (v > blade) return 0.25;
        if (rs < 0.5) return mix(0.52, 0.76, sm(0.1, 0.45, rs));
        if (rm < 0.2) return 1;
        return 0;
      } },

    { id: 'terra', roman: 'III', latin: 'Separatio terrae ab aquis', en: 'The separation of land from water', page: 'Now', href: '/now.html',
      field: function (u, v, P) {
        var a = P.a, h = 0.5 + 0.006 * Math.sin(u * 30 + P.t);
        var lh = 0.24 * Math.exp(-Math.pow((u - a * 0.2) / 0.2, 2)) + 0.07 * Math.exp(-Math.pow((u - a * 0.84) / 0.1, 2));
        var d;
        if (v < h) d = 0.07 + 0.3 * fbm(u * 3, v * 6) * (0.4 + 0.6 * (1 - v));
        else {
          d = 0.4 + 0.3 * Math.sin(u * 55 + Math.sin(v * 40 + P.t * 2) * 3) + 0.3 * (v - h) / (1 - h);
          d *= 1 - 0.85 * Math.exp(-Math.pow((u - a * 0.58) / 0.05, 2)) * (1 - sm(0.2, 0.5, v - h));       // the glitter of the sun on the water
        }
        var toe = h + 0.03 + 0.12 * (lh / 0.24);
        if (lh > 0.004 && v > h - lh && v < toe) d = 0.72 + 0.18 * nz(u * 40, v * 40);
        return d;
      },
      hue: function (u, v, P) {
        var a = P.a, h = 0.5, lh = 0.24 * Math.exp(-Math.pow((u - a * 0.2) / 0.2, 2)) + 0.07 * Math.exp(-Math.pow((u - a * 0.84) / 0.1, 2)), toe = h + 0.03 + 0.12 * (lh / 0.24);
        if (lh > 0.004 && v > h - lh && v < toe) return mix(0.52, 0.72, sm(h - lh, toe, v));
        return v < h ? mix(0, 0.5, sm(0.1, h, v)) : mix(0.25, 0, sm(h, 1, v) * 0.8);
      } },

    { id: 'adam', roman: 'IV', latin: 'Creatio Adae', en: 'The creation of Adam', page: 'Home', href: '/' },       // drawn from the real hands

    { id: 'eva', roman: 'V', latin: 'Creatio Evae', en: 'The creation of Eve', page: 'Contact', href: '/contact.html',
      field: function (u, v, P) {
        var cx = P.a / 2, R = 0.38, off = 0.15;
        var lens = disc(u, v, cx - off, 0.5, R, 0.004) * disc(u, v, cx + off, 0.5, R, 0.004);
        var r = len(u - cx, v - 0.5);
        var inner = 0.1 + 0.28 * (0.5 + 0.5 * Math.sin(r * 70 - P.t * 1.5));
        var out = 0.58 + 0.26 * nz(u * 14, v * 14);
        var d = mix(out, inner, lens) + 0.9 * (lens * (1 - lens) * 4);
        var head = disc(u, v, cx, 0.37, 0.055, 0.004);
        var body = 1 - sm(0.0, 0.012, (function () { var ey = (v - 0.58) / 0.17, ex = (u - cx) / (0.06 - 0.025 * (v - 0.42)); return len(ex, ey) - 1; })());
        var arm = 1 - sm(0.008, 0.02, seg(u, v, cx + 0.03, 0.46, cx + 0.2, 0.3));
        var god = 1 - sm(0.008, 0.02, seg(u, v, cx + 0.45, 0.14, cx + 0.23, 0.29));
        d = Math.max(d, 0.8 * Math.max(head, body, arm) * lens, 0.85 * god);
        var rib = disc(u, v, cx, 1.15, 0.42, 0.005) * (1 - disc(u, v, cx, 1.1, 0.4, 0.005));
        return Math.max(d, 0.88 * rib);
      },
      hue: function (u, v, P) {
        var cx = P.a / 2, lens = disc(u, v, cx - 0.15, 0.5, 0.38, 0.004) * disc(u, v, cx + 0.15, 0.5, 0.38, 0.004);
        if (v > 0.74) return 1;
        if (lens > 0.5) return len(u - cx, v - 0.5) < 0.2 && v > 0.33 ? 0.72 : 0.52;
        return 0;
      } },

    { id: 'arbor', roman: 'VI', latin: 'Peccatum originale et expulsio', en: 'The temptation and expulsion', page: 'Blog', href: '/blog.html',
      field: function (u, v, P) {
        var cx = P.a / 2, ang = Math.atan2(v - 0.27, u - cx), rr = len(u - cx, v - 0.27);
        var Rc = 0.22 + 0.03 * Math.sin(5 * ang + 1) + 0.02 * Math.sin(11 * ang);
        var d = 0.1 + 0.1 * nz(u * 5, v * 5);
        var tw = 0.04 + 0.035 * sm(0.4, 1, v);
        if (rr < Rc) d = 0.5 + 0.34 * nz(u * 34 + P.t * 0.2, v * 34);
        if (v > 0.36 && Math.abs(u - cx) < tw) d = 0.8 + 0.12 * Math.sin(u * 150);
        var sx = cx + 0.055 * Math.sin(v * 24 + P.t * 1.2);
        if (v > 0.44 && v < 0.88 && Math.abs(u - sx) < 0.017) d = 0.98;
        var apple = Math.max(disc(u, v, cx - 0.1, 0.4, 0.024, 0.003), disc(u, v, cx + 0.09, 0.37, 0.022, 0.003));
        d = d * (1 - apple) + 0.9 * (apple > 0.02 && apple < 0.98 ? 1 : 0);
        d = Math.max(d, 0.9 * band(seg(u, v, P.a, 0, cx + 0.34, 0.55), 0, 0.02));            // the flaming sword
        if (v > 0.93) d = 0.74;
        return d;
      },
      hue: function (u, v, P) {
        var cx = P.a / 2, sx = cx + 0.055 * Math.sin(v * 24 + P.t * 1.2), rr = len(u - cx, v - 0.27);
        if (v > 0.93) return 0.25;
        if (v > 0.44 && v < 0.88 && Math.abs(u - sx) < 0.02) return 0.95;
        if (Math.max(disc(u, v, cx - 0.1, 0.4, 0.03, 0.003), disc(u, v, cx + 0.09, 0.37, 0.03, 0.003)) > 0.4) return 0.76;
        if (seg(u, v, P.a, 0, cx + 0.34, 0.55) < 0.03) return 0.76;
        if (rr < 0.26) return 0.25;
        if (v > 0.36 && Math.abs(u - cx) < 0.08) return 0.5;
        return 0;
      } },

    { id: 'noe', roman: 'VII', latin: 'Sacrificium Noe', en: "Noah's sacrifice", page: 'Consulting', href: '/consulting',
      field: function (u, v, P) {
        var cx = P.a / 2, r = len(u - cx, v - 0.98), d = 0.07 + 0.08 * nz(u * 4, v * 4), s = noeShape(u, v, P);
        if (r > 0.46 && r < 0.74) d = 0.46 + 0.2 * Math.sin(r * 160);                           // the rainbow
        if (s.altar) d = 0.84 + 0.1 * Math.sin(v * 120) * Math.sin(u * 90);
        if (s.flame) d = s.core ? 0.08 : 0.92;
        if (s.smoke) d = Math.max(d, 0.42 * (1 - (0.48 - v) * 2));
        return d;
      },
      hue: function (u, v, P) {
        var cx = P.a / 2, r = len(u - cx, v - 0.98), s = noeShape(u, v, P);
        if (s.altar) return 0;
        if (s.flame) return mix(0.52, 0.76, cl((0.7 - v) / 0.22));
        if (s.smoke) return 1;
        if (r > 0.46 && r < 0.74) return (r - 0.46) / 0.28;
        return 0;
      } },

    { id: 'diluvium', roman: 'VIII', latin: 'Diluvium universale', en: 'The great flood', page: 'Lost', href: '/404.html',
      field: function (u, v, P) {
        var a = P.a, wl = waterline(u, P), d, s = arkShape(u, v, P);
        if (v < wl) {
          var rain = sm(0.72, 0.95, Math.sin(u * 82 + v * 46 - P.t * 7));
          d = 0.22 + 0.34 * rain + 0.36 * fbm(u * 4, v * 7) * (1 - v);
        } else {
          d = 0.55 + 0.19 * Math.sin(v * 150 + u * 9 + P.t * 2) + 0.25 * (v - wl);
        }
        if (Math.abs(v - wl) < 0.011) d = 0.04;                                              // foam
        if (s.rock) d = 0.8 + 0.12 * nz(u * 30, v * 30);
        if (s.hull) d = 0.9; else if (s.cabin) d = 0.66 + 0.1 * Math.sin(u * 150); else if (s.roof) d = 0.92;
        if (s.win) d = 0.04;
        if (s.ppl) d = 0.04;
        return d;
      },
      hue: function (u, v, P) {
        var wl = waterline(u, P), s = arkShape(u, v, P);
        if (s.hull || s.roof) return 0.6;
        if (s.cabin) return 0.5;
        if (s.rock) return 0.74;
        if (v >= wl) return mix(0.25, 0.02, sm(wl, 1, v));
        return 0;
      } },

    { id: 'ebrietas', roman: 'IX', latin: 'Ebrietas Noe', en: 'The drunkenness of Noah', page: 'Feed', href: '/feed.xml',
      field: function (u, v, P) {
        var cx = P.a / 2, d = 0.07 + 0.08 * nz(u * 5, v * 5), s = vineShape(u, v, cx);
        if (s.grape) d = Math.min(0.95, 0.4 + 0.42 * s.edge + 0.1 * nz(u * 60, v * 60));
        if (s.leaf) d = 0.6 + 0.28 * Math.abs(Math.sin((u - cx) * 90));
        if (s.tend) d = 0.86;
        if (s.wine) d = 0.34; else if (s.bowl) d = 0.84;
        if (s.stem) d = 0.86;
        return d;
      },
      hue: function (u, v, P) {
        var cx = P.a / 2, s = vineShape(u, v, cx);
        if (s.grape) return 0.9 + 0.1 * Math.sin(u * 40 + v * 30);
        if (s.leaf || s.tend) return 0.25;
        if (s.wine) return 0.76;
        if (s.bowl || s.stem) return 0.5;
        return 0;
      } }
  ];
  var BY = {}; SCENES.forEach(function (s, i) { s.n = i + 1; BY[s.id] = s; });

  /* ---------- the engraver ---------- */
  function fillRun(ctx, xs, tp, bt, i0, i1, style) {
    ctx.beginPath(); ctx.moveTo(xs[i0], tp[i0]);
    for (var i = i0 + 1; i <= i1; i++) ctx.lineTo(xs[i], tp[i]);
    for (var j = i1; j >= i0; j--) ctx.lineTo(xs[j], bt[j]);
    ctx.closePath(); ctx.fillStyle = style; ctx.fill();
  }

  function engrave(canvas, scene, o) {
    o = o || {};
    var dpr = Math.min(2, global.devicePixelRatio || 1), cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return false;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = o.paper || C.paper; ctx.fillRect(0, 0, cw, ch);
    var sp = o.spacing || 3, hair = o.hair || 0.36, step = cw < 240 ? 1.1 : 2.5, amp = 1.2, lam = 64, asp = cw / ch, P = { a: asp, t: o.t || 0 };
    var f = o.fold || 0, cx = asp / 2, mono = o.ink || C.lapis, field = scene.field, hueFn = o.mono ? null : scene.hue;
    var xs = [], tp = [], bt = [], hq = [];
    for (var yl = sp * 0.5; yl < ch; yl += sp) {
      var phase = yl * 0.006 + 0.55 * Math.sin(yl * 1.7), n = 0;
      for (var x = 0; x <= cw + step; x += step) {
        var yc = yl + amp * Math.sin((2 * Math.PI * x) / lam + phase), u = x / ch, v = yc / ch;
        if (f) { var k = (u - cx) / f; k = Math.abs((((k + 1) % 4) + 4) % 4 - 2) - 1; u = cx + k * f; }
        var d = field(u, v, P); d = d < 0 ? 0 : d > 1 ? 1 : d;
        var edge = Math.min(u, asp - u, v, 1 - v);                                  // a soft vignette keeps the plate's edge calm
        if (o.vignette !== false) d *= 0.55 + 0.45 * sm(0, 0.06, edge);
        var t = hair + (sp * 0.94 - hair) * Math.pow(d, 1.3);
        xs[n] = x; tp[n] = yc - t / 2; bt[n] = yc + t / 2;
        hq[n] = hueFn ? Math.max(0, Math.min(QN - 1, Math.round(hueFn(u, v, P) * (QN - 1)))) : -1;
        n++;
      }
      if (!hueFn) { fillRun(ctx, xs, tp, bt, 0, n - 1, typeof mono === 'function' ? mono(ctx, cw, ch) : mono); continue; }
      var s0 = 0;
      for (var i = 1; i < n; i++) {
        if (hq[i] !== hq[s0] || i === n - 1) { fillRun(ctx, xs, tp, bt, s0, i, QCOL[hq[s0]]); s0 = i; }
      }
    }
    return true;
  }

  /* ---------- Adam: the real hands, borrowed from engrave.js ---------- */
  var handsData = null, handsWait = [];
  function withHands(cb) {
    if (handsData) return cb(handsData);
    handsWait.push(cb);
    if (handsWait.length > 1) return;
    function go() {
      global.Engrave.load(function (h) { handsData = h; handsWait.splice(0).forEach(function (f) { if (h) f(h); }); });
    }
    if (global.Engrave) go();
    else {
      var s = document.createElement('script'); s.src = '/assets/js/engrave.js?v=5d89f7fa'; s.onload = go; document.head.appendChild(s);
    }
  }
  function irisInk(ctx, cw) {
    var g = ctx.createLinearGradient(0, 0, cw, 0);
    PAL.concat(PAL.slice(0, 1)).forEach(function (c, i, a) { g.addColorStop(i / (a.length - 1), c); });
    return g;
  }
  function drawAdam(canvas, o, done) {
    withHands(function (h) {
      if (!canvas.clientWidth) return;
      var cw = canvas.clientWidth, ch = canvas.clientHeight, z = o.zoom || (ch / cw > 0.8 ? 2.1 : Math.max(1, 3.85 * ch / cw));
      global.Engrave.render(canvas, h, { ink: o.mono ? C.lapis : irisInk, paper: o.paper || C.paper, dxL: 6, dxR: -6, glow: 1.2, spacing: o.spacing || 2.6, hair: 0.5, focusX: 541, focusY: 232, zoom: z });
      if (done) done();
    });
  }
  function draw(canvas, id, o) {
    o = o || {};
    var sc = BY[id];
    if (!sc) return false;
    if (id === 'adam') { drawAdam(canvas, o, o.done); return true; }
    return engrave(canvas, sc, o);
  }

  /* ---------- mounting: loading skeleton -> draw-in -> gentle animation ---------- */
  function mount(root, id, o) {
    o = o || {};
    var canvas = root.querySelector('canvas'), sc = BY[id];
    if (!canvas || !sc) return null;
    var visible = false, drawnOnce = false, raf = 0, last = 0, t0 = performance.now();
    function paint() {
      var opts = { t: (performance.now() - t0) / 1000, spacing: o.spacing || (root.clientWidth > 520 ? 3 : 2.6), fold: o.fold, vignette: o.vignette, mono: o.mono };
      draw(canvas, id, opts);
    }
    function first() {
      if (drawnOnce) return; drawnOnce = true;
      paint();
      root.classList.remove('is-loading');
      requestAnimationFrame(function () { root.classList.add('drawn'); });
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < 50) return;
      last = now; paint();
    }
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          visible = e.isIntersecting;
          if (visible) first();
        });
      }, { threshold: 0.2 }).observe(root);
    } else { visible = true; first(); }
    if (o.animate && !reduce && id !== 'adam') raf = requestAnimationFrame(loop);
    var rt; global.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (drawnOnce) paint(); }, 140); });

    if (o.caption !== false && root.getAttribute('data-caption') !== 'off' && !root.querySelector('.scene-caption')) {
      var cap = document.createElement('div'); cap.className = 'scene-caption'; cap.setAttribute('aria-hidden', 'true');
      cap.innerHTML = '<b>Scena ' + sc.roman + '</b><span>' + sc.latin + '</span>';
      root.appendChild(cap);
    }
    return { paint: paint, scene: sc };
  }

  function autoMount() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-scene]'), function (root) {
      var id = root.getAttribute('data-scene');
      mount(root, id, { animate: root.hasAttribute('data-animate'), fold: root.hasAttribute('data-fold') ? 0.62 : 0, mono: root.hasAttribute('data-mono') });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount); else autoMount();

  global.Scenes = { list: SCENES, by: BY, draw: draw, mount: mount, colors: C, pal: PAL, withHands: withHands };
})(window);
