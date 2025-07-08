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
          // Show block page
          document.body.innerHTML = `
            <div class="phish-box">
              <h2>⚠️ Phishing Site Detected</h2>
              <p>The website <strong>${hostname}</strong> has been flagged as potentially dangerous.</p>
              <button id="phi-safe-btn">Close Tab</button>
              <button id="phi-whitelist-btn">Add to Whitelist & Continue</button>
            </div>
          `;

          document.getElementById("phi-safe-btn").onclick = () => window.close();

          document.getElementById("phi-whitelist-btn").onclick = async () => {
            const storage = await chrome.storage.local.get("whitelist");
            const list = storage.whitelist || [];
            if (!list.includes(hostname)) {
              list.push(hostname);
              await chrome.storage.local.set({ whitelist: list });
            }
            window.location.replace(targetUrl);
          };

          const { phishCount = 0 } = await chrome.storage.local.get("phishCount");
          await chrome.storage.local.set({ phishCount: phishCount + 1 });
        }
      });
    })();
