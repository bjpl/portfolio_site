/**
 * Enhanced Content Editor - Core Module
 * Handles the main editor functionality including CodeMirror integration,
 * markdown processing, and UI interactions.
 */

class EnhancedEditor {
    constructor() {
        this.editor = null;
        this.preview = null;
        this.currentDocument = null;
        this.isPreviewMode = false;
        this.isFocusMode = false;
        this.collaborativeSession = null;
        this.plugins = new Map();
        this.settings = this.loadSettings();
        
        this.init();
    }

    /**
     * Initialize the editor
     */
    async init() {
        await this.setupEditor();
        this.setupPreview();
        this.setupEventListeners();
        this.loadPlugins();
        this.initializeCollaboration();
        
        // Initialize other modules
        this.autosave = new EditorAutoSave(this);
        this.seo = new EditorSEO(this);
        this.comments = new EditorComments(this);
        this.versions = new EditorVersions(this);
        
        this.updateUI();
        
        console.log('Enhanced Editor initialized');
    }

    /**
     * Setup CodeMirror editor
     */
    async setupEditor() {
        const editorElement = document.getElementById('editor');
        
        this.editor = CodeMirror.fromTextArea(editorElement, {
            mode: 'markdown',
            theme: this.settings.theme || 'github',
            lineNumbers: this.settings.lineNumbers !== false,
            lineWrapping: true,
            autofocus: true,
            placeholder: "Start writing your content...",
            extraKeys: {
                "Ctrl-S": () => this.saveDocument(),
                "Ctrl-B": () => this.toggleBold(),
                "Ctrl-I": () => this.toggleItalic(),
                "Ctrl-K": () => this.insertLink(),
                "Ctrl-/": () => this.toggleComment(),
                "Ctrl-Z": () => this.undo(),
                "Ctrl-Y": () => this.redo(),
                "F11": () => this.toggleFullscreen(),
                "Esc": () => this.exitFullscreen()
            },
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            matchBrackets: true,
            autoCloseBrackets: true,
            searchCursor: true,
            highlightSelectionMatches: true,
            styleActiveLine: true,
            cursorBlinkRate: 500,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false
        });

        // Setup editor event handlers
        this.editor.on('change', (instance, changeObj) => {
            this.onEditorChange(instance, changeObj);
        });

        this.editor.on('cursorActivity', (instance) => {
            this.onCursorActivity(instance);
        });

        this.editor.on('scroll', (instance) => {
            this.syncPreviewScroll(instance);
        });

        this.editor.on('focus', () => {
            this.onEditorFocus();
        });

        this.editor.on('blur', () => {
            this.onEditorBlur();
        });

        // Setup text selection handler
        this.editor.on('beforeSelectionChange', (instance, obj) => {
            this.handleTextSelection(instance, obj);
        });
    }

    /**
     * Setup markdown preview
     */
    setupPreview() {
        // Configure marked with custom renderer
        const renderer = new marked.Renderer();
        
        // Custom heading renderer with anchor links
        renderer.heading = (text, level) => {
            const id = text.toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="${id}">${text}</h${level}>`;
        };

        // Custom code renderer with syntax highlighting
        renderer.code = (code, language) => {
            if (language && hljs.getLanguage(language)) {
                try {
                    const highlighted = hljs.highlight(code, { language });
                    return `<pre><code class="hljs language-${language}">${highlighted.value}</code></pre>`;
                } catch (error) {
                    console.warn('Syntax highlighting failed:', error);
                }
            }
            return `<pre><code>${this.escapeHtml(code)}</code></pre>`;
        };

        // Custom table renderer
        renderer.table = (header, body) => {
            return `<div class="table-wrapper"><table>${header}${body}</table></div>`;
        };

        // Custom image renderer with lazy loading
        renderer.image = (href, title, text) => {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy">`;
        };

        marked.setOptions({
            renderer,
            highlight: (code, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (error) {
                        console.warn('Syntax highlighting failed:', error);
                    }
                }
                return this.escapeHtml(code);
            },
            breaks: true,
            gfm: true,
            tables: true,
            sanitize: false,
            smartypants: true
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Metadata inputs
        document.getElementById('titleInput').addEventListener('input', (e) => {
            this.onTitleChange(e.target.value);
        });

        document.getElementById('slugInput').addEventListener('input', (e) => {
            this.onSlugChange(e.target.value);
        });

        document.getElementById('descriptionInput').addEventListener('input', (e) => {
            this.onDescriptionChange(e.target.value);
        });

        document.getElementById('tagsInput').addEventListener('input', (e) => {
            this.onTagsChange(e.target.value);
        });

        document.getElementById('categorySelect').addEventListener('change', (e) => {
            this.onCategoryChange(e.target.value);
        });

        document.getElementById('draftCheckbox').addEventListener('change', (e) => {
            this.onDraftChange(e.target.checked);
        });

        document.getElementById('publishDate').addEventListener('change', (e) => {
            this.onPublishDateChange(e.target.value);
        });

        // File upload handlers
        this.setupFileUpload();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboard(e);
        });

