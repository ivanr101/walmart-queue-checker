// Check for saved refresh time on load
console.log("WM Queue Decoder: Content script loaded");
chrome.storage.local.get(['refreshTime'], (result) => {
    console.log("WM Queue Decoder: Initial storage check", result);
    if (result.refreshTime) {
        scheduleRefresh(result.refreshTime);
    }
});

// Listen for changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.refreshTime) {
        if (changes.refreshTime.newValue) {
            scheduleRefresh(changes.refreshTime.newValue);
        } else {
            if (notificationInterval) clearInterval(notificationInterval);
            console.log("WM Queue Decoder: Auto-refresh cleared.");
            showNotification("Auto-refresh cleared");
            setTimeout(() => {
                let el = document.getElementById('wm-checker-notification');
                if (el) el.remove();
            }, 2000);
        }
    }
});

let refreshTimeout;

function scheduleRefresh(timeString) {
    if (refreshTimeout) clearTimeout(refreshTimeout);

    const now = new Date();
    const parts = timeString.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    const seconds = parts[2] || 0;

    // Create a date object for the scheduled time on the current day
    const refreshTime = new Date(now);
    refreshTime.setHours(hours, minutes, seconds, 0);

    // If the scheduled time is earlier than now, assume it's for tomorrow.
    if (refreshTime < now) {
        refreshTime.setDate(refreshTime.getDate() + 1);
    }

    const delay = refreshTime - now;

    console.log(`WM Queue Decoder: Refreshing in ${delay}ms at ${refreshTime.toLocaleString()}`);
    console.log(`WM Queue Decoder: Current time is ${now.toLocaleString()}`);

    // Start notification update loop
    startNotificationLoop(refreshTime);

    refreshTimeout = setTimeout(() => {
        console.log("WM Queue Decoder: Triggering reload now");
        // Clear the refresh time before reloading so it doesn't loop or stay set for tomorrow
        chrome.storage.local.remove(['refreshTime'], () => {
            console.log("WM Queue Decoder: Refresh time cleared from storage");
            window.location.reload();
        });
    }, delay);
}

let notificationInterval;

function startNotificationLoop(refreshTime) {
    if (notificationInterval) clearInterval(notificationInterval);

    const update = () => {
        const now = new Date();
        let message = `Auto-refresh set for ${refreshTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`;
        if (refreshTime.getDate() !== now.getDate()) {
            message += " (Tomorrow)";
        }
        message += ` | Current Time: ${now.toLocaleTimeString()}`;
        showNotification(message);
    };

    update(); // Initial call
    notificationInterval = setInterval(update, 1000);
}

function showNotification(message) {
    let el = document.getElementById('wm-checker-notification');
    if (!el) {
        el = document.createElement('div');
        el.id = 'wm-checker-notification';
        el.style.position = 'fixed';
        el.style.bottom = '20px';
        el.style.right = '20px';
        el.style.backgroundColor = '#0071dc'; // Walmart blue
        el.style.color = 'white';
        el.style.padding = '10px 20px';
        el.style.borderRadius = '4px';
        el.style.zIndex = '9999';
        el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        el.style.fontFamily = 'sans-serif';
        document.body.appendChild(el);
    }
    el.textContent = message;
}
