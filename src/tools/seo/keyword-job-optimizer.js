/**
 * Keyword Optimizer for Job/Client Searches
 * Optimizes portfolio content for job search and client acquisition
 */

class KeywordJobOptimizer {
    constructor() {
        this.jobKeywords = new Map();
        this.clientKeywords = new Map();
        this.industryTerms = new Map();
        this.searchTrends = new Map();
        this.atsKeywords = new Map(); // Applicant Tracking System keywords
        this.geoTargeting = new Map();
        this.salaryCorrelations = new Map();
        
        this.initializeJobKeywords();
        this.initializeClientKeywords();
        this.initializeATSKeywords();
        this.loadSearchTrends();
    }

    /**
     * Initialize job-search specific keywords by role and industry
     */
    initializeJobKeywords() {
        // Software Development Keywords
        this.jobKeywords.set('software-developer', {
            core: {
                primary: ['software developer', 'full stack developer', 'web developer', 'programmer', 'software engineer'],
                skills: ['javascript', 'python', 'react', 'node.js', 'typescript', 'git', 'docker', 'aws'],
                experience: ['frontend development', 'backend development', 'full stack', 'agile', 'scrum'],
                industries: ['fintech', 'healthcare tech', 'e-commerce', 'saas', 'startup']
            },
            seniority: {
                junior: ['entry level', 'junior developer', 'associate developer', '0-2 years', 'new grad'],
                mid: ['mid level', 'software developer', '2-5 years', 'experienced'],
                senior: ['senior developer', 'lead developer', '5+ years', 'technical lead', 'architect']
            },
            jobTitles: [
                'Software Developer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
                'Web Developer', 'Software Engineer', 'Application Developer', 'Systems Developer'
            ],
            atsKeywords: [
                'software development', 'programming', 'coding', 'debugging', 'testing',
                'version control', 'api development', 'database design', 'responsive design'
            ]
        });

        // UI/UX Design Keywords
        this.jobKeywords.set('ui-ux-designer', {
            core: {
                primary: ['ui designer', 'ux designer', 'product designer', 'user experience designer'],
                skills: ['figma', 'sketch', 'adobe xd', 'prototyping', 'wireframing', 'user research'],
                experience: ['user-centered design', 'design thinking', 'usability testing', 'interaction design'],
                industries: ['product design', 'mobile apps', 'web applications', 'enterprise software']
            },
            seniority: {
                junior: ['junior designer', 'ui/ux associate', 'design intern', '0-2 years'],
                mid: ['ui/ux designer', 'product designer', '2-5 years', 'design specialist'],
                senior: ['senior designer', 'lead designer', 'design director', '5+ years', 'principal designer']
            },
            jobTitles: [
                'UI Designer', 'UX Designer', 'UI/UX Designer', 'Product Designer',
                'User Experience Designer', 'Digital Designer', 'Interaction Designer'
            ],
            atsKeywords: [
                'user interface', 'user experience', 'visual design', 'interaction design',
                'usability', 'accessibility', 'design systems', 'responsive design'
            ]
        });

        // Digital Marketing Keywords
        this.jobKeywords.set('digital-marketer', {
            core: {
                primary: ['digital marketer', 'marketing specialist', 'growth marketer', 'content marketer'],
                skills: ['google analytics', 'seo', 'sem', 'social media', 'email marketing', 'ppc'],
                experience: ['campaign management', 'lead generation', 'conversion optimization', 'marketing automation'],
                industries: ['b2b marketing', 'e-commerce', 'saas marketing', 'content marketing']
            },
            seniority: {
                junior: ['marketing coordinator', 'junior marketer', 'marketing associate', '0-2 years'],
                mid: ['marketing specialist', 'digital marketer', '2-5 years', 'marketing analyst'],
                senior: ['senior marketer', 'marketing manager', 'marketing director', '5+ years']
            },
            jobTitles: [
                'Digital Marketing Specialist', 'Marketing Coordinator', 'Growth Marketer',
                'Content Marketing Manager', 'SEO Specialist', 'Social Media Manager'
            ],
            atsKeywords: [
                'digital marketing', 'online marketing', 'marketing campaigns', 'roi analysis',
                'market research', 'brand management', 'customer acquisition'
            ]
        });

        // Data Science/Analytics Keywords
        this.jobKeywords.set('data-scientist', {
            core: {
                primary: ['data scientist', 'data analyst', 'machine learning engineer', 'ai specialist'],
                skills: ['python', 'r', 'sql', 'machine learning', 'tensorflow', 'pandas', 'numpy'],
                experience: ['predictive modeling', 'data visualization', 'statistical analysis', 'big data'],
                industries: ['fintech', 'healthcare analytics', 'retail analytics', 'business intelligence']
            },
            seniority: {
                junior: ['junior data analyst', 'data analyst', 'entry level', '0-2 years'],
                mid: ['data scientist', 'senior analyst', '2-5 years', 'ml engineer'],
                senior: ['senior data scientist', 'lead data scientist', 'principal', '5+ years']
            },
            jobTitles: [
                'Data Scientist', 'Data Analyst', 'Business Analyst', 'Machine Learning Engineer',
                'AI Specialist', 'Quantitative Analyst', 'Research Scientist'
            ],
            atsKeywords: [
                'data analysis', 'statistical modeling', 'machine learning', 'data mining',
                'predictive analytics', 'business intelligence', 'data visualization'
            ]
        });
    }

