# Release Notes

## v2.0.1 - Error Detection Accuracy Fix (January 2025)

### Bug Fixes
- 🐛 **Fixed Incorrect Error Messages in Discord Notifications**: Discord notifications were showing error messages that didn't exist in the actual Flyp sale notifications
  - Root cause: Error detection logic was searching too broadly across the entire notification container
  - Strategy 5 fallback was blindly assigning unrelated errors (e.g., Facebook delist errors) to sales
  - Solution: Simplified error detection to only 2 strict proximity-based strategies:
    1. Look for errors inside the sale container itself
    2. Look for errors as immediate next siblings (up to 3 positions)
  - Removed problematic strategies (position-based, single-match assumption, and last-item fallback)
  - Now only shows error messages that are directly associated with the specific sale

### Technical Changes
- Removed `allErrorAlerts` global container search
- Removed Strategies 3, 4, and 5 from error detection
- Kept only strict proximity-based detection (Strategies 1 and 2)
- Improved accuracy of error-to-sale association

### Files Modified
1. `content.js` - Simplified `processSaleItems()` error detection logic (lines 489-591)

---

## v2.0 - Inventory Export Feature (January 2025)

### New Features
- 📊 **Inventory Export to CSV**: Export your Flyp inventory listings from the `/my-items` page
  - Orange "Export" button added to popup UI
  - Modal with instructions for exporting
  - Scrapes visible items: Name, Date Listed, Price, Marketplaces
  - Each export creates a separate file (Chrome auto-numbers: `flyp-inventory.csv`, `flyp-inventory (1).csv`, etc.)
  - No headers in CSV for easy manual merging
  - Page-by-page export workflow for large inventories

### Technical Changes
- Added `downloads` permission to manifest
- New scraping function in content.js for inventory data extraction
- CSV generation and download functionality in popup.js
- Export modal UI with instructions
- Button layout adjusted to fit 4 buttons in popup

### Files Modified
1. `manifest.json` - Version updated to 2.0, added downloads permission
2. `popup.html` - Added Export button and Export modal
3. `popup.js` - Added CSV export handlers and helper functions
4. `content.js` - Added inventory scraping function and message listener

---

## v1.0 - Public Release (January 2025)

### Summary

This document outlines the steps needed to prepare the repository for public release as version 1.0.

---

## Changes Made for v1.0

### Version Number Updates
- ✅ **manifest.json**: Updated version from "2.0" to "1.0"
- ✅ **README.md**: Completely rewritten with v1.0 as the public release
  - All features consolidated into v1.0
  - Updated release date to January 2025
  - Added new features (About modal, update checker, etc.)
  - Updated links and documentation

### Files Modified
1. `manifest.json` - Version updated to 1.0, description improved
2. `README.md` - Complete rewrite for public v1.0 release
3. `content.js` - Recent fixes for countdown timer reset issue
4. `popup.html` - Added About modal with three-dot button
5. `popup.js` - Added modal functionality and improved countdown reset logic

---

## GitHub Repository Actions Required

### Option 1: Make Current Private Repo Public (Recommended if you want to keep history)

1. **Go to Repository Settings**
   - Navigate to your private repository on GitHub
   - Click "Settings" tab
   - Scroll down to "Danger Zone"

2. **Change Repository Visibility**
   - Click "Change visibility"
   - Select "Make public"
   - Type the repository name to confirm

3. **Clean Up Old Releases (Optional)**
   - Go to "Releases" page
   - Delete old v1.1, v1.2, v1.3 releases (or mark them as "Pre-release")
   - These will still exist in git history but won't be visible as "Releases"

4. **Create New v1.0 Release**
   - Go to "Releases" → "Create a new release"
   - Tag: `v1.0`
   - Title: `v1.0 - Public Release`
   - Description: Copy from README.md version history section
   - Attach the packaged extension (zip file of the extension folder)
   - Mark as "Latest release"

### Option 2: Create Fresh Public Repository (Clean Slate)

