/**
 * Enhanced Content Editor - Comments and Suggestions Module
 * Handles collaborative commenting and content review workflows
 */

class EditorComments {
    constructor(editor) {
        this.editor = editor;
        this.isVisible = false;
        this.comments = [];
        this.suggestions = [];
        this.commentStorage = new CommentStorage();
        this.currentSelection = null;
        this.activeThread = null;
        
        this.init();
    }

    /**
     * Initialize comments system
     */
    init() {
        this.setupEventHandlers();
        this.loadComments();
        this.setupSelectionHandlers();
        
        console.log('Comments system initialized');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Listen for collaboration comment events
        if (this.editor.collaborativeSession) {
            this.editor.collaborativeSession.socket?.on('comment:added', (comment) => {
                this.handleRemoteComment(comment);
            });
            
            this.editor.collaborativeSession.socket?.on('comment:updated', (comment) => {
                this.handleCommentUpdate(comment);
            });
            
            this.editor.collaborativeSession.socket?.on('comment:resolved', (commentId) => {
                this.handleCommentResolution(commentId);
            });
        }
    }

    /**
     * Setup selection handlers for inline commenting
     */
    setupSelectionHandlers() {
        this.editor.editor.on('beforeSelectionChange', (instance, obj) => {
            const selection = instance.getSelection();
            if (selection.length > 0) {
                this.currentSelection = {
                    text: selection,
                    from: obj.ranges[0].anchor,
                    to: obj.ranges[0].head,
                    line: obj.ranges[0].anchor.line
                };
            } else {
                this.currentSelection = null;
            }
        });
    }

    /**
     * Toggle comments panel
     */
    toggle() {
        this.isVisible = !this.isVisible;
        const panel = document.getElementById('commentsPanel');
        
        if (this.isVisible) {
            panel.classList.add('active');
            this.refreshCommentsList();
        } else {
            panel.classList.remove('active');
        }
    }

    /**
     * Load comments for current document
     */
    async loadComments() {
        try {
            const documentId = this.editor.currentDocument?.id || 'default';
            const comments = await this.fetchCommentsFromServer(documentId);
            this.comments = comments;
            
            if (this.isVisible) {
                this.renderCommentsList();
            }
            
            this.renderInlineComments();
            
        } catch (error) {
            console.error('Failed to load comments:', error);
            // Fallback to local storage
            this.comments = await this.commentStorage.getComments(documentId);
            this.renderCommentsList();
            this.renderInlineComments();
        }
    }