    /**
     * Initialize client-acquisition keywords for freelancers
     */
    initializeClientKeywords() {
        // Freelance Web Development
        this.clientKeywords.set('web-development', {
            services: {
                primary: ['website development', 'web application', 'custom website', 'responsive design'],
                specific: ['e-commerce site', 'business website', 'portfolio site', 'landing page'],
                technical: ['react development', 'wordpress', 'shopify', 'cms development'],
                solutions: ['online presence', 'digital transformation', 'web solution']
            },
            clientTypes: {
                small_business: ['local business', 'startup', 'entrepreneur', 'small company'],
                enterprise: ['corporate', 'enterprise', 'large company', 'established business'],
                agencies: ['marketing agency', 'design agency', 'digital agency']
            },
            painPoints: [
                'outdated website', 'slow loading', 'not mobile friendly', 'poor user experience',
                'low conversion', 'hard to update', 'no online presence'
            ],
            outcomes: [
                'increase sales', 'improve conversion', 'better user experience', 'mobile optimization',
                'faster loading', 'professional appearance', 'easy to maintain'
            ]
        });

        // Freelance Design Services
        this.clientKeywords.set('design-services', {
            services: {
                primary: ['logo design', 'brand identity', 'web design', 'ui/ux design'],
                specific: ['business card design', 'brochure design', 'social media graphics', 'app design'],
                technical: ['brand guidelines', 'design system', 'user interface', 'visual identity'],
                solutions: ['professional branding', 'visual communication', 'brand recognition']
            },
            clientTypes: {
                startups: ['new business', 'startup', 'entrepreneur', 'launching business'],
                rebranding: ['rebrand', 'brand refresh', 'outdated brand', 'brand modernization'],
                growth: ['scaling business', 'expanding company', 'professional image']
            },
            painPoints: [
                'unprofessional image', 'inconsistent branding', 'outdated design', 'poor visual identity',
                'low brand recognition', 'amateur appearance'
            ],
            outcomes: [
                'professional appearance', 'brand recognition', 'customer trust', 'competitive advantage',
                'consistent branding', 'memorable identity'
            ]
        });

        // Freelance Marketing Services
        this.clientKeywords.set('marketing-services', {
            services: {
                primary: ['digital marketing', 'seo services', 'content marketing', 'social media management'],
                specific: ['google ads', 'facebook advertising', 'email marketing', 'marketing strategy'],
                technical: ['analytics setup', 'conversion tracking', 'marketing automation', 'roi analysis'],
                solutions: ['online visibility', 'lead generation', 'customer acquisition']
            },
            clientTypes: {
                local: ['local business', 'restaurant', 'retail store', 'service provider'],
                online: ['e-commerce', 'online store', 'saas company', 'digital product'],
                b2b: ['b2b company', 'professional services', 'consulting', 'software company']
            },
            painPoints: [
                'low online visibility', 'no leads', 'poor conversion', 'wasted ad spend',
                'no marketing strategy', 'declining sales'
            ],
            outcomes: [
                'more leads', 'higher revenue', 'better roi', 'increased visibility',
                'customer growth', 'competitive advantage'
            ]
        });
    }

