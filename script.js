/* ═══════════════════════════════════════════════════════════════
   INSTANT WEATHER — script.js
   API : geo.api.gouv.fr (communes) + meteo-concept (météo)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── DOM references ─────────────────────────────────────────── */
const codePostalInput  = document.getElementById('code-postal');
const communeSelect    = document.getElementById('communeSelect');
const validationButton = document.getElementById('validationButton');
const formError        = document.getElementById('form-error');

const idleState        = document.getElementById('idle-state');
const loadingState     = document.getElementById('loading-state');
const dashboardState   = document.getElementById('dashboard-state');

const dashCity   = document.getElementById('dash-city');
const dashCoord  = document.getElementById('dash-coord');
const dashDate   = document.getElementById('dash-date');
const dashCond   = document.getElementById('dash-cond');
const dashIcon   = document.getElementById('dash-icon');
const dashTmax   = document.getElementById('dash-tmax');
const dashTmin   = document.getElementById('dash-tmin');
const mRain      = document.getElementById('m-rain');
const mRainBar   = document.getElementById('m-rain-bar');
const mRainSub   = document.getElementById('m-rain-sub');
const mSun       = document.getElementById('m-sun');
const mSunBar    = document.getElementById('m-sun-bar');
const mWind      = document.getElementById('m-wind');
const mWindSub   = document.getElementById('m-wind-sub');
const mWindNeedle = document.getElementById('m-wind-needle');
const forecastList = document.getElementById('forecast-list');
const coordReadout = document.getElementById('coord-readout');

const clockEl = document.getElementById('clock');

/* ─── Constants ──────────────────────────────────────────────── */
const TOKEN = '4bba169b3e3365061d39563419ab23e5016c0f838ba282498439c41a00ef1091';
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/* Memo last city info so we can re-render when commune changes */
let lastCity = null;

/* ─── Weather code → category mapping (meteo-concept) ────────── */
function weatherCategory(code) {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly';
  if (code <= 5) return 'cloudy';
  if (code === 6 || code === 7) return 'fog';
  if (code >= 100) return 'storm';
  if (code >= 60 && code < 100) return 'snow';
  if (code >= 20 && code < 40) return 'snow';
  if (code >= 40) return 'rain';
  if (code >= 10) return 'rain';
  return 'partly';
}
function weatherLabel(code) {
  if (code === 0) return 'Ciel dégagé';
  if (code <= 3) return 'Peu nuageux';
  if (code <= 5) return 'Couvert';
  if (code === 6 || code === 7) return 'Brouillard';
  if (code >= 100) return 'Orageux';
  if (code >= 60) return 'Neige';
  if (code >= 40) return 'Averses';
  if (code >= 20) return 'Neige';
  if (code >= 10) return 'Pluie';
  return '—';
}

