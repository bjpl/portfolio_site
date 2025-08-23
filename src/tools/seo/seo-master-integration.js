/**
 * SEO Master Integration
 * Integrates all portfolio SEO tools into the existing content editor
 */

class SEOMasterIntegration {
    constructor() {
        this.tools = new Map();
        this.activeAnalysis = null;
        this.autoOptimizeEnabled = false;
        this.realTimeEnabled = true;
        this.templates = new Map();
        
        this.initializeTools();
        this.initializeTemplates();
        this.setupEventListeners();
    }

    /**
     * Initialize all SEO tools
     */
    initializeTools() {
        // Register all SEO optimization tools
        this.tools.set('metaOptimizer', window.PortfolioMetaOptimizer ? new PortfolioMetaOptimizer() : null);
        this.tools.set('linkedinOptimizer', window.LinkedInOptimizer ? new LinkedInOptimizer() : null);
        this.tools.set('schemaGenerator', window.SchemaPortfolioGenerator ? new SchemaPortfolioGenerator() : null);
        this.tools.set('keywordOptimizer', window.KeywordJobOptimizer ? new KeywordJobOptimizer() : null);
        this.tools.set('sitemapGenerator', window.PortfolioSitemapGenerator ? new PortfolioSitemapGenerator() : null);
        this.tools.set('ogOptimizer', window.OpenGraphProfessionalOptimizer ? new OpenGraphProfessionalOptimizer() : null);
        this.tools.set('seoChecker', window.PortfolioSEOChecker ? new PortfolioSEOChecker() : null);
        
        console.log('SEO Tools initialized:', Array.from(this.tools.keys()).filter(key => this.tools.get(key) !== null));
    }

    /**
     * Initialize SEO templates and presets
     */
    initializeTemplates() {
        // Homepage Template
        this.templates.set('homepage', {
            title: '{name} - {primary_role} Portfolio | Professional {industry} Expert',
            description: 'Professional portfolio of {name}, {primary_role} with {experience_years}+ years experience. Specializing in {specializations}. View work samples, case studies, and get in touch.',
            keywords: ['{primary_role}', '{name}', 'portfolio', '{industry}', '{location}', 'professional', '{specializations}'],
            ogTags: {
                'og:type': 'website',
                'og:title': '{name} - Professional {primary_role} Portfolio',
                'og:description': 'Explore the professional work of {name}, {primary_role} specializing in {specializations}. Available for {availability_type}.'
            },
            schema: {
                '@type': 'Person',
                'jobTitle': '{primary_role}',
                'knowsAbout': '{skills_list}'
            }
        });

        // Project Page Template
        this.templates.set('project', {
            title: '{project_name} - {project_type} by {name}',
            description: '{project_description} Built with {technologies}. Case study showcasing {primary_role} expertise in {project_category}.',
            keywords: ['{project_name}', '{project_type}', '{technologies}', '{name}', '{primary_role}'],
            ogTags: {
                'og:type': 'article',
                'og:title': '{project_name} - {project_type} Case Study',
                'og:description': '{project_description}'
            },
            schema: {
                '@type': 'CreativeWork',
                'name': '{project_name}',
                'description': '{project_description}'
            }
        });

        // About Page Template
        this.templates.set('about', {
            title: 'About {name} - {primary_role} with {experience_years}+ Years Experience',
            description: 'Learn about {name}, {primary_role} based in {location}. {experience_summary} Passionate about {interests} and available for {availability_type}.',
            keywords: ['about', '{name}', '{primary_role}', 'experience', 'background', '{location}'],
            ogTags: {
                'og:type': 'profile',
                'og:title': 'About {name} - {primary_role}',
                'og:description': 'Professional background and expertise of {name}'
            },
            schema: {
                '@type': 'AboutPage',
                'mainEntity': {
                    '@type': 'Person',
                    'name': '{name}'
                }
            }
        });

        // Services Page Template
        this.templates.set('services', {
            title: '{name} Professional Services - {service_categories}',
            description: 'Professional {industry} services by {name}. Offering {services_list} with proven results. Get in touch for consultation and quotes.',
            keywords: ['services', '{service_categories}', '{primary_role}', 'consulting', 'professional', '{location}'],
            ogTags: {
                'og:type': 'website',
                'og:title': '{name} Professional Services',
                'og:description': 'High-quality {industry} services with proven track record'
            },
            schema: {
                '@type': 'Service',
                'provider': {
                    '@type': 'Person',
                    'name': '{name}'
                }
            }
        });

        // Blog Post Template
        this.templates.set('blog-post', {
            title: '{post_title} | {name} - {primary_role}',
            description: '{post_excerpt} Professional insights from {name}, {primary_role} with expertise in {specializations}.',
            keywords: ['{post_keywords}', '{name}', '{primary_role}', '{industry}'],
            ogTags: {
                'og:type': 'article',
                'og:title': '{post_title}',
                'og:description': '{post_excerpt}'
            },
            schema: {
                '@type': 'Article',
                'headline': '{post_title}',
                'author': {
                    '@type': 'Person',
                    'name': '{name}'
                }
            }
        });
    }

