# Flyp Orders Auto Refresh Chrome Extension

**Version 1.0** - Public Release

A secure, memory-efficient Chrome extension that automatically refreshes the Flyp Reseller Tools orders page and sends Discord notifications when you make sales.

NOTE: This plugin is in no way affiliated or endorsed by FLYP. It was initially written by me for me. It works at the time of release but due to changes Flyp may make to their app, things may discontinue working. I will continue to work on this and update the app. It has built in checking for updated versions.

---

## ✨ Features

### Core Functionality
- 🔄 **Automatic Page Refresh** - Keeps your orders page up-to-date at configurable intervals (10-1440 minutes)
- 🎯 **Smart Button Detection** - Multiple strategies to reliably find and click the Flyp refresh button
- ⏱️ **Countdown Timer** - Visual countdown showing time until next refresh
- 🔘 **Manual Refresh** - Instant refresh button in the popup
- 🎛️ **Easy Toggle** - Enable/disable auto-refresh with one click

### Discord Notifications
- 💬 **Real-Time Sale Alerts** - Get notified in Discord instantly when sales occur
- 📊 **Detailed Sale Information** - Item name, price, marketplace, status, and image
- ⚠️ **Error Reporting** - Alerts you to delisting errors (Facebook, eBay issues, etc.)
- 🔔 **Off-Page Warnings** - Notifies you if you navigate away from the orders page
- 🛡️ **Content Sanitization** - All data is sanitized before sending to prevent injection attacks

### Advanced Features
- 🔍 **Dual Detection System** - MutationObserver + backup polling ensures no sales are missed
- 📦 **ReactVirtualized Support** - Handles dynamically rendered sale lists
- 🚫 **Duplicate Prevention** - Smart tracking prevents duplicate notifications
- 💾 **Persistent Settings** - Your preferences sync across Chrome instances
- 🔐 **Security Hardened** - Content Security Policy, URL validation, webhook verification
- 💡 **Update Checker** - Automatically checks for new versions

---

## 🚀 Installation Instructions

### Step 1: Enable Developer Mode in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **"Developer mode"** to **ON** (top right corner)

### Step 2: Load the Extension

1. Click the **"Load unpacked"** button
2. Navigate to and select the `flyp-auto-refresh` folder
3. The extension should now appear in your extensions list with version **1.0**

### Step 3: Pin the Extension (Recommended)

1. Click the puzzle piece icon (🧩) in Chrome's toolbar
2. Find "Flyp Orders Auto Refresh" in the list
3. Click the pin icon (📌) to keep it visible in your toolbar

---

## 📖 How to Use

### Basic Usage

1. Navigate to `https://tools.joinflyp.com/orders`
2. The extension automatically starts refreshing at your configured interval (default: 30 minutes)
3. Click the extension icon to view countdown timer and adjust settings

### Configure Settings

Click the extension icon to access:

- **Auto-refresh enabled** - Toggle automatic refreshing on/off
- **Refresh interval** - Set minutes between refreshes (10-1440)
- **Discord Webhook URL** - Optional: Get sale notifications in Discord
- **Save Settings** - Apply changes immediately
- **Refresh Now** - Manually trigger a refresh
- **About (...)** - View extension information and links

---

## 🎮 Discord Notifications Setup

### Creating a Discord Webhook

