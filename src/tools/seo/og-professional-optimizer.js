/**
 * Open Graph Professional Optimizer
 * Optimizes Open Graph tags for professional portfolio sharing
 */

class OpenGraphProfessionalOptimizer {
    constructor() {
        this.ogTemplates = new Map();
        this.platformSpecifics = new Map();
        this.imageGenerators = new Map();
        this.socialMetrics = new Map();
        this.professionalFrameworks = new Map();
        
        this.initializeOGTemplates();
        this.initializePlatformSpecifics();
        this.initializeImageGenerators();
        this.loadSocialMetrics();
    }

    /**
     * Initialize Open Graph templates for different portfolio contexts
     */
    initializeOGTemplates() {
        // Portfolio Homepage Template
        this.ogTemplates.set('portfolio-home', {
            'og:type': 'website',
            'og:title': '{name} - {primary_role} Portfolio',
            'og:description': 'Professional portfolio of {name}, {primary_role} with {experience_years}+ years experience. Specializing in {specializations}. Available for {availability_type}.',
            'og:image': '{portfolio_preview_image}',
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': '{name} - Professional {primary_role} Portfolio',
            'og:site_name': '{name} Portfolio',
            'article:author': '{name}',
            'profile:first_name': '{first_name}',
            'profile:last_name': '{last_name}',
            'profile:username': '{username}'
        });

        // Individual Project Template
        this.ogTemplates.set('project-item', {
            'og:type': 'article',
            'og:title': '{project_name} - {project_type} by {name}',
            'og:description': '{project_description} Built with {technologies}. {project_outcome}',
            'og:image': '{project_featured_image}',
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': '{project_name} - {project_type} Screenshot',
            'article:author': '{name}',
            'article:published_time': '{project_date}',
            'article:section': '{project_category}',
            'article:tag': '{project_tags}'
        });

        // About/Bio Page Template
        this.ogTemplates.set('about-page', {
            'og:type': 'profile',
            'og:title': 'About {name} - {primary_role}',
            'og:description': 'Learn about {name}, {primary_role} based in {location}. {experience_summary} Passionate about {interests}.',
            'og:image': '{professional_headshot}',
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': '{name} - Professional Headshot',
            'profile:first_name': '{first_name}',
            'profile:last_name': '{last_name}',
            'profile:username': '{username}',
            'profile:gender': 'neutral'
        });

        // Services Page Template
        this.ogTemplates.set('services-page', {
            'og:type': 'website',
            'og:title': '{name} Professional Services - {service_categories}',
            'og:description': 'Professional {industry} services by {name}. Offering {services_list} with proven results. Get in touch for a consultation.',
            'og:image': '{services_overview_image}',
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': '{name} Professional Services Overview'
        });

        // Blog Post Template
        this.ogTemplates.set('blog-post', {
            'og:type': 'article',
            'og:title': '{post_title}',
            'og:description': '{post_excerpt}',
            'og:image': '{post_featured_image}',
            'og:image:width': '1200',
            'og:image:height': '630',
            'og:image:alt': '{post_title} - Featured Image',
            'article:author': '{name}',
            'article:published_time': '{post_date}',
            'article:modified_time': '{post_modified}',
            'article:section': '{post_category}',
            'article:tag': '{post_tags}'
        });
    }

    /**
     * Initialize platform-specific optimizations
     */
    initializePlatformSpecifics() {
        // LinkedIn Optimizations
        this.platformSpecifics.set('linkedin', {
            imageSize: { width: 1200, height: 627 },
            titleMaxLength: 60,
            descriptionMaxLength: 160,
            preferredTags: ['og:title', 'og:description', 'og:image', 'og:url'],
            professionalEmphasis: true,
            industryKeywords: true,
            achievementHighlights: true,
            customTags: {
                'linkedin:owner': true,
                'article:author': true,
                'profile:username': true
            }
        });

        // Twitter Optimizations
        this.platformSpecifics.set('twitter', {
            imageSize: { width: 1200, height: 630 },
            titleMaxLength: 55,
            descriptionMaxLength: 155,
            preferredTags: ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'],
            cardType: 'summary_large_image',
            hashtagSupport: true,
            mentionSupport: true
        });

        // Facebook Optimizations
        this.platformSpecifics.set('facebook', {
            imageSize: { width: 1200, height: 630 },
            titleMaxLength: 60,
            descriptionMaxLength: 160,
            preferredTags: ['og:title', 'og:description', 'og:image', 'og:type', 'og:url'],
            engagementOptimized: true,
            shareOptimized: true
        });

        // Slack Optimizations
        this.platformSpecifics.set('slack', {
            imageSize: { width: 1200, height: 630 },
            titleMaxLength: 50,
            descriptionMaxLength: 150,
            professionalTone: true,
            quickPreview: true
        });

        // WhatsApp/Telegram Optimizations
        this.platformSpecifics.set('messaging', {
            imageSize: { width: 800, height: 418 },
            titleMaxLength: 45,
            descriptionMaxLength: 120,
            mobileOptimized: true,
            quickLoad: true
        });
    }

