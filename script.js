// ======================================================
// Sánchez / Cleaning — interactions + live BTC payments
// ======================================================

// ---- CONFIG (replace with the real company bitcoin address) ----
const BTC_ADDRESS = 'bc1qsanchezcleaningxxxxxxxxxxxxxxxxxxxxxxx'; // on-chain fallback
const BTC_LN      = 'sanchez@walletofsatoshi.com';               // lightning address
const BTC_LABEL   = 'Sánchez/Cleaning Systems SV';

// ---------- custom cursor ----------
const cursor = document.querySelector('.cursor');
if (matchMedia('(pointer:fine)').matches) {
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
  const loop = () => {
    x += (tx - x) * 0.2; y += (ty - y) * 0.2;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(loop);
  };
  loop();
  const bindHover = (el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
  };
  document.querySelectorAll('[data-hover], a, button, input, select, textarea, label').forEach(bindHover);
} else { cursor.style.display = 'none'; }

// ---------- nav theme switch over dark sections ----------
const nav = document.querySelector('.nav');
const darkSections = document.querySelectorAll('.hero, .btc, .foot, .marquee');
const darkIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting && e.intersectionRatio > 0.4) nav.classList.add('is-dark');
    else {
      // only remove if nothing else is dark-visible
      const anyDark = [...darkSections].some((s) => {
        const r = s.getBoundingClientRect();
        return r.top < 80 && r.bottom > 80;
      });
      nav.classList.toggle('is-dark', anyDark);
    }
  });
}, { threshold: [0, 0.4, 1], rootMargin: '-60px 0px -80% 0px' });
darkSections.forEach((s) => darkIO.observe(s));

// ---------- reveal on scroll ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('section, .idx__row, .svc-card, .specs > div, .brief__list li, .foot__cols > div')
  .forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    el.style.transitionDelay = `${Math.min(i * 30, 300)}ms`;
    io.observe(el);
  });

// ---------- clock SV (UTC-6) ----------
const clock = document.getElementById('clock');
const tick = () => {
  const now = new Date();
  const sv = new Date(now.getTime() + (now.getTimezoneOffset() - 360) * 60000);
  const hh = String(sv.getHours()).padStart(2, '0');
  const mm = String(sv.getMinutes()).padStart(2, '0');
  const ss = String(sv.getSeconds()).padStart(2, '0');
  clock.textContent = `${hh}:${mm}:${ss} SV`;
};
tick(); setInterval(tick, 1000);

// ---------- index preview tiles ----------
document.querySelectorAll('.idx__row').forEach((row) => {
  const key = row.dataset.img;
  const card = document.querySelector(`.idx__preview-card[data-key="${key}"]`);
  if (!card) return;
  row.addEventListener('pointerenter', () => card.classList.add('is-on'));
  row.addEventListener('pointerleave', () => card.classList.remove('is-on'));
  row.addEventListener('pointermove', (e) => {
    card.style.left = `${e.clientX}px`;
    card.style.top  = `${e.clientY}px`;
  });
});

// ---------- LIVE BTC price (CoinGecko) ----------
let rate = 92150;        // fallback
let rateSource = 'fallback';

const rateEl     = document.getElementById('rateResult');
const rateSrc    = document.getElementById('rateSource');
const satsEl     = document.getElementById('satsResult');
const btcEl      = document.getElementById('btcResult');
const amountInp  = document.getElementById('amountInput');
const invUsd     = document.getElementById('invUsd');
const invSats    = document.getElementById('invSats');
const invBlock   = document.getElementById('invBlock');
const footRate   = document.getElementById('footRate');
const footBlock  = document.getElementById('footBlock');

const fmtUsd = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtSats = (n) => `${Math.round(n).toLocaleString('en-US').replace(/,/g, ' ')} sats`;
const fmtBtc  = (n) => `${n.toFixed(8)} ₿`;

const computeSats = (usd) => (usd / rate) * 1e8;

