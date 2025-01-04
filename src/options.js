document.addEventListener('DOMContentLoaded', () => {
  // Load saved API key
  chrome.storage.local.get(['openai_key'], function(result) {
    if (result.openai_key) {
      document.getElementById('apiKey').value = result.openai_key;
    }
  });

  // Save API key
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (apiKey) {
      chrome.storage.local.set({ openai_key: apiKey }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        setTimeout(() => status.textContent = '', 2000);
      });
    }
  });
}); 