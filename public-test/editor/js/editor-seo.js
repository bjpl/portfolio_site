/**
 * Enhanced Content Editor - SEO Analysis Module
 * Provides real-time SEO analysis and content optimization suggestions
 */

class EditorSEO {
    constructor(editor) {
        this.editor = editor;
        this.analysisTimeout = null;
        this.analysisDelay = 1000; // 1 second debounce
        this.currentAnalysis = null;
        this.rules = new SEORuleEngine();
        this.readabilityAnalyzer = new ReadabilityAnalyzer();
        
        this.init();
    }

    /**
     * Initialize SEO analysis
     */
    init() {
        this.setupAnalysisTriggers();
        this.loadSEOSettings();
        
        console.log('SEO analysis module initialized');
    }

    /**
     * Setup triggers for SEO analysis
     */
    setupAnalysisTriggers() {
        // Trigger analysis when switching to SEO tab
        const seoTab = document.querySelector('[onclick="switchPreviewTab(\'seo\')"]');
        if (seoTab) {
            seoTab.addEventListener('click', () => {
                this.updateAnalysis();
            });
        }
    }

    /**
     * Debounced analysis trigger
     */
    debounceAnalysis() {
        if (this.analysisTimeout) {
            clearTimeout(this.analysisTimeout);
        }

        this.analysisTimeout = setTimeout(() => {
            this.performAnalysis();
        }, this.analysisDelay);
    }

    /**
     * Update analysis immediately
     */
    updateAnalysis() {
        if (this.analysisTimeout) {
            clearTimeout(this.analysisTimeout);
        }
        
        this.performAnalysis();
    }

    /**
     * Perform comprehensive SEO analysis
     */
    async performAnalysis() {
        try {
            const content = this.getContentForAnalysis();
            const metadata = this.getMetadataForAnalysis();
            
            const analysis = {
                score: 0,
                suggestions: [],
                readability: {},
                keywords: [],
                structure: {},
                meta: {},
                timestamp: Date.now()
            };

            // Run all analysis components
            analysis.meta = this.analyzeMetadata(metadata);
            analysis.structure = this.analyzeContentStructure(content);
            analysis.readability = this.readabilityAnalyzer.analyze(content.text);
            analysis.keywords = this.analyzeKeywords(content.text, metadata);
            analysis.suggestions = this.rules.generateSuggestions(content, metadata, analysis);
            
            // Calculate overall score
            analysis.score = this.calculateOverallScore(analysis);
            
            this.currentAnalysis = analysis;
            this.renderAnalysis(analysis);
            
        } catch (error) {
            console.error('SEO analysis failed:', error);
            this.showAnalysisError(error);
        }
    }

    /**
     * Get content for analysis
     */
    getContentForAnalysis() {
        const rawContent = this.editor.editor.getValue();
        const htmlContent = marked(rawContent);
        
        return {
            raw: rawContent,
            html: htmlContent,
            text: this.stripMarkdown(rawContent),
            wordCount: this.countWords(rawContent),
            charCount: rawContent.length
        };
    }

    /**
     * Get metadata for analysis
     */
    getMetadataForAnalysis() {
        return {
            title: document.getElementById('titleInput').value.trim(),
            description: document.getElementById('descriptionInput').value.trim(),
            tags: document.getElementById('tagsInput').value.split(',').map(t => t.trim()).filter(t => t),
            category: document.getElementById('categorySelect').value,
            slug: document.getElementById('slugInput').value.trim()
        };
    }

    /**
     * Analyze metadata
     */
    analyzeMetadata(metadata) {
        const analysis = {
            title: this.analyzeTitleTag(metadata.title),
            description: this.analyzeMetaDescription(metadata.description),
            slug: this.analyzeSlug(metadata.slug),
            tags: this.analyzeTags(metadata.tags)
        };

        return analysis;
    }

