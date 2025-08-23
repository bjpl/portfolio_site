/**
 * Schema.org Portfolio Markup Generator
 * Generates comprehensive structured data for portfolio items
 */

class SchemaPortfolioGenerator {
    constructor() {
        this.schemaTypes = new Map();
        this.portfolioSchemas = new Map();
        this.initializeSchemaTypes();
        this.loadPortfolioSchemas();
    }

    /**
     * Initialize available schema types for portfolios
     */
    initializeSchemaTypes() {
        // Person schema for professional profiles
        this.schemaTypes.set('Person', {
            context: 'https://schema.org',
            type: 'Person',
            required: ['name'],
            optional: ['jobTitle', 'worksFor', 'url', 'sameAs', 'knowsAbout', 'hasOccupation'],
            portfolioSpecific: ['award', 'makesOffer', 'seeks', 'hasCredential']
        });

        // CreativeWork for portfolio pieces
        this.schemaTypes.set('CreativeWork', {
            context: 'https://schema.org',
            type: 'CreativeWork',
            required: ['name', 'creator'],
            optional: ['description', 'dateCreated', 'url', 'image', 'keywords'],
            portfolioSpecific: ['genre', 'audience', 'usageInfo', 'material']
        });

        // SoftwareApplication for tech projects
        this.schemaTypes.set('SoftwareApplication', {
            context: 'https://schema.org',
            type: 'SoftwareApplication',
            required: ['name', 'applicationCategory'],
            optional: ['description', 'url', 'screenshot', 'programmingLanguage', 'operatingSystem'],
            portfolioSpecific: ['codeRepository', 'downloadUrl', 'installUrl', 'demo']
        });

        // VisualArtwork for design portfolios
        this.schemaTypes.set('VisualArtwork', {
            context: 'https://schema.org',
            type: 'VisualArtwork',
            required: ['name', 'creator'],
            optional: ['description', 'dateCreated', 'image', 'medium', 'artform'],
            portfolioSpecific: ['artMedium', 'artworkSurface', 'colorist', 'letterer']
        });

        // WebSite for portfolio site itself
        this.schemaTypes.set('WebSite', {
            context: 'https://schema.org',
            type: 'WebSite',
            required: ['name', 'url'],
            optional: ['description', 'author', 'dateCreated', 'dateModified'],
            portfolioSpecific: ['potentialAction', 'mainEntity', 'about']
        });

        // Organization for companies/agencies
        this.schemaTypes.set('Organization', {
            context: 'https://schema.org',
            type: 'Organization',
            required: ['name'],
            optional: ['url', 'logo', 'description', 'foundingDate', 'founder'],
            portfolioSpecific: ['employee', 'memberOf', 'hasOfferCatalog']
        });

        // Course for educational content
        this.schemaTypes.set('Course', {
            context: 'https://schema.org',
            type: 'Course',
            required: ['name', 'description'],
            optional: ['provider', 'courseCode', 'hasCourseInstance', 'audience'],
            portfolioSpecific: ['teaches', 'coursePrerequisites', 'educationalLevel']
        });
    }

    /**
     * Load portfolio-specific schema templates
     */
    loadPortfolioSchemas() {
        // Professional portfolio homepage
        this.portfolioSchemas.set('portfolio-home', {
            primary: 'Person',
            additional: ['WebSite'],
            customProperties: {
                '@type': ['Person', 'ProfilePage'],
                'mainEntity': {
                    '@type': 'Person'
                }
            }
        });

        // Individual project/work item
        this.portfolioSchemas.set('project-item', {
            primary: 'CreativeWork',
            conditional: {
                'tech': 'SoftwareApplication',
                'design': 'VisualArtwork',
                'writing': 'Article',
                'education': 'Course'
            }
        });

        // About page
        this.portfolioSchemas.set('about-page', {
            primary: 'AboutPage',
            additional: ['Person'],
            customProperties: {
                'mainEntity': {
                    '@type': 'Person'
                }
            }
        });

        // Services page
        this.portfolioSchemas.set('services-page', {
            primary: 'Service',
            additional: ['Offer', 'Organization']
        });

        // Contact page
        this.portfolioSchemas.set('contact-page', {
            primary: 'ContactPage',
            additional: ['Person', 'Organization']
        });
    }

