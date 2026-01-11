// Content script that runs on the Flyp orders page
let autoRefreshInterval = null;
let refreshIntervalMinutes = 30; // Default to 30 minutes
let isEnabled = true;
let nextRefreshTime = null; // Track when the next refresh will happen
let webhookUrl = ''; // Discord webhook URL
let notificationObserver = null; // MutationObserver for notifications
let processedNotifications = []; // HIGH FIX #4: Changed to array for proper LRU tracking
let notOnOrdersPageNotificationSent = false; // Track if we've sent the "not on orders page" notification
let isUpdatingSettings = false; // CRITICAL FIX #2: Prevent concurrent settings updates
let pendingTimeouts = new Set(); // HIGH FIX #3: Track all timeouts to prevent memory leaks
let backupPollingInterval = null; // HIGH FIX #3: Track backup polling interval
const MAX_PROCESSED_NOTIFICATIONS = 50; // HIGH FIX #4: Limit to 50 entries (down from 100)

// CRITICAL FIX #1: Validate webhook URL to prevent data exfiltration
function isValidWebhookUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Must be HTTPS and exactly discord.com domain (not subdomain attack)
    return urlObj.protocol === 'https:' &&
           urlObj.hostname === 'discord.com' &&
           urlObj.pathname.startsWith('/api/webhooks/');
  } catch (error) {
    console.error('Invalid webhook URL format:', error);
    return false;
  }
}

// HIGH FIX #3: Helper to schedule timeouts and track them for cleanup
function scheduleTimeout(callback, delay) {
  const timeoutId = setTimeout(() => {
    pendingTimeouts.delete(timeoutId);
    callback();
  }, delay);
  pendingTimeouts.add(timeoutId);
  return timeoutId;
}

// HIGH FIX #3: Clear all pending timeouts
function clearAllTimeouts() {
  pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  pendingTimeouts.clear();
}

// MEDIUM FIX #7: Sanitize text for Discord embeds to prevent XSS
function sanitizeForDiscord(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Discord supports markdown, but we need to escape potential injection vectors
  // Replace characters that could be used for injection or markdown abuse
  return text
    .replace(/[<>]/g, '') // Remove angle brackets (HTML/link injection)
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/`/g, '\\`') // Escape backticks (code blocks)
    .replace(/\[/g, '\\[') // Escape square brackets (links)
    .replace(/\]/g, '\\]')
    .replace(/@(everyone|here)/gi, '@\u200B$1') // Prevent mass mentions with zero-width space
    .trim()
    .substring(0, 1024); // Discord field value limit
}

// Function to click the refresh button
function clickRefreshButton() {
  // MEDIUM FIX #10: Proper URL validation using URL API
  let isOnOrdersPage = false;

  try {
    const urlObj = new URL(window.location.href);
    // Must be HTTPS and exact hostname match
    isOnOrdersPage = urlObj.protocol === 'https:' &&
                     urlObj.hostname === 'tools.joinflyp.com' &&
                     urlObj.pathname.startsWith('/orders');
  } catch (error) {
    console.error('Flyp Auto Refresh: Invalid URL format:', error);
    return false;
  }

  if (!isOnOrdersPage) {
    console.log('Flyp Auto Refresh: Not on orders page, skipping refresh');

    // Send Discord notification if we haven't already sent one for this occurrence
    if (webhookUrl && !notOnOrdersPageNotificationSent) {
      sendNotOnOrdersPageNotification();
      notOnOrdersPageNotificationSent = true;
    }
    return false;
  }

  // Reset the notification flag when we're back on the orders page
  if (notOnOrdersPageNotificationSent) {
    console.log('Flyp Auto Refresh: Back on orders page, resetting notification flag');
    notOnOrdersPageNotificationSent = false;
  }

  let targetButton = null;

  // Strategy 1: Look for the Ant Design button with redo icon and "Refresh" text
  const buttons = Array.from(document.querySelectorAll('button.ant-btn, button'));
  targetButton = buttons.find(btn => {
    const hasRedoIcon = btn.querySelector('.anticon-redo, [data-icon="redo"]');
    const hasRefreshText = btn.textContent.trim().toLowerCase() === 'refresh';
    return hasRedoIcon && hasRefreshText;
  });

  // Strategy 2: Look for any button with "Refresh" text (case insensitive)
  if (!targetButton) {
    targetButton = buttons.find(btn => {
      return btn.textContent.trim().toLowerCase() === 'refresh';
    });
  }

  // Strategy 3: Look for button containing "Refresh" anywhere in text
  if (!targetButton) {
    targetButton = buttons.find(btn => {
      return btn.textContent.trim().toLowerCase().includes('refresh');
    });
  }

  if (targetButton) {
    console.log('Flyp Auto Refresh: Clicking refresh button', targetButton);
    targetButton.click();

    // Send notification that refresh happened
    chrome.runtime.sendMessage({
      action: 'refreshClicked',
      timestamp: new Date().toISOString()
    }).catch(err => {
      // Ignore errors if background script isn't available
      console.log('Could not send message to background:', err);
    });
    return true;
  } else {
    console.log('Flyp Auto Refresh: Refresh button not found');
    console.log('Available buttons with text:', buttons.map(b => b.textContent.trim()).filter(t => t));
    return false;
  }
}