    /**
     * Initialize ATS-friendly keywords
     */
    initializeATSKeywords() {
        this.atsKeywords.set('technical', {
            programming: [
                'programming languages', 'software development', 'application development',
                'web development', 'mobile development', 'database management', 'api integration',
                'version control', 'testing', 'debugging', 'deployment', 'maintenance'
            ],
            methodologies: [
                'agile development', 'scrum methodology', 'test-driven development',
                'continuous integration', 'continuous deployment', 'devops practices'
            ],
            tools: [
                'integrated development environment', 'project management tools',
                'collaboration tools', 'monitoring tools', 'analytics tools'
            ]
        });

        this.atsKeywords.set('design', {
            processes: [
                'design thinking', 'user-centered design', 'design research',
                'usability testing', 'accessibility compliance', 'responsive design'
            ],
            deliverables: [
                'wireframes', 'prototypes', 'mockups', 'design systems',
                'style guides', 'user flows', 'information architecture'
            ],
            collaboration: [
                'cross-functional collaboration', 'stakeholder management',
                'design reviews', 'feedback incorporation'
            ]
        });

        this.atsKeywords.set('business', {
            soft_skills: [
                'problem solving', 'critical thinking', 'communication skills',
                'team collaboration', 'project management', 'time management',
                'attention to detail', 'adaptability', 'leadership'
            ],
            achievements: [
                'project completion', 'deadline management', 'budget management',
                'client satisfaction', 'team leadership', 'process improvement',
                'efficiency optimization', 'cost reduction', 'revenue increase'
            ]
        });
    }

    /**
     * Load search trends data (simulated - would integrate with real APIs)
     */
    loadSearchTrends() {
        // Simulate trending keywords by industry
        this.searchTrends.set('tech', {
            rising: ['ai development', 'machine learning', 'blockchain', 'cloud computing', 'cybersecurity'],
            stable: ['web development', 'mobile development', 'database', 'api'],
            declining: ['flash', 'jquery', 'php'],
            seasonal: {
                'q1': ['tax software', 'financial apps'],
                'q2': ['e-commerce', 'retail'],
                'q3': ['educational tech', 'back to school'],
                'q4': ['holiday apps', 'analytics']
            }
        });

        this.searchTrends.set('design', {
            rising: ['accessibility design', 'inclusive design', 'design systems', 'micro-interactions'],
            stable: ['ui design', 'ux design', 'web design', 'mobile design'],
            declining: ['flash design', 'skeuomorphic'],
            seasonal: {
                'q1': ['rebranding', 'annual reports'],
                'q2': ['event design', 'summer campaigns'],
                'q3': ['back to school', 'educational design'],
                'q4': ['holiday design', 'year-end marketing']
            }
        });
    }

    /**
     * Optimize keywords for job search
     */
    async optimizeForJobSearch(content, metadata, profile) {
        const role = this.detectPrimaryRole(content, metadata, profile);
        const seniority = this.detectSeniorityLevel(content, profile);
        const industry = this.detectTargetIndustry(content, metadata);
        const location = this.detectLocation(profile, metadata);
        
        const jobKeywordData = this.jobKeywords.get(role) || this.jobKeywords.get('software-developer');
        
        const optimization = {
            currentKeywords: this.extractCurrentKeywords(content, metadata),
            suggestedKeywords: this.generateJobKeywords(jobKeywordData, seniority, industry),
            atsOptimization: this.optimizeForATS(content, role),
            locationTargeting: this.optimizeLocationKeywords(location),
            industrySpecific: this.getIndustryKeywords(industry, role),
            trendingKeywords: this.getTrendingKeywords(role, industry),
            keywordDensity: this.calculateOptimalDensity(content),
            competitiveAnalysis: await this.analyzeJobCompetition(role, seniority, location),
            salaryCorrelation: this.analyzeSalaryKeywords(role, seniority),
            optimizationScore: 0
        };
        
        optimization.optimizationScore = this.calculateJobOptimizationScore(optimization);
        
        return optimization;
    }

    /**
     * Optimize keywords for client acquisition
     */
    async optimizeForClientAcquisition(content, metadata, profile) {
        const services = this.detectServices(content, metadata);
        const clientTypes = this.detectTargetClients(content, metadata);
        const niche = this.detectNiche(content, metadata, profile);
        const location = this.detectLocation(profile, metadata);
        
        const optimization = {
            currentKeywords: this.extractCurrentKeywords(content, metadata),
            serviceKeywords: this.generateServiceKeywords(services),
            clientPainPoints: this.identifyClientPainPoints(services, clientTypes),
            solutionKeywords: this.generateSolutionKeywords(services),
            nicheKeywords: this.generateNicheKeywords(niche),
            localSEO: this.optimizeLocalKeywords(location, services),
            competitorAnalysis: await this.analyzeClientCompetition(services, location),
            seasonalKeywords: this.getSeasonalKeywords(services),
            pricingKeywords: this.generatePricingKeywords(services),
            trustKeywords: this.generateTrustKeywords(),
            optimizationScore: 0
        };
        
        optimization.optimizationScore = this.calculateClientOptimizationScore(optimization);
        
        return optimization;
    }

