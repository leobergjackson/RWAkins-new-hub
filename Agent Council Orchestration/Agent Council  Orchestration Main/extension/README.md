# AeroFyta Chrome Extension

Browser extension for autonomous creator tipping on Rumble using Tether WDK.

## Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` directory from this repository
5. The AeroFyta icon will appear in your toolbar

## How It Works

### Popup
Click the AeroFyta icon in the toolbar to open the popup dashboard:
- View agent connection status (green = connected, red = disconnected)
- See your wallet balance in USDT
- Choose quick-tip amounts ($0.50, $1.00, $2.00, $5.00) or enter a custom amount
- View your 4 most recent tips
- Configure the agent API URL and default tip settings

### Content Script (Rumble.com)
When you visit a Rumble video or channel page, the extension:
- Detects the creator's name and channel
- Injects a **"Tip with AeroFyta"** button near the subscribe area
- Clicking the button sends a tip through the AeroFyta agent backend
- Monitors livestream chat for engagement signals (mentions of tips, donations, etc.)

### Background Service Worker
- Routes messages between the popup and content script
- Makes API calls to the AeroFyta agent backend
- Stores tip history in `chrome.storage.local`
- Periodically checks agent status and updates the toolbar badge

## Agent API

The extension communicates with the AeroFyta agent backend (default: `http://localhost:3001`).

### Endpoints Used

| Endpoint | Method | Description |
|---|---|---|
| `/api/status` | GET | Check agent status, balance, wallet address |
| `/api/tip` | POST | Send a tip to a creator |
| `/api/engagement` | POST | Report chat engagement signals |

### Tip Request Body

```json
{
  "creator": "ChannelName",
  "channel": "/c/ChannelName",
  "amount": 5.00,
  "platform": "rumble",
  "url": "https://rumble.com/v..."
}
```

## Configuration

Open the extension popup and expand **Settings**:

| Setting | Default | Description |
|---|---|---|
| Agent API URL | `http://localhost:3001` | Backend agent endpoint |
| Default Tip | `5.00` USDT | Default tip amount |
| Auto-detect | On | Automatically detect creators on Rumble |

## Permissions

- **activeTab** — Access the current tab to detect creators
- **storage** — Store tip history and settings locally
- **Host permission** — `https://rumble.com/*` for content script injection

## Screenshots

> Screenshots will be added after final UI polish.

## Development

No build step required. Edit files directly and reload the extension:
1. Make changes to any `.js`, `.css`, or `.html` file
2. Go to `chrome://extensions`
3. Click the reload icon on the AeroFyta extension card

## License

Apache 2.0 — See [LICENSE](../LICENSE) in the project root.