    /**
     * Analyze title tag
     */
    analyzeTitleTag(title) {
        const analysis = {
            length: title.length,
            wordCount: title.split(/\s+/).filter(w => w).length,
            issues: [],
            score: 100
        };

        if (!title) {
            analysis.issues.push({
                type: 'error',
                message: 'Title is required for SEO'
            });
            analysis.score = 0;
        } else {
            if (title.length < 30) {
                analysis.issues.push({
                    type: 'warning',
                    message: 'Title is too short (recommended: 30-60 characters)'
                });
                analysis.score -= 20;
            }
            
            if (title.length > 60) {
                analysis.issues.push({
                    type: 'warning',
                    message: 'Title may be truncated in search results (recommended: 30-60 characters)'
                });
                analysis.score -= 15;
            }
            
            if (analysis.wordCount > 10) {
                analysis.issues.push({
                    type: 'info',
                    message: 'Consider making title more concise'
                });
                analysis.score -= 5;
            }
        }

        return analysis;
    }

    /**
     * Analyze meta description
     */
    analyzeMetaDescription(description) {
        const analysis = {
            length: description.length,
            wordCount: description.split(/\s+/).filter(w => w).length,
            issues: [],
            score: 100
        };

        if (!description) {
            analysis.issues.push({
                type: 'error',
                message: 'Meta description is required for SEO'
            });
            analysis.score = 0;
        } else {
            if (description.length < 120) {
                analysis.issues.push({
                    type: 'warning',
                    message: 'Meta description is too short (recommended: 120-160 characters)'
                });
                analysis.score -= 20;
            }
            
            if (description.length > 160) {
                analysis.issues.push({
                    type: 'warning',
                    message: 'Meta description may be truncated (recommended: 120-160 characters)'
                });
                analysis.score -= 15;
            }
        }

        return analysis;
    }

    /**
     * Analyze content structure
     */
    analyzeContentStructure(content) {
        const headings = this.extractHeadings(content.raw);
        const links = this.extractLinks(content.html);
        const images = this.extractImages(content.html);
        
        const analysis = {
            headings: this.analyzeHeadings(headings),
            links: this.analyzeLinks(links),
            images: this.analyzeImages(images),
            paragraphs: this.analyzeParagraphs(content.text),
            lists: this.analyzeLists(content.raw)
        };

        return analysis;
    }