    /**
     * Setup event listeners for real-time optimization
     */
    setupEventListeners() {
        // Listen for content changes
        document.addEventListener('input', (e) => {
            if (this.realTimeEnabled && this.isEditorElement(e.target)) {
                this.debounceRealTimeAnalysis();
            }
        });

        // Listen for form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('content-form')) {
                this.performPrePublishCheck(e);
            }
        });

        // Listen for page type changes
        document.addEventListener('change', (e) => {
            if (e.target.id === 'pageTypeSelect') {
                this.applyTemplate(e.target.value);
            }
        });
    }

    /**
     * Integrate all SEO tools into the existing content editor
     */
    integrateIntoEditor() {
        const editor = this.findEditor();
        if (!editor) {
            console.error('Content editor not found');
            return false;
        }

        console.log('Integrating SEO tools into editor...');

        // Add main SEO panel
        this.createMainSEOPanel();
        
        // Add tool-specific panels
        this.createToolPanels();
        
        // Add real-time feedback
        this.setupRealTimeFeedback();
        
        // Add template selector
        this.addTemplateSelector();
        
        // Add quick actions toolbar
        this.addQuickActionsToolbar();
        
        // Add SEO preview
        this.addSEOPreview();

        console.log('SEO integration complete');
        return true;
    }

    /**
     * Find the existing content editor
     */
    findEditor() {
        // Try multiple selectors to find the editor
        const selectors = [
            '.editor-container',
            '#editor',
            '.content-editor',
            '.editor-core',
            'textarea[name="content"]',
            '#enhanced-content-editor'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log('Found editor:', selector);
                return element;
            }
        }

        return null;
    }

    /**
     * Create main SEO control panel
     */
    createMainSEOPanel() {
        const editorContainer = this.findEditor() || document.body;
        
        const seoPanel = document.createElement('div');
        seoPanel.id = 'seo-master-panel';
        seoPanel.className = 'seo-master-panel';
        seoPanel.innerHTML = `
            <div class="seo-panel-header">
                <h3><span class="seo-icon">🎯</span> Portfolio SEO Optimization</h3>
                <button class="panel-toggle" onclick="seoMaster.togglePanel()">−</button>
            </div>
            
            <div class="seo-panel-content">
                <div class="seo-score-display">
                    <div class="overall-score">
                        <div class="score-circle" id="overallScore">--</div>
                        <div class="score-label">Overall SEO Score</div>
                    </div>
                    
                    <div class="category-scores" id="categoryScores">
                        <!-- Category scores will be populated here -->
                    </div>
                </div>
                
                <div class="seo-quick-actions">
                    <button class="btn btn-primary" onclick="seoMaster.runCompleteAnalysis()" title="Analyze all SEO factors">
                        <span class="icon">🔍</span> Full Analysis
                    </button>
                    
                    <button class="btn btn-secondary" onclick="seoMaster.quickOptimize()" title="Apply quick SEO improvements">
                        <span class="icon">⚡</span> Quick Optimize
                    </button>
                    
                    <button class="btn btn-info" onclick="seoMaster.generatePreview()" title="Preview how content appears in search/social">
                        <span class="icon">👁️</span> Preview
                    </button>
                    
                    <button class="btn btn-success" onclick="seoMaster.applyTemplate()" title="Apply SEO template for this content type">
                        <span class="icon">🎭</span> Template
                    </button>
                </div>
                
                <div class="seo-tabs">
                    <div class="tab-nav">
                        <button class="tab-btn active" onclick="seoMaster.showTab('overview')">Overview</button>
                        <button class="tab-btn" onclick="seoMaster.showTab('meta')">Meta Tags</button>
                        <button class="tab-btn" onclick="seoMaster.showTab('keywords')">Keywords</button>
                        <button class="tab-btn" onclick="seoMaster.showTab('social')">Social</button>
                        <button class="tab-btn" onclick="seoMaster.showTab('technical')">Technical</button>
                    </div>
                    
                    <div class="tab-content">
                        <div id="tab-overview" class="tab-panel active">
                            <div id="seo-overview" class="seo-overview"><!-- Overview content --></div>
                        </div>
                        
                        <div id="tab-meta" class="tab-panel">
                            <div id="meta-optimization" class="meta-optimization"><!-- Meta optimization --></div>
                        </div>
                        
                        <div id="tab-keywords" class="tab-panel">
                            <div id="keyword-optimization" class="keyword-optimization"><!-- Keyword optimization --></div>
                        </div>
                        
                        <div id="tab-social" class="tab-panel">
                            <div id="social-optimization" class="social-optimization"><!-- Social optimization --></div>
                        </div>
                        
                        <div id="tab-technical" class="tab-panel">
                            <div id="technical-analysis" class="technical-analysis"><!-- Technical analysis --></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="seo-panel-footer">
                <div class="settings">
                    <label class="checkbox-label">
                        <input type="checkbox" id="realTimeAnalysis" checked onchange="seoMaster.toggleRealTime(this.checked)">
                        Real-time analysis
                    </label>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="autoOptimize" onchange="seoMaster.toggleAutoOptimize(this.checked)">
                        Auto-optimize
                    </label>
                </div>
                
                <div class="last-updated" id="lastUpdated">Never analyzed</div>
            </div>
        `;
        
        // Insert panel after editor or append to container
        if (editorContainer.nextSibling) {
            editorContainer.parentNode.insertBefore(seoPanel, editorContainer.nextSibling);
        } else {
            editorContainer.parentNode.appendChild(seoPanel);
        }
    }

    /**
     * Create tool-specific panels
     */
    createToolPanels() {
        // Each tool gets integrated into the main panel tabs
        // This keeps the UI clean and organized
    }

    /**
     * Setup real-time SEO feedback
     */
    setupRealTimeFeedback() {
        this.debounceTimer = null;
        this.lastAnalysisTime = 0;
        
        // Add real-time indicators to form fields
        this.addFieldIndicators();
    }

    /**
     * Add SEO indicators to form fields
     */
    addFieldIndicators() {
        const fields = {
            titleInput: { type: 'title', optimal: [30, 60] },
            descriptionInput: { type: 'description', optimal: [120, 160] },
            tagsInput: { type: 'keywords', optimal: [3, 10] }
        };

        for (const [fieldId, config] of Object.entries(fields)) {
            const field = document.getElementById(fieldId);
            if (field) {
                this.addFieldIndicator(field, config);
            }
        }
    }

    /**
     * Add indicator to specific field
     */
    addFieldIndicator(field, config) {
        const indicator = document.createElement('div');
        indicator.className = 'seo-field-indicator';
        indicator.innerHTML = `
            <div class="indicator-bar">
                <div class="indicator-fill"></div>
            </div>
            <div class="indicator-text">0 characters</div>
        `;
        
        field.parentNode.style.position = 'relative';
        field.parentNode.appendChild(indicator);
        
        // Add real-time updates
        field.addEventListener('input', () => {
            this.updateFieldIndicator(field, indicator, config);
        });
        
        // Initial update
        this.updateFieldIndicator(field, indicator, config);
    }

    /**
     * Update field indicator
     */
    updateFieldIndicator(field, indicator, config) {
        const value = field.value;
        const length = value.length;
        const fill = indicator.querySelector('.indicator-fill');
        const text = indicator.querySelector('.indicator-text');
        
        let percentage = 0;
        let status = 'poor';
        
        if (config.type === 'title' || config.type === 'description') {
            const [min, max] = config.optimal;
            if (length >= min && length <= max) {
                percentage = 100;
                status = 'good';
            } else if (length > 0) {
                percentage = Math.min(100, (length / max) * 100);
                status = length < min ? 'warning' : 'warning';
            }
            
            text.textContent = `${length} characters (optimal: ${min}-${max})`;
        } else if (config.type === 'keywords') {
            const keywordCount = value.split(',').filter(k => k.trim()).length;
            const [min, max] = config.optimal;
            
            if (keywordCount >= min && keywordCount <= max) {
                percentage = 100;
                status = 'good';
            } else if (keywordCount > 0) {
                percentage = Math.min(100, (keywordCount / max) * 100);
                status = keywordCount < min ? 'warning' : 'warning';
            }
            
            text.textContent = `${keywordCount} keywords (optimal: ${min}-${max})`;
        }
        
        fill.style.width = percentage + '%';
        fill.className = `indicator-fill ${status}`;
        indicator.className = `seo-field-indicator ${status}`;
    }

    /**
     * Add template selector
     */
    addTemplateSelector() {
        const selector = document.createElement('div');
        selector.className = 'seo-template-selector';
        selector.innerHTML = `
            <label for="seoTemplate">SEO Template:</label>
            <select id="seoTemplate" onchange="seoMaster.applySelectedTemplate(this.value)">
                <option value="">Choose template...</option>
                <option value="homepage">Homepage</option>
                <option value="about">About Page</option>
                <option value="project">Project/Portfolio Item</option>
                <option value="services">Services Page</option>
                <option value="blog-post">Blog Post</option>
            </select>
            <button class="btn btn-sm" onclick="seoMaster.previewTemplate()" title="Preview template">Preview</button>
        `;
        
        // Insert near the top of the form
        const form = document.querySelector('.content-form') || document.querySelector('form');
        if (form) {
            form.insertBefore(selector, form.firstChild);
        }
    }

    /**
     * Run complete SEO analysis
     */
    async runCompleteAnalysis() {
        const content = this.getCurrentContent();
        const metadata = this.getCurrentMetadata();
        const profile = this.extractProfile(content, metadata);
        
        console.log('Running complete SEO analysis...');
        
        const results = {
            timestamp: new Date().toISOString(),
            overallScore: 0,
            categoryScores: {},
            recommendations: [],
            issues: []
        };
        
        // Run all available tools
        const analyses = await Promise.all([
            this.runTool('seoChecker', 'performComprehensiveAnalysis', [content, metadata, profile]),
            this.runTool('metaOptimizer', 'optimizeMeta', [content, metadata]),
            this.runTool('keywordOptimizer', 'optimizeForJobSearch', [content, metadata, profile]),
            this.runTool('ogOptimizer', 'generateProfessionalOG', [content, metadata, profile, this.detectPageType()]),
            this.runTool('schemaGenerator', 'generateSchema', [content, metadata, profile, this.detectPageType()])
        ]);
        
        // Process results
        this.processAnalysisResults(analyses, results);
        
        // Update UI
        this.updateSEODisplay(results);
        
        // Store for later use
        this.activeAnalysis = results;
        
        console.log('Analysis complete. Overall score:', results.overallScore);
        
        return results;
    }

    /**
     * Run a specific tool analysis
     */
    async runTool(toolName, method, args) {
        const tool = this.tools.get(toolName);
        if (!tool || !tool[method]) {
            console.warn(`Tool ${toolName} or method ${method} not available`);
            return null;
        }
        
        try {
            return await tool[method](...args);
        } catch (error) {
            console.error(`Error running ${toolName}.${method}:`, error);
            return null;
        }
    }

    /**
     * Quick optimize - apply most impactful improvements
     */
    async quickOptimize() {
        const content = this.getCurrentContent();
        const metadata = this.getCurrentMetadata();
        
        console.log('Running quick optimization...');
        
        const improvements = [];
        
        // Quick meta optimizations
        if (!metadata.title || metadata.title.length < 30) {
            const suggestedTitle = this.generateQuickTitle(content, metadata);
            if (suggestedTitle) {
                this.updateField('titleInput', suggestedTitle);
                improvements.push('Updated page title');
            }
        }
        
        // Quick description optimization
        if (!metadata.description || metadata.description.length < 120) {
            const suggestedDescription = this.generateQuickDescription(content, metadata);
            if (suggestedDescription) {
                this.updateField('descriptionInput', suggestedDescription);
                improvements.push('Updated meta description');
            }
        }
        
        // Quick keyword suggestions
        if (!metadata.tags || metadata.tags.length < 3) {
            const suggestedKeywords = this.extractQuickKeywords(content);
            if (suggestedKeywords.length > 0) {
                this.updateField('tagsInput', suggestedKeywords.join(', '));
                improvements.push('Added relevant keywords');
            }
        }
        
        // Show results
        this.showNotification(`Quick optimization complete: ${improvements.join(', ')}`, 'success');
        
        // Re-run analysis
        setTimeout(() => this.runCompleteAnalysis(), 500);
    }

    /**
     * Apply SEO template
     */
    async applySelectedTemplate(templateName) {
        if (!templateName) return;
        
        const template = this.templates.get(templateName);
        if (!template) {
            console.error('Template not found:', templateName);
            return;
        }
        
        const content = this.getCurrentContent();
        const metadata = this.getCurrentMetadata();
        const profile = this.extractProfile(content, metadata);
        
        // Interpolate template variables
        const interpolated = this.interpolateTemplate(template, profile, metadata, content);
        
        // Apply to form fields
        if (interpolated.title) {
            this.updateField('titleInput', interpolated.title);
        }
        
        if (interpolated.description) {
            this.updateField('descriptionInput', interpolated.description);
        }
        
        if (interpolated.keywords) {
            this.updateField('tagsInput', interpolated.keywords.join(', '));
        }
        
        this.showNotification(`Applied ${templateName} template`, 'success');
        
        // Re-analyze after template application
        setTimeout(() => this.runCompleteAnalysis(), 500);
    }

    /**
     * Update SEO display with analysis results
     */
    updateSEODisplay(results) {
        // Update overall score
        const overallScoreEl = document.getElementById('overallScore');
        if (overallScoreEl) {
            overallScoreEl.textContent = results.overallScore;
            overallScoreEl.className = `score-circle ${this.getScoreClass(results.overallScore)}`;
        }
        
        // Update category scores
        const categoryScoresEl = document.getElementById('categoryScores');
        if (categoryScoresEl && results.categoryScores) {
            categoryScoresEl.innerHTML = Object.entries(results.categoryScores)
                .map(([category, score]) => `
                    <div class="category-score ${this.getScoreClass(score)}">
                        <div class="category-name">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
                        <div class="category-value">${score}</div>
                    </div>
                `).join('');
        }
        
        // Update overview tab
        this.updateOverviewTab(results);
        
        // Update last analyzed time
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `Last analyzed: ${new Date().toLocaleTimeString()}`;
        }
    }

    /**
     * Update overview tab content
     */
    updateOverviewTab(results) {
        const overviewEl = document.getElementById('seo-overview');
        if (!overviewEl) return;
        
        let html = '';
        
        // Critical issues
        if (results.issues && results.issues.length > 0) {
            html += `
                <div class="seo-section critical-issues">
                    <h4><span class="icon">❌</span> Critical Issues</h4>
                    <ul>
                        ${results.issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Recommendations
        if (results.recommendations && results.recommendations.length > 0) {
            html += `
                <div class="seo-section recommendations">
                    <h4><span class="icon">💡</span> Recommendations</h4>
                    <ul>
                        ${results.recommendations.slice(0, 5).map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                    ${results.recommendations.length > 5 ? `<p>...and ${results.recommendations.length - 5} more</p>` : ''}
                </div>
            `;
        }
        
        // Quick wins
        html += `
            <div class="seo-section quick-wins">
                <h4><span class="icon">⚡</span> Quick Wins</h4>
                <div class="quick-win-buttons">
                    <button class="btn btn-sm btn-success" onclick="seoMaster.optimizeTitle()">Optimize Title</button>
                    <button class="btn btn-sm btn-success" onclick="seoMaster.optimizeDescription()">Optimize Description</button>
                    <button class="btn btn-sm btn-success" onclick="seoMaster.addKeywords()">Add Keywords</button>
                    <button class="btn btn-sm btn-success" onclick="seoMaster.improveImages()">Improve Images</button>
                </div>
            </div>
        `;
        
        overviewEl.innerHTML = html;
    }

    /**
     * Utility methods
     */
    getCurrentContent() {
        // Try to get content from various editor types
        const editors = [
            document.querySelector('textarea[name="content"]'),
            document.querySelector('#content'),
            document.querySelector('.editor-content'),
            document.querySelector('.CodeMirror')?.CodeMirror?.getValue,
            window.editorInstance?.getValue
        ];
        
        for (const editor of editors) {
            if (editor) {
                if (typeof editor === 'function') {
                    return editor();
                } else if (editor.value) {
                    return editor.value;
                }
            }
        }
        
        return '';
    }

    getCurrentMetadata() {
        return {
            title: document.getElementById('titleInput')?.value || '',
            description: document.getElementById('descriptionInput')?.value || '',
            tags: document.getElementById('tagsInput')?.value.split(',').map(t => t.trim()).filter(t => t) || [],
            author: document.getElementById('authorInput')?.value || ''
        };
    }

    extractProfile(content, metadata) {
        // Simple profile extraction - enhanced by individual tools
        return {
            name: metadata.author || this.extractName(content),
            primaryRole: this.extractRole(content),
            skills: this.extractSkills(content),
            location: this.extractLocation(content),
            experience: this.extractExperience(content)
        };
    }

    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'poor';
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    updateField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Public API methods for UI interactions
    togglePanel() {
        const panel = document.getElementById('seo-master-panel');
        const content = panel?.querySelector('.seo-panel-content');
        if (content) {
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            panel.querySelector('.panel-toggle').textContent = isVisible ? '+' : '−';
        }
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const selectedPanel = document.getElementById(`tab-${tabName}`);
        const selectedBtn = document.querySelector(`[onclick="seoMaster.showTab('${tabName}')"]`);
        
        if (selectedPanel) selectedPanel.classList.add('active');
        if (selectedBtn) selectedBtn.classList.add('active');
    }

    toggleRealTime(enabled) {
        this.realTimeEnabled = enabled;
        console.log('Real-time analysis', enabled ? 'enabled' : 'disabled');
    }

    toggleAutoOptimize(enabled) {
        this.autoOptimizeEnabled = enabled;
        console.log('Auto-optimize', enabled ? 'enabled' : 'disabled');
    }

    // Debounced real-time analysis
    debounceRealTimeAnalysis() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            if (this.realTimeEnabled) {
                this.runCompleteAnalysis();
            }
        }, 2000); // 2 second delay
    }

    isEditorElement(element) {
        return element.matches('textarea, input[type="text"], .editor-content, .CodeMirror textarea');
    }

    /**
     * Initialize the master integration
     */
    static initialize() {
        if (window.seoMaster) {
            console.log('SEO Master already initialized');
            return window.seoMaster;
        }
        
        window.seoMaster = new SEOMasterIntegration();
        
        // Auto-integrate when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.seoMaster.integrateIntoEditor();
            });
        } else {
            // DOM already ready
            setTimeout(() => {
                window.seoMaster.integrateIntoEditor();
            }, 100);
        }
        
        return window.seoMaster;
    }
}

// Initialize automatically
SEOMasterIntegration.initialize();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEOMasterIntegration;
}

window.SEOMasterIntegration = SEOMasterIntegration;