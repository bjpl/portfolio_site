/**
 * Portfolio SEO Score Checker
 * Comprehensive SEO analysis with professional portfolio focus
 */

class PortfolioSEOChecker {
    constructor() {
        this.checkCriteria = new Map();
        this.professionalMetrics = new Map();
        this.industryBenchmarks = new Map();
        this.scoringWeights = new Map();
        this.competitorAnalysis = new Map();
        
        this.initializeCheckCriteria();
        this.initializeProfessionalMetrics();
        this.initializeIndustryBenchmarks();
        this.initializeScoringWeights();
    }

    /**
     * Initialize SEO check criteria
     */
    initializeCheckCriteria() {
        // Technical SEO Criteria
        this.checkCriteria.set('technical', {
            metaTitlePresent: { weight: 10, required: true, description: 'Page has meta title' },
            metaTitleLength: { weight: 8, optimal: [30, 60], description: 'Meta title optimal length' },
            metaDescriptionPresent: { weight: 10, required: true, description: 'Page has meta description' },
            metaDescriptionLength: { weight: 8, optimal: [120, 160], description: 'Meta description optimal length' },
            canonicalUrl: { weight: 6, required: true, description: 'Canonical URL present' },
            structuredData: { weight: 8, required: false, description: 'Schema.org markup present' },
            robotsMetaTag: { weight: 4, required: false, description: 'Robots meta tag configured' },
            xmlSitemap: { weight: 6, required: false, description: 'XML sitemap exists' },
            robotsTxt: { weight: 4, required: false, description: 'robots.txt file exists' },
            httpsSecure: { weight: 6, required: true, description: 'Site uses HTTPS' }
        });

        // Content SEO Criteria
        this.checkCriteria.set('content', {
            h1Present: { weight: 8, required: true, description: 'Page has H1 heading' },
            h1Unique: { weight: 6, required: true, description: 'H1 is unique on page' },
            headingStructure: { weight: 6, required: false, description: 'Proper heading hierarchy' },
            contentLength: { weight: 8, optimal: [300, 2000], description: 'Adequate content length' },
            keywordDensity: { weight: 6, optimal: [1, 3], description: 'Keyword density 1-3%' },
            internalLinks: { weight: 6, required: false, description: 'Internal links present' },
            externalLinks: { weight: 4, required: false, description: 'Relevant external links' },
            imageAltTags: { weight: 8, required: true, description: 'Images have alt text' },
            contentFreshness: { weight: 4, required: false, description: 'Content is recent' },
            readabilityScore: { weight: 6, optimal: [60, 100], description: 'Good readability score' }
        });

        // Portfolio-Specific Criteria
        this.checkCriteria.set('portfolio', {
            professionalName: { weight: 10, required: true, description: 'Professional name visible' },
            roleClarity: { weight: 9, required: true, description: 'Professional role clear' },
            skillsListed: { weight: 8, required: true, description: 'Skills/expertise listed' },
            contactInformation: { weight: 8, required: true, description: 'Contact info accessible' },
            workSamples: { weight: 10, required: true, description: 'Work samples displayed' },
            projectDescriptions: { weight: 8, required: true, description: 'Project descriptions present' },
            testimonials: { weight: 6, required: false, description: 'Client testimonials included' },
            caseStudies: { weight: 8, required: false, description: 'Detailed case studies' },
            aboutPage: { weight: 8, required: true, description: 'Comprehensive about page' },
            servicesPage: { weight: 6, required: false, description: 'Services clearly defined' }
        });

        // Professional Optimization Criteria
        this.checkCriteria.set('professional', {
            linkedinOptimized: { weight: 8, required: false, description: 'LinkedIn sharing optimized' },
            socialProof: { weight: 6, required: false, description: 'Social media presence' },
            industryKeywords: { weight: 8, required: true, description: 'Industry-relevant keywords' },
            locationTargeting: { weight: 6, required: false, description: 'Location-based optimization' },
            professionalImagery: { weight: 7, required: true, description: 'Professional images/photos' },
            brandConsistency: { weight: 6, required: true, description: 'Consistent personal branding' },
            callToAction: { weight: 7, required: true, description: 'Clear call-to-action elements' },
            mobileOptimization: { weight: 9, required: true, description: 'Mobile-friendly design' },
            loadingSpeed: { weight: 8, required: true, description: 'Fast page loading' },
            accessibility: { weight: 7, required: true, description: 'Accessibility compliance' }
        });

        // Local SEO Criteria (for location-based professionals)
        this.checkCriteria.set('local', {
            googleMyBusiness: { weight: 9, required: false, description: 'Google My Business listing' },
            localKeywords: { weight: 8, required: false, description: 'Local keyword optimization' },
            locationPages: { weight: 6, required: false, description: 'Location-specific pages' },
            localDirectories: { weight: 5, required: false, description: 'Listed in local directories' },
            reviewsIntegration: { weight: 7, required: false, description: 'Reviews displayed on site' },
            localStructuredData: { weight: 6, required: false, description: 'Local business schema markup' }
        });
    }

