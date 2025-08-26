document.addEventListener("DOMContentLoaded", () => {
	const switchToggle = document.getElementById("switchToggle");

	const phishCountSpan = document.getElementById("phishCount");

	const addBtn = document.getElementById("addWhitelist");
	const input = document.getElementById("addDomain");
	const whitelistContainer = document.getElementById("whitelist");

	// History button listener
	document.getElementById("historyBtn").addEventListener("click", () => {
		document.getElementById("main-section").classList.add("hidden");
		document.getElementById("history-section").classList.remove("hidden");
	});

	// Back button in history section listener
	document.getElementById("back-button").addEventListener("click", () => {
		document.getElementById("history-section").classList.add("hidden");
		document.getElementById("main-section").classList.remove("hidden");
	});

	// Current whitelist state
	let currentWhitelist = [];

	// Function to render detection history
	function renderHistory(history) {
		const table = document.getElementById("history-table");
		table.innerHTML = "";

		// Sort by time (descending)
		const sortedHistory = [...history].sort((a, b) => b.time - a.time);

		sortedHistory.forEach((entry) => {
			const row = document.createElement("div");
			row.className = `history-row${
				entry.score >= 0.5 ? " phishing" : ""
			}`;

			const website = document.createElement("div");
			website.className = "website";
			website.textContent = entry.url;

			const score = document.createElement("div");
			score.className = "score";
			score.textContent = (entry.score * 100).toFixed(1) + "%";

			row.appendChild(website);
			row.appendChild(score);
			table.appendChild(row);
		});
	}

	// Function to render whitelist
	function renderWhitelist() {
		whitelistContainer.innerHTML = "";

		currentWhitelist.forEach((site, index) => {
			const li = document.createElement("li");
			li.className = "whitelist-item";

			const domainText = document.createElement("span");
			domainText.textContent = site;
			domainText.className = "domain-name";

			const removeBtn = document.createElement("button");
			removeBtn.textContent = "✕";
			removeBtn.className = "remove-btn";
			removeBtn.addEventListener("click", async () => {
				currentWhitelist.splice(index, 1);
				await chrome.storage.local.set({ whitelist: currentWhitelist });
				renderWhitelist();
				updateAddButtonState();
			});

			li.appendChild(domainText);
			li.appendChild(removeBtn);
			whitelistContainer.appendChild(li);

			const separator = document.createElement("hr");
			separator.className = "whitelist-separator";
			whitelistContainer.appendChild(separator);
		});
	}

	// Function to update add whitelist button state
	function updateAddButtonState() {
		const domain = input.value.trim();
		const isDuplicate = currentWhitelist.includes(domain);
		addBtn.disabled =
			domain === "" || isDuplicate || currentWhitelist.length >= 5;
	}

	// Load initial data
	async function loadData() {
		const {
			enabled = false,
			whitelist = [],
			phishCount = 0,
			detectionHistory = [],
		} = await chrome.storage.local.get([
			"enabled",
			"whitelist",
			"phishCount",
			"detectionHistory",
		]);

		switchToggle.checked = enabled;

		phishCountSpan.textContent = phishCount;

		currentWhitelist = whitelist;
		renderWhitelist();
		updateAddButtonState();

		renderHistory(detectionHistory);
	}

	// Switch toggle listener
	switchToggle.addEventListener("change", async () => {
		const isProtected = switchToggle.checked;
		await chrome.storage.local.set({ enabled: isProtected });
	});

	// Add domain to whitelist
	addBtn.addEventListener("click", async () => {
		const domain = input.value.trim();
		if (
			domain &&
			!currentWhitelist.includes(domain) &&
			currentWhitelist.length < 5
		) {
			currentWhitelist.push(domain);
			await chrome.storage.local.set({ whitelist: currentWhitelist });
			input.value = "";
			renderWhitelist();
			updateAddButtonState();
		}
	});

	// Input change listener for validation
	input.addEventListener("input", updateAddButtonState);

	loadData();
});
