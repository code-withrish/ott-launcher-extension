// set theme based on local time (light/dark)
(() => {
  const hour = new Date().getHours();
  const isDark = hour < 7 || hour >= 19; // dark between 19:00-06:59
  // apply to root so CSS uses :root.dark
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
  - the SVG is large and positioned top-right; app icons form a subtle tiled/background layer
  - overlay blends with the whole body (background-blend-mode) and is non-interactive
  - also shows detected city at the top-right above the overlay
  No external CSS files are modified.
*/
(() => {
  const isDark = document.documentElement.classList.contains('dark');

  // compact SVGs for sun+clouds and moon+stars (kept small)
  const sunSVG = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'>
      <defs>
        <filter id="g" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feBlend in="SourceGraphic" in2="b"/>
        </filter>
      </defs>
      <g filter="url(#g)">
        <circle cx="40" cy="40" r="28" fill="#FFD54A"/>
        <g stroke="#FFD54A" stroke-width="6" stroke-linecap="round">
          <path d="M40 4v18M40 76v18M4 40h18M76 40h18M12 12l12 12M136 136l12 12M12 68l12-12M136 28l12-12"/>
        </g>
        <g transform="translate(70,70) scale(0.9)">
          <ellipse cx="24" cy="48" rx="36" ry="20" fill="#ffffff" opacity="0.95"/>
          <ellipse cx="60" cy="56" rx="28" ry="14" fill="#ffffff" opacity="0.9"/>
        </g>
      </g>
    </svg>
  `);

  const moonSVG = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'>
      <g>
        <path d="M104 28c-26 0-48 22-48 48 0 18 9 35 24 44-30-2-52-28-52-58 0-32 26-58 58-58 10 0 19 2 26 6z" fill="#E6F0FF"/>
        <g fill="#fff" opacity="0.95">
          <circle cx="130" cy="28" r="3.2"/>
          <circle cx="144" cy="46" r="2.6"/>
          <circle cx="120" cy="10" r="2.8"/>
        </g>
      </g>
    </svg>
  `);

  // app icons used as subtle background textures
  const icons = [
    'icons/netflix.png',
    'icons/hotstar.png',
    'icons/zee5.png',
    'icons/prime.png',
    'icons/ott.png'
  ];

  // Compose layered background: top layer is large SVG positioned top-right, beneath are tiled icons
  const svgDataUri = `data:image/svg+xml;utf8,${isDark ? moonSVG : sunSVG}`;

  const overlay = document.createElement('div');
  overlay.id = 'theme-overlay';

  // Inject style tag for nicer organization (all via JS; doesn't modify popup.css)
  const style = document.createElement('style');
  style.id = 'theme-overlay-style';
  style.textContent = `
    /* overlay covers whole viewport but is non-interactive (pointer-events:none) */
    #theme-overlay {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      mix-blend-mode: normal;
      opacity: ${isDark ? '0.18' : '0.12'};
      transition: opacity 240ms linear;
      background-image:
        url("${svgDataUri}"),
        url("${icons[0]}"),
        url("${icons[1]}"),
        url("${icons[2]}"),
        url("${icons[3]}"),
        url("${icons[4]}");
      background-repeat: no-repeat, repeat, repeat, repeat, repeat, repeat;
      background-position: right top, 10% 20%, 80% 15%, 30% 75%, 85% 80%, 55% 45%;
      background-size: 46% auto, 8% 8%, 8% 8%, 8% 8%, 8% 8%, 12% 12%;
      background-blend-mode: ${isDark ? 'screen, normal, normal, normal, normal, normal' : 'multiply, normal, normal, normal, normal, normal'};
      transition: background 300ms ease;
      filter: saturate(${isDark ? '1.1' : '0.95'}) blur(0.6px);
    }

    /* ensure main UI sits above the overlay */
    body > * {
      position: relative;
      z-index: 2;
    }

    /* city pill and top indicator */
    #theme-city-pill {
      position: fixed;
      right: 12px;
      top: 12px;
      z-index: 3;
      pointer-events: auto;
      background: ${isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.85)'};
      color: ${isDark ? '#dcecff' : '#0b1220'};
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 10px;
      box-shadow: 0 6px 14px rgba(2,6,23,0.35);
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
      background: ${isDark ? '#4ee0ff' : '#ffb347'};
      box-shadow: 0 0 8px ${isDark ? '#4ee0ff66' : '#ffb34766'};
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // create small city pill (shows city and small colored dot)
  const cityPill = document.createElement('div');
  cityPill.id = 'theme-city-pill';
  cityPill.innerHTML = `<span class="dot"></span><span id="theme-city-text">Locating...</span>`;
  document.body.appendChild(cityPill);

  // attempt to detect city via simple IP geolocation
  (async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('geo fetch failed');
      const j = await res.json();
      const city = j.city || '';
      const region = j.region || j.region_code || '';
      const country = j.country_name || j.country || '';
      const display = [city, region || country].filter(Boolean).join(', ');
      document.getElementById('theme-city-text').textContent = display || (j.country_name || 'Unknown');
    } catch (e) {
      try {
        const res2 = await fetch('https://ipwho.is/');
        if (res2.ok) {
          const j2 = await res2.json();
          const display = j2.city ? `${j2.city}, ${j2.country}` : (j2.country || 'Unknown');
          document.getElementById('theme-city-text').textContent = display;
        } else {
          document.getElementById('theme-city-text').textContent = 'Unknown';
        }
      } catch {
        document.getElementById('theme-city-text').textContent = 'Unknown';
      }
    }
  })();

})();