(async () => {
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get("url");
  const hostname = new URL(targetUrl).hostname;

  const { enabled, whitelist = [] } = await chrome.storage.local.get(["enabled", "whitelist"]);
  const defaultTrustedDomains = [
    "google.com", "facebook.com", "youtube.com", "gmail.com", "amazon.com",
    "microsoft.com", "apple.com", "wikipedia.org", "twitter.com", "instagram.com"
  ];

  const isWhitelisted = whitelist.some(d => hostname.includes(d)) ||
                        defaultTrustedDomains.some(d => hostname.includes(d));

  if (!enabled || isWhitelisted) {
    window.location.replace(targetUrl);
    return;
  }

  chrome.runtime.sendMessage({ action: "checkPhishing", url: targetUrl }, async (response) => {
    const { detectionHistory = [] } = await chrome.storage.local.get("detectionHistory");
    const timestamp = new Date().toLocaleString();
    detectionHistory.push({ url: targetUrl, time: timestamp });
    await chrome.storage.local.set({ detectionHistory });

    if (!response || !response.isPhishing) {
      window.location.replace(targetUrl);
    } else {
      await loadBlockOverlay(hostname, targetUrl);
      const { phishCount = 0 } = await chrome.storage.local.get("phishCount");
      await chrome.storage.local.set({ phishCount: phishCount + 1 });
    }
  });
})();

async function loadBlockOverlay(hostname, targetUrl) {
  try {
    const res = await fetch(chrome.runtime.getURL("block_content.html"));
    const html = await res.text();
    document.body.innerHTML = html;

    // Inject hostname
    document.getElementById("phi-hostname").textContent = hostname;

    // Safe button
    document.getElementById("phi-safe-btn").onclick = () => window.close();

    // Whitelist button
    document.getElementById("phi-whitelist-btn").onclick = async () => {
      const { whitelist = [] } = await chrome.storage.local.get("whitelist");
      if (!whitelist.includes(hostname)) {
        whitelist.push(hostname);
        await chrome.storage.local.set({ whitelist });
      }
      window.location.replace(targetUrl);
    };
  } catch (err) {
    console.error("Error loading block page:", err);
    window.location.replace(targetUrl);
  }
}
