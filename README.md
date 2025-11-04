# Flyp Orders Auto Refresh Chrome Extension

This Chrome extension automatically clicks the "Refresh" button on the Flyp Reseller Tools orders page at a configurable interval.

## Features

- ✅ Automatically refreshes your Flyp orders page every 30 minutes (configurable)
- ✅ Easy on/off toggle
- ✅ Configurable refresh interval (1-1440 minutes)
- ✅ Manual refresh button for instant updates
- ✅ Countdown timer showing time until next refresh
- ✅ **NEW: Discord notifications when you make a sale!**
- ✅ Simple, clean interface

## Installation Instructions

### Step 1: Enable Developer Mode in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. In the top right corner, toggle **"Developer mode"** to ON

### Step 2: Load the Extension

1. Click the **"Load unpacked"** button that appears after enabling developer mode
2. Navigate to the `flyp-auto-refresh` folder and select it
3. The extension should now appear in your extensions list

### Step 3: Pin the Extension (Optional but Recommended)

1. Click the puzzle piece icon in Chrome's toolbar (extensions menu)
2. Find "Flyp Orders Auto Refresh" in the list
3. Click the pin icon to keep it visible in your toolbar

## How to Use

### Automatic Refresh

1. Navigate to `https://tools.joinflyp.com/orders`
2. The extension will automatically start refreshing every 30 minutes (or your configured interval)
3. The page will stay on this tab and keep your orders updated

### Configure Settings

1. Click the extension icon in your Chrome toolbar
2. You'll see a popup with these options:
   - **Auto-refresh enabled**: Toggle to turn automatic refreshing on/off
   - **Refresh interval**: Set how many minutes between each refresh (1-1440)
   - **Discord Webhook URL**: (Optional) Get notified in Discord when you make a sale!
   - **Save Settings**: Click to save your changes
   - **Refresh Now**: Manually trigger a refresh immediately

### Setting Up Discord Notifications (Optional)

Want to get notified in Discord when you make a sale? Here's how:

1. **Create a Discord Webhook:**
   - Open Discord and go to your server
   - Right-click on the channel where you want notifications (or create a new one like #flyp-sales)
   - Click "Edit Channel" → "Integrations" → "Webhooks"
   - Click "New Webhook" or "Create Webhook"
   - Give it a name (e.g., "Flyp Sales Bot")
   - Copy the Webhook URL

2. **Add to Extension:**
   - Click the extension icon
   - Paste the webhook URL into the "Discord Webhook URL" field
   - Click "Save Settings"
   - Keep the Flyp orders tab open

3. **Test It:**
   - When a sale notification pops up in Flyp, you'll automatically get a message in Discord with:
     - Item name
     - Sale price
     - Marketplace (eBay, Mercari, etc.)
     - Sale status
     - Timestamp

### Tips

- The extension only works when you're on the Flyp orders page
- Keep the tab open for auto-refresh to work
- The default interval is 30 minutes, but you can change it to anything from 1 minute to 24 hours (1440 minutes)
- You can disable auto-refresh temporarily using the toggle switch

## Troubleshooting

**Extension not working?**
- Make sure you're on the correct page: `https://tools.joinflyp.com/orders`
- Check that the extension is enabled in `chrome://extensions/`
- Try reloading the Flyp orders page
- Check the browser console (F12) for any error messages

**Refresh button not being found?**
- The extension looks for a button with the text "Refresh"
- If the page layout changes, you may need to update the extension

**Want to change the interval while the page is open?**
- Just change the settings in the popup and click "Save Settings"
- The new interval will take effect immediately

## Privacy & Permissions

This extension:
- Only runs on `tools.joinflyp.com` pages
- Does not collect any data
- Does not send any information anywhere
- Only clicks the refresh button on your behalf
- Stores your preferences locally in Chrome

## Support

If you encounter any issues or have questions, please check:
1. That you're on the correct page
2. That the extension is enabled
3. The browser console for error messages

---

**Version:** 1.0  
**Last Updated:** November 2025
