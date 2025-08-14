// GuideManager - 챗봇 가이드 시스템 관리
class GuideManager {
    constructor(chatbot) {
        this.chatbot = chatbot;
        this.isGuideVisible = false;
        this.currentTooltip = null;
        this.currentLanguage = localStorage.getItem('guideLanguage') || 'en';
        
        // Guide elements
        this.floatingBtn = null;
        this.guidePanel = null;
        
        // Content data
        this.guideContent = this.initializeContent();
        
        this.setupGuideSystem();
    }
    
    initializeContent() {
        return {
            ko: {
                title: "📚 챗봇 사용 가이드",
                sections: [
                    {
                        title: "✏️ 기본 사용법",
                        items: [
                            { label: "채팅", desc: "메시지를 입력하고 Send 버튼을 클릭하세요." },
                            { label: "한국어 지원", desc: "한국어로 말해도 챗봇이 이해하고 대답해요!" },
                            { label: "AI 피드백", desc: "문법, 표현에 대한 자연스러운 교정을 제안합니다." },
                            { label: "복사 기능", desc: "📋 버튼을 클릭하면 손쉽게 복사가 가능해요." },
                            { label: "간단 번역", desc: "글자를 드래그하면 🔍 버튼이 표시됩니다. 클릭하여 번역된 내용을 확인하고, 복사하거나 원문을 음성으로 들을 수 있습니다." }
                        ]
                    },
                    {
                        title: "🎙️ 음성 기능",
                        items: [
                            { label: "음성 대화 모드", desc: "🎙️ 버튼을 클릭하면 음성 모드로 전환됩니다. 영어로 챗봇과 대화를 주고받을 수 있어요. 채팅 모드로 돌아올 때는 다시 한 번 눌러주세요." },
                            { label: "읽기 버튼", desc: "메시지의 🔊 버튼을 클릭하면 문장을 읽어줍니다." },
                            { label: "음성 설정", desc: "상단의 🔊 버튼을 클릭하면 속도와 타입을 변경할 수 있습니다. (Google US English 추천!)" }
                        ]
                    },
                    {
                        title: "⚙️ 화면 설정",
                        items: [
                            { label: "글자 크기", desc: "상단의 +/- 버튼으로 글자 크기 조절이 가능합니다." },
                            { label: "상단 헤더 접기", desc: "▼ 버튼을 클릭하여 접거나 펼칠 수 있습니다. 모바일 화면에서는 첫 메시지 전송 시 자동으로 접힙니다." }
                        ]
                    },
                    {
                        title: "💡 학습 팁",
                        items: [
                            { label: "", desc: "완벽하지 않아도 괜찮습니다. 자연스럽게 대화해보세요." },
                            { label: "", desc: "AI 챗봇이 제안하는 개선사항을 적극 활용하여 실력을 향상시키세요." },
                            { label: "", desc: "같은 주제로 여러 번 대화하며 다양한 표현력을 배워보세요." }
                        ]
                    }
                ]
            },
            en: {
                title: "📚 Chatbot Usage Guide",
                sections: [
                    {
                        title: "✏️ Basic Usage",
                        items: [
                            { label: "Chat", desc: "Type your message and click the Send button." },
                            { label: "Korean Support", desc: "Feel free to speak in Korean! The chatbot understands and responds." },
                            { label: "AI Feedback", desc: "Get natural grammar and expression correction suggestions." },
                            { label: "Copy Feature", desc: "Click the 📋 button to easily copy text." },
                            { label: "Translation", desc: "Select English words or sentences in messages to see a 🔍 button. Click for instant translation, copy result, or hear original text spoken aloud." }
                        ]
                    },
                    {
                        title: "🎙️ Voice Features",
                        items: [
                            { label: "Voice Chat Mode", desc: "Click the 🎙️ button to switch to voice mode and have English conversations with the chatbot. Click again to return to chat mode." },
                            { label: "Read Aloud", desc: "Click the 🔊 button next to messages to hear them spoken." },
                            { label: "Voice Settings", desc: "Click the top 🔊 button to adjust speed and type of voice. (Google US English recommended!)" }
                        ]
                    },
                    {
                        title: "⚙️ Interface Settings",
                        items: [
                            { label: "Text Size", desc: "Use the +/- buttons at the top to adjust font size." },
                            { label: "Collapse Header", desc: "Click the ▼ button to collapse or expand the header. On mobile, it automatically collapses after your first message." }
                        ]
                    },
                    {
                        title: "💡 Learning Tips",
                        items: [
                            { label: "", desc: "Don't worry about being perfect - just chat naturally!" },
                            { label: "", desc: "Actively use the AI's suggestions to improve your skills." },
                            { label: "", desc: "Practice the same topics multiple times to expand your expressions." }
                        ]
                    }
                ]
            }
        };
    }
    
    setupGuideSystem() {
        this.createFloatingButton();
        this.createGuidePanel();
        this.setupEventListeners();
        this.addTooltipsToExistingFeatures();
    }
    