/* ─── SVG weather icons ──────────────────────────────────────── */
const ICONS = {
  clear: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="sunG" cx="50%" cy="50%">
          <stop offset="0%" stop-color="#fff5cf"/>
          <stop offset="55%" stop-color="#ffb547"/>
          <stop offset="100%" stop-color="#ff7a3d"/>
        </radialGradient>
      </defs>
      <g class="ic-sun-rays">
        <g stroke="#ffb547" stroke-width="2.2" stroke-linecap="round" opacity=".85">
          <line x1="50" y1="6"  x2="50" y2="18"/>
          <line x1="50" y1="82" x2="50" y2="94"/>
          <line x1="6"  y1="50" x2="18" y2="50"/>
          <line x1="82" y1="50" x2="94" y2="50"/>
          <line x1="18" y1="18" x2="27" y2="27"/>
          <line x1="73" y1="73" x2="82" y2="82"/>
          <line x1="18" y1="82" x2="27" y2="73"/>
          <line x1="73" y1="27" x2="82" y2="18"/>
        </g>
      </g>
      <circle cx="50" cy="50" r="20" fill="url(#sunG)"/>
      <circle cx="50" cy="50" r="20" fill="none" stroke="#fff" stroke-width="0.6" opacity=".4"/>
    </svg>
  `,
  partly: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="sunPG" cx="50%" cy="50%">
          <stop offset="0%" stop-color="#fff5cf"/>
          <stop offset="100%" stop-color="#ffb547"/>
        </radialGradient>
        <linearGradient id="cloudPG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e8efff"/>
          <stop offset="100%" stop-color="#7c9fd9"/>
        </linearGradient>
      </defs>
      <circle cx="36" cy="36" r="16" fill="url(#sunPG)"/>
      <path d="M30 70 Q24 70 24 62 Q24 54 32 54 Q34 44 46 44 Q58 44 60 54 Q70 54 70 64 Q70 72 62 72 Z" fill="url(#cloudPG)" transform="translate(8,4)"/>
    </svg>
  `,
  cloudy: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="cG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e8efff"/>
          <stop offset="100%" stop-color="#7c9fd9"/>
        </linearGradient>
      </defs>
      <path d="M22 64 Q14 64 14 56 Q14 46 24 46 Q26 32 42 32 Q58 32 60 46 Q74 46 74 58 Q74 68 64 68 Z" fill="url(#cG)" opacity=".85" transform="translate(0,-2)"/>
      <path d="M30 74 Q22 74 22 66 Q22 56 32 56 Q34 44 50 44 Q66 44 68 56 Q82 56 82 68 Q82 78 72 78 Z" fill="url(#cG)"/>
    </svg>
  `,
  rain: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="rcG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c4d3f0"/>
          <stop offset="100%" stop-color="#4d7eff"/>
        </linearGradient>
      </defs>
      <path d="M26 56 Q18 56 18 48 Q18 38 28 38 Q30 26 46 26 Q62 26 64 38 Q78 38 78 50 Q78 60 68 60 Z" fill="url(#rcG)"/>
      <g stroke="#7cf6ff" stroke-width="2" stroke-linecap="round" opacity=".9">
        <line x1="32" y1="68" x2="28" y2="80"><animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite"/></line>
        <line x1="46" y1="70" x2="42" y2="84"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" repeatCount="indefinite"/></line>
        <line x1="60" y1="68" x2="56" y2="80"><animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite"/></line>
        <line x1="72" y1="70" x2="68" y2="82"><animate attributeName="opacity" values="0.2;1;0.2" dur="1s" repeatCount="indefinite"/></line>
      </g>
    </svg>
  `,
  snow: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="scG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e8efff"/>
          <stop offset="100%" stop-color="#9ab8e8"/>
        </linearGradient>
      </defs>
      <path d="M26 56 Q18 56 18 48 Q18 38 28 38 Q30 26 46 26 Q62 26 64 38 Q78 38 78 50 Q78 60 68 60 Z" fill="url(#scG)"/>
      <g fill="#fff" opacity=".9">
        <circle cx="32" cy="74" r="2.5"><animate attributeName="cy" values="68;86;68" dur="2.4s" repeatCount="indefinite"/></circle>
        <circle cx="48" cy="80" r="2"><animate attributeName="cy" values="70;88;70" dur="2.8s" repeatCount="indefinite"/></circle>
        <circle cx="64" cy="74" r="2.5"><animate attributeName="cy" values="68;86;68" dur="2.2s" repeatCount="indefinite"/></circle>
        <circle cx="72" cy="82" r="1.8"><animate attributeName="cy" values="72;90;72" dur="3s" repeatCount="indefinite"/></circle>
      </g>
    </svg>
  `,
  storm: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="stG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9ba8c4"/>
          <stop offset="100%" stop-color="#3d4a6a"/>
        </linearGradient>
      </defs>
      <path d="M22 56 Q14 56 14 48 Q14 38 24 38 Q26 24 44 24 Q62 24 64 38 Q78 38 78 50 Q78 60 68 60 Z" fill="url(#stG)"/>
      <path d="M48 60 L40 80 L48 80 L42 94 L60 72 L52 72 L58 60 Z" fill="#ffb547" opacity=".95">
        <animate attributeName="opacity" values="1;0.4;1" dur=".8s" repeatCount="indefinite"/>
      </path>
    </svg>
  `,
  fog: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g stroke="#c4d3f0" stroke-width="3" stroke-linecap="round" opacity=".7">
        <line x1="18" y1="42" x2="70" y2="42"/>
        <line x1="26" y1="54" x2="82" y2="54"/>
        <line x1="18" y1="66" x2="74" y2="66"/>
        <line x1="30" y1="78" x2="78" y2="78"/>
      </g>
    </svg>
  `
};

function iconHTML(code) {
  return ICONS[weatherCategory(code)] || ICONS.partly;
}

/* ─── State switcher ─────────────────────────────────────────── */
function showState(name) {
  idleState.classList.toggle('hidden', name !== 'idle');
  loadingState.classList.toggle('hidden', name !== 'loading');
  dashboardState.classList.toggle('hidden', name !== 'data');
}

/* ─── API : communes via code postal ─────────────────────────── */
async function fetchCommunesByCodePostal(codePostal) {
  const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${codePostal}`);
  if (!res.ok) throw new Error('Geo API error');
  return res.json();
}

