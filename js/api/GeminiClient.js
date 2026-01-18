/**
 * Gemini AI Client
 * Direct API calls to Google Gemini using API key from proxy
 */
class GeminiClient {
    constructor() {
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    /**
     * Analyze message using Gemini AI
     * @param {string} message - User message to analyze
     * @returns {Promise<Object>} Analysis result with corrections, suggestions, and response
     */
    async analyzeMessage(message) {
        if (!message || typeof message !== 'string') {
            throw new Error('Message is required and must be a string');
        }

        try {
            // Get API key from proxy
            const apiKey = await window.apiProxyClient.getApiKey('gemini');

            // Korean detection
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

            const requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            };

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Gemini API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('No response content received from Gemini');
            }

            const text = data.candidates[0].content.parts[0].text;
            
            // Parse JSON response
            let botResponse;
            try {
                const cleanText = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
                botResponse = JSON.parse(cleanText);
            } catch (parseError) {
                console.warn('Failed to parse Gemini response as JSON:', parseError);
                // Fallback response
                botResponse = {
                    response: "Thank you for your message! I can see you're practicing English. Keep it up! What would you like to talk about?",
                    corrections: [],
                    suggestions: []
                };
            }

            return botResponse;

        } catch (error) {
            console.error('Gemini analysis error:', error);
            
            // Return user-friendly error response
            if (error.message.includes('API key')) {
                throw new Error('Authentication failed. Please try again later.');
            }
            
            if (error.message.includes('429')) {
                throw new Error('Too many requests. Please try again in a moment.');
            }
            
            if (error.message.includes('quota')) {
                throw new Error('Service quota exceeded. Please try again later.');
            }
            
            throw new Error('Analysis service temporarily unavailable. Please try again later.');
        }
    }

    /**
     * Analyze message with retry logic
     * @param {string} message - User message
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeMessageWithRetry(message, attempt = 1) {
        try {
            return await this.analyzeMessage(message);
        } catch (error) {
            // Retry on rate limit or server errors (max 2 attempts)
            if ((error.message.includes('429') || error.message.includes('500') || 
                 error.message.includes('502') || error.message.includes('503')) && attempt < 2) {
                console.log(`Retrying Gemini analysis attempt ${attempt + 1}`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                return this.analyzeMessageWithRetry(message, attempt + 1);
            }
            
            throw error;
        }
    }
}

// Create singleton instance
window.geminiClient = new GeminiClient();