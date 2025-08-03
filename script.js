class EnglishChatbot {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.loading = document.getElementById('loading');
        this.increaseFontBtn = document.getElementById('increase-font');
        this.decreaseFontBtn = document.getElementById('decrease-font');
        this.fontSizeDisplay = document.getElementById('font-size-display');
        
        this.fontSize = 14;
        
        this.initEventListeners();
        this.updateFontSize();
        this.setInitialTimestamp();
    }
    
    initEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.increaseFontBtn.addEventListener('click', () => this.increaseFontSize());
        this.decreaseFontBtn.addEventListener('click', () => this.decreaseFontSize());
    }
    
    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;
        
        this.addUserMessage(message);
        this.userInput.value = '';
        this.setLoading(true);
        
        try {
            const response = await this.analyzeMessage(message);
            this.addBotMessage(response);
        } catch (error) {
            console.error('Error:', error);
            this.addBotMessage({
                response: "Sorry, I'm having trouble analyzing your message right now. Please try again later.",
                corrections: [],
                suggestions: []
            });
        } finally {
            this.setLoading(false);
        }
    }
    
    async analyzeMessage(message) {
        // 환경에 따라 다른 API URL 사용
        let apiUrl;
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // 로컬 개발 환경
            apiUrl = '/.netlify/functions/gemini';
        } else if (window.location.hostname.includes('netlify.app')) {
            // Netlify 배포 환경
            apiUrl = '/.netlify/functions/gemini';
        } else {
            // GitHub Pages 등 다른 환경에서는 Netlify 도메인 직접 호출
            apiUrl = 'https://60-english-tutor-ai.netlify.app/.netlify/functions/gemini';
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    }
    
    addUserMessage(message) {
        const timestamp = new Date().toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(message)}</p>
                <div class="message-timestamp">${timestamp}</div>
            </div>
        `;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addBotMessage(response) {
        const timestamp = new Date().toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        let feedbackHtml = '';
        
        if (response.corrections && response.corrections.length > 0) {
            feedbackHtml += `
                <div class="feedback-section correction">
                    <div class="feedback-title">✏️ Corrections</div>
                    <div class="feedback-list">
                        ${response.corrections.map((correction, idx) => {
                            const correctionText = typeof correction === 'string' ? correction : JSON.stringify(correction);
                            return `<div class="feedback-item">
                                <span class="feedback-text">• ${this.escapeHtml(correctionText)}</span>
                                <button class="copy-btn" onclick="chatbot.copyToClipboard('${this.escapeHtml(correctionText).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', this)" title="Copy!">
                                    📋
                                </button>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        if (response.suggestions && response.suggestions.length > 0) {
            feedbackHtml += `
                <div class="feedback-section suggestion">
                    <div class="feedback-title">💡 Better Expressions</div>
                    <div class="feedback-list">
                        ${response.suggestions.map((suggestion, idx) => {
                            const suggestionText = typeof suggestion === 'string' ? suggestion : JSON.stringify(suggestion);
                            return `<div class="feedback-item">
                                <span class="feedback-text">• ${this.escapeHtml(suggestionText)}</span>
                                <button class="copy-btn" onclick="chatbot.copyToClipboard('${this.escapeHtml(suggestionText).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', this)" title="Copy to clipboard">
                                    📋
                                </button>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(response.response)}</p>
                ${feedbackHtml}
                <div class="message-timestamp">${timestamp}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    setLoading(isLoading) {
        this.loading.classList.toggle('hidden', !isLoading);
        this.sendBtn.disabled = isLoading;
        this.userInput.disabled = isLoading;
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    increaseFontSize() {
        if (this.fontSize < 24) {
            this.fontSize += 2;
            this.updateFontSize();
        }
    }
    
    decreaseFontSize() {
        if (this.fontSize > 10) {
            this.fontSize -= 2;
            this.updateFontSize();
        }
    }
    
    updateFontSize() {
        // Update chat messages font size
        this.chatMessages.style.fontSize = `${this.fontSize}px`;
        
        // Update display
        this.fontSizeDisplay.textContent = `${this.fontSize}px`;
        
        // Update button states
        this.increaseFontBtn.disabled = this.fontSize >= 24;
        this.decreaseFontBtn.disabled = this.fontSize <= 10;
    }
    
    setInitialTimestamp() {
        const initialTimestamp = document.getElementById('initial-timestamp');
        if (initialTimestamp) {
            initialTimestamp.textContent = new Date().toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
    }
    
    async copyToClipboard(text, buttonElement) {
        try {
            await navigator.clipboard.writeText(text);
            // Show temporary feedback
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✓';
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.style.background = '';
            }, 1500);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the chatbot when the page loads
let chatbot;
document.addEventListener('DOMContentLoaded', () => {
    chatbot = new EnglishChatbot();
});