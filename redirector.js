(async () => {
	const url = new URL(window.location.href);

	// Skip if already checked or if it's the block page itself
	if (url.searchParams.get("checked") === "1") return;
	if (url.href.includes("block.html")) return;

	const hostname = url.hostname;
	const { enabled } = await chrome.storage.local.get("enabled");

	// Skip if extension is disabled, site is whitelisted, or cached safe
	if (
		!enabled ||
		(await isWhitelisted(hostname)) ||
		(await isInLegitCache(hostname))
	) {
		return;
	}

	// Otherwise, let block.js handle the phishing check
	const redirectUrl = chrome.runtime.getURL(
		`block.html?url=${encodeURIComponent(url.href)}`
	);
	window.location.replace(redirectUrl);
})();