    /**
     * Initialize professional metrics
     */
    initializeProfessionalMetrics() {
        // Job Search Optimization Metrics
        this.professionalMetrics.set('job-search', {
            atsKeywords: { weight: 15, description: 'ATS-friendly keywords present' },
            roleSpecificTerms: { weight: 12, description: 'Role-specific terminology' },
            experienceHighlights: { weight: 10, description: 'Experience level clear' },
            skillsAlignment: { weight: 10, description: 'Skills match job requirements' },
            achievementsFocus: { weight: 8, description: 'Quantifiable achievements' },
            portfolioQuality: { weight: 15, description: 'High-quality work samples' },
            professionalTone: { weight: 8, description: 'Professional communication tone' },
            industryRelevance: { weight: 12, description: 'Industry-relevant content' },
            contactAccessibility: { weight: 10, description: 'Easy to contact' }
        });

        // Client Acquisition Metrics
        this.professionalMetrics.set('client-acquisition', {
            serviceClarity: { weight: 15, description: 'Services clearly defined' },
            valueProposition: { weight: 12, description: 'Unique value proposition' },
            trustSignals: { weight: 10, description: 'Trust and credibility indicators' },
            testimonialProof: { weight: 10, description: 'Client testimonials and reviews' },
            workExamples: { weight: 15, description: 'Relevant work examples' },
            pricingTransparency: { weight: 8, description: 'Pricing information available' },
            contactConversion: { weight: 12, description: 'Clear contact/hiring process' },
            localRelevance: { weight: 8, description: 'Local market relevance' },
            competitiveDifferentiation: { weight: 10, description: 'Competitive advantages highlighted' }
        });

        // Personal Branding Metrics
        this.professionalMetrics.set('personal-branding', {
            brandConsistency: { weight: 12, description: 'Consistent visual/message branding' },
            personalStory: { weight: 10, description: 'Compelling personal narrative' },
            thoughtLeadership: { weight: 8, description: 'Industry thought leadership content' },
            socialPresence: { weight: 10, description: 'Strong social media presence' },
            contentStrategy: { weight: 8, description: 'Strategic content creation' },
            networkingSignals: { weight: 6, description: 'Professional networking evidence' },
            expertiseDisplay: { weight: 12, description: 'Expertise clearly demonstrated' },
            personalityBalance: { weight: 8, description: 'Professional yet personable tone' },
            memorability: { weight: 10, description: 'Memorable and distinctive presentation' }
        });
    }

    /**
     * Initialize industry benchmarks
     */
    initializeIndustryBenchmarks() {
        // Technology Industry Benchmarks
        this.industryBenchmarks.set('technology', {
            averageContentLength: 1200,
            keywordDensity: 2.5,
            technicalDepth: 'high',
            portfolioProjects: 6,
            caseStudyDetail: 'comprehensive',
            socialProofImportance: 'medium',
            githubIntegration: 'required',
            liveDemo: 'highly-valued',
            technicalBlog: 'recommended'
        });

        // Design Industry Benchmarks
        this.industryBenchmarks.set('design', {
            averageContentLength: 800,
            visualContentRatio: 0.7,
            portfolioProjects: 8,
            caseStudyDetail: 'visual-heavy',
            socialProofImportance: 'high',
            behanceIntegration: 'recommended',
            processDocumentation: 'essential',
            clientTestimonials: 'critical'
        });

        // Marketing Industry Benchmarks
        this.industryBenchmarks.set('marketing', {
            averageContentLength: 1000,
            keywordDensity: 3.0,
            resultsFocus: 'critical',
            portfolioProjects: 5,
            caseStudyDetail: 'metrics-heavy',
            socialProofImportance: 'very-high',
            analyticsEvidence: 'required',
            clientResults: 'quantified'
        });
    }