    /**
     * Generate ATS-optimized keywords
     */
    optimizeForATS(content, role) {
        const atsData = this.atsKeywords.get(this.mapRoleToATSCategory(role)) || this.atsKeywords.get('technical');
        
        return {
            requiredKeywords: this.extractATSRequired(content, atsData),
            missingKeywords: this.identifyMissingATS(content, atsData),
            keywordPlacement: this.optimizeATSPlacement(content, atsData),
            readabilityScore: this.calculateATSReadability(content),
            suggestions: this.generateATSSuggestions(content, atsData)
        };
    }

    /**
     * Generate industry-specific keyword recommendations
     */
    getIndustryKeywords(industry, role) {
        const industryMap = {
            'fintech': {
                tech: ['financial technology', 'payment processing', 'blockchain', 'cryptocurrency', 'regulatory compliance'],
                design: ['fintech ui', 'financial dashboards', 'secure design', 'banking interface'],
                marketing: ['fintech marketing', 'financial services', 'banking solutions', 'investment platform']
            },
            'healthcare': {
                tech: ['healthcare technology', 'medical software', 'hipaa compliance', 'electronic health records'],
                design: ['medical interface', 'patient experience', 'healthcare accessibility', 'clinical design'],
                marketing: ['healthcare marketing', 'medical device', 'patient acquisition', 'healthcare solutions']
            },
            'ecommerce': {
                tech: ['e-commerce development', 'online store', 'payment integration', 'inventory management'],
                design: ['ecommerce design', 'shopping experience', 'product pages', 'checkout optimization'],
                marketing: ['online retail', 'conversion optimization', 'customer acquisition', 'retention marketing']
            }
        };
        
        const roleCategory = this.mapRoleToCategory(role);
        return industryMap[industry]?.[roleCategory] || [];
    }

    /**
     * Get trending keywords based on current market demands
     */
    getTrendingKeywords(role, industry) {
        const trends = this.searchTrends.get(this.mapRoleToCategory(role));
        if (!trends) return [];
        
        const currentQuarter = this.getCurrentQuarter();
        
        return {
            rising: trends.rising || [],
            seasonal: trends.seasonal?.[currentQuarter] || [],
            industrySpecific: this.getIndustryTrends(industry),
            priority: 'high' // Trending keywords get high priority
        };
    }

    /**
     * Analyze keyword competition for job searches
     */
    async analyzeJobCompetition(role, seniority, location) {
        // Simulate competition analysis
        const competitionData = {
            low: ['niche technologies', 'specialized roles', 'remote positions'],
            medium: ['popular frameworks', 'standard roles', 'major cities'],
            high: ['basic skills', 'entry level', 'saturated markets']
        };
        
        return {
            competitionLevel: this.assessCompetitionLevel(role, seniority, location),
            opportunities: this.identifyKeywordOpportunities(role, seniority),
            recommendations: this.generateCompetitionRecommendations(role, seniority, location)
        };
    }

    /**
     * Generate keyword density recommendations
     */
    calculateOptimalDensity(content) {
        const wordCount = this.countWords(content);
        const keywordCount = this.countKeywords(content);
        
        return {
            current: (keywordCount / wordCount * 100).toFixed(2),
            optimal: '2-3%',
            recommendations: this.generateDensityRecommendations(keywordCount, wordCount)
        };
    }

    /**
     * Generate salary-correlated keywords
     */
    analyzeSalaryKeywords(role, seniority) {
        const salaryKeywords = {
            'software-developer': {
                junior: ['react', 'javascript', 'git', 'html/css'],
                mid: ['node.js', 'typescript', 'docker', 'aws', 'api design'],
                senior: ['architecture', 'leadership', 'mentoring', 'system design', 'scalability']
            },
            'ui-ux-designer': {
                junior: ['figma', 'sketch', 'prototyping', 'wireframing'],
                mid: ['user research', 'design systems', 'usability testing', 'interaction design'],
                senior: ['design leadership', 'strategy', 'team management', 'product vision']
            }
        };
        
        return salaryKeywords[role]?.[seniority] || [];
    }