// Function to start auto-refresh
function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  if (isEnabled) {
    console.log(`Flyp Auto Refresh: Starting auto-refresh every ${refreshIntervalMinutes} minutes`);

    // Set the next refresh time
    nextRefreshTime = Date.now() + (refreshIntervalMinutes * 60 * 1000);

    // Store countdown state in chrome.storage so it's accessible from any tab
    // Return a promise so caller can wait for storage to be updated
    const storagePromise = new Promise((resolve) => {
      chrome.storage.local.set({
        nextRefreshTime: nextRefreshTime,
        isEnabled: isEnabled,
        intervalMinutes: refreshIntervalMinutes
      }, () => {
        console.log('Flyp Auto Refresh: Storage updated successfully');
        resolve();
      });
    });

    autoRefreshInterval = setInterval(() => {
      clickRefreshButton();
      // Reset next refresh time after clicking
      nextRefreshTime = Date.now() + (refreshIntervalMinutes * 60 * 1000);
      // Update storage
      chrome.storage.local.set({ nextRefreshTime: nextRefreshTime });
    }, refreshIntervalMinutes * 60 * 1000); // Convert minutes to milliseconds

    return storagePromise;
  }
  return Promise.resolve();
}

// Function to stop auto-refresh
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    console.log('Flyp Auto Refresh: Stopping auto-refresh');
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  // CRITICAL FIX #2: Always clear nextRefreshTime to prevent race conditions
  nextRefreshTime = null;

  // Clear countdown state from storage (with error handling for context invalidation)
  try {
    chrome.storage.local.remove('nextRefreshTime');
  } catch (error) {
    // Extension context invalidated (extension was reloaded) - ignore error
  }
}

// Function to send Discord webhook notification
async function sendDiscordNotification(saleData) {
  if (!webhookUrl) {
    console.log('Flyp Auto Refresh: No webhook URL configured');
    return;
  }

  // CRITICAL FIX #1: Validate webhook URL before every use
  if (!isValidWebhookUrl(webhookUrl)) {
    console.error('Flyp Auto Refresh: Invalid webhook URL - notification blocked for security');
    return;
  }

  try {
    const embed = {
      title: "🎉 New Sale on Flyp!",
      color: 5763719, // Green color
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Flyp Auto Refresh Bot"
      }
    };

    // MEDIUM FIX #7: Sanitize all user-controlled content
    // Add item name as description if available
    if (saleData.itemName) {
      embed.description = `**${sanitizeForDiscord(saleData.itemName)}**`;
    }

    // Add fields for available data
    if (saleData.price) {
      embed.fields.push({
        name: "💰 Price",
        value: sanitizeForDiscord(saleData.price),
        inline: true
      });
    }

    if (saleData.marketplace) {
      embed.fields.push({
        name: "🏪 Marketplace",
        value: sanitizeForDiscord(saleData.marketplace),
        inline: true
      });
    }

    if (saleData.status) {
      embed.fields.push({
        name: "✅ Status",
        value: sanitizeForDiscord(saleData.status),
        inline: false
      });
    }

    // Add error message if present
    if (saleData.errorMessage) {
      embed.fields.push({
        name: "⚠️ Error",
        value: sanitizeForDiscord(saleData.errorMessage),
        inline: false
      });
      // Change embed color to orange/yellow if there's an error
      embed.color = 16744192; // Orange color for warnings
    }

    // Add thumbnail image if available
    if (saleData.imageUrl) {
      embed.thumbnail = {
        url: saleData.imageUrl
      };
    }
    
    const payload = {
      content: "💸 **NEW SALE ALERT!** 💸",
      embeds: [embed]
    };

    // MEDIUM FIX #8: Don't log sensitive sale data or webhook payload
    console.log('Flyp Auto Refresh: Sending Discord notification');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('Flyp Auto Refresh: Discord notification sent successfully');
    } else {
      const errorText = await response.text();
      console.error('Flyp Auto Refresh: Failed to send Discord notification', response.status, errorText);
    }
  } catch (error) {
    console.error('Flyp Auto Refresh: Error sending Discord notification', error);
  }
}

