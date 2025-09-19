// Initialize default storage on install
chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.set({
		enabled: true,
		whitelist: [],
		phishCount: 0,
		detectionHistory: [],
		legitCache: [],
	});
});

// Central message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "checkPhishing") {
		handleCheckPhishing(request.url, sendResponse);
		return true; // Keep the message port open
	}

	if (request.action === "closeTab" && sender.tab?.id) {
		chrome.tabs.remove(sender.tab.id);
	}
});

// Wrapper to handle phishing check
async function handleCheckPhishing(url, sendResponse) {
	try {
		const { prediction, score } = await callPhishingAPI(url, "Extension");
		sendResponse({
			score,
			isPhishing: prediction === "phishing",
		});
	} catch (error) {
		console.error("[PhiLNet] Error checking phishing:", error);
		sendResponse({
			score: null,
			isPhishing: false,
		});
	}
}

// Actual phishing API call
async function callPhishingAPI(url, source) {
	const apiURL = "https://ianjure-philnet-backend.sliplane.app/predict";

	try {
		const response = await fetch(apiURL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url, source }),
			cache: "no-store",
		});

		if (!response.ok) {
			console.error(
				`[PhiLNet] API responded with status: ${response.status}`
			);
			return false;
		}

		const data = await response.json();
		console.log(data);
		return {
			prediction: data.prediction,
			score: data.score,
		};
	} catch (err) {
		console.error("[PhiLNet] API request failed:", err);
		return false;
	}
}
