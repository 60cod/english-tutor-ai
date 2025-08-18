// MessageManager - 채팅 메시지 처리 관련 기능
class MessageManager {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.onReadMessage = null; // Callback for read message button
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
                                <div class="feedback-actions">
                                    <button class="copy-btn" onclick="chatbot.copyToClipboard('${this.escapeHtml(correctionText).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', this)" title="Copy!">
                                        📋
                                    </button>
                                    <button class="add-note-btn" onclick="window.noteManager?.addNoteFromSource('${this.escapeHtml(correctionText).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', 'corrections', 'chat_correction')" title="Add to notes">
                                        📝
                                    </button>
                                </div>
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
                                    <button class="add-note-btn" onclick="window.noteManager?.addNoteFromSource('${this.escapeHtml(suggestionText).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', 'expressions', 'chat_suggestion')" title="Add to notes">
                                        📝
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
                <p>${this.escapeHtml(response.response)} 
                    <button class="read-btn inline" onclick="chatbot.handleReadMessage('${this.escapeHtml(response.response).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', this)" title="Read message aloud">🔊</button>
                    <button class="add-note-btn inline" onclick="window.noteManager?.addNoteFromSource('${this.escapeHtml(response.response).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', 'general', 'chat_message')" title="Add message to notes">📝</button>
                </p>
                ${feedbackHtml}
                <div class="message-timestamp">${timestamp}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
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
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}