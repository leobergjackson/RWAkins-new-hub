// AeroFyta Chrome Extension — Popup Controller

(function () {
  'use strict';

  // --- Constants ---
  const DEFAULT_API_URL = 'http://localhost:3001';
  const DEFAULT_TIP_AMOUNT = 2.00;
  const MAX_RECENT_TIPS = 8;

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const statusBadge = $('#statusBadge');
  const statusText = statusBadge.querySelector('.status-text');
  const balanceAmount = $('#balanceAmount');
  const chainBadge = $('#chainBadge');
  const walletAddress = $('#walletAddress');
  const creatorCard = $('#creatorCard');
  const creatorName = $('#creatorName');
  const creatorChannel = $('#creatorChannel');
  const creatorAvatar = $('#creatorAvatar');
  const creatorSubs = $('#creatorSubs');
  const pageTypeBadge = $('#pageTypeBadge');
  const tipButton = $('#tipButton');
  const tipList = $('#tipList');
  const tipCount = $('#tipCount');
  const customAmount = $('#customAmount');
  const apiUrlInput = $('#apiUrl');
  const defaultTipInput = $('#defaultTip');
  const autoDetectInput = $('#autoDetect');
  const saveSettingsBtn = $('#saveSettings');
  const notRumbleCard = $('#notRumbleCard');
  const rulesCount = $('#rulesCount');
  const ruleAddSection = $('#ruleAddSection');
  const ruleAddLabel = $('#ruleAddLabel');
  const ruleMaxPerDay = $('#ruleMaxPerDay');
  const ruleMinWatch = $('#ruleMinWatch');
  const ruleTipRate = $('#ruleTipRate');
  const ruleEnabled = $('#ruleEnabled');
  const saveRuleBtn = $('#saveRuleBtn');
  const rulesList = $('#rulesList');
  const resetRulesBtn = $('#resetRulesBtn');

  let selectedAmount = DEFAULT_TIP_AMOUNT;
  let currentCreator = null;
  let isOnRumble = false;
  let creatorRules = {}; // keyed by creator handle
  let settings = {
    apiUrl: DEFAULT_API_URL,
    defaultTip: DEFAULT_TIP_AMOUNT,
    autoDetect: true
  };

  // --- Init ---
  async function init() {
    initTabs();
    await loadSettings();
    await loadEventConfig();
    await loadCreatorRules();
    await loadRecentTips();
    await checkAgentStatus();
    await detectCurrentPage();
    bindEvents();
  }

  // --- Settings ---
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
          settings = { ...settings, ...result.settings };
        }
        apiUrlInput.value = settings.apiUrl;
        defaultTipInput.value = settings.defaultTip;
        autoDetectInput.checked = settings.autoDetect;
        selectedAmount = settings.defaultTip;
        resolve();
      });
    });
  }

  function saveSettings() {
    settings.apiUrl = apiUrlInput.value.replace(/\/+$/, '') || DEFAULT_API_URL;
    settings.defaultTip = parseFloat(defaultTipInput.value) || DEFAULT_TIP_AMOUNT;
    settings.autoDetect = autoDetectInput.checked;

    chrome.storage.local.set({ settings }, () => {
      showToast('Settings saved', 'success');
      checkAgentStatus();
    });
  }

  // --- Agent Status ---
  async function checkAgentStatus() {
    try {
      const resp = await fetchAgent('/api/status');
      if (resp && resp.status === 'ok') {
        setConnected(true);
        if (resp.balance !== undefined) {
          balanceAmount.textContent = parseFloat(resp.balance).toFixed(2);
        }
        if (resp.chain) {
          chainBadge.textContent = resp.chain.toUpperCase();
        }
        if (resp.address) {
          const addr = resp.address;
          walletAddress.textContent = addr.slice(0, 6) + '...' + addr.slice(-4);
          walletAddress.title = addr;
        }
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    }
  }

  function setConnected(connected) {
    if (connected) {
      statusBadge.classList.add('connected');
      statusText.textContent = 'Connected';
    } else {
      statusBadge.classList.remove('connected');
      statusText.textContent = 'Disconnected';
      balanceAmount.textContent = '--';
      walletAddress.textContent = 'Agent not running';
    }
  }

  // --- Page & Creator Detection ---
  async function detectCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        showNotOnRumble();
        return;
      }

      // Check if we are on Rumble
      if (!tab.url.includes('rumble.com')) {
        showNotOnRumble();
        return;
      }

      isOnRumble = true;
      notRumbleCard.style.display = 'none';

      // Ask content script for creator info
      chrome.tabs.sendMessage(tab.id, { type: 'GET_CREATOR' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.creator) {
          // On Rumble but no creator detected (maybe homepage)
          creatorCard.style.display = 'none';
          return;
        }
        currentCreator = response.creator;
        showCreator(currentCreator);
      });
    } catch {
      showNotOnRumble();
    }
  }

  function showNotOnRumble() {
    isOnRumble = false;
    notRumbleCard.style.display = 'flex';
    creatorCard.style.display = 'none';
  }

  function showCreator(creator) {
    creatorCard.style.display = 'block';
    creatorName.textContent = creator.name || 'Unknown Creator';
    creatorChannel.textContent = creator.channel || 'rumble.com';

    // Avatar
    const letter = (creator.name || '?')[0].toUpperCase();
    if (creator.avatar) {
      creatorAvatar.innerHTML = `<img src="${escapeHtml(creator.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      creatorAvatar.textContent = letter;
    }

    // Subscriber count
    if (creator.subscribers) {
      creatorSubs.style.display = 'inline';
      creatorSubs.textContent = creator.subscribers;
    } else {
      creatorSubs.style.display = 'none';
    }

    // Page type badge
    if (creator.isLive) {
      pageTypeBadge.textContent = 'LIVE';
      pageTypeBadge.className = 'page-type-badge page-type-live';
    } else if (creator.pageType === 'channel') {
      pageTypeBadge.textContent = 'CHANNEL';
      pageTypeBadge.className = 'page-type-badge page-type-channel';
    } else if (creator.pageType === 'video') {
      pageTypeBadge.textContent = 'VIDEO';
      pageTypeBadge.className = 'page-type-badge page-type-video';
    } else {
      pageTypeBadge.textContent = '';
      pageTypeBadge.className = 'page-type-badge';
    }

    updateTipButtonLabel();
    showRuleAddSection();
  }

  // --- Tipping ---
  function updateTipButtonLabel() {
    const amount = parseFloat(customAmount.value) || selectedAmount;
    tipButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.4 8.6L21.5 9.3L16.1 14L17.6 21L12 17.5L6.4 21L7.9 14L2.5 9.3L9.6 8.6L12 2Z" fill="currentColor"/></svg>
      Send $${amount.toFixed(2)} Tip
    `;
  }

  async function sendTip() {
    if (!currentCreator) {
      showToast('No creator detected on this page', 'error');
      return;
    }

    const amount = parseFloat(customAmount.value) || selectedAmount;
    if (amount <= 0 || isNaN(amount)) {
      showToast('Invalid tip amount', 'error');
      return;
    }

    tipButton.disabled = true;
    tipButton.textContent = 'Sending...';

    try {
      const resp = await fetchAgent('/api/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator: currentCreator.name,
          channel: currentCreator.channel,
          amount: amount,
          platform: 'rumble',
          url: currentCreator.url || ''
        })
      });

      if (resp && resp.success) {
        const tip = {
          creator: currentCreator.name,
          amount: amount,
          timestamp: Date.now(),
          txHash: resp.txHash || null
        };
        await saveTip(tip);
        showToast(`Tipped ${currentCreator.name} $${amount.toFixed(2)}`, 'success');
        checkAgentStatus(); // refresh balance
      } else {
        showToast(resp?.error || 'Tip failed', 'error');
      }
    } catch (err) {
      showToast('Could not reach agent', 'error');
    } finally {
      tipButton.disabled = false;
      updateTipButtonLabel();
    }
  }

  // --- Tip History ---
  async function saveTip(tip) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['tips'], (result) => {
        const tips = result.tips || [];
        tips.unshift(tip);
        const trimmed = tips.slice(0, MAX_RECENT_TIPS);
        chrome.storage.local.set({ tips: trimmed }, () => {
          renderTips(trimmed);
          resolve();
        });
      });
    });
  }

  async function loadRecentTips() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['tips'], (result) => {
        renderTips(result.tips || []);
        resolve();
      });
    });
  }

  function renderTips(tips) {
    tipCount.textContent = tips.length;
    if (tips.length === 0) {
      tipList.innerHTML = '<div class="tip-empty">No tips yet. Visit a Rumble creator to get started!</div>';
      return;
    }

    tipList.innerHTML = tips.map((tip) => {
      const timeAgo = formatTimeAgo(tip.timestamp);
      const txLink = tip.txHash
        ? `<a class="tip-item-tx" href="https://etherscan.io/tx/${escapeHtml(tip.txHash)}" target="_blank" title="View transaction">TX</a>`
        : '';
      return `
        <div class="tip-item">
          <div class="tip-item-left">
            <span class="tip-item-creator">${escapeHtml(tip.creator)}</span>
            <span class="tip-item-time">${timeAgo}</span>
          </div>
          <div class="tip-item-right">
            <span class="tip-item-amount">$${parseFloat(tip.amount).toFixed(2)}</span>
            ${txLink}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Per-Creator Rules ---
  async function loadCreatorRules() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['creatorRules'], (result) => {
        creatorRules = result.creatorRules || {};
        renderRules();
        resolve();
      });
    });
  }

  function saveCreatorRules() {
    chrome.storage.local.set({ creatorRules });
    renderRules();
  }

  function saveRuleForCreator() {
    if (!currentCreator) return;
    const handle = currentCreator.channel || currentCreator.name;
    if (!handle) return;

    creatorRules[handle] = {
      creatorName: currentCreator.name,
      maxTipPerDay: parseFloat(ruleMaxPerDay.value) || 5,
      minWatchMinutes: parseInt(ruleMinWatch.value, 10) || 5,
      tipRate: parseFloat(ruleTipRate.value) || 0.10,
      enabled: ruleEnabled.checked,
      updatedAt: Date.now()
    };

    saveCreatorRules();
    showToast(`Rule saved for ${currentCreator.name}`, 'success');
  }

  function deleteCreatorRule(handle) {
    delete creatorRules[handle];
    saveCreatorRules();
    showToast('Rule deleted', 'success');
  }

  function resetAllRules() {
    creatorRules = {};
    saveCreatorRules();
    showToast('All rules reset', 'success');
  }

  function renderRules() {
    const handles = Object.keys(creatorRules);
    rulesCount.textContent = handles.length;
    resetRulesBtn.style.display = handles.length > 0 ? 'block' : 'none';

    if (handles.length === 0) {
      rulesList.innerHTML = '<div class="tip-empty">No creator rules configured yet.</div>';
      return;
    }

    rulesList.innerHTML = handles.map((handle) => {
      const r = creatorRules[handle];
      const statusClass = r.enabled ? 'enabled' : 'disabled';
      const statusLabel = r.enabled ? 'ON' : 'OFF';
      return `
        <div class="rule-item">
          <div class="rule-item-left">
            <span class="rule-item-name">${escapeHtml(r.creatorName || handle)}</span>
            <span class="rule-item-details">Max $${r.maxTipPerDay}/day &middot; ${r.minWatchMinutes}min &middot; $${r.tipRate}/min</span>
          </div>
          <div class="rule-item-right">
            <span class="rule-item-status ${statusClass}">${statusLabel}</span>
            <button class="rule-item-delete" data-handle="${escapeHtml(handle)}" title="Delete rule">&times;</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind delete buttons
    rulesList.querySelectorAll('.rule-item-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        deleteCreatorRule(btn.dataset.handle);
      });
    });
  }

  function showRuleAddSection() {
    if (!currentCreator) {
      ruleAddSection.style.display = 'none';
      return;
    }
    ruleAddSection.style.display = 'block';
    const handle = currentCreator.channel || currentCreator.name;
    ruleAddLabel.textContent = `Configure for ${currentCreator.name}`;

    // Pre-fill if existing rule
    const existing = creatorRules[handle];
    if (existing) {
      ruleMaxPerDay.value = existing.maxTipPerDay;
      ruleMinWatch.value = existing.minWatchMinutes;
      ruleTipRate.value = existing.tipRate;
      ruleEnabled.checked = existing.enabled;
    } else {
      ruleMaxPerDay.value = 5;
      ruleMinWatch.value = 5;
      ruleTipRate.value = 0.10;
      ruleEnabled.checked = true;
    }
  }

  // --- Tab Navigation ---
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('tab-btn--active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('tab-content--active'));
        btn.classList.add('tab-btn--active');
        const tabId = 'tab-' + btn.dataset.tab;
        const tabEl = document.getElementById(tabId);
        if (tabEl) tabEl.classList.add('tab-content--active');
        // When switching to events tab, refresh hype and history
        if (btn.dataset.tab === 'events') {
          refreshEventsTab();
        }
      });
    });
  }

  // --- Event Config ---
  const EVENT_CONFIG_DEFAULTS = {
    watch_time: { enabled: true, minutes: 5 },
    chat_hype: { enabled: true, threshold: 70 },
    viewer_spike: { enabled: true, spikePercent: 20 },
    follower_milestone: { enabled: true },
    subscriber: { enabled: true },
    manual: { enabled: true }
  };

  async function loadEventConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['eventConfig'], (result) => {
        const cfg = result.eventConfig || EVENT_CONFIG_DEFAULTS;
        // Populate form fields
        const evtWatchEnabled = $('#evtWatchEnabled');
        const evtWatchMinutes = $('#evtWatchMinutes');
        const evtHypeEnabled = $('#evtHypeEnabled');
        const evtHypeThreshold = $('#evtHypeThreshold');
        const evtSpikeEnabled = $('#evtSpikeEnabled');
        const evtSpikePercent = $('#evtSpikePercent');
        const evtFollowerEnabled = $('#evtFollowerEnabled');
        const evtSubscribeEnabled = $('#evtSubscribeEnabled');
        const evtManualEnabled = $('#evtManualEnabled');

        if (evtWatchEnabled) evtWatchEnabled.checked = cfg.watch_time?.enabled !== false;
        if (evtWatchMinutes) evtWatchMinutes.value = cfg.watch_time?.minutes || 5;
        if (evtHypeEnabled) evtHypeEnabled.checked = cfg.chat_hype?.enabled !== false;
        if (evtHypeThreshold) evtHypeThreshold.value = cfg.chat_hype?.threshold || 70;
        if (evtSpikeEnabled) evtSpikeEnabled.checked = cfg.viewer_spike?.enabled !== false;
        if (evtSpikePercent) evtSpikePercent.value = cfg.viewer_spike?.spikePercent || 20;
        if (evtFollowerEnabled) evtFollowerEnabled.checked = cfg.follower_milestone?.enabled !== false;
        if (evtSubscribeEnabled) evtSubscribeEnabled.checked = cfg.subscriber?.enabled !== false;
        if (evtManualEnabled) evtManualEnabled.checked = cfg.manual?.enabled !== false;
        resolve();
      });
    });
  }

  function saveEventConfig() {
    const cfg = {
      watch_time: {
        enabled: $('#evtWatchEnabled')?.checked !== false,
        minutes: parseInt($('#evtWatchMinutes')?.value, 10) || 5
      },
      chat_hype: {
        enabled: $('#evtHypeEnabled')?.checked !== false,
        threshold: parseInt($('#evtHypeThreshold')?.value, 10) || 70
      },
      viewer_spike: {
        enabled: $('#evtSpikeEnabled')?.checked !== false,
        spikePercent: parseInt($('#evtSpikePercent')?.value, 10) || 20
      },
      follower_milestone: {
        enabled: $('#evtFollowerEnabled')?.checked !== false
      },
      subscriber: {
        enabled: $('#evtSubscribeEnabled')?.checked !== false
      },
      manual: {
        enabled: $('#evtManualEnabled')?.checked !== false
      }
    };
    chrome.storage.local.set({ eventConfig: cfg }, () => {
      showToast('Event config saved', 'success');
    });
  }

  // --- Live Hype Score ---
  let hypePollingInterval = null;

  function refreshEventsTab() {
    loadEventConfig();
    pollHypeScore();
    loadEventHistory();
    // Start polling hype score while events tab is visible
    if (hypePollingInterval) clearInterval(hypePollingInterval);
    hypePollingInterval = setInterval(pollHypeScore, 4000);
  }

  async function pollHypeScore() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { type: 'GET_HYPE_SCORE' }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        const score = response.score || 0;
        const active = response.chatActive;
        const fill = $('#hypeGaugeFill');
        const scoreEl = $('#hypeGaugeScore');
        const statusEl = $('#hypeStatus');
        if (fill) {
          fill.style.width = score + '%';
          if (score < 40) fill.style.background = 'var(--green-500)';
          else if (score < 70) fill.style.background = 'linear-gradient(90deg, #22c55e, #eab308)';
          else fill.style.background = 'linear-gradient(90deg, #eab308, #ef4444)';
        }
        if (scoreEl) scoreEl.textContent = score;
        if (statusEl) {
          statusEl.textContent = active ? 'Active' : 'Inactive';
          statusEl.className = 'hype-status' + (active ? ' hype-status--active' : '');
        }
      });
    } catch { /* ignore */ }
  }

  async function loadEventHistory() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { type: 'GET_EVENT_HISTORY' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Fallback: load from storage
          chrome.storage.local.get(['eventHistory'], (data) => {
            renderEventHistory(data.eventHistory || []);
          });
          return;
        }
        renderEventHistory(response.events || []);
      });
    } catch {
      chrome.storage.local.get(['eventHistory'], (data) => {
        renderEventHistory(data.eventHistory || []);
      });
    }
  }

  const EVENT_ICONS = {
    watch_time: '\u23F1',
    chat_hype: '\uD83D\uDD25',
    viewer_spike: '\uD83D\uDCC8',
    follower_milestone: '\uD83C\uDFC6',
    subscriber: '\u2B50',
    manual: '\uD83D\uDCB0'
  };

  function renderEventHistory(events) {
    const list = $('#eventHistoryList');
    const countEl = $('#eventHistoryCount');
    if (!list) return;
    if (countEl) countEl.textContent = events.length;

    if (events.length === 0) {
      list.innerHTML = '<div class="tip-empty">No events triggered yet.</div>';
      return;
    }

    list.innerHTML = events.slice().reverse().map((evt) => {
      const icon = EVENT_ICONS[evt.type] || '\u26A1';
      const timeAgo = formatTimeAgo(evt.timestamp);
      return `
        <div class="event-history-item">
          <span class="event-history-icon">${icon}</span>
          <div class="event-history-info">
            <span class="event-history-type">${escapeHtml((evt.type || '').replace(/_/g, ' '))}</span>
            <span class="event-history-detail">${escapeHtml(evt.detail || '')}</span>
          </div>
          <span class="event-history-time">${timeAgo}</span>
        </div>
      `;
    }).join('');
  }

  // Listen for real-time event updates from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'EVENT_TRIGGERED') {
      loadEventHistory();
    }
    if (msg.type === 'HYPE_SCORE_UPDATE') {
      const score = msg.payload?.score || 0;
      const fill = $('#hypeGaugeFill');
      const scoreEl = $('#hypeGaugeScore');
      if (fill) {
        fill.style.width = score + '%';
        if (score < 40) fill.style.background = 'var(--green-500)';
        else if (score < 70) fill.style.background = 'linear-gradient(90deg, #22c55e, #eab308)';
        else fill.style.background = 'linear-gradient(90deg, #eab308, #ef4444)';
      }
      if (scoreEl) scoreEl.textContent = score;
    }
  });

  // --- Events ---
  function bindEvents() {
    // Tip chips
    document.querySelectorAll('.btn-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-chip').forEach((b) => b.classList.remove('aerofyta-chip-active'));
        btn.classList.add('aerofyta-chip-active');
        selectedAmount = parseFloat(btn.dataset.amount);
        customAmount.value = '';
        updateTipButtonLabel();
      });
    });

    // Custom amount clears chip selection
    customAmount.addEventListener('input', () => {
      if (customAmount.value) {
        document.querySelectorAll('.btn-chip').forEach((b) => b.classList.remove('aerofyta-chip-active'));
      }
      updateTipButtonLabel();
    });

    // Tip button
    tipButton.addEventListener('click', sendTip);

    // Save settings
    saveSettingsBtn.addEventListener('click', saveSettings);

    // Creator rules
    saveRuleBtn.addEventListener('click', saveRuleForCreator);
    resetRulesBtn.addEventListener('click', resetAllRules);

    // Copy wallet address
    walletAddress.addEventListener('click', () => {
      const addr = walletAddress.title;
      if (addr && (addr.startsWith('0x') || addr.startsWith('UQ'))) {
        navigator.clipboard.writeText(addr).then(() => {
          showToast('Address copied', 'success');
        });
      }
    });

    // Event config save
    const saveEventsBtn = $('#saveEventsBtn');
    if (saveEventsBtn) saveEventsBtn.addEventListener('click', saveEventConfig);
  }

  // --- API Helper ---
  async function fetchAgent(path, options = {}) {
    const url = settings.apiUrl + path;
    const resp = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(5000)
    });
    return resp.json();
  }

  // --- Utils ---
  function formatTimeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = '') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast ' + type;
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', init);
})();
