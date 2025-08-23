/**
 * Portfolio Meta Tag Optimizer
 * Professional-focused meta tag optimization for portfolio sites
 * Integrates with existing content editor
 */

class PortfolioMetaOptimizer {
    constructor() {
        this.industryKeywords = new Map();
        this.professionalTemplates = new Map();
        this.competitorAnalysis = new Map();
        this.loadIndustryData();
        this.initializeTemplates();
    }

    /**
     * Load industry-specific keyword data
     */
    loadIndustryData() {
        // Tech/Software Development
        this.industryKeywords.set('tech', {
            primary: ['software developer', 'full stack developer', 'web developer', 'programmer', 'engineer'],
            secondary: ['javascript', 'react', 'node.js', 'python', 'typescript', 'api', 'database'],
            skills: ['frontend', 'backend', 'devops', 'mobile', 'cloud', 'ai', 'machine learning'],
            actions: ['build', 'develop', 'create', 'design', 'implement', 'optimize', 'deploy']
        });
        
        // Design/Creative
        this.industryKeywords.set('design', {
            primary: ['ui designer', 'ux designer', 'graphic designer', 'product designer', 'creative director'],
            secondary: ['figma', 'sketch', 'adobe', 'prototype', 'wireframe', 'branding', 'visual'],
            skills: ['user experience', 'user interface', 'design thinking', 'typography', 'color theory'],
            actions: ['design', 'create', 'conceptualize', 'visualize', 'prototype', 'iterate']
        });
        
        // Marketing/Business
        this.industryKeywords.set('marketing', {
            primary: ['digital marketer', 'content creator', 'seo specialist', 'marketing manager'],
            secondary: ['campaigns', 'analytics', 'conversion', 'roi', 'engagement', 'strategy'],
            skills: ['seo', 'sem', 'social media', 'content marketing', 'email marketing'],
            actions: ['grow', 'increase', 'optimize', 'analyze', 'strategize', 'execute']
        });
        
        // Education/Training
        this.industryKeywords.set('education', {
            primary: ['educator', 'teacher', 'trainer', 'instructional designer', 'curriculum developer'],
            secondary: ['learning', 'pedagogy', 'assessment', 'curriculum', 'e-learning', 'training'],
            skills: ['lesson planning', 'student engagement', 'educational technology', 'assessment'],
            actions: ['teach', 'educate', 'train', 'develop', 'assess', 'mentor', 'guide']
        });
    }

    /**
     * Initialize professional meta templates
     */
    initializeTemplates() {
        this.professionalTemplates.set('portfolio-home', {
            title: '{name} - {primary_role} | Portfolio & Professional Work',
            description: 'Professional portfolio of {name}, {primary_role} specializing in {specializations}. View my work, experience, and achievements in {industry}.',
            keywords: ['{primary_role}', '{name}', 'portfolio', 'professional', '{industry}', '{location}']
        });
        
        this.professionalTemplates.set('about', {
            title: 'About {name} - {primary_role} & {secondary_role}',
            description: 'Learn about {name}, a {experience_level} {primary_role} with expertise in {key_skills}. Discover my background, experience, and professional journey.',
            keywords: ['about', '{name}', '{primary_role}', 'experience', 'background', '{industry}']
        });
        
        this.professionalTemplates.set('work-portfolio', {
            title: '{name} Work Portfolio - {primary_role} Projects & Case Studies',
            description: 'Explore professional work by {name}, featuring {project_types} and demonstrating expertise in {technologies}. Each project includes detailed case studies.',
            keywords: ['work', 'portfolio', 'projects', '{primary_role}', 'case studies', '{technologies}']
        });
        
        this.professionalTemplates.set('services', {
            title: '{name} Professional Services - {service_types}',
            description: 'Professional {industry} services by {name}. Offering {service_types} with {experience_years}+ years of experience. Contact for consultation.',
            keywords: ['services', '{service_types}', '{primary_role}', 'consulting', 'professional', '{location}']
        });
        
        this.professionalTemplates.set('contact', {
            title: 'Contact {name} - {primary_role} Available for {availability_type}',
            description: 'Get in touch with {name}, {primary_role} based in {location}. Available for {availability_type}. Let\'s discuss your {industry} needs.',
            keywords: ['contact', '{name}', '{primary_role}', '{availability_type}', '{location}', 'hire']
        });
    }

