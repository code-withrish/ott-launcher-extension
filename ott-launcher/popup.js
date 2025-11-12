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
  Add a top-right theme badge showing sun (light) or moon+stars (dark)
  with the app icons as a blended background, and display detected city.
  Implementation uses inline styles only (no CSS file modifications).
*/
(() => {
  const isDark = document.documentElement.classList.contains('dark');

  // small inline SVGs for sun and moon+stars (kept compact)
  const sunSVG = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <g fill='none' stroke='rgba(255,230,128,0.98)' stroke-width='2'>
        <circle cx='32' cy='32' r='10' fill='rgba(255,210,64,0.98)' stroke='none'/>
      </g>
      <g stroke='rgba(255,210,64,0.9)' stroke-width='2'>
        <path d='M32 4v6M32 54v6M4 32h6M54 32h6M10 10l4 4M50 50l4 4M10 54l4-4M50 14l4-4'/>
      </g>
    </svg>
  `);

  const moonSVG = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <path d='M42 52c-11 0-20-9-20-20 0-7 4-13 10-16-8 1-14 8-14 16 0 9 7 16 16 16 5 0 9-2 12-4z' fill='rgba(220,230,255,0.96)'/>
      <g fill='rgba(255,255,255,0.9)'>
        <circle cx='48' cy='16' r='1.6'/>
        <circle cx='52' cy='22' r='1.4'/>
        <circle cx='44' cy='10' r='1.2'/>
      </g>
    </svg>
  `);

  // background icons (order: lower layers). adjust to match your icons folder
  const icons = [
    'icons/netflix.png',
    'icons/hotstar.png',
    'icons/zee5.png',
    'icons/prime.png',
    'icons/ott.png'
  ];

  // Compose layered background: top layer is SVG (sun/moon), beneath are icons tiled/positioned.
  const svgDataUri = `data:image/svg+xml;utf8,${isDark ? moonSVG : sunSVG}`;
  const bgImages = [
    `url("${svgDataUri}")`,
    ...icons.map((p) => `url("${p}")`)
  ].join(', ');

  const bgPositions = [
    'center center', // svg
    '0% 0%',         // netflix
    '100% 0%',       // hotstar
    '0% 100%',       // zee5
    '100% 100%'      // prime / ott
  ].join(', ');

  const badge = document.createElement('div');
  badge.id = 'theme-badge';
  Object.assign(badge.style, {
    position: 'absolute',
    right: '12px',
    top: '10px',
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 12px rgba(0,0,0,0.35)',
    // layered backgrounds and blending
    backgroundImage: bgImages,
    backgroundPosition: bgPositions,
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat, no-repeat',
    backgroundSize: 'cover, 36% 36%, 36% 36%, 36% 36%, 36% 36%',
    backgroundBlendMode: isDark ? 'screen, normal' : 'multiply, normal',
    cursor: 'default',
    zIndex: '999'
  });

  // optional subtle border to distinguish on light/dark
  badge.style.border = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)';

  // small city label (placed under the badge)
  const cityLabel = document.createElement('div');
  cityLabel.id = 'city-label';
  Object.assign(cityLabel.style, {
    position: 'absolute',
    right: '10px',
    top: '62px',
    fontSize: '11px',
    lineHeight: '12px',
    color: isDark ? '#dcecff' : '#1f2937',
    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    padding: '3px 6px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
    zIndex: '999',
    maxWidth: '140px',
    textAlign: 'right',
    fontFamily: 'system-ui, Helvetica, Arial'
  });
  cityLabel.textContent = 'Locating...';

  // attach to body (do not modify CSS files)
  document.body.appendChild(badge);
  document.body.appendChild(cityLabel);

  // Try fetching city via simple IP geolocation (no permissions required). fallback silently.
  (async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('geo fetch failed');
      const j = await res.json();
      const city = j.city || '';
      const region = j.region || j.region_code || '';
      const country = j.country_name || j.country || '';
      const display = [city, region || country].filter(Boolean).join(', ');
      cityLabel.textContent = display || `${j.country_name || 'Unknown'}`;
    } catch (e) {
      // fallback to a smaller, unauthenticated service (best-effort)
      try {
        const res2 = await fetch('https://ipwho.is/');
        const j2 = await res2.json();
        cityLabel.textContent = j2.city ? `${j2.city}, ${j2.country}` : 'Unknown';
      } catch {
        cityLabel.textContent = 'Unknown';
      }
    }
  })();

})();