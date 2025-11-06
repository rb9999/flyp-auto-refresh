## Project Overview

This is a Chrome Manifest V3 extension that automatically refreshes the Flyp Reseller Tools orders page at configurable intervals and optionally sends Discord notifications when sales occur.

**Target URL:** `https://tools.joinflyp.com/orders`

## Architecture

The extension follows the standard Chrome Extension Manifest V3 architecture with three main components:

### 1. Background Service Worker ([background.js](background.js))
- Minimal service worker that initializes default settings on installation
- Listens for messages from content script (currently just logging refresh events)
- Sets default values: `enabled: true`, `intervalMinutes: 30`

### 2. Content Script ([content.js](content.js))
The main logic runs here. Injected into all `tools.joinflyp.com` pages. Key responsibilities:

- **Auto-refresh mechanism**: Uses `setInterval` to periodically click the refresh button
- **Button finding strategy**: Multi-layered approach to locate the Ant Design refresh button:
  1. Look for button with `.anticon-redo` icon + "Refresh" text
  2. Look for any button with exact "Refresh" text
  3. Look for button containing "refresh" in text
- **Notification monitoring**: Uses `MutationObserver` to watch for sale notification popups (`.new-sales-floating-container__inner`)
- **Discord integration**: Extracts sale data from notifications and sends formatted embeds to Discord webhook
- **Message handling**: Responds to actions from popup: `updateSettings`, `manualRefresh`, `getStatus`, `getCountdown`

### 3. Popup UI ([popup.html](popup.html) + [popup.js](popup.js))
- Settings interface with toggle, interval input, and Discord webhook URL field
- Countdown timer showing time until next refresh
- Manual refresh button
- Communicates with content script via `chrome.tabs.sendMessage`

## Key Implementation Details

### Refresh Button Detection
The extension targets Ant Design UI buttons. If Flyp updates their UI, the button detection logic in [content.js:11-54](content.js#L11-L54) may need adjustment.

### Sale Notification Detection
- Watches for DOM mutations adding `.new-sales-floating-container__inner` elements
- Waits 500ms after notification appears before extracting data (ensures error messages have loaded)
- Extracts data from notification structure:
  - Item name from `.ant-typography-ellipsis`
  - Price from text matching `Price: $X` pattern
  - Marketplace from image alt attributes or "Sold on" text
  - Status from `.ant-tag-success`
  - Image from `.ant-image img`
  - Error messages from `.ant-alert-error .ant-alert-message` (e.g., "Facebook unable to delist: A server error field_exception occured")
- Maintains `processedNotifications` Set to prevent duplicate Discord messages (keeps last 50)
- Duplicate detection uses: item name + price + timestamp (rounded to 10-second intervals)
  - Prevents true duplicates while allowing same item to sell multiple times

### State Management
- Settings stored in `chrome.storage.sync`: `enabled`, `intervalMinutes`, `webhookUrl`
- Content script maintains local state: `autoRefreshInterval`, `nextRefreshTime`, `notificationObserver`
- Countdown timer calculated from `nextRefreshTime` and updated every second in popup

### Discord Webhooks
- Validates webhook URL must start with `https://discord.com/api/webhooks/`
- Sends rich embeds with sale data
- If error message is present, adds a warning field and changes embed color to orange (16744192)
- Error handling for failed webhook requests (logs to console)

## Development Commands

This is a Chrome extension loaded as an unpacked extension. No build process required.

### Loading the Extension
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

### Reloading After Changes
- **After changing background.js or manifest.json**: Click the refresh icon on the extension card in `chrome://extensions/`
- **After changing content.js**: Reload the Flyp orders page
- **After changing popup files**: Close and reopen the popup

### Debugging
- **Content script**: Open DevTools (F12) on the Flyp orders page, check Console tab
- **Background script**: Click "service worker" link on extension card in `chrome://extensions/`
- **Popup**: Right-click popup → "Inspect"
- **Button detection debugging**: Run [debug-find-button.js](debug-find-button.js) in the browser console on the Flyp page

## Files Reference

- [manifest.json](manifest.json) - Extension configuration (permissions, content scripts, etc.)
- [background.js](background.js) - Background service worker
- [content.js](content.js) - Main extension logic (auto-refresh, notification monitoring)
- [popup.html](popup.html) - Popup UI structure and styles
- [popup.js](popup.js) - Popup logic and settings management
- [debug-find-button.js](debug-find-button.js) - Debug utility to identify refresh button selectors
- [README.md](README.md) - User-facing installation and usage instructions

## Common Modifications

### Changing Refresh Button Selector
If Flyp changes their button structure, modify the detection logic in [content.js:11-54](content.js#L11-L54).

### Adjusting Notification Detection
If notification popup structure changes, update:
- MutationObserver target in [content.js:279-339](content.js#L279-L339)
- Data extraction logic in [content.js:168-268](content.js#L168-L268)

### Modifying Discord Message Format
Edit the embed structure in [content.js:87-165](content.js#L87-L165).

## Extension Permissions

- `activeTab` - Access active tab for manual refresh
- `storage` - Store user settings
- `host_permissions: https://tools.joinflyp.com/*` - Required for content script injection
