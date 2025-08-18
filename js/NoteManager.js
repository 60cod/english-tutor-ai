// NoteManager.js - Notes management system with localStorage and export functionality
class NoteManager {
    constructor() {
        this.storageKey = 'englishTutorAI_notes';
        this.notes = [];
        this.currentCategory = 'all';
        this.searchTerm = '';
        
        // Resize properties
        this.currentWidth = 400;
        this.minWidth = 300;
        this.maxWidth = 600;
        this.isResizing = false;
        
        this.initializeElements();
        this.loadNotes();
        this.bindEvents();
        this.updateDisplay();
        this.updateNotesCountBadge();
        this.loadPanelWidth();
        
        // Auto-backup reminder (every 7 days)
        this.checkBackupReminder();
    }
    
    initializeElements() {
        // Panel elements
        this.notesPanel = document.getElementById('notes-panel');
        this.notesOverlay = document.getElementById('notes-overlay');
        this.notesToggle = document.getElementById('notes-toggle');
        this.notesClose = document.getElementById('notes-close');
        
        // Content elements
        this.notesList = document.getElementById('notes-list');
        this.notesSearch = document.getElementById('notes-search');
        this.notesSearchClear = document.getElementById('notes-search-clear');
        
        // Category elements
        this.categoryTabs = document.querySelectorAll('.notes-category-tab');
        
        // Add note elements
        this.addInput = document.getElementById('notes-add-input');
        this.addCategory = document.getElementById('notes-add-category');
        this.addBtn = document.getElementById('notes-add-btn');
        
        // Toolbar elements
        this.exportBtn = document.getElementById('notes-export');
        this.importBtn = document.getElementById('notes-import');
        this.clearAllBtn = document.getElementById('notes-clear-all');
        this.importInput = document.getElementById('notes-import-input');
        
        // Resize elements
        this.resizeHandle = document.getElementById('notes-resize-handle');
    }
    
