document.getElementById('save').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  chrome.storage.local.set({ openai_key: apiKey }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved!';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
});

// Load saved key
chrome.storage.local.get('openai_key', (data) => {
  if (data.openai_key) {
    document.getElementById('apiKey').value = data.openai_key;
  }
}); 