// Function to send "Not on Orders Page" notification to Discord
async function sendNotOnOrdersPageNotification() {
  if (!webhookUrl) {
    console.log('Flyp Auto Refresh: No webhook URL configured');
    return;
  }

  // CRITICAL FIX #1: Validate webhook URL before every use
  if (!isValidWebhookUrl(webhookUrl)) {
    console.error('Flyp Auto Refresh: Invalid webhook URL - notification blocked for security');
    return;
  }

  try {
    const currentUrl = window.location.href;
    const embed = {
      title: "⚠️ Not on Orders Page",
      description: "The extension tried to refresh but you are not on the orders page.",
      color: 15158332, // Red color for alert
      fields: [
        {
          name: "📍 Current Page",
          value: currentUrl,
          inline: false
        },
        {
          name: "🕐 Time",
          value: new Date().toLocaleString(),
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Flyp Auto Refresh Bot - Page Alert"
      }
    };

    const payload = {
      content: "⚠️ **NOT ON ORDERS PAGE** ⚠️",
      embeds: [embed]
    };

    console.log('Flyp Auto Refresh: Sending "Not on Orders Page" notification');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('Flyp Auto Refresh: "Not on Orders Page" notification sent successfully');
    } else {
      const errorText = await response.text();
      console.error('Flyp Auto Refresh: Failed to send "Not on Orders Page" notification', response.status, errorText);
    }
  } catch (error) {
    console.error('Flyp Auto Refresh: Error sending "Not on Orders Page" notification', error);
  }
}

// Function to extract sale data from notification
function extractSaleData(notification) {
  const saleData = {
    itemName: '',
    price: '',
    marketplace: '',
    status: '',
    imageUrl: '',
    errorMessage: ''
  };
  
  try {
    console.log('Flyp Auto Refresh: Extracting sale data from notification');
    
    // Extract item name from the ant-typography element with ellipsis
    const itemNameEl = notification.querySelector('.ant-typography-ellipsis');
    if (itemNameEl) {
      saleData.itemName = itemNameEl.textContent.trim();
      console.log('Item name:', saleData.itemName);
    }
    
    // Extract price - look for "Price: $X" pattern
    const priceElements = notification.querySelectorAll('.ant-typography');
    for (const el of priceElements) {
      const text = el.textContent;
      if (text.includes('Price:')) {
        const priceMatch = text.match(/\$[\d,]+\.?\d*/);
        if (priceMatch) {
          saleData.price = priceMatch[0];
          console.log('Price:', saleData.price);
        }
        break;
      }
    }
    
    // Extract marketplace from image alt text or nearby text
    const marketplaceImg = notification.querySelector('img[alt*="icon"]');
    if (marketplaceImg) {
      const alt = marketplaceImg.alt.toLowerCase();
      if (alt.includes('ebay')) {
        saleData.marketplace = 'eBay';
      } else if (alt.includes('mercari')) {
        saleData.marketplace = 'Mercari';
      } else if (alt.includes('poshmark')) {
        saleData.marketplace = 'Poshmark';
      } else if (alt.includes('facebook')) {
        saleData.marketplace = 'Facebook Marketplace';
      } else if (alt.includes('depop')) {
        saleData.marketplace = 'Depop';
      }
      console.log('Marketplace:', saleData.marketplace);
    }
    
    // Also check "Sold on" text
    if (!saleData.marketplace) {
      const soldOnElements = notification.querySelectorAll('.ant-typography');
      for (const el of soldOnElements) {
        const text = el.textContent;
        if (text.includes('Sold on')) {
          const marketplaces = ['ebay', 'mercari', 'poshmark', 'depop', 'facebook'];
          for (const marketplace of marketplaces) {
            if (text.toLowerCase().includes(marketplace)) {
              saleData.marketplace = marketplace.charAt(0).toUpperCase() + marketplace.slice(1);
              if (marketplace === 'facebook') {
                saleData.marketplace = 'Facebook Marketplace';
              }
              break;
            }
          }
        }
      }
    }
    
    // Extract status from the tag
    const statusTag = notification.querySelector('.ant-tag-success');
    if (statusTag) {
      const statusText = statusTag.textContent.trim();
      saleData.status = statusText;
      console.log('Status:', saleData.status);
    }
    
    // Extract image URL
    const itemImg = notification.querySelector('.ant-image img');
    if (itemImg) {
      saleData.imageUrl = itemImg.src;
      console.log('Image URL:', saleData.imageUrl);
    }
    
    // If we couldn't extract the item name, try to get any text
    if (!saleData.itemName) {
      const titleEl = notification.querySelector('.new-sales-floating-container__bar-title');
      if (titleEl) {
        saleData.itemName = 'New sale detected';
      }
    }

    // Extract error message if present
    console.log('Looking for error alert in notification...');
    const errorAlert = notification.querySelector('.ant-alert-error .ant-alert-message');
    console.log('Error alert element:', errorAlert);
    if (errorAlert) {
      // Get the full text content, which includes the marketplace link text and error message
      saleData.errorMessage = errorAlert.textContent.trim();
      console.log('Error message found:', saleData.errorMessage);
    } else {
      console.log('No error alert found');
    }

  } catch (error) {
    console.error('Flyp Auto Refresh: Error extracting sale data', error);
    saleData.itemName = 'Sale notification detected';
  }

  return saleData;
}

