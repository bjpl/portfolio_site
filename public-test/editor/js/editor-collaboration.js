/**
 * Enhanced Content Editor - Collaboration Module
 * Handles real-time collaborative editing with WebSocket support
 */

class EditorCollaboration {
    constructor(editor) {
        this.editor = editor;
        this.socket = null;
        this.sessionId = null;
        this.userId = this.generateUserId();
        this.userName = this.getUserName();
        this.collaborators = new Map();
        this.pendingChanges = [];
        this.isConnected = false;
        this.conflictResolver = new ConflictResolver();
        this.cursorManager = new CursorManager();
        
        this.init();
    }

    /**
     * Initialize collaboration
     */
    async init() {
        try {
            await this.connect();
            this.setupEventHandlers();
            this.startHeartbeat();
            console.log('Collaboration initialized');
        } catch (error) {
            console.error('Failed to initialize collaboration:', error);
            this.showCollaborationError('Connection failed');
        }
    }

    /**
     * Connect to WebSocket server
     */
    async connect() {
        const wsUrl = this.getWebSocketUrl();
        this.socket = io(wsUrl, {
            auth: {
                userId: this.userId,
                userName: this.userName,
                documentId: this.getDocumentId()
            },
            transports: ['websocket', 'polling']
        });

        return new Promise((resolve, reject) => {
            this.socket.on('connect', () => {
                this.isConnected = true;
                console.log('Connected to collaboration server');
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                this.isConnected = false;
                console.error('Connection error:', error);
                reject(error);
            });

            this.socket.on('disconnect', (reason) => {
                this.isConnected = false;
                console.log('Disconnected from collaboration server:', reason);
                this.handleDisconnection(reason);
            });

            // Set connection timeout
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        // Document events
        this.socket.on('document:joined', (data) => {
            this.handleDocumentJoined(data);
        });

        this.socket.on('document:change', (data) => {
            this.handleRemoteChange(data);
        });

        this.socket.on('document:conflict', (data) => {
            this.handleConflict(data);
        });

        // Collaborator events
        this.socket.on('user:joined', (user) => {
            this.handleUserJoined(user);
        });

        this.socket.on('user:left', (userId) => {
            this.handleUserLeft(userId);
        });

        this.socket.on('user:cursor', (data) => {
            this.handleCursorUpdate(data);
        });

        this.socket.on('user:selection', (data) => {
            this.handleSelectionUpdate(data);
        });

        // Comment events
        this.socket.on('comment:added', (comment) => {
            this.handleCommentAdded(comment);
        });

        this.socket.on('comment:updated', (comment) => {
            this.handleCommentUpdated(comment);
        });

        this.socket.on('comment:deleted', (commentId) => {
            this.handleCommentDeleted(commentId);
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('Collaboration error:', error);
            this.showCollaborationError(error.message);
        });
    }

    /**
     * Handle document joined event
     */
    handleDocumentJoined(data) {
        this.sessionId = data.sessionId;
        this.collaborators.clear();
        
        // Add existing collaborators
        data.collaborators.forEach(user => {
            this.addCollaborator(user);
        });

        // Apply initial document state if needed
        if (data.documentState) {
            this.applyDocumentState(data.documentState);
        }

        this.updateCollaboratorsUI();
    }

    /**
     * Handle remote change event
     */
    handleRemoteChange(data) {
        if (data.userId === this.userId) {
            // This is our own change, ignore it
            return;
        }

        try {
            // Apply the change to the editor
            this.applyRemoteChange(data);
            
            // Update collaborator activity
            this.updateCollaboratorActivity(data.userId);
            
        } catch (error) {
            console.error('Failed to apply remote change:', error);
            this.requestDocumentSync();
        }
    }

    /**
     * Apply remote change to editor
     */
    applyRemoteChange(data) {
        const change = data.change;
        const editor = this.editor.editor;
        
        // Temporarily disable change event to prevent echo
        this.isApplyingRemoteChange = true;
        
        try {
            switch (change.type) {
                case 'insert':
                    editor.replaceRange(
                        change.text,
                        { line: change.from.line, ch: change.from.ch },
                        { line: change.from.line, ch: change.from.ch }
                    );
                    break;
                    
                case 'delete':
                    editor.replaceRange(
                        '',
                        { line: change.from.line, ch: change.from.ch },
                        { line: change.to.line, ch: change.to.ch }
                    );
                    break;
                    
                case 'replace':
                    editor.replaceRange(
                        change.text,
                        { line: change.from.line, ch: change.from.ch },
                        { line: change.to.line, ch: change.to.ch }
                    );
                    break;
            }
        } finally {
            this.isApplyingRemoteChange = false;
        }
    }

    /**
     * Send change to server
     */
    sendChange(changeObj) {
        if (!this.isConnected || this.isApplyingRemoteChange) {
            return;
        }

        const change = {
            type: this.getChangeType(changeObj),
            from: changeObj.from,
            to: changeObj.to,
            text: changeObj.text.join('\\n'),
            timestamp: Date.now()
        };

        const data = {
            documentId: this.getDocumentId(),
            userId: this.userId,
            change: change,
            version: this.getDocumentVersion()
        };

        this.socket.emit('document:change', data);
    }

    /**
     * Update cursor position
     */
    updateCursor(cursor) {
        if (!this.isConnected) return;

        this.socket.emit('user:cursor', {
            userId: this.userId,
            documentId: this.getDocumentId(),
            cursor: cursor,
            timestamp: Date.now()
        });
    }

    /**
     * Handle cursor update from other users
     */
    handleCursorUpdate(data) {
        if (data.userId === this.userId) return;
        
        this.cursorManager.updateCursor(data.userId, data.cursor);
    }

    /**
     * Handle user joined
     */
    handleUserJoined(user) {
        this.addCollaborator(user);
        this.updateCollaboratorsUI();
        this.showNotification(`${user.name} joined the document`, 'info');
    }

    /**
     * Handle user left
     */
    handleUserLeft(userId) {
        const user = this.collaborators.get(userId);
        if (user) {
            this.collaborators.delete(userId);
            this.cursorManager.removeCursor(userId);
            this.updateCollaboratorsUI();
            this.showNotification(`${user.name} left the document`, 'info');
        }
    }

    /**
     * Add collaborator
     */
    addCollaborator(user) {
        this.collaborators.set(user.id, {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            color: this.generateUserColor(user.id),
            lastActivity: Date.now()
        });
    }

    /**
     * Update collaborators UI
     */
    updateCollaboratorsUI() {
        const container = document.getElementById('collaborators');
        if (!container) return;

        container.innerHTML = '';
        
        this.collaborators.forEach(user => {
            const avatar = document.createElement('div');
            avatar.className = 'collaborator';
            avatar.title = user.name;
            
            if (user.avatar) {
                avatar.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
            } else {
                avatar.innerHTML = user.name.charAt(0).toUpperCase();
                avatar.style.backgroundColor = user.color;
                avatar.style.color = 'white';
            }
            
            // Show activity indicator
            if (Date.now() - user.lastActivity < 30000) {
                avatar.classList.add('active');
            }
            
            container.appendChild(avatar);
        });
    }

    /**
     * Handle conflict resolution
     */
    handleConflict(data) {
        console.warn('Document conflict detected:', data);
        
        // Use conflict resolver to merge changes
        const resolution = this.conflictResolver.resolve(data);
        
        if (resolution.requiresUserInput) {
            this.showConflictDialog(resolution);
        } else {
            this.applyConflictResolution(resolution);
        }
    }

    /**
     * Show conflict resolution dialog
     */
    showConflictDialog(resolution) {
        const dialog = document.createElement('div');
        dialog.className = 'conflict-dialog';
        dialog.innerHTML = `
            <div class="conflict-content">
                <h3>Document Conflict</h3>
                <p>There are conflicting changes to this document. Choose how to resolve:</p>
                <div class="conflict-options">
                    <button onclick="this.acceptLocal()">Keep My Changes</button>
                    <button onclick="this.acceptRemote()">Accept Their Changes</button>
                    <button onclick="this.showMergeView()">Merge Manually</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    /**
     * Add comment
     */
    addComment(text, position) {
        if (!this.isConnected) {
            this.showNotification('Cannot add comment while offline', 'error');
            return;
        }

        const comment = {
            id: this.generateId(),
            text: text,
            author: {
                id: this.userId,
                name: this.userName
            },
            position: position,
            timestamp: Date.now(),
            documentId: this.getDocumentId()
        };

        this.socket.emit('comment:add', comment);
    }

    /**
     * Handle comment added
     */
    handleCommentAdded(comment) {
        if (this.editor.comments) {
            this.editor.comments.addComment(comment);
        }
    }

    /**
     * Start heartbeat to maintain connection
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.socket.emit('ping');
            }
        }, 30000);
    }

    /**
     * Handle disconnection
     */
    handleDisconnection(reason) {
        this.showCollaborationError('Connection lost. Attempting to reconnect...');
        
        // Attempt to reconnect
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, 5000);
    }

    /**
     * Request document sync
     */
    requestDocumentSync() {
        if (this.isConnected) {
            this.socket.emit('document:sync', {
                documentId: this.getDocumentId(),
                version: this.getDocumentVersion()
            });
        }
    }

    /**
     * Get change type from CodeMirror change object
     */
    getChangeType(changeObj) {
        if (changeObj.text.join('') === '' && changeObj.removed) {
            return 'delete';
        } else if (changeObj.text.join('') !== '' && !changeObj.removed) {
            return 'insert';
        } else {
            return 'replace';
        }
    }

    /**
     * Generate user ID
     */
    generateUserId() {
        let userId = localStorage.getItem('collaboration-user-id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('collaboration-user-id', userId);
        }
        return userId;
    }

    /**
     * Get user name
     */
    getUserName() {
        return localStorage.getItem('user-name') || 'Anonymous User';
    }

    /**
     * Generate user color
     */
    generateUserColor(userId) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
        ];
        
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Get WebSocket URL
     */
    getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws/collaboration`;
    }

    /**
     * Get document ID
     */
    getDocumentId() {
        return this.editor.currentDocument?.id || 'default';
    }

    /**
     * Get document version
     */
    getDocumentVersion() {
        return this.editor.currentDocument?.version || 1;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Update collaborator activity
     */
    updateCollaboratorActivity(userId) {
        const user = this.collaborators.get(userId);
        if (user) {
            user.lastActivity = Date.now();
            this.updateCollaboratorsUI();
        }
    }

    /**
     * Show collaboration error
     */
    showCollaborationError(message) {
        this.editor.showNotification(message, 'error');
    }

    /**
     * Show notification
     */
    showNotification(message, type) {
        this.editor.showNotification(message, type);
    }

    /**
     * Disconnect from collaboration
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        this.collaborators.clear();
        this.cursorManager.clearAll();
        this.updateCollaboratorsUI();
    }

    /**
     * Cleanup
     */
    destroy() {
        this.disconnect();
    }
}

/**
 * Conflict Resolution System
 */
class ConflictResolver {
    constructor() {
        this.strategies = {
            'last-write-wins': this.lastWriteWins.bind(this),
            'merge-changes': this.mergeChanges.bind(this),
            'user-decides': this.userDecides.bind(this)
        };
    }

    resolve(conflictData) {
        const strategy = this.determineStrategy(conflictData);
        return this.strategies[strategy](conflictData);
    }

    determineStrategy(conflictData) {
        // Simple heuristic: if changes are in different parts, merge them
        // Otherwise, let user decide
        if (this.changesOverlap(conflictData.localChange, conflictData.remoteChange)) {
            return 'user-decides';
        } else {
            return 'merge-changes';
        }
    }

    changesOverlap(change1, change2) {
        // Check if two changes affect the same lines
        const range1 = { start: change1.from.line, end: change1.to.line };
        const range2 = { start: change2.from.line, end: change2.to.line };
        
        return !(range1.end < range2.start || range2.end < range1.start);
    }

    lastWriteWins(conflictData) {
        return {
            resolution: 'accept-remote',
            change: conflictData.remoteChange,
            requiresUserInput: false
        };
    }

    mergeChanges(conflictData) {
        // Implement operational transformation
        const mergedChange = this.operationalTransform(
            conflictData.localChange, 
            conflictData.remoteChange
        );
        
        return {
            resolution: 'merge',
            change: mergedChange,
            requiresUserInput: false
        };
    }

    userDecides(conflictData) {
        return {
            resolution: 'user-choice',
            localChange: conflictData.localChange,
            remoteChange: conflictData.remoteChange,
            requiresUserInput: true
        };
    }

    operationalTransform(localChange, remoteChange) {
        // Simplified operational transformation
        // In a real implementation, this would be much more complex
        
        if (localChange.from.line < remoteChange.from.line) {
            return {
                type: 'compound',
                changes: [localChange, this.adjustChange(remoteChange, localChange)]
            };
        } else {
            return {
                type: 'compound',
                changes: [this.adjustChange(localChange, remoteChange), remoteChange]
            };
        }
    }

    adjustChange(changeToAdjust, existingChange) {
        // Adjust line numbers based on existing change
        const adjustment = this.calculateAdjustment(existingChange);
        
        return {
            ...changeToAdjust,
            from: {
                line: changeToAdjust.from.line + adjustment.lines,
                ch: changeToAdjust.from.ch + (changeToAdjust.from.line === existingChange.from.line ? adjustment.chars : 0)
            },
            to: {
                line: changeToAdjust.to.line + adjustment.lines,
                ch: changeToAdjust.to.ch + (changeToAdjust.to.line === existingChange.to.line ? adjustment.chars : 0)
            }
        };
    }

    calculateAdjustment(change) {
        const lines = change.text.split('\\n').length - 1;
        const chars = change.text.length;
        
        return { lines, chars };
    }
}

/**
 * Cursor Management System
 */
class CursorManager {
    constructor() {
        this.cursors = new Map();
        this.selections = new Map();
    }

    updateCursor(userId, cursor) {
        this.cursors.set(userId, cursor);
        this.renderCursor(userId, cursor);
    }

    updateSelection(userId, selection) {
        this.selections.set(userId, selection);
        this.renderSelection(userId, selection);
    }

    renderCursor(userId, cursor) {
        const editor = window.editorInstance?.editor;
        if (!editor) return;

        // Remove existing cursor
        this.removeCursor(userId);

        // Create cursor element
        const cursorElement = document.createElement('div');
        cursorElement.className = 'remote-cursor';
        cursorElement.id = `cursor-${userId}`;
        
        // Get user color
        const user = window.editorInstance.collaborativeSession.collaborators.get(userId);
        if (user) {
            cursorElement.style.borderColor = user.color;
            cursorElement.innerHTML = `<div class="cursor-label">${user.name}</div>`;
        }

        // Position cursor
        const coords = editor.cursorCoords(cursor, 'local');
        cursorElement.style.left = coords.left + 'px';
        cursorElement.style.top = coords.top + 'px';

        // Add to editor
        const editorWrapper = editor.getWrapperElement();
        editorWrapper.appendChild(cursorElement);

        // Auto-hide after delay
        setTimeout(() => {
            const label = cursorElement.querySelector('.cursor-label');
            if (label) {
                label.style.opacity = '0';
            }
        }, 3000);
    }

    renderSelection(userId, selection) {
        // Implementation for rendering user selections
        // This would highlight the selected text with user's color
    }

    removeCursor(userId) {
        const existing = document.getElementById(`cursor-${userId}`);
        if (existing) {
            existing.remove();
        }
    }

    clearAll() {
        document.querySelectorAll('.remote-cursor').forEach(cursor => {
            cursor.remove();
        });
        
        this.cursors.clear();
        this.selections.clear();
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EditorCollaboration;
}

// Make available globally
window.EditorCollaboration = EditorCollaboration;