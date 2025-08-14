// DeepL Translation API Netlify Function
// Handles translation requests with proper error handling, retries, and security

const https = require('https');

// Keep-alive agent for persistent connections (recommended by DeepL)
const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 5
});

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Method not allowed',
                message: 'Only POST requests are supported' 
            })
        };
    }

    // Validate API key exists
    if (!process.env.DEEPL_API_KEY) {
        console.error('DEEPL_API_KEY environment variable not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Server configuration error',
                message: 'Translation service not properly configured' 
            })
        };
    }

    try {
        // Parse and validate request body
        let requestData;
        try {
            requestData = JSON.parse(event.body || '{}');
        } catch (error) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid JSON',
                    message: 'Request body must be valid JSON' 
                })
            };
        }

        const { text, target_lang = 'KO' } = requestData;

        // Validate input parameters
        if (!text || !Array.isArray(text) || text.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid text parameter',
                    message: 'text must be a non-empty array of strings' 
                })
            };
        }

        // Validate text content
        for (const textItem of text) {
            if (typeof textItem !== 'string' || textItem.trim().length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid text content',
                        message: 'All text items must be non-empty strings' 
                    })
                };
            }
            
            if (textItem.length > 1000) {
                return {
                    statusCode: 413,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Text too long',
                        message: 'Text must be 1000 characters or less' 
                    })
                };
            }
        }

        // Supported target languages for DeepL free API
        const supportedLanguages = [
            'BG', 'CS', 'DA', 'DE', 'EL', 'EN', 'ES', 'ET', 'FI', 'FR',
            'HU', 'ID', 'IT', 'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL',
            'PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TR', 'UK', 'ZH'
        ];

        if (!supportedLanguages.includes(target_lang)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Unsupported target language',
                    message: `target_lang must be one of: ${supportedLanguages.join(', ')}` 
                })
            };
        }

        // Function to make translation request with retry logic
        const translateWithRetry = async (attempt = 1, maxAttempts = 3) => {
            try {
                console.log(`Translation attempt ${attempt} for text: "${text[0].substring(0, 50)}..."`);

                const response = await fetch('https://api-free.deepl.com/v2/translate', {
                    method: 'POST',
                    agent: httpsAgent,
                    headers: {
                        'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'EnglishTutorAI/1.0'
                    },
                    body: JSON.stringify({
                        text,
                        target_lang,
                        preserve_formatting: true,
                        split_sentences: 'nonewlines'
                    }),
                    timeout: 30000 // 30 second timeout
                });

                // Check for rate limiting or server errors that should be retried
                if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
                    const retryDelay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
                    console.log(`Retrying after ${retryDelay}ms due to status ${response.status}`);
                    
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return translateWithRetry(attempt + 1, maxAttempts);
                }

                // Handle various error status codes
                if (!response.ok) {
                    const errorBody = await response.text().catch(() => 'Unknown error');
                    console.error(`DeepL API error ${response.status}: ${errorBody}`);

                    let errorMessage;
                    switch (response.status) {
                        case 400:
                            errorMessage = 'Invalid request parameters';
                            break;
                        case 403:
                            errorMessage = 'Invalid API key or access denied';
                            break;
                        case 404:
                            errorMessage = 'API endpoint not found';
                            break;
                        case 413:
                            errorMessage = 'Text too large for translation';
                            break;
                        case 429:
                            errorMessage = 'Too many requests - quota exceeded';
                            break;
                        case 456:
                            errorMessage = 'Translation quota exceeded';
                            break;
                        case 500:
                        case 502:
                        case 503:
                        case 504:
                            errorMessage = 'DeepL service temporarily unavailable';
                            break;
                        default:
                            errorMessage = `DeepL API error (${response.status})`;
                    }

                    throw new Error(errorMessage);
                }

                const translationResult = await response.json();
                
                // Validate response structure
                if (!translationResult || !translationResult.translations || 
                    !Array.isArray(translationResult.translations) || 
                    translationResult.translations.length === 0) {
                    throw new Error('Invalid response from DeepL API');
                }

                console.log(`Translation successful: "${text[0]}" -> "${translationResult.translations[0].text}"`);
                return translationResult;

            } catch (error) {
                // Retry on network errors
                if (attempt < maxAttempts && 
                    (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || 
                     error.code === 'ENOTFOUND' || error.name === 'FetchError')) {
                    
                    const retryDelay = Math.pow(2, attempt) * 1000;
                    console.log(`Retrying after network error: ${error.message} (delay: ${retryDelay}ms)`);
                    
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    return translateWithRetry(attempt + 1, maxAttempts);
                }

                throw error;
            }
        };

        // Perform translation with retry logic
        const translationResult = await translateWithRetry();

        // Return successful response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(translationResult)
        };

    } catch (error) {
        console.error('Translation function error:', error);

        // Determine appropriate error response
        let statusCode = 500;
        let message = 'Internal server error';

        if (error.message.includes('Too many requests') || error.message.includes('quota exceeded')) {
            statusCode = 429;
            message = 'Translation quota exceeded. Please try again later.';
        } else if (error.message.includes('Invalid API key') || error.message.includes('access denied')) {
            statusCode = 403;
            message = 'Translation service authentication failed';
        } else if (error.message.includes('temporarily unavailable') || error.message.includes('service')) {
            statusCode = 503;
            message = 'Translation service temporarily unavailable';
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
            statusCode = 504;
            message = 'Translation service timeout';
        } else if (error.message.includes('Invalid request') || error.message.includes('parameters')) {
            statusCode = 400;
            message = 'Invalid translation request';
        }

        return {
            statusCode,
            headers,
            body: JSON.stringify({ 
                error: 'Translation failed',
                message: message,
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            })
        };
    }
};

// Helper function for fetch with timeout (for older Node.js versions)
function fetch(url, options = {}) {
    return import('node-fetch').then(({ default: fetch }) => {
        if (options.timeout) {
            const { timeout, ...fetchOptions } = options;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            return fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));
        }
        
        return fetch(url, options);
    });
}