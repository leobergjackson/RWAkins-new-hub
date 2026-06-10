// AeroFyta Chrome Extension — Background Service Worker

const DEFAULT_API_URL = 'http://localhost:3001';
const DEFAULT_TIP_AMOUNT = 5.00;
const MAX_STORED_TIPS = 50;

// --- Settings Helper ---

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve(result.settings || {
        apiUrl: DEFAULT_API_URL,
        defaultTip: DEFAULT_TIP_AMOUNT,
        autoDetect: true
      });
    });
  });
}

// --- API Helper ---

async function fetchAgent(path, options = {}) {
  const settings = await getSettings();
  const baseUrl = (settings.apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
  const url = baseUrl + path;

  const resp = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Agent returned ${resp.status}: ${text}`);
  }

  return resp.json();
}

// --- Message Handler ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TIP_CREATOR') {
    handleTip(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === 'CHAT_ENGAGEMENT') {
    handleEngagement(message.payload);
    // fire-and-forget, no response needed
    return false;
  }

  if (message.type === 'CHECK_STATUS') {
    checkStatus()
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'error', error: err.message }));
    return true;
  }
});

// --- Tip Handler ---

async function handleTip(payload) {
  const settings = await getSettings();
  const amount = payload.amount || settings.defaultTip || DEFAULT_TIP_AMOUNT;

  try {
    const resp = await fetchAgent('/api/tip', {
      method: 'POST',
      body: JSON.stringify({
        creator: payload.creator,
        channel: payload.channel,
        amount: amount,
        platform: payload.platform || 'rumble',
        url: payload.url || ''
      })
    });

    if (resp.success) {
      // Save to local tip history
      await storeTip({
        creator: payload.creator,
        channel: payload.channel,
        amount: amount,
        timestamp: Date.now(),
        txHash: resp.txHash || null,
        platform: payload.platform || 'rumble'
      });

      // Show browser notification
      showNotification(
        'Tip Sent!',
        `Tipped ${payload.creator} $${amount.toFixed(2)} USDT`
      );

      return { success: true, amount, txHash: resp.txHash };
    } else {
      return { success: false, error: resp.error || 'Tip failed' };
    }
  } catch (err) {
    return { success: false, error: 'Could not reach agent: ' + err.message };
  }
}

// --- Engagement Handler ---

async function handleEngagement(payload) {
  try {
    await fetchAgent('/api/engagement', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch {
    // Silently ignore engagement reporting errors
  }
}

// --- Status Check ---

async function checkStatus() {
  try {
    const resp = await fetchAgent('/api/status');
    return resp;
  } catch {
    return { status: 'disconnected' };
  }
}

// --- Tip Storage ---

async function storeTip(tip) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['tips', 'tipStats'], (result) => {
      const tips = result.tips || [];
      tips.unshift(tip);
      const trimmed = tips.slice(0, MAX_STORED_TIPS);

      // Update stats
      const stats = result.tipStats || { totalTips: 0, totalAmount: 0 };
      stats.totalTips += 1;
      stats.totalAmount = parseFloat((stats.totalAmount + tip.amount).toFixed(2));

      chrome.storage.local.set({ tips: trimmed, tipStats: stats }, resolve);
    });
  });
}

// --- Notifications ---

function showNotification(title, message) {
  // Use the basic notification API (no extra permission needed with activeTab)
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message
    });
  }
}

// --- Periodic Status Check ---

// Check agent status every 30 seconds and update badge
async function updateBadge() {
  try {
    const resp = await fetchAgent('/api/status');
    if (resp && resp.status === 'ok') {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    } else {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }
  } catch {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }
}

// Run badge update on install and periodically
chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
  // Set up alarm for periodic checks
  chrome.alarms.create('statusCheck', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'statusCheck') {
    updateBadge();
  }
});
