/**
 * Portfolio Sitemap Generator with Priority Weighting
 * Generates intelligent sitemaps optimized for portfolio sites
 */

class PortfolioSitemapGenerator {
    constructor() {
        this.sitemapConfig = {
            baseURL: '',
            defaultChangeFreq: 'monthly',
            defaultPriority: 0.5,
            maxURLsPerSitemap: 50000,
            includeImages: true,
            includeAlternates: true
        };
        
        this.priorityRules = new Map();
        this.changeFrequencyRules = new Map();
        this.portfolioWeights = new Map();
        
        this.initializePriorityRules();
        this.initializeChangeFreqRules();
        this.initializePortfolioWeights();
    }

    /**
     * Initialize priority rules for different page types
     */
    initializePriorityRules() {
        // Homepage and main sections get highest priority
        this.priorityRules.set('homepage', 1.0);
        this.priorityRules.set('about', 0.9);
        this.priorityRules.set('portfolio', 0.9);
        this.priorityRules.set('work', 0.9);
        this.priorityRules.set('services', 0.8);
        this.priorityRules.set('contact', 0.8);
        
        // Individual portfolio items
        this.priorityRules.set('portfolio-item', 0.7);
        this.priorityRules.set('project', 0.7);
        this.priorityRules.set('case-study', 0.8);
        
        // Blog and content
        this.priorityRules.set('blog-home', 0.6);
        this.priorityRules.set('blog-post', 0.5);
        this.priorityRules.set('article', 0.5);
        
        // Tools and resources
        this.priorityRules.set('tools', 0.6);
        this.priorityRules.set('resources', 0.4);
        
        // Archive and category pages
        this.priorityRules.set('category', 0.4);
        this.priorityRules.set('tag', 0.3);
        this.priorityRules.set('archive', 0.3);
        
        // Legal and secondary pages
        this.priorityRules.set('privacy', 0.2);
        this.priorityRules.set('terms', 0.2);
        this.priorityRules.set('sitemap', 0.1);
    }

    /**
     * Initialize change frequency rules
     */
    initializeChangeFreqRules() {
        this.changeFrequencyRules.set('homepage', 'weekly');
        this.changeFrequencyRules.set('blog-home', 'weekly');
        this.changeFrequencyRules.set('portfolio', 'monthly');
        this.changeFrequencyRules.set('work', 'monthly');
        this.changeFrequencyRules.set('about', 'monthly');
        this.changeFrequencyRules.set('services', 'monthly');
        this.changeFrequencyRules.set('contact', 'monthly');
        
        this.changeFrequencyRules.set('blog-post', 'monthly');
        this.changeFrequencyRules.set('portfolio-item', 'yearly');
        this.changeFrequencyRules.set('project', 'yearly');
        this.changeFrequencyRules.set('case-study', 'yearly');
        
        this.changeFrequencyRules.set('category', 'monthly');
        this.changeFrequencyRules.set('tag', 'monthly');
        this.changeFrequencyRules.set('archive', 'yearly');
        
        this.changeFrequencyRules.set('privacy', 'yearly');
        this.changeFrequencyRules.set('terms', 'yearly');
    }

    /**
     * Initialize portfolio-specific weighting factors
     */
    initializePortfolioWeights() {
        // Quality indicators that increase priority
        this.portfolioWeights.set('qualityFactors', {
            hasImages: 0.1,
            hasDescription: 0.1,
            hasCaseStudy: 0.2,
            hasLiveDemo: 0.15,
            hasSourceCode: 0.1,
            hasTestimonial: 0.15,
            recentProject: 0.1,
            featuredProject: 0.2,
            awardWinning: 0.3,
            clientWork: 0.1
        });
        
        // Engagement indicators
        this.portfolioWeights.set('engagementFactors', {
            viewCount: 0.05, // per 1000 views
            shareCount: 0.1,  // per share
            contactInquiries: 0.2, // per inquiry
            backlinks: 0.1,   // per backlink
            socialMentions: 0.05
        });
        
        // Technical factors
        this.portfolioWeights.set('technicalFactors', {
            isResponsive: 0.1,
            hasStructuredData: 0.1,
            fastLoadTime: 0.05,
            mobileOptimized: 0.1,
            hasAltTags: 0.05,
            hasMetaDescription: 0.05
        });
    }