    /**
     * Initialize scoring weights by focus area
     */
    initializeScoringWeights() {
        this.scoringWeights.set('balanced', {
            technical: 0.25,
            content: 0.25,
            portfolio: 0.30,
            professional: 0.20
        });

        this.scoringWeights.set('job-focused', {
            technical: 0.20,
            content: 0.25,
            portfolio: 0.25,
            professional: 0.30
        });

        this.scoringWeights.set('client-focused', {
            technical: 0.15,
            content: 0.20,
            portfolio: 0.35,
            professional: 0.30
        });
    }

    /**
     * Perform comprehensive SEO analysis
     */
    async performComprehensiveAnalysis(content, metadata, profile, options = {}) {
        const {
            focus = 'balanced',
            industry = 'technology',
            includeCompetitive = false,
            targetKeywords = [],
            checkLocal = false
        } = options;

        console.log('Starting comprehensive SEO analysis...');

        const analysis = {
            overallScore: 0,
            categoryScores: {},
            detailedResults: {},
            professionalMetrics: {},
            recommendations: [],
            criticalIssues: [],
            quickWins: [],
            industryComparison: {},
            competitiveAnalysis: includeCompetitive ? await this.performCompetitiveAnalysis(profile, industry) : null,
            actionPlan: {},
            timestamp: new Date().toISOString()
        };

        // Perform category-specific analyses
        analysis.detailedResults.technical = await this.analyzeTechnicalSEO(content, metadata);
        analysis.detailedResults.content = await this.analyzeContentSEO(content, metadata, targetKeywords);
        analysis.detailedResults.portfolio = await this.analyzePortfolioSEO(content, metadata, profile);
        analysis.detailedResults.professional = await this.analyzeProfessionalSEO(content, metadata, profile);
        
        if (checkLocal) {
            analysis.detailedResults.local = await this.analyzeLocalSEO(content, metadata, profile);
        }

        // Calculate category scores
        const weights = this.scoringWeights.get(focus);
        for (const [category, result] of Object.entries(analysis.detailedResults)) {
            analysis.categoryScores[category] = this.calculateCategoryScore(result);
        }

        // Calculate overall score
        analysis.overallScore = this.calculateOverallScore(analysis.categoryScores, weights);

        // Analyze professional metrics
        analysis.professionalMetrics = await this.analyzeProfessionalMetrics(content, metadata, profile, focus);

        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis.detailedResults, focus, industry);
        analysis.criticalIssues = this.identifyCriticalIssues(analysis.detailedResults);
        analysis.quickWins = this.identifyQuickWins(analysis.detailedResults);

        // Industry comparison
        analysis.industryComparison = this.compareToIndustryBenchmarks(analysis, industry);

        // Generate action plan
        analysis.actionPlan = this.generateActionPlan(analysis);