        // Window events
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        // Tab switching
        document.querySelectorAll('.sidebar .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.textContent.toLowerCase();
                this.switchSidebarTab(tab);
            });
        });

        document.querySelectorAll('.preview-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.switchPreviewTab(tab);
            });
        });
    }

    /**
     * Setup file upload functionality
     */
    setupFileUpload() {
        const uploadArea = document.getElementById('imageUploadArea');
        const fileInput = document.getElementById('imageFileInput');

        // Click to browse
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFileUpload(files);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFileUpload(files);
        });
    }

    /**
     * Handle editor content changes
     */
    onEditorChange(instance, changeObj) {
        this.updatePreview();
        this.updateWordCount();
        this.updateOutline();
        this.markAsChanged();
        
        // Trigger autosave
        if (this.autosave) {
            this.autosave.scheduleAutoSave();
        }

        // Trigger SEO analysis
        if (this.seo) {
            this.seo.debounceAnalysis();
        }

        // Send collaboration changes
        if (this.collaborativeSession) {
            this.collaborativeSession.sendChange(changeObj);
        }
    }

    /**
     * Handle cursor activity
     */
    onCursorActivity(instance) {
        this.updateFloatingToolbar();
        this.updateStatusBar();
        
        if (this.collaborativeSession) {
            this.collaborativeSession.updateCursor(instance.getCursor());
        }
    }

    /**
     * Handle text selection
     */
    handleTextSelection(instance, obj) {
        const selection = instance.getSelection();
        
        if (selection.length > 0) {
            this.showFloatingToolbar(selection);
        } else {
            this.hideFloatingToolbar();
        }
    }

    /**
     * Update preview content
     */
    updatePreview() {
        const content = this.editor.getValue();
        const title = document.getElementById('titleInput').value;
        const description = document.getElementById('descriptionInput').value;
        
        // Parse and render markdown
        const html = marked(content);
        
        // Update preview elements
        document.getElementById('previewTitle').textContent = title || 'Untitled Document';
        document.getElementById('previewMeta').textContent = description || '';
        document.getElementById('previewBody').innerHTML = html;
        
        // Update document name in header
        document.getElementById('documentName').textContent = title || 'Untitled Document';
        
        // Trigger syntax highlighting
        document.querySelectorAll('#previewBody pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    /**
     * Update word count and reading time
     */
    updateWordCount() {
        const content = this.editor.getValue();
        const words = this.countWords(content);
        const readingTime = Math.max(1, Math.ceil(words / 200));
        
        document.getElementById('wordCount').textContent = `${words.toLocaleString()} words`;
        document.getElementById('readingTime').textContent = `${readingTime} min read`;
    }

    /**
     * Update document outline
     */
    updateOutline() {
        const content = this.editor.getValue();
        const outline = this.generateOutline(content);
        
        const outlineTree = document.getElementById('outlineTree');
        outlineTree.innerHTML = outline.map(item => `
            <div class="outline-item ${item.level}" onclick="editorInstance.goToLine(${item.line})">
                ${item.text}
            </div>
        `).join('');
    }

    /**
     * Generate document outline from content
     */
    generateOutline(content) {
        const lines = content.split('\n');
        const outline = [];
        
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                outline.push({
                    level: 'h' + match[1].length,
                    text: match[2],
                    line: index + 1
                });
            }
        });
        
        return outline;
    }

    /**
     * Count words in content
     */
    countWords(content) {
        // Remove markdown syntax and count words
        const plainText = content
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`[^`]*`/g, '') // Remove inline code
            .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
            .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
            .replace(/[#*_~`]/g, '') // Remove markdown syntax
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
            
        return plainText ? plainText.split(' ').length : 0;
    }

    /**
     * Sync preview scroll with editor
     */
    syncPreviewScroll(instance) {
        if (!this.settings.syncScroll) return;
        
        const scrollInfo = instance.getScrollInfo();
        const scrollPercent = scrollInfo.top / (scrollInfo.height - scrollInfo.clientHeight);
        
        const previewContent = document.getElementById('previewContent');
        const maxScroll = previewContent.scrollHeight - previewContent.clientHeight;
        previewContent.scrollTop = maxScroll * scrollPercent;
    }

    /**
     * Show floating toolbar for selected text
     */
    showFloatingToolbar(selection) {
        const toolbar = document.getElementById('floatingToolbar');
        const coords = this.editor.cursorCoords(true, 'page');
        
        toolbar.style.left = coords.left + 'px';
        toolbar.style.top = (coords.top - 40) + 'px';
        toolbar.classList.add('active');
    }

    /**
     * Hide floating toolbar
     */
    hideFloatingToolbar() {
        document.getElementById('floatingToolbar').classList.remove('active');
    }

    /**
     * Toggle bold formatting
     */
    toggleBold() {
        this.wrapSelection('**', '**');
    }

    /**
     * Toggle italic formatting
     */
    toggleItalic() {
        this.wrapSelection('*', '*');
    }

    /**
     * Toggle strikethrough formatting
     */
    toggleStrikethrough() {
        this.wrapSelection('~~', '~~');
    }

    /**
     * Insert link
     */
    insertLink() {
        const selection = this.editor.getSelection();
        document.getElementById('linkText').value = selection;
        document.getElementById('linkUrl').value = '';
        this.showModal('linkModal');
    }

    /**
     * Insert link confirmation
     */
    insertLinkConfirm() {
        const text = document.getElementById('linkText').value;
        const url = document.getElementById('linkUrl').value;
        const newTab = document.getElementById('linkNewTab').checked;
        
        if (text && url) {
            let markdown = `[${text}](${url})`;
            if (newTab) {
                markdown += '{:target="_blank"}';
            }
            this.replaceSelection(markdown);
        }
        
        this.closeModal('linkModal');
    }

    /**
     * Insert image
     */
    insertImage() {
        this.showModal('imageModal');
    }

    /**
     * Insert image confirmation
     */
    insertImageConfirm() {
        const url = document.getElementById('imageUrl').value;
        const alt = document.getElementById('imageAlt').value;
        const caption = document.getElementById('imageCaption').value;
        
        if (url) {
            let markdown = `![${alt || 'Image'}](${url})`;
            if (caption) {
                markdown += `\n*${caption}*`;
            }
            this.replaceSelection(markdown);
        }
        
        this.closeModal('imageModal');
    }

    /**
     * Insert table
     */
    insertTable() {
        const table = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;
        
        this.replaceSelection(table);
    }

    /**
     * Insert code block
     */
    insertCodeBlock() {
        const selection = this.editor.getSelection();
        const codeBlock = `\`\`\`javascript
${selection || '// Your code here'}
\`\`\``;
        
        this.replaceSelection(codeBlock);
    }

    /**
     * Insert list
     */
    insertList(type) {
        const selection = this.editor.getSelection();
        const lines = selection.split('\n').filter(line => line.trim());
        
        let listItems;
        if (type === 'ol') {
            listItems = lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
        } else {
            listItems = lines.map(line => `- ${line}`).join('\n');
        }
        
        if (!listItems) {
            listItems = type === 'ol' ? '1. List item' : '- List item';
        }
        
        this.replaceSelection(listItems);
    }

    /**
     * Insert todo list
     */
    insertTodo() {
        const todoList = `- [ ] Todo item 1
- [ ] Todo item 2
- [x] Completed item`;
        
        this.replaceSelection(todoList);
    }

    /**
     * Wrap selection with markdown syntax
     */
    wrapSelection(before, after) {
        const selection = this.editor.getSelection();
        const wrapped = before + selection + after;
        this.replaceSelection(wrapped);
    }

    /**
     * Replace current selection
     */
    replaceSelection(text) {
        this.editor.replaceSelection(text);
        this.editor.focus();
    }

    /**
     * Apply format to current line/selection
     */
    applyFormat(format) {
        const cursor = this.editor.getCursor();
        const line = this.editor.getLine(cursor.line);
        
        switch (format) {
            case 'h1':
                this.replaceLineWith('# ');
                break;
            case 'h2':
                this.replaceLineWith('## ');
                break;
            case 'h3':
                this.replaceLineWith('### ');
                break;
            case 'blockquote':
                this.replaceLineWith('> ');
                break;
        }
    }

    /**
     * Replace current line with new prefix
     */
    replaceLineWith(prefix) {
        const cursor = this.editor.getCursor();
        const line = this.editor.getLine(cursor.line);
        const newLine = prefix + line.replace(/^(#{1,6}\s+|>\s+)/, '');
        
        this.editor.setLine(cursor.line, newLine);
        this.editor.setCursor({
            line: cursor.line,
            ch: newLine.length
        });
    }

    /**
     * Handle file upload
     */
    async handleFileUpload(files) {
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (validFiles.length === 0) {
            this.showNotification('Please select image files only', 'warning');
            return;
        }

        for (const file of validFiles) {
            try {
                const url = await this.uploadFile(file);
                const markdown = `![${file.name}](${url})`;
                this.replaceSelection(markdown);
                this.showNotification('Image uploaded successfully', 'success');
            } catch (error) {
                console.error('Upload failed:', error);
                this.showNotification('Upload failed: ' + error.message, 'error');
            }
        }
    }

    /**
     * Upload file to server
     */
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.url;
    }

    /**
     * Save document
     */
    async saveDocument() {
        if (!this.currentDocument) {
            return this.saveAsDocument();
        }

        try {
            this.updateSaveStatus('saving');
            
            const documentData = this.getDocumentData();
            const response = await fetch(`/api/documents/${this.currentDocument.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(documentData)
            });

            if (!response.ok) {
                throw new Error('Save failed');
            }

            this.updateSaveStatus('saved');
            this.markAsSaved();
            this.showNotification('Document saved successfully', 'success');
            
        } catch (error) {
            console.error('Save failed:', error);
            this.updateSaveStatus('error');
            this.showNotification('Save failed: ' + error.message, 'error');
        }
    }

    /**
     * Get current document data
     */
    getDocumentData() {
        return {
            title: document.getElementById('titleInput').value,
            slug: document.getElementById('slugInput').value,
            description: document.getElementById('descriptionInput').value,
            content: this.editor.getValue(),
            tags: document.getElementById('tagsInput').value.split(',').map(t => t.trim()).filter(t => t),
            category: document.getElementById('categorySelect').value,
            isDraft: document.getElementById('draftCheckbox').checked,
            publishDate: document.getElementById('publishDate').value,
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Update save status indicator
     */
    updateSaveStatus(status) {
        const indicator = document.querySelector('.status-indicator');
        const text = document.querySelector('.status-text');
        
        indicator.className = `status-indicator ${status}`;
        
        switch (status) {
            case 'saving':
                text.textContent = 'Saving...';
                break;
            case 'saved':
                text.textContent = 'Saved';
                break;
            case 'error':
                text.textContent = 'Error';
                break;
            default:
                text.textContent = 'Ready';
        }
    }

    /**
     * Mark document as changed
     */
    markAsChanged() {
        if (!this.hasUnsavedChanges()) {
            document.body.setAttribute('data-unsaved', 'true');
        }
    }

    /**
     * Mark document as saved
     */
    markAsSaved() {
        document.body.removeAttribute('data-unsaved');
    }

    /**
     * Check if document has unsaved changes
     */
    hasUnsavedChanges() {
        return document.body.hasAttribute('data-unsaved');
    }

    /**
     * Toggle preview mode
     */
    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        
        if (this.isPreviewMode) {
            document.querySelector('.editor-pane').style.display = 'none';
            document.querySelector('.preview-pane').style.width = '100%';
        } else {
            document.querySelector('.editor-pane').style.display = 'flex';
            document.querySelector('.preview-pane').style.width = '50%';
        }
    }

    /**
     * Toggle focus mode
     */
    toggleFocusMode() {
        this.isFocusMode = !this.isFocusMode;
        document.body.classList.toggle('focus-mode', this.isFocusMode);
    }

    /**
     * Switch sidebar tab
     */
    switchSidebarTab(tab) {
        // Update active tab button
        document.querySelectorAll('.sidebar .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase() === tab);
        });
        
        // Update active content
        document.querySelectorAll('.sidebar-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    }

    /**
     * Switch preview tab
     */
    switchPreviewTab(tab) {
        // Update active tab button
        document.querySelectorAll('.preview-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="switchPreviewTab('${tab}')"]`).classList.add('active');
        
        // Update active content
        document.querySelectorAll('.preview-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Content`);
        });
        
        // Trigger specific tab updates
        switch (tab) {
            case 'seo':
                if (this.seo) this.seo.updateAnalysis();
                break;
            case 'analytics':
                this.updateContentAnalytics();
                break;
        }
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 24px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transition: 'all 0.3s ease',
            backgroundColor: type === 'success' ? '#48bb78' : 
                           type === 'error' ? '#f56565' : 
                           type === 'warning' ? '#ed8936' : '#667eea'
        });
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Initialize collaboration
     */
    initializeCollaboration() {
        if (window.EditorCollaboration) {
            this.collaborativeSession = new EditorCollaboration(this);
        }
    }

    /**
     * Load plugins
     */
    async loadPlugins() {
        const pluginPromises = [
            this.loadPlugin('spell-checker'),
            this.loadPlugin('emoji-picker'),
            this.loadPlugin('table-editor'),
            this.loadPlugin('math-renderer')
        ];
        
        await Promise.allSettled(pluginPromises);
    }

    /**
     * Load individual plugin
     */
    async loadPlugin(name) {
        try {
            const module = await import(`./plugins/${name}.js`);
            const plugin = new module.default(this);
            this.plugins.set(name, plugin);
            console.log(`Plugin loaded: ${name}`);
        } catch (error) {
            console.warn(`Failed to load plugin: ${name}`, error);
        }
    }

    /**
     * Load user settings
     */
    loadSettings() {
        const defaultSettings = {
            theme: 'github',
            lineNumbers: true,
            syncScroll: true,
            autoSave: true,
            spellCheck: true
        };
        
        const saved = localStorage.getItem('editor-settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    /**
     * Save user settings
     */
    saveSettings() {
        localStorage.setItem('editor-settings', JSON.stringify(this.settings));
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('auth-token') || '';
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update UI state
     */
    updateUI() {
        this.updatePreview();
        this.updateWordCount();
        this.updateOutline();
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.editor) {
            this.editor.refresh();
        }
    }

    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeyboard(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.toggleComments();
                    }
                    break;
                case 'h':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.toggleVersionHistory();
                    }
                    break;
            }
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.editor) {
            this.editor.toTextArea();
        }
        
        this.plugins.forEach(plugin => {
            if (plugin.destroy) {
                plugin.destroy();
            }
        });
        
        if (this.collaborativeSession) {
            this.collaborativeSession.disconnect();
        }
    }
}

