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
  const updateBanner = document.getElementById('updateBanner');
  const updateText = document.getElementById('updateText');

  let countdownInterval = null;

  // Check for updates
  checkForUpdates();
  
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
    
    // Check if we're on the Flyp page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes('tools.joinflyp.com')) {
        countdownDiv.style.display = 'none';
        return;
      }
      
      // Get countdown info from content script
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'getCountdown'
      }, (response) => {
        if (chrome.runtime.lastError || !response) {
          countdownDiv.style.display = 'none';
          return;
        }
        
        if (!response.enabled || !response.nextRefreshTime) {
          countdownDiv.style.display = 'none';
          return;
        }
        
        countdownDiv.style.display = 'block';
        
        // Update countdown every second
        countdownInterval = setInterval(() => {
          const now = Date.now();
          const timeLeft = Math.max(0, Math.floor((response.nextRefreshTime - now) / 1000));
          
          if (timeLeft <= 0) {
            countdownTimer.textContent = 'Refreshing...';
            // Refresh the countdown info
            setTimeout(updateCountdown, 2000);
          } else {
            countdownTimer.textContent = formatTime(timeLeft);
          }
        }, 1000);
      });
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
    
    if (intervalMinutes < 1 || intervalMinutes > 1440) {
      showStatus('Please enter a value between 1 and 1440 minutes');
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
      // Send message to content script to update
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('tools.joinflyp.com/orders')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            enabled: enabled,
            intervalMinutes: intervalMinutes,
            webhookUrl: webhookUrl
          }, (response) => {
            if (chrome.runtime.lastError) {
              showStatus('Settings saved! Reload the page for changes to take effect.');
            } else {
              showStatus('Settings saved successfully!', true);
              // Update countdown with new settings
              setTimeout(updateCountdown, 500);
            }
          });
        } else {
          showStatus('Settings saved! Open the Flyp orders page to activate.');
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

  // Check for updates function
  async function checkForUpdates() {
    try {
      // Get current version from manifest
      const manifest = chrome.runtime.getManifest();
      const currentVersion = manifest.version;

      // Check if we've already checked today
      const lastCheck = await chrome.storage.local.get(['lastUpdateCheck']);
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (lastCheck.lastUpdateCheck && (now - lastCheck.lastUpdateCheck) < oneDayMs) {
        // Already checked today, skip
        return;
      }

      // Fetch latest release from GitHub
      const response = await fetch('https://api.github.com/repos/rb9999/flyp-auto-refresh/releases/latest');
      if (!response.ok) {
        console.log('Could not check for updates:', response.status);
        return;
      }

      const release = await response.json();
      const latestVersion = release.tag_name.replace('v', ''); // Remove 'v' prefix

      // Store last check time
      chrome.storage.local.set({ lastUpdateCheck: now });

      // Compare versions
      if (compareVersions(latestVersion, currentVersion) > 0) {
        // New version available
        updateText.textContent = `🆕 Version ${latestVersion} available! Click to download`;
        updateBanner.style.display = 'block';
        updateBanner.addEventListener('click', () => {
          chrome.tabs.create({ url: release.html_url });
        });
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
    }
  }

  // Compare version strings (e.g., "1.2" vs "1.1")
  function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    return 0;
  }
});