/* ─── API : prévisions 7 jours via INSEE ─────────────────────── */
async function fetchMeteoByCommune(insee) {
  const res = await fetch(
    `https://api.meteo-concept.com/api/forecast/daily?token=${TOKEN}&insee=${insee}`
  );
  if (!res.ok) throw new Error('Meteo API error');
  return res.json();
}

/* ─── UI : list communes in select ───────────────────────────── */
function displayCommunes(data) {
  communeSelect.innerHTML = '';
  if (!data.length) {
    showFormError("Code postal introuvable");
    communeSelect.disabled = true;
    validationButton.disabled = true;
    communeSelect.innerHTML = '<option>— En attente du code postal —</option>';
    return;
  }
  clearFormError();
  data.forEach((commune) => {
    const opt = document.createElement('option');
    opt.value = commune.code;
    opt.textContent = commune.nom;
    opt.dataset.name = commune.nom;
    opt.dataset.cp = commune.codesPostaux ? commune.codesPostaux[0] : '';
    communeSelect.appendChild(opt);
  });
  communeSelect.disabled = false;
  validationButton.disabled = false;
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.style.opacity = '1';
}
function clearFormError() {
  formError.textContent = '';
  formError.style.opacity = '0';
}

/* ─── UI : populate dashboard with weather data ──────────────── */
function createCard(data) {
  if (!data || !data.forecast) {
    showFormError('Données météo indisponibles');
    showState('idle');
    return;
  }

  const city = data.city || {};
  // Normalise forecast to array (some endpoints return single object)
  const forecastArr = Array.isArray(data.forecast) ? data.forecast : [data.forecast];
  const today = forecastArr[0];
  const days = forecastArr.slice(0, 7);
  // If only 1 day available, fill with placeholders to keep grid intact
  while (days.length < 7) {
    days.push({ ...today, weather: today.weather, tmax: today.tmax, tmin: today.tmin, probarain: today.probarain });
  }

  // City / coords
  dashCity.textContent = city.name || lastCity?.name || '—';
  const lat = (city.latitude ?? 0).toFixed(2);
  const lon = (city.longitude ?? 0).toFixed(2);
  dashCoord.textContent = `${city.cp ?? ''} · LAT ${lat} · LON ${lon}`;
  coordReadout.textContent = `LAT ${lat} · LON ${lon}`;

  // Date today
  const d = new Date();
  dashDate.textContent = d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  // Condition + icon
  dashCond.textContent = weatherLabel(today.weather).toUpperCase();
  dashIcon.innerHTML = iconHTML(today.weather);

  // Temperatures (animated)
  tweenNumber(dashTmax, 0, today.tmax, 900);
  tweenNumber(dashTmin, 0, today.tmin, 900);

  // Rain
  tweenNumber(mRain, 0, today.probarain, 1000);
  setTimeout(() => { mRainBar.style.width = Math.min(today.probarain, 100) + '%'; }, 50);
  mRainSub.textContent = `Cumul : ${(today.rr10 ?? 0).toFixed(1)} mm`;

  // Sun
  tweenNumber(mSun, 0, today.sun_hours, 1100);
  setTimeout(() => { mSunBar.style.width = Math.min((today.sun_hours / 14) * 100, 100) + '%'; }, 80);

  // Wind
  tweenNumber(mWind, 0, today.wind10m, 1000);
  mWindSub.textContent = `${today.dirwind10m}° · ${cardinal(today.dirwind10m)}`;
  mWindNeedle.style.transform = `translate(-50%, -100%) rotate(${today.dirwind10m}deg)`;

  // 7-day forecast
  forecastList.innerHTML = days.map((day, i) => {
    const date = new Date(Date.now() + i * 86400000);
    const dn = i === 0 ? 'AUJ.' : DAY_NAMES[date.getDay()].toUpperCase();
    return `
      <li class="${i === 0 ? 'is-today' : ''}">
        <span class="fc-day">${dn}</span>
        <span class="fc-icon">${iconHTML(day.weather)}</span>
        <span class="fc-temp">${Math.round(day.tmax)}°<span class="min">${Math.round(day.tmin)}°</span></span>
        <span class="fc-rain">${day.probarain}%</span>
      </li>
    `;
  }).join('');

  showState('data');
}

