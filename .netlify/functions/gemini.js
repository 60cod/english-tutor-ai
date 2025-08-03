import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable is not set.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 요청 (프리플라이트 요청) 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: headers,
      body: '',
    };
  }

  // POST 요청만 처리
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: headers,
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

    const prompt = `
Analyze this English message: "${message}"

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON 파싱 시도
    let botResponse;
    try {
      const cleanText = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      botResponse = JSON.parse(cleanText);
    } catch (parseError) {
      // JSON 파싱 실패 시 기본 응답
      botResponse = {
        response: "Thank you for your message! I can see you're practicing English. Keep it up! What would you like to talk about?",
        corrections: [],
        suggestions: []
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(botResponse)
    };

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        response: "Sorry, I'm having trouble analyzing your message right now. Please try again later.",
        corrections: [],
        suggestions: []
      })
    };
  }
};