    /**
     * Initialize image generation templates
     */
    initializeImageGenerators() {
        // Portfolio Preview Image
        this.imageGenerators.set('portfolio-preview', {
            template: 'professional-grid',
            elements: {
                background: 'gradient-professional',
                profilePhoto: { position: 'left', size: 'medium', style: 'rounded' },
                name: { font: 'bold-sans', size: 'large', color: 'primary' },
                title: { font: 'regular-sans', size: 'medium', color: 'secondary' },
                projectThumbnails: { count: 3, layout: 'grid', position: 'right' },
                brandColors: true,
                logo: { position: 'bottom-right', size: 'small' }
            },
            dimensions: { width: 1200, height: 630 },
            format: 'PNG',
            quality: 'high'
        });

        // Project Showcase Image
        this.imageGenerators.set('project-showcase', {
            template: 'project-hero',
            elements: {
                background: 'project-screenshot',
                overlay: 'dark-gradient',
                projectName: { font: 'bold-sans', size: 'large', color: 'white' },
                techStack: { font: 'mono', size: 'small', color: 'accent' },
                authorCredit: { font: 'regular-sans', size: 'small', color: 'light' },
                logo: { position: 'top-right', size: 'small' }
            },
            dimensions: { width: 1200, height: 630 },
            format: 'PNG',
            quality: 'high'
        });

        // Professional Headshot Card
        this.imageGenerators.set('professional-card', {
            template: 'business-card',
            elements: {
                background: 'solid-professional',
                profilePhoto: { position: 'center', size: 'large', style: 'rounded' },
                name: { font: 'bold-serif', size: 'large', color: 'primary' },
                title: { font: 'regular-sans', size: 'medium', color: 'secondary' },
                location: { font: 'regular-sans', size: 'small', color: 'tertiary' },
                contactInfo: { font: 'mono', size: 'small', color: 'accent' }
            },
            dimensions: { width: 1200, height: 630 },
            format: 'PNG',
            quality: 'high'
        });

        // Services Overview
        this.imageGenerators.set('services-overview', {
            template: 'services-grid',
            elements: {
                background: 'gradient-business',
                serviceIcons: { count: 4, layout: 'grid', style: 'professional' },
                mainHeading: { font: 'bold-sans', size: 'large', color: 'primary' },
                subheading: { font: 'regular-sans', size: 'medium', color: 'secondary' },
                ctaButton: { style: 'professional', color: 'accent' },
                brandElements: true
            },
            dimensions: { width: 1200, height: 630 },
            format: 'PNG',
            quality: 'high'
        });
    }

    /**
     * Load social media metrics and best practices
     */
    loadSocialMetrics() {
        this.socialMetrics.set('engagement-factors', {
            imagePresence: { impact: 0.3, description: 'Posts with images get 2.3x more engagement' },
            titleLength: { optimal: '40-60', impact: 0.2, description: 'Optimal title length for readability' },
            descriptionLength: { optimal: '120-160', impact: 0.15, description: 'Full description visibility' },
            professionalTerms: { impact: 0.1, description: 'Industry-specific terminology increases credibility' },
            callToAction: { impact: 0.15, description: 'Clear CTA improves click-through rates' },
            personalBranding: { impact: 0.1, description: 'Consistent personal brand recognition' }
        });

        this.socialMetrics.set('platform-preferences', {
            linkedin: {
                contentTypes: ['case studies', 'professional insights', 'industry news'],
                tonePreference: 'professional-authoritative',
                hashtagOptimal: 3,
                postingTimes: ['Tuesday-Thursday 8-10 AM', 'Tuesday-Thursday 12-2 PM']
            },
            twitter: {
                contentTypes: ['quick insights', 'project updates', 'industry thoughts'],
                tonePreference: 'conversational-professional',
                hashtagOptimal: 2,
                characterLimit: 280
            },
            facebook: {
                contentTypes: ['behind-the-scenes', 'success stories', 'team updates'],
                tonePreference: 'friendly-professional',
                visualEmphasis: true
            }
        });
    }

