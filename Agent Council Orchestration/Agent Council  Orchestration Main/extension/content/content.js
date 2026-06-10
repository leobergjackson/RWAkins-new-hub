// AeroFyta Chrome Extension — Content Script (Rumble.com)
// Detects creators on channel pages, video pages, and livestreams.
// Shows a floating "Tip with AeroFyta" FAB and a tip dialog.

(function () {
  'use strict';

  const POLL_INTERVAL = 2500;
  const FAB_ID = 'aerofyta-fab';
  const DIALOG_ID = 'aerofyta-tip-dialog';
  const OVERLAY_ID = 'aerofyta-overlay';

  let currentCreator = null;
  let fabInjected = false;
  let dialogOpen = false;

  // ─── Wallet Address Cache ──────────────────────────────────────────

  const walletCache = {}; // keyed by channel slug

  // ─── HTMX Wallet Extraction ────────────────────────────────────────

  /**
   * Attempts to extract the creator's wallet address by finding Rumble's
   * tip/support button, reading its hx-get URL, fetching the tip modal HTML,
   * and parsing hx-vals JSON for EVM/BTC addresses.
   *
   * Returns { evmAddress, btcAddress, status } where status is
   * 'detected' | 'manual' | 'none'.
   */
  async function extractWalletViaHTMX() {
    const result = { evmAddress: null, btcAddress: null, status: 'none' };

    try {
      // Step 1: Find the tip/support button on the page
      const tipButtonSelectors = [
        'button[hx-get*="tip"]',
        'a[hx-get*="tip"]',
        '[hx-get*="tip_modal"]',
        '[hx-get*="/user/tip"]',
        '.rumbles-vote-pill[hx-get]',
        'button[hx-get*="support"]',
        '[data-action="tip"]',
        '.tip-button[hx-get]',
        // Broader: any HTMX element near "Tip" or "Support" text
        '.rumbles-vote-pill',
        '.rant-button',
        '[class*="tip"][hx-get]',
        '[class*="support"][hx-get]'
      ];

      let tipButton = null;
      let hxGetUrl = null;

      for (const sel of tipButtonSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const hxGet = el.getAttribute('hx-get');
          if (hxGet) {
            tipButton = el;
            hxGetUrl = hxGet;
            break;
          }
          // If element found but no hx-get, check parent and siblings
          const parent = el.closest('[hx-get]');
          if (parent) {
            tipButton = parent;
            hxGetUrl = parent.getAttribute('hx-get');
            break;
          }
        }
      }

      // Fallback: scan all elements with hx-get containing tip-related paths
      if (!hxGetUrl) {
        const allHtmx = document.querySelectorAll('[hx-get]');
        for (const el of allHtmx) {
          const url = el.getAttribute('hx-get') || '';
          if (/tip|support|rant|donate/i.test(url)) {
            tipButton = el;
            hxGetUrl = url;
            break;
          }
        }
      }

      if (!hxGetUrl) {
        console.log('[AeroFyta] No HTMX tip button found on page');
        result.status = 'manual';
        return result;
      }

      console.log('[AeroFyta] Found HTMX tip button:', hxGetUrl);

      // Step 2: Also check for hx-vals on the button itself
      const immediateVals = tipButton.getAttribute('hx-vals');
      if (immediateVals) {
        const parsed = parseHxVals(immediateVals);
        if (parsed) {
          Object.assign(result, parsed);
          if (result.evmAddress) {
            result.status = 'detected';
            console.log('[AeroFyta] Wallet found in button hx-vals:', result.evmAddress);
            return result;
          }
        }
      }

      // Step 3: Fetch the tip modal HTML
      const fullUrl = hxGetUrl.startsWith('http')
        ? hxGetUrl
        : window.location.origin + hxGetUrl;

      const response = await fetch(fullUrl, {
        method: 'GET',
        credentials: 'include', // send cookies for authenticated endpoints
        headers: {
          'HX-Request': 'true',
          'HX-Current-URL': window.location.href,
          'Accept': 'text/html, */*'
        }
      });

      if (!response.ok) {
        console.log('[AeroFyta] Tip modal fetch failed:', response.status);
        result.status = 'manual';
        return result;
      }

      const modalHtml = await response.text();
      console.log('[AeroFyta] Tip modal HTML fetched, length:', modalHtml.length);

      // Step 4: Parse the modal HTML for wallet addresses
      const parser = new DOMParser();
      const doc = parser.parseFromString(modalHtml, 'text/html');

      // Look for hx-vals attributes containing wallet addresses
      const hxValsElements = doc.querySelectorAll('[hx-vals]');
      for (const el of hxValsElements) {
        const vals = el.getAttribute('hx-vals');
        const parsed = parseHxVals(vals);
        if (parsed && (parsed.evmAddress || parsed.btcAddress)) {
          Object.assign(result, parsed);
          result.status = 'detected';
          console.log('[AeroFyta] Wallet found in modal hx-vals:', result.evmAddress || result.btcAddress);
          break;
        }
      }

      // Also look for wallet addresses in data attributes
      if (!result.evmAddress) {
        const dataWalletEls = doc.querySelectorAll(
          '[data-wallet], [data-address], [data-evm-address], [data-eth-address], [data-recipient]'
        );
        for (const el of dataWalletEls) {
          const addr = el.getAttribute('data-wallet')
            || el.getAttribute('data-address')
            || el.getAttribute('data-evm-address')
            || el.getAttribute('data-eth-address')
            || el.getAttribute('data-recipient');
          if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
            result.evmAddress = addr;
            result.status = 'detected';
            break;
          }
        }
      }

      // Look for EVM addresses in the raw HTML via regex
      if (!result.evmAddress) {
        const evmMatch = modalHtml.match(/0x[a-fA-F0-9]{40}/);
        if (evmMatch) {
          result.evmAddress = evmMatch[0];
          result.status = 'detected';
          console.log('[AeroFyta] EVM address found via regex in modal:', result.evmAddress);
        }
      }

      // Look for BTC addresses in the raw HTML via regex
      if (!result.btcAddress) {
        // Match legacy (1...), segwit (3...), and bech32 (bc1...) addresses
        const btcMatch = modalHtml.match(/\b(bc1[a-zA-HJ-NP-Z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/);
        if (btcMatch) {
          result.btcAddress = btcMatch[0];
          if (!result.evmAddress) result.status = 'detected';
          console.log('[AeroFyta] BTC address found via regex in modal:', result.btcAddress);
        }
      }

      // Look for "Send to another wallet" type options with embedded addresses
      if (!result.evmAddress) {
        const inputs = doc.querySelectorAll('input[type="hidden"], input[name*="wallet"], input[name*="address"]');
        for (const input of inputs) {
          const val = input.value || '';
          if (/^0x[a-fA-F0-9]{40}$/.test(val)) {
            result.evmAddress = val;
            result.status = 'detected';
            console.log('[AeroFyta] EVM address found in hidden input:', result.evmAddress);
            break;
          }
        }
      }

      if (result.status !== 'detected') {
        result.status = 'manual';
        console.log('[AeroFyta] No wallet address found in tip modal, falling back to manual');
      }

    } catch (err) {
      console.error('[AeroFyta] HTMX wallet extraction error:', err);
      result.status = 'manual';
    }

    return result;
  }

  /**
   * Parse an hx-vals JSON string to extract wallet addresses.
   * hx-vals can be JSON like: {"wallet": "0x...", "btc_address": "bc1..."}
   */
  function parseHxVals(hxValsStr) {
    if (!hxValsStr) return null;
    try {
      // hx-vals can be a JSON string or js: expression
      const cleaned = hxValsStr.replace(/^js:/, '').trim();
      const obj = JSON.parse(cleaned);
      const result = { evmAddress: null, btcAddress: null };

      // Search all values for wallet-like keys and addresses
      const evmKeys = ['wallet', 'address', 'evm_address', 'eth_address', 'recipient', 'to_address', 'wallet_address', 'crypto_address'];
      const btcKeys = ['btc_address', 'btc_wallet', 'bitcoin_address', 'btc'];

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value !== 'string') continue;
        const lk = key.toLowerCase();

        // Check for EVM address
        if (evmKeys.some(k => lk.includes(k)) && /^0x[a-fA-F0-9]{40}$/.test(value)) {
          result.evmAddress = value;
        }
        // Check for BTC address
        if (btcKeys.some(k => lk.includes(k)) || /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(value)) {
          result.btcAddress = value;
        }
        // Fallback: any value that looks like an EVM address
        if (!result.evmAddress && /^0x[a-fA-F0-9]{40}$/.test(value)) {
          result.evmAddress = value;
        }
      }

      return (result.evmAddress || result.btcAddress) ? result : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Run wallet extraction for the current creator and cache the result.
   * Updates currentCreator with wallet info.
   */
  async function detectAndCacheWallet(creator) {
    if (!creator || !creator.channel) return;

    const cacheKey = creator.channel || creator.name;

    // Check memory cache first
    if (walletCache[cacheKey]) {
      Object.assign(creator, walletCache[cacheKey]);
      return;
    }

    // Check chrome.storage.local cache
    try {
      const stored = await new Promise((resolve) => {
        chrome.storage.local.get(['walletCache'], (data) => {
          resolve(data.walletCache || {});
        });
      });
      if (stored[cacheKey] && stored[cacheKey].evmAddress) {
        creator.evmAddress = stored[cacheKey].evmAddress;
        creator.btcAddress = stored[cacheKey].btcAddress;
        creator.walletDetectionStatus = stored[cacheKey].walletDetectionStatus || 'detected';
        walletCache[cacheKey] = {
          evmAddress: creator.evmAddress,
          btcAddress: creator.btcAddress,
          walletDetectionStatus: creator.walletDetectionStatus
        };
        console.log('[AeroFyta] Wallet loaded from storage cache:', creator.evmAddress);
        return;
      }
    } catch (_) { /* storage access may fail */ }

    // Perform HTMX extraction
    const walletInfo = await extractWalletViaHTMX();
    creator.evmAddress = walletInfo.evmAddress;
    creator.btcAddress = walletInfo.btcAddress;
    creator.walletDetectionStatus = walletInfo.status;

    // Cache in memory
    walletCache[cacheKey] = {
      evmAddress: walletInfo.evmAddress,
      btcAddress: walletInfo.btcAddress,
      walletDetectionStatus: walletInfo.status
    };

    // Persist to chrome.storage.local
    if (walletInfo.evmAddress) {
      try {
        chrome.storage.local.get(['walletCache'], (data) => {
          const cache = data.walletCache || {};
          cache[cacheKey] = walletCache[cacheKey];
          chrome.storage.local.set({ walletCache: cache });
        });
      } catch (_) { /* ignore storage errors */ }
    }
  }

  /**
   * Format a wallet address for display: 0x1234...5678
   */
  function truncateAddress(addr) {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  // ─── Creator Detection ────────────────────────────────────────────

  function detectCreator() {
    const info = {
      name: null,
      channel: null,
      url: window.location.href,
      avatar: null,
      subscribers: null,
      isLive: false,
      pageType: 'unknown', // 'channel' | 'video' | 'live' | 'unknown'
      evmAddress: null,
      btcAddress: null,
      walletDetectionStatus: 'none' // 'detected' | 'manual' | 'none'
    };

    const path = window.location.pathname;

    // --- Channel page: rumble.com/c/ChannelName ---
    if (/^\/c\/[^/]+/.test(path)) {
      info.pageType = 'channel';
      // Channel name from URL slug
      const slug = path.split('/')[2];
      info.channel = '/c/' + slug;

      // Try to get display name from page heading
      const heading = document.querySelector(
        '.channel-header--title h1, .channel-header--title, .listing-header--title h1, .listing-header--title'
      );
      if (heading) {
        info.name = heading.textContent.trim();
      }
      // Fallback: use slug cleaned up
      if (!info.name) {
        info.name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      }

      // Subscriber count
      const subEl = document.querySelector(
        '.channel-header--subscribers, .listing-header--subscribers, [class*="subscriber"] span'
      );
      if (subEl) {
        info.subscribers = subEl.textContent.trim();
      }
    }

    // --- Video page: rumble.com/vXXXXXX-title.html or rumble.com/embed/... ---
    if (!info.name && /^\/(v[a-zA-Z0-9]+-|embed\/)/.test(path)) {
      info.pageType = 'video';

      // Primary: "media-by" author link (most reliable on Rumble video pages)
      const byLink = document.querySelector(
        '.media-by--a, a.media-heading-name, .media-heading-owner a'
      );
      if (byLink) {
        info.name = byLink.textContent.trim();
        info.channel = byLink.getAttribute('href') || '';
      }

      // Fallback: look in structured data
      if (!info.name) {
        const ldJson = document.querySelector('script[type="application/ld+json"]');
        if (ldJson) {
          try {
            const data = JSON.parse(ldJson.textContent);
            if (data.author && data.author.name) {
              info.name = data.author.name;
              info.channel = data.author.url || '';
            }
          } catch (_) { /* ignore parse errors */ }
        }
      }

      // Fallback: og:site_name or meta author
      if (!info.name) {
        const meta = document.querySelector('meta[name="author"]');
        if (meta && meta.content && meta.content !== 'Rumble') {
          info.name = meta.content.trim();
        }
      }

      // Subscriber count near channel info
      const subEl = document.querySelector(
        '.media-by-channel-subscribers, .media-heading-num-followers, [class*="subscriber"]'
      );
      if (subEl) {
        info.subscribers = subEl.textContent.trim();
      }
    }

    // --- Livestream detection ---
    const liveIndicators = document.querySelectorAll(
      '.video-item--live, .media-heading-live, [class*="live-indicator"], .watching-now, .live-badge'
    );
    if (liveIndicators.length > 0) {
      info.isLive = true;
      if (info.pageType === 'video') {
        info.pageType = 'live';
      }
    }
    // Also check if the page URL contains /live or has a live chat panel
    if (/\/live\b/.test(path) || document.querySelector('.chat-history--list, #chat-history-list')) {
      info.isLive = true;
      info.pageType = 'live';
    }

    // --- Avatar ---
    const avatarImg = document.querySelector(
      '.channel-header--thumb img, .media-by--a img, .listing-header--thumb img, .channel-header--image img'
    );
    if (avatarImg && avatarImg.src) {
      info.avatar = avatarImg.src;
    }

    // --- Final fallback: page title ---
    if (!info.name) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.content) {
        // Often "Video Title" or "Channel Name" — use as last resort
        info.name = ogTitle.content.split(' - ')[0].trim();
        if (info.name.length > 60) info.name = null; // too long, probably a video title
      }
    }

    if (info.name) {
      currentCreator = info;
      return info;
    }
    return null;
  }

  // ─── Floating Action Button (FAB) ────────────────────────────────

  function injectFAB() {
    if (document.getElementById(FAB_ID)) return;

    const fab = document.createElement('button');
    fab.id = FAB_ID;
    fab.className = 'aerofyta-fab';
    fab.setAttribute('aria-label', 'Tip with AeroFyta');
    fab.innerHTML = `
      <svg class="aerofyta-fab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.4 8.6L21.5 9.3L16.1 14L17.6 21L12 17.5L6.4 21L7.9 14L2.5 9.3L9.6 8.6L12 2Z" fill="currentColor"/>
      </svg>
      <span class="aerofyta-fab-label">Tip with AeroFyta</span>
    `;

    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleTipDialog();
    });

    document.body.appendChild(fab);
    fabInjected = true;

    // Pulse animation on first appearance
    setTimeout(() => fab.classList.add('aerofyta-fab--visible'), 100);
  }

  function removeFAB() {
    const fab = document.getElementById(FAB_ID);
    if (fab) fab.remove();
    fabInjected = false;
  }

  // ─── Tip Dialog ──────────────────────────────────────────────────

  function toggleTipDialog() {
    if (dialogOpen) {
      closeTipDialog();
    } else {
      openTipDialog();
    }
  }

  function openTipDialog() {
    if (document.getElementById(DIALOG_ID)) return;

    const creator = currentCreator;
    if (!creator) {
      showOverlay('Could not detect a creator on this page.');
      return;
    }

    dialogOpen = true;

    const liveTag = creator.isLive
      ? '<span class="aerofyta-dialog-live">LIVE</span>'
      : '';
    const subsTag = creator.subscribers
      ? `<span class="aerofyta-dialog-subs">${escapeHtml(creator.subscribers)}</span>`
      : '';
    const avatarLetter = (creator.name || '?')[0].toUpperCase();
    const avatarContent = creator.avatar
      ? `<img src="${escapeHtml(creator.avatar)}" alt="" class="aerofyta-dialog-avatar-img">`
      : `<span class="aerofyta-dialog-avatar-letter">${avatarLetter}</span>`;

    // Wallet status indicator
    const walletStatus = creator.walletDetectionStatus || 'none';
    const hasWallet = walletStatus === 'detected' && creator.evmAddress;
    const walletStatusIcon = hasWallet
      ? '<span class="aerofyta-wallet-status aerofyta-wallet-status--detected" title="Wallet detected">&#10003;</span>'
      : '<span class="aerofyta-wallet-status aerofyta-wallet-status--manual" title="Manual wallet entry needed">&#9888;</span>';
    const walletDisplay = hasWallet
      ? `<span class="aerofyta-wallet-address" title="${escapeHtml(creator.evmAddress)}">${truncateAddress(creator.evmAddress)}</span>`
      : '';

    // Manual address input (shown when wallet not auto-detected)
    const manualWalletSection = hasWallet ? '' : `
        <div class="aerofyta-dialog-wallet-manual">
          <label class="aerofyta-dialog-wallet-label">Recipient wallet address</label>
          <input type="text" class="aerofyta-dialog-input aerofyta-dialog-wallet-input" id="aerofyta-manual-wallet"
            placeholder="0x... (EVM address)" spellcheck="false" autocomplete="off">
          <span class="aerofyta-dialog-wallet-hint">Paste the creator's EVM wallet address</span>
        </div>`;

    const dialog = document.createElement('div');
    dialog.id = DIALOG_ID;
    dialog.className = 'aerofyta-dialog';
    dialog.innerHTML = `
      <div class="aerofyta-dialog-backdrop"></div>
      <div class="aerofyta-dialog-card">
        <div class="aerofyta-dialog-header">
          <span class="aerofyta-dialog-title">Tip Creator</span>
          <button class="aerofyta-dialog-close" aria-label="Close">&times;</button>
        </div>
        <div class="aerofyta-dialog-creator">
          <div class="aerofyta-dialog-avatar">${avatarContent}</div>
          <div class="aerofyta-dialog-creator-info">
            <span class="aerofyta-dialog-name">${escapeHtml(creator.name)}${liveTag}${walletStatusIcon}</span>
            <span class="aerofyta-dialog-channel">${escapeHtml(creator.channel || 'Rumble Creator')}${subsTag}${walletDisplay}</span>
          </div>
        </div>
        ${manualWalletSection}
        <div class="aerofyta-dialog-amounts">
          <button class="aerofyta-dialog-chip" data-amount="0.50">$0.50</button>
          <button class="aerofyta-dialog-chip" data-amount="1">$1</button>
          <button class="aerofyta-dialog-chip aerofyta-dialog-chip--selected" data-amount="2">$2</button>
          <button class="aerofyta-dialog-chip" data-amount="5">$5</button>
        </div>
        <div class="aerofyta-dialog-custom">
          <input type="number" class="aerofyta-dialog-input" id="aerofyta-custom-amount" placeholder="Custom USDT" min="0.01" step="0.01">
        </div>
        <button class="aerofyta-dialog-send" id="aerofyta-send-tip">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.4 8.6L21.5 9.3L16.1 14L17.6 21L12 17.5L6.4 21L7.9 14L2.5 9.3L9.6 8.6L12 2Z" fill="currentColor"/></svg>
          Send Tip — $2.00 USDT
        </button>
        <div class="aerofyta-dialog-footer">
          Powered by <strong>AeroFyta</strong> &middot; Tether WDK
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Animate in
    requestAnimationFrame(() => dialog.classList.add('aerofyta-dialog--open'));

    // Bind events
    dialog.querySelector('.aerofyta-dialog-close').addEventListener('click', closeTipDialog);
    dialog.querySelector('.aerofyta-dialog-backdrop').addEventListener('click', closeTipDialog);

    let selectedAmount = 2.00;

    const chips = dialog.querySelectorAll('.aerofyta-dialog-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('aerofyta-dialog-chip--selected'));
        chip.classList.add('aerofyta-dialog-chip--selected');
        selectedAmount = parseFloat(chip.dataset.amount);
        const customInput = dialog.querySelector('#aerofyta-custom-amount');
        customInput.value = '';
        updateSendLabel(selectedAmount);
      });
    });

    const customInput = dialog.querySelector('#aerofyta-custom-amount');
    customInput.addEventListener('input', () => {
      if (customInput.value) {
        chips.forEach((c) => c.classList.remove('aerofyta-dialog-chip--selected'));
        const val = parseFloat(customInput.value);
        if (val > 0) {
          selectedAmount = val;
          updateSendLabel(val);
        }
      }
    });

    const sendBtn = dialog.querySelector('#aerofyta-send-tip');
    sendBtn.addEventListener('click', () => {
      sendTipFromDialog(selectedAmount);
    });

    function updateSendLabel(amount) {
      sendBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.4 8.6L21.5 9.3L16.1 14L17.6 21L12 17.5L6.4 21L7.9 14L2.5 9.3L9.6 8.6L12 2Z" fill="currentColor"/></svg>
        Send Tip — $${amount.toFixed(2)} USDT
      `;
    }
  }

  function closeTipDialog() {
    const dialog = document.getElementById(DIALOG_ID);
    if (!dialog) return;
    dialog.classList.remove('aerofyta-dialog--open');
    setTimeout(() => {
      dialog.remove();
      dialogOpen = false;
    }, 250);
  }

  function sendTipFromDialog(amount) {
    const creator = currentCreator;
    if (!creator) return;

    // Determine recipient wallet: auto-detected or manually entered
    let recipientWallet = creator.evmAddress || null;
    const manualInput = document.querySelector('#aerofyta-manual-wallet');
    if (manualInput && manualInput.value.trim()) {
      const manualAddr = manualInput.value.trim();
      if (/^0x[a-fA-F0-9]{40}$/.test(manualAddr)) {
        recipientWallet = manualAddr;
      } else {
        showOverlay('Invalid EVM address. Must be 0x followed by 40 hex characters.');
        return;
      }
    }

    if (!recipientWallet) {
      showOverlay('No wallet address available. Please paste the creator\'s wallet address.');
      const walletInput = document.querySelector('#aerofyta-manual-wallet');
      if (walletInput) walletInput.focus();
      return;
    }

    const sendBtn = document.querySelector('#aerofyta-send-tip');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
    }

    chrome.runtime.sendMessage({
      type: 'TIP_CREATOR',
      payload: {
        creator: creator.name,
        channel: creator.channel,
        amount: amount,
        url: creator.url,
        platform: 'rumble',
        recipientWallet: recipientWallet,
        walletDetectionStatus: creator.walletDetectionStatus || 'manual',
        btcAddress: creator.btcAddress || null
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        showOverlay('Extension error. Is the AeroFyta agent running?');
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send Tip';
        }
        return;
      }
      if (response && response.success) {
        closeTipDialog();
        showOverlay(`Tipped ${creator.name} $${response.amount.toFixed(2)} USDT!`, true);
      } else {
        showOverlay(response?.error || 'Tip failed. Check agent connection.');
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Retry';
        }
      }
    });
  }

  // ─── Overlay Notification ────────────────────────────────────────

  function showOverlay(message, success = false) {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'aerofyta-overlay ' + (success ? 'aerofyta-overlay--success' : 'aerofyta-overlay--error');
    overlay.innerHTML = `
      <div class="aerofyta-overlay-icon">${success ? '&#10003;' : '&#9888;'}</div>
      <div class="aerofyta-overlay-text">${escapeHtml(message)}</div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('aerofyta-overlay--show'));
    setTimeout(() => {
      overlay.classList.remove('aerofyta-overlay--show');
      setTimeout(() => overlay.remove(), 350);
    }, 3500);
  }

  // ─── Event-Triggered Tip System ─────────────────────────────
  // 6 event types: watch_time, chat_hype, viewer_spike, follower_milestone, subscriber, manual

  const EVENT_DEFAULTS = {
    watch_time: { enabled: true, minutes: 5 },
    chat_hype: { enabled: true, threshold: 70 },
    viewer_spike: { enabled: true, spikePercent: 20 },
    follower_milestone: { enabled: true },
    subscriber: { enabled: true },
    manual: { enabled: true }
  };

  let eventConfig = { ...EVENT_DEFAULTS };
  let hypeScore = 0;
  let chatMessageBatch = [];
  let chatAnalysisInterval = null;
  let watchTimeStart = null;
  let watchTimeTipSent = false;
  let lastViewerCount = null;
  let viewerSpikeTipSent = false;
  let lastFollowerCount = null;
  let followerMilestoneLast = 0;
  let subscribeTipSent = false;
  let eventHistory = [];
  let chatObserverActive = false;

  // Load event config from storage
  function loadEventConfig() {
    chrome.storage.local.get(['eventConfig'], (result) => {
      if (result.eventConfig) {
        eventConfig = { ...EVENT_DEFAULTS, ...result.eventConfig };
      }
    });
  }
  loadEventConfig();

  // Listen for config updates from popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.eventConfig) {
      eventConfig = { ...EVENT_DEFAULTS, ...changes.eventConfig.newValue };
    }
  });

  // ─── Hype Score NLP Analysis ──────────────────────────────────

  const HYPE_KEYWORDS = [
    'amazing', 'based', 'fire', 'goat', 'insane', 'epic', 'w ', ' w',
    'lets go', "let's go", 'hype', 'pog', 'poggers', 'clutch', 'god',
    'legendary', 'incredible', 'crazy', 'wild', 'banger', 'massive',
    'huge', 'king', 'queen', 'lit', 'gg', 'dub', 'peak', 'cracked'
  ];

  const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu;

  function analyzeHypeBatch(messages) {
    if (messages.length === 0) return 0;

    const now = Date.now();
    const recentMessages = messages.filter((m) => now - m.time < 60000);

    // Signal 1: Chat velocity (messages per minute) — weight 0.35
    const velocity = recentMessages.length;
    const velocityScore = Math.min(100, (velocity / 40) * 100);

    // Signal 2: Keyword hits — weight 0.25
    let keywordHits = 0;
    for (const msg of recentMessages) {
      const lower = msg.text.toLowerCase();
      for (const kw of HYPE_KEYWORDS) {
        if (lower.includes(kw)) { keywordHits++; break; }
      }
    }
    const keywordRatio = recentMessages.length > 0 ? keywordHits / recentMessages.length : 0;
    const keywordScore = Math.min(100, keywordRatio * 150);

    // Signal 3: Emoji density — weight 0.20
    let totalChars = 0;
    let emojiChars = 0;
    for (const msg of recentMessages) {
      totalChars += msg.text.length;
      const emojiMatches = msg.text.match(EMOJI_REGEX);
      if (emojiMatches) emojiChars += emojiMatches.length;
    }
    const emojiRatio = totalChars > 0 ? emojiChars / totalChars : 0;
    const emojiScore = Math.min(100, emojiRatio * 500);

    // Signal 4: Caps ratio — weight 0.20
    let capsWords = 0;
    let totalWords = 0;
    for (const msg of recentMessages) {
      const words = msg.text.split(/\s+/).filter((w) => w.length > 1);
      totalWords += words.length;
      capsWords += words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w)).length;
    }
    const capsRatio = totalWords > 0 ? capsWords / totalWords : 0;
    const capsScore = Math.min(100, capsRatio * 200);

    // Weighted sum
    const score = Math.round(
      velocityScore * 0.35 +
      keywordScore * 0.25 +
      emojiScore * 0.20 +
      capsScore * 0.20
    );

    return Math.min(100, Math.max(0, score));
  }

  // ─── Hype Indicator Bar (injected into page) ─────────────────

  const HYPE_BAR_ID = 'aerofyta-hype-bar';

  function injectHypeBar() {
    if (document.getElementById(HYPE_BAR_ID)) return;
    const bar = document.createElement('div');
    bar.id = HYPE_BAR_ID;
    bar.className = 'aerofyta-hype-bar';
    bar.innerHTML = `
      <div class="aerofyta-hype-bar-label">HYPE</div>
      <div class="aerofyta-hype-bar-track">
        <div class="aerofyta-hype-bar-fill" style="width: 0%"></div>
      </div>
      <div class="aerofyta-hype-bar-score">0</div>
    `;
    document.body.appendChild(bar);
  }

  function updateHypeBar(score) {
    const bar = document.getElementById(HYPE_BAR_ID);
    if (!bar) return;
    const fill = bar.querySelector('.aerofyta-hype-bar-fill');
    const scoreEl = bar.querySelector('.aerofyta-hype-bar-score');
    if (fill) {
      fill.style.width = score + '%';
      if (score < 40) {
        fill.style.background = '#22c55e';
      } else if (score < 70) {
        fill.style.background = 'linear-gradient(90deg, #22c55e, #eab308)';
      } else {
        fill.style.background = 'linear-gradient(90deg, #eab308, #ef4444)';
      }
    }
    if (scoreEl) scoreEl.textContent = score;
    bar.style.display = chatObserverActive ? 'flex' : 'none';
  }

  function removeHypeBar() {
    const bar = document.getElementById(HYPE_BAR_ID);
    if (bar) bar.remove();
  }

  // ─── Event Toast Notifications ────────────────────────────────

  let toastQueue = [];
  let toastShowing = false;

  function showEventToast(eventType, message, multiplier) {
    toastQueue.push({ eventType, message, multiplier });
    if (!toastShowing) processToastQueue();
  }

  function processToastQueue() {
    if (toastQueue.length === 0) { toastShowing = false; return; }
    toastShowing = true;
    const { eventType, message, multiplier } = toastQueue.shift();

    const ICONS = {
      watch_time: '\u23F1',
      chat_hype: '\uD83D\uDD25',
      viewer_spike: '\uD83D\uDCC8',
      follower_milestone: '\uD83C\uDFC6',
      subscriber: '\u2B50',
      manual: '\uD83D\uDCB0'
    };

    let toast = document.getElementById('aerofyta-event-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'aerofyta-event-toast';
    toast.className = 'aerofyta-event-toast';
    toast.innerHTML = `
      <div class="aerofyta-event-toast-icon">${ICONS[eventType] || '\u26A1'}</div>
      <div class="aerofyta-event-toast-body">
        <div class="aerofyta-event-toast-title">${escapeHtml(eventType.replace(/_/g, ' ').toUpperCase())}</div>
        <div class="aerofyta-event-toast-msg">${escapeHtml(message)}</div>
        ${multiplier ? `<div class="aerofyta-event-toast-mult">${multiplier}x Tip Multiplier</div>` : ''}
      </div>
      <button class="aerofyta-event-toast-tip" data-event="${eventType}" data-mult="${multiplier || 1}">Tip Now</button>
      <button class="aerofyta-event-toast-dismiss">&times;</button>
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('aerofyta-event-toast--show'));

    toast.querySelector('.aerofyta-event-toast-tip').addEventListener('click', (e) => {
      const mult = parseFloat(e.target.dataset.mult) || 1;
      // Record manual event trigger, then open dialog
      recordEvent('manual', 'Tip triggered from ' + eventType + ' event toast');
      openTipDialog();
      dismissEventToast(toast);
    });

    toast.querySelector('.aerofyta-event-toast-dismiss').addEventListener('click', () => {
      dismissEventToast(toast);
    });

    setTimeout(() => dismissEventToast(toast), 8000);
  }

  function dismissEventToast(toast) {
    if (!toast || !toast.parentNode) { toastShowing = false; processToastQueue(); return; }
    toast.classList.remove('aerofyta-event-toast--show');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
      processToastQueue();
    }, 350);
  }

  // Record event
  function recordEvent(eventType, detail) {
    const entry = { type: eventType, detail, timestamp: Date.now() };
    eventHistory.push(entry);
    if (eventHistory.length > 50) eventHistory.shift();
    chrome.runtime.sendMessage({
      type: 'EVENT_TRIGGERED',
      payload: entry
    }).catch(() => {});
    chrome.storage.local.set({ eventHistory: eventHistory.slice(-20) });
  }

  // ─── Event Type 1: Watch Time Tips ────────────────────────────

  function startWatchTimeTracker() {
    if (watchTimeStart) return;
    watchTimeStart = Date.now();
    watchTimeTipSent = false;
    setInterval(() => {
      if (!eventConfig.watch_time.enabled || watchTimeTipSent || !currentCreator) return;
      const elapsed = (Date.now() - watchTimeStart) / 60000;
      const threshold = eventConfig.watch_time.minutes || 5;
      if (elapsed >= threshold) {
        watchTimeTipSent = true;
        recordEvent('watch_time', 'Watched for ' + Math.round(elapsed) + ' minutes');
        showEventToast('watch_time',
          'You have been watching ' + (currentCreator.name || 'this creator') + ' for ' + Math.round(elapsed) + ' min. Show your appreciation!',
          null);
      }
    }, 15000);
  }

  // ─── Event Type 2: Chat Hype Tips ─────────────────────────────

  function startHypeAnalysis() {
    if (chatAnalysisInterval) return;
    chatAnalysisInterval = setInterval(() => {
      const newScore = analyzeHypeBatch(chatMessageBatch);
      const prevScore = hypeScore;
      hypeScore = newScore;
      updateHypeBar(hypeScore);

      chrome.runtime.sendMessage({
        type: 'HYPE_SCORE_UPDATE',
        payload: { score: hypeScore }
      }).catch(() => {});

      if (eventConfig.chat_hype.enabled && currentCreator) {
        const threshold = eventConfig.chat_hype.threshold || 70;
        if (newScore >= threshold && prevScore < threshold) {
          const multiplier = newScore >= 90 ? 2.5 : newScore >= 80 ? 2.0 : 1.5;
          recordEvent('chat_hype', 'Hype score hit ' + newScore + ' (' + multiplier + 'x multiplier)');
          showEventToast('chat_hype',
            'Chat is going crazy for ' + (currentCreator.name || 'the creator') + '! Hype score: ' + newScore + '/100',
            multiplier);
        }
      }
    }, 4000);
  }

  // ─── Event Type 3: Viewer Spike Tips ──────────────────────────

  function pollViewerCount() {
    setInterval(() => {
      if (!eventConfig.viewer_spike.enabled || !currentCreator) return;
      const viewerEl = document.querySelector(
        '.watching-now, .media-heading-watching, [class*="watching"] span, [class*="viewer-count"]'
      );
      if (!viewerEl) return;
      const text = viewerEl.textContent.replace(/[^\d]/g, '');
      const count = parseInt(text, 10);
      if (isNaN(count) || count <= 0) return;

      if (lastViewerCount !== null && !viewerSpikeTipSent) {
        const spikePercent = eventConfig.viewer_spike.spikePercent || 20;
        const increase = ((count - lastViewerCount) / lastViewerCount) * 100;
        if (increase >= spikePercent) {
          viewerSpikeTipSent = true;
          recordEvent('viewer_spike', 'Viewers jumped from ' + lastViewerCount + ' to ' + count + ' (+' + Math.round(increase) + '%)');
          showEventToast('viewer_spike',
            'Viewer spike detected! ' + lastViewerCount + ' -> ' + count + ' viewers (+' + Math.round(increase) + '%)',
            1.5);
          setTimeout(() => { viewerSpikeTipSent = false; }, 120000);
        }
      }
      lastViewerCount = count;
    }, 10000);
  }

  // ─── Event Type 4: Follower Milestone Tips ────────────────────

  const MILESTONES = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

  function pollFollowerCount() {
    setInterval(() => {
      if (!eventConfig.follower_milestone.enabled || !currentCreator) return;
      const subEl = document.querySelector(
        '.channel-header--subscribers, .listing-header--subscribers, .media-by-channel-subscribers, .media-heading-num-followers, [class*="subscriber"] span'
      );
      if (!subEl) return;
      const rawText = subEl.textContent.replace(/[^\d.KkMm]/g, '');
      let count = 0;
      if (/[Kk]/.test(rawText)) {
        count = parseFloat(rawText) * 1000;
      } else if (/[Mm]/.test(rawText)) {
        count = parseFloat(rawText) * 1000000;
      } else {
        count = parseInt(rawText.replace(/\D/g, ''), 10);
      }
      if (isNaN(count) || count <= 0) return;

      if (lastFollowerCount !== null) {
        for (const milestone of MILESTONES) {
          if (count >= milestone && lastFollowerCount < milestone && milestone > followerMilestoneLast) {
            followerMilestoneLast = milestone;
            const label = milestone >= 1000000 ? (milestone / 1000000) + 'M' :
                          milestone >= 1000 ? (milestone / 1000) + 'K' : milestone;
            recordEvent('follower_milestone', currentCreator.name + ' hit ' + label + ' followers!');
            showEventToast('follower_milestone',
              (currentCreator.name || 'This creator') + ' just hit ' + label + ' followers! Celebrate with a tip!',
              2.0);
            break;
          }
        }
      }
      lastFollowerCount = count;
    }, 15000);
  }

  // ─── Event Type 5: Subscriber Events ──────────────────────────

  function watchSubscribeButton() {
    const followBtnSelectors = [
      '.subscribe-button', '.follow-button', '.channel-follow',
      'button[class*="follow"]', 'button[class*="subscribe"]',
      '.media-by-channel-subscribe', '.rumbles-vote-pill'
    ];

    let followBtn = null;
    for (const sel of followBtnSelectors) {
      followBtn = document.querySelector(sel);
      if (followBtn) break;
    }
    if (!followBtn) return;

    const subObserver = new MutationObserver(() => {
      if (!eventConfig.subscriber.enabled || subscribeTipSent || !currentCreator) return;
      const text = followBtn.textContent.toLowerCase();
      if (text.includes('following') || text.includes('subscribed') || text.includes('unfollow')) {
        subscribeTipSent = true;
        recordEvent('subscriber', 'You subscribed to ' + currentCreator.name);
        showEventToast('subscriber',
          'You just followed ' + (currentCreator.name || 'this creator') + '! Send a tip to say hello!',
          1.5);
      }
    });

    subObserver.observe(followBtn, { childList: true, subtree: true, characterData: true, attributes: true });
  }

  // ─── Chat Observer (enhanced with hype batch collection) ──────

  function observeChat() {
    if (chatObserverActive) return;

    const chatSelectors = [
      '.chat-history--list',
      '#chat-history-list',
      '.chat--messages',
      '[class*="chat-history"]'
    ];

    let chatContainer = null;
    for (const sel of chatSelectors) {
      chatContainer = document.querySelector(sel);
      if (chatContainer) break;
    }
    if (!chatContainer) return;

    chatObserverActive = true;
    injectHypeBar();
    startHypeAnalysis();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const text = node.textContent || '';
          if (!text.trim()) continue;

          // Add to hype analysis batch
          chatMessageBatch.push({ text, time: Date.now() });
          const cutoff = Date.now() - 60000;
          chatMessageBatch = chatMessageBatch.filter((m) => m.time >= cutoff);

          // Legacy engagement detection
          const signals = ['tip', 'donate', 'support', 'love this', 'great content', 'amazing'];
          const hasSignal = signals.some((s) => text.toLowerCase().includes(s));
          if (hasSignal) {
            chrome.runtime.sendMessage({
              type: 'CHAT_ENGAGEMENT',
              payload: {
                message: text.slice(0, 200),
                creator: currentCreator?.name || 'Unknown',
                url: window.location.href,
                timestamp: Date.now()
              }
            });
          }
        }
      }
    });

    observer.observe(chatContainer, { childList: true, subtree: true });
  }

  // ─── Message Listener ────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_CREATOR') {
      const creator = detectCreator();
      sendResponse({ creator });
      return true;
    }
    if (msg.type === 'GET_CREATOR_WITH_WALLET') {
      (async () => {
        const creator = detectCreator();
        if (creator) {
          await detectAndCacheWallet(creator);
        }
        sendResponse({ creator });
      })();
      return true;
    }
    if (msg.type === 'GET_HYPE_SCORE') {
      sendResponse({ score: hypeScore, chatActive: chatObserverActive });
      return true;
    }
    if (msg.type === 'GET_EVENT_HISTORY') {
      sendResponse({ events: eventHistory.slice(-20) });
      return true;
    }
    if (msg.type === 'PING') {
      sendResponse({ pong: true, creator: currentCreator });
      return true;
    }
  });

  // ─── Utils ───────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  // ─── Initialization ──────────────────────────────────────────────

  function init() {
    detectCreator();

    if (currentCreator) {
      injectFAB();
      detectAndCacheWallet(currentCreator).then(() => {
        console.log('[AeroFyta] Initial wallet detection complete:',
          currentCreator.walletDetectionStatus, currentCreator.evmAddress || 'none');
      });
    }

    // Start all event monitors
    startWatchTimeTracker();
    pollViewerCount();
    pollFollowerCount();
    watchSubscribeButton();

    // Poll for dynamic page loads (Rumble uses some client-side nav)
    setInterval(() => {
      const prevCreator = currentCreator ? currentCreator.name : null;
      detectCreator();
      if (currentCreator && !fabInjected) {
        injectFAB();
      } else if (!currentCreator && fabInjected) {
        removeFAB();
      }
      if (currentCreator && currentCreator.name !== prevCreator && !currentCreator.evmAddress) {
        detectAndCacheWallet(currentCreator);
      }
      observeChat();
    }, POLL_INTERVAL);

    // Watch for SPA navigation (URL changes)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        fabInjected = false;
        currentCreator = null;
        chatObserverActive = false;
        watchTimeTipSent = false;
        watchTimeStart = Date.now();
        viewerSpikeTipSent = false;
        lastViewerCount = null;
        subscribeTipSent = false;
        if (chatAnalysisInterval) { clearInterval(chatAnalysisInterval); chatAnalysisInterval = null; }
        chatMessageBatch = [];
        hypeScore = 0;
        removeHypeBar();
        const oldFab = document.getElementById(FAB_ID);
        if (oldFab) oldFab.remove();
        const oldDialog = document.getElementById(DIALOG_ID);
        if (oldDialog) oldDialog.remove();
        dialogOpen = false;

        setTimeout(async () => {
          detectCreator();
          if (currentCreator) {
            injectFAB();
            await detectAndCacheWallet(currentCreator);
            console.log('[AeroFyta] SPA nav wallet detection:',
              currentCreator.walletDetectionStatus, currentCreator.evmAddress || 'none');
          }
          watchSubscribeButton();
        }, 800);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