// Function to process individual sale items within a notification
function processSaleItems(container) {
  console.log('🔍 [DEBUG] ═══════════════════════════════════════════════════════');
  console.log('🔍 [DEBUG] Processing sale items in container at', new Date().toLocaleTimeString());
  console.log('Flyp Auto Refresh: Processing sale items in container');

  // Find all individual sale items (they have ant-typography-ellipsis for item name)
  const saleItems = container.querySelectorAll('.ant-typography-ellipsis');

  console.log(`Found ${saleItems.length} sale item(s)`);

  saleItems.forEach((itemElement, index) => {
    console.log(`Processing sale item ${index + 1}`);

    // Get the parent container for this specific sale
    // The item name is inside a div, we need to go up to find all related info
    let saleContainer = itemElement.closest('div[style*="width: 100%"]');
    if (!saleContainer) {
      console.log('Could not find sale container for item');
      return;
    }

    // Extract sale data for this specific item
    const saleData = {
      itemName: itemElement.textContent.trim(),
      price: '',
      marketplace: '',
      status: '',
      imageUrl: '',
      errorMessage: ''
    };

    // Extract price from this sale's container
    const priceElements = saleContainer.querySelectorAll('.ant-typography');
    for (const el of priceElements) {
      const text = el.textContent;
      if (text.includes('Price:')) {
        const priceMatch = text.match(/\$[\d,]+\.?\d*/);
        if (priceMatch) {
          // Format price to always have 2 decimal places
          const priceValue = parseFloat(priceMatch[0].replace(/[$,]/g, ''));
          saleData.price = `$${priceValue.toFixed(2)}`;
          break;
        }
      }
    }

    // Extract marketplace
    const marketplaceImg = saleContainer.querySelector('img[alt*="icon"]');
    if (marketplaceImg) {
      const alt = marketplaceImg.alt.toLowerCase();
      if (alt.includes('ebay')) saleData.marketplace = 'eBay';
      else if (alt.includes('mercari')) saleData.marketplace = 'Mercari';
      else if (alt.includes('poshmark')) saleData.marketplace = 'Poshmark';
      else if (alt.includes('facebook')) saleData.marketplace = 'Facebook Marketplace';
      else if (alt.includes('depop')) saleData.marketplace = 'Depop';
    }

    // Extract status
    const statusTag = saleContainer.querySelector('.ant-tag-success');
    if (statusTag) {
      saleData.status = statusTag.textContent.trim();
    }

    // Find error alert using strict proximity-based detection
    // Only look for errors that are directly adjacent to this sale container
    console.log(`Looking for error alert associated with sale item ${index + 1}...`);

    // Strategy 1: Look for error inside the sale container itself
    let errorAlert = saleContainer.querySelector('.ant-alert-error');
    if (errorAlert) {
      console.log(`Strategy 1 SUCCESS: Error found inside sale container`);
    }

    // Strategy 2: Look for error as immediate next sibling (up to 3 siblings away)
    // This is the ONLY external search - we only look at direct neighbors
    if (!errorAlert) {
      let nextEl = saleContainer.nextElementSibling;
      // Check up to 3 siblings ahead (in case there are wrapper divs)
      for (let i = 0; i < 3 && nextEl; i++) {
        if (nextEl.classList && nextEl.classList.contains('ant-alert-error')) {
          errorAlert = nextEl;
          console.log(`Strategy 2 SUCCESS: Error found as sibling #${i + 1}`);
          break;
        }
        // Also check if this sibling contains an error alert
        const errorInSibling = nextEl.querySelector && nextEl.querySelector('.ant-alert-error');
        if (errorInSibling) {
          errorAlert = errorInSibling;
          console.log(`Strategy 2b SUCCESS: Error found inside sibling #${i + 1}`);
          break;
        }
        nextEl = nextEl.nextElementSibling;
      }
    }

    // Extract error message if found
    if (errorAlert) {
      const errorMessage = errorAlert.querySelector('.ant-alert-message');
      if (errorMessage) {
        saleData.errorMessage = errorMessage.textContent.trim();
        console.log(`✅ Error message extracted for sale ${index + 1}:`, saleData.errorMessage);
      } else {
        // Fallback: use all text content if no .ant-alert-message found
        saleData.errorMessage = errorAlert.textContent.trim();
        console.log(`✅ Error message extracted (fallback) for sale ${index + 1}:`, saleData.errorMessage);
      }
    } else {
      console.log(`❌ No error alert found for sale ${index + 1} after trying all strategies`);
    }

    // Get the image - look in the sale container first, then fall back to parent
    let itemImg = saleContainer.querySelector('.ant-image img');
    if (!itemImg) {
      // If not found in sale container, try the parent but get all images
      const allImages = container.querySelectorAll('.ant-image img');
      if (allImages.length > index && allImages[index]) {
        itemImg = allImages[index];
      }
    }
    if (itemImg) {
      saleData.imageUrl = itemImg.src;
    }

    // MEDIUM FIX #8: Don't log sensitive sale data
    console.log('Extracted sale data - ready to process');

    // Create unique ID based ONLY on item name and price (not timestamp)
    // This ensures we only send notification once per item, even if processed multiple times
    const notifId = `${saleData.itemName}_${saleData.price}`;

    // Store the most recent sale data for this notification
    // This allows later processing attempts to update with error messages
    if (!window.flypPendingSales) {
      window.flypPendingSales = new Map();
    }

    // If this is a new sale OR if we found an error message, update the stored data
    const existingData = window.flypPendingSales.get(notifId);
    const hasNewError = saleData.errorMessage && (!existingData || !existingData.errorMessage);

    if (!existingData || hasNewError) {
      console.log('🔍 [DEBUG] ───────────────────────────────────────────────────────');
      console.log(`🔍 [DEBUG] ${existingData ? 'UPDATING' : 'STORING'} sale data for ${notifId}`);
      if (hasNewError) {
        console.log('🔍 [DEBUG] ✅ FOUND ERROR MESSAGE:', saleData.errorMessage);
      }
      console.log('🔍 [DEBUG] Current error in storage:', existingData?.errorMessage || 'NONE');
      console.log('🔍 [DEBUG] New error from this attempt:', saleData.errorMessage || 'NONE');
      console.log('🔍 [DEBUG] ───────────────────────────────────────────────────────');

      window.flypPendingSales.set(notifId, {
        data: saleData,
        timestamp: Date.now()
      });
    }

    // Clean up old pending sales (older than 5 minutes)
    const now = Date.now();
    for (const [id, entry] of window.flypPendingSales.entries()) {
      if (now - entry.timestamp > 5 * 60 * 1000) {
        window.flypPendingSales.delete(id);
      }
    }

    // Schedule sending the notification after a delay to allow error messages to load
    // We'll only send if this notification hasn't been sent yet
    if (!processedNotifications.includes(notifId)) {
      // Don't mark as processed immediately - wait for the delayed send
      console.log(`Scheduling Discord notification for ${notifId} in 5 seconds (waiting for error messages)`);

      setTimeout(() => {
        // Check if we already sent this notification
        if (!processedNotifications.includes(notifId)) {
          // Mark as processed
          processedNotifications.push(notifId);

          // HIGH FIX #4: Keep only the last MAX_PROCESSED_NOTIFICATIONS entries
          if (processedNotifications.length > MAX_PROCESSED_NOTIFICATIONS) {
            processedNotifications.shift(); // Remove oldest entry
          }

          // Get the most up-to-date data (might have error message from later processing)
          const finalData = window.flypPendingSales.get(notifId);
          if (finalData && webhookUrl && (finalData.data.itemName || finalData.data.price)) {
            console.log('🔍 [DEBUG] ═══════════════════════════════════════════════════════');
            console.log('🔍 [DEBUG] SENDING DISCORD NOTIFICATION - Final Data:');
            console.log('🔍 [DEBUG] Item:', finalData.data.itemName);
            console.log('🔍 [DEBUG] Price:', finalData.data.price);
            console.log('🔍 [DEBUG] Marketplace:', finalData.data.marketplace);
            console.log('🔍 [DEBUG] Status:', finalData.data.status);
            console.log('🔍 [DEBUG] Error Message:', finalData.data.errorMessage || 'NONE');
            console.log('🔍 [DEBUG] ═══════════════════════════════════════════════════════');
            sendDiscordNotification(finalData.data);
          }

          // Clean up the pending sale
          window.flypPendingSales.delete(notifId);
        } else {
          console.log('Flyp Auto Refresh: Notification already sent, skipping');
        }
      }, 5000); // Wait 5 seconds to ensure all processing attempts have completed and errors loaded
    } else {
      console.log('Flyp Auto Refresh: Duplicate notification ignored', notifId);
    }
  });
}