    /**
     * Generate optimized Open Graph tags for professional portfolio
     */
    async generateProfessionalOG(content, metadata, profile, pageType, targetPlatforms = ['linkedin', 'twitter', 'facebook']) {
        const template = this.ogTemplates.get(pageType) || this.ogTemplates.get('portfolio-home');
        const optimizations = [];
        
        for (const platform of targetPlatforms) {
            const platformConfig = this.platformSpecifics.get(platform);
            const optimizedTags = await this.optimizeForPlatform(template, content, metadata, profile, platform, platformConfig);
            
            optimizations.push({
                platform,
                tags: optimizedTags,
                score: this.calculatePlatformScore(optimizedTags, platformConfig),
                recommendations: this.generatePlatformRecommendations(optimizedTags, platformConfig),
                preview: this.generateSocialPreview(optimizedTags, platform)
            });
        }
        
        return {
            optimizations,
            universalTags: this.generateUniversalTags(template, content, metadata, profile),
            imageGeneration: await this.generateOptimalImages(content, metadata, profile, pageType),
            validationResults: await this.validateOGTags(optimizations),
            performancePredictions: this.predictSocialPerformance(optimizations),
            implementationCode: this.generateImplementationCode(optimizations)
        };
    }

    /**
     * Optimize tags for specific platform
     */
    async optimizeForPlatform(template, content, metadata, profile, platform, platformConfig) {
        const optimizedTags = { ...template };
        
        // Interpolate template variables
        for (const [key, value] of Object.entries(optimizedTags)) {
            if (typeof value === 'string') {
                optimizedTags[key] = this.interpolateTemplate(value, profile, metadata, content);
            }
        }
        
        // Apply platform-specific optimizations
        if (platformConfig) {
            // Optimize title length
            if (optimizedTags['og:title'] && optimizedTags['og:title'].length > platformConfig.titleMaxLength) {
                optimizedTags['og:title'] = this.truncateTitle(optimizedTags['og:title'], platformConfig.titleMaxLength);
            }
            
            // Optimize description length
            if (optimizedTags['og:description'] && optimizedTags['og:description'].length > platformConfig.descriptionMaxLength) {
                optimizedTags['og:description'] = this.truncateDescription(optimizedTags['og:description'], platformConfig.descriptionMaxLength);
            }
            
            // Add platform-specific tags
            if (platform === 'twitter') {
                optimizedTags['twitter:card'] = platformConfig.cardType;
                optimizedTags['twitter:title'] = optimizedTags['og:title'];
                optimizedTags['twitter:description'] = optimizedTags['og:description'];
                optimizedTags['twitter:image'] = optimizedTags['og:image'];
                optimizedTags['twitter:creator'] = this.generateTwitterHandle(profile.name);
            }
            
            // Add LinkedIn-specific enhancements
            if (platform === 'linkedin' && platformConfig.professionalEmphasis) {
                optimizedTags = this.enhanceForLinkedIn(optimizedTags, profile, content);
            }
            
            // Add professional industry keywords
            if (platformConfig.industryKeywords) {
                optimizedTags = this.addIndustryKeywords(optimizedTags, profile, content);
            }
        }
        
        return optimizedTags;
    }

    /**
     * Enhance tags specifically for LinkedIn
     */
    enhanceForLinkedIn(tags, profile, content) {
        const enhanced = { ...tags };
        
        // Add LinkedIn-specific professional elements
        enhanced['linkedin:owner'] = this.generateLinkedInProfile(profile.name);
        
        // Enhance description with professional achievements
        if (profile.achievements && profile.achievements.length > 0) {
            const achievement = profile.achievements[0];
            enhanced['og:description'] += ` ${achievement}`;
        }
        
        // Add industry-specific professional terminology
        const industry = this.detectIndustry(content);
        const industryTerms = this.getIndustryTerminology(industry);
        
        if (industryTerms.length > 0) {
            enhanced['article:tag'] = (enhanced['article:tag'] || '') + ', ' + industryTerms.slice(0, 3).join(', ');
        }
        
        return enhanced;
    }

