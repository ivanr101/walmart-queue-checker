document.addEventListener('DOMContentLoaded', async () => {
  const display = document.getElementById('display');

  // Get the current active tab
  // Auto Refresh Logic
  const hourInput = document.getElementById('refresh-hour');
  const minuteInput = document.getElementById('refresh-minute');
  const secondInput = document.getElementById('refresh-second');
  const ampmInput = document.getElementById('refresh-ampm');
  const clearBtn = document.getElementById('clear-refresh');
  const statusDiv = document.getElementById('refresh-status');

  function formatTime(timeString) {
    if (!timeString) return '';
    const parts = timeString.split(':');
    const hours = parts[0];
    const minutes = parts[1];
    const seconds = parts[2] || '00';

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(seconds);

    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }

  function updateUI(time) {
    if (!time) {
      hourInput.value = '';
      minuteInput.value = '';
      secondInput.value = '';
      ampmInput.value = 'PM';
      return;
    }

    const parts = time.split(':');
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    const seconds = parts[2] || '00';

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    hourInput.value = hours;
    minuteInput.value = minutes;
    secondInput.value = seconds;
    ampmInput.value = ampm;
  }

  // State to hold the current scheduled time
  let currentScheduledTime = null;

  function updateStatus(time) {
    currentScheduledTime = time; // Update state
    if (!time) {
      updateUI(null);
    }
    renderStatus();
  }

  function renderStatus() {
    const nowStr = new Date().toLocaleTimeString();
    if (currentScheduledTime) {
      statusDiv.innerHTML = `Refresh set for <span style="color: #3ba55c; font-weight: bold;">${formatTime(currentScheduledTime)}</span><br><span style="color: #b9bbbe; font-size: 11px;">Current: ${nowStr}</span>`;
    } else {
      statusDiv.innerHTML = `Auto-refresh not set<br><span style="color: #b9bbbe; font-size: 11px;">Select a time to auto-set</span><br><span style="color: #b9bbbe; font-size: 11px;">Current Time: ${nowStr}</span>`;
      // Don't call updateUI(null) here constantly to prevent clearing inputs while typing
    }
  }

  // Update clock every second
  setInterval(renderStatus, 1000);

  // Auto-save logic
  function saveTime() {
    let h = parseInt(hourInput.value);
    let m = parseInt(minuteInput.value);
    let s = parseInt(secondInput.value) || 0;
    const ampm = ampmInput.value;

    if (isNaN(h) || isNaN(m)) return; // Don't save if incomplete

    // Convert to 24h
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    // Pad
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');

    const time = `${hStr}:${mStr}:${sStr}`;

    chrome.storage.local.set({ refreshTime: time }, () => {
      // updateStatus only for text, avoiding input overwrite for smoother UX
      updateStatus(time);
    });
  }

  [hourInput, minuteInput, secondInput, ampmInput].forEach(el => {
    el.addEventListener('change', saveTime);
    el.addEventListener('keyup', saveTime); // Also save on typing
  });

  // Load saved time
  chrome.storage.local.get(['refreshTime'], (result) => {
    if (result && result.refreshTime) {
      updateUI(result.refreshTime);
      updateStatus(result.refreshTime);
    } else {
      updateStatus(null);
    }
  });

  clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['refreshTime'], () => {
      updateStatus(null);
    });
  });
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