// Function to monitor for sale notifications
function startNotificationMonitoring() {
  // HIGH FIX #3: Stop existing observer and clear all pending operations
  if (notificationObserver) {
    notificationObserver.disconnect();
  }

  // HIGH FIX #3: Clear backup polling interval if it exists
  if (backupPollingInterval) {
    clearInterval(backupPollingInterval);
    backupPollingInterval = null;
  }

  // HIGH FIX #3: Clear any pending timeouts
  clearAllTimeouts();

  console.log('🔍 [DEBUG] ═══════════════════════════════════════════════════════');
  console.log(`🔍 [DEBUG] Notification monitoring started at ${new Date().toLocaleTimeString()}`);
  console.log('🔍 [DEBUG] ═══════════════════════════════════════════════════════');
  console.log('Flyp Auto Refresh: Starting notification monitoring for sale popups');

  // Create a MutationObserver to watch for new notifications AND changes within them
  notificationObserver = new MutationObserver((mutations) => {
    // DEBUG: Log when mutations are detected
    console.log(`🔍 [DEBUG] MutationObserver fired with ${mutations.length} mutation(s)`);

    // Track which notifications we've seen in THIS mutation batch to avoid reprocessing
    const seenNotifications = new WeakSet();

    mutations.forEach((mutation, mutationIndex) => {
      console.log(`🔍 [DEBUG] Mutation ${mutationIndex + 1}: ${mutation.addedNodes.length} node(s) added`);

      mutation.addedNodes.forEach((node, nodeIndex) => {
        if (node.nodeType === 1) { // Element node
          const classNames = node.className && typeof node.className === 'string' ? '.' + node.className.split(' ').join('.') : '';
          console.log(`🔍 [DEBUG] Node ${nodeIndex + 1}: ${node.tagName}${classNames}`);

          // Check if this is the Flyp sale notification container
          let notifications = [];

          // Look for the specific Flyp notification class
          if (node.classList && node.classList.contains('new-sales-floating-container__inner')) {
            notifications.push(node);
            console.log('Flyp Auto Refresh: New notification container detected!');
            console.log('🔍 [DEBUG] ✅ Direct match: node IS notification container');
          }

          // Also check children for the notification container
          if (node.querySelectorAll) {
            const foundNotifications = node.querySelectorAll('.new-sales-floating-container__inner');
            if (foundNotifications.length > 0) {
              console.log(`Flyp Auto Refresh: Found ${foundNotifications.length} notification container(s) in added node`);
              console.log(`🔍 [DEBUG] ✅ Child match: found ${foundNotifications.length} container(s) inside node`);
            }
            notifications.push(...Array.from(foundNotifications));
          }

          // Check if this node was added inside an existing notification container
          // This catches when new sale items are added to an existing popup
          if (node.closest && node.closest('.new-sales-floating-container__inner')) {
            const container = node.closest('.new-sales-floating-container__inner');
            console.log('Flyp Auto Refresh: Content added to existing notification container!');
            console.log(`🔍 [DEBUG] ✅ Parent match: node added INSIDE existing container`);
            notifications.push(container);
          }

          if (notifications.length === 0) {
            console.log('🔍 [DEBUG] ❌ No notification containers found for this node');
          }

          // Process each notification - check for all sale items inside
          notifications.forEach((notification) => {
            // Only process each notification container once per mutation batch
            if (!seenNotifications.has(notification)) {
              seenNotifications.add(notification);
              console.log('Flyp Auto Refresh: Processing notification container', notification);

              // Check if ReactVirtualized content is present (Flyp uses it for sale lists)
              const hasVirtualized = notification.querySelector('.ReactVirtualized__Grid, .ReactVirtualized__List');

              if (hasVirtualized) {
                console.log('Flyp Auto Refresh: Detected ReactVirtualized content, waiting for render...');
                console.log('🔍 [DEBUG] Scheduling 5 processing attempts: 200ms, 500ms, 1000ms, 2000ms, 3000ms');
                // HIGH FIX #3: Use scheduleTimeout to track timeouts for cleanup
                // Multiple attempts ensure we catch error messages that load asynchronously
                scheduleTimeout(() => {
                  console.log('🔍 [DEBUG] ⏰ Processing at 200ms delay');
                  processSaleItems(notification);
                }, 200);
                scheduleTimeout(() => {
                  console.log('🔍 [DEBUG] ⏰ Processing at 500ms delay');
                  processSaleItems(notification);
                }, 500);
                scheduleTimeout(() => {
                  console.log('🔍 [DEBUG] ⏰ Processing at 1000ms delay');
                  processSaleItems(notification);
                }, 1000);
                scheduleTimeout(() => {
                  console.log('🔍 [DEBUG] ⏰ Processing at 2000ms delay (error messages may load late)');
                  processSaleItems(notification);
                }, 2000);
                scheduleTimeout(() => {
                  console.log('🔍 [DEBUG] ⏰ Processing at 3000ms delay (final attempt for late-loading errors)');
                  processSaleItems(notification);
                }, 3000);
              } else {
                console.log('🔍 [DEBUG] No ReactVirtualized detected, scheduling multiple processing attempts');
                // HIGH FIX #3: Use scheduleTimeout to track timeouts for cleanup
                // Even without ReactVirtualized, errors can load late
                scheduleTimeout(() => {
                  console.log('🔍 [DEBUG] ⏰ Processing at 100ms delay');
                  processSaleItems(notification);
                }, 100);
                scheduleTimeout(() => {
                  console.log('🔍 [DEBUG] ⏰ Processing at 500ms delay');
                  processSaleItems(notification);
                }, 500);
                scheduleTimeout(() => {
                  console.log('🔍 [DEBUG] ⏰ Processing at 1500ms delay (for late-loading errors)');
                  processSaleItems(notification);
                }, 1500);
              }
            } else {
              console.log('🔍 [DEBUG] ⏭️  Skipping duplicate notification in this mutation batch');
            }
          });
        }
      });
    });
  });

  // Start observing the document body for notification popups
  // IMPORTANT: We observe subtree deeply to catch changes inside the notification
  notificationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,  // Watch for attribute changes
    characterData: true  // Watch for text content changes
  });

  console.log('Flyp Auto Refresh: Notification monitoring active - watching for .new-sales-floating-container__inner');

  // BACKUP STRATEGY: Poll for sales count changes every 5 seconds
  // This catches sales that don't trigger DOM mutations
  // HIGH FIX #3: Track the interval for proper cleanup
  let lastKnownSaleCount = 0;
  backupPollingInterval = setInterval(() => {
    const container = document.querySelector('.new-sales-floating-container__inner');
    if (container) {
      const currentSaleCount = container.querySelectorAll('.ant-typography-ellipsis').length;
      if (currentSaleCount > lastKnownSaleCount && lastKnownSaleCount > 0) {
        console.log(`🔍 [DEBUG] 🔔 POLLING DETECTED CHANGE: Sale count changed from ${lastKnownSaleCount} to ${currentSaleCount}`);
        console.log('Flyp Auto Refresh: Polling detected new sale(s) - processing container');

        // Process the container with ReactVirtualized delays
        const hasVirtualized = container.querySelector('.ReactVirtualized__Grid, .ReactVirtualized__List');
        if (hasVirtualized) {
          console.log('Flyp Auto Refresh: Detected ReactVirtualized content, waiting for render...');
          console.log('🔍 [DEBUG] Scheduling 3 processing attempts: 200ms, 500ms, 1000ms');
          // HIGH FIX #3: Use scheduleTimeout to track timeouts for cleanup
          scheduleTimeout(() => {
            console.log('🔍 [DEBUG] ⏰ Processing at 200ms delay (from polling)');
            processSaleItems(container);
          }, 200);
          scheduleTimeout(() => {
            console.log('🔍 [DEBUG] ⏰ Processing at 500ms delay (from polling)');
            processSaleItems(container);
          }, 500);
          scheduleTimeout(() => {
            console.log('🔍 [DEBUG] ⏰ Processing at 1000ms delay (from polling)');
            processSaleItems(container);
          }, 1000);
        } else {
          // HIGH FIX #3: Use scheduleTimeout to track timeouts for cleanup
          scheduleTimeout(() => {
            console.log('🔍 [DEBUG] ⏰ Processing at 100ms delay (from polling)');
            processSaleItems(container);
          }, 100);
        }
      }
      lastKnownSaleCount = currentSaleCount;
    }
  }, 5000);  // Check every 5 seconds

  console.log('🔍 [DEBUG] Backup polling strategy enabled - checking sale count every 5 seconds');
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSettings') {
    // CRITICAL FIX #2: Prevent concurrent settings updates
    if (isUpdatingSettings) {
      console.log('Flyp Auto Refresh: Settings update already in progress, ignoring duplicate');
      sendResponse({ success: false, error: 'Update in progress' });
      return true;
    }

    isUpdatingSettings = true;

    // Handle async storage update
    (async () => {
      try {
        const oldWebhookUrl = webhookUrl;
        const wasEnabled = isEnabled;

        refreshIntervalMinutes = request.intervalMinutes || 30;
        isEnabled = request.enabled !== false;
        webhookUrl = request.webhookUrl || '';

        // Always stop the current auto-refresh
        stopAutoRefresh();

        // Restart auto-refresh with new settings if enabled
        // This ensures countdown timer resets when interval changes
        if (isEnabled) {
          // Wait for startAutoRefresh to complete storage update
          await startAutoRefresh();
        }

        // Start notification monitoring if webhook is configured and changed
        if (webhookUrl && webhookUrl !== oldWebhookUrl) {
          startNotificationMonitoring();
        }

        sendResponse({ success: true });
      } finally {
        // CRITICAL FIX #2: Always release the lock
        isUpdatingSettings = false;
      }
    })();

    return true; // Keep channel open for async response
  } else if (request.action === 'manualRefresh') {
    const clicked = clickRefreshButton();
    // Reset the countdown timer after manual refresh
    if (clicked && isEnabled) {
      nextRefreshTime = Date.now() + (refreshIntervalMinutes * 60 * 1000);
      // Update storage so countdown is visible on any tab
      chrome.storage.local.set({ nextRefreshTime: nextRefreshTime });
    }
    sendResponse({ success: clicked });
  } else if (request.action === 'getStatus') {
    sendResponse({
      enabled: isEnabled,
      intervalMinutes: refreshIntervalMinutes,
      running: autoRefreshInterval !== null
    });
  } else if (request.action === 'getCountdown') {
    sendResponse({
      enabled: isEnabled,
      nextRefreshTime: nextRefreshTime,
      intervalMinutes: refreshIntervalMinutes
    });
  } else if (request.action === 'scrapeInventory') {
    // Scrape inventory data for CSV export
    const items = scrapeFlypInventory();
    sendResponse({ success: true, data: items });
  }
  return true;
});