    /**
     * Optimize meta tags for portfolio content
     */
    async optimizeMeta(content, metadata) {
        const profile = this.detectProfessionalProfile(content, metadata);
        const industry = this.detectIndustry(content, metadata);
        const pageType = this.detectPageType(metadata.path || metadata.slug);
        
        const optimizedMeta = {
            title: await this.optimizeTitle(content, metadata, profile, industry, pageType),
            description: await this.optimizeDescription(content, metadata, profile, industry, pageType),
            keywords: await this.optimizeKeywords(content, metadata, profile, industry),
            ogTags: await this.optimizeOpenGraph(content, metadata, profile, industry),
            twitterTags: await this.optimizeTwitter(content, metadata, profile, industry),
            linkedinTags: await this.optimizeLinkedIn(content, metadata, profile, industry),
            structuredData: await this.generateStructuredData(content, metadata, profile, industry),
            professionalScore: this.calculateProfessionalScore(content, metadata, profile)
        };
        
        return optimizedMeta;
    }

    /**
     * Detect professional profile from content
     */
    detectProfessionalProfile(content, metadata) {
        const text = this.extractText(content);
        const profile = {
            name: this.extractName(metadata, text),
            primaryRole: this.extractPrimaryRole(text, metadata),
            secondaryRole: this.extractSecondaryRole(text, metadata),
            experience: this.extractExperience(text),
            location: this.extractLocation(text, metadata),
            skills: this.extractSkills(text),
            specializations: this.extractSpecializations(text),
            availability: this.extractAvailability(text, metadata)
        };
        
        return profile;
    }