    /**
     * Generate comprehensive sitemap for portfolio
     */
    async generatePortfolioSitemap(siteData, options = {}) {
        this.sitemapConfig = { ...this.sitemapConfig, ...options };
        
        // Collect all pages and content
        const allPages = await this.collectAllPages(siteData);
        
        // Process and prioritize pages
        const processedPages = await this.processPages(allPages);
        
        // Generate main sitemap
        const mainSitemap = this.generateMainSitemap(processedPages);
        
        // Generate specialized sitemaps
        const imageSitemap = this.generateImageSitemap(processedPages);
        const videoSitemap = this.generateVideoSitemap(processedPages);
        const newsSitemap = this.generateNewsSitemap(processedPages);
        
        // Generate sitemap index if needed
        const sitemapIndex = this.generateSitemapIndex([
            'sitemap.xml',
            ...(imageSitemap ? ['sitemap-images.xml'] : []),
            ...(videoSitemap ? ['sitemap-videos.xml'] : []),
            ...(newsSitemap ? ['sitemap-news.xml'] : [])
        ]);
        
        return {
            mainSitemap,
            imageSitemap,
            videoSitemap,
            newsSitemap,
            sitemapIndex,
            statistics: this.generateSitemapStatistics(processedPages),
            validation: await this.validateSitemap(mainSitemap),
            optimization: this.analyzeSitemapOptimization(processedPages)
        };
    }

    /**
     * Collect all pages from site data
     */
    async collectAllPages(siteData) {
        const pages = [];
        
        // Add static pages
        if (siteData.pages) {
            pages.push(...siteData.pages.map(page => ({
                ...page,
                type: this.detectPageType(page.path || page.url),
                contentType: 'page'
            })));
        }
        
        // Add portfolio items
        if (siteData.portfolio) {
            pages.push(...siteData.portfolio.map(item => ({
                ...item,
                type: 'portfolio-item',
                contentType: 'portfolio',
                priority: this.calculatePortfolioPriority(item)
            })));
        }
        
        // Add blog posts
        if (siteData.blog) {
            pages.push(...siteData.blog.map(post => ({
                ...post,
                type: 'blog-post',
                contentType: 'blog'
            })));
        }
        
        // Add projects
        if (siteData.projects) {
            pages.push(...siteData.projects.map(project => ({
                ...project,
                type: 'project',
                contentType: 'portfolio'
            })));
        }
        
        // Add taxonomy pages (categories, tags)
        if (siteData.taxonomies) {
            pages.push(...this.generateTaxonomyPages(siteData.taxonomies));
        }
        
        return pages;
    }