// Load settings from storage and start
chrome.storage.sync.get(['enabled', 'intervalMinutes', 'webhookUrl'], (result) => {
  // HIGH FIX #5: Add error handling for storage access
  if (chrome.runtime.lastError) {
    console.error('Flyp Auto Refresh: Error loading settings from storage:', chrome.runtime.lastError);
    // Use default values on error
    isEnabled = true;
    refreshIntervalMinutes = 30;
    webhookUrl = '';
  } else {
    isEnabled = result.enabled !== false; // Default to true
    refreshIntervalMinutes = result.intervalMinutes || 30;
    webhookUrl = result.webhookUrl || '';
  }

  if (isEnabled) {
    startAutoRefresh();
  }

  // Start notification monitoring if webhook is configured
  if (webhookUrl) {
    startNotificationMonitoring();
  }
});

// Function to scrape inventory data from /my-items page
function scrapeFlypInventory() {
  const items = [];

  // Find all item cards on the page
  const itemCards = document.querySelectorAll('a[href^="/item/"]');

  itemCards.forEach(card => {
    try {
      // Extract item name
      const titleElement = card.querySelector('.single-item-card__title');
      const itemName = titleElement ? titleElement.textContent.trim() : 'N/A';

      // Extract date and price - only from spans with actual text
      const infoContainer = card.querySelector('.ant-space.ant-space-horizontal.ant-space-align-center[style*="display: flex"]');
      let dateListedText = 'N/A';
      let priceText = 'N/A';

      if (infoContainer) {
        const infoSpans = Array.from(infoContainer.querySelectorAll('.ant-typography'))
          .filter(span => span.textContent.trim() !== ''); // Filter out empty spans

        if (infoSpans.length >= 2) {
          dateListedText = infoSpans[0].textContent.trim();
          priceText = infoSpans[1].textContent.trim();
        } else if (infoSpans.length === 1) {
          dateListedText = infoSpans[0].textContent.trim();
        }
      }

      // Extract marketplaces
      const marketplaces = [];
      const marketplaceContainer = card.querySelector('.ant-space.ant-space-horizontal.ant-space-align-center[style*="margin-top: 8px"]');

      if (marketplaceContainer) {
        const marketplaceImages = marketplaceContainer.querySelectorAll('img[alt*="marketplace icon"]');
        marketplaceImages.forEach(img => {
          const alt = img.getAttribute('alt');
          if (alt) {
            // Extract marketplace name from alt text (e.g., "poshmark marketplace icon" -> "poshmark")
            const marketplace = alt.replace(' marketplace icon', '').trim();
            marketplaces.push(marketplace);
          }
        });
      }

      // Only add item if it has valid data (not all N/A)
      if (itemName !== 'N/A' || dateListedText !== 'N/A' || priceText !== 'N/A') {
        const item = {
          itemName: itemName,
          dateListed: dateListedText,
          price: priceText,
          marketplaces: marketplaces.join(', ')
        };

        items.push(item);
      }
    } catch (error) {
      console.error('Error scraping item:', error);
    }
  });

  return items;
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();

  // HIGH FIX #3: Comprehensive cleanup to prevent memory leaks
  if (notificationObserver) {
    notificationObserver.disconnect();
    notificationObserver = null;
  }

  if (backupPollingInterval) {
    clearInterval(backupPollingInterval);
    backupPollingInterval = null;
  }

  clearAllTimeouts();
});
