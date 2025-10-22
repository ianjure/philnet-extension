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

// Extract the root domain
function getRootDomain(hostname) {
	const parts = hostname.split(".");

	// Handle known 2-level TLDs
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
	const now = Date.now();
	const rootDomain = getRootDomain(hostname.toLowerCase()); // normalize

	const { legitCache = [] } = await chrome.storage.local.get("legitCache");

	// Filter expired entries
	const freshCache = legitCache.filter(
		(entry) => now - entry.timestamp < ONE_DAY_MS
	);

	// Save cleaned cache if anything expired
	if (freshCache.length !== legitCache.length) {
		await chrome.storage.local.set({ legitCache: freshCache });
	}

	// Check if root domain is present
	return freshCache.some((entry) => entry.hostname === rootDomain);
}

// Add or update a hostname in the legit cache with the current timestamp
async function updateLegitCache(hostname) {
	const now = Date.now();
	const rootDomain = getRootDomain(hostname.toLowerCase()); // <-- normalize here

	const { legitCache = [] } = await chrome.storage.local.get("legitCache");

	// Remove expired entries first
	let freshCache = legitCache.filter(
		(entry) => now - entry.timestamp < ONE_DAY_MS
	);

	// Remove old entry for this hostname if exists
	freshCache = freshCache.filter((entry) => entry.hostname !== rootDomain);

	// Add updated entry
	freshCache.push({ hostname: rootDomain, timestamp: now });

	await chrome.storage.local.set({ legitCache: freshCache });
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

		document.getElementById("hostname").textContent = hostname;
		document.getElementById("close-btn").onclick = () => window.close();
		document.getElementById("continue-btn").onclick = async () => {
			await updateLegitCache(hostname);
			redirectToSafeUrl(targetUrl);
		};
	} catch (err) {
		console.log("[PhiLNet Vanguard] Error loading block page:", err);
		redirectToSafeUrl(targetUrl);
	}
}
