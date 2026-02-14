(() => {
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d', { alpha: true });

  const DPR = () => Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = DPR();
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Scene ambience
  const stars = [];
  function seedStars() {
    stars.length = 0;
    const n = Math.floor((W * H) / 22000);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.55 + 0.08,
        tw: Math.random() * 1.2 + 0.4,
        ph: Math.random() * Math.PI * 2,
      });
    }
  }
  seedStars();
  window.addEventListener('resize', seedStars, { passive: true });

  // Utilities
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const palette = [
    { name: 'gold', core: [255, 212, 90] },
    { name: 'cyan', core: [79, 231, 255] },
    { name: 'mint', core: [124, 255, 196] },
    { name: 'hot', core: [255, 92, 244] },
    { name: 'vio', core: [163, 109, 255] },
    { name: 'red', core: [255, 88, 88] },
  ];

  function rgba(rgb, a) {
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // Particles
  const rockets = [];
  const sparks = [];

  function addRocket(targetX, targetY, burst = true) {
    const fromX = rand(W * 0.2, W * 0.8);
    const fromY = H + rand(20, 80);
    const tY = clamp(targetY, H * 0.12, H * 0.70);

    const col = palette[(Math.random() * palette.length) | 0];
    const travel = clamp((fromY - tY) / 650, 0.75, 1.5);

    rockets.push({
      x: fromX,
      y: fromY,
      vx: (targetX - fromX) / (60 * travel),
      vy: (tY - fromY) / (60 * travel),
      age: 0,
      life: Math.floor(60 * travel),
      col,
      burst,
      trail: [],
    });
  }

  function burst(x, y, col, power = 1) {
    // Big bloom
    const count = Math.floor(rand(80, 130) * power);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(2.2, 6.8) * power;
      const jitter = rand(-0.6, 0.6);
      const vx = Math.cos(a) * sp + jitter;
      const vy = Math.sin(a) * sp + jitter;
      sparks.push({
        x,
        y,
        vx,
        vy,
        g: rand(0.035, 0.06),
        drag: rand(0.982, 0.992),
        r: rand(1.2, 2.2) * (power * 0.9 + 0.15),
        col,
        a: 1,
        decay: rand(0.010, 0.018) / (power * 0.85 + 0.3),
        tw: rand(0.0, 0.9),
        type: 'spark',
      });
    }

    // Glitter ring
    const ringCount = Math.floor(rand(26, 42) * power);
    const ringR = rand(18, 38) * power;
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2 + rand(-0.03, 0.03);
      const vx = Math.cos(a) * rand(0.6, 1.2) * power;
      const vy = Math.sin(a) * rand(0.6, 1.2) * power;
      sparks.push({
        x: x + Math.cos(a) * ringR,
        y: y + Math.sin(a) * ringR,
        vx,
        vy,
        g: rand(0.02, 0.04),
        drag: rand(0.985, 0.994),
        r: rand(1.0, 1.8),
        col,
        a: rand(0.75, 0.95),
        decay: rand(0.012, 0.02),
        tw: rand(0.3, 1.2),
        type: 'glitter',
      });
    }

    // Flash
    sparks.push({ x, y, r: 0, a: 0.55, col, type: 'flash', life: 18 });

    // Crackle afterburst
    if (Math.random() < 0.72) {
      const c = Math.floor(rand(22, 40) * power);
      for (let i = 0; i < c; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(0.8, 2.2) * power;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          g: rand(0.03, 0.05),
          drag: rand(0.965, 0.985),
          r: rand(0.9, 1.4),
          col,
          a: 0.9,
          decay: rand(0.022, 0.034),
          tw: rand(0.0, 0.8),
          type: 'crackle',
        });
      }
    }
  }

  // Auto fireworks
  let auto = true;
  let nextAuto = 0;

  function scheduleAuto(now) {
    const base = 420;
    const jitter = rand(0, 720);
    nextAuto = now + base + jitter;
  }

  // Drawing
  function drawStars(t) {
    ctx.save();
    for (const s of stars) {
      const tw = (Math.sin(t * 0.001 * s.tw + s.ph) + 1) * 0.5;
      const a = s.a * (0.7 + 0.6 * tw);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft haze near horizon
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    ctx.restore();
  }

  function drawRocket(r) {
    // trail
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > 18) r.trail.shift();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < r.trail.length; i++) {
      const p = r.trail[i];
      const t = i / (r.trail.length - 1 || 1);
      const a = (1 - t) * 0.5;
      ctx.fillStyle = rgba(r.col.core, a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, lerp(1.0, 2.6, 1 - t), 0, Math.PI * 2);
      ctx.fill();
    }

    // head
    ctx.fillStyle = rgba(r.col.core, 0.9);
    ctx.beginPath();
    ctx.arc(r.x, r.y, 2.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSpark(p) {
    if (p.type === 'flash') {
      const t = 1 - p.life / 18;
      const rr = easeOutCubic(t) * 65;
      const a = (1 - t) * p.a;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, rgba(p.col.core, a));
      g.addColorStop(1, rgba(p.col.core, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const tw = p.tw ? (Math.sin(performance.now() * 0.02 + p.x * 0.03) + 1) * 0.5 : 0;
    const a = clamp(p.a * (0.78 + tw * 0.45), 0, 1);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // soft glow
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
    glow.addColorStop(0, rgba(p.col.core, a * 0.35));
    glow.addColorStop(1, rgba(p.col.core, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fill();

    // core
    ctx.fillStyle = rgba(p.col.core, a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function step(dt, now) {
    // Rockets
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.age++;
      r.x += r.vx * (dt * 60);
      r.y += r.vy * (dt * 60);

      // small wiggle
      r.x += Math.sin((now + i * 13) * 0.01) * 0.22;

      if (r.age >= r.life) {
        rockets.splice(i, 1);
        if (r.burst) {
          const power = rand(0.85, 1.25);
          burst(r.x, r.y, r.col, power);
        }
      }
    }

    // Sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      if (p.type === 'flash') {
        p.life--;
        if (p.life <= 0) sparks.splice(i, 1);
        continue;
      }

      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.g * (dt * 60);
      p.x += p.vx * (dt * 60);
      p.y += p.vy * (dt * 60);
      p.a -= p.decay * (dt * 60);

      if (p.a <= 0 || p.y > H + 60 || p.x < -80 || p.x > W + 80) {
        sparks.splice(i, 1);
      }
    }

    // Auto
    if (auto && now >= nextAuto) {
      const x = rand(W * 0.18, W * 0.82);
      const y = rand(H * 0.12, H * 0.58);
      const burstCount = Math.random() < 0.22 ? 2 : 1;
      addRocket(x, y, true);
      if (burstCount === 2) {
        setTimeout(() => addRocket(x + rand(-120, 120), y + rand(-60, 60), true), rand(120, 260));
      }
      scheduleAuto(now);
    }
  }

  let last = performance.now();
  scheduleAuto(last);

  function frame(now) {
    const dt = clamp((now - last) / 1000, 0.001, 0.05);
    last = now;

    // Fade with slight persistence (smoke-like)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    drawStars(now);

    for (const r of rockets) drawRocket(r);
    for (const p of sparks) drawSpark(p);

    step(dt, now);
    requestAnimationFrame(frame);
  }

  // Init with a few bursts
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      addRocket(rand(W * 0.2, W * 0.8), rand(H * 0.14, H * 0.55), true);
    }, 250 + i * 180);
  }
  requestAnimationFrame(frame);

  // Interaction
  function pointerToCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    return { x, y };
  }

  canvas.addEventListener('pointerdown', (e) => {
    // Avoid hijacking clicks on UI overlay
    if (e.target !== canvas) return;
    const { x, y } = pointerToCanvas(e);
    const shots = Math.random() < 0.18 ? 2 : 1;
    addRocket(x, y, true);
    if (shots === 2) addRocket(x + rand(-90, 90), y + rand(-50, 50), true);
  }, { passive: true });

  // Countdown to Lunar New Year midnight for 2026 (Vietnam time, GMT+7).
  // Target: 2026-02-17 00:00:00 (Asia/Ho_Chi_Minh). Vietnam has no DST; fixed +07:00.
  const countdownDateEl = document.getElementById('countdownDate');
  const countdownDaysEl = document.getElementById('countdownDays');
  const numH = document.getElementById('numH');
  const numM = document.getElementById('numM');
  const numS = document.getElementById('numS');

  const TARGET_UTC_MS = Date.UTC(2026, 1, 16, 17, 0, 0, 0); // 2026-02-16 17:00Z == 2026-02-17 00:00 GMT+7
  let didMidnight = false;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function updateCountdown() {
    if (!countdownDaysEl || !numH || !numM || !numS) return;

    const nowMs = Date.now();
    const rawMs = TARGET_UTC_MS - nowMs;
    const ms = Math.max(0, rawMs);
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const rem = totalSec % 86400;
    const hh = Math.floor(rem / 3600);
    const mm = Math.floor((rem % 3600) / 60);
    const ss = rem % 60;

    if (countdownDateEl) countdownDateEl.textContent = '17/02/2026 00:00 (GMT+7)';
    countdownDaysEl.textContent = `${days} ngày`;
    numH.textContent = pad2(hh);
    numM.textContent = pad2(mm);
    numS.textContent = pad2(ss);

    // Fireworks celebration at midnight moment.
    if (!didMidnight && ms === 0) {
      didMidnight = true;
      for (let i = 0; i < 6; i++) {
        setTimeout(() => addRocket(rand(W * 0.18, W * 0.82), rand(H * 0.12, H * 0.52), true), i * 160);
      }
      spawnWish('Chúc Mừng Năm Mới 2026!');
    }
  }

  // Wishes: auto-random overlays on screen
  const wishes = [
    'Năm 2026 rực rỡ như pháo hoa, mọi điều hanh thông, vạn sự như ý.',
    'Chúc năm mới 2026: Sức khỏe dồi dào, tài lộc đầy nhà, niềm vui ngập tràn.',
    '2026 đến rồi: Bình an làm gốc, hạnh phúc làm hoa, thành công làm quả.',
    'Chúc bạn năm 2026 làm gì cũng thuận, đi đâu cũng may, gặp ai cũng quý.',
    'Năm mới 2026: Tâm an, trí sáng, công việc thăng tiến, gia đình ấm êm.',
    'Chúc 2026 nhiều năng lượng mới, cơ hội mới, và những kết quả xứng đáng.',
    'Xuân 2026: Mở lòng đón điều tốt, bền bỉ đi điều đúng, chạm đích điều mơ.',
    'Năm 2026: Phước lành đủ đầy, nụ cười thường trực, kế hoạch đều thành.',
  ];

  const wishLayer = document.getElementById('wishLayer');

  function pickWishPos() {
    // Try to avoid the center (where the hero block sits).
    for (let i = 0; i < 10; i++) {
      const x = rand(W * 0.10, W * 0.90);
      const y = rand(H * 0.12, H * 0.88);
      const inCenter = (x > W * 0.28 && x < W * 0.72 && y > H * 0.28 && y < H * 0.72);
      if (!inCenter) return { x, y };
    }
    return { x: rand(W * 0.12, W * 0.88), y: rand(H * 0.16, H * 0.86) };
  }

  function spawnWish(forcedText) {
    if (!wishLayer) return;
    const text = forcedText || wishes[(Math.random() * wishes.length) | 0];
    const col = palette[(Math.random() * palette.length) | 0].core;
    const { x, y } = pickWishPos();

    const el = document.createElement('div');
    el.className = 'wish-pop';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.borderColor = `rgba(${col[0]},${col[1]},${col[2]},0.22)`;
    el.style.boxShadow = `0 16px 45px rgba(0,0,0,.55), 0 0 0 1px rgba(${col[0]},${col[1]},${col[2]},0.08) inset`;
    wishLayer.appendChild(el);

    // Small celebratory burst near the wish (subtle).
    if (Math.random() < 0.55) addRocket(x, y + rand(40, 120), true);

    // Remove after animation ends.
    setTimeout(() => el.remove(), 9800);
  }

  // Auto: wishes keep coming.
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let wishTimer = null;
  function scheduleWishes() {
    if (wishTimer) clearInterval(wishTimer);
    const every = prefersReduced ? 9000 : 6200;
    wishTimer = setInterval(spawnWish, every);
    setTimeout(spawnWish, 500);
  }
  scheduleWishes();

  // Start countdown updates.
  updateCountdown();
  setInterval(updateCountdown, 250);
})();