    createFloatingButton() {
        this.floatingBtn = document.createElement('div');
        this.floatingBtn.id = 'help-floating-btn';
        this.floatingBtn.className = 'help-floating-btn';
        this.floatingBtn.title = '챗봇 가이드 보기';
        this.floatingBtn.innerHTML = '<span class="help-icon">💡</span>';
        
        // Append to chat-messages container instead of body
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.appendChild(this.floatingBtn);
        } else {
            // Fallback to body if chat-messages not found
            document.body.appendChild(this.floatingBtn);
        }
    }
    
    createGuidePanel() {
        this.guidePanel = document.createElement('div');
        this.guidePanel.id = 'help-panel';
        this.guidePanel.className = 'help-panel hidden';
        
        this.guidePanel.innerHTML = `
            <div>
                <div class="help-panel-header">
                    <h3 id="help-panel-title">📚 Chatbot Usage Guide</h3>
                    <div class="language-toggle">
                        <button class="lang-btn ${this.currentLanguage === 'en' ? 'active' : ''}" data-lang="en">English</button>
                        <button class="lang-btn ${this.currentLanguage === 'ko' ? 'active' : ''}" data-lang="ko">한국어</button>
                    </div>
                    <button id="help-close-btn" class="help-close-btn">&times;</button>
                </div>
                <div class="help-panel-content" id="help-panel-content">
                    ${this.generateContent(this.currentLanguage)}
                </div>
            </div>
        `;
        
        document.body.appendChild(this.guidePanel);
    }
    
    generateContent(language) {
        const content = this.guideContent[language];
        
        return content.sections.map(section => `
            <div class="help-section">
                <h4>${section.title}</h4>
                <ul>
                    ${section.items.map(item => `
                        <li>${item.label ? `<strong>${item.label}</strong> - ` : ''}${item.desc}</li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        // Floating button click
        this.floatingBtn.addEventListener('click', () => this.toggleGuidePanel());
        
        // Close button click
        const closeBtn = document.getElementById('help-close-btn');
        closeBtn.addEventListener('click', () => this.hideGuidePanel());
        
        // Language toggle buttons
        const langButtons = this.guidePanel.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newLang = e.target.dataset.lang;
                this.switchLanguage(newLang);
            });
        });
        
        // Panel overlay click (close when clicking outside)
        this.guidePanel.addEventListener('click', (e) => {
            if (e.target === this.guidePanel) {
                this.hideGuidePanel();
            }
        });
        
        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isGuideVisible) {
                this.hideGuidePanel();
            }
        });
    }
    
    switchLanguage(language) {
        if (this.currentLanguage === language) return;
        
        this.currentLanguage = language;
        localStorage.setItem('guideLanguage', language);
        
        // Update title
        const title = document.getElementById('help-panel-title');
        title.textContent = this.guideContent[language].title;
        
        // Update content with animation
        const contentDiv = document.getElementById('help-panel-content');
        contentDiv.style.opacity = '0.5';
        contentDiv.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            contentDiv.innerHTML = this.generateContent(language);
            contentDiv.style.opacity = '1';
            contentDiv.style.transform = 'translateY(0)';
        }, 150);
        
        // Update active button
        const langButtons = this.guidePanel.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === language);
        });
    }
    
    addTooltipsToExistingFeatures() {
        // Add tooltips to existing buttons that don't have titles
        const tooltipMappings = [
            { selector: '#send-btn', text: 'Enter 키로도 전송할 수 있습니다' },
            { selector: '.read-btn.inline', text: '메시지를 소리로 들어보세요' },
            { selector: '.copy-btn', text: '클립보드에 복사하기' }
        ];
        
        tooltipMappings.forEach(({ selector, text }) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!element.title) {
                    element.title = text;
                }
            });
        });
    }
    
    toggleGuidePanel() {
        if (this.isGuideVisible) {
            this.hideGuidePanel();
        } else {
            this.showGuidePanel();
        }
    }
    
    showGuidePanel() {
        this.guidePanel.classList.remove('hidden');
        this.isGuideVisible = true;
        
        // Focus management for accessibility
        const closeBtn = document.getElementById('help-close-btn');
        setTimeout(() => closeBtn.focus(), 100);
        
        // Hide floating button when panel is open
        this.floatingBtn.style.display = 'none';
    }
    
    hideGuidePanel() {
        this.guidePanel.classList.add('hidden');
        this.isGuideVisible = false;
        
        // Show floating button again
        this.floatingBtn.style.display = 'flex';
        
        // Return focus to floating button
        this.floatingBtn.focus();
    }
    
    // Enhanced tooltip functionality
    showTooltip(element, text, position = 'top') {
        this.hideTooltip(); // Hide any existing tooltip
        
        const tooltip = document.createElement('div');
        tooltip.className = 'guide-tooltip';
        tooltip.textContent = text;
        
        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
        
        // Position the tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;
        
        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 8;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 8;
                break;
        }
        
        // Keep tooltip within viewport
        top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));
        left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.opacity = '1';
    }
    
    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }
    
    // Method to update guide content if needed
    updateGuideContent(newContent) {
        const contentDiv = this.guidePanel.querySelector('.help-panel-content');
        if (contentDiv && newContent) {
            contentDiv.innerHTML = newContent;
        }
    }
}