    /**
     * Generate optimal images for social sharing
     */
    async generateOptimalImages(content, metadata, profile, pageType) {
        const imageRecommendations = [];
        
        // Determine which image generators to use
        const generators = [];
        
        switch (pageType) {
            case 'portfolio-home':
                generators.push('portfolio-preview', 'professional-card');
                break;
            case 'project-item':
                generators.push('project-showcase');
                break;
            case 'about-page':
                generators.push('professional-card');
                break;
            case 'services-page':
                generators.push('services-overview');
                break;
            default:
                generators.push('portfolio-preview');
        }
        
        for (const generatorName of generators) {
            const generator = this.imageGenerators.get(generatorName);
            if (generator) {
                imageRecommendations.push({
                    type: generatorName,
                    template: generator.template,
                    specifications: {
                        dimensions: generator.dimensions,
                        elements: this.customizeImageElements(generator.elements, profile, content),
                        format: generator.format,
                        quality: generator.quality
                    },
                    generationPrompt: this.generateImagePrompt(generator, profile, content),
                    alternatives: this.generateImageAlternatives(generator, profile)
                });
            }
        }
        
        return {
            recommendations: imageRecommendations,
            currentImages: this.extractCurrentImages(content, metadata),
            optimization: this.analyzeImageOptimization(imageRecommendations),
            tools: this.recommendImageTools()
        };
    }

    /**
     * Generate implementation code for all platforms
     */
    generateImplementationCode(optimizations) {
        let htmlTags = '<!-- Professional Portfolio Open Graph Tags -->\n';
        let reactComponents = '';
        let nextjsHead = '';
        
        // Generate universal tags first
        const universalTags = this.mergeUniversalTags(optimizations);
        
        // HTML meta tags
        for (const [property, content] of Object.entries(universalTags)) {
            if (property.startsWith('og:') || property.startsWith('twitter:') || property.startsWith('article:')) {
                htmlTags += `<meta property="${property}" content="${this.escapeHTML(content)}" />\n`;
            } else {
                htmlTags += `<meta name="${property}" content="${this.escapeHTML(content)}" />\n`;
            }
        }
        
        // React/Next.js components
        reactComponents = `
// React component for Open Graph tags
const ProfessionalOGTags = ({ pageData }) => (
  <>
${Object.entries(universalTags).map(([property, content]) => 
    `    <meta property="${property}" content={pageData.${this.toCamelCase(property)}} />`
).join('\n')}
  </>
);
`;
        
        // Next.js Head component
        nextjsHead = `
// Next.js Head component
import Head from 'next/head';

const ProfessionalHead = ({ pageData }) => (
  <Head>
${Object.entries(universalTags).map(([property, content]) => 
    `    <meta property="${property}" content={pageData.${this.toCamelCase(property)}} />`
).join('\n')}
  </Head>
);
`;
        
        return {
            html: htmlTags,
            react: reactComponents,
            nextjs: nextjsHead,
            hugo: this.generateHugoTemplate(universalTags),
            json: JSON.stringify(universalTags, null, 2)
        };
    }

    /**
     * Calculate optimization score for platform
     */
    calculatePlatformScore(tags, platformConfig) {
        let score = 0;
        const maxScore = 100;
        
        // Essential tags present (40 points)
        const essentialTags = ['og:title', 'og:description', 'og:image', 'og:url'];
        const presentEssential = essentialTags.filter(tag => tags[tag]).length;
        score += (presentEssential / essentialTags.length) * 40;
        
        // Optimal lengths (30 points)
        if (tags['og:title']) {
            const titleLength = tags['og:title'].length;
            if (titleLength >= 30 && titleLength <= (platformConfig?.titleMaxLength || 60)) {
                score += 15;
            }
        }
        
        if (tags['og:description']) {
            const descLength = tags['og:description'].length;
            if (descLength >= 120 && descLength <= (platformConfig?.descriptionMaxLength || 160)) {
                score += 15;
            }
        }
        
        // Image optimization (20 points)
        if (tags['og:image']) {
            score += 10;
            if (tags['og:image:width'] && tags['og:image:height']) {
                score += 5;
            }
            if (tags['og:image:alt']) {
                score += 5;
            }
        }
        
        // Professional elements (10 points)
        if (tags['article:author'] || tags['profile:username']) {
            score += 5;
        }
        if (tags['article:section'] || tags['article:tag']) {
            score += 5;
        }
        
        return Math.round(score);
    }

