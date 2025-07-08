(async () => {
  const currentUrl = window.location.href;
  if (currentUrl.includes("block.html")) return; // Don't redirect block page

  const hostname = new URL(currentUrl).hostname;
  const { enabled, whitelist = [] } = await chrome.storage.local.get(["enabled", "whitelist"]);

  const defaultTrustedDomains = [
    "google.com", "facebook.com", "youtube.com", "gmail.com", "amazon.com",
    "microsoft.com", "apple.com", "wikipedia.org", "twitter.com", "instagram.com"
  ];

  const isWhitelisted = whitelist.some(d => hostname.includes(d)) ||
                        defaultTrustedDomains.some(d => hostname.includes(d));

  if (!enabled || isWhitelisted) return; // Allow site if disabled or whitelisted

  // Redirect to block.html for phishing check
  const redirectUrl = chrome.runtime.getURL(`block.html?url=${encodeURIComponent(currentUrl)}`);
  window.location.replace(redirectUrl);
})();