    /**
     * Fetch comments from server
     */
    async fetchCommentsFromServer(documentId) {
        const response = await fetch(`/api/documents/${documentId}/comments`, {
            headers: {
                'Authorization': `Bearer ${this.editor.getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.comments || [];
    }

    /**
     * Add a new comment
     */
    async addComment() {
        const inputEl = document.getElementById('commentInput');
        const text = inputEl.value.trim();
        
        if (!text) {
            return;
        }

        try {
            const comment = {
                id: this.generateCommentId(),
                documentId: this.editor.currentDocument?.id || 'default',
                text: text,
                author: {
                    id: this.getUserId(),
                    name: this.getUserName(),
                    avatar: this.getUserAvatar()
                },
                timestamp: Date.now(),
                position: this.currentSelection ? {
                    line: this.currentSelection.line,
                    from: this.currentSelection.from,
                    to: this.currentSelection.to,
                    selectedText: this.currentSelection.text
                } : null,
                type: 'comment',
                status: 'open',
                replies: []
            };

            // Save comment
            await this.saveComment(comment);
            
            // Add to local list
            this.comments.unshift(comment);
            
            // Clear input
            inputEl.value = '';
            
            // Update UI
            this.refreshCommentsList();
            this.renderInlineComments();
            
            // Notify collaboration
            if (this.editor.collaborativeSession) {
                this.editor.collaborativeSession.socket?.emit('comment:add', comment);
            }
            
            this.editor.showNotification('Comment added successfully', 'success');
            
        } catch (error) {
            console.error('Failed to add comment:', error);
            this.editor.showNotification('Failed to add comment', 'error');
        }
    }

    /**
     * Add a suggestion
     */
    async addSuggestion(suggestedText) {
        if (!this.currentSelection) {
            this.editor.showNotification('Please select text to suggest changes', 'warning');
            return;
        }

        try {
            const suggestion = {
                id: this.generateCommentId(),
                documentId: this.editor.currentDocument?.id || 'default',
                text: `Suggested change: "${suggestedText}"`,
                author: {
                    id: this.getUserId(),
                    name: this.getUserName(),
                    avatar: this.getUserAvatar()
                },
                timestamp: Date.now(),
                position: {
                    line: this.currentSelection.line,
                    from: this.currentSelection.from,
                    to: this.currentSelection.to,
                    selectedText: this.currentSelection.text
                },
                type: 'suggestion',
                status: 'pending',
                suggestedText: suggestedText,
                originalText: this.currentSelection.text,
                replies: []
            };

            await this.saveComment(suggestion);
            this.comments.unshift(suggestion);
            
            this.refreshCommentsList();
            this.renderInlineComments();
            
            if (this.editor.collaborativeSession) {
                this.editor.collaborativeSession.socket?.emit('comment:add', suggestion);
            }
            
            this.editor.showNotification('Suggestion added successfully', 'success');
            
        } catch (error) {
            console.error('Failed to add suggestion:', error);
            this.editor.showNotification('Failed to add suggestion', 'error');
        }
    }

    /**
     * Save comment to server and local storage
     */
    async saveComment(comment) {
        try {
            // Save to server
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.editor.getAuthToken()}`
                },
                body: JSON.stringify(comment)
            });

            if (!response.ok) {
                throw new Error('Failed to save comment to server');
            }
            
        } catch (error) {
            console.warn('Server save failed, using local storage:', error);
        }
        