    /**
     * Predict social media performance
     */
    predictSocialPerformance(optimizations) {
        const predictions = [];
        
        for (const optimization of optimizations) {
            const platformMetrics = this.socialMetrics.get('platform-preferences')?.get(optimization.platform);
            const engagementFactors = this.socialMetrics.get('engagement-factors');
            
            let engagementScore = 0;
            
            // Image presence boost
            if (optimization.tags['og:image']) {
                engagementScore += engagementFactors.imagePresence.impact * 100;
            }
            
            // Title optimization
            const titleLength = optimization.tags['og:title']?.length || 0;
            if (titleLength >= 40 && titleLength <= 60) {
                engagementScore += engagementFactors.titleLength.impact * 100;
            }
            
            // Description optimization
            const descLength = optimization.tags['og:description']?.length || 0;
            if (descLength >= 120 && descLength <= 160) {
                engagementScore += engagementFactors.descriptionLength.impact * 100;
            }
            
            // Professional terms
            if (this.containsProfessionalTerms(optimization.tags['og:description'])) {
                engagementScore += engagementFactors.professionalTerms.impact * 100;
            }
            
            predictions.push({
                platform: optimization.platform,
                engagementScore: Math.round(engagementScore),
                expectedPerformance: this.categorizePerformance(engagementScore),
                recommendations: this.generatePerformanceRecommendations(engagementScore, optimization.platform)
            });
        }
        
        return predictions;
    }

    /**
     * Validate Open Graph tags
     */
    async validateOGTags(optimizations) {
        const validation = {
            overall: true,
            platformResults: [],
            commonIssues: [],
            recommendations: []
        };
        
        for (const optimization of optimizations) {
            const platformValidation = {
                platform: optimization.platform,
                valid: true,
                errors: [],
                warnings: []
            };
            
            // Validate required tags
            const required = ['og:title', 'og:description', 'og:image', 'og:url'];
            for (const tag of required) {
                if (!optimization.tags[tag]) {
                    platformValidation.errors.push(`Missing required tag: ${tag}`);
                    platformValidation.valid = false;
                }
            }
            
            // Validate image dimensions
            if (optimization.tags['og:image:width'] && optimization.tags['og:image:height']) {
                const width = parseInt(optimization.tags['og:image:width']);
                const height = parseInt(optimization.tags['og:image:height']);
                
                if (width < 1200 || height < 630) {
                    platformValidation.warnings.push('Image dimensions below recommended size (1200x630)');
                }
            }
            
            // Validate URLs
            if (optimization.tags['og:url'] && !this.isValidURL(optimization.tags['og:url'])) {
                platformValidation.errors.push('Invalid URL format');
                platformValidation.valid = false;
            }
            
            validation.platformResults.push(platformValidation);
            
            if (!platformValidation.valid) {
                validation.overall = false;
            }
        }
        
        return validation;
    }

    /**
     * Integration with existing editor
     */
    integrateWithEditor(editor) {
        this.addOGPanel(editor);
        this.addSocialPreview(editor);
        this.addImageGenerator(editor);
    }

