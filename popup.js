document.addEventListener("DOMContentLoaded", async () => {
	const switchToggle = document.getElementById("switchToggle");
	const statusIcon = document.querySelector(".status-icon");
	const statusText = document.querySelector(".status-text");

	const phishCountSpan = document.getElementById("phishCount");
	const whitelistUl = document.getElementById("whitelist");
	const historyUl = document.getElementById("history");
	const addDomainInput = document.getElementById("addDomain");
	const addWhitelistBtn = document.getElementById("addWhitelist");

	async function loadData() {
		const {
			enabled,
			whitelist = [],
			phishCount = 0,
			detectionHistory = [],
		} = await chrome.storage.local.get([
			"enabled",
			"whitelist",
			"phishCount",
			"detectionHistory",
		]);

		// Load Switch Toggle State
		switchToggle.checked = enabled;
		updateStatusIndicator(enabled);
		function updateStatusIndicator(isProtected) {
			statusIcon.textContent = isProtected ? "🔒" : "🔓";
			statusText.textContent = isProtected ? "Protected" : "Unprotected";
		}

		phishCountSpan.textContent = phishCount;

		whitelistUl.innerHTML = "";
		whitelist.forEach((domain) => {
			const li = document.createElement("li");
			li.textContent = domain;

			const removeBtn = document.createElement("button");
			removeBtn.textContent = "Remove";
			removeBtn.style.marginLeft = "5px";
			removeBtn.onclick = async () => {
				const newWhitelist = whitelist.filter((d) => d !== domain);
				await chrome.storage.local.set({ whitelist: newWhitelist });
				loadData();
			};

			li.appendChild(removeBtn);
			whitelistUl.appendChild(li);
		});

		historyUl.innerHTML = "";
		detectionHistory
			.slice()
			.reverse()
			.forEach((entry) => {
				const li = document.createElement("li");
				li.innerHTML = `<span>${entry.url}</span><br><span class="small">${entry.time}</span>`;
				historyUl.appendChild(li);
			});
	}

	// Switch Toggle Listener
	switchToggle.addEventListener("change", async () => {
		await chrome.storage.local.set({ enabled: switchToggle.checked });
	});

	addWhitelistBtn.addEventListener("click", async () => {
		const newDomain = addDomainInput.value.trim();
		if (!newDomain) return;
		const { whitelist = [] } = await chrome.storage.local.get("whitelist");
		if (!whitelist.includes(newDomain)) {
			whitelist.push(newDomain);
			await chrome.storage.local.set({ whitelist });
			addDomainInput.value = "";
			loadData();
		}
	});

	loadData();
});
