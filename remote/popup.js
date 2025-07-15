document.addEventListener("DOMContentLoaded", async () => {
	const enabledToggle = document.getElementById("enabledToggle");
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

		enabledToggle.checked = enabled;
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

	enabledToggle.addEventListener("change", async () => {
		await chrome.storage.local.set({ enabled: enabledToggle.checked });
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