    bindEvents() {
        // Panel toggle events
        this.notesToggle?.addEventListener('click', () => this.togglePanel());
        this.notesClose?.addEventListener('click', () => this.closePanel());
        this.notesOverlay?.addEventListener('click', () => this.closePanel());
        
        // Search events
        this.notesSearch?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.notesSearchClear?.addEventListener('click', () => this.clearSearch());
        
        // Category events
        this.categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchCategory(tab.dataset.category));
        });
        
        // Add note events
        this.addBtn?.addEventListener('click', () => this.addNote());
        this.addInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.addNote();
            }
        });
        
        // Toolbar events
        this.exportBtn?.addEventListener('click', () => this.exportNotes());
        this.importBtn?.addEventListener('click', () => this.importInput?.click());
        this.clearAllBtn?.addEventListener('click', () => this.clearAllNotes());
        this.importInput?.addEventListener('change', (e) => this.importNotes(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'n' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
                e.preventDefault();
                this.togglePanel();
            }
        });
        
        // Resize functionality
        this.bindResizeEvents();
    }
    
    // Data Management
    loadNotes() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this.notes = stored ? JSON.parse(stored) : [];
            
            // Migrate old format if needed
            this.notes = this.notes.map(note => ({
                id: note.id || this.generateId(),
                text: note.text || '',
                category: note.category || 'general',
                timestamp: note.timestamp || Date.now(),
                tags: note.tags || [],
                ...note
            }));
            
            this.saveNotes();
        } catch (error) {
            console.error('Failed to load notes:', error);
            this.notes = [];
        }
    }
    
    saveNotes() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
            this.updateDisplay();
            this.updateNotesCountBadge();
            
            // Show backup reminder if notes are getting substantial
            if (this.notes.length > 50 && !localStorage.getItem('backup_reminder_shown')) {
                this.showBackupReminder();
            }
        } catch (error) {
            console.error('Failed to save notes:', error);
            this.showError('Failed to save notes. Storage may be full.');
        }
    }
    
    generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Note Operations
    addNote(text = null, category = null, fromSource = null) {
        const noteText = text || this.addInput?.value.trim();
        const noteCategory = category || this.addCategory?.value || 'general';
        
        if (!noteText) {
            this.addInput?.focus();
            return;
        }
        
        const note = {
            id: this.generateId(),
            text: noteText,
            category: noteCategory,
            timestamp: Date.now(),
            tags: this.extractTags(noteText),
            source: fromSource || 'manual'
        };
        
        this.notes.unshift(note); // Add to top
        this.saveNotes();
        this.updateNotesCountBadge();
        
        // Clear input and show success
        if (this.addInput) {
            this.addInput.value = '';
        }
        
        this.showSuccess(`Note added to ${this.getCategoryLabel(noteCategory)}`);
        
        // Open panel if it was closed
        if (!this.notesPanel?.classList.contains('open')) {
            this.openPanel();
        }
        
        return note.id;
    }
    
    editNote(id, newText) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            note.text = newText.trim();
            note.tags = this.extractTags(newText);
            note.editedAt = Date.now();
            this.saveNotes();
            this.showSuccess('Note updated');
        }
    }
    
    deleteNote(id) {
        const index = this.notes.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notes.splice(index, 1);
            this.saveNotes();
            this.showSuccess('Note deleted');
        }
    }
    
    duplicateNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            const newNote = {
                ...note,
                id: this.generateId(),
                timestamp: Date.now(),
                text: note.text + ' (copy)'
            };
            this.notes.unshift(newNote);
            this.saveNotes();
            this.showSuccess('Note duplicated');
        }
    }
    
    // Utility Functions
    extractTags(text) {
        // Extract hashtags and common patterns
        const hashtags = text.match(/#\w+/g) || [];
        const mentions = text.match(/@\w+/g) || [];
        return [...hashtags, ...mentions];
    }
    
    getCategoryLabel(category) {
        const labels = {
            general: '📝 General',
            corrections: '✏️ Corrections',
            expressions: '💡 Expressions',
            translations: '🌐 Translations'
        };
        return labels[category] || category;
    }
    
    getCategoryEmoji(category) {
        const emojis = {
            general: '📝',
            corrections: '✏️',
            expressions: '💡',
            translations: '🌐'
        };
        return emojis[category] || '📝';
    }
    
    // Panel Management
    togglePanel() {
        if (this.notesPanel?.classList.contains('open')) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }
    
    openPanel() {
        if (this.notesPanel) {
            this.notesPanel.classList.add('open');
            // 열릴 때는 CSS 클래스가 처리하지만, 인라인 스타일이 있다면 제거
            this.notesPanel.style.right = '';
        }
        this.notesOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus search if panel has content, otherwise focus add input
        if (this.notes.length > 0) {
            this.notesSearch?.focus();
        } else {
            this.addInput?.focus();
        }
    }
    
    closePanel() {
        if (this.notesPanel) {
            this.notesPanel.classList.remove('open');
            // 닫힐 때는 현재 너비에 맞춰 right 값 설정
            this.notesPanel.style.right = `-${this.currentWidth}px`;
        }
        this.notesOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Search and Filter
    handleSearch(term) {
        this.searchTerm = term.toLowerCase().trim();
        this.updateDisplay();
        
        // Show/hide clear button
        if (this.notesSearchClear) {
            this.notesSearchClear.style.display = term ? 'flex' : 'none';
        }
    }
    
    clearSearch() {
        if (this.notesSearch) {
            this.notesSearch.value = '';
        }
        this.handleSearch('');
    }
    
    switchCategory(category) {
        this.currentCategory = category;
        
        // Update active tab
        this.categoryTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        this.updateDisplay();
    }
    
    getFilteredNotes() {
        let filtered = this.notes;
        
        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(note => note.category === this.currentCategory);
        }
        
        // Filter by search term
        if (this.searchTerm) {
            filtered = filtered.filter(note =>
                note.text.toLowerCase().includes(this.searchTerm) ||
                note.tags.some(tag => tag.toLowerCase().includes(this.searchTerm))
            );
        }
        
        return filtered;
    }
    
    // Display Management
    updateDisplay() {
        if (!this.notesList) return;
        
        const filteredNotes = this.getFilteredNotes();
        
        if (filteredNotes.length === 0) {
            this.showEmptyState();
        } else {
            this.renderNotes(filteredNotes);
        }
        
        this.updateCategoryCounts();
    }
    
    updateNotesCountBadge() {
        const badge = document.getElementById('notes-count-badge');
        if (badge) {
            const count = this.notes.length;
            badge.textContent = count;
            
            if (count > 0) {
                badge.classList.add('show');
            } else {
                badge.classList.remove('show');
            }
        }
    }
    
    showEmptyState() {
        const message = this.searchTerm 
            ? `No notes found for "${this.searchTerm}"`
            : this.currentCategory === 'all' 
                ? 'No notes yet'
                : `No notes in ${this.getCategoryLabel(this.currentCategory)}`;
                
        this.notesList.innerHTML = `
            <div class="notes-empty-state">
                <p>📝 ${message}</p>
                <p>${this.searchTerm ? 'Try a different search term.' : 'Click the note buttons in chat messages to start collecting useful expressions and corrections!'}</p>
            </div>
        `;
    }
    
    renderNotes(notes) {
        this.notesList.innerHTML = notes.map(note => this.createNoteHTML(note)).join('');
        
        // Bind note events
        this.bindNoteEvents();
    }
    
    createNoteHTML(note) {
        const timeAgo = this.getTimeAgo(note.timestamp);
        const isEdited = note.editedAt ? ' (edited)' : '';
        
        return `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-header">
                    <span class="note-category">${this.getCategoryLabel(note.category)}</span>
                    <div class="note-actions">
                        <button class="note-action-btn note-edit-btn" title="Edit note">✏️</button>
                        <button class="note-action-btn note-copy-btn" title="Copy note">📋</button>
                        <button class="note-action-btn note-duplicate-btn" title="Duplicate note">📄</button>
                        <button class="note-action-btn note-delete-btn" title="Delete note">🗑️</button>
                    </div>
                </div>
                <div class="note-text" contenteditable="false">${this.escapeHtml(note.text)}</div>
                <div class="note-timestamp">${timeAgo}${isEdited}</div>
                ${note.tags.length > 0 ? `<div class="note-tags">${note.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('')}</div>` : ''}
            </div>
        `;
    }
    
    bindNoteEvents() {
        // Edit buttons
        document.querySelectorAll('.note-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteItem = e.target.closest('.note-item');
                this.startEditing(noteItem);
            });
        });
        
        // Copy buttons
        document.querySelectorAll('.note-copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteItem = e.target.closest('.note-item');
                const noteText = noteItem.querySelector('.note-text').textContent;
                this.copyToClipboard(noteText);
            });
        });
        
        // Duplicate buttons
        document.querySelectorAll('.note-duplicate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.target.closest('.note-item').dataset.noteId;
                this.duplicateNote(noteId);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.note-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.target.closest('.note-item').dataset.noteId;
                if (confirm('Are you sure you want to delete this note?')) {
                    this.deleteNote(noteId);
                }
            });
        });
    }
    
    startEditing(noteItem) {
        const noteText = noteItem.querySelector('.note-text');
        const originalText = noteText.textContent;
        
        noteText.contentEditable = true;
        noteText.focus();
        noteText.style.background = '#f0f8ff';
        noteText.style.padding = '8px';
        noteText.style.borderRadius = '4px';
        noteText.style.border = '1px solid #3b82f6';
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(noteText);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        
        const saveEdit = () => {
            const newText = noteText.textContent.trim();
            if (newText && newText !== originalText) {
                this.editNote(noteItem.dataset.noteId, newText);
            }
            this.cancelEdit(noteText, originalText);
        };
        
        const cancelEdit = () => {
            this.cancelEdit(noteText, originalText);
        };
        
        // Save on Enter, cancel on Escape
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        };
        
        noteText.addEventListener('keydown', handleKeyDown);
        noteText.addEventListener('blur', saveEdit, { once: true });
    }
    
    cancelEdit(noteText, originalText) {
        noteText.contentEditable = false;
        noteText.textContent = originalText;
        noteText.style.background = '';
        noteText.style.padding = '';
        noteText.style.borderRadius = '';
        noteText.style.border = '';
    }
    
    updateCategoryCounts() {
        this.categoryTabs.forEach(tab => {
            const category = tab.dataset.category;
            let count;
            
            if (category === 'all') {
                count = this.notes.length;
            } else {
                count = this.notes.filter(note => note.category === category).length;
            }
            
            // Update tab text with count
            const baseText = tab.textContent.replace(/\s*\(\d+\)$/, '');
            tab.textContent = count > 0 ? `${baseText} (${count})` : baseText;
        });
    }
    
    // Import/Export
    exportNotes() {
        try {
            const exportData = {
                notes: this.notes,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `english-tutor-notes-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccess('Notes exported successfully!');
            localStorage.setItem('backup_reminder_shown', Date.now());
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Failed to export notes');
        }
    }
    
    importNotes(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const importedNotes = data.notes || data; // Support both formats
                
                if (!Array.isArray(importedNotes)) {
                    throw new Error('Invalid file format');
                }
                
                const validNotes = importedNotes.filter(note => 
                    note && typeof note.text === 'string' && note.text.trim()
                );
                
                if (validNotes.length === 0) {
                    this.showError('No valid notes found in file');
                    return;
                }
                
                // Ask user how to handle import
                const action = confirm(
                    `Import ${validNotes.length} notes?\n\nOK = Replace all notes\nCancel = Add to existing notes`
                );
                
                if (action) {
                    // Replace all notes
                    this.notes = validNotes.map(note => ({
                        ...note,
                        id: note.id || this.generateId(),
                        timestamp: note.timestamp || Date.now(),
                        category: note.category || 'general'
                    }));
                } else {
                    // Add to existing notes
                    const newNotes = validNotes.map(note => ({
                        ...note,
                        id: this.generateId(),
                        timestamp: Date.now(),
                        category: note.category || 'general'
                    }));
                    this.notes.unshift(...newNotes);
                }
                
                this.saveNotes();
                this.showSuccess(`Successfully imported ${validNotes.length} notes!`);
                
            } catch (error) {
                console.error('Import failed:', error);
                this.showError('Failed to import notes. Please check file format.');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Clear file input
    }
    
    clearAllNotes() {
        if (!confirm(`Are you sure you want to delete all ${this.notes.length} notes? This cannot be undone.`)) {
            return;
        }
        
        // Offer to export before clearing
        if (this.notes.length > 0 && confirm('Would you like to export your notes before deleting them?')) {
            this.exportNotes();
            setTimeout(() => {
                this.notes = [];
                this.saveNotes();
                this.showSuccess('All notes cleared');
            }, 1000);
        } else {
            this.notes = [];
            this.saveNotes();
            this.showSuccess('All notes cleared');
        }
    }
    
    // Backup Reminders
    checkBackupReminder() {
        const lastBackup = localStorage.getItem('backup_reminder_shown');
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (this.notes.length > 20 && (!lastBackup || Date.now() - parseInt(lastBackup) > sevenDays)) {
            setTimeout(() => this.showBackupReminder(), 5000);
        }
    }
    
    showBackupReminder() {
        if (confirm('💾 Backup Reminder\n\nYou have ' + this.notes.length + ' notes. Would you like to export them as a backup?\n\nRecommended: Export your notes regularly to prevent data loss.')) {
            this.exportNotes();
        }
        localStorage.setItem('backup_reminder_shown', Date.now());
    }
    
    // Utility Functions
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showSuccess('Copied to clipboard');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess('Copied to clipboard');
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const week = 7 * day;
        const month = 30 * day;
        
        if (diff < minute) return 'Just now';
        if (diff < hour) return Math.floor(diff / minute) + 'm ago';
        if (diff < day) return Math.floor(diff / hour) + 'h ago';
        if (diff < week) return Math.floor(diff / day) + 'd ago';
        if (diff < month) return Math.floor(diff / week) + 'w ago';
        return new Date(timestamp).toLocaleDateString();
    }
    
    // Notification System
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.notes-toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `notes-toast notes-toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Resize Functionality
    bindResizeEvents() {
        if (!this.resizeHandle) return;
        
        this.resizeHandle.addEventListener('mousedown', (e) => {
            this.startResize(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isResizing) {
                this.doResize(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.stopResize();
            }
        });
    }
    
    startResize(e) {
        this.isResizing = true;
        this.startX = e.clientX;
        this.startWidth = this.currentWidth;
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        if (this.notesPanel) {
            this.notesPanel.classList.add('resizing');
        }
        
        e.preventDefault();
    }
    
    doResize(e) {
        if (!this.isResizing) return;
        
        const deltaX = this.startX - e.clientX; // Inverted because panel is on the right
        const newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.startWidth + deltaX));
        
        this.currentWidth = newWidth;
        this.updatePanelWidth();
    }
    
    stopResize() {
        this.isResizing = false;
        
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        if (this.notesPanel) {
            this.notesPanel.classList.remove('resizing');
        }
        
        this.savePanelWidth();
    }
    
    updatePanelWidth() {
        if (this.notesPanel) {
            this.notesPanel.style.width = `${this.currentWidth}px`;
            
            // 패널이 닫혀있을 때의 right 값을 동적으로 설정
            if (!this.notesPanel.classList.contains('open')) {
                this.notesPanel.style.right = `-${this.currentWidth}px`;
            }
        }
    }
    
    loadPanelWidth() {
        try {
            const savedWidth = localStorage.getItem('englishTutorAI_panelWidth');
            if (savedWidth) {
                this.currentWidth = Math.max(this.minWidth, Math.min(this.maxWidth, parseInt(savedWidth)));
                this.updatePanelWidth();
            }
        } catch (error) {
            console.error('Failed to load panel width:', error);
        }
    }
    
    savePanelWidth() {
        try {
            localStorage.setItem('englishTutorAI_panelWidth', this.currentWidth.toString());
        } catch (error) {
            console.error('Failed to save panel width:', error);
        }
    }
    
    // Public API for integration
    addNoteFromSource(text, category, source) {
        return this.addNote(text, category, source);
    }
    
    isOpen() {
        return this.notesPanel?.classList.contains('open') || false;
    }
    
    getNotesCount() {
        return this.notes.length;
    }
    
    getCategoryCount(category) {
        return this.notes.filter(note => note.category === category).length;
    }
}

// Initialize notes manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.noteManager = new NoteManager();
});