/**
 * Enhanced Content Editor - Spell Checker Plugin
 * Provides real-time spell checking with suggestions
 */

class SpellCheckerPlugin {
    constructor(editor) {
        this.editor = editor;
        this.isEnabled = true;
        this.dictionary = new SpellDictionary();
        this.suggestions = new Map();
        this.misspelledWords = new Set();
        this.checkTimeout = null;
        this.checkDelay = 500; // 500ms debounce
        
        this.init();
    }

    /**
     * Initialize spell checker
     */
    async init() {
        try {
            await this.dictionary.load();
            this.setupEventHandlers();
            this.addToolbarButton();
            this.performSpellCheck();
            
            console.log('Spell checker plugin initialized');
        } catch (error) {
            console.error('Failed to initialize spell checker:', error);
        }
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Listen to content changes
        this.editor.editor.on('change', () => {
            if (this.isEnabled) {
                this.scheduleSpellCheck();
            }
        });

        // Listen to cursor activity for context menu
        this.editor.editor.on('contextmenu', (instance, event) => {
            this.handleContextMenu(instance, event);
        });

        // Listen to right-click events
        this.editor.editor.getWrapperElement().addEventListener('contextmenu', (e) => {
            const word = this.getWordAtPosition(e);
            if (word && this.misspelledWords.has(word.toLowerCase())) {
                this.showSpellCheckMenu(e, word);
            }
        });
    }

    /**
     * Add spell check button to toolbar
     */
    addToolbarButton() {
        const toolbarGroup = document.querySelector('.toolbar-group:last-child');
        if (toolbarGroup) {
            const button = document.createElement('button');
            button.className = `tool-btn ${this.isEnabled ? 'active' : ''}`;
            button.innerHTML = '<i class="icon">📝</i>';
            button.title = 'Toggle Spell Check';
            button.onclick = () => this.toggle();
            
            toolbarGroup.appendChild(button);
        }
    }