1. **Open Discord** and go to your server
2. **Select or create a channel** for notifications (e.g., #flyp-sales)
3. **Right-click the channel** → "Edit Channel"
4. Navigate to **"Integrations"** → **"Webhooks"**
5. Click **"New Webhook"** or **"Create Webhook"**
6. **Customize** the webhook name (e.g., "Flyp Sales Bot")
7. **Copy the Webhook URL** (starts with `https://discord.com/api/webhooks/`)

### Adding Webhook to Extension

1. Click the extension icon in Chrome toolbar
2. Paste the webhook URL into the **"Discord Webhook URL"** field
3. Click **"Save Settings"**
4. Keep the Flyp orders tab open and active

### What You'll Receive

When a sale occurs on Flyp, you'll get a Discord message containing:

- 🎉 **Item Name** - What sold
- 💰 **Sale Price** - How much you made
- 🏪 **Marketplace** - Where it sold (eBay, Mercari, Poshmark, etc.)
- ✅ **Status** - Sale status (Sold, Delisted, etc.)
- 🖼️ **Item Image** - Thumbnail of the item
- ⚠️ **Error Messages** - If there were delisting issues (Facebook errors, etc.)
- 🕐 **Timestamp** - When the sale occurred

**Special Notifications:**
- You'll be alerted if you navigate away from the orders page while auto-refresh is enabled

---

## 🔒 Security & Privacy

### Security Features

- ✅ **Webhook URL Validation** - Prevents data exfiltration by validating Discord URLs
- ✅ **Content Sanitization** - All sale data is sanitized before sending to Discord
- ✅ **URL Security** - Proper URL parsing prevents subdomain attacks
- ✅ **Content Security Policy** - Strict CSP protects against injection attacks
- ✅ **No Sensitive Logging** - Sale data and webhook URLs not exposed in console logs

### Privacy Guarantees

This extension:
- ✅ Only runs on `tools.joinflyp.com` pages
- ✅ Does not collect or store personal data
- ✅ Only sends data to Discord if you configure a webhook URL
- ✅ Stores preferences locally in Chrome sync storage
- ✅ Does not communicate with any third-party servers (except optional Discord and GitHub for updates)
- ✅ Open source - you can review all code

### Permissions Explained

- **activeTab** - Access the current tab to click the refresh button
- **storage** - Store your settings (interval, webhook URL, etc.)
- **tools.joinflyp.com** - Required to run the extension on Flyp orders page
- **api.github.com** - Check for extension updates (optional feature)

---

## 🛠️ Technical Details

### Architecture

- **Manifest V3** - Latest Chrome extension platform
- **Background Service Worker** - Lightweight initialization
- **Content Script** - Main logic injected into Flyp orders page
- **Popup UI** - Settings interface with about modal

### Performance Optimizations

- **Memory Leak Prevention** - All timeouts and intervals properly tracked and cleaned
- **LRU Cache** - Notification tracking limited to 50 most recent entries
- **Smart Cleanup** - Resources released on page unload
- **Efficient Observation** - MutationObserver with backup polling strategy

### Button Detection Strategy

The extension uses a multi-layered approach to find the refresh button:

1. **Primary**: Look for Ant Design button with `.anticon-redo` icon + "Refresh" text
2. **Secondary**: Look for any button with exact "Refresh" text
3. **Fallback**: Look for button containing "refresh" in text (case-insensitive)

---

## 🐛 Troubleshooting

### Extension Not Working?

1. ✅ Verify you're on `https://tools.joinflyp.com/orders`
2. ✅ Check extension is enabled in `chrome://extensions/`
3. ✅ Reload the Flyp orders page (F5)
4. ✅ Open DevTools (F12) and check Console for errors

### Refresh Button Not Found?

- The extension looks for buttons with "Refresh" text
- If Flyp updates their UI, the button detection may need adjustment
- Check the console for "Available buttons with text" debug log

### Discord Notifications Not Arriving?

1. ✅ Verify webhook URL starts with `https://discord.com/api/webhooks/`
2. ✅ Test webhook with Discord's webhook tester
3. ✅ Check you're on the orders page with the tab active
4. ✅ Ensure notifications are appearing in Flyp (extension can't detect what doesn't appear)
5. ✅ Check console for "Invalid webhook URL" errors

### Settings Not Saving?

1. ✅ Ensure Chrome sync is enabled
2. ✅ Check `chrome://extensions/` shows no errors
3. ✅ Try disabling and re-enabling the extension

### Countdown Timer Not Resetting?

1. ✅ Ensure you have a Flyp orders tab open when changing settings
2. ✅ Wait a moment after clicking Save for the countdown to update
3. ✅ Reload the extension if the issue persists

---

## 📋 Version History

### v1.0 (January 2025) - Public Release

**Core Features:**
- Automatic page refresh with configurable intervals (10-1440 minutes)
- Visual countdown timer
- Manual refresh button
- Toggle to enable/disable auto-refresh

**Discord Integration:**
- Real-time sale notifications with rich embeds
- Detailed sale information (name, price, marketplace, status, image)
- Error message reporting for delisting issues
- "Not on Orders Page" warnings
- Duplicate notification prevention

**Security & Privacy:**
- Webhook URL validation to prevent data exfiltration
- Content sanitization for Discord embeds
- Content Security Policy (CSP) protection
- Proper URL validation to prevent attacks
- No sensitive data logging

**Performance & Stability:**
- Memory leak prevention (proper cleanup of timeouts/intervals)
- LRU cache for notification tracking (50 entries max)
- MutationObserver with backup polling strategy
- ReactVirtualized support for dynamic content
- Error handling for Chrome storage failures
- Settings update race condition prevention

**User Interface:**
- About modal with project information and links
- Update checker for new versions
- Buy Me a Coffee support button

---

## 🤝 Contributing

This is an open-source project. Issues and pull requests welcome at the repository.

### Development Setup

1. Clone the repository
2. Make changes to the source files
3. Load unpacked extension in Chrome to test
4. Follow Chrome Extension best practices

### Reporting Issues

When reporting issues, please include:
- Chrome version
- Extension version
- Steps to reproduce
- Console logs (F12 → Console tab)
- Screenshots if applicable

---

## 📄 License

This extension is provided as-is for personal use.

---

## ⚡ Quick Tips

- 💡 Set interval to 15-30 minutes for optimal balance between freshness and server load
- 💡 Pin the extension for easy access to countdown timer
- 💡 Use Discord notifications to avoid keeping the tab visible
- 💡 Test your Discord webhook by navigating away from the orders page and clicking refresh
- 💡 The extension survives page refreshes and maintains settings
- 💡 Click the three-dot button (...) for about information and links

---

## 🔗 Links

- **GitHub:** https://github.com/rb9999/flyp-auto-refresh
- **Discord (Message):** https://discord.com/users/599181983045910529
- **Discord (Discuss):** https://discord.gg/Cf9NqPX3CZ
- **Installation Page:** `chrome://extensions/`
- **Flyp Orders:** `https://tools.joinflyp.com/orders`
- **Discord Webhooks Guide:** [Discord Developer Docs](https://discord.com/developers/docs/resources/webhook)

---

**Version:** 1.0
**Release Date:** January 2025
**Status:** Public Release

Made with ❤️ for Flyp resellers
