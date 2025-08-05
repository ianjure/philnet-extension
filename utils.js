const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Load trusted domains from whitelist.txt bundled in the extension
async function loadDefaultTrustedDomains() {
	const res = await fetch(chrome.runtime.getURL("whitelist.txt"));
	const text = await res.text();
	return text
		.split("\n")
		.map((line) => line.trim().toLowerCase())
		.filter(Boolean);
}

// Check if a hostname is in either the user-defined or default whitelist
async function isWhitelisted(hostname) {
	const { whitelist = [] } = await chrome.storage.local.get("whitelist");
	const defaultTrustedDomains = await loadDefaultTrustedDomains();

	return (
		whitelist.some((d) => hostname.includes(d)) ||
		defaultTrustedDomains.some((d) => hostname.includes(d))
	);
}

// Check if a hostname is in the legitimate cache and not expired
async function isInLegitCache(hostname) {
	const { legitCache = {} } = await chrome.storage.local.get("legitCache");
	const now = Date.now();

	let changed = false;
	for (const domain in legitCache) {
		if (now - legitCache[domain] >= ONE_WEEK_MS) {
			delete legitCache[domain];
			changed = true;
		}
	}

	if (changed) {
		await chrome.storage.local.set({ legitCache });
	}

	return hostname in legitCache;
}

// Add or update a hostname in the legit cache with the current timestamp
async function updateLegitCache(hostname) {
	const { legitCache = {} } = await chrome.storage.local.get("legitCache");
	legitCache[hostname] = Date.now();
	await chrome.storage.local.set({ legitCache });
}