    /**
     * Calculate job optimization score
     */
    calculateJobOptimizationScore(optimization) {
        let score = 0;
        const maxScore = 100;
        
        // Keyword coverage (30 points)
        const coverageScore = Math.min(30, (optimization.suggestedKeywords.length / 20) * 30);
        score += coverageScore;
        
        // ATS optimization (25 points)
        const atsScore = (optimization.atsOptimization.readabilityScore / 100) * 25;
        score += atsScore;
        
        // Industry relevance (20 points)
        const industryScore = Math.min(20, (optimization.industrySpecific.length / 10) * 20);
        score += industryScore;
        
        // Trending keywords (15 points)
        const trendScore = Math.min(15, (optimization.trendingKeywords.rising.length / 5) * 15);
        score += trendScore;
        
        // Location targeting (10 points)
        const locationScore = optimization.locationTargeting.length > 0 ? 10 : 0;
        score += locationScore;
        
        return Math.round(score);
    }

    /**
     * Calculate client optimization score
     */
    calculateClientOptimizationScore(optimization) {
        let score = 0;
        
        // Service keyword coverage (25 points)
        score += Math.min(25, (optimization.serviceKeywords.length / 15) * 25);
        
        // Pain point targeting (20 points)
        score += Math.min(20, (optimization.clientPainPoints.length / 10) * 20);
        
        // Solution keywords (20 points)
        score += Math.min(20, (optimization.solutionKeywords.length / 10) * 20);
        
        // Local SEO (15 points)
        score += Math.min(15, (optimization.localSEO.length / 8) * 15);
        
        // Trust keywords (10 points)
        score += Math.min(10, (optimization.trustKeywords.length / 5) * 10);
        
        // Niche targeting (10 points)
        score += Math.min(10, (optimization.nicheKeywords.length / 5) * 10);
        
        return Math.round(score);
    }

    /**
     * Integration with editor
     */
    integrateWithEditor(editor) {
        this.addKeywordPanel(editor);
        this.addRealTimeAnalysis(editor);
        this.addCompetitionTracker(editor);
    }

