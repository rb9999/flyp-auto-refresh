// Content script that runs on the Flyp orders page
let autoRefreshInterval = null;
let refreshIntervalMinutes = 30; // Default to 30 minutes
let isEnabled = true;
let nextRefreshTime = null; // Track when the next refresh will happen
let webhookUrl = ''; // Discord webhook URL
let notificationObserver = null; // MutationObserver for notifications
let processedNotifications = new Set(); // Track processed notifications to avoid duplicates
let killSwitchActive = false; // Track if extension has been remotely disabled
let killSwitchCheckInterval = null; // Interval for checking kill switch

// Function to check kill switch status
async function checkKillSwitch() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/rb9999/flyp-auto-refresh/main/status.json', {
      cache: 'no-store' // Always get fresh data
    });

    if (!response.ok) {
      console.log('Flyp Auto Refresh: Could not check kill switch status');
      return;
    }

    const status = await response.json();

    if (status.active === false) {
      console.log('Flyp Auto Refresh: Extension has been remotely disabled');
      killSwitchActive = true;
      stopAutoRefresh();

      if (notificationObserver) {
        notificationObserver.disconnect();
        notificationObserver = null;
      }

      // Show alert to user if there's a message
      if (status.message) {
        alert(`Flyp Auto Refresh: ${status.message}`);
      } else {
        alert('Flyp Auto Refresh has been temporarily disabled. Please check for updates.');
      }
    } else {
      killSwitchActive = false;
    }
  } catch (error) {
    console.log('Flyp Auto Refresh: Error checking kill switch', error);
  }
}

// Function to click the refresh button
function clickRefreshButton() {
  if (killSwitchActive) {
    console.log('Flyp Auto Refresh: Extension is disabled via kill switch');
    return false;
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
  if (killSwitchActive) {
    console.log('Flyp Auto Refresh: Cannot start - extension is disabled via kill switch');
    return;
  }

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

// Function to monitor for sale notifications
function startNotificationMonitoring() {
  if (killSwitchActive) {
    console.log('Flyp Auto Refresh: Cannot start monitoring - extension is disabled via kill switch');
    return;
  }

  // Stop existing observer if any
  if (notificationObserver) {
    notificationObserver.disconnect();
  }

  console.log('Flyp Auto Refresh: Starting notification monitoring for sale popups');
  
  // Create a MutationObserver to watch for new notifications
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
          
          // Process each notification
          notifications.forEach((notification) => {
            console.log('Flyp Auto Refresh: New sale notification detected!', notification);

            // Extract sale data immediately
            const saleData = extractSaleData(notification);

            console.log('Flyp Auto Refresh: Extracted sale data:', saleData);

            // Create a unique ID using item name + price + timestamp (rounded to nearest 10 seconds)
            // This prevents true duplicates but allows same item to sell multiple times
            const timestamp = Math.floor(Date.now() / 10000); // Round to 10-second intervals
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
      });
    });
  });
  
  // Start observing the document body for notification popups
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
chrome.storage.sync.get(['enabled', 'intervalMinutes', 'webhookUrl'], async (result) => {
  isEnabled = result.enabled !== false; // Default to true
  refreshIntervalMinutes = result.intervalMinutes || 30;
  webhookUrl = result.webhookUrl || '';

  // Check kill switch first
  await checkKillSwitch();

  if (killSwitchActive) {
    console.log('Flyp Auto Refresh: Extension is disabled via kill switch');
    return;
  }

  if (isEnabled) {
    startAutoRefresh();
  }

  // Start notification monitoring if webhook is configured
  if (webhookUrl) {
    startNotificationMonitoring();
  }

  // Check kill switch every hour
  killSwitchCheckInterval = setInterval(checkKillSwitch, 60 * 60 * 1000); // 1 hour
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
  if (killSwitchCheckInterval) {
    clearInterval(killSwitchCheckInterval);
  }
});
