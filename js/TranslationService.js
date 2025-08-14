// TranslationService.js - DeepL API integration with caching and rate limiting
class TranslationService {
    constructor() {
        this.cache = new Map(); // Cache translations to avoid duplicate API calls
        this.rateLimiter = new RateLimiter(10, 1000); // 10 requests per second max
        this.pendingRequests = new Map(); // Prevent duplicate simultaneous requests
    }
    
    async translateText(text, targetLang = 'KO') {
        // Input validation
        if (!text || typeof text !== 'string') {
            throw new Error('Invalid text input.');
        }
        
        // Remove emojis and clean text
        const cleanText = this.removeEmojis(text.trim());
        
        if (cleanText.length === 0) {
            throw new Error('No text to translate.');
        }
        
        if (cleanText.length > 1000) {
            throw new Error('Text too long (max 1000 characters).');
        }
        
        // Check cache first
        const cacheKey = `${cleanText}-${targetLang}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            console.log('Translation cache hit:', cleanText.substring(0, 50));
            return cached;
        }
        
        // Check if same request is already pending
        if (this.pendingRequests.has(cacheKey)) {
            return await this.pendingRequests.get(cacheKey);
        }
        
        // Create pending request
        const pendingPromise = this.performTranslation(cleanText, targetLang, cacheKey);
        this.pendingRequests.set(cacheKey, pendingPromise);
        
        try {
            const result = await pendingPromise;
            return result;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }
    
    async performTranslation(text, targetLang, cacheKey) {
        try {
            // Apply rate limiting
            await this.rateLimiter.acquire();

            let apiUrl;
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                apiUrl = '/.netlify/functions/deepl-translate';
            } else if (window.location.hostname.includes('netlify.app')) {
                apiUrl = '/.netlify/functions/deepl-translate';
            } else {
                apiUrl = 'https://60-english-tutor-ai.netlify.app/.netlify/functions/deepl-translate';
            }
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: [text],
                    target_lang: targetLang
                })
            });
            
            if (!response.ok) {
                console.error('DeepL API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                });
                await this.handleApiError(response);
            }
            
            const data = await response.json();
            
            if (!data.translations || !data.translations[0]) {
                throw new Error('No translation result received.');
            }
            
            const result = {
                text: data.translations[0].text,
                detectedLanguage: data.translations[0].detected_source_language,
                originalText: text, // This is already emoji-cleaned text
                timestamp: Date.now()
            };
            
            // Cache successful result with expiration
            this.cache.set(cacheKey, result);
            this.scheduleCacheCleanup(cacheKey, 1000 * 60 * 30); // 30 minutes
            
            //console.log(`Translation success: "${text}" -> "${result.text}"`);
            return result;
            
        } catch (error) {
            console.error('Translation error:', error);
            throw this.createUserFriendlyError(error);
        }
    }
    
    async handleApiError(response) {
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
            case 400:
                throw new Error('Invalid request. Please check your text.');
            case 403:
                throw new Error('Invalid API key or quota exceeded.');
            case 404:
                throw new Error('Translation service not found.');
            case 413:
                throw new Error('Text too large.');
            case 429:
                throw new Error('Too many requests. Please try again later.');
            case 456:
                throw new Error('Usage quota exceeded.');
            case 500:
            case 502:
            case 503:
            case 504:
                throw new Error('Translation service temporarily unavailable. Please try again later.');
            default:
                throw new Error(`Translation service error (${response.status})`);
        }
    }
    
    createUserFriendlyError(error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return new Error('Please check your internet connection.');
        }
        
        if (error.message.includes('timeout')) {
            return new Error('Request timeout. Please try again.');
        }
        
        // Return the original error if it's already user-friendly
        if (error.message.includes('translation') || error.message.includes('text') || 
            error.message.includes('request') || error.message.includes('connection') ||
            error.message.includes('Invalid') || error.message.includes('exceeded') ||
            error.message.includes('unavailable') || error.message.includes('quota')) {
            return error;
        }
        
        return new Error('Translation error occurred. Please try again later.');
    }
    
    scheduleCacheCleanup(cacheKey, delayMs) {
        setTimeout(() => {
            if (this.cache.has(cacheKey)) {
                const entry = this.cache.get(cacheKey);
                // Only delete if entry is old enough
                if (Date.now() - entry.timestamp >= delayMs) {
                    this.cache.delete(cacheKey);
                    console.log('Cache entry expired:', cacheKey.substring(0, 50));
                }
            }
        }, delayMs);
    }
    
    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()).map(k => k.substring(0, 50))
        };
    }
    
    // Clear old cache entries
    clearOldCache(maxAgeMs = 1000 * 60 * 30) { // 30 minutes default
        const now = Date.now();
        let cleared = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > maxAgeMs) {
                this.cache.delete(key);
                cleared++;
            }
        }
        
        if (cleared > 0) {
            console.log(`Cleared ${cleared} old cache entries`);
        }
        
        return cleared;
    }
    
    // Remove emojis from text for efficient translation
    removeEmojis(text) {
        // Comprehensive emoji regex pattern
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu;
        
        // Remove emojis and clean up extra spaces
        return text.replace(emojiRegex, ' ').replace(/\s+/g, ' ').trim();
    }
}

// Rate limiter utility class
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }
    
    async acquire() {
        const now = Date.now();
        
        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        // If we're at the limit, wait
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = this.windowMs - (now - oldestRequest) + 10; // +10ms buffer
            
            if (waitTime > 0) {
                console.log(`Rate limit reached, waiting ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.acquire(); // Recursive call after waiting
            }
        }
        
        // Record this request
        this.requests.push(now);
    }
    
    // Get current rate limit status
    getStatus() {
        const now = Date.now();
        const recentRequests = this.requests.filter(time => now - time < this.windowMs);
        
        return {
            current: recentRequests.length,
            max: this.maxRequests,
            windowMs: this.windowMs,
            canRequest: recentRequests.length < this.maxRequests
        };
    }
}