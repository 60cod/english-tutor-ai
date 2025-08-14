// UIManager - UI 컨트롤 및 설정 관련 기능
class UIManager {
    constructor() {
        this.fontSize = 14;
        this.hasUserSentMessage = false;
        
        // UI elements
        this.increaseFontBtn = document.getElementById('increase-font');
        this.decreaseFontBtn = document.getElementById('decrease-font');
        this.fontSizeDisplay = document.getElementById('font-size-display');
        this.headerToggleBtn = document.getElementById('header-toggle');
        this.header = document.querySelector('header');
        this.speechSettingsBtn = document.getElementById('speech-settings-btn');
        this.speechSettingsDropdown = document.getElementById('speech-settings-dropdown');
        this.speechSpeedSelect = document.getElementById('speech-speed');
        this.speechVoiceSelect = document.getElementById('speech-voice');
        this.voiceBtn = document.getElementById('voice-btn');
        this.chatMessages = document.getElementById('chat-messages');
        
        this.onVoiceModeToggle = null; // Callback for voice mode toggle
        this.onSpeechSettingsChange = null; // Callback for speech settings change
        this.onVoicesChanged = null; // Callback for voices changed event
        
        this.initEventListeners();
        this.updateFontSize();
        this.setInitialTimestamp();
    }
    
    initEventListeners() {
        if (this.increaseFontBtn) {
            this.increaseFontBtn.addEventListener('click', () => this.increaseFontSize());
        }
        if (this.decreaseFontBtn) {
            this.decreaseFontBtn.addEventListener('click', () => this.decreaseFontSize());
        }
        if (this.headerToggleBtn) {
            this.headerToggleBtn.addEventListener('click', () => this.toggleHeader());
        }
        if (this.voiceBtn) {
            this.voiceBtn.addEventListener('click', () => {
                if (this.onVoiceModeToggle) {
                    this.onVoiceModeToggle();
                }
            });
        }
        if (this.speechSettingsBtn) {
            this.speechSettingsBtn.addEventListener('click', (e) => this.toggleSpeechSettings(e));
        }
        if (this.speechSpeedSelect) {
            this.speechSpeedSelect.addEventListener('change', (e) => this.updateSpeechSpeed(e.target.value));
        }
        if (this.speechVoiceSelect) {
            this.speechVoiceSelect.addEventListener('change', (e) => this.updateSpeechVoice(e.target.value));
        }
        
        // Listen for voices changed event
        if (typeof speechSynthesis !== 'undefined' && speechSynthesis.addEventListener) {
            speechSynthesis.addEventListener('voiceschanged', () => {
                if (this.onVoicesChanged) {
                    this.onVoicesChanged();
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.speechSettingsBtn?.contains(e.target) && !this.speechSettingsDropdown?.contains(e.target)) {
                this.closeSpeechSettings();
            }
        });
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
        if (this.chatMessages) {
            this.chatMessages.style.fontSize = `${this.fontSize}px`;
        }
        
        // Update textarea font size
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.style.fontSize = `${this.fontSize}px`;
        }
        
        // Update translation popup font size
        const translationPopups = document.querySelectorAll('.translation-popup');
        translationPopups.forEach(popup => {
            popup.style.fontSize = `${this.fontSize}px`;
        });
        
        if (this.fontSizeDisplay) {
            this.fontSizeDisplay.textContent = `${this.fontSize}px`;
        }
        
        if (this.increaseFontBtn) {
            this.increaseFontBtn.disabled = this.fontSize >= 24;
        }
        if (this.decreaseFontBtn) {
            this.decreaseFontBtn.disabled = this.fontSize <= 10;
        }
    }
    
    toggleHeader() {
        if (this.header) {
            this.header.classList.toggle('collapsed');
        }
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
    
    updateVoiceButtonState(isVoiceMode, isListening) {
        if (!this.voiceBtn) return;
        
        if (isVoiceMode) {
            this.voiceBtn.classList.add('active');
            this.voiceBtn.querySelector('.voice-icon').textContent = '🔴';
            this.voiceBtn.title = '음성 모드 끄기';
        } else {
            this.voiceBtn.classList.remove('active');
            this.voiceBtn.querySelector('.voice-icon').textContent = '🎙️';
            this.voiceBtn.title = '음성 모드 켜기';
        }
    }
    
    toggleSpeechSettings(e) {
        e.stopPropagation();
        if (this.speechSettingsDropdown) {
            this.speechSettingsDropdown.classList.toggle('hidden');
        }
    }
    
    closeSpeechSettings() {
        if (this.speechSettingsDropdown) {
            this.speechSettingsDropdown.classList.add('hidden');
        }
    }
    
    updateSpeechSpeed(speed) {
        if (this.onSpeechSettingsChange) {
            this.onSpeechSettingsChange({ speed: parseFloat(speed) });
        }
    }
    
    updateSpeechVoice(voiceURI) {
        if (this.onSpeechSettingsChange) {
            this.onSpeechSettingsChange({ voiceURI: voiceURI });
        }
    }
    
    initSpeechSettings(speechSettings) {
        if (this.speechSpeedSelect) {
            this.speechSpeedSelect.value = speechSettings.speed.toString();
        }
        if (this.speechVoiceSelect) {
            this.speechVoiceSelect.value = speechSettings.voiceURI;
        }
    }
    
    populateVoiceOptions(voices = []) {
        if (!this.speechVoiceSelect) return;
        
        const autoOption = this.speechVoiceSelect.querySelector('option[value="auto"]');
        this.speechVoiceSelect.innerHTML = '';
        if (autoOption) {
            this.speechVoiceSelect.appendChild(autoOption);
        } else {
            const option = document.createElement('option');
            option.value = 'auto';
            option.textContent = 'Auto (Default)';
            option.selected = true;
            this.speechVoiceSelect.appendChild(option);
        }
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} ${voice.lang.includes('en-GB') ? '🇬🇧' : '🇺🇸'}`;
            this.speechVoiceSelect.appendChild(option);
        });
    }
    
    showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'speech-tooltip';
        tooltip.textContent = message;
        
        tooltip.style.position = 'fixed';
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.backgroundColor = '#333';
        tooltip.style.color = 'white';
        tooltip.style.padding = '10px 15px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '14px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.zIndex = '1000';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s';
        tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => tooltip.style.opacity = '1', 10);
        
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