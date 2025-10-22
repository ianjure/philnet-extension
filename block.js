(async () => {
	const params = new URLSearchParams(window.location.search);
	const targetUrl = params.get("url");
	const hostname = new URL(targetUrl).hostname;

	const { enabled } = await chrome.storage.local.get("enabled");

	// Skip if extension is disabled, site is whitelisted, or cached safe
	if (
		!enabled ||
		(await isWhitelisted(hostname)) ||
		(await isInLegitCache(hostname))
	) {
		redirectToSafeUrl(targetUrl);
		return;
	}

	// Perform phishing check via background
	chrome.runtime.sendMessage(
		{ action: "checkPhishing", url: targetUrl },
		async (response) => {
			const timestamp = new Date().toLocaleString();
			const parsedUrl = new URL(targetUrl);
			const fullDomain = parsedUrl.hostname
				.replace(/^www\./, "")
				.toLowerCase();

			// Load history
			const { detectionHistory = [] } = await chrome.storage.local.get(
				"detectionHistory"
			);

			// Helper to safely push with a cap
			function addHistory(entry) {
				detectionHistory.push(entry);
				// Keep only the last 10 entries
				if (detectionHistory.length > 10) {
					detectionHistory.splice(0, detectionHistory.length - 10);
				}
			}

			if (chrome.runtime.lastError) {
				console.log(
					"[PhiLNet] Phishing check failed:",
					chrome.runtime.lastError.message
				);

				addHistory({
					time: timestamp,
					url: fullDomain,
					score: -1, // mark failed checks with -1
				});
				await chrome.storage.local.set({ detectionHistory });

				redirectToSafeUrl(targetUrl);
				return;
			}

			addHistory({
				time: timestamp,
				url: fullDomain,
				score: response?.score ?? -1,
			});
			await chrome.storage.local.set({ detectionHistory });

			// If safe, update cache and redirect
			if (!response || !response.isPhishing) {
				await updateLegitCache(hostname);
				redirectToSafeUrl(targetUrl);
			} else {
				// If phishing, block and increment count
				await loadBlockOverlay(hostname, targetUrl);
				const { phishCount = 0 } = await chrome.storage.local.get(
					"phishCount"
				);
				await chrome.storage.local.set({ phishCount: phishCount + 1 });
			}
		}
	);
})();
