import { getAIResponse } from './ai.js';

// Add marketplace configurations
const MARKETPLACES = {
  amazon: {
    name: 'Amazon',
    searchUrl: 'https://www.amazon.com/s',
    buildSearchUrl: (query, filters) => {
      const params = new URLSearchParams({
        k: query,
        rh: buildAmazonFilters(filters)
      });
      return `https://www.amazon.com/s?${params.toString()}`;
    }
  },
  walmart: {
    name: 'Walmart',
    searchUrl: 'https://www.walmart.com/search',
    buildSearchUrl: (query, filters) => {
      const params = new URLSearchParams({
        q: query,
        min_price: filters.minPrice ? filters.minPrice / 100 : '',
        max_price: filters.maxPrice ? filters.maxPrice / 100 : '',
        rating: filters.minRating ? filters.minRating : ''
      });
      return `https://www.walmart.com/search?${params.toString()}`;
    }
  },
  bestbuy: {
    name: 'Best Buy',
    searchUrl: 'https://www.bestbuy.com/site/searchpage.jsp',
    buildSearchUrl: (query, filters) => {
      const params = new URLSearchParams({
        st: query,
        cp: filters.minPrice ? filters.minPrice / 100 : '',
        cp: filters.maxPrice ? filters.maxPrice / 100 : ''
      });
      return `https://www.bestbuy.com/site/searchpage.jsp?${params.toString()}`;
    }
  },
  nordstrom: {
    name: 'Nordstrom',
    buildSearchUrl: (query, filters) => {
      const params = new URLSearchParams({
        keyword: query,
        filterByColor: filters.colors,
        filterBySize: filters.sizes
      });
      return `https://shop.nordstrom.com/sr?${params.toString()}`;
    }
  },
  pinterest: {
    name: 'Pinterest',
    buildSearchUrl: (query) => {
      return `https://pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
    }
  }
};

// Create and inject the chat interface
function createChatInterface() {
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
    display: none;
    font-family: Arial, sans-serif;
  `;
  
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
  
  // Session context
   let sessionContext = {
     category: null,      // e.g., "clothing", "electronics"
     preferences: {},     // gathered during conversation
     searchHistory: []    // keep track of what's been suggested
   };

  // Add message to chat
  function addMessage(text, isUser = false) {
    const messagesDiv = container.querySelector('#chat-messages');
    const messageDiv = document.createElement('div');
    
    // Convert [[Product Name|URL|Platform]] format to clickable links
    const linkPattern = /\[\[(.*?)\|(.*?)(?:\|(.*?))?\]\]/g;
    const textWithLinks = text.replace(linkPattern, (match, name, url, platform = 'amazon') => {
      if (!url.startsWith('http')) {
        // Extract filter hints and build search URL
        const filterHints = extractFilterHints(name);
        const cleanName = name.replace(/\[.*?\]/g, '').trim();
        const searchUrl = buildSearchUrl(cleanName, filterHints, platform.toLowerCase());
        
        return `<a href="${searchUrl}" target="_blank" style="
          color: #0066cc;
          text-decoration: underline;
          cursor: pointer;
        ">${cleanName} (Search on ${MARKETPLACES[platform].name})</a>`;
      }
      return `<a href="${url}" target="_blank">${name}</a>`;
    });
    
    messageDiv.innerHTML = textWithLinks;
    
    // Enable link clicking
    messageDiv.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(link.href, '_blank');
      });
    });
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Add message to history
    messageHistory.push({
      role: isUser ? 'user' : 'assistant',
      content: text
    });
    
    // Update session context based on conversation
    if (isUser) {
      updateSessionContext(text);
    }
  }

  function updateSessionContext(message) {
    // Extract context from user messages
    if (message.toLowerCase().includes('clothing') || 
        message.toLowerCase().includes('shoes')) {
      sessionContext.category = 'fashion';
    }
    // Add more category detection as needed
  }

  // Show initial greeting
  addMessage("Let's ShikShakShop! Tell me what fashion piece you're dreaming of today.", false);

  // Handle sending messages
  async function handleSendMessage() {
    const input = container.querySelector('#chat-input');
    const message = input.value.trim();
    if (message) {
      // Get current page context if on a product page
      let productContext = '';
      if (window.location.hostname.includes('amazon.com')) {
        productContext = getAmazonProductContext();
      }
      
      addMessage(message, true);
      input.value = '';
      
      // Show typing indicator
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
        // Get AI response
        const response = await getAIResponse(messageHistory, productContext);
        typingDiv.remove();
        addMessage(response);
      } catch (error) {
        console.error('Chat Error:', error); // Debug log
        typingDiv.remove();
        addMessage("Sorry, I encountered an error. Please try again.");
      }
    }
  }

  // Event listeners
  container.querySelector('#send-message').addEventListener('click', handleSendMessage);
  container.querySelector('#chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });
  container.querySelector('#close-chat').addEventListener('click', () => {
    container.style.display = 'none';
  });

  return container;
}