1. **Create New Public Repository**
   - Name: `flyp-auto-refresh`
   - Description: "Chrome extension that auto-refreshes Flyp orders page with Discord notifications"
   - Public visibility
   - Initialize with README: No (you'll push yours)

2. **Push Current Code as v1.0**
   ```bash
   # Remove old git history (in local copy)
   cd d:\dev\flyp-auto-refresh
   rm -rf .git

   # Initialize fresh git repo
   git init
   git add .
   git commit -m "Initial public release v1.0"

   # Add remote and push
   git remote add origin https://github.com/rb9999/flyp-auto-refresh.git
   git branch -M main
   git push -u origin main

   # Create v1.0 tag
   git tag -a v1.0 -m "Version 1.0 - Public Release"
   git push origin v1.0
   ```

3. **Create GitHub Release**
   - Go to "Releases" → "Create a new release"
   - Choose tag: `v1.0`
   - Title: `v1.0 - Public Release`
   - Description: See below

---

## Recommended v1.0 Release Description

```markdown
# v1.0 - Public Release

First public release of Flyp Orders Auto Refresh extension!

## Features

### Core Functionality
- 🔄 Automatic page refresh with configurable intervals (10-1440 minutes)
- ⏱️ Visual countdown timer
- 🔘 Manual refresh button
- 🎛️ Easy toggle to enable/disable

### Discord Integration
- 💬 Real-time sale notifications with rich embeds
- 📊 Detailed sale information (name, price, marketplace, status, image)
- ⚠️ Error message reporting for delisting issues
- 🔔 "Not on Orders Page" warnings
- 🚫 Duplicate notification prevention

### Security & Privacy
- 🔐 Webhook URL validation
- 🛡️ Content sanitization
- 🔒 Content Security Policy
- ✅ No sensitive data logging

### Performance & Stability
- 💾 Memory leak prevention
- 🔄 MutationObserver with backup polling
- 📦 ReactVirtualized support
- ⚡ LRU cache for notifications

### User Interface
- ℹ️ About modal with project information
- 🔔 Update checker
- ☕ Support button

## Installation

See [README.md](https://github.com/rb9999/flyp-auto-refresh/blob/main/README.md) for detailed installation instructions.

## Download

Download the source code and follow the installation instructions to load as an unpacked extension.
```

---

## Additional Recommendations

### 1. Create a .gitignore File
Create `.gitignore` to exclude unnecessary files:
```
.claude/
test-simulate-sale.js
node_modules/
.DS_Store
*.log
```

### 2. Add License File
Consider adding a `LICENSE` file (e.g., MIT License) to clarify usage terms.

### 3. Repository Description and Topics
- **Description**: "Chrome extension that auto-refreshes Flyp orders page with Discord sale notifications"
- **Topics**: `chrome-extension`, `flyp`, `discord-notifications`, `reseller-tools`, `automation`

### 4. Update Repository Settings
- Enable Issues for bug reports
- Enable Discussions for community Q&A
- Set up branch protection for `main` (optional)

---

## Current Branch Status

You are currently on branch `v2.0`. Before making the repository public, you may want to:

1. Switch to `main` branch (or create it)
2. Delete the `v2.0` branch
3. Use `main` as the default branch for the public release

Commands:
```bash
git checkout -b main  # Create and switch to main branch
git branch -d v2.0    # Delete v2.0 branch (locally)
git push origin main  # Push main branch
git push origin --delete v2.0  # Delete v2.0 branch (remote)
```

---

## Files Ready for Commit

All files have been updated and are ready to commit:
- `manifest.json` - v1.0
- `README.md` - v1.0 documentation
- `content.js` - Latest fixes
- `popup.html` - With About modal
- `popup.js` - With modal functionality

---

## Next Steps

1. Review all changes
2. Test the extension one more time
3. Decide on Option 1 or Option 2 above
4. Make repository public
5. Create v1.0 release
6. Share with the community!

---

**Note**: This release resets version numbering. Previous versions (v1.1-v2.0) were private development versions. v1.0 is the first public release with all features included.
