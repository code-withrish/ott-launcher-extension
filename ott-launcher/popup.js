// set theme based on local time (light/dark)
(() => {
  const hour = new Date().getHours();
  const isDark = hour < 7 || hour >= 19; // dark between 19:00-06:59
  if (isDark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();

const apps = [
  { name: "Netflix", url: "https://www.netflix.com", icon: "icons/netflix.png" },
  { name: "Disney+ Hotstar", url: "https://www.hotstar.com", icon: "icons/hotstar.png" },
  { name: "Zee5", url: "https://www.zee5.com", icon: "icons/zee5.png" },
  { name: "Prime Video", url: "https://www.primevideo.com", icon: "icons/prime.png" }
];

const container = document.getElementById("apps");

apps.forEach(app => {
  const div = document.createElement("div");
  div.className = "app";
  div.innerHTML = `
    <img class="app-icon" src="${app.icon}" alt="${app.name}" />
    <div class="app-label">${app.name}</div>
  `;
  div.onclick = () => chrome.tabs.create({ url: app.url });
  container.appendChild(div);
});

/*
  Inject a full-body themed overlay (CSS inserted via JS only).
  - top-right shows a sun-with-clouds (light) or moon-with-stars (dark)
  - the SVG is large and positioned top-right and blends with the whole body
  - overlay is non-interactive (pointer-events:none)
  - also shows detected city in a small pill at top-right
  No external CSS files are modified.
*/
(() => {
  const isDark = document.documentElement.classList.contains('dark');

  // Sun with clouds SVG
  const sunSVG = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'>
      <defs>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feBlend in="SourceGraphic" in2="b"/>
        </filter>
      </defs>
      <g filter="url(#blur)">
        <circle cx="72" cy="64" r="44" fill="#FFD54A"/>
        <g stroke="#FFD54A" stroke-width="10" stroke-linecap="round">
          <path d="M72 8v28M72 120v28M8 64h28M136 64h28M24 24l20 20M196 196l20 20M24 104l20-20M196 44l20-20"/>
        </g>
        <g transform="translate(110,90) scale(1)">
          <ellipse cx="36" cy="68" rx="56" ry="30" fill="#ffffff" opacity="0.95"/>
          <ellipse cx="96" cy="80" rx="44" ry="22" fill="#ffffff" opacity="0.9"/>
        </g>
      </g>
    </svg>
  `);

  // Moon with small stars SVG
  const moonSVG = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'>
      <g>
        <path d="M156 44c-40 0-74 34-74 74 0 26 13 50 36 64-46-3-80-44-80-92 0-51 42-92 92-92 16 0 30 3 46 10z" fill="#E6F0FF"/>
        <g fill="#ffffff" opacity="0.95">
          <circle cx="196" cy="36" r="4"/>
          <circle cx="216" cy="64" r="3"/>
          <circle cx="180" cy="16" r="3.2"/>
        </g>
      </g>
    </svg>
  `);

  const svgDataUri = `data:image/svg+xml;utf8,${isDark ? moonSVG : sunSVG}`;

  const overlay = document.createElement('div');
  overlay.id = 'theme-overlay';

  // style injected only via JS; does not modify popup.css
  const style = document.createElement('style');
  style.id = 'theme-overlay-style';
  style.textContent = `
    /* full-body non-interactive themed overlay */
    #theme-overlay {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      opacity: ${isDark ? '0.18' : '0.12'};
      transition: opacity 240ms linear, transform 300ms ease;
      background-image: url("${svgDataUri}");
      background-repeat: no-repeat;
      /* place SVG off the top-right corner so it feels like a large decorative graphic */
      background-position: calc(100% + 8%) calc(0% - 10%);
      /* make it large so it blends across the body */
      background-size: 65% auto;
      /* how it blends with the existing page */
      mix-blend-mode: ${isDark ? 'screen' : 'multiply'};
      filter: saturate(${isDark ? '1.05' : '0.95'}) blur(0.6px);
      will-change: transform;
      transform: translateZ(0);
    }
    /* ensure UI elements render above overlay */
    body > * {
      position: relative;
      z-index: 2;
    }

    /* city pill */
    #theme-city-pill {
      position: fixed;
      margin: 10px;
      right: 12px;
      bottom: 12px;
      z-index: 3;
      pointer-events: auto;
      background: ${isDark ? 'rgba(3,6,12,0.55)' : 'rgba(255,255,255,0.92)'};
      color: ${isDark ? '#dcecff' : '#0b1220'};
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 10px;
      box-shadow: 0 6px 14px rgba(2,6,23,0.22);
      backdrop-filter: blur(4px);
      display: inline-flex;
      gap: 8px;
      align-items: center;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    }
    #theme-city-pill .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${isDark ? '#6ee7ff' : '#ffb347'};
      box-shadow: 0 0 8px ${isDark ? '#6ee7ff44' : '#ffb34744'};
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // small city pill element
  const cityPill = document.createElement('div');
  cityPill.id = 'theme-city-pill';
  cityPill.innerHTML = `<span class="dot"></span><span id="theme-city-text">Locating...</span>`;
  document.body.appendChild(cityPill);

  // geolocation: prefer ipwho.is (CORS-friendly). fallback via public proxy only if needed.
  (async () => {
    async function tryFetchJson(url) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('non-ok');
        return await res.json();
      } catch {
        return null;
      }
    }

    let geo = await tryFetchJson('https://ipwho.is/');
    if (!geo) {
      // fallback via a public CORS proxy (best-effort). Remove/change if you don't want public proxy usage.
      const proxy = 'https://corsproxy.io/?';
      geo = await tryFetchJson(proxy + 'https://ipapi.co/json/');
    }

    const cityTextEl = document.getElementById('theme-city-text');
    if (!cityTextEl) return;

    if (geo) {
      const city = geo.city || '';
      const region = geo.region || geo.region_code || '';
      const country = geo.country || geo.country_name || '';
      const display = [city, region || country].filter(Boolean).join(', ');
      cityTextEl.textContent = display || (country || 'Unknown');
    } else {
      cityTextEl.textContent = 'Unknown';
    }
  })();
})();