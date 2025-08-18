// TextSelectionManager.js - Text selection and translation popup handler
class TextSelectionManager {
    constructor(chatbot) {
        this.chatbot = chatbot;
        this.selectedText = '';
        this.selectionRange = null;
        this.magnifyButton = null;
        this.translationPopup = null;
        this.currentTranslation = null;
        
        this.translationService = new TranslationService();
        
        // Callback functions (can be set by parent)
        this.onTranslationSuccess = null;
        this.onTranslationError = null;
        
        this.initSelectionDetection();
    }
    
    initSelectionDetection() {
        // Monitor text selection in chat messages area
        const chatMessages = document.getElementById('chat-messages');
        
        chatMessages.addEventListener('mouseup', (e) => {
            // Small delay to ensure selection is complete
            setTimeout(() => this.handleTextSelection(e), 50);
        });
        
        // Hide button on click outside or scroll
        document.addEventListener('click', (e) => {
            if (!this.isTargetElement(e.target)) {
                this.hideMagnifyButton();
                this.hidePopup();
            }
        });
        
        document.addEventListener('scroll', () => {
            this.hideMagnifyButton();
            this.hidePopup();
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.hideMagnifyButton();
            this.hidePopup();
        });
    }
    
    handleTextSelection(event) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // Only show magnify button for text longer than 1 character and not too long
        if (selectedText && selectedText.length > 1 && selectedText.length < 200) {
            // Check if selection is within chat messages
            const chatMessages = document.getElementById('chat-messages');
            const range = selection.getRangeAt(0);
            if (chatMessages.contains(range.commonAncestorContainer)) {
                // Remove emojis from selected text for translation
                this.selectedText = this.removeEmojis(selectedText);
                
                // Only show button if there's translatable text after emoji removal
                if (this.selectedText && this.selectedText.length > 1) {
                    this.selectionRange = range.cloneRange();
                    this.showMagnifyButton(selection);
                    return;
                }
            }
        }
        
