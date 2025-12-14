# Chrome Web Store Submission Guide

## Package Information
- **File**: `flyp-auto-refresh-v2.0.zip`
- **Size**: 26KB
- **Version**: 2.0
- **Extension Name**: Flyp Orders Auto Refresh

## Package Contents
✅ manifest.json (v3)
✅ background.js (service worker)
✅ content.js (main logic)
✅ popup.html (UI)
✅ popup.js (UI logic)
✅ icon16.png
✅ icon48.png
✅ icon128.png
✅ README.md

## Pre-Submission Checklist

### Required Information for Chrome Web Store
1. **Extension Details**
   - Name: Flyp Orders Auto Refresh
   - Summary (132 chars max): Auto-refresh Flyp orders page and get Discord notifications for new sales
   - Description: Use the description below
   - Category: Productivity
   - Language: English

2. **Store Listing Assets Required**
   - [ ] Small tile icon (440x280 PNG) - **YOU NEED TO CREATE THIS**
   - [ ] Screenshots (1280x800 or 640x400 PNG/JPEG) - **YOU NEED TO CREATE THESE**
     - Minimum: 1 screenshot
     - Recommended: 3-5 screenshots showing key features
   - [x] Extension icons (16x16, 48x48, 128x128) - Already included

3. **Privacy**
   - [ ] Privacy policy URL (if collecting user data via Discord webhooks)
   - Note: Since you're collecting Discord webhook URLs, you may need a privacy policy

4. **Permissions Justification**
   Be prepared to explain:
   - `activeTab`: Required to detect and click the refresh button on the Flyp orders page
   - `storage`: Required to save user settings including refresh interval, Discord webhook URL, and enable/disable state
   - `downloads`: Required to export inventory data to CSV files for offline analysis
   - `https://tools.joinflyp.com/*`: Required to inject the auto-refresh functionality and monitor for new sale notifications on the Flyp orders page

### Suggested Description for Store Listing

**Short Description:**
Automatically refresh your Flyp Reseller Tools orders page and receive Discord notifications when new sales occur.

**Full Description:**
Flyp Orders Auto Refresh is a productivity tool designed for Flyp resellers to streamline their workflow.

Key Features:
• Auto-refresh the orders page at customizable intervals (default: 30 minutes)
• Manual refresh button for instant updates
• Discord webhook integration for instant sale notifications
• Countdown timer showing time until next refresh
• Export inventory data to CSV format
• Detailed sale information including item name, price, marketplace, and status
• Error detection and reporting for problematic orders

Perfect for:
- Flyp resellers who want to stay on top of their sales
- Users who need instant notifications about new orders
- Anyone looking to automate their Flyp workflow

The extension only runs on tools.joinflyp.com and requires minimal permissions. All settings are stored locally and can be configured through the easy-to-use popup interface.

## Submission Steps

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item"
3. Upload `flyp-auto-refresh-v2.0.zip`
4. Fill in store listing information:
   - Description (see above)
   - Screenshots (you need to create these)
   - Promotional images (small tile required)
   - Category: Productivity
5. Complete privacy practices section
6. Set pricing (Free recommended)
7. Select distribution (Public or Unlisted)
8. Submit for review

## Review Time
- Initial review typically takes 1-3 business days
- May take longer if flagged for manual review

## Post-Submission

### If Approved
- Extension will be live on Chrome Web Store
- Users can install via store link
- You can track installations and reviews in dashboard

### If Rejected
Common reasons and solutions:
- **Permissions**: Ensure all permissions are justified in description
- **Privacy**: Add privacy policy if requested
- **Functionality**: Must work as described
- **Screenshots**: Must show actual extension functionality

## Important Notes

1. **Privacy Policy**: Since you collect Discord webhook URLs, consider adding a simple privacy policy stating:
   - What data is collected (webhook URLs, user settings)
   - Where it's stored (locally in browser)
   - That no data is sent to external servers (except Discord webhooks)

2. **Screenshots Needed**: Create screenshots showing:
   - The popup interface with settings
   - A Discord notification example
   - The auto-refresh in action (countdown timer)
   - The inventory export feature

3. **Store Listing Assets**: You need to create:
   - Small promotional tile (440x280)
   - At least 1-3 screenshots (1280x800 recommended)

## Support and Updates

After publishing:
- Monitor reviews for bugs/issues
- Update via dashboard by uploading new ZIP with incremented version number
- Keep README and release notes updated