// Initialize
let chatContainer = null;

// Listen for toggle message from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);  // Debug log
  
  if (message.action === "ping") {
    sendResponse(true);
    return;
  }
  
  if (message.action === "toggle") {
    if (!chatContainer) {
      console.log('Creating chat interface');  // Debug log
      chatContainer = createChatInterface();
      console.log('Chat interface created, container:', chatContainer); // Debug log
    }
    
    chatContainer.style.display = 
      chatContainer.style.display === 'none' ? 'block' : 'none';
    console.log('Chat visibility:', chatContainer.style.display);  // Debug log
    console.log('Messages container:', chatContainer.querySelector('#chat-messages')); // Debug log
    
    sendResponse({ success: true });
  }
  
  // Required for async response
  return true;
});

console.log('Content script loaded');  // Debug log 

function getAmazonProductContext() {
  try {
    // Get product title
    const title = document.getElementById('productTitle')?.textContent.trim() || '';
    
    // Get price
    const priceElement = document.querySelector('.a-price .a-offscreen');
    const price = priceElement?.textContent.trim() || '';
    
    // Get rating
    const ratingElement = document.querySelector('#acrPopover');
    const rating = ratingElement?.title.trim() || '';
    
    // Get number of reviews
    const reviewCount = document.getElementById('acrCustomerReviewText')?.textContent.trim() || '';
    
    // Get category/breadcrumb
    const breadcrumb = Array.from(document.querySelectorAll('#wayfinding-breadcrumbs_container .a-link-normal'))
      .map(el => el.textContent.trim())
      .join(' > ');
    
    // Get product features
    const features = [];
    document.querySelectorAll('#feature-bullets .a-list-item').forEach((item, index) => {
      const feature = item.textContent.trim();
      if (feature) features.push(feature);
    });
    
    // Get review highlights
    const reviewHighlights = [];
    document.querySelectorAll('div[data-hook="review-collapsed"] .review-text').forEach((item, index) => {
      if (index < 5) { // Get top 5 reviews
        const highlight = item.textContent.trim();
        if (highlight) reviewHighlights.push(highlight);
      }
    });
    
    // Format the context
    const context = `
Product: ${title}
Category: ${breadcrumb}
Price: ${price}
Rating: ${rating} (${reviewCount})

Key Features:
${features.map(f => `• ${f}`).join('\n')}

Recent Reviews:
${reviewHighlights.map(h => `• ${h}`).join('\n')}
    `.trim();
    
    console.log('Product Context:', context); // Debug log
    return context;
  } catch (error) {
    console.error('Error getting product context:', error);
    return '';
  }
} 

function buildSearchUrl(productName, filters = {}, marketplace = 'amazon') {
  const platform = MARKETPLACES[marketplace] || MARKETPLACES.amazon;
  
  // Add session-specific filters
  if (sessionContext.category === 'fashion') {
    filters = {
      ...filters,
      department: 'fashion',
      // Add any preferences gathered during this session
      ...sessionContext.preferences
    };
  }
  
  return platform.buildSearchUrl(productName, filters);
}

function buildFilterString(filters) {
  const filterParts = [];
  
  // Price range
  if (filters.minPrice) {
    // Add 20% buffer to price range
    const minPrice = Math.floor(filters.minPrice * 0.8);  // 20% below
    const maxPrice = filters.maxPrice ? Math.ceil(filters.maxPrice * 1.2) : '';  // 20% above
    filterParts.push(`p_36:${minPrice}-${maxPrice}`);
  }
  
  // Average rating
  if (filters.minRating) filterParts.push(`p_72:${filters.minRating}00-`);
  
  // Prime eligible
  if (filters.prime) filterParts.push('p_85:2470955011');
  
  // Department/category
  if (filters.department) filterParts.push(`n:${filters.department}`);
  
  return filterParts.join('|');
} 

// Helper function to extract filter hints
function extractFilterHints(text) {
  const hints = {
    minRating: text.includes('4.5+ stars') ? 4.5 : 4,
    prime: false  // Removed Amazon-specific prime filter
  };

  const priceMatch = text.match(/\$(\d+)-(\d+)/);
  if (priceMatch) {
    hints.minPrice = Math.floor(priceMatch[1] * 100 * 0.8);  // 20% buffer
    hints.maxPrice = Math.ceil(priceMatch[2] * 100 * 1.2);
  }

  return hints;
} 