    /**
     * Generate schema markup for portfolio content
     */
    async generateSchema(content, metadata, profile, pageType = 'general') {
        const industry = this.detectIndustry(content, metadata);
        const schemaConfig = this.portfolioSchemas.get(pageType) || this.portfolioSchemas.get('project-item');
        
        let primarySchema = this.generatePrimarySchema(content, metadata, profile, schemaConfig, industry);
        let additionalSchemas = [];
        
        // Generate additional schemas if specified
        if (schemaConfig.additional) {
            additionalSchemas = schemaConfig.additional.map(type => 
                this.generateAdditionalSchema(type, content, metadata, profile, industry)
            );
        }

        // Apply conditional schemas based on industry
        if (schemaConfig.conditional && schemaConfig.conditional[industry]) {
            primarySchema = this.generatePrimarySchema(
                content, metadata, profile, 
                { primary: schemaConfig.conditional[industry] }, 
                industry
            );
        }

        // Generate breadcrumb schema if applicable
        const breadcrumbSchema = this.generateBreadcrumbSchema(metadata, pageType);
        
        // Generate FAQ schema if Q&A content detected
        const faqSchema = this.generateFAQSchema(content);
        
        // Combine all schemas
        const allSchemas = [
            primarySchema,
            ...additionalSchemas,
            ...(breadcrumbSchema ? [breadcrumbSchema] : []),
            ...(faqSchema ? [faqSchema] : [])
        ].filter(schema => schema !== null);

        return {
            jsonLD: this.formatAsJSONLD(allSchemas),
            microdata: this.formatAsMicrodata(allSchemas),
            rdfa: this.formatAsRDFa(allSchemas),
            validation: await this.validateSchemas(allSchemas),
            optimization: this.optimizeForSEO(allSchemas, industry),
            preview: this.generatePreview(allSchemas)
        };
    }

    /**
     * Generate primary schema based on content type
     */
    generatePrimarySchema(content, metadata, profile, schemaConfig, industry) {
        const schemaType = schemaConfig.primary;
        const schemaTemplate = this.schemaTypes.get(schemaType);
        
        if (!schemaTemplate) {
            console.warn(`Schema type ${schemaType} not found`);
            return null;
        }

        let schema = {
            '@context': schemaTemplate.context,
            '@type': schemaTemplate.type
        };

        // Add required properties
        schema = { ...schema, ...this.populateRequiredProperties(schemaTemplate, content, metadata, profile) };
        
        // Add optional properties that are available
        schema = { ...schema, ...this.populateOptionalProperties(schemaTemplate, content, metadata, profile, industry) };
        
        // Add portfolio-specific properties
        schema = { ...schema, ...this.populatePortfolioProperties(schemaTemplate, content, metadata, profile, industry) };
        
        // Apply custom properties from configuration
        if (schemaConfig.customProperties) {
            schema = { ...schema, ...schemaConfig.customProperties };
        }

        return schema;
    }

    /**
     * Populate required schema properties
     */
    populateRequiredProperties(schemaTemplate, content, metadata, profile) {
        const properties = {};
        
        schemaTemplate.required.forEach(prop => {
            switch (prop) {
                case 'name':
                    properties.name = metadata.title || this.extractTitle(content) || profile.name || 'Untitled';
                    break;
                case 'creator':
                    properties.creator = {
                        '@type': 'Person',
                        'name': profile.name || metadata.author || 'Creator'
                    };
                    break;
                case 'description':
                    properties.description = metadata.description || this.extractDescription(content) || '';
                    break;
                case 'url':
                    properties.url = metadata.url || window.location.href;
                    break;
                case 'applicationCategory':
                    properties.applicationCategory = this.determineApplicationCategory(content, metadata);
                    break;
            }
        });
        
        return properties;
    }

