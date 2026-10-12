// Guilloche rosettes (emblem + plate corners), drawn once to canvas.
// Same technique as consulting.html: wavy rings that drift one way, then the other.
(function () {
  var INK = '#1A2F8F', RED = '#B5322B', GREEN = '#2F8F78', OCHRE = '#C98A14', LILAC = '#8A46A8', cache = {};

  // each page prints its rosettes with its own pigment (set by body[data-pigment] in the CSS)
  var PG = ((getComputedStyle(document.body).getPropertyValue('--pg')) || '').trim();
  if (!/^#[0-9a-f]{6}$/i.test(PG)) PG = RED;

  function band(k, r0, span, a, dph, M, N, c, w) {
    return [{ k: k, r0: r0, span: span, a: a, dph: dph, M: M, N: N, c: c, w: w },
            { k: k, r0: r0, span: span, a: a, dph: -dph, M: M, N: N, c: c, w: w }];
  }
  var KINDS = {
    emblem: { size: 60, layers: band(6, .6, .2, .12, .5, 10, 110, INK, .8).concat(band(4, .34, .1, .08, .5, 6, 80, PG, .8)) },
    corner: { size: 116, layers: band(8, .62, .22, .12, .4, 16, 160, INK, .6).concat(band(5, .34, .1, .08, .5, 10, 120, PG, .6)) },
    // one medallion per project, each a different weave
    medal1: { size: 120, layers: band(12, .64, .18, .09, .22, 26, 168, INK, .5).concat(band(6, .5, .12, .07, .45, 18, 140, RED, .55)) },
    medal2: { size: 120, layers: band(10, .86, .1, .05, .3, 20, 140, GREEN, .55).concat(band(5, .76, .08, .05, .5, 14, 140, INK, .5)).concat(band(14, .5, .1, .06, .35, 14, 140, GREEN, .5)) },
    medal3: { size: 120, layers: band(6, .62, .2, .1, .45, 20, 140, OCHRE, .6).concat(band(20, .93, .04, .025, .4, 12, 280, RED, .5)).concat(band(9, .4, .1, .06, .3, 14, 120, OCHRE, .55)) },
    medal4: { size: 120, layers: band(8, .7, .22, .12, .4, 22, 160, LILAC, .55).concat(band(18, .9, .06, .03, .4, 12, 240, GREEN, .5)).concat(band(4, .46, .12, .08, .5, 12, 120, LILAC, .55)) },
    seal:   { size: 220, layers: band(10, .56, .16, .08, .26, 24, 160, INK, .5).concat(band(7, .42, .08, .05, .4, 14, 140, RED, .55)) },
    dial:   { size: 120, layers: band(9, .62, .24, .1, .3, 22, 150, INK, .5).concat(band(6, .36, .1, .07, .45, 12, 120, RED, .55)) }
  };

  function draw(kind) {
    if (cache[kind]) return cache[kind];
    var cfg = KINDS[kind], size = cfg.size, R = size / 2;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cv = document.createElement('canvas');
    cv.width = cv.height = Math.round(size * dpr);
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineJoin = 'round';
    cfg.layers.forEach(function (L) {
      ctx.beginPath();
      for (var m = 0; m < L.M; m++) {
        var rm = L.r0 + (L.span || 0) * ((m / (L.M - 1)) - 0.5), ph = m * (L.dph || 0);
        for (var i = 0; i <= L.N; i++) {
          var th = i / L.N * 2 * Math.PI;
          var rho = (rm + L.a * Math.sin(L.k * th + ph)) * R;
          var x = R + rho * Math.cos(th), y = R + rho * Math.sin(th);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
      }
      ctx.strokeStyle = L.c; ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(0.5, L.w); ctx.stroke();
    });
    return (cache[kind] = cv);
  }

  function fill() {
    // Give every hero/contact/404 plate its four corner rosettes
    document.querySelectorAll('.plate[data-corners]').forEach(function (plate) {
      ['tl', 'tr', 'bl', 'br'].forEach(function (pos) {
        var span = document.createElement('span');
        span.className = 'corner ' + pos + ' rosette';
        span.setAttribute('data-rosette', 'corner');
        span.setAttribute('aria-hidden', 'true');
        plate.insertBefore(span, plate.firstChild);
      });
    });
    document.querySelectorAll('[data-rosette]').forEach(function (el) {
      var kind = el.getAttribute('data-rosette');
      if (!KINDS[kind] || el.querySelector('canvas')) return;
      var src = draw(kind), cv = document.createElement('canvas');
      cv.width = src.width; cv.height = src.height;
      cv.setAttribute('aria-hidden', 'true');
      cv.getContext('2d').drawImage(src, 0, 0);
      el.insertBefore(cv, el.firstChild);
    });

    // Microprint lines and a serial number, like the ones on banknotes
    var s = 'LAMIDE AKOMOLAFE \u00B7 PRODUCT \u00B7 AI \u00B7 AUTOMATION \u00B7 ';
    document.querySelectorAll('[data-micro]').forEach(function (el) {
      var t = ''; for (var i = 0; i < 40; i++) t += s; el.textContent = t;
    });
    var serial = 'No. ' + (100000 + Math.floor(Math.random() * 899999)).toString().replace(/(\d{3})(\d{3})/, '$1 $2');
    document.querySelectorAll('[data-serial]').forEach(function (el) { el.textContent = serial; });
  }

  // Seal: a guilloche rosette ringed with lettering, like the stamp on a certificate
  function seal() {
    var host = document.querySelector('[data-seal]');
    if (!host) return;
    var ring = 'LAMIDE AKOMOLAFE \u00B7 PRODUCT \u00B7 AI AGENTS \u00B7 AUTOMATION \u00B7 ';
    var img = draw('seal').toDataURL('image/png');
    host.innerHTML =
      '<svg viewBox="0 0 220 220" aria-hidden="true"><defs><path id="sealPath" d="M110,110 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0"/></defs>' +
      '<circle cx="110" cy="110" r="108" fill="none" stroke="' + INK + '" stroke-width="1"/>' +
      '<circle cx="110" cy="110" r="104" fill="none" stroke="' + INK + '" stroke-width=".6"/>' +
      '<circle cx="110" cy="110" r="80" fill="none" stroke="' + INK + '" stroke-width=".8"/>' +
      '<g class="seal-ring"><text font-family="Cinzel, serif" font-weight="700" font-size="10.5" letter-spacing="2.6" fill="' + INK + '"><textPath href="#sealPath">' + ring + ring + '</textPath></text></g>' +
      '<image href="' + img + '" x="0" y="0" width="220" height="220"/>' +
      '<circle cx="110" cy="110" r="29" fill="#EBE4D0" stroke="' + INK + '" stroke-width="1"/><circle cx="110" cy="110" r="25" fill="none" stroke="' + INK + '" stroke-width=".6"/>' +
      '<text x="110" y="118" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="21" fill="#0F1C5C">LA</text></svg>';
  }

  // Dial: the Now page shows the actual time, engraved
  function dial() {
    var host = document.querySelector('[data-dial]');
    if (!host) return;
    var img = draw('dial').toDataURL('image/png'), ticks = '', nums = '';
    var roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (var i = 0; i < 60; i++) {
      var a = i * Math.PI / 30, big = i % 5 === 0, r1 = big ? 90 : 93, r2 = 97;
      ticks += '<line x1="' + (100 + r1 * Math.sin(a)).toFixed(2) + '" y1="' + (100 - r1 * Math.cos(a)).toFixed(2) + '" x2="' + (100 + r2 * Math.sin(a)).toFixed(2) + '" y2="' + (100 - r2 * Math.cos(a)).toFixed(2) + '" stroke="' + INK + '" stroke-width="' + (big ? 1.4 : .6) + '"/>';
    }
    for (var h = 0; h < 12; h++) {
      var b = h * Math.PI / 6;
      nums += '<text x="' + (100 + 78 * Math.sin(b)).toFixed(2) + '" y="' + (100 - 78 * Math.cos(b) + 3).toFixed(2) + '" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="8" fill="#0F1C5C">' + roman[h] + '</text>';
    }
    host.innerHTML =
      '<svg viewBox="0 0 200 200" role="img" aria-label="An engraved clock showing the current time">' +
      '<circle cx="100" cy="100" r="99" fill="#EBE4D0" stroke="' + INK + '" stroke-width="1"/><circle cx="100" cy="100" r="95" fill="none" stroke="' + INK + '" stroke-width=".5"/>' + ticks +
      '<image href="' + img + '" x="40" y="40" width="120" height="120" opacity=".85"/>' + nums +
      '<g id="dH"><line x1="100" y1="106" x2="100" y2="56" stroke="#0F1C5C" stroke-width="3.2" stroke-linecap="round"/></g>' +
      '<g id="dM"><line x1="100" y1="108" x2="100" y2="34" stroke="#0F1C5C" stroke-width="2" stroke-linecap="round"/></g>' +
      '<g id="dS"><line x1="100" y1="114" x2="100" y2="30" stroke="' + RED + '" stroke-width="1"/></g>' +
      '<circle cx="100" cy="100" r="5" fill="#EBE4D0" stroke="' + INK + '" stroke-width="1.2"/><circle cx="100" cy="100" r="1.6" fill="' + RED + '"/></svg>';
    var gH = host.querySelector('#dH'), gM = host.querySelector('#dM'), gS = host.querySelector('#dS');
    function tick() {
      var d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
      gH.setAttribute('transform', 'rotate(' + (hr * 30) + ' 100 100)');
      gM.setAttribute('transform', 'rotate(' + (min * 6) + ' 100 100)');
      gS.setAttribute('transform', 'rotate(' + (Math.floor(sec) * 6) + ' 100 100)');
    }
    tick(); setInterval(tick, 1000);
  }

  // Fresco: cards and callouts are laid down like patches of wet plaster as they scroll in
  // (anything already on screen is left alone; the classes are removed afterwards so nothing stays clipped)
  function reveal() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var n = 0;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el); el.classList.add('in');
        var clean = function (ev) { if (ev && ev.propertyName && ev.propertyName !== 'clip-path') return; el.classList.remove('reveal', 'reveal-b', 'in'); el.removeEventListener('transitionend', clean); };
        el.addEventListener('transitionend', clean); setTimeout(clean, 2400);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.card, .callout, .wall .inner, .post-content > *').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.classList.add('reveal'); if (n++ % 2) el.classList.add('reveal-b'); io.observe(el);
    });
  }

  // Reading progress: a gold line grows along the header's braid
  function progress() {
    var post = document.querySelector('.post-content'), head = document.querySelector('header.top');
    if (!post || !head) return;
    var bar = document.createElement('div'); bar.className = 'read-progress'; bar.setAttribute('aria-hidden', 'true');
    head.appendChild(bar);
    var pend = false;
    function upd() {
      pend = false;
      var r = post.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      bar.style.setProperty('--p', Math.max(0, Math.min(1, total > 0 ? -r.top / total : 1)).toFixed(4));
    }
    window.addEventListener('scroll', function () { if (!pend) { pend = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  // Mobile menu
  function menu() {
    var btn = document.getElementById('menuBtn'), nav = document.getElementById('siteNav');
    if (!btn || !nav) return;
    function set(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 859) set(false); });
  }

  function init() { fill(); seal(); dial(); reveal(); progress(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// Guest Counter
function initGuestCounter() {
  const counterEl = document.getElementById('guest-counter');
  if (!counterEl) return;
  
  // Get or create visitor count
  let count = parseInt(localStorage.getItem('visitorCount') || '1234', 10);
  
  // Increment if this is a new visit (not just refresh)
  if (!sessionStorage.getItem('visited')) {
    count += Math.floor(Math.random() * 3) + 1; // Add 1-3 for realistic growth
    localStorage.setItem('visitorCount', count.toString());
    sessionStorage.setItem('visited', 'true');
  }
  
  // Format with commas
  const formattedCount = count.toLocaleString('en-US');
  counterEl.textContent = `Visitor #${formattedCount}`;
}

// Page Load Time
function initLoadTime() {
  const loadTimeEl = document.getElementById('load-time');
  if (!loadTimeEl) return;
  
  // loadEventEnd is 0 until the load event has finished, so wait for it
  if (!performance.timing.loadEventEnd) {
    window.addEventListener('load', () => setTimeout(initLoadTime, 0), { once: true });
    return;
  }
  const loadTime = (performance.timing.loadEventEnd - performance.timing.navigationStart) / 1000;
  const formattedTime = loadTime.toFixed(2);
  loadTimeEl.textContent = `Page loaded in ${formattedTime}s`;
}


// Konami Code for starfield animation
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
  konamiCode.push(e.key);
  
  // Keep only last 10 keys
  if (konamiCode.length > 10) {
    konamiCode.shift();
  }
  
  // Check if sequence matches
  if (konamiCode.length >= 10) {
    const recent = konamiCode.slice(-10);
    if (recent.join(',') === konamiSequence.join(',')) {
      activateStarfield();
      konamiCode = []; // Reset
    }
  }
});

function activateStarfield() {
  const starfield = document.getElementById('starfield');
  if (!starfield) return;
  
  // Remove existing stars
  starfield.innerHTML = '';
  starfield.classList.add('starfield');
  
  // Create stars
  for (let i = 0; i < 100; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 5 + 's';
    star.style.animationDuration = (Math.random() * 3 + 2) + 's';
    starfield.appendChild(star);
  }
  
  // Remove after 10 seconds
  setTimeout(() => {
    starfield.innerHTML = '';
    starfield.classList.remove('starfield');
  }, 10000);
}

// Prefetch pages on hover for smooth transitions
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[href^="/"]');
  
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.html')) {
        const linkElement = document.createElement('link');
        linkElement.rel = 'prefetch';
        linkElement.href = href;
        document.head.appendChild(linkElement);
      }
    });
  });
});

// Copy link functionality
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      // Show feedback
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }
}

// Skip link for accessibility
document.addEventListener('DOMContentLoaded', () => {
  // Add skip to main content link
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'skip-link';
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Add main content ID if not present
  const main = document.querySelector('main');
  if (main && !main.id) {
    main.id = 'main-content';
  }
  
  // Back to top button
  const backToTop = document.createElement('a');
  backToTop.href = '#';
  backToTop.textContent = '↑ Top';
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(backToTop);
  
  // Show/hide back to top button
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTop.classList.add('show');
    } else {
      backToTop.classList.remove('show');
    }
  });
  
  // Copy code functionality
  document.querySelectorAll('pre code, code').forEach(codeBlock => {
    if (codeBlock.parentElement.tagName === 'PRE') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-code';
      copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
      copyBtn.addEventListener('click', async () => {
        const text = codeBlock.textContent;
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
      codeBlock.parentElement.style.position = 'relative';
      codeBlock.parentElement.appendChild(copyBtn);
    }
  });
  
  // Keyboard navigation indicators
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });
  
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
  
  // Initialize additional features
  initGuestCounter();
  initLoadTime();
});
