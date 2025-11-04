// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Flyp Auto Refresh extension installed');
  
  // Set default values
  chrome.storage.sync.set({
    enabled: true,
    intervalMinutes: 30
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refreshClicked') {
    console.log('Refresh clicked at:', request.timestamp);
    // You could add notifications here if desired
  }
});
