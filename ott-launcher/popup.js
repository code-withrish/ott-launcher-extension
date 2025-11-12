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