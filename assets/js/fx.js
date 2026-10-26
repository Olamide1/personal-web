/* The chapel: sound, light and depth.
   Everything here is generated in the browser (no audio files, no images), so it adds a few KB and
   nothing else to download. Sound is on unless the visitor turns it off; browsers keep a page silent
   until its first click, tap or keypress, so it begins then. Every effect stands down for
   prefers-reduced-motion, Save-Data, slow connections and low-end devices. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement, win = window;
  var reduce = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  // a slow link or a weak phone gets the quiet version: sound only, no light, no parallax, no reverb
  var lite = !!(conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  var fine = !!(win.matchMedia && win.matchMedia('(hover: hover) and (pointer: fine)').matches);

  var VOL = 0.42, AMBIENT = 0.085;                              // master level, and how loud the room tone sits under it
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var session = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  function make(tag, cls, parent) { var e = doc.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true'); (parent || doc.body).appendChild(e); return e; }

  /* ---------- which scene is this page? (each one has its own note) ---------- */
  var SCENES = [
    ['adam', '/', 'IV', 'Creatio Adae'], ['lux', '/about', 'I', 'Separatio lucis a tenebris'], ['sol', '/projects', 'II', 'Creatio solis, lunae et plantarum'],
    ['terra', '/now', 'III', 'Separatio terrae ab aquis'], ['eva', '/contact', 'V', 'Creatio Evae'], ['arbor', '/blog', 'VI', 'Peccatum originale et expulsio'],
    ['noe', '/consulting', 'VII', 'Sacrificium Noe']
  ];
  function scene() {
    var p = location.pathname.replace(/index\.html$/, '').replace(/\.html$/, '');
    if (doc.querySelector('.error-page')) return ['diluvium', '', 'VIII', 'Diluvium universale'];
    if (p === '/' || p === '') return SCENES[0];
    for (var i = 1; i < SCENES.length; i++) if (p.indexOf(SCENES[i][1]) === 0) return SCENES[i];
    return SCENES[0];
  }
  var ROOT = { adam: 82.41, lux: 110, sol: 146.83, terra: 98, eva: 87.31, arbor: 130.81, noe: 116.54, diluvium: 77.78 };
  var THIRD = { adam: 1.25, lux: 1.2, sol: 1.25, terra: 1.2, eva: 1.25, arbor: 1.2, noe: 1.25, diluvium: 1.414 };

  /* ================= sound ================= */
  var AC = win.AudioContext || win.webkitAudioContext;
  var wantSound = store.get('sound') !== 'off';
  var ctx = null, master = null, dry = null, conv = null, noiseBuf = null, amb = null, begun = false;
  var btn = null;
  var arrived = false, carried = null;                       // set by arriveState() when the page is shown
  function arriveState() {
    arrived = !!session.get('fxArrive');                      // read before anything clears it
    try {                                                     // the room tone that was playing on the page you just left
      var c = JSON.parse(session.get('fxAmb') || 'null');
      carried = (c && Date.now() - c.t < 6000 && ROOT[c.id]) ? c.id : null;
    } catch (e) { carried = null; }
  }

  function ensure() {
    if (ctx || !AC) return ctx;
    try { ctx = new AC(); } catch (e) { ctx = null; return null; }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    master = ctx.createGain(); master.gain.value = 0;
    dry = ctx.createGain();
    dry.connect(comp); comp.connect(master); master.connect(ctx.destination);
    if (!lite) {
      // a stone room: two seconds and a half of dark, decaying noise
      var n = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, n, ctx.sampleRate);
      for (var c = 0; c < 2; c++) {
        var d = ir.getChannelData(c), lp = 0;
        for (var i = 0; i < n; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.pow(1 - i / n, 2.6); }
      }
      conv = ctx.createConvolver(); conv.buffer = ir; conv.connect(comp);
    }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    return ctx;
  }
  function live() { return !!(ctx && wantSound && ctx.state === 'running'); }
  function route(node, wet) {
    node.connect(dry);
    if (conv && wet) { var g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(conv); }
  }
  function noise(loop) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = !!loop; return s; }
  function env(g, t, attack, peak, dur) {                    // a quick rise, then an exponential fall
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(freq, t, dur, type, peak, wet, attack) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    env(g, t, attack || 0.01, peak, dur);
    o.connect(g); route(g, wet == null ? 0.5 : wet);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(freq, peak, long) {
    if (!live()) return;
    var t = ctx.currentTime, k = long || 1;
    [[1, 1, 2.6], [2.01, 0.5, 1.8], [2.76, 0.34, 1.3], [4.07, 0.18, 0.9], [5.4, 0.1, 0.6]].forEach(function (p) {
      tone(freq * p[0], t, p[2] * k, 'sine', peak * p[1], 0.7);
    });
  }
  function whoosh(up, dur, peak) {
    if (!live()) return;
    var t = ctx.currentTime, s = noise(true), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(up ? 300 : 3000, t);
    f.frequency.exponentialRampToValueAtTime(up ? 3000 : 300, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); route(g, 0.6);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function thud(peak) {
    if (!live()) return;
    var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(75, t + 0.35);
    env(g, t, 0.008, peak, 0.5);
    var k = noise(false), kf = ctx.createBiquadFilter(), kg = ctx.createGain();   // the knock of wood on stone
    kf.type = 'lowpass'; kf.frequency.value = 1400; env(kg, t, 0.002, peak * 0.8, 0.09);
    k.connect(kf); kf.connect(kg); route(kg, 0.3); k.start(t, Math.random()); k.stop(t + 0.1);
    o.connect(g); route(g, 0.3); o.start(t); o.stop(t + 0.55);
  }
  var lastTick = 0;
  function tick(peak) {                                       // a paper-and-brass click
    if (!live()) return;
    var t = ctx.currentTime;
    if (t - lastTick < 0.05) return; lastTick = t;
    var s = noise(false), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 2600;
    env(g, t, 0.002, peak, 0.05);
    s.connect(f); f.connect(g); route(g, 0.15); s.start(t, Math.random()); s.stop(t + 0.07);
    tone(1500 + Math.random() * 200, t, 0.09, 'sine', peak * 0.6, 0.2, 0.002);
  }
  function scratch(dur) {                                     // the engraver's burin, drawing the hands
    if (!live()) return;
    var t = ctx.currentTime, s = noise(true), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, t);
    for (var x = 0; x < dur; x += 0.045) g.gain.linearRampToValueAtTime(0.0001 + Math.random() * 0.09 * Math.sin(Math.PI * x / dur), t + x);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); route(g, 0.2); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  var lastChime = 0;
  function chime() {                                          // a soft pentatonic note as a section arrives
    if (!live()) return;
    var t = ctx.currentTime;
    if (t - lastChime < 1.4) return; lastChime = t;
    var root = ROOT[scene()[0]] || 98, steps = [0, 2, 4, 7, 9], st = steps[Math.floor(Math.random() * steps.length)];
    tone(root * 4 * Math.pow(2, st / 12), t, 2.2, 'sine', 0.1, 0.9, 0.02);
  }

  var VOICES = [[0.25, 'sine'], [0.6, 'sine'], [0.45, 'sine'], [0.32, 'triangle'], [0.22, 'sine'], [0.12, 'sine']];
  function chord(id) {                                        // each room's chord, in the range small speakers can play
    var r = ROOT[id] || 98, th = THIRD[id] || 1.25;
    return [r * 0.5, r * 2, r * 3, r * 4, r * 4 * th, r * 6];
  }
  function ambient(fromId) {
    var id = scene()[0], to = chord(id), from = fromId ? chord(fromId) : to, t = ctx.currentTime;
    var out = ctx.createGain(), lp = ctx.createBiquadFilter();
    out.gain.value = fromId ? AMBIENT : 0.0001; lp.type = 'lowpass'; lp.frequency.value = 1200; lp.Q.value = 0.5;
    out.connect(lp); route(lp, 0.75);
    // a quiet chord, each voice doubled and slightly out of tune so it beats like a room.
    // Arriving from another room, it starts on that room's notes and slides to this one's: the tone carries on through the door.
    VOICES.forEach(function (v, i) {
      [-5, 5].forEach(function (cents) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = v[1]; o.detune.value = cents; o.frequency.setValueAtTime(from[i], t);
        if (fromId && from[i] !== to[i]) { o.frequency.setValueAtTime(from[i], t + 0.2); o.frequency.exponentialRampToValueAtTime(to[i], t + 3.4); }
        g.gain.value = v[0] / 2; o.connect(g); g.connect(out); o.start(t);
      });
    });
    // the room breathes: slow swells in loudness and in how much of the chord you hear
    var l1 = ctx.createOscillator(), g1 = ctx.createGain(), l2 = ctx.createOscillator(), g2 = ctx.createGain();
    l1.frequency.value = 0.05; g1.gain.value = AMBIENT * 0.3; l1.connect(g1); g1.connect(out.gain); l1.start(t);
    l2.frequency.value = 0.09; g2.gain.value = 300; l2.connect(g2); g2.connect(lp.frequency); l2.start(t);
    if (!lite) {                                              // air moving through stone
      var a = noise(true), bp = ctx.createBiquadFilter(), ag = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.4; ag.gain.value = 0.04;
      a.connect(bp); bp.connect(ag); route(ag, 0.9); a.start(t, Math.random());
    }
    if (!fromId) out.gain.setTargetAtTime(AMBIENT, t, 1.6);
    amb = { out: out, lp: lp };
    scrollTone();
  }
  // leaving: dip the tone quickly instead of letting the page cut it, and leave a note for the next page to pick it up
  function handoff() {
    if (!amb || !ctx) return;
    session.set('fxAmb', JSON.stringify({ t: Date.now(), id: scene()[0] }));
    var t = ctx.currentTime;
    amb.out.gain.setTargetAtTime(AMBIENT * 0.3, t, 0.05);
    setTimeout(function () { if (amb && ctx) amb.out.gain.setTargetAtTime(AMBIENT, ctx.currentTime, 0.5); }, 3000);   // the navigation fell through: come back up
  }
  win.addEventListener('pagehide', function () { if (amb) session.set('fxAmb', JSON.stringify({ t: Date.now(), id: scene()[0] })); });
  // scrolling deeper opens the room up
  var sp = false;
  function scrollTone() {
    sp = false;
    if (!amb || !ctx) return;
    var max = Math.max(1, html.scrollHeight - win.innerHeight), p = clamp((win.pageYOffset || 0) / max, 0, 1);
    amb.lp.frequency.setTargetAtTime(1000 + p * 1800, ctx.currentTime, 0.6);
  }

  /* ---------- starting, stopping, remembering ---------- */
  function begin() {
    if (begun || !live()) return;
    begun = true; session.set('fxHeard', '1');
    if (btn) btn.classList.remove('wait');
    if (master) { if (carried) master.gain.setValueAtTime(VOL, ctx.currentTime); else master.gain.setTargetAtTime(VOL, ctx.currentTime, 0.3); }
    ambient(carried);
    if (arrived) {                                              // you came through a door: a swell, then the room's note
      whoosh(false, 0.9, 0.12);
      bell((ROOT[scene()[0]] || 98) * 4, 0.12, 1.2);
    }
  }
  function unlock() {
    if (!wantSound || !AC) return;
    if (!ensure()) return;
    var p = ctx.resume && ctx.resume();
    var check = function () { if (ctx.state === 'running') { release(); begin(); } };
    if (p && p.then) p.then(check, function () {}); else check();
    try {                                                     // iOS wants real output inside the gesture
      var s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
    } catch (e) {}
  }
  var GESTURES = ['pointerup', 'touchend', 'click', 'keydown'];
  function release() { GESTURES.forEach(function (g) { doc.removeEventListener(g, unlock, true); }); }
  function arm() { GESTURES.forEach(function (g) { doc.addEventListener(g, unlock, true); }); }

  function setSound(on) {
    wantSound = on; store.set('sound', on ? 'on' : 'off');
    if (btn) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.classList.remove('wait'); }
    if (on) {
      if (!ensure()) return;
      var up = function () {
        if (ctx.state !== 'running') return;
        release(); master.gain.setTargetAtTime(VOL, ctx.currentTime, 0.2);
        if (!begun) begin(); else bell((ROOT[scene()[0]] || 98) * 4, 0.12, 0.6);
      };
      var r = ctx.resume(); if (r && r.then) r.then(up, function () {}); else up();
    } else if (ctx && master) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      setTimeout(function () { if (!wantSound && ctx && ctx.state === 'running') ctx.suspend(); }, 700);
    }
  }
  doc.addEventListener('visibilitychange', function () {     // a hidden tab makes no sound and spends no battery
    if (!ctx) return;
    if (doc.hidden) { if (ctx.state === 'running') ctx.suspend(); }
    else if (wantSound) ctx.resume();
  });

  function mountToggle() {
    btn = doc.getElementById('sndBtn');
    if (!btn) return;
    if (!AC) { btn.hidden = true; return; }
    html.classList.add('fx-on');
    btn.setAttribute('aria-pressed', wantSound ? 'true' : 'false');
    if (wantSound) btn.classList.add('wait');                // a soft pulse until the first click lets the sound begin
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var next = !wantSound;
      setSound(next);
    });
  }

  /* ---------- the sounds of the site ---------- */
  function wireSounds() {
    var hovered = null;
    doc.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = e.target.closest && e.target.closest('a[href], button');
      if (!t || t === hovered) return; hovered = t; tick(0.06);
    });
    doc.addEventListener('pointerout', function (e) { if (hovered && !hovered.contains(e.relatedTarget)) hovered = null; });

    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href], button');
      if (!a || a.id === 'sndBtn') return;
      if (a.id === 'menuBtn') {
        setTimeout(function () {                              // the plan has just opened or closed
          if (a.getAttribute('aria-expanded') === 'true') { bell(392, 0.14, 1); whoosh(true, 0.8, 0.12); }
          else { whoosh(false, 0.6, 0.09); }
        }, 0);
        return;
      }
      if (a.tagName === 'A' && !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) &&
        (!a.target || a.target === '_self') && a.origin === location.origin && !a.hasAttribute('download') &&
        !(a.pathname === location.pathname && a.search === location.search) && !/\.(xml|json|pdf)$/i.test(a.pathname)) {
        session.set('fxArrive', '1');                         // the next page greets you at the door
        handoff();
        whoosh(true, 0.7, 0.16); setTimeout(function () { thud(0.45); }, 90);
        return;
      }
      tick(0.11);
    });

    // the hands are engraved as they come into view
    Array.prototype.forEach.call(doc.querySelectorAll('.art'), function (art) {
      var done = false;
      new MutationObserver(function () { if (!done && art.classList.contains('drawn')) { done = true; scratch(1.4); } })
        .observe(art, { attributes: true, attributeFilter: ['class'] });
    });
    // the finale's fingertips meet
    var wall = doc.querySelector('[data-hands="wall"]');
    if (wall) new MutationObserver(function (m) {
      m.forEach(function (r) { Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.classList && n.classList.contains('spark')) { bell(440, 0.12, 0.8); bell(660, 0.08, 0.8); } }); });
    }).observe(wall, { childList: true });

    // the opening: fingertips touch, then the curtain lifts
    var intro = doc.getElementById('intro');
    if (intro) new MutationObserver(function () {
      if (intro.classList.contains('touched') && !intro._t) { intro._t = 1; eggSound(true); }
      if (intro.classList.contains('lift') && !intro._l) { intro._l = 1; whoosh(true, 1, 0.14); }
    }).observe(intro, { attributes: true, attributeFilter: ['class'] });

    // sections arriving, one soft note each
    if ('IntersectionObserver' in win && !lite) {
      var t0 = performance.now();
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return; io.unobserve(e.target);
          if (performance.now() - t0 > 900) chime();
        });
      }, { threshold: 0.6 });
      Array.prototype.forEach.call(doc.querySelectorAll('main h2, .wall h2'), function (h) { io.observe(h); });
    }
    win.addEventListener('scroll', function () { if (!sp && amb) { sp = true; setTimeout(scrollTone, 120); } }, { passive: true });
  }

  /* ================= light ================= */
  function candle() {
    if (reduce || lite || !('transform' in html.style)) return;
    make('div', 'fx-vignette');
    make('div', 'fx-beams').innerHTML = '<i></i><i></i>';
    var c = make('div', 'fx-candle'); c.appendChild(doc.createElement('i'));
    var tx = -999, ty = -999, x = tx, y = ty, raf = 0, hideT = 0;
    function frame() {
      x += (tx - x) * 0.16; y += (ty - y) * 0.16;
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.4) ? requestAnimationFrame(frame) : 0;
    }
    function move(e) {
      if (e.pointerType === 'mouse' && !fine) return;
      if (!c.classList.contains('on')) { x = tx = e.clientX; y = ty = e.clientY; }
      tx = e.clientX; ty = e.clientY; clearTimeout(hideT);
      c.classList.add('on');
      if (!raf) raf = requestAnimationFrame(frame);
    }
    doc.addEventListener('pointermove', move, { passive: true });
    doc.addEventListener('pointerdown', move, { passive: true });
    ['pointerup', 'pointercancel'].forEach(function (ev) {   // a finger lifts: the light fades out after it
      doc.addEventListener(ev, function (e) { if (e.pointerType !== 'mouse') hideT = setTimeout(function () { c.classList.remove('on'); }, 500); }, { passive: true });
    });
    html.addEventListener('mouseleave', function () { c.classList.remove('on'); });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) c.classList.remove('on'); });
  }

  /* ================= depth ================= */
  function parallax() {
    if (reduce || lite) return;
    var plates = Array.prototype.slice.call(doc.querySelectorAll('.plate[data-corners]')).map(function (p) {
      var layers = [];
      [['.serials', 3], ['.frieze', 5], ['h1', 11], ['.art', 17], ['p', 7], ['.cta-row', 4], ['.micro-wrap', 2]].forEach(function (d) {
        Array.prototype.forEach.call(p.querySelectorAll(d[0]), function (el) { if (el.parentNode === p) layers.push({ el: el, d: d[1] }); });
      });
      var sheen = make('div', 'fx-sheen', p); sheen.appendChild(doc.createElement('i'));
      return { el: p, layers: layers, sheen: sheen.firstChild, vis: false, sy: 0 };
    }).filter(function (p) { return p.layers.length; });
    if (!plates.length) return;

    var nx = 0, ny = 0, cx = 0, cy = 0, raf = 0;
    function apply() {
      cx += (nx - cx) * 0.09; cy += (ny - cy) * 0.09;
      plates.forEach(function (p) {
        if (!p.vis) return;
        p.layers.forEach(function (l) { l.el.style.translate = (cx * l.d).toFixed(2) + 'px ' + ((cy * 0.6 + p.sy) * l.d).toFixed(2) + 'px'; });
        p.sheen.style.translate = (cx * 40).toFixed(1) + '% 0';
      });
      raf = (Math.abs(nx - cx) + Math.abs(ny - cy) > 0.002) ? requestAnimationFrame(apply) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(apply); }
    function scrolled() {
      plates.forEach(function (p) {
        var r = p.el.getBoundingClientRect();
        p.vis = r.bottom > -60 && r.top < win.innerHeight + 60;
        p.sy = clamp(-((r.top + r.height / 2) - win.innerHeight / 2) / win.innerHeight, -1, 1) * -0.9;
      });
      kick();
    }
    var sp2 = false;
    win.addEventListener('scroll', function () { if (!sp2) { sp2 = true; requestAnimationFrame(function () { sp2 = false; scrolled(); }); } }, { passive: true });
    win.addEventListener('resize', scrolled);
    doc.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      nx = (e.clientX / win.innerWidth - 0.5) * 2; ny = (e.clientY / win.innerHeight - 0.5) * 2; kick();
    }, { passive: true });
    // phones: tilting the device moves the layers (where the browser allows it without asking)
    if (!fine && win.DeviceOrientationEvent && typeof win.DeviceOrientationEvent.requestPermission !== 'function') {
      win.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        nx = clamp(e.gamma / 28, -1, 1); ny = clamp(((e.beta || 55) - 55) / 28, -1, 1); kick();
      }, { passive: true });
    }
    scrolled();
  }

  /* ================= arrival card: which room you have just entered ================= */
  function arrival() {
    session.del('fxArrive');
    if (!arrived) return;
    if (reduce) return;
    var s = scene(), card = make('div', 'fx-card', doc.body);
    card.innerHTML = '<b>Scena ' + s[2] + '</b><span>' + s[3] + '</span>';
    card.addEventListener('animationend', function () { card.remove(); });
    setTimeout(function () { card.remove(); }, 4200);
  }

  /* ================= the easter egg: the fingertips touch ================= */
  var LINES = ['Et fiat lux.', 'Digitus Dei.', 'Again?', 'Scintilla.'];
  var lastEgg = 0;
  function eggSound(small) {
    if (!live()) return;
    var base = 220;
    [[1, 0], [1.5, 0.09], [2.5, 0.18], [3, 0.27], [4, 0.36]].forEach(function (n, i) {
      setTimeout(function () { bell(base * n[0], small ? 0.1 : 0.17 - i * 0.012, small ? 0.8 : 1.4); }, n[1] * 1000);
    });
    if (!small) {
      whoosh(true, 1.3, 0.14);
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();   // a low swell under it
      o.frequency.value = 165; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
      o.connect(g); route(g, 0.8); o.start(t); o.stop(t + 3.5);
    }
  }
  function egg(x, y) {
    var now = Date.now();
    if (now - lastEgg < 5000) return; lastEgg = now;
    var n = (parseInt(store.get('fxTouches'), 10) || 0) + 1; store.set('fxTouches', String(n));
    eggSound(false);
    var line = LINES[Math.min(LINES.length - 1, (n - 1) % LINES.length)];
    var box = make('div', 'fx-egg' + (reduce ? ' still' : ''), doc.body);
    box.style.setProperty('--x', x + 'px'); box.style.setProperty('--y', y + 'px');
    if (!reduce) {
      make('i', 'fx-flash', box);
      for (var r = 0; r < 3; r++) { var ring = make('i', 'fx-ring', box); ring.style.animationDelay = (r * 160) + 'ms'; }
      var count = lite ? 10 : 26;
      for (var m = 0; m < count; m++) {
        var a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 260, mote = make('i', 'fx-mote', box);
        mote.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px'); mote.style.setProperty('--dy', (Math.sin(a) * d - 40).toFixed(0) + 'px');
        mote.style.setProperty('--s', (4 + Math.random() * 6).toFixed(1) + 'px'); mote.style.animationDelay = (Math.random() * 200).toFixed(0) + 'ms';
      }
    }
    var cap = make('span', 'fx-line', box); cap.textContent = line;
    setTimeout(function () { box.remove(); }, reduce ? 2200 : 3600);
  }
  function wireEgg() {
    ['hero', 'contact'].forEach(function (name) {
      var root = doc.querySelector('[data-hands="' + name + '"]');
      if (!root) return;
      root.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        setTimeout(function () {                              // the fingers close in about 0.4s; fire where they meet
          var sp = root.querySelector('.spark'), r = (sp || root).getBoundingClientRect();
          egg(r.left + r.width / 2, r.top + r.height / 2);
        }, 430);
      });
    });
  }

  /* ================= pieces that load only when they are wanted ================= */
  function pull(css, js, cb) {
    var left = (css ? 1 : 0) + 1, one = function () { if (--left === 0) cb(); };
    if (css) { var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = css; l.onload = l.onerror = one; doc.head.appendChild(l); }
    var s = doc.createElement('script'); s.src = js; s.onload = one; s.onerror = function () { left = -9; }; doc.head.appendChild(s);
  }
  var pulling = false;
  function wander(from) {                                     // the ceiling, to wander (ceiling.js)
    if (win.Ceiling) return win.Ceiling.open(from);
    if (pulling) return; pulling = true;
    pull('/assets/css/ceiling.css?v=1', '/assets/js/ceiling.js?v=1', function () { pulling = false; if (win.Ceiling) win.Ceiling.open(from); });
  }
  doc.addEventListener('click', function (e) {
    var w = e.target.closest && e.target.closest('[data-wander]');
    if (w) { e.preventDefault(); wander(w); }
  });
  function signature() {                                      // one moment of its own on About, Projects and Now (signature.js)
    if (lite || !/^\/(about|projects|now)(\/|$)/.test(location.pathname.replace(/\.html$/, ''))) return;
    pull('/assets/css/signature.css?v=1', '/assets/js/signature.js?v=1', function () {});
  }

  // what the other scripts may ask of the sound
  win.Chapel = {
    sound: function (on) { setSound(!!on); },
    live: live,
    play: function (name, a) {
      if (!live()) return;
      if (name === 'note') bell(196 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16, 19][(a || 0) % 9] / 12), 0.07, 0.7);
      else if (name === 'whoosh') whoosh(a !== false, 0.9, 0.1);
      else if (name === 'tick') tick(0.08);
      else if (name === 'bell') bell(a || 440, 0.08, 1);
      else if (name === 'thud') thud(0.4);
    },
    wander: wander
  };

  /* ================= go ================= */
  function init() {
    mountToggle();
    wireSounds();
    wireEgg();
    var go = function () { candle(); parallax(); signature(); };
    if (win.requestIdleCallback) win.requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 200);

    function shown() {
      arriveState();
      arrival();
      if (wantSound && AC) {
        arm();
        // came here from a page that already made sound: try to carry on straight away (browsers that allow it)
        if (session.get('fxHeard')) {
          ensure();
          if (ctx) { var p = ctx.resume(); if (p && p.then) p.then(function () { if (ctx.state === 'running') { release(); begin(); } }, function () {}); }
        }
      }
    }
    if (doc.prerendering) doc.addEventListener('prerenderingchange', shown, { once: true }); else shown();
    speculate();
  }

  /* ================= the next room is built before you walk in ================= */
  function speculate() {
    if (lite || !HTMLScriptElement.supports || !HTMLScriptElement.supports('speculationrules')) return;
    var sr = doc.createElement('script'); sr.type = 'speculationrules';
    sr.textContent = JSON.stringify({ prerender: [{ where: { and: [{ href_matches: '/*' }, { not: { href_matches: ['/admin/*', '/*.xml', '/*.json', '/*.pdf'] } }] }, eagerness: 'moderate' }] });
    doc.head.appendChild(sr);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