const renderAll = () => {
  const usd = Math.max(0, parseFloat(amountInp.value || '0'));
  const sats = computeSats(usd);
  const btc = usd / rate;

  if (rateEl)  rateEl.textContent = fmtUsd(rate);
  if (rateSrc) rateSrc.textContent = `fuente: ${rateSource}`;
  if (satsEl)  satsEl.textContent  = fmtSats(sats);
  if (btcEl)   btcEl.textContent   = '≈ ' + fmtBtc(btc);
  if (invUsd)  invUsd.textContent  = fmtUsd(usd) + ' USD';
  if (invSats) invSats.textContent = fmtSats(sats);
  if (footRate) footRate.textContent = fmtUsd(rate);

  renderQR(btc);
};

const fetchRate = async () => {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!r.ok) throw new Error('coingecko');
    const j = await r.json();
    if (j?.bitcoin?.usd) { rate = j.bitcoin.usd; rateSource = 'CoinGecko · live'; }
  } catch {
    try {
      const r = await fetch('https://mempool.space/api/v1/prices');
      if (r.ok) { const j = await r.json(); if (j?.USD) { rate = j.USD; rateSource = 'mempool.space · live'; } }
    } catch { rateSource = 'fallback'; }
  }
  renderAll();
};

const fetchBlock = async () => {
  try {
    const r = await fetch('https://mempool.space/api/blocks/tip/height');
    if (!r.ok) return;
    const h = await r.text();
    const formatted = `block ${parseInt(h, 10).toLocaleString('en-US').replace(/,/g, ' ')}`;
    if (footBlock) footBlock.textContent = formatted;
    if (invBlock)  invBlock.textContent  = formatted.replace('block ', '#');
  } catch {}
};

fetchRate(); setInterval(fetchRate, 30_000);
fetchBlock(); setInterval(fetchBlock, 30_000);

// ---------- amount chips ----------
document.querySelectorAll('.btc__chips button').forEach((b) => {
  b.addEventListener('click', () => {
    amountInp.value = b.dataset.amount;
    document.querySelectorAll('.btc__chips button').forEach(x => x.classList.remove('is-on'));
    b.classList.add('is-on');
    renderAll();
  });
});
amountInp?.addEventListener('input', renderAll);

// ---------- QR code + wallet URI ----------
const qrMount = document.getElementById('qrMount');
const copyBtn = document.getElementById('copyUri');
const openBtn = document.getElementById('openWallet');

const buildUri = (btc) => {
  const amt = (Math.round(btc * 1e8) / 1e8).toFixed(8).replace(/\.?0+$/, '');
  const params = new URLSearchParams();
  if (amt && parseFloat(amt) > 0) params.set('amount', amt);
  params.set('label', BTC_LABEL);
  params.set('lightning', BTC_LN);
  return `bitcoin:${BTC_ADDRESS}?${params.toString()}`;
};

const renderQR = (btc) => {
  if (!qrMount || typeof window.qrcode !== 'function') return;
  const uri = buildUri(btc);
  const qr = window.qrcode(0, 'M');
  qr.addData(uri);
  qr.make();
  qrMount.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  const svg = qrMount.querySelector('svg');
  if (svg) {
    svg.style.width = '220px';
    svg.style.height = '220px';
    svg.querySelectorAll('path, rect').forEach(n => { if (n.getAttribute('fill') === '#000000') n.setAttribute('fill', '#0a0a08'); });
  }
  if (copyBtn) copyBtn.dataset.uri = uri;
  if (openBtn) openBtn.href = uri;
};

// ---------- toast ----------
const toast = document.getElementById('toast');
const say = (msg) => {
  toast.textContent = msg; toast.classList.add('is-on');
  clearTimeout(say._t); say._t = setTimeout(() => toast.classList.remove('is-on'), 2400);
};

copyBtn?.addEventListener('click', () => {
  const uri = copyBtn.dataset.uri || buildUri(computeSats(parseFloat(amountInp.value || '0')) / 1e8);
  navigator.clipboard?.writeText(uri).catch(() => {});
  say('→ URI bitcoin copiada al portapapeles');
});

// ---------- form ----------
document.getElementById('quoteForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const btc = document.getElementById('btcPay').checked;
  say(btc ? '✓ Solicitud enviada · propuesta BTC con 5% off' : '✓ Solicitud enviada · respondemos en 24 h');
  e.target.reset();
});

// ---------- year ----------
const yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