    /**
     * Schedule spell check with debouncing
     */
    scheduleSpellCheck() {
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout);
        }

        this.checkTimeout = setTimeout(() => {
            this.performSpellCheck();
        }, this.checkDelay);
    }

    /**
     * Perform spell check on current content
     */
    async performSpellCheck() {
        if (!this.isEnabled) return;

        const content = this.editor.editor.getValue();
        const words = this.extractWords(content);
        
        this.misspelledWords.clear();
        this.suggestions.clear();

        // Check each word
        for (const wordInfo of words) {
            const word = wordInfo.word.toLowerCase();
            
            if (!this.dictionary.isCorrect(word)) {
                this.misspelledWords.add(word);
                
                // Generate suggestions
                const suggestions = await this.dictionary.getSuggestions(word);
                this.suggestions.set(word, suggestions);
            }
        }

        // Update UI
        this.highlightMisspelledWords();
        this.updateSpellCheckStatus();
    }

    /**
     * Extract words from content with positions
     */
    extractWords(content) {
        const words = [];
        const lines = content.split('\n');
        
        lines.forEach((line, lineIndex) => {
            const wordRegex = /\b[a-zA-Z]+\b/g;
            let match;
            
            while ((match = wordRegex.exec(line)) !== null) {
                words.push({
                    word: match[0],
                    line: lineIndex,
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        });
        
        return words;
    }

    /**
     * Highlight misspelled words
     */
    highlightMisspelledWords() {
        // Clear existing highlights
        this.clearHighlights();
        
        const content = this.editor.editor.getValue();
        const words = this.extractWords(content);
        
        words.forEach(wordInfo => {
            const word = wordInfo.word.toLowerCase();
            
            if (this.misspelledWords.has(word)) {
                this.addHighlight(wordInfo);
            }
        });
    }

    /**
     * Add highlight for misspelled word
     */
    addHighlight(wordInfo) {
        const from = { line: wordInfo.line, ch: wordInfo.start };
        const to = { line: wordInfo.line, ch: wordInfo.end };
        
        const marker = this.editor.editor.markText(from, to, {
            className: 'spell-error',
            title: 'Misspelled word - Right-click for suggestions',
            attributes: {
                'data-word': wordInfo.word
            }
        });
        
        // Store marker for cleanup
        if (!this.markers) this.markers = [];
        this.markers.push(marker);
    }

    /**
     * Clear all spell check highlights
     */
    clearHighlights() {
        if (this.markers) {
            this.markers.forEach(marker => marker.clear());
            this.markers = [];
        }
    }

    /**
     * Handle context menu
     */
    handleContextMenu(instance, event) {
        const pos = instance.coordsChar({ left: event.pageX, top: event.pageY });
        const word = instance.getTokenAt(pos);
        
        if (word && this.misspelledWords.has(word.string.toLowerCase())) {
            this.showSpellCheckMenu(event, word.string);
            event.preventDefault();
        }
    }

    /**
     * Get word at mouse position
     */
    getWordAtPosition(event) {
        const pos = this.editor.editor.coordsChar({ left: event.pageX, top: event.pageY });
        const token = this.editor.editor.getTokenAt(pos);
        
        if (token && /\w/.test(token.string)) {
            return token.string;
        }
        
        return null;
    }

    /**
     * Show spell check context menu
     */
    showSpellCheckMenu(event, word) {
        event.preventDefault();
        
        // Remove existing menu
        const existingMenu = document.querySelector('.spell-check-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'spell-check-menu';
        
        const suggestions = this.suggestions.get(word.toLowerCase()) || [];
        
        menu.innerHTML = `
            <div class="spell-menu-header">
                <span class="misspelled-word">${word}</span>
            </div>
            <div class="spell-menu-suggestions">
                ${suggestions.length > 0 ? 
                    suggestions.slice(0, 5).map(suggestion => `
                        <div class="spell-suggestion" onclick="spellChecker.applySuggestion('${word}', '${suggestion}')">
                            ${suggestion}
                        </div>
                    `).join('') :
                    '<div class="no-suggestions">No suggestions available</div>'
                }
            </div>
            <div class="spell-menu-actions">
                <div class="spell-action" onclick="spellChecker.addToPersonalDictionary('${word}')">
                    📖 Add to Dictionary
                </div>
                <div class="spell-action" onclick="spellChecker.ignoreWord('${word}')">
                    👁️ Ignore Word
                </div>
            </div>
        `;

        // Position menu
        menu.style.position = 'absolute';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        menu.style.zIndex = '10000';

        document.body.appendChild(menu);

        // Auto-remove menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 100);
    }

    /**
     * Apply suggestion
     */
    applySuggestion(originalWord, suggestion) {
        const content = this.editor.editor.getValue();
        const regex = new RegExp(`\\b${originalWord}\\b`, 'g');
        const newContent = content.replace(regex, suggestion);
        
        this.editor.editor.setValue(newContent);
        this.scheduleSpellCheck();
        
        // Remove menu
        const menu = document.querySelector('.spell-check-menu');
        if (menu) menu.remove();
    }

    /**
     * Add word to personal dictionary
     */
    addToPersonalDictionary(word) {
        this.dictionary.addToPersonal(word.toLowerCase());
        this.misspelledWords.delete(word.toLowerCase());
        this.suggestions.delete(word.toLowerCase());
        
        this.highlightMisspelledWords();
        this.updateSpellCheckStatus();
        
        // Remove menu
        const menu = document.querySelector('.spell-check-menu');
        if (menu) menu.remove();
        
        this.editor.showNotification(`"${word}" added to dictionary`, 'success');
    }

    /**
     * Ignore word for current session
     */
    ignoreWord(word) {
        this.dictionary.ignore(word.toLowerCase());
        this.misspelledWords.delete(word.toLowerCase());
        this.suggestions.delete(word.toLowerCase());
        
        this.highlightMisspelledWords();
        this.updateSpellCheckStatus();
        
        // Remove menu
        const menu = document.querySelector('.spell-check-menu');
        if (menu) menu.remove();
    }

    /**
     * Update spell check status
     */
    updateSpellCheckStatus() {
        const errorCount = this.misspelledWords.size;
        const statusText = errorCount > 0 ? 
            `${errorCount} spelling ${errorCount === 1 ? 'error' : 'errors'}` : 
            'No spelling errors';
        
        // Update status bar if available
        const statusBar = document.querySelector('.status-bar .status-left');
        if (statusBar) {
            let spellStatus = statusBar.querySelector('.spell-status');
            if (!spellStatus) {
                spellStatus = document.createElement('div');
                spellStatus.className = 'status-item spell-status';
                statusBar.appendChild(spellStatus);
            }
            
            spellStatus.innerHTML = `
                <span class="spell-icon">${errorCount > 0 ? '❌' : '✅'}</span>
                <span class="spell-text">${statusText}</span>
            `;
        }
    }

    /**
     * Toggle spell checking
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        
        const button = document.querySelector('[title="Toggle Spell Check"]');
        if (button) {
            button.classList.toggle('active', this.isEnabled);
        }
        
        if (this.isEnabled) {
            this.performSpellCheck();
        } else {
            this.clearHighlights();
            this.updateSpellCheckStatus();
        }
    }

    /**
     * Check single word
     */
    async checkWord(word) {
        const isCorrect = this.dictionary.isCorrect(word.toLowerCase());
        
        if (!isCorrect) {
            const suggestions = await this.dictionary.getSuggestions(word.toLowerCase());
            return {
                correct: false,
                suggestions: suggestions
            };
        }
        
        return { correct: true };
    }

    /**
     * Get spell check statistics
     */
    getStatistics() {
        const content = this.editor.editor.getValue();
        const words = this.extractWords(content);
        const totalWords = words.length;
        const misspelledCount = this.misspelledWords.size;
        
        return {
            totalWords,
            misspelledWords: misspelledCount,
            accuracy: totalWords > 0 ? ((totalWords - misspelledCount) / totalWords * 100).toFixed(1) : 100
        };
    }

    /**
     * Export personal dictionary
     */
    exportPersonalDictionary() {
        return this.dictionary.exportPersonal();
    }

    /**
     * Import personal dictionary
     */
    importPersonalDictionary(words) {
        this.dictionary.importPersonal(words);
        this.performSpellCheck();
    }

    /**
     * Cleanup
     */
    destroy() {
        this.clearHighlights();
        
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout);
        }
        
        // Remove menu if open
        const menu = document.querySelector('.spell-check-menu');
        if (menu) menu.remove();
    }
}

/**
 * Spell Dictionary
 */
class SpellDictionary {
    constructor() {
        this.dictionary = new Set();
        this.personalDictionary = new Set();
        this.ignoredWords = new Set();
        this.isLoaded = false;
    }

    /**
     * Load dictionary
     */
    async load() {
        try {
            // Load common English words
            await this.loadBaseDictionary();
            
            // Load personal dictionary
            this.loadPersonalDictionary();
            
            this.isLoaded = true;
            
        } catch (error) {
            console.error('Failed to load dictionary:', error);
            // Use fallback dictionary
            this.loadFallbackDictionary();
            this.isLoaded = true;
        }
    }

    /**
     * Load base dictionary
     */
    async loadBaseDictionary() {
        // In a real implementation, this would load from a dictionary file
        // For demo purposes, we'll use a basic word list
        const commonWords = [
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'she', 'or', 'an',
            'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
            'about', 'content', 'editor', 'text', 'writing', 'document',
            'markdown', 'collaboration', 'version', 'comment', 'suggestion'
        ];
        
        commonWords.forEach(word => this.dictionary.add(word));
    }

    /**
     * Load fallback dictionary
     */
    loadFallbackDictionary() {
        // Basic fallback dictionary
        const fallbackWords = [
            'hello', 'world', 'example', 'test', 'sample', 'demo',
            'content', 'editor', 'spell', 'check', 'word', 'text'
        ];
        
        fallbackWords.forEach(word => this.dictionary.add(word));
    }

    /**
     * Load personal dictionary from storage
     */
    loadPersonalDictionary() {
        try {
            const stored = localStorage.getItem('spell-personal-dictionary');
            if (stored) {
                const words = JSON.parse(stored);
                words.forEach(word => this.personalDictionary.add(word));
            }
        } catch (error) {
            console.error('Failed to load personal dictionary:', error);
        }
    }

    /**
     * Save personal dictionary to storage
     */
    savePersonalDictionary() {
        try {
            const words = Array.from(this.personalDictionary);
            localStorage.setItem('spell-personal-dictionary', JSON.stringify(words));
        } catch (error) {
            console.error('Failed to save personal dictionary:', error);
        }
    }

    /**
     * Check if word is correct
     */
    isCorrect(word) {
        const cleanWord = word.toLowerCase().trim();
        
        // Skip very short words or numbers
        if (cleanWord.length <= 2 || /^\d+$/.test(cleanWord)) {
            return true;
        }
        
        // Check if ignored
        if (this.ignoredWords.has(cleanWord)) {
            return true;
        }
        
        // Check dictionaries
        return this.dictionary.has(cleanWord) || 
               this.personalDictionary.has(cleanWord);
    }

    /**
     * Get suggestions for misspelled word
     */
    async getSuggestions(word) {
        const suggestions = [];
        const cleanWord = word.toLowerCase();
        
        // Generate suggestions using various techniques
        suggestions.push(...this.generateEditDistanceSuggestions(cleanWord));
        suggestions.push(...this.generatePhoneticSuggestions(cleanWord));
        
        // Remove duplicates and limit results
        return [...new Set(suggestions)].slice(0, 10);
    }

    /**
     * Generate suggestions based on edit distance
     */
    generateEditDistanceSuggestions(word) {
        const suggestions = [];
        const maxDistance = 2;
        
        // Check all dictionary words for similar spelling
        const allWords = [...this.dictionary, ...this.personalDictionary];
        
        for (const dictWord of allWords) {
            if (Math.abs(dictWord.length - word.length) <= maxDistance) {
                const distance = this.calculateEditDistance(word, dictWord);
                if (distance <= maxDistance) {
                    suggestions.push(dictWord);
                }
            }
        }
        
        return suggestions.sort((a, b) => {
            const distA = this.calculateEditDistance(word, a);
            const distB = this.calculateEditDistance(word, b);
            return distA - distB;
        });
    }

    /**
     * Calculate edit distance between two words
     */
    calculateEditDistance(word1, word2) {
        const matrix = [];
        
        for (let i = 0; i <= word2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= word1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= word2.length; i++) {
            for (let j = 1; j <= word1.length; j++) {
                if (word2.charAt(i - 1) === word1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[word2.length][word1.length];
    }

    /**
     * Generate phonetic suggestions (simplified)
     */
    generatePhoneticSuggestions(word) {
        const suggestions = [];
        
        // Simple phonetic replacements
        const replacements = [
            ['ph', 'f'], ['f', 'ph'],
            ['c', 'k'], ['k', 'c'],
            ['s', 'z'], ['z', 's'],
            ['i', 'y'], ['y', 'i']
        ];
        
        for (const [from, to] of replacements) {
            if (word.includes(from)) {
                const variant = word.replace(new RegExp(from, 'g'), to);
                if (this.isCorrect(variant)) {
                    suggestions.push(variant);
                }
            }
        }
        
        return suggestions;
    }

    /**
     * Add word to personal dictionary
     */
    addToPersonal(word) {
        const cleanWord = word.toLowerCase().trim();
        this.personalDictionary.add(cleanWord);
        this.savePersonalDictionary();
    }

    /**
     * Remove word from personal dictionary
     */
    removeFromPersonal(word) {
        const cleanWord = word.toLowerCase().trim();
        this.personalDictionary.delete(cleanWord);
        this.savePersonalDictionary();
    }

    /**
     * Ignore word for current session
     */
    ignore(word) {
        const cleanWord = word.toLowerCase().trim();
        this.ignoredWords.add(cleanWord);
    }

    /**
     * Export personal dictionary
     */
    exportPersonal() {
        return Array.from(this.personalDictionary);
    }

    /**
     * Import personal dictionary
     */
    importPersonal(words) {
        this.personalDictionary.clear();
        words.forEach(word => this.personalDictionary.add(word.toLowerCase()));
        this.savePersonalDictionary();
    }

    /**
     * Clear personal dictionary
     */
    clearPersonal() {
        this.personalDictionary.clear();
        this.savePersonalDictionary();
    }

    /**
     * Get dictionary statistics
     */
    getStatistics() {
        return {
            baseWords: this.dictionary.size,
            personalWords: this.personalDictionary.size,
            ignoredWords: this.ignoredWords.size,
            totalWords: this.dictionary.size + this.personalDictionary.size
        };
    }
}

// Global reference for inline handlers
window.spellChecker = null;

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpellCheckerPlugin;
} else {
    window.SpellCheckerPlugin = SpellCheckerPlugin;
}