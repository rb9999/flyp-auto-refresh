# Fix Incorrect Error Message in Discord Notifications

## Problem
Discord notifications are showing error messages that don't exist in the source Flyp notification. The extension is incorrectly associating unrelated error messages from elsewhere on the page with sale notifications.

## Root Cause
The error detection logic in `processSaleItems()` function (lines 491-646) searches too broadly:
- Line 492: `allErrorAlerts = container.querySelectorAll('.ant-alert-error')` searches the entire notification container
- Strategy 5 (lines 616-631): For the last sale item, it blindly assigns ANY error found in `allErrorAlerts` without validating it belongs to that sale
- This causes errors from other parts of the page (like Facebook delist errors) to be incorrectly associated with unrelated sales

## Plan

### Task 1: Limit error search scope ⏳
**Status**: Pending
**Details**: Modify line 492 to only search for errors that are direct siblings or children of sale containers, not the entire notification container

### Task 2: Remove or fix Strategy 5 ⏳
**Status**: Pending
**Details**: Strategy 5 (lines 616-631) is too aggressive. Either remove it entirely or add validation to ensure the error actually relates to the sale item

### Task 3: Add error validation ⏳
**Status**: Pending
**Details**: Before assigning any error to a sale, validate that:
- The error is spatially close to the sale in the DOM (adjacent siblings)
- The error is not from a completely different section of the page
- The error timestamp/context matches the sale

### Task 4: Test with real notifications ⏳
**Status**: Pending
**Details**: Test the fix with:
- Sales without errors (should show no error)
- Sales with errors (should show correct error)
- Multiple sales with mixed error states

## Implementation Strategy
Keep changes minimal and focused on the error detection logic only. Don't modify any other functionality.
