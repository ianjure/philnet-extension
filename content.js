(async () => {
  // Disable javascript
  const scriptElements = document.getElementsByTagName("script");
  for (let i = scriptElements.length - 1; i >= 0; i--) {
    scriptElements[i].parentNode.removeChild(scriptElements[i]);
  }

  // Hide page content immediately
  const style = document.createElement("style");
  style.id = "phi-hide-style";
  style.textContent = `html { visibility: hidden !important; }`;
  document.documentElement.appendChild(style);

  const url = window.location.href;
  const hostname = window.location.hostname;

  const { enabled, whitelist = [] } = await chrome.storage.local.get(["enabled", "whitelist"]);

  if (!enabled) {
    style.remove();
    return;
  }

  const defaultTrustedDomains = [
    "google.com", "facebook.com", "youtube.com", "gmail.com", "amazon.com",
    "microsoft.com", "apple.com", "wikipedia.org", "twitter.com", "instagram.com"
  ];

  const isWhitelisted = whitelist.some(d => hostname.includes(d)) ||
                        defaultTrustedDomains.some(d => hostname.includes(d));

  if (isWhitelisted) {
    style.remove();
    return;
  }

  async function callPhishingAPI(url) {
    const response = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      cache: "no-store"
    });
    if (!response.ok) throw new Error("API error");
    return await response.json();
  }

  let isPhishing = false;
  try {
    const data = await callPhishingAPI(url);
    isPhishing = data.prediction === "phishing";
  } catch (e) {
    showMessage("Error checking site safety. Loading site...");
    await delay(3000);
    style.remove();
    return;
  }

  if (!isPhishing) {
    style.remove();
  } else {
    const { phishCount = 0 } = await chrome.storage.local.get("phishCount");
    await chrome.storage.local.set({ phishCount: phishCount + 1 });
    style.remove();
    showBlockOverlay(hostname);
  }

  function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  function showMessage(text) {
    let msgDiv = document.createElement("div");
    msgDiv.style.position = "fixed";
    msgDiv.style.top = "10px";
    msgDiv.style.left = "50%";
    msgDiv.style.transform = "translateX(-50%)";
    msgDiv.style.padding = "10px 20px";
    msgDiv.style.backgroundColor = "black";
    msgDiv.style.color = "white";
    msgDiv.style.zIndex = "9999999999";
    msgDiv.style.borderRadius = "6px";
    msgDiv.textContent = text;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
  }

  function showBlockOverlay(host) {
    // Inject CSS
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = chrome.runtime.getURL("block.css");
    document.head.appendChild(cssLink);

    const overlay = document.createElement("div");
    overlay.id = "phi-block-overlay";
    overlay.innerHTML = `
      <div class="phish-box">
        <h2>⚠️ Phishing Site Detected</h2>
        <p>The website <strong>${host}</strong> has been flagged as potentially dangerous.</p>
        <button id="phi-safe-btn">Go to Safety</button>
        <button id="phi-whitelist-btn">Add to Whitelist & Continue</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.body.style.overflow = "hidden";

    document.getElementById("phi-safe-btn").onclick = () => {
      // Send message to background to close this tab
      chrome.runtime.sendMessage({ action: "closeTab" });
    };

    document.getElementById("phi-whitelist-btn").onclick = async () => {
      const storage = await chrome.storage.local.get("whitelist");
      const list = storage.whitelist || [];
      if (!list.includes(host)) {
        list.push(host);
        await chrome.storage.local.set({ whitelist: list });
      }
      overlay.remove();
      document.body.style.overflow = "";
      showMessage(`Added ${host} to whitelist. You can reload if needed.`);
    };
  }
})();
