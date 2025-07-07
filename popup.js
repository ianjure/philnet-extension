document.addEventListener("DOMContentLoaded", async () => {
  const toggle = document.getElementById("toggle");
  const countEl = document.getElementById("count");
  const whitelistInput = document.getElementById("whitelist-url");
  const whitelistList = document.getElementById("whitelist");

  // Load settings from storage
  const storage = await chrome.storage.local.get(["enabled", "phishCount", "whitelist"]);
  toggle.checked = storage.enabled ?? true;
  countEl.textContent = storage.phishCount ?? 0;

  let whitelist = storage.whitelist || [];

  // Helper to refresh the whitelist UI
  function renderWhitelist() {
    whitelistList.innerHTML = "";
    whitelist.forEach(domain => {
      const li = document.createElement("li");
      li.textContent = domain + " ";
      const btn = document.createElement("button");
      btn.textContent = "Remove";
      btn.style.marginLeft = "5px";
      btn.onclick = async () => {
        whitelist = whitelist.filter(d => d !== domain);
        await chrome.storage.local.set({ whitelist });
        renderWhitelist();
      };
      li.appendChild(btn);
      whitelistList.appendChild(li);
    });
  }

  renderWhitelist();

  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
  });

  document.getElementById("add-whitelist").onclick = async () => {
    const domain = whitelistInput.value.trim();
    if (domain && !whitelist.includes(domain)) {
      whitelist.push(domain);
      await chrome.storage.local.set({ whitelist });
      renderWhitelist();
      whitelistInput.value = "";
    }
  };
});