    /**
     * Populate optional schema properties
     */
    populateOptionalProperties(schemaTemplate, content, metadata, profile, industry) {
        const properties = {};
        
        schemaTemplate.optional.forEach(prop => {
            switch (prop) {
                case 'jobTitle':
                    if (profile.primaryRole) {
                        properties.jobTitle = profile.primaryRole;
                    }
                    break;
                case 'worksFor':
                    if (profile.company) {
                        properties.worksFor = {
                            '@type': 'Organization',
                            'name': profile.company
                        };
                    }
                    break;
                case 'sameAs':
                    const socialLinks = this.extractSocialLinks(content, metadata);
                    if (socialLinks.length > 0) {
                        properties.sameAs = socialLinks;
                    }
                    break;
                case 'knowsAbout':
                    if (profile.skills && profile.skills.length > 0) {
                        properties.knowsAbout = profile.skills;
                    }
                    break;
                case 'dateCreated':
                    if (metadata.date) {
                        properties.dateCreated = metadata.date;
                    }
                    break;
                case 'dateModified':
                    if (metadata.lastmod) {
                        properties.dateModified = metadata.lastmod;
                    }
                    break;
                case 'image':
                    const images = this.extractImages(content, metadata);
                    if (images.length > 0) {
                        properties.image = images;
                    }
                    break;
                case 'keywords':
                    if (metadata.keywords || metadata.tags) {
                        properties.keywords = metadata.keywords || metadata.tags;
                    }
                    break;
                case 'programmingLanguage':
                    const languages = this.extractProgrammingLanguages(content);
                    if (languages.length > 0) {
                        properties.programmingLanguage = languages;
                    }
                    break;
                case 'screenshot':
                    const screenshots = this.extractScreenshots(content, metadata);
                    if (screenshots.length > 0) {
                        properties.screenshot = screenshots;
                    }
                    break;
            }
        });
        
        return properties;
    }

    /**
     * Populate portfolio-specific properties
     */
    populatePortfolioProperties(schemaTemplate, content, metadata, profile, industry) {
        const properties = {};
        
        if (schemaTemplate.portfolioSpecific) {
            schemaTemplate.portfolioSpecific.forEach(prop => {
                switch (prop) {
                    case 'hasOccupation':
                        properties.hasOccupation = {
                            '@type': 'Occupation',
                            'name': profile.primaryRole || 'Professional',
                            'occupationLocation': {
                                '@type': 'Place',
                                'name': profile.location || 'Remote'
                            },
                            'skills': profile.skills?.join(', ') || '',
                            'experienceRequirements': this.categorizeExperience(profile.experience)
                        };
                        break;
                    case 'award':
                        const awards = this.extractAwards(content);
                        if (awards.length > 0) {
                            properties.award = awards;
                        }
                        break;
                    case 'makesOffer':
                        const services = this.extractServices(content, profile, industry);
                        if (services.length > 0) {
                            properties.makesOffer = services;
                        }
                        break;
                    case 'codeRepository':
                        const repos = this.extractCodeRepositories(content);
                        if (repos.length > 0) {
                            properties.codeRepository = repos;
                        }
                        break;
                    case 'demo':
                        const demos = this.extractDemoLinks(content);
                        if (demos.length > 0) {
                            properties.demo = demos;
                        }
                        break;
                    case 'genre':
                        properties.genre = this.determineGenre(content, industry);
                        break;
                    case 'audience':
                        properties.audience = {
                            '@type': 'Audience',
                            'audienceType': this.determineAudienceType(content, industry)
                        };
                        break;
                }
            });
        }
        
        return properties;
    }

    /**
     * Generate breadcrumb schema
     */
    generateBreadcrumbSchema(metadata, pageType) {
        if (!metadata.breadcrumbs && !metadata.path) {
            return null;
        }
        
        const breadcrumbs = metadata.breadcrumbs || this.generateBreadcrumbsFromPath(metadata.path);
        
        return {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            'itemListElement': breadcrumbs.map((crumb, index) => ({
                '@type': 'ListItem',
                'position': index + 1,
                'name': crumb.name,
                'item': crumb.url
            }))
        };
    }