// Global functions for inline event handlers
window.editorInstance = null;

// Toolbar functions
window.undo = () => window.editorInstance?.editor.undo();
window.redo = () => window.editorInstance?.editor.redo();
window.toggleBold = () => window.editorInstance?.toggleBold();
window.toggleItalic = () => window.editorInstance?.toggleItalic();
window.toggleStrikethrough = () => window.editorInstance?.toggleStrikethrough();
window.insertLink = () => window.editorInstance?.insertLink();
window.insertImage = () => window.editorInstance?.insertImage();
window.insertTable = () => window.editorInstance?.insertTable();
window.insertCodeBlock = () => window.editorInstance?.insertCodeBlock();
window.insertList = (type) => window.editorInstance?.insertList(type);
window.insertTodo = () => window.editorInstance?.insertTodo();
window.togglePreview = () => window.editorInstance?.togglePreview();
window.toggleFocusMode = () => window.editorInstance?.toggleFocusMode();
window.applyFormat = (format) => window.editorInstance?.applyFormat(format);

// Modal functions
window.insertLinkConfirm = () => window.editorInstance?.insertLinkConfirm();
window.insertImageConfirm = () => window.editorInstance?.insertImageConfirm();
window.closeModal = (id) => window.editorInstance?.closeModal(id);

// UI functions
window.switchSidebarTab = (tab) => window.editorInstance?.switchSidebarTab(tab);
window.switchPreviewTab = (tab) => window.editorInstance?.switchPreviewTab(tab);
window.toggleComments = () => window.editorInstance?.comments?.toggle();
window.toggleVersionHistory = () => window.editorInstance?.versions?.toggle();
window.toggleUserMenu = () => {
    document.getElementById('userMenuDropdown').classList.toggle('active');
};

// Document functions
window.createNewFile = () => window.editorInstance?.createNewDocument();
window.openFileDialog = () => window.editorInstance?.openFileDialog();
window.saveDocument = () => window.editorInstance?.saveDocument();
window.publishDocument = () => window.editorInstance?.publishDocument();

// Search functions
window.performSearch = () => window.editorInstance?.performSearch();

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.editorInstance = new EnhancedEditor();
});