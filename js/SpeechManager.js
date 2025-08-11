// SpeechManager - 음성 인식/합성 관련 기능
class SpeechManager {
    constructor() {
        this.isVoiceMode = false;
        this.recognition = null;
        this.isListening = false;
        this.speechSupported = this.checkSpeechSupport();
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.micPermissionGranted = false;
        this.isSpeaking = false;
        this.speechQueue = [];
        this.isProcessingSpeech = false;
        this.speechSettings = {
            speed: 1.0,
            voiceURI: 'auto'
        };
        
        this.onSpeechResult = null; // Callback for speech recognition result
        this.onSpeechError = null; // Callback for speech errors
    }
    
    checkSpeechSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const SpeechSynthesis = window.speechSynthesis;
        return !!(SpeechRecognition && SpeechSynthesis);
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
        };
        
        this.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            console.log('Speech recognition result:', result);
            if (this.onSpeechResult) {
                this.onSpeechResult(result);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (this.onSpeechError) {
                this.onSpeechError(event.error);
            }
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            
            if (this.isVoiceMode && !this.isSpeaking) {
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
            if (this.onSpeechError) {
                this.onSpeechError('start-failed');
            }
        }
    }
    
    speakText(text) {
        if (!this.synthesis) return;
        
        this.synthesis.cancel();
        
        const cleanText = text.replace(/[📝✏️💡🎓]/g, '').trim();
        if (!cleanText) return;
        
        this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
        
        // Configure voice settings using user preferences
        this.currentUtterance.lang = 'en-US';
        this.currentUtterance.rate = this.speechSettings.speed;
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 0.8;
        
        // Find voice by URI or use default
        const voices = this.synthesis.getVoices();
        let selectedVoice = null;
        
        if (this.speechSettings.voiceURI !== 'auto') {
            selectedVoice = voices.find(voice => 
                voice.voiceURI === this.speechSettings.voiceURI
            );
        }
        
        // Fallback to any US English voice if specific voice not found
        if (!selectedVoice) {
            selectedVoice = voices.find(voice => 
                voice.lang.includes('en-US')
            );
        }
        
        if (selectedVoice) {
            this.currentUtterance.voice = selectedVoice;
        }
        
        // Event listeners for speech
        this.currentUtterance.onstart = () => {
            this.isSpeaking = true;
            
            // Stop listening while speaking to prevent echo
            if (this.isListening && this.recognition) {
                this.recognition.stop();
            }
        };
        
        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
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
    
    readTextAloud(text) {
        if (!this.synthesis) return;
        
        const cleanText = text.replace(/[📝✏️💡🎓🔊]/g, '').trim();
        if (!cleanText) return;
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        utterance.lang = 'en-US';
        utterance.rate = this.speechSettings.speed;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        const voices = this.synthesis.getVoices();
        let selectedVoice = null;
        
        if (this.speechSettings.voiceURI !== 'auto') {
            selectedVoice = voices.find(voice => 
                voice.voiceURI === this.speechSettings.voiceURI
            );
        }
        
        if (!selectedVoice) {
            selectedVoice = voices.find(voice => 
                voice.lang.includes('en-US')
            );
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
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
        
        this.synthesis.speak(utterance);
    }
    
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.currentUtterance = null;
        }
        this.speechQueue = [];
        this.isProcessingSpeech = false;
    }
    
    updateSpeechSettings(settings) {
        this.speechSettings = { ...this.speechSettings, ...settings };
    }
    
    getAvailableVoices() {
        if (!this.synthesis) return [];
        return this.synthesis.getVoices().filter(voice => 
            voice.lang.includes('en-US') || voice.lang.includes('en-GB')
        );
    }
}