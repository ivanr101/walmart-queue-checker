document.addEventListener('DOMContentLoaded', async () => {
    const display = document.getElementById('display');

    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Handle Discord link click
    const discordLink = document.querySelector('.discord-btn');
    if (discordLink) {
        discordLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: e.currentTarget.href });
        });
    }

    try {
        const url = new URL(tab.url);
        const qpdataEncoded = url.searchParams.get('qpdata');

        if (!qpdataEncoded) {
            display.innerHTML = "<p>No queue data found in this URL.</p>";
            return;
        }

        const data = JSON.parse(decodeURIComponent(qpdataEncoded));

        // Format the Turn Time if it exists
        let turnTimeStr = "N/A";
        if (data.expectedTurnTimeUnixTimestamp) {
            turnTimeStr = new Date(data.expectedTurnTimeUnixTimestamp).toLocaleTimeString();
        }

        display.innerHTML = `
      <div class="data-item">
        <div class="label">Ticket Number</div>
        <div class="value">${data.ticket || 'Click Hold my Spot and Check Again'}</div>
      </div>
      <div class="data-item">
        <div class="label">Expected Turn</div>
        <div class="value">${turnTimeStr}</div>
      </div>
      <div class="data-item">
        <div class="label">Likelihood</div>
        <div class="value ${data.customMetadata?.admissionLikelihood}">${data.customMetadata?.admissionLikelihood || 'Unknown'}</div>
      </div>
      <div class="data-item">
        <div class="label">Item</div>
        <div class="value" style="font-size: 0.9em;">${data.customMetadata?.item?.name || 'Unknown Item'}</div>
      </div>
    `;
    } catch (e) {
        display.innerHTML = "<p>Error decoding data.</p>";
    }
});