// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const enabledCheckbox = document.getElementById('enabled');
  const intervalInput = document.getElementById('interval');
  const webhookUrlInput = document.getElementById('webhookUrl');
  const saveBtn = document.getElementById('saveBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const statusDiv = document.getElementById('status');
  const countdownDiv = document.getElementById('countdown');
  const countdownTimer = document.getElementById('countdownTimer');
  let countdownInterval = null;
  
  // Load current settings
  chrome.storage.sync.get(['enabled', 'intervalMinutes', 'webhookUrl'], (result) => {
    enabledCheckbox.checked = result.enabled !== false;
    intervalInput.value = result.intervalMinutes || 30;
    webhookUrlInput.value = result.webhookUrl || '';
    
    // Start countdown display
    updateCountdown();
  });
  
  // Format time as MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Update countdown timer
  function updateCountdown() {
    // Clear existing interval
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    // Get countdown info from chrome.storage (accessible from any tab)
    chrome.storage.local.get(['nextRefreshTime', 'isEnabled', 'intervalMinutes'], (result) => {
      if (chrome.runtime.lastError || !result.isEnabled || !result.nextRefreshTime) {
        countdownDiv.style.display = 'none';
        return;
      }

      countdownDiv.style.display = 'block';

      // Store initial nextRefreshTime
      let currentNextRefreshTime = result.nextRefreshTime;

      // Update countdown every second
      countdownInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.floor((currentNextRefreshTime - now) / 1000));

        if (timeLeft <= 0) {
          countdownTimer.textContent = 'Refreshing...';
          // Refresh the countdown info after 2 seconds
          setTimeout(() => {
            // Re-read from storage to get updated time
            chrome.storage.local.get(['nextRefreshTime'], (newResult) => {
              if (newResult.nextRefreshTime) {
                currentNextRefreshTime = newResult.nextRefreshTime;
              }
            });
          }, 2000);
        } else {
          countdownTimer.textContent = formatTime(timeLeft);
        }
      }, 1000);
    });
  }
  
  // Refresh countdown when popup opens
  setInterval(updateCountdown, 5000);
  
  // Show status message
  function showStatus(message, isSuccess = false) {
    statusDiv.textContent = message;
    statusDiv.className = 'status' + (isSuccess ? ' success' : '');
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
  
  // Save settings
  saveBtn.addEventListener('click', () => {
    const enabled = enabledCheckbox.checked;
    const intervalMinutes = parseInt(intervalInput.value);
    const webhookUrl = webhookUrlInput.value.trim();

    if (intervalMinutes < 10 || intervalMinutes > 1440) {
      showStatus('Please enter a value between 10 and 1440 minutes');
      return;
    }
    
    // Validate webhook URL if provided
    if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      showStatus('Invalid Discord webhook URL');
      return;
    }
    
    // Save to storage
    chrome.storage.sync.set({
      enabled: enabled,
      intervalMinutes: intervalMinutes,
      webhookUrl: webhookUrl
    }, () => {
      // Send message to content script to update (if Flyp tab is open)
      chrome.tabs.query({}, (tabs) => {
        // Find any Flyp orders tabs and update them all
        const flypTabs = tabs.filter(tab => tab.url && tab.url.includes('tools.joinflyp.com/orders'));

        if (flypTabs.length > 0) {
          let responsesReceived = 0;
          const totalTabs = flypTabs.length;

          flypTabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'updateSettings',
              enabled: enabled,
              intervalMinutes: intervalMinutes,
              webhookUrl: webhookUrl
            }, (response) => {
              responsesReceived++;

              // Once all tabs have responded, update the countdown
              if (responsesReceived === totalTabs) {
                if (countdownInterval) {
                  clearInterval(countdownInterval);
                  countdownInterval = null;
                }
                // Wait a bit for storage to be updated by content script
                setTimeout(updateCountdown, 200);
              }

              if (chrome.runtime.lastError) {
                // Ignore errors for background tabs
              }
            });
          });
          showStatus('Settings saved successfully!', true);
        } else {
          showStatus('Settings saved! Open the Flyp orders page to activate.');
          // No Flyp tabs open, just hide countdown
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }
          countdownDiv.style.display = 'none';
        }
      });
    });
  });
  
  // Manual refresh
  refreshBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        showStatus('Error: No active tab found');
        return;
      }

      const currentUrl = tabs[0].url;
      console.log('Current URL:', currentUrl);

      if (!currentUrl || !currentUrl.includes('tools.joinflyp.com')) {
        showStatus('Please navigate to tools.joinflyp.com/orders first');
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'manualRefresh'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error:', chrome.runtime.lastError);
          showStatus('Error: Try reloading the page and clicking again');
        } else if (response && response.success) {
          showStatus('Refreshed!', true);
          // Update countdown after manual refresh
          setTimeout(updateCountdown, 500);
        } else {
          showStatus('Could not find refresh button. Check console (F12).');
        }
      });
    });
  });

  // Buy Me a Coffee button
  const coffeeBtn = document.getElementById('coffeeBtn');
  coffeeBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://buymeacoffee.com/rb9999' });
  });

  // About button and modal
  const aboutBtn = document.getElementById('aboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  aboutBtn.addEventListener('click', () => {
    aboutModal.style.display = 'block';
  });

  closeModalBtn.addEventListener('click', () => {
    aboutModal.style.display = 'none';
  });

  // Close modal when clicking outside of it
  aboutModal.addEventListener('click', (event) => {
    if (event.target === aboutModal) {
      aboutModal.style.display = 'none';
    }
  });

  // Handle link clicks in modal
  aboutModal.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      chrome.tabs.create({ url: event.target.href });
    });
  });

  // CSV Export Helper Functions
  function convertToCSV(items) {
    const csvRows = [];

    // Add data rows (no headers)
    items.forEach(item => {
      const row = [
        escapeCsvValue(item.itemName),
        escapeCsvValue(item.dateListed),
        escapeCsvValue(item.price),
        escapeCsvValue(item.marketplaces)
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  function escapeCsvValue(value) {
    // Handle undefined or null values
    if (!value) {
      return '';
    }
    // Convert to string if not already
    const stringValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
  }

  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }

  // Export Modal Handlers
  const exportBtn = document.getElementById('exportBtn');
  const exportModal = document.getElementById('exportModal');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const closeExportModalBtn = document.getElementById('closeExportModalBtn');

  // Open export modal when Export button clicked
  exportBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        showStatus('Error: No active tab found');
        return;
      }

      const currentUrl = tabs[0].url;

      // Check if on correct page
      if (!currentUrl || !currentUrl.includes('tools.joinflyp.com/my-items')) {
        showStatus('Please navigate to https://tools.joinflyp.com/my-items first');
        return;
      }

      // Open the export modal
      exportModal.style.display = 'block';
    });
  });

  // Close export modal
  closeExportModalBtn.addEventListener('click', () => {
    exportModal.style.display = 'none';
  });

  // Close modal when clicking outside of it
  exportModal.addEventListener('click', (event) => {
    if (event.target === exportModal) {
      exportModal.style.display = 'none';
    }
  });

  // Export to CSV button in modal
  exportCsvBtn.addEventListener('click', async () => {
    console.log('Export CSV button clicked');
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Active tab:', tab.url);

      // Check if we're on the correct page
      if (!tab.url || !tab.url.includes('tools.joinflyp.com/my-items')) {
        console.log('Not on my-items page');
        showStatus('Please navigate to https://tools.joinflyp.com/my-items first!');
        exportModal.style.display = 'none';
        return;
      }

      console.log('Sending scrapeInventory message to content script');
      // Send message to content script to scrape data
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeInventory' }, (response) => {
        console.log('Received response:', response);
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          showStatus('Error: ' + chrome.runtime.lastError.message);
          exportModal.style.display = 'none';
          return;
        }

        if (response && response.success) {
          const items = response.data;
          console.log('Items scraped:', items.length);

          if (items.length === 0) {
            showStatus('No items found on the page.');
            exportModal.style.display = 'none';
            return;
          }

          // Convert to CSV (no headers)
          const csv = convertToCSV(items);
          console.log('CSV generated, downloading...');

          downloadCSV(csv, 'flyp-inventory.csv');

          showStatus(`Successfully exported ${items.length} items!`, true);
          exportModal.style.display = 'none';
        } else {
          console.error('Failed to scrape data, response:', response);
          showStatus('Failed to scrape data.');
          exportModal.style.display = 'none';
        }
      });
    } catch (error) {
      console.error('Export error:', error);
      showStatus('Error: ' + error.message);
      exportModal.style.display = 'none';
    }
  });
});
