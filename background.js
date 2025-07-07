// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true, whitelist: [], phishCount: 0 });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === "closeTab" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
  }
});