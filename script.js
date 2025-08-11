class EnglishChatbot {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.loading = document.getElementById('loading');
        this.increaseFontBtn = document.getElementById('increase-font');
        this.decreaseFontBtn = document.getElementById('decrease-font');
        this.fontSizeDisplay = document.getElementById('font-size-display');
        this.headerToggleBtn = document.getElementById('header-toggle');
        this.header = document.querySelector('header');
        this.voiceBtn = document.getElementById('voice-btn');
        
        this.fontSize = 14;
        this.hasUserSentMessage = false;
        
        // Voice-related properties
        this.isVoiceMode = false;
        this.recognition = null;
        this.isListening = false;
        this.speechSupported = this.checkSpeechSupport();
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.micPermissionGranted = false;
        this.isSpeaking = false;
        
        // Speech queue for handling multiple read requests
        this.speechQueue = [];
        this.isProcessingSpeech = false;
        
        this.initEventListeners();
        this.updateFontSize();
        this.setInitialTimestamp();
        this.initVoiceFeature();
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
        this.headerToggleBtn.addEventListener('click', () => this.toggleHeader());
        
        if (this.voiceBtn) {
            this.voiceBtn.addEventListener('click', () => this.toggleVoiceMode());
        }
    }
    
    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;
        
        // 첫 메시지 전송 시 모바일에서 헤더 자동 축소
        if (!this.hasUserSentMessage && window.innerWidth <= 768) {
            this.hasUserSentMessage = true;
            this.header.classList.add('collapsed');
        }
        
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
            // 메시지 전송 완료 후 입력창에 다시 포커스
            this.userInput.focus();
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
                                <div class="feedback-actions">
                                    <button class="copy-btn" onclick="chatbot.copyToClipboard('${this.escapeHtml(suggestionText).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', this)" title="Copy to clipboard">
                                        📋
                                    </button>
                                    <button class="read-btn feedback" onclick="chatbot.handleReadMessage('${this.escapeHtml(suggestionText).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', this)" title="Read expression aloud">
                                        🔊
                                    </button>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(response.response)} <button class="read-btn inline" onclick="chatbot.handleReadMessage('${this.escapeHtml(response.response).replace(/'/g, '\\\'')}', this)" title="Read message aloud">🔊</button></p>
                ${feedbackHtml}
                <div class="message-timestamp">${timestamp}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Speak the bot response if in voice mode
        if (this.isVoiceMode) {
            this.speakText(response.response);
        }
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
    
    toggleHeader() {
        this.header.classList.toggle('collapsed');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Voice-related methods
    checkSpeechSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const SpeechSynthesis = window.speechSynthesis;
        return !!(SpeechRecognition && SpeechSynthesis);
    }
    
    initVoiceFeature() {
        if (this.speechSupported) {
            this.createVoiceButton();
            this.initSpeechRecognition();
        }
    }
    
    createVoiceButton() {
        if (!this.voiceBtn) return;
        
        if (this.speechSupported) {
            this.voiceBtn.style.display = 'flex';
        } else {
            this.voiceBtn.classList.add('disabled');
            this.voiceBtn.title = '브라우저에서 음성 기능을 지원하지 않습니다';
        }
    }
    
    toggleVoiceMode() {
        if (!this.speechSupported) {
            this.addSystemMessage('⚠️ Voice feature is not supported in this browser. Please use Chrome or Safari browser.');
            return;
        }
        
        this.isVoiceMode = !this.isVoiceMode;
        
        if (this.isVoiceMode) {
            this.startVoiceMode();
        } else {
            this.stopVoiceMode();
        }
    }
    
    startVoiceMode() {
        this.voiceBtn.classList.add('active');
        this.voiceBtn.querySelector('.voice-icon').textContent = '🔴';
        this.voiceBtn.title = '음성 모드 끄기';
        
        // Disable text input
        this.userInput.disabled = true;
        this.sendBtn.disabled = true;
        this.userInput.placeholder = '음성 모드가 활성화되어 있습니다...';
        
        // Start listening
        this.startListening();
    }
    
    stopVoiceMode() {
        this.voiceBtn.classList.remove('active');
        this.voiceBtn.querySelector('.voice-icon').textContent = '🎙️';
        this.voiceBtn.title = '음성 모드 켜기';
        
        // Enable text input
        this.userInput.disabled = false;
        this.sendBtn.disabled = false;
        this.userInput.placeholder = 'Type your message in English...';
        
        // Stop listening if currently listening
        if (this.isListening && this.recognition) {
            this.recognition.stop();
        }
        
        // Stop any ongoing speech
        this.stopSpeaking();
    }
    
    initSpeechRecognition() {
        if (!this.speechSupported) return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configuration
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        
        // Event listeners
        this.recognition.onstart = () => {
            this.isListening = true;
            this.micPermissionGranted = true;
            console.log('Speech recognition started');
        };
        
        this.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            console.log('Speech recognition result:', result);
            this.handleSpeechResult(result);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.handleSpeechError(event.error);
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            console.log('Speech recognition ended');
            
            if (this.isVoiceMode && !this.isSpeaking) {
                // Only restart listening if not currently speaking
                setTimeout(() => {
                    if (this.isVoiceMode && !this.isListening && !this.isSpeaking) {
                        this.startListening();
                    }
                }, 500);
            }
        };
    }
    
    startListening() {
        if (!this.recognition || this.isListening || this.isSpeaking) return;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            this.handleSpeechError('start-failed');
        }
    }
    
    handleSpeechResult(result) {
        if (result.trim()) {
            // Put the recognized text in the input field
            this.userInput.value = result;
            // Automatically send the message
            this.sendMessage();
        }
    }
    
    handleSpeechError(error) {
        let message = '';
        let isSystemMessage = false;
        
        switch (error) {
            case 'not-allowed':
                message = '⚠️ Microphone access required. Please allow microphone permission in your browser settings. Voice mode has been disabled.';
                isSystemMessage = true;
                break;
            case 'no-speech':
                message = '⚠️ No speech detected. Please try speaking again.';
                isSystemMessage = true;
                break;
            case 'network':
                message = '⚠️ Network error occurred. Please check your internet connection.';
                isSystemMessage = true;
                break;
            case 'start-failed':
                message = '⚠️ Unable to start voice recognition. Please try again in a moment.';
                isSystemMessage = true;
                break;
            default:
                message = '⚠️ Voice recognition error occurred. Please try again.';
                isSystemMessage = true;
        }
        
        // Show error message to user
        if (isSystemMessage) {
            this.addSystemMessage(message);
        } else {
            this.addBotMessage({
                response: message,
                corrections: [],
                suggestions: []
            });
        }
        
        // If it's a permission error, turn off voice mode
        if (error === 'not-allowed') {
            this.isVoiceMode = false;
            this.stopVoiceMode();
        }
    }
    
    addSystemMessage(message) {
        const timestamp = new Date().toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(message)}</p>
                <div class="message-timestamp">${timestamp}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    speakText(text) {
        if (!this.synthesis) return;
        
        // Stop any current speech
        this.synthesis.cancel();
        
        // Clean text for speech (remove special characters and formatting)
        const cleanText = text.replace(/[📝✏️💡🎓]/g, '').trim();
        
        if (!cleanText) return;
        
        // Create utterance
        this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
        
        // Configure voice settings
        this.currentUtterance.lang = 'en-US';
        this.currentUtterance.rate = 0.9;
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 0.8;
        
        // Find a suitable English voice
        const voices = this.synthesis.getVoices();
        const englishVoice = voices.find(voice => 
            voice.lang.includes('en-US') || voice.lang.includes('en-GB')
        );
        
        if (englishVoice) {
            this.currentUtterance.voice = englishVoice;
        }
        
        // Event listeners for speech
        this.currentUtterance.onstart = () => {
            this.isSpeaking = true;
            console.log('Speech synthesis started - pausing voice recognition');
            
            // Stop listening while speaking to prevent echo
            if (this.isListening && this.recognition) {
                this.recognition.stop();
            }
        };
        
        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            console.log('Speech synthesis ended - resuming voice recognition');
            this.currentUtterance = null;
            
            // Resume listening after speech ends if still in voice mode
            if (this.isVoiceMode && !this.isListening) {
                setTimeout(() => {
                    if (this.isVoiceMode && !this.isListening && !this.isSpeaking) {
                        this.startListening();
                    }
                }, 300);
            }
        };
        
        this.currentUtterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.isSpeaking = false;
            this.currentUtterance = null;
            
            // Resume listening if speech synthesis fails
            if (this.isVoiceMode && !this.isListening) {
                setTimeout(() => {
                    if (this.isVoiceMode && !this.isListening && !this.isSpeaking) {
                        this.startListening();
                    }
                }, 300);
            }
        };
        
        // Start speaking
        this.synthesis.speak(this.currentUtterance);
    }
    
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.currentUtterance = null;
        }
        // Clear speech queue
        this.speechQueue = [];
        this.isProcessingSpeech = false;
    }
    
    // Method to handle read button clicks
    handleReadMessage(text, buttonElement) {
        if (!this.synthesis) {
            this.showTooltip(buttonElement, 'Web Speech API not supported in this browser');
            return;
        }
        
        // Stop current speech and clear queue
        this.synthesis.cancel();
        this.speechQueue = [];
        this.isProcessingSpeech = false;
        
        // Start reading the new message
        this.readTextAloud(text);
    }
    
    // Method to read text aloud (separate from voice mode)
    readTextAloud(text) {
        if (!this.synthesis) return;
        
        // Clean text for speech
        const cleanText = text.replace(/[📝✏️💡🎓🔊]/g, '').trim();
        if (!cleanText) return;
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Configure voice settings
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Find a suitable English voice
        const voices = this.synthesis.getVoices();
        const englishVoice = voices.find(voice => 
            voice.lang.includes('en-US') || voice.lang.includes('en-GB')
        );
        
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
        
        // Event listeners
        utterance.onstart = () => {
            this.isProcessingSpeech = true;
        };
        
        utterance.onend = () => {
            this.isProcessingSpeech = false;
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.isProcessingSpeech = false;
        };
        
        // Start speaking
        this.synthesis.speak(utterance);
    }
    
    // Method to show tooltip
    showTooltip(element, message) {
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'speech-tooltip';
        tooltip.textContent = message;
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - 35) + 'px';
        tooltip.style.backgroundColor = '#333';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.zIndex = '1000';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s';
        
        document.body.appendChild(tooltip);
        
        // Show tooltip with animation
        setTimeout(() => tooltip.style.opacity = '1', 10);
        
        // Remove tooltip after 3 seconds
        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                if (tooltip.parentNode) {
                    document.body.removeChild(tooltip);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the chatbot when the page loads
let chatbot;
document.addEventListener('DOMContentLoaded', () => {
    chatbot = new EnglishChatbot();
});