    /**
     * Process pages with priority calculation and optimization
     */
    async processPages(pages) {
        const processed = [];
        
        for (const page of pages) {
            const processedPage = {
                url: this.buildFullURL(page.url || page.path),
                lastmod: this.formatDate(page.lastmod || page.date || new Date()),
                changefreq: this.calculateChangeFreq(page),
                priority: await this.calculatePriority(page),
                images: await this.extractImages(page),
                alternates: await this.getAlternateLanguages(page),
                metadata: this.extractMetadata(page),
                type: page.type,
                contentType: page.contentType
            };
            
            processed.push(processedPage);
        }
        
        // Sort by priority (highest first)
        return processed.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Calculate priority for portfolio items with quality factors
     */
    calculatePortfolioPriority(item) {
        let basePriority = this.priorityRules.get('portfolio-item');
        const qualityFactors = this.portfolioWeights.get('qualityFactors');
        
        // Apply quality bonuses
        if (item.images && item.images.length > 0) {
            basePriority += qualityFactors.hasImages;
        }
        
        if (item.description && item.description.length > 100) {
            basePriority += qualityFactors.hasDescription;
        }
        
        if (item.caseStudy) {
            basePriority += qualityFactors.hasCaseStudy;
        }
        
        if (item.liveDemo || item.demo) {
            basePriority += qualityFactors.hasLiveDemo;
        }
        
        if (item.sourceCode || item.github) {
            basePriority += qualityFactors.hasSourceCode;
        }
        
        if (item.testimonial) {
            basePriority += qualityFactors.hasTestimonial;
        }
        
        if (item.featured) {
            basePriority += qualityFactors.featuredProject;
        }
        
        if (item.award) {
            basePriority += qualityFactors.awardWinning;
        }
        
        // Check if recent (within last 6 months)
        if (item.date && this.isRecent(item.date)) {
            basePriority += qualityFactors.recentProject;
        }
        
        // Ensure priority doesn't exceed 1.0
        return Math.min(1.0, basePriority);
    }

    /**
     * Calculate overall page priority
     */
    async calculatePriority(page) {
        let basePriority = this.priorityRules.get(page.type) || this.sitemapConfig.defaultPriority;
        
        // Apply portfolio-specific calculations
        if (page.contentType === 'portfolio') {
            basePriority = this.calculatePortfolioPriority(page);
        }
        
        // Apply technical factors
        const technicalFactors = this.portfolioWeights.get('technicalFactors');
        
        if (page.metadata?.responsive) {
            basePriority += technicalFactors.isResponsive;
        }
        
        if (page.metadata?.structuredData) {
            basePriority += technicalFactors.hasStructuredData;
        }
        
        if (page.metadata?.metaDescription) {
            basePriority += technicalFactors.hasMetaDescription;
        }
        
        // Apply engagement factors (if analytics data available)
        if (page.analytics) {
            const engagementFactors = this.portfolioWeights.get('engagementFactors');
            
            if (page.analytics.views) {
                basePriority += (page.analytics.views / 1000) * engagementFactors.viewCount;
            }
            
            if (page.analytics.shares) {
                basePriority += page.analytics.shares * engagementFactors.shareCount;
            }
        }
        
        return Math.min(1.0, basePriority);
    }

    /**
     * Calculate change frequency based on content type and age
     */
    calculateChangeFreq(page) {
        const baseFreq = this.changeFrequencyRules.get(page.type) || this.sitemapConfig.defaultChangeFreq;
        
        // Adjust based on content age
        if (page.date) {
            const ageInDays = (new Date() - new Date(page.date)) / (1000 * 60 * 60 * 24);
            
            if (ageInDays < 30) {
                return 'weekly';
            } else if (ageInDays < 90) {
                return 'monthly';
            } else if (ageInDays < 365) {
                return 'yearly';
            } else {
                return 'never';
            }
        }
        
        return baseFreq;
    }

    /**
     * Generate main XML sitemap
     */
    generateMainSitemap(pages) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
        
        if (this.sitemapConfig.includeImages) {
            xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
        }
        
        if (this.sitemapConfig.includeAlternates) {
            xml += ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
        }
        
        xml += '>\n';
        
        for (const page of pages) {
            xml += this.generateURLEntry(page);
        }
        
        xml += '</urlset>';
        
        return xml;
    }

