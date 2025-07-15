(async () => {
	const url = new URL(window.location.href);
	if (url.searchParams.get("checked") === "1") return; // Already checked, do not re-check

	if (url.href.includes("block.html")) return; // Don't redirect block page

	const hostname = url.hostname;
	const { enabled, whitelist = [] } = await chrome.storage.local.get([
		"enabled",
		"whitelist",
	]);

	const defaultTrustedDomains = [
		"google.com",
		"facebook.com",
		"youtube.com",
		"gmail.com",
		"amazon.com",
		"microsoft.com",
		"apple.com",
		"wikipedia.org",
		"x.com",
		"instagram.com",
	];

	const isWhitelisted =
		whitelist.some((d) => hostname.includes(d)) ||
		defaultTrustedDomains.some((d) => hostname.includes(d));

	if (!enabled || isWhitelisted) return;

	// Redirect to block.html
	const redirectUrl = chrome.runtime.getURL(
		`block.html?url=${encodeURIComponent(url.href)}`
	);
	window.location.replace(redirectUrl);
})();
