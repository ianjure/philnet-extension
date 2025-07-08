chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true, whitelist: [], phishCount: 0, detectionHistory: [] });
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "checkPhishing") {
    const isPhish = await checkPhishingAPI(request.url);
    sendResponse({ isPhishing: isPhish });
  }

  if (request.action === "closeTab" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
  }

  return true;
});

async function checkPhishingAPI(url) {
  try {
    const response = await fetch("http://philnet-api.onrender.com/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      cache: "no-store"
    });
    const data = await response.json();
    return data.prediction === "phishing";
  } catch (e) {
    console.error("Phishing API error:", e);
    return false; // Fail open
  }
}
