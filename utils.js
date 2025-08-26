// 24 hours in milliseconds
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
	const all = [...whitelist, ...defaultTrustedDomains].map((d) =>
		d.toLowerCase()
	);

	const host = hostname.toLowerCase();

	// Exact domain match OR subdomain match
	return all.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

// Check if a hostname is in the legitimate cache and not expired
async function isInLegitCache(hostname) {
	const { legitCache = {} } = await chrome.storage.local.get("legitCache");
	const now = Date.now();

	let changed = false;
	for (const domain in legitCache) {
		if (now - legitCache[domain] >= ONE_DAY_MS) {
			delete legitCache[domain]; // expired
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
	const now = Date.now();

	// Clean out expired entries first
	for (const domain in legitCache) {
		if (now - legitCache[domain] >= ONE_DAY_MS) {
			delete legitCache[domain];
		}
	}

	// Update current hostname
	legitCache[hostname] = now;

	await chrome.storage.local.set({ legitCache });
}
