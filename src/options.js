document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.local.get(['openai_key', 'preferred_platforms'], (data) => {
    if (data.openai_key) {
      document.getElementById('apiKey').value = data.openai_key;
    }
    if (data.preferred_platforms) {
      Object.keys(data.preferred_platforms).forEach(platform => {
        const checkbox = document.getElementById(`platform_${platform}`);
        if (checkbox) checkbox.checked = data.preferred_platforms[platform];
      });
    }
  });

  // Save settings
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    const preferred_platforms = {
      nordstrom: document.getElementById('platform_nordstrom').checked,
      macys: document.getElementById('platform_macys').checked,
      zara: document.getElementById('platform_zara').checked,
      pinterest: document.getElementById('platform_pinterest').checked
    };

    chrome.storage.local.set({ 
      openai_key: apiKey,
      preferred_platforms
    }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved!';
      setTimeout(() => status.textContent = '', 2000);
    });
  });
}); 