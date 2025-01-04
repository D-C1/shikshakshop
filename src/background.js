// Handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  // Skip chrome:// URLs
  if (tab.url.startsWith('chrome://')) return;

  try {
    // First try to send a message to check if content script is loaded
    const response = await chrome.tabs.sendMessage(tab.id, { action: "ping" }).catch(() => false);
    
    if (!response) {
      // If content script isn't loaded, inject it
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['contentScript.js']
      });
    }
    
    // Now send the toggle message
    chrome.tabs.sendMessage(tab.id, { action: "toggle" });
  } catch (error) {
    console.error('Error:', error);
  }
}); 