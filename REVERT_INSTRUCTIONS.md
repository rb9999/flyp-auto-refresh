# Reverting to GitHub Update Version

If Chrome Web Store rejects the extension or you need to go back to the GitHub update functionality, follow these steps:

## Quick Revert (Restore GitHub Update Functionality)

```bash
# Revert to the version with GitHub updates
git checkout v2.0-github-updates

# Or, if you want to create a new commit that reverts the changes:
git revert e720aaa
```

## Version History

### v2.0-github-updates (Tagged)
- **Commit**: e3ba0c2
- **Features**: Full v2.0 with GitHub update checking
- **Permissions**: `activeTab`, `storage`, `downloads`, `https://tools.joinflyp.com/*`, `https://api.github.com/*`
- **Use Case**: GitHub releases, direct installation, private distribution

### v2.0-chrome-store (Current)
- **Commit**: e720aaa
- **Features**: Full v2.0 without GitHub update checking
- **Permissions**: `activeTab`, `storage`, `downloads`, `https://tools.joinflyp.com/*`
- **Use Case**: Chrome Web Store submission

## What Was Removed for Chrome Store

1. **manifest.json**: `https://api.github.com/*` host permission
2. **popup.js**: `checkForUpdates()` and `compareVersions()` functions
3. **popup.html**: Update banner UI, GitHub link in About modal

## Detailed Revert Steps

### Option 1: Checkout the Tag (Detached HEAD)
```bash
git checkout v2.0-github-updates
```
This puts you in "detached HEAD" state. To make changes:
```bash
git checkout -b github-updates-branch
```

### Option 2: Revert the Commit (Creates New Commit)
```bash
git revert e720aaa
```
This creates a new commit that undoes the Chrome Store changes.

### Option 3: Create New Branch from Tag
```bash
git checkout -b github-distribution v2.0-github-updates
```
This creates a new branch based on the GitHub update version.

## After Reverting

1. Delete the Chrome Store ZIP if it exists:
   ```bash
   rm flyp-auto-refresh-v2.0.zip
   ```

2. Create a new package with GitHub updates:
   ```bash
   zip -r flyp-auto-refresh-v2.0-github.zip \
     manifest.json \
     background.js \
     content.js \
     popup.html \
     popup.js \
     icon16.png \
     icon48.png \
     icon128.png \
     README.md
   ```

3. The GitHub update functionality will be restored and will check:
   - Repository: `https://github.com/rb9999/flyp-auto-refresh`
   - API endpoint: `https://api.github.com/repos/rb9999/flyp-auto-refresh/releases/latest`

## Maintaining Both Versions

You can maintain both versions simultaneously:

1. **main branch**: Chrome Web Store version (current)
2. **github-distribution branch**: GitHub update version (v2.0-github-updates tag)

To create the github-distribution branch:
```bash
git branch github-distribution v2.0-github-updates
```

## Files to Keep Track Of

- **Chrome Store Version**: Current main branch
- **GitHub Version**: v2.0-github-updates tag or github-distribution branch
- **Chrome Store ZIP**: `flyp-auto-refresh-v2.0.zip` (without GitHub)
- **GitHub ZIP**: `flyp-auto-refresh-v2.0-github.zip` (with GitHub updates)

## Quick Reference

| Version | Branch/Tag | GitHub Updates | Best For |
|---------|-----------|----------------|----------|
| Chrome Store | main (current) | ❌ No | Public distribution via Chrome Web Store |
| GitHub | v2.0-github-updates | ✅ Yes | Direct installation, GitHub releases |