    /**
     * Extract headings from content
     */
    extractHeadings(content) {
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        const headings = [];
        let match;

        while ((match = headingRegex.exec(content)) !== null) {
            headings.push({
                level: match[1].length,
                text: match[2],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        return headings;
    }

    /**
     * Analyze headings structure
     */
    analyzeHeadings(headings) {
        const analysis = {
            count: headings.length,
            structure: {},
            issues: [],
            score: 100
        };

        // Count headings by level
        headings.forEach(heading => {
            analysis.structure[`h${heading.level}`] = (analysis.structure[`h${heading.level}`] || 0) + 1;
        });

        // Check for H1
        if (!analysis.structure.h1) {
            analysis.issues.push({
                type: 'warning',
                message: 'Consider adding an H1 heading for better SEO structure'
            });
            analysis.score -= 15;
        } else if (analysis.structure.h1 > 1) {
            analysis.issues.push({
                type: 'warning',
                message: 'Multiple H1 headings detected - use only one H1 per page'
            });
            analysis.score -= 10;
        }

        // Check heading hierarchy
        if (this.hasSkippedHeadingLevels(headings)) {
            analysis.issues.push({
                type: 'info',
                message: 'Consider maintaining proper heading hierarchy (H1 → H2 → H3)'
            });
            analysis.score -= 5;
        }

        return analysis;
    }

    /**
     * Check if heading levels are skipped
     */
    hasSkippedHeadingLevels(headings) {
        for (let i = 1; i < headings.length; i++) {
            const current = headings[i];
            const previous = headings[i - 1];
            
            if (current.level > previous.level + 1) {
                return true;
            }
        }
        return false;
    }

    /**
     * Analyze keywords
     */
    analyzeKeywords(text, metadata) {
        const keywordExtractor = new KeywordExtractor();
        const keywords = keywordExtractor.extract(text);
        const analysis = {
            primary: keywords.slice(0, 5),
            density: this.calculateKeywordDensity(text, keywords),
            distribution: this.analyzeKeywordDistribution(text, keywords),
            titleOptimization: this.analyzeKeywordsInTitle(metadata.title, keywords)
        };

        return analysis;
    }

    /**
     * Calculate keyword density
     */
    calculateKeywordDensity(text, keywords) {
        const totalWords = text.split(/\s+/).length;
        const densities = {};

        keywords.forEach(keyword => {
            const occurrences = this.countKeywordOccurrences(text, keyword.word);
            densities[keyword.word] = {
                count: occurrences,
                density: ((occurrences / totalWords) * 100).toFixed(2)
            };
        });

        return densities;
    }

    /**
     * Count keyword occurrences
     */
    countKeywordOccurrences(text, keyword) {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = text.match(regex);
        return matches ? matches.length : 0;
    }

    /**
     * Calculate overall SEO score
     */
    calculateOverallScore(analysis) {
        const weights = {
            meta: 0.3,
            structure: 0.25,
            readability: 0.25,
            keywords: 0.2
        };

        let totalScore = 0;
        
        // Meta score
        const metaScore = (
            analysis.meta.title.score +
            analysis.meta.description.score
        ) / 2;
        totalScore += metaScore * weights.meta;

        // Structure score
        const structureScore = analysis.structure.headings.score;
        totalScore += structureScore * weights.structure;

        // Readability score
        const readabilityScore = analysis.readability.score || 50;
        totalScore += readabilityScore * weights.readability;

        // Keywords score (simplified)
        const keywordScore = analysis.keywords.primary.length > 0 ? 80 : 40;
        totalScore += keywordScore * weights.keywords;

        return Math.round(Math.max(0, Math.min(100, totalScore)));
    }

    /**
     * Render SEO analysis in UI
     */
    renderAnalysis(analysis) {
        const container = document.getElementById('seoAnalysis');
        if (!container) return;

        container.innerHTML = this.generateAnalysisHTML(analysis);
    }

    /**
     * Generate HTML for analysis display
     */
    generateAnalysisHTML(analysis) {
        const scoreClass = this.getScoreClass(analysis.score);
        
        return `
            <div class="seo-score">
                <div class="score-circle ${scoreClass}">
                    ${analysis.score}
                </div>
                <div class="score-info">
                    <h3>SEO Score</h3>
                    <p>Overall optimization: ${this.getScoreDescription(analysis.score)}</p>
                </div>
            </div>

            <div class="seo-sections">
                ${this.renderMetaAnalysis(analysis.meta)}
                ${this.renderStructureAnalysis(analysis.structure)}
                ${this.renderReadabilityAnalysis(analysis.readability)}
                ${this.renderKeywordAnalysis(analysis.keywords)}
                ${this.renderSuggestions(analysis.suggestions)}
            </div>
        `;
    }

    /**
     * Render metadata analysis
     */
    renderMetaAnalysis(meta) {
        return `
            <div class="seo-section">
                <h4>📋 Metadata</h4>
                
                <div class="seo-item">
                    <div class="seo-item-header">
                        <span>Title Tag</span>
                        <span class="score ${this.getScoreClass(meta.title.score)}">${meta.title.score}</span>
                    </div>
                    <div class="seo-item-details">
                        Length: ${meta.title.length} characters
                        ${meta.title.issues.map(issue => `
                            <div class="seo-issue ${issue.type}">
                                ${this.getIssueIcon(issue.type)} ${issue.message}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="seo-item">
                    <div class="seo-item-header">
                        <span>Meta Description</span>
                        <span class="score ${this.getScoreClass(meta.description.score)}">${meta.description.score}</span>
                    </div>
                    <div class="seo-item-details">
                        Length: ${meta.description.length} characters
                        ${meta.description.issues.map(issue => `
                            <div class="seo-issue ${issue.type}">
                                ${this.getIssueIcon(issue.type)} ${issue.message}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render structure analysis
     */
    renderStructureAnalysis(structure) {
        return `
            <div class="seo-section">
                <h4>🏗️ Content Structure</h4>
                
                <div class="seo-item">
                    <div class="seo-item-header">
                        <span>Headings</span>
                        <span class="score ${this.getScoreClass(structure.headings.score)}">${structure.headings.score}</span>
                    </div>
                    <div class="seo-item-details">
                        <div class="heading-distribution">
                            ${Object.entries(structure.headings.structure).map(([level, count]) => `
                                <span class="heading-stat">${level.toUpperCase()}: ${count}</span>
                            `).join('')}
                        </div>
                        ${structure.headings.issues.map(issue => `
                            <div class="seo-issue ${issue.type}">
                                ${this.getIssueIcon(issue.type)} ${issue.message}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render readability analysis
     */
    renderReadabilityAnalysis(readability) {
        return `
            <div class="seo-section">
                <h4>📖 Readability</h4>
                
                <div class="readability-score">
                    <div class="readability-gauge">
                        <div class="readability-pointer" style="left: ${readability.score}%"></div>
                    </div>
                    <div class="readability-info">
                        <div>Score: ${readability.score || 'N/A'}</div>
                        <div>Level: ${readability.level || 'Unknown'}</div>
                    </div>
                </div>

                <div class="readability-metrics">
                    <div class="metric">
                        <span>Avg. Sentence Length:</span>
                        <span>${readability.avgSentenceLength || 0} words</span>
                    </div>
                    <div class="metric">
                        <span>Complex Words:</span>
                        <span>${readability.complexWords || 0}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render keyword analysis
     */
    renderKeywordAnalysis(keywords) {
        return `
            <div class="seo-section">
                <h4>🔍 Keywords</h4>
                
                <div class="keyword-list">
                    ${keywords.primary.slice(0, 5).map(keyword => `
                        <div class="keyword-item">
                            <div class="keyword-word">${keyword.word}</div>
                            <div class="keyword-stats">
                                <span>Frequency: ${keyword.count}</span>
                                <span>Relevance: ${Math.round(keyword.score)}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${keywords.primary.length === 0 ? `
                    <div class="seo-issue warning">
                        ⚠️ No significant keywords detected. Add relevant keywords to improve SEO.
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render suggestions
     */
    renderSuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            return '';
        }

        return `
            <div class="seo-section">
                <h4>💡 Suggestions</h4>
                <ul class="seo-suggestions">
                    ${suggestions.map(suggestion => `
                        <li class="seo-suggestion ${suggestion.priority}">
                            <div class="suggestion-icon">${this.getSuggestionIcon(suggestion.type)}</div>
                            <div class="suggestion-content">
                                <div class="suggestion-text">${suggestion.message}</div>
                                ${suggestion.action ? `
                                    <button class="suggestion-action" onclick="seoInstance.applySuggestion('${suggestion.id}')">
                                        ${suggestion.action}
                                    </button>
                                ` : ''}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    /**
     * Get score class for styling
     */
    getScoreClass(score) {
        if (score >= 80) return 'good';
        if (score >= 60) return 'average';
        return 'poor';
    }

    /**
     * Get score description
     */
    getScoreDescription(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 60) return 'Needs Improvement';
        return 'Poor';
    }

    /**
     * Get issue icon
     */
    getIssueIcon(type) {
        switch (type) {
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '•';
        }
    }

    /**
     * Get suggestion icon
     */
    getSuggestionIcon(type) {
        switch (type) {
            case 'title': return '📝';
            case 'description': return '📄';
            case 'structure': return '🏗️';
            case 'keyword': return '🔍';
            case 'readability': return '📖';
            default: return '💡';
        }
    }

    /**
     * Strip markdown from content
     */
    stripMarkdown(content) {
        return content
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`[^`]*`/g, '') // Remove inline code
            .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
            .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1') // Replace links with text
            .replace(/[#*_~`]/g, '') // Remove markdown syntax
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .trim();
    }

    /**
     * Count words in content
     */
    countWords(content) {
        const plainText = this.stripMarkdown(content);
        return plainText ? plainText.split(/\s+/).filter(w => w.length > 0).length : 0;
    }

    /**
     * Load SEO settings
     */
    loadSEOSettings() {
        // Load user preferences for SEO analysis
        this.settings = {
            enableRealTimeAnalysis: true,
            keywordDensityThreshold: 2.5,
            minContentLength: 300,
            ...this.loadSettings()
        };
    }

    /**
     * Load settings from storage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('seo-settings');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load SEO settings:', error);
            return {};
        }
    }

    /**
     * Show analysis error
     */
    showAnalysisError(error) {
        const container = document.getElementById('seoAnalysis');
        if (container) {
            container.innerHTML = `
                <div class="seo-error">
                    <h3>Analysis Error</h3>
                    <p>Failed to analyze content: ${error.message}</p>
                    <button onclick="seoInstance.updateAnalysis()" class="btn btn-primary">
                        Retry Analysis
                    </button>
                </div>
            `;
        }
    }

    /**
     * Apply suggestion
     */
    applySuggestion(suggestionId) {
        const suggestion = this.currentAnalysis?.suggestions?.find(s => s.id === suggestionId);
        if (!suggestion) return;

        // Apply the suggestion based on its type
        switch (suggestion.type) {
            case 'title':
                this.applySuggestionToTitle(suggestion);
                break;
            case 'description':
                this.applySuggestionToDescription(suggestion);
                break;
            case 'structure':
                this.applySuggestionToContent(suggestion);
                break;
        }
    }

    /**
     * Apply suggestion to title
     */
    applySuggestionToTitle(suggestion) {
        const titleInput = document.getElementById('titleInput');
        if (titleInput && suggestion.suggestedText) {
            titleInput.value = suggestion.suggestedText;
            titleInput.dispatchEvent(new Event('input'));
        }
    }

    /**
     * Apply suggestion to description
     */
    applySuggestionToDescription(suggestion) {
        const descInput = document.getElementById('descriptionInput');
        if (descInput && suggestion.suggestedText) {
            descInput.value = suggestion.suggestedText;
            descInput.dispatchEvent(new Event('input'));
        }
    }

    /**
     * Apply suggestion to content
     */
    applySuggestionToContent(suggestion) {
        if (suggestion.suggestedText) {
            this.editor.editor.replaceSelection(suggestion.suggestedText);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.analysisTimeout) {
            clearTimeout(this.analysisTimeout);
        }
    }
}

/**
 * SEO Rule Engine
 */
class SEORuleEngine {
    generateSuggestions(content, metadata, analysis) {
        const suggestions = [];

        // Title suggestions
        if (analysis.meta.title.score < 80) {
            suggestions.push(...this.generateTitleSuggestions(metadata.title, analysis));
        }

        // Description suggestions
        if (analysis.meta.description.score < 80) {
            suggestions.push(...this.generateDescriptionSuggestions(metadata.description, analysis));
        }

        // Content structure suggestions
        if (analysis.structure.headings.score < 80) {
            suggestions.push(...this.generateStructureSuggestions(analysis.structure));
        }

        // Readability suggestions
        if (analysis.readability.score < 60) {
            suggestions.push(...this.generateReadabilitySuggestions(analysis.readability));
        }

        return suggestions.slice(0, 10); // Limit to top 10 suggestions
    }

    generateTitleSuggestions(title, analysis) {
        const suggestions = [];
        
        if (!title) {
            suggestions.push({
                id: 'title-missing',
                type: 'title',
                priority: 'high',
                message: 'Add a descriptive title for better SEO',
                action: 'Add Title'
            });
        } else if (title.length < 30) {
            suggestions.push({
                id: 'title-too-short',
                type: 'title',
                priority: 'medium',
                message: 'Consider making your title longer (30-60 characters)',
                action: 'Expand Title'
            });
        }

        return suggestions;
    }

    generateDescriptionSuggestions(description, analysis) {
        const suggestions = [];
        
        if (!description) {
            suggestions.push({
                id: 'description-missing',
                type: 'description',
                priority: 'high',
                message: 'Add a meta description to improve search visibility',
                action: 'Add Description'
            });
        } else if (description.length < 120) {
            suggestions.push({
                id: 'description-too-short',
                type: 'description',
                priority: 'medium',
                message: 'Make your meta description more detailed (120-160 characters)',
                action: 'Expand Description'
            });
        }

        return suggestions;
    }

    generateStructureSuggestions(structure) {
        const suggestions = [];
        
        if (!structure.headings.structure.h1) {
            suggestions.push({
                id: 'missing-h1',
                type: 'structure',
                priority: 'medium',
                message: 'Add an H1 heading to improve content structure',
                action: 'Add H1',
                suggestedText: '# Your Main Heading Here\n\n'
            });
        }

        return suggestions;
    }

    generateReadabilitySuggestions(readability) {
        const suggestions = [];
        
        if (readability.avgSentenceLength > 20) {
            suggestions.push({
                id: 'long-sentences',
                type: 'readability',
                priority: 'low',
                message: 'Consider breaking up long sentences for better readability',
                action: 'Review Text'
            });
        }

        return suggestions;
    }
}

/**
 * Readability Analyzer
 */
class ReadabilityAnalyzer {
    analyze(text) {
        const sentences = this.getSentences(text);
        const words = this.getWords(text);
        const syllables = this.countSyllables(words);
        
        const avgSentenceLength = words.length / Math.max(sentences.length, 1);
        const avgSyllablesPerWord = syllables / Math.max(words.length, 1);
        
        // Flesch Reading Ease Score
        const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
        const normalizedScore = Math.max(0, Math.min(100, fleschScore));
        
        return {
            score: Math.round(normalizedScore),
            level: this.getReadingLevel(normalizedScore),
            avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
            avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
            complexWords: this.getComplexWordPercentage(words)
        };
    }

    getSentences(text) {
        return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }

    getWords(text) {
        return text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    }

    countSyllables(words) {
        return words.reduce((total, word) => total + this.countWordSyllables(word), 0);
    }

    countWordSyllables(word) {
        const vowels = 'aeiouy';
        let syllables = 0;
        let previousWasVowel = false;
        
        for (let i = 0; i < word.length; i++) {
            const isVowel = vowels.includes(word[i]);
            if (isVowel && !previousWasVowel) {
                syllables++;
            }
            previousWasVowel = isVowel;
        }
        
        // Adjust for silent 'e'
        if (word.endsWith('e') && syllables > 1) {
            syllables--;
        }
        
        return Math.max(1, syllables);
    }

    getComplexWordPercentage(words) {
        const complexWords = words.filter(word => this.countWordSyllables(word) >= 3);
        return Math.round((complexWords.length / Math.max(words.length, 1)) * 100);
    }

    getReadingLevel(score) {
        if (score >= 90) return 'Very Easy';
        if (score >= 80) return 'Easy';
        if (score >= 70) return 'Fairly Easy';
        if (score >= 60) return 'Standard';
        if (score >= 50) return 'Fairly Difficult';
        if (score >= 30) return 'Difficult';
        return 'Very Difficult';
    }
}

/**
 * Keyword Extractor
 */
class KeywordExtractor {
    constructor() {
        // Common stop words to filter out
        this.stopWords = new Set([
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
            'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
            'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
            'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
            'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
            'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can',
            'like', 'time', 'no', 'just', 'him', 'know', 'take',
            'people', 'into', 'year', 'your', 'good', 'some', 'could',
            'them', 'see', 'other', 'than', 'then', 'now', 'look',
            'only', 'come', 'its', 'over', 'think', 'also', 'back',
            'after', 'use', 'two', 'how', 'our', 'work', 'first',
            'well', 'way', 'even', 'new', 'want', 'because', 'any',
            'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are',
            'been', 'has', 'had', 'were'
        ]);
    }

    extract(text) {
        const words = this.getWords(text);
        const wordFreq = this.calculateWordFrequency(words);
        const keywords = this.scoreKeywords(wordFreq, words.length);
        
        return keywords
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);
    }

    getWords(text) {
        return text.toLowerCase()
            .match(/\b[a-z]{3,}\b/g) || []; // Words with 3+ characters
    }

    calculateWordFrequency(words) {
        const freq = {};
        
        words.forEach(word => {
            if (!this.stopWords.has(word)) {
                freq[word] = (freq[word] || 0) + 1;
            }
        });
        
        return freq;
    }

    scoreKeywords(wordFreq, totalWords) {
        return Object.entries(wordFreq).map(([word, count]) => ({
            word,
            count,
            frequency: count / totalWords,
            score: this.calculateKeywordScore(word, count, totalWords)
        }));
    }

    calculateKeywordScore(word, count, totalWords) {
        const frequency = count / totalWords;
        const length = word.length;
        
        // Simple scoring: frequency * length bonus
        return (frequency * 100) + (length > 5 ? 10 : 0);
    }
}

// Global reference
window.seoInstance = null;

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EditorSEO;
}

// Make available globally
window.EditorSEO = EditorSEO;