    /**
     * Detect industry from content and metadata
     */
    detectIndustry(content, metadata) {
        const text = this.extractText(content).toLowerCase();
        const tags = (metadata.tags || []).map(tag => tag.toLowerCase());
        const category = (metadata.category || '').toLowerCase();
        
        let industryScores = new Map();
        
        // Score industries based on keyword presence
        for (let [industry, keywords] of this.industryKeywords) {
            let score = 0;
            
            // Check primary keywords
            keywords.primary.forEach(keyword => {
                if (text.includes(keyword) || tags.includes(keyword)) score += 3;
            });
            
            // Check secondary keywords  
            keywords.secondary.forEach(keyword => {
                if (text.includes(keyword) || tags.includes(keyword)) score += 2;
            });
            
            // Check skills
            keywords.skills.forEach(skill => {
                if (text.includes(skill) || tags.includes(skill)) score += 1;
            });
            
            industryScores.set(industry, score);
        }
        
        // Return highest scoring industry
        return Array.from(industryScores.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
    }

    /**
     * Detect page type from path/slug
     */
    detectPageType(pathOrSlug) {
        if (!pathOrSlug) return 'general';
        
        const path = pathOrSlug.toLowerCase();
        
        if (path.includes('about') || path.includes('me')) return 'about';
        if (path.includes('work') || path.includes('portfolio') || path.includes('projects')) return 'work-portfolio';
        if (path.includes('service') || path.includes('consulting')) return 'services';
        if (path.includes('contact') || path.includes('hire')) return 'contact';
        if (path === '' || path === 'index' || path === 'home') return 'portfolio-home';
        
        return 'general';
    }

    /**
     * Optimize title with professional focus
     */
    async optimizeTitle(content, metadata, profile, industry, pageType) {
        const currentTitle = metadata.title || '';
        const template = this.professionalTemplates.get(pageType) || this.professionalTemplates.get('general');
        
        if (template) {
            let optimizedTitle = this.interpolateTemplate(template.title, profile, industry);
            
            // Ensure title length is optimal (50-60 characters)
            if (optimizedTitle.length > 60) {
                optimizedTitle = this.truncateTitle(optimizedTitle, profile);
            }
            
            return {
                current: currentTitle,
                optimized: optimizedTitle,
                improvements: this.getTitleImprovements(currentTitle, optimizedTitle),
                professionalScore: this.scoreTitleProfessionalism(optimizedTitle, industry)
            };
        }
        
        return {
            current: currentTitle,
            optimized: currentTitle,
            improvements: [],
            professionalScore: this.scoreTitleProfessionalism(currentTitle, industry)
        };
    }

    /**
     * Optimize description with professional focus
     */
    async optimizeDescription(content, metadata, profile, industry, pageType) {
        const currentDescription = metadata.description || '';
        const template = this.professionalTemplates.get(pageType);
        
        let optimizedDescription = currentDescription;
        
        if (template) {
            optimizedDescription = this.interpolateTemplate(template.description, profile, industry);
        } else {
            // Generate description from content
            optimizedDescription = this.generateDescriptionFromContent(content, profile, industry);
        }
        
        // Ensure optimal length (150-160 characters)
        if (optimizedDescription.length > 160) {
            optimizedDescription = this.truncateDescription(optimizedDescription);
        }
        
        return {
            current: currentDescription,
            optimized: optimizedDescription,
            improvements: this.getDescriptionImprovements(currentDescription, optimizedDescription),
            professionalScore: this.scoreDescriptionProfessionalism(optimizedDescription, industry),
            callToAction: this.suggestCallToAction(pageType, industry)
        };
    }

    /**
     * Optimize keywords for professional visibility
     */
    async optimizeKeywords(content, metadata, profile, industry) {
        const currentKeywords = metadata.keywords || metadata.tags || [];
        const text = this.extractText(content);
        
        // Get industry-specific keywords
        const industryKeywords = this.industryKeywords.get(industry) || { primary: [], secondary: [], skills: [] };
        
        // Extract content-based keywords
        const contentKeywords = this.extractKeywordsFromContent(text);
        
        // Combine and prioritize
        const optimizedKeywords = [
            ...this.prioritizeKeywords(industryKeywords.primary, text),
            ...this.prioritizeKeywords(industryKeywords.secondary, text),
            ...this.prioritizeKeywords(contentKeywords, text),
            ...this.getLocationKeywords(profile.location),
            ...this.getExperienceKeywords(profile.experience),
            profile.name.toLowerCase()
        ].filter((keyword, index, array) => 
            keyword && array.indexOf(keyword) === index // Remove duplicates
        ).slice(0, 15); // Limit to 15 keywords
        
        return {
            current: currentKeywords,
            optimized: optimizedKeywords,
            improvements: this.getKeywordImprovements(currentKeywords, optimizedKeywords),
            professionalRelevance: this.scoreKeywordRelevance(optimizedKeywords, industry),
            searchVolumeEstimate: await this.estimateSearchVolume(optimizedKeywords)
        };
    }

    /**
     * Optimize Open Graph tags for professional sharing
     */
    async optimizeOpenGraph(content, metadata, profile, industry) {
        const optimizedTitle = await this.optimizeTitle(content, metadata, profile, industry, this.detectPageType(metadata.path));
        const optimizedDescription = await this.optimizeDescription(content, metadata, profile, industry, this.detectPageType(metadata.path));
        
        return {
            'og:type': metadata.path === '/' || metadata.path === '/index' ? 'website' : 'article',
            'og:title': optimizedTitle.optimized,
            'og:description': optimizedDescription.optimized,
            'og:image': this.generateProfessionalOGImage(profile, industry),
            'og:url': metadata.url || '',
            'og:site_name': `${profile.name} - Professional Portfolio`,
            'article:author': profile.name,
            'article:section': this.getArticleSection(industry),
            'profile:first_name': this.extractFirstName(profile.name),
            'profile:last_name': this.extractLastName(profile.name),
            'profile:username': this.generateUsername(profile.name)
        };
    }

    /**
     * Optimize Twitter tags for professional visibility
     */
    async optimizeTwitter(content, metadata, profile, industry) {
        const optimizedTitle = await this.optimizeTitle(content, metadata, profile, industry, this.detectPageType(metadata.path));
        const optimizedDescription = await this.optimizeDescription(content, metadata, profile, industry, this.detectPageType(metadata.path));
        
        return {
            'twitter:card': 'summary_large_image',
            'twitter:title': optimizedTitle.optimized,
            'twitter:description': optimizedDescription.optimized,
            'twitter:image': this.generateProfessionalTwitterImage(profile, industry),
            'twitter:creator': this.generateTwitterHandle(profile.name),
            'twitter:site': this.generateTwitterHandle(profile.name)
        };
    }

    /**
     * Optimize LinkedIn-specific tags
     */
    async optimizeLinkedIn(content, metadata, profile, industry) {
        return {
            'linkedin:owner': this.generateLinkedInProfile(profile.name),
            'article:author': profile.name,
            'article:tag': this.getLinkedInTags(industry, profile),
            'og:type': 'article',
            'professional:industry': industry,
            'professional:experience_level': this.categorizeExperience(profile.experience),
            'professional:skills': profile.skills.slice(0, 10).join(', ')
        };
    }

    /**
     * Generate structured data for portfolio
     */
    async generateStructuredData(content, metadata, profile, industry) {
        const baseStructure = {
            '@context': 'https://schema.org',
            '@type': 'Person',
            'name': profile.name,
            'url': metadata.url || '',
            'jobTitle': profile.primaryRole,
            'worksFor': {
                '@type': 'Organization',
                'name': 'Freelance' // Could be dynamic
            },
            'knowsAbout': profile.skills,
            'hasOccupation': {
                '@type': 'Occupation',
                'name': profile.primaryRole,
                'occupationLocation': {
                    '@type': 'Place',
                    'name': profile.location
                },
                'skills': profile.skills.join(', '),
                'experienceRequirements': this.categorizeExperience(profile.experience)
            }
        };

        // Add portfolio-specific structured data
        if (this.detectPageType(metadata.path) === 'work-portfolio') {
            baseStructure['@type'] = ['Person', 'CreativeWork'];
            baseStructure['about'] = {
                '@type': 'CreativeWork',
                'name': 'Professional Portfolio',
                'description': `Portfolio showcasing ${profile.primaryRole} work and expertise`,
                'creator': {
                    '@type': 'Person',
                    'name': profile.name
                }
            };
        }

        return baseStructure;
    }

    /**
     * Calculate professional optimization score
     */
    calculateProfessionalScore(content, metadata, profile) {
        let score = 0;
        const factors = [];

        // Name presence (20 points)
        if (profile.name) {
            score += 20;
            factors.push({ factor: 'Professional name identified', points: 20, status: 'good' });
        }

        // Primary role clarity (20 points)
        if (profile.primaryRole) {
            score += 20;
            factors.push({ factor: 'Clear professional role', points: 20, status: 'good' });
        }

        // Skills mentioned (15 points)
        if (profile.skills.length >= 3) {
            score += 15;
            factors.push({ factor: 'Relevant skills highlighted', points: 15, status: 'good' });
        } else if (profile.skills.length > 0) {
            score += 8;
            factors.push({ factor: 'Some skills mentioned', points: 8, status: 'average' });
        }

        // Experience indicated (15 points)
        if (profile.experience) {
            score += 15;
            factors.push({ factor: 'Experience level indicated', points: 15, status: 'good' });
        }

        // Location specified (10 points)
        if (profile.location) {
            score += 10;
            factors.push({ factor: 'Professional location specified', points: 10, status: 'good' });
        }

        // Industry focus (10 points)
        const industry = this.detectIndustry(content, metadata);
        if (industry !== 'general') {
            score += 10;
            factors.push({ factor: 'Clear industry focus', points: 10, status: 'good' });
        }

        // Professional availability (10 points)
        if (profile.availability) {
            score += 10;
            factors.push({ factor: 'Professional availability stated', points: 10, status: 'good' });
        }

        return {
            score: Math.min(100, score),
            factors,
            recommendations: this.generateProfessionalRecommendations(score, profile, factors)
        };
    }

    /**
     * Extract text from various content formats
     */
    extractText(content) {
        if (typeof content === 'string') {
            return content;
        }
        if (content.text) return content.text;
        if (content.raw) return content.raw;
        if (content.markdown) return content.markdown;
        return '';
    }

    /**
     * Extract professional name
     */
    extractName(metadata, text) {
        // Try metadata first
        if (metadata.author) return metadata.author;
        if (metadata.name) return metadata.name;
        
        // Try to extract from text using common patterns
        const namePatterns = [
            /I'm ([A-Z][a-z]+ [A-Z][a-z]+)/,
            /I am ([A-Z][a-z]+ [A-Z][a-z]+)/,
            /My name is ([A-Z][a-z]+ [A-Z][a-z]+)/,
            /([A-Z][a-z]+ [A-Z][a-z]+)\s*[-–]\s*[A-Z]/
        ];
        
        for (let pattern of namePatterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }
        
        return 'Professional';
    }

    /**
     * Extract primary professional role
     */
    extractPrimaryRole(text, metadata) {
        const rolePatterns = [
            /I'm a ([^.\n]+?)(?:\.|\n)/,
            /I am a ([^.\n]+?)(?:\.|\n)/,
            /working as a? ([^.\n]+?)(?:\.|\n)/,
            /([A-Za-z\s]+(?:Developer|Designer|Engineer|Manager|Consultant|Specialist|Director|Lead))/i
        ];
        
        for (let pattern of rolePatterns) {
            const match = text.match(pattern);
            if (match) {
                return this.cleanRole(match[1]);
            }
        }
        
        // Fallback to common roles based on content
        if (/javascript|react|node|programming|coding/i.test(text)) return 'Software Developer';
        if (/design|ui|ux|figma|sketch/i.test(text)) return 'Designer';
        if (/marketing|seo|campaign|analytics/i.test(text)) return 'Marketing Professional';
        if (/teach|education|learning|curriculum/i.test(text)) return 'Educator';
        
        return 'Professional';
    }

    /**
     * Clean and format professional role
     */
    cleanRole(role) {
        return role
            .replace(/^(a|an)\s+/i, '')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Extract professional skills
     */
    extractSkills(text) {
        const skillPatterns = [
            /skills?[:\s]+([^.\n]+)/i,
            /expertise[:\s]+([^.\n]+)/i,
            /proficient[:\s]+([^.\n]+)/i,
            /experienced[:\s]+([^.\n]+)/i
        ];
        
        let skills = [];
        
        for (let pattern of skillPatterns) {
            const match = text.match(pattern);
            if (match) {
                skills = skills.concat(
                    match[1].split(/[,;&]+/).map(s => s.trim()).filter(s => s.length > 2)
                );
            }
        }
        
        // Also extract common tech skills
        const techSkills = [
            'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'HTML', 'CSS',
            'Docker', 'AWS', 'Git', 'SQL', 'MongoDB', 'PostgreSQL', 'Vue.js', 'Angular'
        ];
        
        techSkills.forEach(skill => {
            if (text.toLowerCase().includes(skill.toLowerCase()) && !skills.includes(skill)) {
                skills.push(skill);
            }
        });
        
        return skills.slice(0, 10); // Limit to top 10
    }

    /**
     * Generate professional recommendations
     */
    generateProfessionalRecommendations(score, profile, factors) {
        const recommendations = [];
        
        if (score < 50) {
            recommendations.push({
                priority: 'high',
                category: 'Professional Identity',
                message: 'Add clear professional identity including name, role, and key skills',
                action: 'Update profile information'
            });
        }
        
        if (!profile.name || profile.name === 'Professional') {
            recommendations.push({
                priority: 'high',
                category: 'Name Recognition',
                message: 'Include your professional name for better personal branding',
                action: 'Add your name to content or metadata'
            });
        }
        
        if (profile.skills.length < 3) {
            recommendations.push({
                priority: 'medium',
                category: 'Skills Visibility',
                message: 'Highlight more relevant professional skills to improve discoverability',
                action: 'List key skills in content'
            });
        }
        
        if (!profile.location) {
            recommendations.push({
                priority: 'medium',
                category: 'Location Targeting',
                message: 'Add location information for local job market visibility',
                action: 'Include your professional location'
            });
        }
        
        return recommendations;
    }

    /**
     * Interpolate template with profile data
     */
    interpolateTemplate(template, profile, industry) {
        return template
            .replace(/\{name\}/g, profile.name)
            .replace(/\{primary_role\}/g, profile.primaryRole)
            .replace(/\{secondary_role\}/g, profile.secondaryRole || profile.primaryRole)
            .replace(/\{industry\}/g, industry)
            .replace(/\{location\}/g, profile.location || '')
            .replace(/\{experience_level\}/g, this.categorizeExperience(profile.experience))
            .replace(/\{experience_years\}/g, this.extractYearsOfExperience(profile.experience))
            .replace(/\{specializations\}/g, profile.specializations.join(', '))
            .replace(/\{key_skills\}/g, profile.skills.slice(0, 3).join(', '))
            .replace(/\{technologies\}/g, profile.skills.filter(s => this.isTechnology(s)).join(', '))
            .replace(/\{service_types\}/g, this.generateServiceTypes(profile.primaryRole))
            .replace(/\{availability_type\}/g, profile.availability || 'new opportunities')
            .replace(/\{project_types\}/g, this.generateProjectTypes(industry));
    }

    /**
     * Integration with existing editor
     */
    integrateWithEditor(editorInstance) {
        // Add SEO optimization button to editor toolbar
        this.addOptimizeButton(editorInstance);
        
        // Add real-time optimization suggestions
        this.addRealTimeFeedback(editorInstance);
        
        // Add professional templates dropdown
        this.addTemplatesDropdown(editorInstance);
    }

    /**
     * Add optimization button to editor
     */
    addOptimizeButton(editor) {
        const toolbar = document.querySelector('.editor-toolbar');
        if (toolbar) {
            const optimizeBtn = document.createElement('button');
            optimizeBtn.className = 'btn btn-secondary';
            optimizeBtn.innerHTML = '🎯 Optimize SEO';
            optimizeBtn.onclick = () => this.runOptimization(editor);
            toolbar.appendChild(optimizeBtn);
        }
    }

    /**
     * Run complete optimization
     */
    async runOptimization(editor) {
        const content = editor.getValue ? editor.getValue() : editor.editor.getValue();
        const metadata = this.extractMetadataFromEditor();
        
        const optimizations = await this.optimizeMeta(content, metadata);
        this.displayOptimizations(optimizations);
    }

    /**
     * Display optimization results
     */
    displayOptimizations(optimizations) {
        const resultsContainer = document.getElementById('seoOptimizations') || this.createResultsContainer();
        
        resultsContainer.innerHTML = `
            <div class="seo-optimizations">
                <h3>🎯 Portfolio SEO Optimizations</h3>
                
                <div class="professional-score">
                    <h4>Professional Score: ${optimizations.professionalScore.score}/100</h4>
                    <div class="score-factors">
                        ${optimizations.professionalScore.factors.map(f => 
                            `<div class="factor ${f.status}"><span>${f.factor}</span><span>+${f.points}</span></div>`
                        ).join('')}
                    </div>
                </div>
                
                ${this.renderMetaOptimizations(optimizations)}
                ${this.renderSocialOptimizations(optimizations)}
                ${this.renderRecommendations(optimizations.professionalScore.recommendations)}
            </div>
        `;
    }
    
    /**
     * Create results container if it doesn't exist
     */
    createResultsContainer() {
        const container = document.createElement('div');
        container.id = 'seoOptimizations';
        container.className = 'seo-results-panel';
        
        const editorContainer = document.querySelector('.editor-container') || document.body;
        editorContainer.appendChild(container);
        
        return container;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioMetaOptimizer;
}

window.PortfolioMetaOptimizer = PortfolioMetaOptimizer;