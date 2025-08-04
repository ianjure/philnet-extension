(async () => {
	const params = new URLSearchParams(window.location.search);
	const targetUrl = params.get("url");
	const hostname = new URL(targetUrl).hostname;

	// Fetch whitelist.txt from extension files
	const res = await fetch(chrome.runtime.getURL("whitelist.txt"));
	const text = await res.text();
	const defaultTrustedDomains = text
		.split("\n")
		.map((line) => line.trim().toLowerCase())
		.filter(Boolean); // remove empty lines

	// Load user settings from storage
	const { enabled, whitelist = [] } = await chrome.storage.local.get([
		"enabled",
		"whitelist",
	]);

	const isWhitelisted =
		whitelist.some((d) => hostname.includes(d)) ||
		defaultTrustedDomains.some((d) => hostname.includes(d));

	if (!enabled || isWhitelisted) {
		redirectToSafeUrl(targetUrl);
		return;
	}

	// Send phishing check request
	chrome.runtime.sendMessage(
		{ action: "checkPhishing", url: targetUrl },
		async (response) => {
			if (chrome.runtime.lastError) {
				console.error(
					"[PhiLNet] Phishing check failed:",
					chrome.runtime.lastError.message
				);
				redirectToSafeUrl(targetUrl);
				return;
			}

			const { detectionHistory = [] } = await chrome.storage.local.get(
				"detectionHistory"
			);
			const timestamp = new Date().toLocaleString();
			detectionHistory.push({ url: targetUrl, time: timestamp });
			await chrome.storage.local.set({ detectionHistory });

			if (!response || !response.isPhishing) {
				redirectToSafeUrl(targetUrl);
			} else {
				await loadBlockOverlay(hostname, targetUrl);

				const { phishCount = 0 } = await chrome.storage.local.get(
					"phishCount"
				);
				await chrome.storage.local.set({ phishCount: phishCount + 1 });
			}
		}
	);
})();

// ✅ Redirect to target URL with ?checked=1 to prevent re-blocking
function redirectToSafeUrl(url) {
	const safeUrl = new URL(url);
	safeUrl.searchParams.set("checked", "1");
	window.location.replace(safeUrl.toString());
}

// ✅ Load external HTML block overlay and bind buttons
async function loadBlockOverlay(hostname, targetUrl) {
	try {
		const res = await fetch(chrome.runtime.getURL("block_content.html"));
		const html = await res.text();
		document.body.innerHTML = html;

		document.getElementById("phi-hostname").textContent = hostname;

		document.getElementById("phi-safe-btn").onclick = () => window.close();

		document.getElementById("phi-whitelist-btn").onclick = async () => {
			const { whitelist = [] } = await chrome.storage.local.get(
				"whitelist"
			);
			if (!whitelist.includes(hostname)) {
				whitelist.push(hostname);
				await chrome.storage.local.set({ whitelist });
			}
			redirectToSafeUrl(targetUrl);
		};
	} catch (err) {
		console.error("[PhiLNet] Error loading block page:", err);
		redirectToSafeUrl(targetUrl);
	}
}
