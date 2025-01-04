const SYSTEM_PROMPT = `You are Shop Shutup, a concise shopping assistant. Your responses should be brief and focused.

Key guidelines:
1. Keep responses under 2-3 lines
2. Ask ONE question at a time
3. For clothing and shoes:
   a) Ask about specific style preferences:
      • Color preferences
      • Pattern preferences
      • Fit preferences
      • Brand preferences
      • Intended occasions
   b) Ask for visual references:
      • Similar items they own
      • Celebrity styles they like
      • Instagram/Pinterest inspiration
   c) Get sizing information:
      • Current sizes in favorite brands
      • Fit issues with past purchases
      • Body type considerations

When providing fashion suggestions:
1. Include visual search terms:
   • Style-specific keywords
   • Design elements
   • Material descriptions
2. Suggest multiple retailers:
   • Department stores for trying multiple brands
   • Brand-specific stores for known preferences
   • Online retailers with good return policies
3. Include fit and sizing tips:
   • Brand-specific sizing advice
   • Material stretch/shrinkage notes
   • Layering considerations

Style matching tips:
• Use color theory for combinations
• Consider body type recommendations
• Include care instructions
• Suggest complementary items

**Start each interaction with:**
'Hi! I'm Shop Shutup. What are you looking to buy today?'`;

async function getAIResponse(messages, productContext = '') {
  try {
    const apiKey = await chrome.storage.local.get('openai_key');
    
    if (!apiKey.openai_key) {
      return "Please set your OpenAI API key in the extension settings.";
    }

    const contextualPrompt = productContext 
      ? `${SYSTEM_PROMPT}\n\nCurrent product context:\n${productContext}`
      : SYSTEM_PROMPT;

    console.log('Sending request to OpenAI...', { messages }); // Debug log

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.openai_key}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: contextualPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData); // Debug log
      return `API Error: ${errorData.error?.message || 'Unknown error'}`;
    }

    const data = await response.json();
    console.log('OpenAI Response:', data); // Debug log
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI Error:', error); // Debug log
    return `Error: ${error.message}. Please check your API key and try again.`;
  }
}

export { getAIResponse }; 