    /**
     * Generate FAQ schema from content
     */
    generateFAQSchema(content) {
        const faqs = this.extractFAQs(content);
        
        if (faqs.length === 0) {
            return null;
        }
        
        return {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            'mainEntity': faqs.map(faq => ({
                '@type': 'Question',
                'name': faq.question,
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': faq.answer
                }
            }))
        };
    }

    /**
     * Format schemas as JSON-LD
     */
    formatAsJSONLD(schemas) {
        if (schemas.length === 1) {
            return `<script type="application/ld+json">\n${JSON.stringify(schemas[0], null, 2)}\n</script>`;
        }
        
        return schemas.map(schema => 
            `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
        ).join('\n\n');
    }

    /**
     * Format schemas as Microdata
     */
    formatAsMicrodata(schemas) {
        // Convert JSON-LD to Microdata attributes
        return schemas.map(schema => this.jsonLDToMicrodata(schema)).join('\n');
    }

    /**
     * Format schemas as RDFa
     */
    formatAsRDFa(schemas) {
        // Convert JSON-LD to RDFa attributes
        return schemas.map(schema => this.jsonLDToRDFa(schema)).join('\n');
    }

    /**
     * Validate schemas against schema.org
     */
    async validateSchemas(schemas) {
        const validationResults = [];
        
        for (let schema of schemas) {
            const validation = {
                type: schema['@type'],
                valid: true,
                errors: [],
                warnings: [],
                suggestions: []
            };
            
            // Basic validation
            if (!schema['@context']) {
                validation.errors.push('Missing @context');
                validation.valid = false;
            }
            
            if (!schema['@type']) {
                validation.errors.push('Missing @type');
                validation.valid = false;
            }
            
            // Type-specific validation
            validation.suggestions.push(...this.generateValidationSuggestions(schema));
            
            validationResults.push(validation);
        }
        
        return {
            overall: validationResults.every(v => v.valid),
            results: validationResults,
            summary: this.generateValidationSummary(validationResults)
        };
    }

    /**
     * Generate validation suggestions
     */
    generateValidationSuggestions(schema) {
        const suggestions = [];
        const schemaType = schema['@type'];
        const template = this.schemaTypes.get(schemaType);
        
        if (template) {
            // Check for missing recommended properties
            template.optional.forEach(prop => {
                if (!schema[prop]) {
                    suggestions.push(`Consider adding '${prop}' property for better SEO`);
                }
            });
            
            // Check for portfolio-specific enhancements
            if (template.portfolioSpecific) {
                template.portfolioSpecific.forEach(prop => {
                    if (!schema[prop]) {
                        suggestions.push(`Add '${prop}' for enhanced portfolio visibility`);
                    }
                });
            }
        }
        
        return suggestions;
    }

    /**
     * Optimize schemas for SEO
     */
    optimizeForSEO(schemas, industry) {
        return {
            richSnippets: this.identifyRichSnippetOpportunities(schemas),
            searchFeatures: this.identifySearchFeatures(schemas, industry),
            improvements: this.generateSEOImprovements(schemas),
            competitiveAdvantage: this.analyzeCompetitiveAdvantage(schemas, industry)
        };
    }

    /**
     * Generate schema preview
     */
    generatePreview(schemas) {
        return {
            googlePreview: this.generateGooglePreview(schemas),
            linkedinPreview: this.generateLinkedInPreview(schemas),
            twitterPreview: this.generateTwitterPreview(schemas),
            richSnippetPreview: this.generateRichSnippetPreview(schemas)
        };
    }

    /**
     * Integration with editor
     */
    integrateWithEditor(editor) {
        this.addSchemaPanel(editor);
        this.addSchemaPreview(editor);
        this.addValidationFeedback(editor);
    }

    /**
     * Add schema panel to editor
     */
    addSchemaPanel(editor) {
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            const schemaPanel = document.createElement('div');
            schemaPanel.className = 'schema-panel';
            schemaPanel.innerHTML = `
                <h3>📊 Schema.org Markup</h3>
                <div class="schema-controls">
                    <button class="btn btn-primary" onclick="schemaGenerator.generateSchemas()">Generate Schema</button>
                    <button class="btn btn-secondary" onclick="schemaGenerator.validateSchemas()">Validate</button>
                    <button class="btn btn-info" onclick="schemaGenerator.previewSchemas()">Preview</button>
                </div>
                <div id="schemaResults" class="schema-results"></div>
            `;
            
            editorContainer.appendChild(schemaPanel);
        }
    }

    /**
     * Main function to generate schemas from editor
     */
    async generateSchemas() {
        const editor = window.editorInstance;
        if (!editor) return;

        const content = editor.getValue ? editor.getValue() : editor.editor.getValue();
        const metadata = this.extractMetadataFromEditor();
        const profile = this.extractProfileFromContent(content, metadata);
        const pageType = this.detectPageType(metadata.path || metadata.slug);

        const schemaResult = await this.generateSchema(content, metadata, profile, pageType);
        this.displaySchemaResults(schemaResult);
    }

    /**
     * Display schema results in editor
     */
    displaySchemaResults(results) {
        const container = document.getElementById('schemaResults');
        if (!container) return;

        container.innerHTML = `
            <div class="schema-generation-results">
                <div class="validation-status ${results.validation.overall ? 'valid' : 'invalid'}">
                    <h4>Validation: ${results.validation.overall ? '✅ Valid' : '❌ Issues Found'}</h4>
                    ${results.validation.summary}
                </div>
                
                <div class="schema-formats">
                    <div class="format-tab">
                        <button onclick="schemaGenerator.showFormat('jsonld')">JSON-LD</button>
                        <button onclick="schemaGenerator.showFormat('microdata')">Microdata</button>
                        <button onclick="schemaGenerator.showFormat('rdfa')">RDFa</button>
                    </div>
                    
                    <div id="jsonld-content" class="format-content">
                        <pre><code>${this.escapeHTML(results.jsonLD)}</code></pre>
                    </div>
                    
                    <div id="microdata-content" class="format-content" style="display:none;">
                        <pre><code>${this.escapeHTML(results.microdata)}</code></pre>
                    </div>
                    
                    <div id="rdfa-content" class="format-content" style="display:none;">
                        <pre><code>${this.escapeHTML(results.rdfa)}</code></pre>
                    </div>
                </div>
                
                <div class="seo-optimization">
                    <h4>SEO Optimization</h4>
                    <div class="optimization-score">Score: ${this.calculateSchemaScore(results)}/100</div>
                    <ul class="improvements">
                        ${results.optimization.improvements.map(imp => `<li>${imp}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-success" onclick="schemaGenerator.copyToClipboard('jsonld')">Copy JSON-LD</button>
                    <button class="btn btn-primary" onclick="schemaGenerator.insertIntoPage()">Insert into Page</button>
                    <button class="btn btn-info" onclick="schemaGenerator.testInGoogleTool()">Test in Google Tool</button>
                </div>
            </div>
        `;
    }

    // Utility methods
    detectIndustry(content, metadata) {
        const text = (typeof content === 'string' ? content : content.text || '').toLowerCase();
        if (text.includes('developer') || text.includes('programming')) return 'tech';
        if (text.includes('design') || text.includes('ui')) return 'design';
        if (text.includes('marketing') || text.includes('campaign')) return 'marketing';
        if (text.includes('teach') || text.includes('education')) return 'education';
        return 'general';
    }

    extractMetadataFromEditor() {
        return {
            title: document.getElementById('titleInput')?.value || '',
            description: document.getElementById('descriptionInput')?.value || '',
            tags: document.getElementById('tagsInput')?.value.split(',').map(t => t.trim()) || [],
            author: document.getElementById('authorInput')?.value || '',
            date: document.getElementById('dateInput')?.value || new Date().toISOString(),
            path: window.location.pathname
        };
    }

    escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#039;');
    }
}

// Export and make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchemaPortfolioGenerator;
}

window.SchemaPortfolioGenerator = SchemaPortfolioGenerator;
window.schemaGenerator = new SchemaPortfolioGenerator();