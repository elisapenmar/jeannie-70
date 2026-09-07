/* ============================================================
   disco.js — the mirror ball, the room lights, the glitter
   ============================================================ */
(function () {
  'use strict';

  /* Tempo. Everything that flashes is locked to this, so when the song
     lands we just change this one number to match its BPM. */
  var BPM  = 118;
  var BEAT = 60000 / BPM;
  document.documentElement.style.setProperty('--beat', (BEAT / 1000).toFixed(3) + 's');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;

  /* deterministic pseudo-random, so the ball looks the same every reload */
  function rnd(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

  /* ---------------------------------------------------------
     1. Room lights + glitter (DOM, animated by CSS)
     --------------------------------------------------------- */
  var SPOT_COLORS = ['#ffffff', '#ffffff', '#ffd76a', '#ff4fa3', '#5ce1ff', '#a56bff', '#9dff6a'];

  function seedLights(id, count, seed, minSize, range) {
    var host = document.getElementById(id);
    if (!host) return;
    var html = '';
    for (var i = seed; i < seed + count; i++) {
      var size = minSize + rnd(i * 5.1) * range;
      html += '<i style="' +
        '--x:' + (rnd(i * 1.7) * 100).toFixed(1) + '%;' +
        '--y:' + (rnd(i * 2.3) * 100).toFixed(1) + '%;' +
        '--s:' + size.toFixed(0) + 'px;' +
        '--c:' + SPOT_COLORS[Math.floor(rnd(i * 3.9) * SPOT_COLORS.length)] + ';' +
        '--dur:' + (BEAT * (2 + Math.floor(rnd(i * 4.4) * 6)) / 1000).toFixed(2) + 's;' +
        '--d:-' + (rnd(i * 6.2) * 4).toFixed(2) + 's"></i>';
    }
    host.innerHTML = html;
  }

  function seedStars() {
    var host = document.getElementById('stars');
    if (!host) return;
    var html = '';
    for (var i = 0; i < 34; i++) {
      html += '<i style="' +
        '--x:' + (rnd(i * 9.1) * 100).toFixed(1) + '%;' +
        '--y:' + (rnd(i * 7.3) * 92).toFixed(1) + '%;' +
        '--s:' + (1 + rnd(i * 2.9) * 3).toFixed(1) + 'px;' +
        '--dur:' + (1.6 + rnd(i * 5.5) * 3.4).toFixed(2) + 's;' +
        '--d:-' + (rnd(i * 8.8) * 5).toFixed(2) + 's"></i>';
    }
    host.innerHTML = html;
  }

  /* ---------------------------------------------------------
     2. The mirror ball
     --------------------------------------------------------- */
  var cvs = document.getElementById('ball');
  if (!cvs) return;
  var ctx = cvs.getContext('2d');

  var W = 0, H = 0, R = 0, cx = 0, cy = 0;

  function resize() {
    var dpr  = Math.min(window.devicePixelRatio || 1, 2);
    var rect = cvs.getBoundingClientRect();
    if (!rect.width) return;
    W = rect.width; H = rect.height;
    cvs.width  = Math.round(W * dpr);
    cvs.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R  = Math.min(W, H) / 2 - 1;
    cx = W / 2; cy = H / 2;
  }

  /* Latitude bands. Tiles per band scale with cos(lat) so every facet
     stays roughly square — the way a real mirror ball is tiled. */
  var ROWS = 20, COLS = 36, bands = [];
  for (var i = 0; i < ROWS; i++) {
    var lat0 = -Math.PI / 2 + i * Math.PI / ROWS;
    var lat1 = lat0 + Math.PI / ROWS;
    var latM = (lat0 + lat1) / 2;
    bands.push({
      lat0: lat0, lat1: lat1,
      s0: Math.sin(lat0), c0: Math.cos(lat0),
      s1: Math.sin(lat1), c1: Math.cos(lat1),
      sM: Math.sin(latM), cM: Math.cos(latM),
      n: Math.max(5, Math.round(COLS * Math.cos(latM)))
    });
  }

  /* key light + specular half-vector (view is straight down -z) */
  var Lx = -0.419, Ly = 0.499, Lz = 0.758;
  var Hx = -0.224, Hy = 0.266, Hz = 0.938;

  var FLASH = [[255,255,255],[255,215,106],[255,79,163],[92,225,255],[165,107,255]];

  function drawBall(t) {
    ctx.clearRect(0, 0, W, H);

    /* dark body underneath, so the gaps between tiles read as shadow */
    var body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R);
    body.addColorStop(0, '#454b63');
    body.addColorStop(1, '#070911');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = body;
    ctx.fill();

    var rot  = reduced ? 0.7 : t * 0.00028;
    var half = Math.floor(t / (BEAT / 2));           /* eighth-note flashes  */
    var down = (t % (BEAT * 4)) / (BEAT * 4);        /* bar position 0..1    */
    var kick = reduced ? 0 : Math.pow(1 - Math.min(1, down * 5), 2) * 26;

    for (var b = 0; b < ROWS; b++) {
      var band = bands[b];
      var step = TAU / band.n;

      for (var j = 0; j < band.n; j++) {
        var lon0 = j * step + rot;
        var lon1 = lon0 + step;
        var lonM = lon0 + step / 2;

        var snM = Math.sin(lonM), csM = Math.cos(lonM);
        var nz = band.cM * csM;
        if (nz <= 0.045) continue;                    /* back of the ball */
        var nx = band.cM * snM, ny = band.sM;

        var sn0 = Math.sin(lon0), cs0 = Math.cos(lon0);
        var sn1 = Math.sin(lon1), cs1 = Math.cos(lon1);

        /* four corners, orthographic projection */
        var ax = cx + R * band.c0 * sn0, ay = cy - R * band.s0;
        var bx = cx + R * band.c0 * sn1, by = ay;
        var Cx = cx + R * band.c1 * sn1, Cy = cy - R * band.s1;
        var dx = cx + R * band.c1 * sn0, dy = Cy;

        /* inset toward the centroid to leave grout lines */
        var mx = (ax + bx + Cx + dx) / 4, my = (ay + by + Cy + dy) / 4;
        var k = 0.85;
        ax = mx + (ax - mx) * k; ay = my + (ay - my) * k;
        bx = mx + (bx - mx) * k; by = my + (by - my) * k;
        Cx = mx + (Cx - mx) * k; Cy = my + (Cy - my) * k;
        dx = mx + (dx - mx) * k; dy = my + (dy - my) * k;

        /* shading */
        var diff = nx * Lx + ny * Ly + nz * Lz; if (diff < 0) diff = 0;
        var spc  = nx * Hx + ny * Hy + nz * Hz; if (spc  < 0) spc  = 0;
        var id   = b * 97 + j;

        var v = 28 + 186 * Math.pow(diff, 1.2) + 225 * Math.pow(spc, 24) + kick;
        v *= 0.55 + 0.45 * Math.min(1, nz * 1.7);     /* darken toward the rim */
        v *= 0.84 + 0.30 * rnd(id);                   /* per-tile variation    */

        var r = v * 0.93, g = v * 0.97, bl = v * 1.09;

        /* a scatter of tiles catching the light on each eighth note */
        if (!reduced && rnd(id * 3.7 + half * 11.3) > 0.945) {
          var f = FLASH[Math.floor(rnd(id * 5.9 + half) * FLASH.length)];
          r = r * 0.35 + f[0] * 0.85;
          g = g * 0.35 + f[1] * 0.85;
          bl = bl * 0.35 + f[2] * 0.85;
        }

        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(Cx, Cy); ctx.lineTo(dx, dy);
        ctx.closePath();
        ctx.fillStyle = 'rgb(' + (r > 255 ? 255 : r | 0) + ',' +
                                 (g > 255 ? 255 : g | 0) + ',' +
                                 (bl > 255 ? 255 : bl | 0) + ')';
        ctx.fill();
      }
    }

    /* hot spot where the key light hits */
    ctx.globalCompositeOperation = 'lighter';
    var hx = cx + R * Lx * 0.55, hy = cy - R * Ly * 0.55;
    var glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.72);
    glow.addColorStop(0, 'rgba(255,255,255,.42)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    /* the little cap the cord hangs from */
    ctx.fillStyle = '#8c86a3';
    ctx.beginPath();
    ctx.ellipse(cx, cy - R + R * 0.03, R * 0.15, R * 0.06, 0, 0, TAU);
    ctx.fill();
  }

  /* ---------------------------------------------------------
     3. Run loop — idles whenever the ball isn't on screen
     --------------------------------------------------------- */
  var raf = 0, onScreen = true;

  function frame(t) { drawBall(t); raf = requestAnimationFrame(frame); }
  function start() { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame); }
  function stop()  { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  seedLights('lights', 30, 0, 30, 110);
  seedLights('lightsFront', 14, 41, 26, 78);
  seedStars();
  resize();
  drawBall(performance.now());   /* paint once immediately: a hidden or
                                    bfcache-restored tab must never show a blank ball */

  if (!reduced) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        onScreen = es[0].isIntersecting;
        onScreen ? start() : stop();
      }, { threshold: 0 }).observe(cvs);
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
    start();
  }

  var t0;
  window.addEventListener('resize', function () {
    clearTimeout(t0);
    t0 = setTimeout(function () { resize(); if (reduced) drawBall(0); }, 120);
  });
})();
