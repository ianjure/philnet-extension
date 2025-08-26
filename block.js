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
			const rootDomain = getRootDomain(parsedUrl.hostname);

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
				console.error(
					"[PhiLNet] Phishing check failed:",
					chrome.runtime.lastError.message
				);

				addHistory({
					time: timestamp,
					url: rootDomain,
					score: -1, // mark failed checks with -1
				});
				await chrome.storage.local.set({ detectionHistory });

				redirectToSafeUrl(targetUrl);
				return;
			}

			addHistory({
				time: timestamp,
				url: rootDomain,
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

// Extract the root domain
function getRootDomain(hostname) {
	const parts = hostname.split(".");

	// Handle known 2-level TLDs (ccTLDs like edu.ph, gov.ph, co.uk, etc.)
	const twoLevelTLDs = [
		"edu.ph",
		"gov.ph",
		"com.ph",
		"net.ph",
		"org.ph",
		"co.uk",
	];
	const lastTwo = parts.slice(-2).join(".");
	const lastThree = parts.slice(-3).join(".");

	if (twoLevelTLDs.includes(lastTwo)) {
		return lastThree; // e.g., ustp.edu.ph
	}

	// Default: take last two parts
	if (parts.length >= 2) {
		return lastTwo; // e.g., google.com, supabase.io
	}

	return hostname;
}

// Redirect to target URL with ?checked=1 to prevent re-blocking
function redirectToSafeUrl(url) {
	const safeUrl = new URL(url);
	safeUrl.searchParams.set("checked", "1");
	window.location.replace(safeUrl.toString());
}

// Load external HTML block overlay and bind buttons
async function loadBlockOverlay(hostname, targetUrl) {
	try {
		const res = await fetch(chrome.runtime.getURL("block_content.html"));
		const html = await res.text();
		document.body.innerHTML = html;

		document.getElementById("phi-hostname").textContent = hostname;

		document.getElementById("phi-safe-btn").onclick = () => window.close();

		document.getElementById("phi-whitelist-btn").onclick = async () => {
			const rootDomain = getRootDomain(hostname);
			const { whitelist = [] } = await chrome.storage.local.get(
				"whitelist"
			);

			if (!whitelist.includes(rootDomain)) {
				whitelist.push(rootDomain);
				await chrome.storage.local.set({ whitelist });
			}
			redirectToSafeUrl(targetUrl);
		};
	} catch (err) {
		console.error("[PhiLNet] Error loading block page:", err);
		redirectToSafeUrl(targetUrl);
	}
}