function cardinal(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

/* ─── Number tween for counter animations ────────────────────── */
function tweenNumber(el, from, to, ms) {
  const start = performance.now();
  const round = (Number.isInteger(to) || Math.abs(to) > 30) ? Math.round : (v) => v.toFixed(1);
  function frame(now) {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const v = from + (to - from) * eased;
    el.textContent = round(v);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ─── Form interactions ──────────────────────────────────────── */
codePostalInput.addEventListener('input', async () => {
  const cp = codePostalInput.value.trim();
  clearFormError();
  if (cp.length === 0) {
    communeSelect.innerHTML = '<option>— En attente du code postal —</option>';
    communeSelect.disabled = true;
    validationButton.disabled = true;
    return;
  }
  if (!/^\d{5}$/.test(cp)) return; // wait until 5 digits
  try {
    const data = await fetchCommunesByCodePostal(cp);
    displayCommunes(data);
  } catch (err) {
    console.error(err);
    showFormError('Connexion impossible à geo.api.gouv.fr');
  }
});

validationButton.addEventListener('click', async () => {
  const insee = communeSelect.value;
  if (!insee || insee === '— En attente du code postal —') return;
  const selectedOpt = communeSelect.options[communeSelect.selectedIndex];
  lastCity = { name: selectedOpt?.dataset.name, cp: selectedOpt?.dataset.cp };

  showState('loading');
  try {
    const data = await fetchMeteoByCommune(insee);
    // small delay so the loader actually shows
    setTimeout(() => createCard(data), 350);
  } catch (err) {
    console.error(err);
    showFormError('Météo indisponible — réessayez');
    showState('idle');
  }
});

/* ─── Suggestion chips ───────────────────────────────────────── */
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    codePostalInput.value = chip.dataset.cp;
    codePostalInput.dispatchEvent(new Event('input'));
    codePostalInput.focus();
  });
});

/* ─── Clock ──────────────────────────────────────────────────── */
function updateClock() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
updateClock();
setInterval(updateClock, 1000);

/* ─── Atmospheric particles canvas ───────────────────────────── */
(function particles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h, parts;

  function resize() {
    w = canvas.width  = window.innerWidth  * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    spawn();
  }

  function spawn() {
    const count = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 24000));
    parts = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.2 + 0.3) * devicePixelRatio,
      vx: (Math.random() - 0.5) * 0.12 * devicePixelRatio,
      vy: (-Math.random() * 0.2 - 0.05) * devicePixelRatio,
      a: Math.random() * 0.6 + 0.2,
      hue: Math.random() > 0.6 ? 195 : 230
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${p.a})`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, 0.8)`;
      ctx.shadowBlur = 8 * devicePixelRatio;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  tick();
})();

/* ─── Subtle parallax on mouse move (desktop only) ───────────── */
if (window.matchMedia('(pointer:fine)').matches) {
  const blobs = document.querySelectorAll('.blob');
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5);
    const y = (e.clientY / window.innerHeight - 0.5);
    blobs.forEach((b, i) => {
      const f = (i + 1) * 8;
      b.style.translate = `${x * f}px ${y * f}px`;
    });
  });
}

/* ─── Init ──────────────────────────────────────────────────── */
showState('idle');