    /**
     * Add keyword optimization panel
     */
    addKeywordPanel(editor) {
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            const keywordPanel = document.createElement('div');
            keywordPanel.className = 'keyword-optimization-panel';
            keywordPanel.innerHTML = `
                <h3>🎯 Keyword Optimization</h3>
                <div class="keyword-mode-selector">
                    <button class="btn btn-primary" onclick="keywordOptimizer.optimizeForJobs()">Job Search</button>
                    <button class="btn btn-secondary" onclick="keywordOptimizer.optimizeForClients()">Client Acquisition</button>
                    <button class="btn btn-info" onclick="keywordOptimizer.analyzeCompetition()">Competition Analysis</button>
                </div>
                <div id="keywordResults" class="keyword-results"></div>
            `;
            
            editorContainer.appendChild(keywordPanel);
        }
    }

    /**
     * Main optimization function for jobs
     */
    async optimizeForJobs() {
        const editor = window.editorInstance;
        if (!editor) return;

        const content = editor.getValue ? editor.getValue() : editor.editor.getValue();
        const metadata = this.extractMetadataFromEditor();
        const profile = this.extractProfileFromContent(content, metadata);

        const optimization = await this.optimizeForJobSearch(content, metadata, profile);
        this.displayJobOptimization(optimization);
    }

    /**
     * Main optimization function for clients
     */
    async optimizeForClients() {
        const editor = window.editorInstance;
        if (!editor) return;

        const content = editor.getValue ? editor.getValue() : editor.editor.getValue();
        const metadata = this.extractMetadataFromEditor();
        const profile = this.extractProfileFromContent(content, metadata);

        const optimization = await this.optimizeForClientAcquisition(content, metadata, profile);
        this.displayClientOptimization(optimization);
    }

    /**
     * Display job optimization results
     */
    displayJobOptimization(results) {
        const container = document.getElementById('keywordResults');
        if (!container) return;

        container.innerHTML = `
            <div class="job-optimization-results">
                <div class="optimization-score">
                    <h4>🏆 Job Search Optimization Score: ${results.optimizationScore}/100</h4>
                    <div class="score-breakdown">
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${results.optimizationScore}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="keyword-sections">
                    <div class="section">
                        <h5>🔑 Suggested Job Keywords</h5>
                        <div class="keyword-tags">
                            ${results.suggestedKeywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h5>🤖 ATS Optimization</h5>
                        <div class="ats-score">Readability Score: ${results.atsOptimization.readabilityScore}/100</div>
                        <div class="missing-keywords">
                            <strong>Missing ATS Keywords:</strong>
                            ${results.atsOptimization.missingKeywords.map(kw => `<span class="missing-tag">${kw}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h5>📊 Trending Keywords</h5>
                        <div class="trending-keywords">
                            ${results.trendingKeywords.rising.map(kw => `<span class="trending-tag">📈 ${kw}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h5>💰 Salary-Correlated Keywords</h5>
                        <div class="salary-keywords">
                            ${results.salaryCorrelation.map(kw => `<span class="salary-tag">💰 ${kw}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h5>🌍 Location Targeting</h5>
                        <div class="location-keywords">
                            ${results.locationTargeting.map(kw => `<span class="location-tag">📍 ${kw}</span>`).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-success" onclick="keywordOptimizer.applyJobKeywords()">Apply Keywords</button>
                    <button class="btn btn-info" onclick="keywordOptimizer.generateJobContent()">Generate Content</button>
                    <button class="btn btn-secondary" onclick="keywordOptimizer.exportKeywords()">Export List</button>
                </div>
            </div>
        `;
    }

    /**
     * Display client optimization results
     */
    displayClientOptimization(results) {
        const container = document.getElementById('keywordResults');
        if (!container) return;

        container.innerHTML = `
            <div class="client-optimization-results">
                <div class="optimization-score">
                    <h4>🎯 Client Acquisition Score: ${results.optimizationScore}/100</h4>
                    <div class="score-breakdown">
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${results.optimizationScore}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="keyword-sections">
                    <div class="section">
                        <h5>🚀 Service Keywords</h5>
                        <div class="keyword-tags">
                            ${results.serviceKeywords.map(kw => `<span class="service-tag">${kw}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h5>🎯 Client Pain Points</h5>
                        <div class="pain-point-keywords">
                            ${results.clientPainPoints.map(kw => `<span class="pain-tag">⚠️ ${kw}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h5>✨ Solution Keywords</h5>
                        <div class="solution-keywords">
                            ${results.solutionKeywords.map(kw => `<span class="solution-tag">✨ ${kw}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h5>📍 Local SEO</h5>
                        <div class="local-keywords">
                            ${results.localSEO.map(kw => `<span class="local-tag">📍 ${kw}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="section">
                        <h5>🏆 Trust & Authority</h5>
                        <div class="trust-keywords">
                            ${results.trustKeywords.map(kw => `<span class="trust-tag">🏆 ${kw}</span>`).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-success" onclick="keywordOptimizer.applyClientKeywords()">Apply Keywords</button>
                    <button class="btn btn-info" onclick="keywordOptimizer.generateClientContent()">Generate Content</button>
                    <button class="btn btn-primary" onclick="keywordOptimizer.createLandingPage()">Create Landing Page</button>
                </div>
            </div>
        `;
    }

    // Utility methods
    extractMetadataFromEditor() {
        return {
            title: document.getElementById('titleInput')?.value || '',
            description: document.getElementById('descriptionInput')?.value || '',
            tags: document.getElementById('tagsInput')?.value.split(',').map(t => t.trim()) || []
        };
    }

    detectPrimaryRole(content, metadata, profile) {
        // Logic to detect role from content
        const text = (typeof content === 'string' ? content : content.text || '').toLowerCase();
        if (text.includes('developer') || text.includes('programming')) return 'software-developer';
        if (text.includes('designer') || text.includes('ui') || text.includes('ux')) return 'ui-ux-designer';
        if (text.includes('marketing') || text.includes('seo')) return 'digital-marketer';
        if (text.includes('data') || text.includes('analytics')) return 'data-scientist';
        return 'software-developer'; // default
    }

    countWords(content) {
        const text = typeof content === 'string' ? content : content.text || '';
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    getCurrentQuarter() {
        const month = new Date().getMonth();
        if (month < 3) return 'q1';
        if (month < 6) return 'q2';
        if (month < 9) return 'q3';
        return 'q4';
    }
}

// Export and make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeywordJobOptimizer;
}

window.KeywordJobOptimizer = KeywordJobOptimizer;
window.keywordOptimizer = new KeywordJobOptimizer();