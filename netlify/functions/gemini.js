import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable is not set.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

    // 한글 감지
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(message);
    
    const prompt = isKorean 
      ? `한국어 메시지를 자연스러운 원어민 일상 영어로 번역하고 표현을 제안해주세요: "${message}"

Return JSON format:
{
  "corrections": [],
  "suggestions": ["natural native-like expression 1", "casual everyday expression 2", "alternative colloquial expression 3"],
  "response": "brief encouraging response in English with a follow-up question"
}

Rules:
- corrections: always empty array for Korean input
- suggestions: provide 2-3 natural, native-like English expressions that sound conversational and authentic
- Focus on how native speakers would actually say it in everyday casual situations
- Avoid overly formal or textbook English - use colloquial, natural expressions
- Include contractions and informal language where appropriate (like "I'm", "gonna", "wanna", etc.)
- response: keep short, encouraging, ask follow-up question in English
- Make it sound like something you'd hear in a casual conversation between friends`
      : `Analyze this English message: "${message}"

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
- Use professional but friendly tone`;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const result = await model.generateContent({ contents: chatHistory });
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