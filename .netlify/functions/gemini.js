exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { message } = JSON.parse(event.body);
    
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    const result = await analyzeAndRespond(message);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        response: "Sorry, I'm having trouble analyzing your message right now. Please try again later.",
        corrections: [],
        suggestions: []
      })
    };
  }
};

const analyzeAndRespond = async (userMessage) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const maxRetries = 3;
  let retryCount = 0;

  const prompt = `
Analyze this English message: "${userMessage}"

Return JSON format:
{
  "corrections": ["corrected sentence: reason"],
  "suggestions": ["improved expression"],
  "response": "brief 2-3 line reply with a follow-up question"
}

Rules:
- corrections: show corrected sentence with brief reason
- suggestions: just the improved expression, no extra words
- response: keep short, ask follow-up question
- Use professional but friendly tone
`;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      });

      if (response.status === 429 || response.status === 503) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response");

      text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const botResponse = JSON.parse(text);
      return botResponse;

    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      retryCount++;
      if (retryCount >= maxRetries) {
        return getSimpleResponse(userMessage);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
};

const getSimpleResponse = (userMessage) => {
  return {
    response: "Thank you for your message! I'm having some technical difficulties right now, but I can see you're practicing English. Keep it up! What would you like to talk about?",
    corrections: [],
    suggestions: []
  };
};