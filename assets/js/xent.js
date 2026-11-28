/* Interactive figures for the cross-entropy post. Plain canvas + vanilla JS, no libraries.
   Each figure finds its elements by id, draws on load, and redraws on resize. */
(function () {
  'use strict';

  var C = { text: '#c9cfdf', muted: '#9aa3b8', grid: 'rgba(255,255,255,.08)', axis: 'rgba(255,255,255,.25)',
            accent: '#7c9cff', cyan: '#55d6ff', amber: '#ffc46b', pink: '#ff7ab8', green: '#6ee7b7' };
  var LN2 = Math.LN2;
  var FONT = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  var redraws = [];

  function $(id) { return document.getElementById(id); }
  function fmt(x, d) { return (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d === undefined ? 3 : d); }

  /* Size a canvas to its CSS box at the device pixel ratio and return a 2D context in CSS pixels. */
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  /* Draw axes, grid and tick labels; return mapping functions from data to pixels. */
  function axes(s, xr, yr, o) {
    var ctx = s.ctx, m = { l: 56, r: 16, t: 14, b: 38 };
    var pw = s.w - m.l - m.r, ph = s.h - m.t - m.b;
    function X(x) { return m.l + (x - xr[0]) / (xr[1] - xr[0]) * pw; }
    function Y(y) { return m.t + ph - (y - yr[0]) / (yr[1] - yr[0]) * ph; }
    ctx.font = FONT; ctx.lineWidth = 1;
    var i, t;
    for (i = 0; i < o.xticks.length; i++) {
      t = o.xticks[i];
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(X(t), m.t); ctx.lineTo(X(t), m.t + ph); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText(String(t), X(t), m.t + ph + 16);
    }
    for (i = 0; i < o.yticks.length; i++) {
      t = o.yticks[i];
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(m.l, Y(t)); ctx.lineTo(m.l + pw, Y(t)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText(String(t), m.l - 8, Y(t) + 4);
    }
    ctx.strokeStyle = C.axis;
    ctx.beginPath(); ctx.moveTo(m.l, m.t); ctx.lineTo(m.l, m.t + ph); ctx.lineTo(m.l + pw, m.t + ph); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.textAlign = 'center';
    if (o.xlabel) ctx.fillText(o.xlabel, m.l + pw / 2, s.h - 6);
    if (o.ylabel) { ctx.save(); ctx.translate(12, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(o.ylabel, 0, 0); ctx.restore(); }
    return { X: X, Y: Y, m: m, pw: pw, ph: ph };
  }

  function curve(s, A, f, x0, x1, color, width, n) {
    var ctx = s.ctx; n = n || 240;
    ctx.strokeStyle = color; ctx.lineWidth = width || 2.5; ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n, y = f(x);
      if (i === 0) ctx.moveTo(A.X(x), A.Y(y)); else ctx.lineTo(A.X(x), A.Y(y));
    }
    ctx.stroke();
  }

  function dot(s, px, py, color) {
    var ctx = s.ctx;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#07080d'; ctx.lineWidth = 2; ctx.stroke();
  }

  function label(s, text, x, y, color, align) {
    s.ctx.font = '13px -apple-system, sans-serif'; s.ctx.fillStyle = color || C.text; s.ctx.textAlign = align || 'left';
    s.ctx.fillText(text, x, y);
  }

  function legend(s, items, x, y) {
    var ctx = s.ctx; ctx.font = FONT;
    items.forEach(function (it, i) {
      var yy = y + i * 18;
      ctx.fillStyle = it.color; ctx.fillRect(x, yy - 8, 14, 3);
      ctx.fillStyle = C.text; ctx.textAlign = 'left'; ctx.fillText(it.text, x + 20, yy - 2);
    });
  }

  function bind(id, fn) { var el = $(id); if (el) el.addEventListener('input', fn); }
  function register(draw) { redraws.push(draw); draw(); }
  window.addEventListener('resize', function () { redraws.forEach(function (d) { d(); }); });
  // A link such as #counting should open the panel it points at.
  (function () { var el = location.hash && document.querySelector(location.hash); if (el && el.tagName === 'DETAILS') el.open = true; })();
  // Figures inside collapsed <details> have no size until opened, so redraw everything when any panel toggles.
  document.addEventListener('toggle', function () { redraws.forEach(function (d) { d(); }); }, true);

  /* ---- math helpers ------------------------------------------------------------------ */
  function softmax(z) {
    var m = Math.max.apply(null, z), e = z.map(function (v) { return Math.exp(v - m); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / s; });
  }
  function entropy(p) { return p.reduce(function (a, v) { return v > 0 ? a - v * Math.log(v) : a; }, 0); }
  function crossEntropy(p, q) { return p.reduce(function (a, v, i) { return v > 0 ? a - v * Math.log(Math.max(q[i], 1e-12)) : a; }, 0); }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function normalPdf(x, m, s) { return Math.exp(-0.5 * Math.pow((x - m) / s, 2)) / (s * Math.sqrt(2 * Math.PI)); }

  /* ---- 1. Information content: I(p) = -log2 p ---------------------------------------------------- */
  (function () {
    var cv = $('v-info'); if (!cv) return;
    function draw() {
      var p = +$('s-info').value, s = setup(cv);
      var A = axes(s, [0, 1], [0, 6], { xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 1, 2, 3, 4, 5, 6], xlabel: 'probability of the event, p', ylabel: 'information content (bits)' });
      curve(s, A, function (x) { return -Math.log(Math.max(x, 1e-3)) / LN2; }, 0.01, 1, C.accent);
      var y = -Math.log(p) / LN2;
      s.ctx.setLineDash([4, 4]); s.ctx.strokeStyle = C.amber; s.ctx.beginPath();
      s.ctx.moveTo(A.X(p), A.Y(0)); s.ctx.lineTo(A.X(p), A.Y(y)); s.ctx.lineTo(A.X(0), A.Y(y)); s.ctx.stroke(); s.ctx.setLineDash([]);
      dot(s, A.X(p), A.Y(y), C.amber);
      $('r-info').textContent = 'p = ' + fmt(p, 2) + '  →  information = ' + fmt(y, 2) + ' bits';
    }
    register(draw); bind('s-info', draw);
  })();

  /* ---- 2. Entropy of a coin ----------------------------------------------------------- */
  (function () {
    var cv = $('v-coin'); if (!cv) return;
    function Hb(p) { return p <= 0 || p >= 1 ? 0 : -(p * Math.log(p) + (1 - p) * Math.log(1 - p)) / LN2; }
    function draw() {
      var p = +$('s-coin').value, s = setup(cv);
      var A = axes(s, [0, 1], [0, 1.1], { xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1], xlabel: 'probability of heads, p', ylabel: 'entropy H(p) in bits' });
      curve(s, A, Hb, 0, 1, C.cyan);
      dot(s, A.X(p), A.Y(Hb(p)), C.amber);
      $('r-coin').textContent = 'p(heads) = ' + fmt(p, 2) + '  →  H = ' + fmt(Hb(p), 3) + ' bits' +
        (Math.abs(p - 0.5) < 0.005 ? '   (the most uncertain a coin can be)' : '');
    }
    register(draw); bind('s-coin', draw);
  })();

  /* ---- 3. Cross-entropy for a Bernoulli truth ----------------------------------------- */
  (function () {
    var cv = $('v-bern'); if (!cv) return;
    function draw() {
      var p = +$('s-bern-p').value, q = +$('s-bern-q').value, s = setup(cv);
      function Hpq(x) { return -(p * Math.log(x) + (1 - p) * Math.log(1 - x)) / LN2; }
      var Hp = (p <= 0 || p >= 1) ? 0 : -(p * Math.log(p) + (1 - p) * Math.log(1 - p)) / LN2;
      var A = axes(s, [0, 1], [0, 5], { xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 1, 2, 3, 4, 5], xlabel: 'model probability of heads, q', ylabel: 'bits' });
      var ctx = s.ctx;
      ctx.strokeStyle = C.green; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath();
      ctx.moveTo(A.X(0), A.Y(Hp)); ctx.lineTo(A.X(1), A.Y(Hp)); ctx.stroke(); ctx.setLineDash([]);
      curve(s, A, function (x) { return Math.min(Hpq(Math.min(Math.max(x, 0.004), 0.996)), 5); }, 0.004, 0.996, C.accent);
      var cq = Math.min(Math.max(q, 0.004), 0.996), hq = Math.min(Hpq(cq), 5);
      ctx.strokeStyle = C.amber; ctx.lineWidth = 6; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(A.X(cq), A.Y(Hp)); ctx.lineTo(A.X(cq), A.Y(hq)); ctx.stroke(); ctx.globalAlpha = 1;
      dot(s, A.X(cq), A.Y(hq), C.amber);
      dot(s, A.X(p), A.Y(Hp), C.green);
      legend(s, [{ color: C.accent, text: 'cross-entropy H(p, q)' }, { color: C.green, text: 'entropy H(p), the floor' }, { color: C.amber, text: 'gap = KL(p || q)' }], A.X(0.3), A.m.t + 16);
      $('r-bern').textContent = 'H(p) = ' + fmt(Hp) + '   H(p, q) = ' + fmt(Hpq(cq)) + '   KL(p||q) = ' + fmt(Hpq(cq) - Hp) + '  bits';
    }
    register(draw); bind('s-bern-p', draw); bind('s-bern-q', draw);
  })();

  /* ---- 4. Three-class explorer with gradient descent ---------------------------------- */
  (function () {
    var cv = $('v-three'); if (!cv) return;
    var cv2 = $('v-three-loss'), btn = $('b-three-run'), rst = $('b-three-reset');
    var names = ['cat', 'dog', 'bird'], targets = { soft: [0.7, 0.2, 0.1], hard: [1, 0, 0] };
    var z = [2.0, 1.0, 0.1], history = [], timer = null;
    function target() { return document.querySelector('input[name="three-target"]:checked').value === 'hard' ? targets.hard : targets.soft; }
    function sync() { for (var i = 0; i < 3; i++) { $('s-z' + i).value = z[i]; $('l-z' + i).textContent = fmt(z[i], 1); } }
    function draw() {
      var p = target(), q = softmax(z), s = setup(cv), ctx = s.ctx;
      var ce = crossEntropy(p, q), h = entropy(p);
      var baseY = s.h - 34, maxH = s.h - 70, slot = (s.w - 40) / 3, i;
      ctx.font = FONT;
      for (i = 0; i < 3; i++) {
        var x0 = 20 + i * slot, bw = Math.min(54, slot / 3);
        var hp = p[i] * maxH, hq = q[i] * maxH, cx = x0 + slot / 2;
        ctx.fillStyle = C.accent; ctx.fillRect(cx - bw - 4, baseY - hq, bw, hq);
        ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.strokeRect(cx + 4, baseY - hp, bw, hp);
        ctx.fillStyle = C.text; ctx.textAlign = 'center';
        ctx.fillText(fmt(q[i], 3), cx - bw / 2 - 4, baseY - hq - 6);
        ctx.fillText(fmt(p[i], 2), cx + bw / 2 + 4, baseY - hp - 6);
        ctx.fillStyle = C.muted; ctx.fillText(names[i], cx, baseY + 18);
      }
      ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(14, baseY); ctx.lineTo(s.w - 14, baseY); ctx.stroke();
      legend(s, [{ color: C.accent, text: 'model q = softmax(z)' }, { color: C.amber, text: 'target p' }], 20, 22);
      $('r-three').innerHTML = 'H(p) = ' + fmt(h) + ' &nbsp; H(p, q) = <b>' + fmt(ce) + '</b> &nbsp; KL(p‖q) = ' + fmt(ce - h) + ' nats' +
        '<br>gradient of the loss w.r.t. the logits, q − p = [' + q.map(function (v, k) { return fmt(v - p[k], 3); }).join(', ') + ']';
      drawLoss();
    }
    function drawLoss() {
      if (!cv2) return;
      var s = setup(cv2), n = Math.max(history.length, 2), top = Math.max(history.length ? history[0] : 1.5, 0.5);
      var A = axes(s, [0, Math.max(n - 1, 40)], [0, Math.ceil(top * 10) / 10], { xticks: [0, 10, 20, 30, 40], yticks: [0, +(top / 2).toFixed(2), +top.toFixed(2)], xlabel: 'gradient-descent step', ylabel: 'H(p, q) (nats)' });
      if (history.length > 1) {
        s.ctx.strokeStyle = C.pink; s.ctx.lineWidth = 2.5; s.ctx.beginPath();
        history.forEach(function (v, k) { if (k === 0) s.ctx.moveTo(A.X(k), A.Y(v)); else s.ctx.lineTo(A.X(k), A.Y(v)); });
        s.ctx.stroke();
      }
    }
    function step() {
      var p = target(), q = softmax(z);
      for (var i = 0; i < 3; i++) z[i] -= 0.5 * (q[i] - p[i]);
      history.push(crossEntropy(p, softmax(z)));
      sync(); draw();
      if (history.length > 120) stop();
    }
    function stop() { clearInterval(timer); timer = null; btn.textContent = 'Run gradient descent'; }
    btn.addEventListener('click', function () {
      if (timer) { stop(); return; }
      if (!history.length) history.push(crossEntropy(target(), softmax(z)));
      btn.textContent = 'Pause'; timer = setInterval(step, 60);
    });
    rst.addEventListener('click', function () { stop(); z = [2.0, 1.0, 0.1]; history = []; sync(); draw(); });
    for (var i = 0; i < 3; i++) (function (k) { bind('s-z' + k, function () { z[k] = +$('s-z' + k).value; history = []; sync(); draw(); }); })(i);
    document.querySelectorAll('input[name="three-target"]').forEach(function (r) { r.addEventListener('change', function () { history = []; draw(); }); });
    sync(); register(draw);
  })();

  /* ---- 5. Cross-entropy vs squared error on a sigmoid unit ---------------------------- */
  (function () {
    var cvL = $('v-bce-loss'), cvG = $('v-bce-grad'), cvT = $('v-bce-train'), btn = $('b-bce-train');
    if (!cvL) return;
    var frames = 0, anim = null, STEPS = 400, ceTrace = [], mseTrace = [];
    (function simulate() {
      var zc = -5, zm = -5, i, yc, ym;
      for (i = 0; i < STEPS; i++) {
        yc = sigmoid(zc); ym = sigmoid(zm);
        ceTrace.push(yc); mseTrace.push(ym);
        zc -= 1.0 * (yc - 1);
        zm -= 1.0 * 2 * (ym - 1) * ym * (1 - ym);
      }
    })();
    function drawLoss() {
      var s = setup(cvL);
      var A = axes(s, [0, 1], [0, 5], { xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 1, 2, 3, 4, 5], xlabel: 'predicted probability of the true class, ŷ', ylabel: 'loss (true label y = 1)' });
      curve(s, A, function (x) { return Math.min(-Math.log(Math.max(x, 1e-3)), 5); }, 0.007, 1, C.accent);
      curve(s, A, function (x) { return (1 - x) * (1 - x); }, 0, 1, C.amber);
      legend(s, [{ color: C.accent, text: 'cross-entropy  −ln ŷ' }, { color: C.amber, text: 'squared error  (1 − ŷ)²' }], A.m.l + 160, A.m.t + 20);
    }
    function drawGrad() {
      var s = setup(cvG);
      var A = axes(s, [-8, 8], [-1.05, 0.05], { xticks: [-8, -4, 0, 4, 8], yticks: [-1, -0.75, -0.5, -0.25, 0], xlabel: 'logit z   (z ≪ 0 means confidently wrong)', ylabel: 'dLoss / dz' });
      curve(s, A, function (z) { return sigmoid(z) - 1; }, -8, 8, C.accent);
      curve(s, A, function (z) { var y = sigmoid(z); return 2 * (y - 1) * y * (1 - y); }, -8, 8, C.amber);
      legend(s, [{ color: C.accent, text: 'cross-entropy: ŷ − 1' }, { color: C.amber, text: 'squared error: 2(ŷ − 1) ŷ (1 − ŷ)' }], A.X(0.5), A.Y(-0.55));
    }
    function drawTrain() {
      var s = setup(cvT);
      var A = axes(s, [0, STEPS], [0, 1], { xticks: [0, 100, 200, 300, 400], yticks: [0, 0.5, 1], xlabel: 'gradient-descent step', ylabel: 'ŷ (want 1)' });
      function trace(arr, color) {
        s.ctx.strokeStyle = color; s.ctx.lineWidth = 2.5; s.ctx.beginPath();
        for (var i = 0; i < Math.min(frames, arr.length); i++) { if (i === 0) s.ctx.moveTo(A.X(i), A.Y(arr[i])); else s.ctx.lineTo(A.X(i), A.Y(arr[i])); }
        s.ctx.stroke();
      }
      trace(ceTrace, C.accent); trace(mseTrace, C.amber);
      legend(s, [{ color: C.accent, text: 'trained with cross-entropy' }, { color: C.amber, text: 'trained with squared error' }], A.X(170), A.Y(0.5));
    }
    function drawAll() { drawLoss(); drawGrad(); drawTrain(); }
    btn.addEventListener('click', function () {
      if (anim) clearInterval(anim);
      frames = 0; btn.textContent = 'Training…';
      anim = setInterval(function () {
        frames += 4; drawTrain();
        if (frames >= STEPS) { clearInterval(anim); anim = null; btn.textContent = 'Train again'; }
      }, 30);
    });
    frames = STEPS; register(drawAll);
  })();

  /* ---- 6. Forward vs reverse KL: fitting one Gaussian to two bumps -------------------- */
  (function () {
    var cv = $('v-kl'); if (!cv) return;
    var N = 400, LO = -8, HI = 8, DX = (HI - LO) / (N - 1), xs = [], pdf = [], i, tween = null;
    for (i = 0; i < N; i++) { xs.push(LO + i * DX); pdf.push(0.5 * normalPdf(xs[i], -2, 0.7) + 0.5 * normalPdf(xs[i], 2, 0.7)); }
    function kls(m, sd) {
      var f = 0, r = 0;
      for (var k = 0; k < N; k++) {
        var q = normalPdf(xs[k], m, sd), p = pdf[k];
        if (p > 1e-12) f += p * Math.log(p / Math.max(q, 1e-300));
        if (q > 1e-12) r += q * Math.log(q / Math.max(p, 1e-300));
      }
      return { fwd: f * DX, rev: r * DX };
    }
    function draw() {
      var m = +$('s-kl-mu').value, sd = +$('s-kl-sd').value, s = setup(cv);
      var A = axes(s, [-6, 6], [0, 0.65], { xticks: [-6, -4, -2, 0, 2, 4, 6], yticks: [0, 0.2, 0.4, 0.6], xlabel: 'x', ylabel: 'density' });
      curve(s, A, function (x) { return 0.5 * normalPdf(x, -2, 0.7) + 0.5 * normalPdf(x, 2, 0.7); }, -6, 6, C.amber, 2.5, 300);
      curve(s, A, function (x) { return normalPdf(x, m, sd); }, -6, 6, C.accent, 2.5, 300);
      legend(s, [{ color: C.amber, text: 'true distribution p (two bumps)' }, { color: C.accent, text: 'model q = a single Gaussian' }], A.m.l + 10, A.m.t + 16);
      var k = kls(m, sd);
      $('r-kl').innerHTML = 'KL(p‖q) = <b>' + fmt(k.fwd) + '</b> &nbsp;&nbsp; KL(q‖p) = <b>' + fmt(k.rev) + '</b> nats';
      $('l-kl-mu').textContent = fmt(m, 2); $('l-kl-sd').textContent = fmt(sd, 2);
    }
    function fit(which) {
      var best = { v: Infinity, m: 0, s: 1 };
      for (var m = -4; m <= 4.0001; m += 0.1) for (var sd = 0.3; sd <= 4.0001; sd += 0.05) {
        var v = kls(m, sd)[which]; if (v < best.v) best = { v: v, m: m, s: sd };
      }
      var m0 = +$('s-kl-mu').value, s0 = +$('s-kl-sd').value, t = 0;
      if (tween) clearInterval(tween);
      tween = setInterval(function () {
        t += 1; var u = 1 - Math.pow(1 - t / 40, 3);
        $('s-kl-mu').value = m0 + (best.m - m0) * u; $('s-kl-sd').value = s0 + (best.s - s0) * u; draw();
        if (t >= 40) { clearInterval(tween); tween = null; }
      }, 25);
    }
    $('b-kl-fwd').addEventListener('click', function () { fit('fwd'); });
    $('b-kl-rev').addEventListener('click', function () { fit('rev'); });
    bind('s-kl-mu', draw); bind('s-kl-sd', draw); register(draw);
  })();

  /* ---- Stirling picture: ln(m!) is a staircase of bars; the curve ln x is a smooth stand-in ----- */
  (function () {
    var cv = $('v-stirling'); if (!cv) return;
    function draw() {
      var m = +$('s-stirling').value, s = setup(cv), ctx = s.ctx;
      var ymax = Math.log(m) * 1.15 + 0.3;
      var xt = [], yt = [], k;
      for (k = 0; k <= m; k += Math.max(1, Math.round(m / 6))) xt.push(k);
      for (k = 0; k <= ymax; k += 1) yt.push(k);
      var A = axes(s, [0, m + 0.5], [0, ymax], { xticks: xt, yticks: yt, xlabel: 'k  (each bar is one factor of m!)', ylabel: 'ln k' });
      var sum = 0;
      for (k = 2; k <= m; k++) {
        var h = Math.log(k); sum += h;
        ctx.fillStyle = 'rgba(124,156,255,.45)'; ctx.strokeStyle = C.accent; ctx.lineWidth = 1;
        ctx.fillRect(A.X(k - 1), A.Y(h), A.X(k) - A.X(k - 1), A.Y(0) - A.Y(h));
        ctx.strokeRect(A.X(k - 1), A.Y(h), A.X(k) - A.X(k - 1), A.Y(0) - A.Y(h));
      }
      curve(s, A, function (x) { return Math.log(Math.max(x, 1e-3)); }, 1, m, C.amber, 2.5, 200);
      var area = m * Math.log(m) - m + 1;
      legend(s, [{ color: C.accent, text: 'bars: ln 2 + ln 3 + … + ln m  =  ln(m!)' }, { color: C.amber, text: 'curve: ln x, and the area under it from 1 to m  =  m ln m − m + 1' }], A.m.l + 14, A.m.t + 16);
      $('l-stirling').textContent = m;
      $('r-stirling').innerHTML = 'ln(m!) = <b>' + fmt(sum, 2) + '</b> &nbsp; area under the curve = <b>' + fmt(area, 2) + '</b> &nbsp; gap = ' + fmt(sum - area, 2) +
        ' &nbsp; (gap as a share of ln m!: ' + fmt(100 * (sum - area) / sum, 1) + '%)';
    }
    register(draw); bind('s-stirling', draw);
  })();

  /* ---- Rows of the coin table: how likely each "number of heads" is, and log2(W)/N against the entropy curve ---- */
  (function () {
    var c1 = $('v-rows'), c2 = $('v-rows-h'); if (!c1 || !c2) return;
    var lf = [0], i;
    for (i = 1; i <= 400; i++) lf.push(lf[i - 1] + Math.log(i));
    function Hb(p) { return p <= 0 || p >= 1 ? 0 : -(p * Math.log(p) + (1 - p) * Math.log(1 - p)) / LN2; }
    function draw() {
      var N = +$('s-rows').value, k, logW = [], prob = [], pmax = 0;
      for (k = 0; k <= N; k++) {
        logW.push(lf[N] - lf[k] - lf[N - k]);
        prob.push(Math.exp(logW[k] - N * Math.LN2));
        pmax = Math.max(pmax, prob[k]);
      }
      var s = setup(c1), ctx = s.ctx;
      var A = axes(s, [0, 1], [0, pmax * 1.15], { xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, +(pmax / 2).toPrecision(2), +pmax.toPrecision(2)], xlabel: 'fraction of heads, k / N   (each bar is one row of the table)', ylabel: 'chance of that row' });
      var bw = Math.max(1, A.pw / (N + 1) - 1);
      ctx.fillStyle = 'rgba(124,156,255,.7)';
      for (k = 0; k <= N; k++) ctx.fillRect(A.X(k / N) - bw / 2, A.Y(prob[k]), bw, A.Y(0) - A.Y(prob[k]));
      s = setup(c2); ctx = s.ctx;
      var B = axes(s, [0, 1], [0, 1.1], { xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1], xlabel: 'fraction of heads, k / N', ylabel: 'bits per flip' });
      curve(s, B, Hb, 0, 1, C.amber, 2.5, 200);
      ctx.fillStyle = C.cyan;
      for (k = 0; k <= N; k++) { ctx.beginPath(); ctx.arc(B.X(k / N), B.Y(logW[k] / Math.LN2 / N), N > 100 ? 1.8 : 3.5, 0, 2 * Math.PI); ctx.fill(); }
      legend(s, [{ color: C.cyan, text: 'log₂(W) / N for each row of the table' }, { color: C.amber, text: 'entropy formula H(p) = −p log₂ p − (1−p) log₂(1−p)' }], B.m.l + 14, B.m.t + 22);
      var mid = Math.round(N / 2), within = 3 * Math.sqrt(N) / 2 / N * 100;
      $('l-rows').textContent = N;
      $('r-rows').innerHTML = N + ' flips have 2<sup>' + N + '</sup> equally likely arrangements. The busiest row (k = ' + mid + ') holds <b>' + fmt(100 * prob[mid], 1) + '%</b> of them, and almost all of them (99.7%) lie within ±' + fmt(within, 1) + ' points of 50% heads. ' +
        'The busiest row has log₂(W)/N = <b>' + fmt(logW[mid] / Math.LN2 / N, 3) + '</b> bits per flip, against log₂(all arrangements)/N = 1.';
    }
    register(draw); bind('s-rows', draw);
  })();

  /* ---- 6b. Temperature and label smoothing --------------------------------------------- */
  (function () {
    var cv = $('v-temp'); if (!cv) return;
    var z = [2.0, 1.0, 0.1], names = ['cat', 'dog', 'bird'];
    function draw() {
      var T = +$('s-temp').value, eps = +$('s-smooth').value, s = setup(cv), ctx = s.ctx;
      var q = softmax(z.map(function (v) { return v / T; })), K = 3, i;
      var smooth = [1 - eps + eps / K, eps / K, eps / K];
      var base = s.h - 30, maxH = s.h - 88, slot = (s.w - 40) / 3;
      ctx.font = FONT;
      for (i = 0; i < 3; i++) {
        var cx = 20 + i * slot + slot / 2, bw = Math.min(54, slot / 3);
        ctx.fillStyle = C.accent; ctx.fillRect(cx - bw - 4, base - q[i] * maxH, bw, q[i] * maxH);
        ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.strokeRect(cx + 4, base - smooth[i] * maxH, bw, smooth[i] * maxH);
        ctx.fillStyle = C.text; ctx.textAlign = 'center';
        ctx.fillText(fmt(q[i], 3), cx - bw / 2 - 4, base - q[i] * maxH - 6);
        ctx.fillText(fmt(smooth[i], 3), cx + bw / 2 + 4, base - smooth[i] * maxH - 6);
        ctx.fillStyle = C.muted; ctx.fillText(names[i], cx, base + 18);
      }
      ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(14, base); ctx.lineTo(s.w - 14, base); ctx.stroke();
      legend(s, [{ color: C.accent, text: 'softmax(z / T), the model output at temperature T' }, { color: C.amber, text: 'label-smoothed target for "cat"' }], 20, 18);
      $('l-temp').textContent = fmt(T, 1); $('l-smooth').textContent = fmt(eps, 2);
      $('r-temp').innerHTML = 'entropy of the model output = <b>' + fmt(entropy(q)) + '</b> nats (max ' + fmt(Math.log(3)) + ')' +
        ' &nbsp; loss against the smoothed target = <b>' + fmt(crossEntropy(smooth, softmax(z))) + '</b> (hard label: ' + fmt(-Math.log(softmax(z)[0])) + ')';
    }
    register(draw); bind('s-temp', draw); bind('s-smooth', draw);
  })();

  /* ---- 7. Focal loss ------------------------------------------------------------------ */
  (function () {
    var cv = $('v-focal'); if (!cv) return;
    register(function () {
      var s = setup(cv);
      var A = axes(s, [0, 1], [0, 4.6], { xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 1, 2, 3, 4], xlabel: 'probability given to the correct class, pₜ', ylabel: 'loss' });
      var gs = [[0, C.accent], [1, C.cyan], [2, C.green], [5, C.amber]];
      gs.forEach(function (g) {
        curve(s, A, function (x) { return Math.min(-Math.pow(1 - x, g[0]) * Math.log(Math.max(x, 1e-3)), 4.6); }, 0.01, 1, g[1]);
      });
      legend(s, gs.map(function (g) { return { color: g[1], text: g[0] === 0 ? 'γ = 0 (plain cross-entropy)' : 'γ = ' + g[0] }; }), A.m.l + 200, A.m.t + 24);
    });
  })();
})();
