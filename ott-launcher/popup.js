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
  div.innerHTML = `<img src="${app.icon}" alt="${app.name}"><br>${app.name}`;
  div.onclick = () => chrome.tabs.create({ url: app.url });
  container.appendChild(div);
});