        this.hideMagnifyButton();
    }
    
    isTargetElement(element) {
        return element === this.magnifyButton || 
               (this.translationPopup && this.translationPopup.contains(element)) ||
               element.closest('.text-selection-magnify') ||
               element.closest('.translation-popup');
    }
    
    showMagnifyButton(selection) {
        // Remove existing button
        this.hideMagnifyButton();
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Don't show if selection is too small or out of viewport
        if (rect.width < 10 || rect.height < 10 || rect.top < 0) {
            return;
        }
        
        // Create magnify button
        this.magnifyButton = document.createElement('button');
        this.magnifyButton.className = 'text-selection-magnify';
        this.magnifyButton.innerHTML = '🔍';
        this.magnifyButton.title = 'Quick Translation';
        
        // Position above selected text center
        const centerX = rect.left + rect.width / 2;
        const buttonX = Math.max(16, Math.min(centerX - 16, window.innerWidth - 32));
        const buttonY = Math.max(16, rect.top - 40);
        
        this.magnifyButton.style.left = `${buttonX}px`;
        this.magnifyButton.style.top = `${buttonY}px`;
        
        // Add click handler
        this.magnifyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showTranslationPopup();
        });
        
        document.body.appendChild(this.magnifyButton);
    }
    
    hideMagnifyButton() {
        if (this.magnifyButton) {
            this.magnifyButton.remove();
            this.magnifyButton = null;
        }
    }
    
    showTranslationPopup() {
        this.hidePopup(); // Remove any existing popup
        
        const popup = document.createElement('div');
        popup.className = 'translation-popup';
        popup.innerHTML = `
            <div class="translation-popup-header">
                <span class="translation-popup-title">Quick Translation</span>
                <button class="translation-popup-close">✕</button>
            </div>
            <div class="translation-content">
                <div class="selected-text">${this.escapeHtml(this.selectedText)}</div>
                <div class="translation-result">
                    <div class="translation-loading">
                        <div class="spinner"></div>
                        Translating...
                    </div>
                </div>
            </div>
            <div class="translation-actions">
                <button class="action-btn copy-btn" disabled>
                    📋 Copy
                </button>
                <button class="action-btn speak-btn" disabled>
                    🔊 Speak
                </button>
                <button class="action-btn add-note-btn" disabled>
                    📝 Note
                </button>
            </div>
        `;
        
        // Position popup
        this.positionPopup(popup);
        
        // Add event listeners
        this.setupPopupEventListeners(popup);
        
        document.body.appendChild(popup);
        this.translationPopup = popup;
        
        // Apply current font size from UIManager
        if (this.chatbot.uiManager && this.chatbot.uiManager.fontSize) {
            popup.style.fontSize = `${this.chatbot.uiManager.fontSize}px`;
        }
        
        // Hide magnify button
        this.hideMagnifyButton();
        
        // Start translation
        this.performTranslation(popup);
    }
    
    positionPopup(popup) {
        // Temporarily add to body to measure dimensions
        popup.style.visibility = 'hidden';
        document.body.appendChild(popup);
        
        const popupRect = popup.getBoundingClientRect();
        const buttonRect = this.magnifyButton ? this.magnifyButton.getBoundingClientRect() : 
                           this.selectionRange.getBoundingClientRect();
        
        // Calculate position (prefer right side of button/selection)
        let left = buttonRect.right + 10;
        let top = buttonRect.top;
        
        // Adjust if popup goes off screen
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        if (left + popupRect.width > windowWidth - 20) {
            left = buttonRect.left - popupRect.width - 10;
        }
        
        if (left < 20) {
            left = 20;
            top = buttonRect.bottom + 10;
        }
        
        if (top + popupRect.height > windowHeight - 20) {
            top = windowHeight - popupRect.height - 20;
        }
        
        if (top < 20) top = 20;
        
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        popup.style.visibility = 'visible';
        
        document.body.removeChild(popup);
    }
    
    setupPopupEventListeners(popup) {
        // Close button
        popup.querySelector('.translation-popup-close').addEventListener('click', () => {
            this.hidePopup();
        });
        
        // Copy button
        const copyBtn = popup.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            this.copyTranslation();
        });
        
        // Speak button
        const speakBtn = popup.querySelector('.speak-btn');
        speakBtn.addEventListener('click', () => {
            this.speakTranslation();
        });
        
        // Add note button
        const addNoteBtn = popup.querySelector('.add-note-btn');
        addNoteBtn.addEventListener('click', () => {
            this.addToNotes();
        });
        
        // Prevent popup clicks from bubbling
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    async performTranslation(popup) {
        try {
            const result = await this.translationService.translateText(this.selectedText);
            
            this.currentTranslation = result;
            
            // Update UI with translation result
            const resultDiv = popup.querySelector('.translation-result');
            resultDiv.innerHTML = `
                <span>${this.escapeHtml(result.text)}</span>
            `;
            
            // Enable action buttons
            const copyBtn = popup.querySelector('.copy-btn');
            const speakBtn = popup.querySelector('.speak-btn');
            const addNoteBtn = popup.querySelector('.add-note-btn');
            copyBtn.disabled = false;
            speakBtn.disabled = false;
            addNoteBtn.disabled = false;
            
            // Show success animation
            resultDiv.style.animation = 'fadeInScale 0.3s ease';
            
            // Call success callback if exists
            if (this.onTranslationSuccess) {
                this.onTranslationSuccess(result);
            }
            
        } catch (error) {
            console.error('Translation error:', error);
            
            // Show error state
            const resultDiv = popup.querySelector('.translation-result');
            resultDiv.innerHTML = `
                <span style="color: #dc2626;">⚠️ ${error.message}</span>
            `;
            resultDiv.style.background = '#fef2f2';
            resultDiv.style.borderColor = '#fecaca';
            
            // Call error callback if exists
            if (this.onTranslationError) {
                this.onTranslationError(error);
            }
        }
    }
    
    async copyTranslation() {
        if (!this.currentTranslation) return;
        
        try {
            await navigator.clipboard.writeText(this.currentTranslation.text);
            this.showCopySuccess();
            
        } catch (error) {
            console.error('Copy failed:', error);
            // Fallback for older browsers
            this.fallbackCopy(this.currentTranslation.text);
        }
    }
    
    showCopySuccess() {
        const copyBtn = this.translationPopup.querySelector('.copy-btn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copied';
        copyBtn.style.background = '#10b981';
        copyBtn.style.color = 'white';
        
        setTimeout(() => {
            if (copyBtn) {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
                copyBtn.style.color = '';
            }
        }, 2000);
    }
    
    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showCopySuccess();
        } catch (error) {
            console.error('Fallback copy failed:', error);
        } finally {
            document.body.removeChild(textArea);
        }
    }
    
    speakTranslation() {
        if (!this.currentTranslation) return;
        
        // Use existing speech manager from chatbot
        const speechManager = this.chatbot.speechManager;
        const speakBtn = this.translationPopup.querySelector('.speak-btn');
        
        // Disable button during speech without changing text
        speakBtn.disabled = true;
        
        // Create utterance for original English text
        const utterance = new SpeechSynthesisUtterance(this.selectedText);
        utterance.lang = 'en-US';
        utterance.rate = speechManager.speechSettings.speed || 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Apply user's selected voice (same as SpeechManager)
        const voices = speechSynthesis.getVoices();
        let selectedVoice = null;
        
        if (speechManager.speechSettings.voiceURI !== 'auto') {
            selectedVoice = voices.find(voice => 
                voice.voiceURI === speechManager.speechSettings.voiceURI
            );
        }
        
        // Fallback to any US English voice if specific voice not found
        if (!selectedVoice) {
            selectedVoice = voices.find(voice => 
                voice.lang.includes('en-US')
            );
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.onend = () => {
            if (speakBtn) {
                speakBtn.disabled = false;
            }
        };
        
        utterance.onerror = (error) => {
            console.error('Speech failed:', error);
            if (speakBtn) {
                speakBtn.disabled = false;
            }
        };
        
        speechSynthesis.speak(utterance);
    }
    
    hidePopup() {
        if (this.translationPopup) {
            this.translationPopup.remove();
            this.translationPopup = null;
            this.currentTranslation = null;
        }
    }
    
    addToNotes() {
        if (!this.currentTranslation) return;
        
        // Create note text with both original and translation
        const noteText = `${this.selectedText} → ${this.currentTranslation.text}`;
        
        // Add to notes with translation category
        if (window.noteManager) {
            window.noteManager.addNoteFromSource(noteText, 'translations', 'quick_translation');
        }
        
        // Show visual feedback
        const addNoteBtn = this.translationPopup.querySelector('.add-note-btn');
        const originalText = addNoteBtn.innerHTML;
        addNoteBtn.innerHTML = '✓ Added';
        addNoteBtn.style.background = '#10b981';
        addNoteBtn.style.color = 'white';
        
        setTimeout(() => {
            if (addNoteBtn) {
                addNoteBtn.innerHTML = originalText;
                addNoteBtn.style.background = '';
                addNoteBtn.style.color = '';
            }
        }, 2000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Remove emojis from text (same as TranslationService)
    removeEmojis(text) {
        // Comprehensive emoji regex pattern
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu;
        
        // Remove emojis and clean up extra spaces
        return text.replace(emojiRegex, ' ').replace(/\s+/g, ' ').trim();
    }
    
    // Clean up method
    destroy() {
        this.hideMagnifyButton();
        this.hidePopup();
        // Remove event listeners would be added here if needed
    }
}