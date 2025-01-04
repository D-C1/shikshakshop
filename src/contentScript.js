import { getAIResponse } from './ai.js';

function createChatInterface() {
  console.log('Creating chat interface...');
  const container = document.createElement('div');
  container.id = 'shikshak-assistant';
  container.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 300px;
    height: 400px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 9999;
    display: block;
    font-family: Arial, sans-serif;
  `;

  const styles = document.createElement('style');
  styles.textContent = `
    .message {
      margin: 15px 0;
      padding: 12px 15px;
      border-radius: 15px;
      max-width: 85%;
      line-height: 1.4;
    }
    
    .user-message {
      background: #6B46C1;
      color: white;
      margin-left: auto;
      border-bottom-right-radius: 5px;
    }
    
    .ai-message {
      background: white;
      color: #2D3748;
      margin-right: auto;
      border-bottom-left-radius: 5px;
      border: 1px solid #E2E8F0;
    }
  `;
  document.head.appendChild(styles);

  container.innerHTML = `
    <div style="padding: 16px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0;">ShikShakShop</h3>
        <button id="close-chat" style="border: none; background: none; cursor: pointer;">×</button>
      </div>
      <div id="chat-messages" style="
        flex-grow: 1;
        overflow-y: auto;
        margin-bottom: 16px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 4px;
      "></div>
      <div style="display: flex; gap: 8px;">
        <input type="text" id="chat-input" placeholder="Type your message..." style="
          flex-grow: 1;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          outline: none;
        ">
        <button id="send-message" style="
          padding: 8px 16px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Send</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  let messageHistory = [
    { role: 'assistant', content: "Let's ShikShakShop! Tell me what fashion piece you're dreaming of today." }
  ];
  console.log('Initial message:', messageHistory[0].content);

  function addMessage(text, isUser = false) {
    console.log('Adding message:', text, 'isUser:', isUser);
    const messagesDiv = container.querySelector('#chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    // Convert markdown-style links to HTML
    const textWithLinks = text.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
      return `<a href="${url}" target="_blank" style="
        color: ${isUser ? 'white' : '#6B46C1'};
        text-decoration: underline;
        cursor: pointer;
      ">${text}</a>`;
    });
    
    messageDiv.innerHTML = textWithLinks;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    messageHistory.push({
      role: isUser ? 'user' : 'assistant',
      content: text
    });
  }

  async function handleSendMessage() {
    const input = container.querySelector('#chat-input');
    const message = input.value.trim();
    if (message) {
      let productContext = '';
      if (window.location.hostname.includes('amazon.com')) {
        productContext = getAmazonProductContext();
      }
      
      addMessage(message, true);
      input.value = '';
      
      const typingDiv = document.createElement('div');
      typingDiv.textContent = "Typing...";
      typingDiv.style.cssText = `
        margin: 8px 0;
        padding: 8px 12px;
        color: #666;
        font-style: italic;
      `;
      container.querySelector('#chat-messages').appendChild(typingDiv);
      
      try {
        const response = await getAIResponse(messageHistory, productContext);
        typingDiv.remove();
        addMessage(response);
      } catch (error) {
        console.error('Chat Error:', error);
        typingDiv.remove();
        addMessage("Sorry, I encountered an error. Please try again.");
      }
    }
  }

  container.querySelector('#send-message').addEventListener('click', handleSendMessage);
  container.querySelector('#chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });
  container.querySelector('#close-chat').addEventListener('click', () => {
    container.style.display = 'none';
  });

  // Show initial message immediately after container is added
  setTimeout(() => {
    addMessage(messageHistory[0].content, false);
  }, 100);

  return container;
}

// Initialize
let chatContainer = null;

// Listen for toggle message from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  if (message.action === "toggle") {
    if (!chatContainer) {
      chatContainer = createChatInterface();
    } else {
      // Toggle display only for subsequent clicks
      chatContainer.style.display = 
        chatContainer.style.display === 'none' ? 'block' : 'none';
    }
    console.log('Chat visibility:', chatContainer.style.display);
    
    sendResponse({ success: true });
  }
  return true;
});

function getAmazonProductContext() {
  try {
    const title = document.getElementById('productTitle')?.textContent.trim() || '';
    const priceElement = document.querySelector('.a-price .a-offscreen');
    const price = priceElement?.textContent.trim() || '';
    const ratingElement = document.querySelector('#acrPopover');
    const rating = ratingElement?.title.trim() || '';
    const reviewCount = document.getElementById('acrCustomerReviewText')?.textContent.trim() || '';
    
    const context = `Product: ${title}\nPrice: ${price}\nRating: ${rating} (${reviewCount})`.trim();
    return context;
  } catch (error) {
    console.error('Error getting product context:', error);
    return '';
  }
} 