    /**
     * Generate individual URL entry
     */
    generateURLEntry(page) {
        let xml = '  <url>\n';
        xml += `    <loc>${this.escapeXML(page.url)}</loc>\n`;
        xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority.toFixed(1)}</priority>\n`;
        
        // Add image entries
        if (page.images && page.images.length > 0) {
            for (const image of page.images) {
                xml += this.generateImageEntry(image);
            }
        }
        
        // Add alternate language entries
        if (page.alternates && page.alternates.length > 0) {
            for (const alternate of page.alternates) {
                xml += `    <xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${this.escapeXML(alternate.url)}" />\n`;
            }
        }
        
        xml += '  </url>\n';
        
        return xml;
    }

    /**
     * Generate image entry for sitemap
     */
    generateImageEntry(image) {
        let xml = '    <image:image>\n';
        xml += `      <image:loc>${this.escapeXML(image.url)}</image:loc>\n`;
        
        if (image.caption) {
            xml += `      <image:caption>${this.escapeXML(image.caption)}</image:caption>\n`;
        }
        
        if (image.title) {
            xml += `      <image:title>${this.escapeXML(image.title)}</image:title>\n`;
        }
        
        if (image.license) {
            xml += `      <image:license>${this.escapeXML(image.license)}</image:license>\n`;
        }
        
        xml += '    </image:image>\n';
        
        return xml;
    }

    /**
     * Generate image-specific sitemap
     */
    generateImageSitemap(pages) {
        const imagesPages = pages.filter(page => page.images && page.images.length > 0);
        
        if (imagesPages.length === 0) {
            return null;
        }
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
        
        for (const page of imagesPages) {
            xml += this.generateURLEntry(page);
        }
        
        xml += '</urlset>';
        
        return xml;
    }

    /**
     * Generate sitemap index for multiple sitemaps
     */
    generateSitemapIndex(sitemapFiles) {
        if (sitemapFiles.length <= 1) {
            return null;
        }
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        for (const sitemapFile of sitemapFiles) {
            xml += '  <sitemap>\n';
            xml += `    <loc>${this.buildFullURL(sitemapFile)}</loc>\n`;
            xml += `    <lastmod>${this.formatDate(new Date())}</lastmod>\n`;
            xml += '  </sitemap>\n';
        }
        
        xml += '</sitemapindex>';
        
        return xml;
    }

    /**
     * Generate portfolio-specific robots.txt
     */
    generateRobotsTxt(sitemapURLs = []) {
        let robotsTxt = 'User-agent: *\n';
        robotsTxt += 'Allow: /\n\n';
        
        // Disallow admin and private areas
        robotsTxt += 'Disallow: /admin/\n';
        robotsTxt += 'Disallow: /private/\n';
        robotsTxt += 'Disallow: /temp/\n';
        robotsTxt += 'Disallow: /.git/\n';
        robotsTxt += 'Disallow: /node_modules/\n\n';
        
        // Add sitemap references
        for (const sitemapURL of sitemapURLs) {
            robotsTxt += `Sitemap: ${sitemapURL}\n`;
        }
        
        // Add crawl delay for politeness
        robotsTxt += '\nCrawl-delay: 1\n';
        
        return robotsTxt;
    }

    /**
     * Generate sitemap statistics
     */
    generateSitemapStatistics(pages) {
        const stats = {
            totalPages: pages.length,
            byType: {},
            byPriority: {},
            byChangeFreq: {},
            averagePriority: 0,
            highestPriority: 0,
            lowestPriority: 1,
            totalImages: 0,
            lastModified: null
        };
        
        let prioritySum = 0;
        
        for (const page of pages) {
            // Count by type
            stats.byType[page.type] = (stats.byType[page.type] || 0) + 1;
            
            // Count by priority ranges
            const priorityRange = this.getPriorityRange(page.priority);
            stats.byPriority[priorityRange] = (stats.byPriority[priorityRange] || 0) + 1;
            
            // Count by change frequency
            stats.byChangeFreq[page.changefreq] = (stats.byChangeFreq[page.changefreq] || 0) + 1;
            
            // Calculate priority statistics
            prioritySum += page.priority;
            stats.highestPriority = Math.max(stats.highestPriority, page.priority);
            stats.lowestPriority = Math.min(stats.lowestPriority, page.priority);
            
            // Count images
            if (page.images) {
                stats.totalImages += page.images.length;
            }
            
            // Track latest modification
            if (!stats.lastModified || new Date(page.lastmod) > new Date(stats.lastModified)) {
                stats.lastModified = page.lastmod;
            }
        }
        
        stats.averagePriority = prioritySum / pages.length;
        
        return stats;
    }

    /**
     * Analyze sitemap optimization opportunities
     */
    analyzeSitemapOptimization(pages) {
        const analysis = {
            strengths: [],
            opportunities: [],
            issues: [],
            recommendations: [],
            score: 0
        };
        
        let score = 0;
        const maxScore = 100;
        
        // Check if homepage has maximum priority
        const homepage = pages.find(p => p.type === 'homepage');
        if (homepage && homepage.priority === 1.0) {
            analysis.strengths.push('Homepage has maximum priority');
            score += 15;
        } else {
            analysis.issues.push('Homepage should have priority 1.0');
        }
        
        // Check portfolio item prioritization
        const portfolioItems = pages.filter(p => p.contentType === 'portfolio');
        const highPriorityPortfolio = portfolioItems.filter(p => p.priority >= 0.7).length;
        
        if (highPriorityPortfolio > 0) {
            analysis.strengths.push(`${highPriorityPortfolio} high-priority portfolio items`);
            score += 20;
        }
        
        // Check for image optimization
        const pagesWithImages = pages.filter(p => p.images && p.images.length > 0).length;
        if (pagesWithImages > 0) {
            analysis.strengths.push(`${pagesWithImages} pages with image metadata`);
            score += 15;
        }
        
        // Check for multilingual support
        const pagesWithAlternates = pages.filter(p => p.alternates && p.alternates.length > 0).length;
        if (pagesWithAlternates > 0) {
            analysis.strengths.push('Multilingual sitemap support');
            score += 10;
        }
        
        // Check change frequency distribution
        const changeFreqDistribution = {};
        pages.forEach(p => {
            changeFreqDistribution[p.changefreq] = (changeFreqDistribution[p.changefreq] || 0) + 1;
        });
        
        if (Object.keys(changeFreqDistribution).length > 1) {
            analysis.strengths.push('Diverse change frequency settings');
            score += 10;
        }
        
        // Generate recommendations
        if (score < 70) {
            analysis.recommendations.push('Consider featuring more portfolio items');
            analysis.recommendations.push('Add more images to portfolio pages');
            analysis.recommendations.push('Optimize page priorities based on importance');
        }
        
        analysis.score = Math.min(maxScore, score);
        
        return analysis;
    }

    /**
     * Validate sitemap structure and content
     */
    async validateSitemap(sitemapXML) {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            urlCount: 0,
            imageCount: 0
        };
        
        try {
            // Basic XML structure validation
            if (!sitemapXML.includes('<?xml version="1.0"')) {
                validation.errors.push('Missing XML declaration');
                validation.valid = false;
            }
            
            if (!sitemapXML.includes('<urlset')) {
                validation.errors.push('Missing urlset element');
                validation.valid = false;
            }
            
            // Count URLs and images
            const urlMatches = sitemapXML.match(/<url>/g);
            validation.urlCount = urlMatches ? urlMatches.length : 0;
            
            const imageMatches = sitemapXML.match(/<image:image>/g);
            validation.imageCount = imageMatches ? imageMatches.length : 0;
            
            // Check URL limits
            if (validation.urlCount > this.sitemapConfig.maxURLsPerSitemap) {
                validation.warnings.push(`URL count (${validation.urlCount}) exceeds recommended limit`);
            }
            
            // Validate URL format
            const urlRegex = /<loc>([^<]+)<\/loc>/g;
            let match;
            while ((match = urlRegex.exec(sitemapXML)) !== null) {
                const url = match[1];
                if (!this.isValidURL(url)) {
                    validation.errors.push(`Invalid URL format: ${url}`);
                    validation.valid = false;
                }
            }
            
        } catch (error) {
            validation.errors.push(`Validation error: ${error.message}`);
            validation.valid = false;
        }
        
        return validation;
    }

    /**
     * Integration with editor
     */
    integrateWithEditor(editor) {
        this.addSitemapPanel(editor);
        this.addSitemapPreview(editor);
    }

    /**
     * Add sitemap panel to editor
     */
    addSitemapPanel(editor) {
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            const sitemapPanel = document.createElement('div');
            sitemapPanel.className = 'sitemap-panel';
            sitemapPanel.innerHTML = `
                <h3>🗺️ Portfolio Sitemap</h3>
                <div class="sitemap-controls">
                    <button class="btn btn-primary" onclick="sitemapGenerator.generateSitemap()">Generate Sitemap</button>
                    <button class="btn btn-secondary" onclick="sitemapGenerator.previewSitemap()">Preview</button>
                    <button class="btn btn-info" onclick="sitemapGenerator.validateSitemap()">Validate</button>
                    <button class="btn btn-success" onclick="sitemapGenerator.downloadSitemap()">Download</button>
                </div>
                <div id="sitemapResults" class="sitemap-results"></div>
            `;
            
            editorContainer.appendChild(sitemapPanel);
        }
    }

    // Utility methods
    buildFullURL(path) {
        const baseURL = this.sitemapConfig.baseURL || window.location.origin;
        return new URL(path, baseURL).href;
    }

    formatDate(date) {
        return new Date(date).toISOString().split('T')[0];
    }

    detectPageType(path) {
        if (!path || path === '/' || path === '/index.html') return 'homepage';
        
        const segments = path.split('/').filter(s => s);
        const firstSegment = segments[0];
        
        if (firstSegment === 'about' || firstSegment === 'me') return 'about';
        if (firstSegment === 'portfolio' || firstSegment === 'work') return 'portfolio';
        if (firstSegment === 'services') return 'services';
        if (firstSegment === 'contact') return 'contact';
        if (firstSegment === 'blog') return segments.length > 1 ? 'blog-post' : 'blog-home';
        
        return 'page';
    }

    isRecent(date) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(date) > sixMonthsAgo;
    }

    escapeXML(str) {
        return str.replace(/[<>&'"]/g, (match) => {
            switch (match) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return match;
            }
        });
    }

    getPriorityRange(priority) {
        if (priority >= 0.8) return 'high';
        if (priority >= 0.5) return 'medium';
        return 'low';
    }

    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

// Export and make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioSitemapGenerator;
}

window.PortfolioSitemapGenerator = PortfolioSitemapGenerator;
window.sitemapGenerator = new PortfolioSitemapGenerator();