        // Always save to local storage as backup
        await this.commentStorage.saveComment(comment);
    }

    /**
     * Reply to a comment
     */
    async replyToComment(commentId, replyText) {
        if (!replyText.trim()) return;

        try {
            const reply = {
                id: this.generateCommentId(),
                text: replyText,
                author: {
                    id: this.getUserId(),
                    name: this.getUserName(),
                    avatar: this.getUserAvatar()
                },
                timestamp: Date.now()
            };

            // Find and update comment
            const comment = this.comments.find(c => c.id === commentId);
            if (!comment) {
                throw new Error('Comment not found');
            }

            comment.replies.push(reply);
            
            // Save updated comment
            await this.saveComment(comment);
            
            // Update UI
            this.refreshCommentsList();
            
            // Notify collaboration
            if (this.editor.collaborativeSession) {
                this.editor.collaborativeSession.socket?.emit('comment:reply', {
                    commentId,
                    reply
                });
            }
            
        } catch (error) {
            console.error('Failed to add reply:', error);
            this.editor.showNotification('Failed to add reply', 'error');
        }
    }

    /**
     * Resolve a comment
     */
    async resolveComment(commentId) {
        try {
            const comment = this.comments.find(c => c.id === commentId);
            if (!comment) return;

            comment.status = 'resolved';
            comment.resolvedBy = {
                id: this.getUserId(),
                name: this.getUserName()
            };
            comment.resolvedAt = Date.now();

            await this.saveComment(comment);
            
            this.refreshCommentsList();
            this.renderInlineComments();
            
            if (this.editor.collaborativeSession) {
                this.editor.collaborativeSession.socket?.emit('comment:resolve', commentId);
            }
            
        } catch (error) {
            console.error('Failed to resolve comment:', error);
            this.editor.showNotification('Failed to resolve comment', 'error');
        }
    }

    /**
     * Accept a suggestion
     */
    async acceptSuggestion(commentId) {
        try {
            const suggestion = this.comments.find(c => c.id === commentId);
            if (!suggestion || suggestion.type !== 'suggestion') return;

            // Apply the suggestion to the editor
            if (suggestion.position) {
                this.editor.editor.replaceRange(
                    suggestion.suggestedText,
                    suggestion.position.from,
                    suggestion.position.to
                );
            }

            // Mark as accepted
            suggestion.status = 'accepted';
            suggestion.acceptedBy = {
                id: this.getUserId(),
                name: this.getUserName()
            };
            suggestion.acceptedAt = Date.now();

            await this.saveComment(suggestion);
            
            this.refreshCommentsList();
            this.renderInlineComments();
            
            this.editor.showNotification('Suggestion accepted and applied', 'success');
            
        } catch (error) {
            console.error('Failed to accept suggestion:', error);
            this.editor.showNotification('Failed to accept suggestion', 'error');
        }
    }

    /**
     * Reject a suggestion
     */
    async rejectSuggestion(commentId) {
        try {
            const suggestion = this.comments.find(c => c.id === commentId);
            if (!suggestion || suggestion.type !== 'suggestion') return;

            suggestion.status = 'rejected';
            suggestion.rejectedBy = {
                id: this.getUserId(),
                name: this.getUserName()
            };
            suggestion.rejectedAt = Date.now();

            await this.saveComment(suggestion);
            
            this.refreshCommentsList();
            this.renderInlineComments();
            
        } catch (error) {
            console.error('Failed to reject suggestion:', error);
            this.editor.showNotification('Failed to reject suggestion', 'error');
        }
    }

    /**
     * Delete a comment
     */
    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            // Remove from server
            await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.editor.getAuthToken()}`
                }
            });

            // Remove from local storage
            await this.commentStorage.deleteComment(commentId);
            
            // Remove from local list
            this.comments = this.comments.filter(c => c.id !== commentId);
            
            this.refreshCommentsList();
            this.renderInlineComments();
            
            if (this.editor.collaborativeSession) {
                this.editor.collaborativeSession.socket?.emit('comment:delete', commentId);
            }
            
        } catch (error) {
            console.error('Failed to delete comment:', error);
            this.editor.showNotification('Failed to delete comment', 'error');
        }
    }

    /**
     * Refresh comments list UI
     */
    refreshCommentsList() {
        if (this.isVisible) {
            this.renderCommentsList();
        }
        
        this.updateCommentsCount();
    }

    /**
     * Render comments list in panel
     */
    renderCommentsList() {
        const container = document.getElementById('commentsList');
        if (!container) return;

        if (this.comments.length === 0) {
            container.innerHTML = `
                <div class="comments-empty">
                    <p>No comments yet</p>
                    <small>Select text and add a comment to start the conversation</small>
                </div>
            `;
            return;
        }

        // Group comments by status
        const openComments = this.comments.filter(c => c.status === 'open');
        const pendingSuggestions = this.comments.filter(c => c.type === 'suggestion' && c.status === 'pending');
        const resolvedComments = this.comments.filter(c => c.status === 'resolved' || c.status === 'accepted' || c.status === 'rejected');

        container.innerHTML = `
            ${this.renderCommentSection('Open Comments', openComments)}
            ${this.renderCommentSection('Pending Suggestions', pendingSuggestions)}
            ${this.renderCommentSection('Resolved', resolvedComments)}
        `;
    }

    /**
     * Render comment section
     */
    renderCommentSection(title, comments) {
        if (comments.length === 0) return '';

        return `
            <div class="comment-section">
                <div class="comment-section-header">
                    <h4>${title}</h4>
                    <span class="comment-count">${comments.length}</span>
                </div>
                <div class="comment-section-content">
                    ${comments.map(comment => this.renderCommentItem(comment)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render individual comment item
     */
    renderCommentItem(comment) {
        const isAuthor = comment.author.id === this.getUserId();
        const typeIcon = this.getCommentTypeIcon(comment.type);
        const statusClass = this.getStatusClass(comment.status);
        
        return `
            <div class="comment-item ${statusClass}" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <div class="author-avatar">
                            ${comment.author.avatar ? 
                                `<img src="${comment.author.avatar}" alt="${comment.author.name}">` : 
                                comment.author.name.charAt(0).toUpperCase()
                            }
                        </div>
                        <div class="author-info">
                            <span class="author-name">${comment.author.name}</span>
                            <span class="comment-time">${this.formatTimeAgo(comment.timestamp)}</span>
                        </div>
                    </div>
                    <div class="comment-type">${typeIcon}</div>
                </div>
                
                <div class="comment-content">
                    ${comment.position?.selectedText ? `
                        <div class="comment-context">
                            <span class="context-label">On:</span>
                            <span class="context-text">"${comment.position.selectedText}"</span>
                        </div>
                    ` : ''}
                    
                    <div class="comment-text">${this.formatCommentText(comment.text)}</div>
                    
                    ${comment.type === 'suggestion' ? `
                        <div class="suggestion-details">
                            <div class="suggestion-change">
                                <div class="change-from">- ${comment.originalText}</div>
                                <div class="change-to">+ ${comment.suggestedText}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="comment-actions">
                    ${this.renderCommentActions(comment, isAuthor)}
                </div>
                
                ${comment.replies.length > 0 ? `
                    <div class="comment-replies">
                        ${comment.replies.map(reply => this.renderReply(reply)).join('')}
                    </div>
                ` : ''}
                
                ${comment.status === 'open' ? `
                    <div class="comment-reply-form" id="reply-form-${comment.id}" style="display: none;">
                        <textarea placeholder="Write a reply..." id="reply-input-${comment.id}"></textarea>
                        <div class="reply-actions">
                            <button class="btn btn-small btn-ghost" onclick="commentsInstance.cancelReply('${comment.id}')">
                                Cancel
                            </button>
                            <button class="btn btn-small btn-primary" onclick="commentsInstance.submitReply('${comment.id}')">
                                Reply
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render comment actions
     */
    renderCommentActions(comment, isAuthor) {
        const actions = [];

        // Jump to position
        if (comment.position) {
            actions.push(`
                <button class="comment-action" onclick="commentsInstance.jumpToComment('${comment.id}')" title="Jump to location">
                    📍
                </button>
            `);
        }

        // Reply action
        if (comment.status === 'open') {
            actions.push(`
                <button class="comment-action" onclick="commentsInstance.showReplyForm('${comment.id}')" title="Reply">
                    💬
                </button>
            `);
        }

        // Suggestion-specific actions
        if (comment.type === 'suggestion' && comment.status === 'pending') {
            actions.push(`
                <button class="comment-action accept" onclick="commentsInstance.acceptSuggestion('${comment.id}')" title="Accept suggestion">
                    ✅
                </button>
                <button class="comment-action reject" onclick="commentsInstance.rejectSuggestion('${comment.id}')" title="Reject suggestion">
                    ❌
                </button>
            `);
        }

        // Resolve action
        if (comment.status === 'open') {
            actions.push(`
                <button class="comment-action" onclick="commentsInstance.resolveComment('${comment.id}')" title="Resolve">
                    ✔️
                </button>
            `);
        }

        // Delete action (only for author)
        if (isAuthor) {
            actions.push(`
                <button class="comment-action delete" onclick="commentsInstance.deleteComment('${comment.id}')" title="Delete">
                    🗑️
                </button>
            `);
        }

        return actions.join('');
    }

    /**
     * Render reply
     */
    renderReply(reply) {
        return `
            <div class="comment-reply">
                <div class="reply-header">
                    <div class="reply-author">
                        <span class="author-name">${reply.author.name}</span>
                        <span class="reply-time">${this.formatTimeAgo(reply.timestamp)}</span>
                    </div>
                </div>
                <div class="reply-text">${this.formatCommentText(reply.text)}</div>
            </div>
        `;
    }

    /**
     * Render inline comments in editor
     */
    renderInlineComments() {
        // Clear existing inline comments
        document.querySelectorAll('.inline-comment-marker').forEach(marker => {
            marker.remove();
        });

        // Add markers for comments with positions
        this.comments.forEach(comment => {
            if (comment.position && comment.status === 'open') {
                this.addInlineCommentMarker(comment);
            }
        });
    }

    /**
     * Add inline comment marker
     */
    addInlineCommentMarker(comment) {
        const editor = this.editor.editor;
        const marker = document.createElement('span');
        marker.className = `inline-comment-marker ${comment.type}`;
        marker.title = `${comment.author.name}: ${comment.text.substring(0, 100)}...`;
        marker.onclick = () => this.showCommentPopup(comment);
        
        try {
            const coords = editor.cursorCoords(comment.position.from, 'local');
            marker.style.left = coords.left + 'px';
            marker.style.top = coords.top + 'px';
            
            const editorWrapper = editor.getWrapperElement();
            editorWrapper.appendChild(marker);
        } catch (error) {
            console.warn('Failed to add inline marker for comment:', comment.id, error);
        }
    }

    /**
     * Show comment popup
     */
    showCommentPopup(comment) {
        const popup = document.createElement('div');
        popup.className = 'comment-popup';
        popup.innerHTML = `
            <div class="popup-header">
                <span class="popup-author">${comment.author.name}</span>
                <button class="popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="popup-content">
                <div class="popup-text">${this.formatCommentText(comment.text)}</div>
                ${comment.type === 'suggestion' ? `
                    <div class="popup-suggestion">
                        <div class="suggestion-change">
                            <div class="change-from">- ${comment.originalText}</div>
                            <div class="change-to">+ ${comment.suggestedText}</div>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="popup-actions">
                <button class="btn btn-small btn-primary" onclick="commentsInstance.jumpToComment('${comment.id}'); this.parentElement.parentElement.remove();">
                    View in Panel
                </button>
                ${comment.type === 'suggestion' && comment.status === 'pending' ? `
                    <button class="btn btn-small btn-secondary" onclick="commentsInstance.acceptSuggestion('${comment.id}'); this.parentElement.parentElement.remove();">
                        Accept
                    </button>
                ` : ''}
            </div>
        `;
        
        // Position popup
        const rect = event.target.getBoundingClientRect();
        popup.style.left = rect.right + 10 + 'px';
        popup.style.top = rect.top + 'px';
        
        document.body.appendChild(popup);
        
        // Auto-remove after delay
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 5000);
    }

    /**
     * Jump to comment location
     */
    jumpToComment(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (!comment || !comment.position) return;

        const editor = this.editor.editor;
        
        // Scroll to position
        editor.setCursor(comment.position.from);
        editor.scrollIntoView(comment.position.from, 100);
        
        // Highlight the text
        if (comment.position.from && comment.position.to) {
            editor.setSelection(comment.position.from, comment.position.to);
        }
        
        // Focus editor
        editor.focus();
    }

    /**
     * Show reply form
     */
    showReplyForm(commentId) {
        const form = document.getElementById(`reply-form-${commentId}`);
        if (form) {
            form.style.display = 'block';
            const input = document.getElementById(`reply-input-${commentId}`);
            if (input) {
                input.focus();
            }
        }
    }

    /**
     * Cancel reply
     */
    cancelReply(commentId) {
        const form = document.getElementById(`reply-form-${commentId}`);
        if (form) {
            form.style.display = 'none';
            const input = document.getElementById(`reply-input-${commentId}`);
            if (input) {
                input.value = '';
            }
        }
    }

    /**
     * Submit reply
     */
    submitReply(commentId) {
        const input = document.getElementById(`reply-input-${commentId}`);
        if (!input) return;
        
        const text = input.value.trim();
        if (!text) return;
        
        this.replyToComment(commentId, text);
        this.cancelReply(commentId);
    }

    /**
     * Update comments count in header
     */
    updateCommentsCount() {
        const countEl = document.getElementById('commentCount');
        if (countEl) {
            const openCount = this.comments.filter(c => c.status === 'open').length;
            countEl.textContent = openCount || '';
            countEl.style.display = openCount > 0 ? 'inline' : 'none';
        }
    }

    /**
     * Handle remote comment
     */
    handleRemoteComment(comment) {
        if (comment.author.id === this.getUserId()) return;
        
        this.comments.unshift(comment);
        this.refreshCommentsList();
        this.renderInlineComments();
        
        this.editor.showNotification(`New comment from ${comment.author.name}`, 'info');
    }

    /**
     * Handle comment update
     */
    handleCommentUpdate(updatedComment) {
        const index = this.comments.findIndex(c => c.id === updatedComment.id);
        if (index !== -1) {
            this.comments[index] = updatedComment;
            this.refreshCommentsList();
            this.renderInlineComments();
        }
    }

    /**
     * Handle comment resolution
     */
    handleCommentResolution(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            comment.status = 'resolved';
            this.refreshCommentsList();
            this.renderInlineComments();
        }
    }

    /**
     * Get comment type icon
     */
    getCommentTypeIcon(type) {
        switch (type) {
            case 'comment': return '💬';
            case 'suggestion': return '💡';
            case 'question': return '❓';
            default: return '💬';
        }
    }

    /**
     * Get status class
     */
    getStatusClass(status) {
        return `comment-${status}`;
    }

    /**
     * Format comment text (basic markdown support)
     */
    formatCommentText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Format time ago
     */
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'now';
        if (diffMinutes < 60) return `${diffMinutes}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return new Date(timestamp).toLocaleDateString();
    }

    /**
     * Generate comment ID
     */
    generateCommentId() {
        return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get user ID
     */
    getUserId() {
        return localStorage.getItem('user-id') || 'anonymous';
    }

    /**
     * Get user name
     */
    getUserName() {
        return localStorage.getItem('user-name') || 'Anonymous User';
    }

    /**
     * Get user avatar
     */
    getUserAvatar() {
        return localStorage.getItem('user-avatar') || null;
    }

    /**
     * Cleanup
     */
    destroy() {
        // Clear inline markers
        document.querySelectorAll('.inline-comment-marker').forEach(marker => {
            marker.remove();
        });
        
        // Clear popups
        document.querySelectorAll('.comment-popup').forEach(popup => {
            popup.remove();
        });
        
        this.comments = [];
        this.suggestions = [];
    }
}

/**
 * Comment Storage Handler
 */
class CommentStorage {
    constructor() {
        this.storageKey = 'editor-comments';
    }

    async saveComment(comment) {
        try {
            const comments = await this.getComments(comment.documentId);
            
            // Update existing or add new
            const existingIndex = comments.findIndex(c => c.id === comment.id);
            if (existingIndex !== -1) {
                comments[existingIndex] = comment;
            } else {
                comments.unshift(comment);
            }
            
            const storageData = this.getStorageData();
            storageData[comment.documentId] = comments;
            
            localStorage.setItem(this.storageKey, JSON.stringify(storageData));
            
        } catch (error) {
            console.error('Failed to save comment to storage:', error);
        }
    }

    async getComments(documentId) {
        try {
            const storageData = this.getStorageData();
            return storageData[documentId] || [];
        } catch (error) {
            console.error('Failed to load comments from storage:', error);
            return [];
        }
    }

    async deleteComment(commentId) {
        try {
            const storageData = this.getStorageData();
            
            Object.keys(storageData).forEach(documentId => {
                storageData[documentId] = storageData[documentId].filter(c => c.id !== commentId);
            });
            
            localStorage.setItem(this.storageKey, JSON.stringify(storageData));
            
        } catch (error) {
            console.error('Failed to delete comment from storage:', error);
        }
    }

    getStorageData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to parse storage data:', error);
            return {};
        }
    }
}

// Global reference for inline handlers
window.commentsInstance = null;

// Global functions for inline handlers
window.addComment = () => window.commentsInstance?.addComment();

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EditorComments;
}

// Make available globally
window.EditorComments = EditorComments;