// Main EnglishChatbot class - 통합 관리
class EnglishChatbot {
    constructor() {
        // Initialize managers
        this.speechManager = new SpeechManager();
        this.uiManager = new UIManager();
        this.messageManager = new MessageManager();
        
        // Main UI elements
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.loading = document.getElementById('loading');
        this.header = document.querySelector('header');
        
        this.hasUserSentMessage = false;
        
        // Setup callbacks
        this.setupCallbacks();
        
        // Initialize features
        this.initEventListeners();
        this.speechManager.initSpeechRecognition();
        this.uiManager.initSpeechSettings(this.speechManager.speechSettings);
        this.populateVoiceOptions();
    }
    
    setupCallbacks() {
        // Speech manager callbacks
        this.speechManager.onSpeechResult = (result) => this.handleSpeechResult(result);
        this.speechManager.onSpeechError = (error) => this.handleSpeechError(error);
        
        // UI manager callbacks
        this.uiManager.onVoiceModeToggle = () => this.toggleVoiceMode();
        this.uiManager.onSpeechSettingsChange = (settings) => {
            this.speechManager.updateSpeechSettings(settings);
            this.saveSpeechSettings();
        };
        this.uiManager.onVoicesChanged = () => this.populateVoiceOptions();
        
        // Message manager callbacks
        this.messageManager.onReadMessage = (text, element) => this.handleReadMessage(text, element);
    }
    
    initEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }
    
    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;
        
        // 첫 메시지 전송 시 모바일에서 헤더 자동 축소
        if (!this.hasUserSentMessage && window.innerWidth <= 768) {
            this.hasUserSentMessage = true;
            this.header.classList.add('collapsed');
        }
        
        this.messageManager.addUserMessage(message);
        this.userInput.value = '';
        this.setLoading(true);
        
        try {
            const response = await this.analyzeMessage(message);
            this.messageManager.addBotMessage(response);
            
            // Speak the bot response if in voice mode
            if (this.speechManager.isVoiceMode) {
                this.speechManager.speakText(response.response);
            }
        } catch (error) {
            console.error('Error:', error);
            this.messageManager.addBotMessage({
                response: "Sorry, I'm having trouble analyzing your message right now. Please try again later.",
                corrections: [],
                suggestions: []
            });
        } finally {
            this.setLoading(false);
            this.userInput.focus();
        }
    }
    
    async analyzeMessage(message) {
        let apiUrl;
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            apiUrl = '/.netlify/functions/gemini';
        } else if (window.location.hostname.includes('netlify.app')) {
            apiUrl = '/.netlify/functions/gemini';
        } else {
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
    
    setLoading(isLoading) {
        this.loading.classList.toggle('hidden', !isLoading);
        this.sendBtn.disabled = isLoading;
        this.userInput.disabled = isLoading;
    }
    
    toggleVoiceMode() {
        if (!this.speechManager.speechSupported) {
            this.messageManager.addSystemMessage('⚠️ Voice feature is not supported in this browser. Please use Chrome or Safari browser.');
            return;
        }
        
        this.speechManager.isVoiceMode = !this.speechManager.isVoiceMode;
        
        if (this.speechManager.isVoiceMode) {
            this.startVoiceMode();
        } else {
            this.stopVoiceMode();
        }
    }
    
    startVoiceMode() {
        this.uiManager.updateVoiceButtonState(true, this.speechManager.isListening);
        
        // Disable text input
        this.userInput.disabled = true;
        this.sendBtn.disabled = true;
        this.userInput.placeholder = '음성 모드가 활성화되어 있습니다...';
        
        // Start listening
        this.speechManager.startListening();
    }
    
    stopVoiceMode() {
        this.uiManager.updateVoiceButtonState(false, this.speechManager.isListening);
        
        // Enable text input
        this.userInput.disabled = false;
        this.sendBtn.disabled = false;
        this.userInput.placeholder = 'Type your message in English...';
        
        // Stop listening if currently listening
        if (this.speechManager.isListening && this.speechManager.recognition) {
            this.speechManager.recognition.stop();
        }
        
        // Stop any ongoing speech
        this.speechManager.stopSpeaking();
    }
    
    handleSpeechResult(result) {
        if (result.trim()) {
            this.userInput.value = result;
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
        
        if (isSystemMessage) {
            this.messageManager.addSystemMessage(message);
        } else {
            this.messageManager.addBotMessage({
                response: message,
                corrections: [],
                suggestions: []
            });
        }
        
        // If it's a permission error, turn off voice mode
        if (error === 'not-allowed') {
            this.speechManager.isVoiceMode = false;
            this.stopVoiceMode();
        }
    }
    
    handleReadMessage(text, buttonElement) {
        if (!this.speechManager.synthesis) {
            this.uiManager.showTooltip(buttonElement, 'Not supported in this browser');
            return;
        }
        
        // Stop current speech and clear queue
        this.speechManager.synthesis.cancel();
        this.speechManager.speechQueue = [];
        this.speechManager.isProcessingSpeech = false;
        
        // Start reading the new message
        this.speechManager.readTextAloud(text);
    }
    
    async copyToClipboard(text, buttonElement) {
        try {
            await navigator.clipboard.writeText(text);
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
    
    saveSpeechSettings() {
        localStorage.setItem('speechSettings', JSON.stringify(this.speechManager.speechSettings));
    }
    
    populateVoiceOptions() {
        const voices = this.speechManager.getAvailableVoices();
        this.uiManager.populateVoiceOptions(voices);
    }
}

// Initialize the chatbot when the page loads
let chatbot;
document.addEventListener('DOMContentLoaded', () => {
    chatbot = new EnglishChatbot();
});