    /**
     * Add Open Graph panel to editor
     */
    addOGPanel(editor) {
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            const ogPanel = document.createElement('div');
            ogPanel.className = 'og-optimization-panel';
            ogPanel.innerHTML = `
                <h3>📱 Social Media Optimization</h3>
                <div class="platform-selector">
                    <label><input type="checkbox" value="linkedin" checked> LinkedIn</label>
                    <label><input type="checkbox" value="twitter" checked> Twitter</label>
                    <label><input type="checkbox" value="facebook" checked> Facebook</label>
                    <label><input type="checkbox" value="slack"> Slack</label>
                </div>
                <div class="og-controls">
                    <button class="btn btn-primary" onclick="ogOptimizer.generateOGTags()">Generate Tags</button>
                    <button class="btn btn-secondary" onclick="ogOptimizer.previewSocial()">Preview</button>
                    <button class="btn btn-info" onclick="ogOptimizer.generateImages()">Generate Images</button>
                </div>
                <div id="ogResults" class="og-results"></div>
            `;
            
            editorContainer.appendChild(ogPanel);
        }
    }

    /**
     * Main function to generate OG tags from editor
     */
    async generateOGTags() {
        const editor = window.editorInstance;
        if (!editor) return;

        const content = editor.getValue ? editor.getValue() : editor.editor.getValue();
        const metadata = this.extractMetadataFromEditor();
        const profile = this.extractProfileFromContent(content, metadata);
        const pageType = this.detectPageType(metadata.path || metadata.slug);
        
        const selectedPlatforms = Array.from(document.querySelectorAll('.platform-selector input:checked'))
            .map(input => input.value);

        const ogResult = await this.generateProfessionalOG(content, metadata, profile, pageType, selectedPlatforms);
        this.displayOGResults(ogResult);
    }

    /**
     * Display OG optimization results
     */
    displayOGResults(results) {
        const container = document.getElementById('ogResults');
        if (!container) return;

        container.innerHTML = `
            <div class="og-optimization-results">
                <div class="platform-tabs">
                    ${results.optimizations.map((opt, index) => 
                        `<button class="tab-btn ${index === 0 ? 'active' : ''}" onclick="ogOptimizer.showPlatform('${opt.platform}')">
                            ${opt.platform.charAt(0).toUpperCase() + opt.platform.slice(1)} (${opt.score}/100)
                        </button>`
                    ).join('')}
                </div>
                
                ${results.optimizations.map((opt, index) => `
                    <div id="${opt.platform}-content" class="platform-content ${index === 0 ? 'active' : ''}">
                        <div class="optimization-score">
                            <h4>${opt.platform.charAt(0).toUpperCase() + opt.platform.slice(1)} Optimization: ${opt.score}/100</h4>
                        </div>
                        
                        <div class="og-tags">
                            <h5>Generated Tags:</h5>
                            <pre><code>${this.formatTagsForDisplay(opt.tags)}</code></pre>
                        </div>
                        
                        <div class="social-preview">
                            <h5>Preview:</h5>
                            ${this.renderSocialPreview(opt.preview, opt.platform)}
                        </div>
                        
                        <div class="recommendations">
                            <h5>Recommendations:</h5>
                            <ul>
                                ${opt.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
                
                <div class="image-generation">
                    <h4>Image Recommendations:</h4>
                    ${results.imageGeneration.recommendations.map(img => `
                        <div class="image-rec">
                            <strong>${img.type}</strong>
                            <p>Dimensions: ${img.specifications.dimensions.width}x${img.specifications.dimensions.height}</p>
                            <p>Template: ${img.template}</p>
                        </div>
                    `).join('')}
                </div>
                
                <div class="implementation-code">
                    <h4>Implementation:</h4>
                    <div class="code-tabs">
                        <button onclick="ogOptimizer.showCode('html')">HTML</button>
                        <button onclick="ogOptimizer.showCode('react')">React</button>
                        <button onclick="ogOptimizer.showCode('hugo')">Hugo</button>
                    </div>
                    <div id="code-content">
                        <pre><code>${this.escapeHTML(results.implementationCode.html)}</code></pre>
                    </div>
                </div>
            </div>
        `;
    }

    // Utility methods
    interpolateTemplate(template, profile, metadata, content) {
        return template
            .replace(/\{name\}/g, profile.name || 'Professional')
            .replace(/\{primary_role\}/g, profile.primaryRole || 'Professional')
            .replace(/\{first_name\}/g, this.extractFirstName(profile.name))
            .replace(/\{last_name\}/g, this.extractLastName(profile.name))
            .replace(/\{username\}/g, this.generateUsername(profile.name))
            .replace(/\{location\}/g, profile.location || '')
            .replace(/\{experience_years\}/g, this.extractYearsOfExperience(profile.experience))
            .replace(/\{specializations\}/g, profile.skills?.slice(0, 3).join(', ') || '')
            .replace(/\{availability_type\}/g, profile.availability || 'new opportunities')
            .replace(/\{project_name\}/g, metadata.title || 'Project')
            .replace(/\{project_description\}/g, metadata.description || '')
            .replace(/\{technologies\}/g, this.extractTechnologies(content).join(', '))
            .replace(/\{post_title\}/g, metadata.title || '')
            .replace(/\{post_excerpt\}/g, metadata.description || this.generateExcerpt(content));
    }

    extractMetadataFromEditor() {
        return {
            title: document.getElementById('titleInput')?.value || '',
            description: document.getElementById('descriptionInput')?.value || '',
            tags: document.getElementById('tagsInput')?.value.split(',').map(t => t.trim()) || [],
            path: window.location.pathname
        };
    }

    escapeHTML(str) {
        return str.replace(/[&<>"']/g, (match) => {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
            return escapeMap[match];
        });
    }

    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }
}

// Export and make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenGraphProfessionalOptimizer;
}

window.OpenGraphProfessionalOptimizer = OpenGraphProfessionalOptimizer;
window.ogOptimizer = new OpenGraphProfessionalOptimizer();