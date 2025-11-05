// Content script that runs on the Flyp orders page
let autoRefreshInterval = null;
let refreshIntervalMinutes = 30; // Default to 30 minutes
let isEnabled = true;
let nextRefreshTime = null; // Track when the next refresh will happen
let webhookUrl = ''; // Discord webhook URL
let notificationObserver = null; // MutationObserver for notifications
let processedNotifications = new Set(); // Track processed notifications to avoid duplicates

// Function to click the refresh button
function clickRefreshButton() {
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
    
    autoRefreshInterval = setInterval(() => {
      clickRefreshButton();
      // Reset next refresh time after clicking
      nextRefreshTime = Date.now() + (refreshIntervalMinutes * 60 * 1000);
    }, refreshIntervalMinutes * 60 * 1000); // Convert minutes to milliseconds
  }
}

// Function to stop auto-refresh
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    console.log('Flyp Auto Refresh: Stopping auto-refresh');
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    nextRefreshTime = null;
  }
}

// Function to send Discord webhook notification
async function sendDiscordNotification(saleData) {
  if (!webhookUrl) {
    console.log('Flyp Auto Refresh: No webhook URL configured');
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
    
    // Add item name as description if available
    if (saleData.itemName) {
      embed.description = `**${saleData.itemName}**`;
    }
    
    // Add fields for available data
    if (saleData.price) {
      embed.fields.push({
        name: "💰 Price",
        value: saleData.price,
        inline: true
      });
    }
    
    if (saleData.marketplace) {
      embed.fields.push({
        name: "🏪 Marketplace",
        value: saleData.marketplace,
        inline: true
      });
    }
    
    if (saleData.status) {
      embed.fields.push({
        name: "✅ Status",
        value: saleData.status,
        inline: false
      });
    }

    // Add error message if present
    if (saleData.errorMessage) {
      embed.fields.push({
        name: "⚠️ Error",
        value: saleData.errorMessage,
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
    
    console.log('Flyp Auto Refresh: Sending Discord notification:', payload);
    
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
  console.log('Flyp Auto Refresh: Processing sale items in container');

  // Find all individual sale items (they have ant-typography-ellipsis for item name)
  const saleItems = container.querySelectorAll('.ant-typography-ellipsis');

  console.log(`Found ${saleItems.length} sale item(s)`);

  // First, find all error alerts in the container
  const allErrorAlerts = container.querySelectorAll('.ant-alert-error');
  console.log(`Found ${allErrorAlerts.length} error alert(s) in container`);

  // Create array of sale containers with their positions
  const saleContainerData = [];

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

    // Find error alert by comparing positions in DOM
    // The error that appears AFTER this sale but BEFORE the next sale belongs to this sale
    console.log(`Looking for error alert associated with sale item ${index + 1}...`);

    // Get all children of the container as an array for position comparison
    const allChildren = Array.from(container.querySelectorAll('*'));
    const salePosition = allChildren.indexOf(saleContainer);

    console.log(`Sale ${index + 1} container position in DOM:`, salePosition);

    // Find the position of the next sale container (if it exists)
    const nextSaleContainer = saleItems[index + 1] ? saleItems[index + 1].closest('div[style*="width: 100%"]') : null;
    const nextSalePosition = nextSaleContainer ? allChildren.indexOf(nextSaleContainer) : allChildren.length;

    console.log(`Next sale position (or end):`, nextSalePosition);

    // Look for error alerts between this sale and the next sale
    for (const errorAlert of allErrorAlerts) {
      const errorPosition = allChildren.indexOf(errorAlert);
      console.log(`Error alert position:`, errorPosition);

      // If the error appears after this sale but before the next sale, it belongs to this sale
      if (errorPosition > salePosition && errorPosition < nextSalePosition) {
        const errorMessage = errorAlert.querySelector('.ant-alert-message');
        if (errorMessage) {
          saleData.errorMessage = errorMessage.textContent.trim();
          console.log(`Error message found for sale ${index + 1} (position ${errorPosition}):`, saleData.errorMessage);
          break;
        }
      }
    }

    if (!saleData.errorMessage) {
      console.log(`No error alert found for sale ${index + 1}`);
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

    console.log('Extracted sale data:', saleData);

    // Create unique ID
    const timestamp = Math.floor(Date.now() / 10000);
    const notifId = `${saleData.itemName}_${saleData.price}_${timestamp}`;

    if (!processedNotifications.has(notifId)) {
      processedNotifications.add(notifId);

      // Clean up old processed notifications (keep last 50)
      if (processedNotifications.size > 50) {
        const firstItem = processedNotifications.values().next().value;
        processedNotifications.delete(firstItem);
      }

      // Send to Discord if webhook is configured
      if (webhookUrl && (saleData.itemName || saleData.price)) {
        console.log('Flyp Auto Refresh: Sending sale notification to Discord');
        sendDiscordNotification(saleData);
      }
    } else {
      console.log('Flyp Auto Refresh: Duplicate notification ignored', notifId);
    }
  });
}

// Function to monitor for sale notifications
function startNotificationMonitoring() {
  // Stop existing observer if any
  if (notificationObserver) {
    notificationObserver.disconnect();
  }

  console.log('Flyp Auto Refresh: Starting notification monitoring for sale popups');

  // Create a MutationObserver to watch for new notifications AND changes within them
  notificationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check if this is the Flyp sale notification container
          let notifications = [];

          // Look for the specific Flyp notification class
          if (node.classList && node.classList.contains('new-sales-floating-container__inner')) {
            notifications.push(node);
          }

          // Also check children for the notification container
          if (node.querySelectorAll) {
            const foundNotifications = node.querySelectorAll('.new-sales-floating-container__inner');
            notifications.push(...Array.from(foundNotifications));
          }

          // Process each notification - check for all sale items inside
          notifications.forEach((notification) => {
            console.log('Flyp Auto Refresh: New sale notification detected!', notification);
            processSaleItems(notification);
          });
        }
      });
    });
  });

  // Start observing the document body for notification popups
  // IMPORTANT: We observe subtree deeply to catch changes inside the notification
  notificationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('Flyp Auto Refresh: Notification monitoring active - watching for .new-sales-floating-container__inner');
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSettings') {
    refreshIntervalMinutes = request.intervalMinutes || 30;
    isEnabled = request.enabled !== false;
    webhookUrl = request.webhookUrl || '';
    
    stopAutoRefresh();
    if (isEnabled) {
      startAutoRefresh();
    }
    
    // Start notification monitoring if webhook is configured
    if (webhookUrl) {
      startNotificationMonitoring();
    }
    
    sendResponse({ success: true });
  } else if (request.action === 'manualRefresh') {
    const clicked = clickRefreshButton();
    // Reset the countdown timer after manual refresh
    if (clicked && isEnabled) {
      nextRefreshTime = Date.now() + (refreshIntervalMinutes * 60 * 1000);
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
  }
  return true;
});

// Load settings from storage and start
chrome.storage.sync.get(['enabled', 'intervalMinutes', 'webhookUrl'], (result) => {
  isEnabled = result.enabled !== false; // Default to true
  refreshIntervalMinutes = result.intervalMinutes || 30;
  webhookUrl = result.webhookUrl || '';

  if (isEnabled) {
    startAutoRefresh();
  }

  // Start notification monitoring if webhook is configured
  if (webhookUrl) {
    startNotificationMonitoring();
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});