        console.log('SEO analysis completed with score:', analysis.overallScore);
        return analysis;
    }

    /**
     * Analyze technical SEO factors
     */
    async analyzeTechnicalSEO(content, metadata) {
        const technicalCriteria = this.checkCriteria.get('technical');
        const results = {};

        for (const [criteriaName, criteria] of Object.entries(technicalCriteria)) {
            let score = 0;
            let status = 'fail';
            let details = '';
            let recommendations = [];

            switch (criteriaName) {
                case 'metaTitlePresent':
                    if (metadata.title && metadata.title.trim().length > 0) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `Title present: "${metadata.title}"`;
                    } else {
                        details = 'No meta title found';
                        recommendations.push('Add a descriptive meta title');
                    }
                    break;

                case 'metaTitleLength':
                    if (metadata.title) {
                        const length = metadata.title.length;
                        if (length >= criteria.optimal[0] && length <= criteria.optimal[1]) {
                            score = criteria.weight;
                            status = 'pass';
                            details = `Title length optimal: ${length} characters`;
                        } else {
                            score = Math.max(0, criteria.weight - Math.abs(length - 45) * 2);
                            status = 'warning';
                            details = `Title length: ${length} characters (optimal: ${criteria.optimal[0]}-${criteria.optimal[1]})`;
                            recommendations.push(`Adjust title length to ${criteria.optimal[0]}-${criteria.optimal[1]} characters`);
                        }
                    }
                    break;

                case 'metaDescriptionPresent':
                    if (metadata.description && metadata.description.trim().length > 0) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `Description present: ${metadata.description.length} characters`;
                    } else {
                        details = 'No meta description found';
                        recommendations.push('Add a compelling meta description');
                    }
                    break;

                case 'metaDescriptionLength':
                    if (metadata.description) {
                        const length = metadata.description.length;
                        if (length >= criteria.optimal[0] && length <= criteria.optimal[1]) {
                            score = criteria.weight;
                            status = 'pass';
                            details = `Description length optimal: ${length} characters`;
                        } else {
                            score = Math.max(0, criteria.weight - Math.abs(length - 140) * 0.5);
                            status = 'warning';
                            details = `Description length: ${length} characters (optimal: ${criteria.optimal[0]}-${criteria.optimal[1]})`;
                            recommendations.push(`Adjust description length to ${criteria.optimal[0]}-${criteria.optimal[1]} characters`);
                        }
                    }
                    break;

                case 'structuredData':
                    const hasStructuredData = this.detectStructuredData(content);
                    if (hasStructuredData) {
                        score = criteria.weight;
                        status = 'pass';
                        details = 'Schema.org markup detected';
                    } else {
                        details = 'No structured data found';
                        recommendations.push('Add schema.org markup for better search visibility');
                    }
                    break;

                case 'httpsSecure':
                    if (window.location.protocol === 'https:') {
                        score = criteria.weight;
                        status = 'pass';
                        details = 'Site uses HTTPS';
                    } else {
                        details = 'Site not using HTTPS';
                        recommendations.push('Implement HTTPS for security and SEO');
                    }
                    break;

                default:
                    // Default scoring for other criteria
                    score = criteria.weight * 0.5; // Assume partial implementation
                    status = 'unknown';
                    details = 'Unable to automatically verify';
            }

            results[criteriaName] = {
                score,
                maxScore: criteria.weight,
                status,
                details,
                recommendations,
                required: criteria.required
            };
        }

        return results;
    }

    /**
     * Analyze content SEO factors
     */
    async analyzeContentSEO(content, metadata, targetKeywords = []) {
        const contentCriteria = this.checkCriteria.get('content');
        const results = {};
        const textContent = this.extractTextContent(content);

        for (const [criteriaName, criteria] of Object.entries(contentCriteria)) {
            let score = 0;
            let status = 'fail';
            let details = '';
            let recommendations = [];

            switch (criteriaName) {
                case 'h1Present':
                    const h1Tags = this.extractHeadings(content, 1);
                    if (h1Tags.length > 0) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `H1 found: "${h1Tags[0]}"`;
                    } else {
                        details = 'No H1 heading found';
                        recommendations.push('Add an H1 heading to the page');
                    }
                    break;

                case 'h1Unique':
                    const h1Count = this.extractHeadings(content, 1).length;
                    if (h1Count === 1) {
                        score = criteria.weight;
                        status = 'pass';
                        details = 'Single H1 heading found';
                    } else if (h1Count > 1) {
                        score = criteria.weight * 0.3;
                        status = 'warning';
                        details = `Multiple H1 headings found: ${h1Count}`;
                        recommendations.push('Use only one H1 heading per page');
                    }
                    break;

                case 'contentLength':
                    const wordCount = this.countWords(textContent);
                    if (wordCount >= criteria.optimal[0] && wordCount <= criteria.optimal[1]) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `Content length optimal: ${wordCount} words`;
                    } else if (wordCount < criteria.optimal[0]) {
                        score = Math.max(0, (wordCount / criteria.optimal[0]) * criteria.weight);
                        status = 'warning';
                        details = `Content too short: ${wordCount} words (minimum: ${criteria.optimal[0]})`;
                        recommendations.push(`Expand content to at least ${criteria.optimal[0]} words`);
                    } else {
                        score = criteria.weight * 0.8;
                        status = 'pass';
                        details = `Content length: ${wordCount} words`;
                    }
                    break;

                case 'imageAltTags':
                    const images = this.extractImages(content);
                    const imagesWithAlt = images.filter(img => img.alt && img.alt.trim());
                    if (images.length === 0) {
                        score = criteria.weight * 0.5; // No images is neutral
                        status = 'neutral';
                        details = 'No images found';
                    } else if (imagesWithAlt.length === images.length) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `All ${images.length} images have alt text`;
                    } else {
                        score = (imagesWithAlt.length / images.length) * criteria.weight;
                        status = 'warning';
                        details = `${imagesWithAlt.length}/${images.length} images have alt text`;
                        recommendations.push('Add alt text to all images');
                    }
                    break;

                case 'keywordDensity':
                    if (targetKeywords.length > 0) {
                        const density = this.calculateKeywordDensity(textContent, targetKeywords);
                        if (density >= criteria.optimal[0] && density <= criteria.optimal[1]) {
                            score = criteria.weight;
                            status = 'pass';
                            details = `Keyword density optimal: ${density.toFixed(1)}%`;
                        } else {
                            score = Math.max(0, criteria.weight - Math.abs(density - 2) * 2);
                            status = 'warning';
                            details = `Keyword density: ${density.toFixed(1)}% (optimal: ${criteria.optimal[0]}-${criteria.optimal[1]}%)`;
                            recommendations.push(`Adjust keyword density to ${criteria.optimal[0]}-${criteria.optimal[1]}%`);
                        }
                    } else {
                        score = 0;
                        status = 'neutral';
                        details = 'No target keywords specified';
                    }
                    break;

                case 'readabilityScore':
                    const readability = this.calculateReadabilityScore(textContent);
                    if (readability >= criteria.optimal[0]) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `Readability score: ${readability}`;
                    } else {
                        score = (readability / criteria.optimal[0]) * criteria.weight;
                        status = 'warning';
                        details = `Readability score low: ${readability} (target: ${criteria.optimal[0]}+)`;
                        recommendations.push('Improve content readability with shorter sentences and simpler words');
                    }
                    break;

                default:
                    // Default implementation
                    score = criteria.weight * 0.5;
                    status = 'unknown';
                    details = 'Unable to automatically verify';
            }

            results[criteriaName] = {
                score,
                maxScore: criteria.weight,
                status,
                details,
                recommendations,
                required: criteria.required
            };
        }

        return results;
    }

    /**
     * Analyze portfolio-specific SEO factors
     */
    async analyzePortfolioSEO(content, metadata, profile) {
        const portfolioCriteria = this.checkCriteria.get('portfolio');
        const results = {};
        const textContent = this.extractTextContent(content);

        for (const [criteriaName, criteria] of Object.entries(portfolioCriteria)) {
            let score = 0;
            let status = 'fail';
            let details = '';
            let recommendations = [];

            switch (criteriaName) {
                case 'professionalName':
                    if (profile.name && profile.name !== 'Professional') {
                        score = criteria.weight;
                        status = 'pass';
                        details = `Professional name identified: ${profile.name}`;
                    } else {
                        details = 'Professional name not clearly identified';
                        recommendations.push('Clearly display your professional name');
                    }
                    break;

                case 'roleClarity':
                    if (profile.primaryRole && profile.primaryRole !== 'Professional') {
                        score = criteria.weight;
                        status = 'pass';
                        details = `Professional role clear: ${profile.primaryRole}`;
                    } else {
                        details = 'Professional role not clear';
                        recommendations.push('Clearly state your professional role/title');
                    }
                    break;

                case 'skillsListed':
                    if (profile.skills && profile.skills.length >= 3) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `${profile.skills.length} skills listed: ${profile.skills.slice(0, 3).join(', ')}`;
                    } else if (profile.skills && profile.skills.length > 0) {
                        score = criteria.weight * 0.5;
                        status = 'warning';
                        details = `Only ${profile.skills.length} skills listed`;
                        recommendations.push('List at least 3-5 key professional skills');
                    } else {
                        details = 'No skills/expertise clearly listed';
                        recommendations.push('Add a skills or expertise section');
                    }
                    break;

                case 'contactInformation':
                    const hasContact = this.detectContactInformation(textContent, metadata);
                    if (hasContact.score >= 0.7) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `Contact information accessible: ${hasContact.methods.join(', ')}`;
                    } else if (hasContact.score > 0) {
                        score = hasContact.score * criteria.weight;
                        status = 'warning';
                        details = `Limited contact options: ${hasContact.methods.join(', ')}`;
                        recommendations.push('Provide multiple ways to contact you (email, phone, form)');
                    } else {
                        details = 'No clear contact information found';
                        recommendations.push('Add clear contact information');
                    }
                    break;

                case 'workSamples':
                    const workSamples = this.detectWorkSamples(content, metadata);
                    if (workSamples >= 3) {
                        score = criteria.weight;
                        status = 'pass';
                        details = `${workSamples} work samples detected`;
                    } else if (workSamples > 0) {
                        score = (workSamples / 3) * criteria.weight;
                        status = 'warning';
                        details = `Only ${workSamples} work samples found`;
                        recommendations.push('Display at least 3-5 work samples');
                    } else {
                        details = 'No work samples detected';
                        recommendations.push('Add portfolio items showcasing your work');
                    }
                    break;

                case 'aboutPage':
                    const hasAbout = this.detectAboutContent(textContent, metadata);
                    if (hasAbout) {
                        score = criteria.weight;
                        status = 'pass';
                        details = 'About/bio content found';
                    } else {
                        details = 'No about/bio section found';
                        recommendations.push('Create a comprehensive about page or section');
                    }
                    break;

                default:
                    // Default scoring for other portfolio criteria
                    score = criteria.weight * 0.3; // Conservative estimate
                    status = 'unknown';
                    details = 'Unable to automatically verify';
                    recommendations.push(`Manually verify: ${criteria.description}`);
            }

            results[criteriaName] = {
                score,
                maxScore: criteria.weight,
                status,
                details,
                recommendations,
                required: criteria.required
            };
        }

        return results;
    }

    /**
     * Calculate category score
     */
    calculateCategoryScore(categoryResults) {
        let totalScore = 0;
        let maxPossibleScore = 0;

        for (const result of Object.values(categoryResults)) {
            totalScore += result.score;
            maxPossibleScore += result.maxScore;
        }

        return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    }

    /**
     * Calculate overall score with weights
     */
    calculateOverallScore(categoryScores, weights) {
        let weightedScore = 0;
        let totalWeight = 0;

        for (const [category, score] of Object.entries(categoryScores)) {
            const weight = weights[category] || 0;
            weightedScore += score * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(detailedResults, focus, industry) {
        const recommendations = [];
        const priority = { high: [], medium: [], low: [] };

        for (const [category, results] of Object.entries(detailedResults)) {
            for (const [criteriaName, result] of Object.entries(results)) {
                if (result.recommendations && result.recommendations.length > 0) {
                    const rec = {
                        category,
                        criteria: criteriaName,
                        recommendations: result.recommendations,
                        impact: this.calculateImpactLevel(result, category, focus),
                        difficulty: this.estimateDifficulty(criteriaName),
                        currentScore: result.score,
                        maxScore: result.maxScore
                    };

                    if (result.required && result.score === 0) {
                        priority.high.push(rec);
                    } else if (result.score < result.maxScore * 0.5) {
                        priority.medium.push(rec);
                    } else {
                        priority.low.push(rec);
                    }
                }
            }
        }

        return {
            high: priority.high,
            medium: priority.medium,
            low: priority.low,
            summary: this.generateRecommendationSummary(priority)
        };
    }

    /**
     * Integration with existing editor
     */
    integrateWithEditor(editor) {
        this.addSEOPanel(editor);
        this.addRealTimeScoring(editor);
        this.addRecommendationPanel(editor);
    }

    /**
     * Add SEO checking panel to editor
     */
    addSEOPanel(editor) {
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            const seoPanel = document.createElement('div');
            seoPanel.className = 'seo-checker-panel';
            seoPanel.innerHTML = `
                <h3>🏆 SEO Score Checker</h3>
                <div class="seo-focus-selector">
                    <label>Focus:</label>
                    <select id="seoFocus">
                        <option value="balanced">Balanced</option>
                        <option value="job-focused">Job Search</option>
                        <option value="client-focused">Client Acquisition</option>
                    </select>
                </div>
                <div class="seo-controls">
                    <button class="btn btn-primary" onclick="seoChecker.runAnalysis()">Analyze SEO</button>
                    <button class="btn btn-secondary" onclick="seoChecker.quickCheck()">Quick Check</button>
                    <button class="btn btn-info" onclick="seoChecker.generateReport()">Full Report</button>
                </div>
                <div id="seoScore" class="seo-score-display"></div>
                <div id="seoResults" class="seo-results"></div>
            `;
            
            editorContainer.appendChild(seoPanel);
        }
    }

    /**
     * Run SEO analysis from editor
     */
    async runAnalysis() {
        const editor = window.editorInstance;
        if (!editor) return;

        const content = editor.getValue ? editor.getValue() : editor.editor.getValue();
        const metadata = this.extractMetadataFromEditor();
        const profile = this.extractProfileFromContent(content, metadata);
        const focus = document.getElementById('seoFocus')?.value || 'balanced';

        const analysis = await this.performComprehensiveAnalysis(content, metadata, profile, { focus });
        this.displayAnalysisResults(analysis);
    }

    /**
     * Display analysis results in editor
     */
    displayAnalysisResults(analysis) {
        const scoreContainer = document.getElementById('seoScore');
        const resultsContainer = document.getElementById('seoResults');

        if (scoreContainer) {
            scoreContainer.innerHTML = `
                <div class="score-circle ${this.getScoreClass(analysis.overallScore)}">
                    <span class="score-number">${analysis.overallScore}</span>
                    <span class="score-label">/100</span>
                </div>
                <div class="score-breakdown">
                    ${Object.entries(analysis.categoryScores).map(([category, score]) => `
                        <div class="category-score">
                            <span class="category-name">${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                            <span class="category-value ${this.getScoreClass(score)}">${score}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="seo-analysis-results">
                    <div class="critical-issues">
                        <h4>❌ Critical Issues (${analysis.criticalIssues.length})</h4>
                        ${analysis.criticalIssues.map(issue => `
                            <div class="issue critical">
                                <strong>${issue.category}</strong>: ${issue.issue}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="quick-wins">
                        <h4>✨ Quick Wins (${analysis.quickWins.length})</h4>
                        ${analysis.quickWins.map(win => `
                            <div class="issue quick-win">
                                <strong>${win.category}</strong>: ${win.recommendation}
                                <span class="impact">Impact: ${win.impact}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="recommendations">
                        <h4>📈 Priority Recommendations</h4>
                        <div class="rec-tabs">
                            <button onclick="seoChecker.showRecs('high')">High Priority (${analysis.recommendations.high.length})</button>
                            <button onclick="seoChecker.showRecs('medium')">Medium Priority (${analysis.recommendations.medium.length})</button>
                            <button onclick="seoChecker.showRecs('low')">Low Priority (${analysis.recommendations.low.length})</button>
                        </div>
                        <div id="recommendationsContent"></div>
                    </div>
                    
                    <div class="professional-metrics">
                        <h4>💼 Professional Optimization</h4>
                        ${Object.entries(analysis.professionalMetrics).map(([metric, score]) => `
                            <div class="metric">
                                <span>${metric.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" style="width: ${score}%"></div>
                                </div>
                                <span>${score}%</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-success" onclick="seoChecker.applyRecommendations()">Apply Recommendations</button>
                        <button class="btn btn-info" onclick="seoChecker.exportReport()">Export Report</button>
                        <button class="btn btn-secondary" onclick="seoChecker.scheduleRecheck()">Schedule Re-check</button>
                    </div>
                </div>
            `;
        }
    }

    // Utility methods
    extractMetadataFromEditor() {
        return {
            title: document.getElementById('titleInput')?.value || '',
            description: document.getElementById('descriptionInput')?.value || '',
            tags: document.getElementById('tagsInput')?.value.split(',').map(t => t.trim()) || []
        };
    }

    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'poor';
    }

    extractTextContent(content) {
        if (typeof content === 'string') {
            return content.replace(/[#*_~`]/g, '').replace(/\n+/g, ' ').trim();
        }
        return content.text || content.raw || '';
    }

    countWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    calculateReadabilityScore(text) {
        // Simplified Flesch Reading Ease score
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const words = this.countWords(text);
        const syllables = this.countSyllables(text);
        
        if (words === 0 || sentences === 0) return 0;
        
        const avgSentenceLength = words / sentences;
        const avgSyllablesPerWord = syllables / words;
        
        return Math.max(0, Math.min(100, 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord)));
    }

    countSyllables(text) {
        return text.toLowerCase().match(/[aeiouy]+/g)?.length || 0;
    }
}

// Export and make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioSEOChecker;
}

window.PortfolioSEOChecker = PortfolioSEOChecker;
window.seoChecker = new PortfolioSEOChecker();