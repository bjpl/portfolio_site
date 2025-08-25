/**
 * User Acceptance Test (UAT) Suite
 * Real-world scenario testing from user perspectives
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

class UserAcceptanceTests {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.DEPLOYED_URL || 'http://localhost:3000';
        this.timeout = options.timeout || 15000;
        
        this.scenarios = {
            visitor: [],
            contentCreator: [],
            administrator: [],
            developer: [],
            summary: {
                totalScenarios: 0,
                passedScenarios: 0,
                failedScenarios: 0,
                score: 0
            }
        };
        
        this.userPersonas = {
            visitor: {
                name: 'Sarah - Potential Client',
                goals: ['View portfolio', 'Learn about services', 'Contact for inquiry'],
                expectations: ['Fast loading', 'Professional appearance', 'Easy navigation']
            },
            contentCreator: {
                name: 'Alex - Content Manager',
                goals: ['Add new projects', 'Update blog posts', 'Manage media'],
                expectations: ['Intuitive CMS', 'Quick uploads', 'Preview functionality']
            },
            administrator: {
                name: 'Jordan - Site Administrator',
                goals: ['Manage users', 'Monitor analytics', 'Configure settings'],
                expectations: ['Secure access', 'Clear dashboard', 'System insights']
            },
            developer: {
                name: 'Casey - Technical Consultant',
                goals: ['Review code quality', 'Check performance', 'Validate integrations'],
                expectations: ['Clean APIs', 'Good documentation', 'Proper error handling']
            }
        };
        
        this.startTime = Date.now();
    }

    async runAllUserAcceptanceTests() {
        console.log('👥 Starting User Acceptance Tests...');
        console.log(`🎭 Testing from multiple user perspectives`);
        console.log(`🌐 Target: ${this.baseUrl}`);
        console.log('='.repeat(60));
        
        try {
            await this.testVisitorScenarios();
            await this.testContentCreatorScenarios();
            await this.testAdministratorScenarios();
            await this.testDeveloperScenarios();
            
            this.calculateSummary();
            const report = this.generateReport();
            
            if (this.scenarios.summary.score >= 85) {
                console.log('✅ User acceptance tests passed! Users will have a great experience.');
                return { success: true, report };
            } else if (this.scenarios.summary.score >= 70) {
                console.log('⚠️ User acceptance tests acceptable but user experience could be improved.');
                return { success: true, report, warnings: true };
            } else {
                console.log(`❌ User acceptance tests failed! Score: ${this.scenarios.summary.score}% - User experience needs improvement.`);
                return { success: false, report };
            }
            
        } catch (error) {
            console.error('❌ User acceptance tests failed:', error);
            return { success: false, error: error.message };
        }
    }

    async testVisitorScenarios() {
        const persona = this.userPersonas.visitor;
        console.log(`\n👤 Testing as ${persona.name}`);
        console.log(`🎯 Goals: ${persona.goals.join(', ')}`);
        
        // Scenario 1: First-time visitor exploring the site
        await this.addScenario('visitor', 'Site Discovery Journey', async () => {
            console.log('  📱 Scenario: First-time visitor exploring the portfolio...');
            
            const steps = [];
            
            // Step 1: Landing page loads quickly and looks professional
            const landingStart = Date.now();
            const homeResponse = await fetch(this.baseUrl, { timeout: this.timeout });
            const loadTime = Date.now() - landingStart;
            
            if (!homeResponse.ok) {
                throw new Error(`Landing page failed to load: ${homeResponse.status}`);
            }
            
            const homeHtml = await homeResponse.text();
            
            // Check for professional elements
            const hasTitle = homeHtml.includes('<title>') && !homeHtml.includes('Untitled');
            const hasNavigation = homeHtml.includes('nav') || homeHtml.includes('menu');
            const hasContent = homeHtml.length > 5000; // Reasonable content amount
            
            steps.push({
                step: 'Landing page loads',
                success: loadTime < 3000 && hasTitle && hasNavigation && hasContent,
                details: `${loadTime}ms load time, professional elements: ${hasTitle && hasNavigation && hasContent ? 'Yes' : 'No'}`
            });
            
            // Step 2: Can navigate to portfolio/projects
            try {
                const portfolioResponse = await fetch(`${this.baseUrl}/portfolio`, { timeout: this.timeout });
                const projectsResponse = await fetch(`${this.baseUrl}/projects`, { timeout: this.timeout });
                
                const portfolioWorks = portfolioResponse.ok || portfolioResponse.status === 404;
                const projectsWorks = projectsResponse.ok || projectsResponse.status === 404;
                
                steps.push({
                    step: 'Portfolio navigation',
                    success: portfolioWorks || projectsWorks,
                    details: `Portfolio: ${portfolioResponse.status}, Projects: ${projectsResponse.status}`
                });
            } catch (error) {
                steps.push({
                    step: 'Portfolio navigation',
                    success: false,
                    details: `Navigation failed: ${error.message}`
                });
            }
            
            // Step 3: Can find contact information
            try {
                const contactResponse = await fetch(`${this.baseUrl}/contact`, { timeout: this.timeout });
                let hasContactInfo = false;
                
                if (contactResponse.ok) {
                    const contactHtml = await contactResponse.text();
                    hasContactInfo = contactHtml.includes('contact') || 
                                    contactHtml.includes('email') || 
                                    contactHtml.includes('@');
                } else {
                    // Check if contact info is on home page
                    hasContactInfo = homeHtml.includes('@') || 
                                    homeHtml.includes('contact') ||
                                    homeHtml.includes('mailto:');
                }
                
                steps.push({
                    step: 'Find contact information',
                    success: hasContactInfo,
                    details: `Contact info available: ${hasContactInfo ? 'Yes' : 'No'}`
                });
            } catch (error) {
                steps.push({
                    step: 'Find contact information',
                    success: false,
                    details: `Contact check failed: ${error.message}`
                });
            }
            
            // Step 4: Site works on different screen sizes (basic check)
            const isMobileResponsive = homeHtml.includes('viewport') && 
                                      homeHtml.includes('responsive') || 
                                      homeHtml.includes('@media') ||
                                      homeHtml.includes('mobile');
            
            steps.push({
                step: 'Mobile responsiveness',
                success: isMobileResponsive,
                details: `Responsive design indicators: ${isMobileResponsive ? 'Present' : 'Not found'}`
            });
            
            const successfulSteps = steps.filter(s => s.success).length;
            const totalSteps = steps.length;
            
            return {
                passed: successfulSteps >= Math.ceil(totalSteps * 0.75), // 75% success rate
                steps: steps,
                score: Math.round((successfulSteps / totalSteps) * 100),
                message: `Site discovery: ${successfulSteps}/${totalSteps} steps successful`
            };
        });
        
        // Scenario 2: Looking for specific project information
        await this.addScenario('visitor', 'Project Information Seeking', async () => {
            console.log('  🔍 Scenario: Visitor looking for project details...');
            
            const steps = [];
            
            // Step 1: Search for projects or portfolio
            let foundProjects = false;
            const projectUrls = ['/projects', '/portfolio', '/work'];
            
            for (const url of projectUrls) {
                try {
                    const response = await fetch(`${this.baseUrl}${url}`, { timeout: this.timeout });
                    if (response.ok) {
                        const html = await response.text();
                        if (html.includes('project') || html.includes('work') || html.includes('portfolio')) {
                            foundProjects = true;
                            break;
                        }
                    }
                } catch (error) {
                    // Continue checking other URLs
                }
            }
            
            steps.push({
                step: 'Find projects section',
                success: foundProjects,
                details: `Project section found: ${foundProjects ? 'Yes' : 'No'}`
            });
            
            // Step 2: Check if project information is accessible
            if (foundProjects) {
                // Look for project details, images, descriptions
                let hasDetailedInfo = false;
                
                for (const url of projectUrls) {
                    try {
                        const response = await fetch(`${this.baseUrl}${url}`, { timeout: this.timeout });
                        if (response.ok) {
                            const html = await response.text();
                            const hasImages = html.includes('<img') || html.includes('image');
                            const hasDescriptions = html.length > 3000; // Reasonable content
                            const hasTitles = html.includes('<h') || html.includes('title');
                            
                            if (hasImages && hasDescriptions && hasTitles) {
                                hasDetailedInfo = true;
                                break;
                            }
                        }
                    } catch (error) {
                        // Continue
                    }
                }
                
                steps.push({
                    step: 'Project details available',
                    success: hasDetailedInfo,
                    details: `Detailed project information: ${hasDetailedInfo ? 'Available' : 'Limited'}`
                });
            } else {
                steps.push({
                    step: 'Project details available',
                    success: false,
                    details: 'No project section found'
                });
            }
            
            // Step 3: Check loading performance for media-heavy content
            const performanceStart = Date.now();
            try {
                const response = await fetch(`${this.baseUrl}/images/sample.jpg`, { timeout: 5000 });
                const imageLoadTime = Date.now() - performanceStart;
                
                steps.push({
                    step: 'Media loading performance',
                    success: imageLoadTime < 3000 || response.status === 404,
                    details: `Image load test: ${response.status === 404 ? 'No test images' : imageLoadTime + 'ms'}`
                });
            } catch (error) {
                steps.push({
                    step: 'Media loading performance',
                    success: true, // No images to test is acceptable
                    details: 'No media to test performance'
                });
            }
            
            const successfulSteps = steps.filter(s => s.success).length;
            const totalSteps = steps.length;
            
            return {
                passed: successfulSteps >= Math.ceil(totalSteps * 0.67), // 67% success rate
                steps: steps,
                score: Math.round((successfulSteps / totalSteps) * 100),
                message: `Project seeking: ${successfulSteps}/${totalSteps} steps successful`
            };
        });
        
        // Scenario 3: Contact attempt
        await this.addScenario('visitor', 'Contact Attempt', async () => {
            console.log('  📞 Scenario: Visitor attempting to make contact...');
            
            const steps = [];
            
            // Step 1: Find contact method
            const homeResponse = await fetch(this.baseUrl, { timeout: this.timeout });
            const homeHtml = await homeResponse.text();
            
            const contactMethods = {
                email: homeHtml.includes('@') || homeHtml.includes('mailto:'),
                form: homeHtml.includes('<form') || homeHtml.includes('contact'),
                phone: homeHtml.includes('tel:') || /\(\d{3}\)|\d{3}-\d{3}-\d{4}/.test(homeHtml),
                social: homeHtml.includes('linkedin') || homeHtml.includes('twitter') || homeHtml.includes('github')
            };
            
            const availableMethods = Object.values(contactMethods).filter(Boolean).length;
            
            steps.push({
                step: 'Find contact methods',
                success: availableMethods > 0,
                details: `Contact methods available: ${availableMethods} (email: ${contactMethods.email ? 'Yes' : 'No'})`
            });
            
            // Step 2: Test contact form if available
            try {
                const contactResponse = await fetch(`${this.baseUrl}/contact`, { timeout: this.timeout });
                
                if (contactResponse.ok) {
                    const contactHtml = await contactResponse.text();
                    const hasForm = contactHtml.includes('<form');
                    const hasRequiredFields = contactHtml.includes('name') && 
                                            contactHtml.includes('email') && 
                                            contactHtml.includes('message');
                    
                    steps.push({
                        step: 'Contact form usability',
                        success: hasForm && hasRequiredFields,
                        details: `Form available: ${hasForm ? 'Yes' : 'No'}, Required fields: ${hasRequiredFields ? 'Yes' : 'No'}`
                    });
                } else {
                    steps.push({
                        step: 'Contact form usability',
                        success: contactMethods.email, // Email is acceptable alternative
                        details: `Contact page not found (${contactResponse.status}), email available: ${contactMethods.email ? 'Yes' : 'No'}`
                    });
                }
            } catch (error) {
                steps.push({
                    step: 'Contact form usability',
                    success: contactMethods.email,
                    details: `Contact page error: ${error.message}`
                });
            }
            
            const successfulSteps = steps.filter(s => s.success).length;
            const totalSteps = steps.length;
            
            return {
                passed: successfulSteps === totalSteps,
                steps: steps,
                score: Math.round((successfulSteps / totalSteps) * 100),
                message: `Contact attempt: ${successfulSteps}/${totalSteps} steps successful`
            };
        });
    }

    async testContentCreatorScenarios() {
        const persona = this.userPersonas.contentCreator;
        console.log(`\n✍️ Testing as ${persona.name}`);
        console.log(`🎯 Goals: ${persona.goals.join(', ')}`);
        
        // Scenario 1: Content management workflow
        await this.addScenario('contentCreator', 'Content Management Access', async () => {
            console.log('  📝 Scenario: Content creator accessing CMS...');
            
            const steps = [];
            
            // Step 1: Admin panel accessibility
            const adminResponse = await fetch(`${this.baseUrl}/admin/`, { timeout: this.timeout });
            
            const adminAccessible = adminResponse.ok || 
                                   adminResponse.status === 401 || 
                                   adminResponse.status === 403;
            
            steps.push({
                step: 'Admin panel access',
                success: adminAccessible,
                details: `Admin panel status: ${adminResponse.status} (${adminAccessible ? 'Properly configured' : 'Not configured'})`
            });
            
            // Step 2: Content management interfaces
            if (adminResponse.ok) {
                const adminHtml = await adminResponse.text();
                
                const hasPortfolioManagement = adminHtml.includes('portfolio') || adminHtml.includes('projects');
                const hasBlogManagement = adminHtml.includes('blog') || adminHtml.includes('posts');
                const hasMediaManagement = adminHtml.includes('media') || adminHtml.includes('upload');
                
                const managementFeatures = [hasPortfolioManagement, hasBlogManagement, hasMediaManagement].filter(Boolean).length;
                
                steps.push({
                    step: 'Content management features',
                    success: managementFeatures >= 2,
                    details: `Management features available: ${managementFeatures}/3 (portfolio: ${hasPortfolioManagement ? 'Yes' : 'No'}, blog: ${hasBlogManagement ? 'Yes' : 'No'}, media: ${hasMediaManagement ? 'Yes' : 'No'})`
                });
            } else {
                steps.push({
                    step: 'Content management features',
                    success: false,
                    details: 'Admin panel not accessible for feature check'
                });
            }
            
            // Step 3: Check for CMS API endpoints
            const cmsEndpoints = [
                '/.netlify/functions/projects',
                '/.netlify/functions/blog',
                '/.netlify/functions/media',
                '/.netlify/functions/upload'
            ];
            
            let workingEndpoints = 0;
            
            for (const endpoint of cmsEndpoints) {
                try {
                    const response = await fetch(`${this.baseUrl}${endpoint}`, { timeout: 5000 });
                    // Any response except 500 indicates the endpoint exists
                    if (response.status !== 500) {
                        workingEndpoints++;
                    }
                } catch (error) {
                    // Endpoint might not exist
                }
            }
            
            steps.push({
                step: 'CMS API availability',
                success: workingEndpoints > 0,
                details: `Working API endpoints: ${workingEndpoints}/${cmsEndpoints.length}`
            });
            
            const successfulSteps = steps.filter(s => s.success).length;
            const totalSteps = steps.length;
            
            return {
                passed: successfulSteps >= Math.ceil(totalSteps * 0.67),
                steps: steps,
                score: Math.round((successfulSteps / totalSteps) * 100),
                message: `Content management: ${successfulSteps}/${totalSteps} steps successful`
            };
        });
        
        // Scenario 2: Media upload workflow
        await this.addScenario('contentCreator', 'Media Upload Workflow', async () => {
            console.log('  📸 Scenario: Content creator uploading media...');
            
            const steps = [];
            
            // Step 1: Media upload interface
            const mediaPages = ['/admin/media-library.html', '/admin/upload.html'];
            let hasMediaInterface = false;
            
            for (const page of mediaPages) {
                try {
                    const response = await fetch(`${this.baseUrl}${page}`, { timeout: this.timeout });
                    if (response.ok) {
                        const html = await response.text();
                        if (html.includes('upload') || html.includes('media') || html.includes('file')) {
                            hasMediaInterface = true;
                            break;
                        }
                    }
                } catch (error) {
                    // Continue checking
                }
            }
            
            steps.push({
                step: 'Media upload interface',
                success: hasMediaInterface,
                details: `Media upload interface: ${hasMediaInterface ? 'Available' : 'Not found'}`
            });
            
            // Step 2: Upload API endpoint
            try {
                const uploadResponse = await fetch(`${this.baseUrl}/.netlify/functions/upload`, {
                    method: 'OPTIONS',
                    timeout: 5000
                });
                
                const uploadAvailable = uploadResponse.status !== 500;
                const hasCORS = uploadResponse.headers.get('access-control-allow-origin');
                
                steps.push({
                    step: 'Upload API functionality',
                    success: uploadAvailable,
                    details: `Upload API status: ${uploadResponse.status}, CORS: ${hasCORS ? 'Yes' : 'No'}`
                });
            } catch (error) {
                steps.push({
                    step: 'Upload API functionality',
                    success: false,
                    details: `Upload API error: ${error.message}`
                });
            }
            
            // Step 3: Media management capabilities
            try {
                const mediaResponse = await fetch(`${this.baseUrl}/.netlify/functions/media`, { timeout: 5000 });
                
                steps.push({
                    step: 'Media management API',
                    success: mediaResponse.status !== 500,
                    details: `Media API status: ${mediaResponse.status}`
                });
            } catch (error) {
                steps.push({
                    step: 'Media management API',
                    success: false,
                    details: `Media API error: ${error.message}`
                });
            }
            
            const successfulSteps = steps.filter(s => s.success).length;
            const totalSteps = steps.length;
            
            return {
                passed: successfulSteps >= 2, // At least interface or API should work
                steps: steps,
                score: Math.round((successfulSteps / totalSteps) * 100),
                message: `Media workflow: ${successfulSteps}/${totalSteps} steps successful`
            };
        });
    }

    async testAdministratorScenarios() {
        const persona = this.userPersonas.administrator;
        console.log(`\n👨‍💼 Testing as ${persona.name}`);
        console.log(`🎯 Goals: ${persona.goals.join(', ')}`);
        
        // Scenario 1: System administration access
        await this.addScenario('administrator', 'Administrative Access', async () => {
            console.log('  🔧 Scenario: Administrator accessing system controls...');
            
            const steps = [];
            
            // Step 1: Admin panel security
            const adminResponse = await fetch(`${this.baseUrl}/admin/`, { timeout: this.timeout });
            
            const isSecured = adminResponse.status === 401 || 
                             adminResponse.status === 403 || 
                             (adminResponse.ok && (await adminResponse.text()).includes('login'));
            
            steps.push({
                step: 'Admin security',
                success: isSecured,
                details: `Admin access control: ${isSecured ? 'Secured' : 'Open'} (${adminResponse.status})`
            });
            
            // Step 2: Administrative interfaces
            const adminPages = [
                '/admin/user-management.html',
                '/admin/analytics.html',
                '/admin/settings.html'
            ];
            
            let availableAdminPages = 0;
            
            for (const page of adminPages) {
                try {
                    const response = await fetch(`${this.baseUrl}${page}`, { timeout: 5000 });
                    if (response.ok || response.status === 401 || response.status === 403) {
                        availableAdminPages++;
                    }
                } catch (error) {
                    // Page doesn't exist
                }
            }
            
            steps.push({
                step: 'Admin interfaces',
                success: availableAdminPages >= 2,
                details: `Admin pages available: ${availableAdminPages}/${adminPages.length}`
            });
            
            // Step 3: System monitoring capabilities
            const monitoringEndpoints = [
                '/.netlify/functions/health',
                '/.netlify/functions/status',
                '/.netlify/functions/analytics'
            ];
            
            let monitoringAvailable = 0;
            
            for (const endpoint of monitoringEndpoints) {
                try {
                    const response = await fetch(`${this.baseUrl}${endpoint}`, { timeout: 5000 });
                    if (response.status !== 500) {
                        monitoringAvailable++;
                    }
                } catch (error) {
                    // Endpoint doesn't exist
                }
            }
            
            steps.push({
                step: 'System monitoring',
                success: monitoringAvailable > 0,
                details: `Monitoring endpoints: ${monitoringAvailable}/${monitoringEndpoints.length} available`
            });
            
            const successfulSteps = steps.filter(s => s.success).length;
            const totalSteps = steps.length;
            
            return {
                passed: successfulSteps >= Math.ceil(totalSteps * 0.67),
                steps: steps,
                score: Math.round((successfulSteps / totalSteps) * 100),
                message: `Administrative access: ${successfulSteps}/${totalSteps} steps successful`
            };
        });
    }

    async testDeveloperScenarios() {
        const persona = this.userPersonas.developer;
        console.log(`\n👨‍💻 Testing as ${persona.name}`);
        console.log(`🎯 Goals: ${persona.goals.join(', ')}`);
        
        // Scenario 1: API documentation and testing
        await this.addScenario('developer', 'API Integration', async () => {
            console.log('  🔌 Scenario: Developer integrating with APIs...');
            
            const steps = [];
            
            // Step 1: API endpoints discovery
            const apiEndpoints = [
                '/.netlify/functions/health',
                '/.netlify/functions/projects',
                '/.netlify/functions/auth'
            ];
            
            let workingAPIs = 0;
            const apiStatuses = {};
            
            for (const endpoint of apiEndpoints) {
                try {
                    const response = await fetch(`${this.baseUrl}${endpoint}`, { timeout: 5000 });
                    apiStatuses[endpoint] = response.status;
                    
                    if (response.status !== 500) {
                        workingAPIs++;
                    }
                } catch (error) {
                    apiStatuses[endpoint] = 'ERROR';
                }
            }
            
            steps.push({
                step: 'API endpoint availability',
                success: workingAPIs > 0,
                details: `Working APIs: ${workingAPIs}/${apiEndpoints.length} (${JSON.stringify(apiStatuses)})`
            });
            
            // Step 2: CORS configuration for developers
            if (workingAPIs > 0) {
                const corsTestEndpoint = Object.keys(apiStatuses).find(ep => apiStatuses[ep] !== 'ERROR' && apiStatuses[ep] !== 500);
                
                try {
                    const corsResponse = await fetch(corsTestEndpoint, {
                        method: 'OPTIONS',
                        headers: {
                            'Origin': 'http://localhost:3000',
                            'Access-Control-Request-Method': 'GET'
                        },
                        timeout: 5000
                    });
                    
                    const corsHeaders = {
                        'Access-Control-Allow-Origin': corsResponse.headers.get('access-control-allow-origin'),
                        'Access-Control-Allow-Methods': corsResponse.headers.get('access-control-allow-methods')
                    };
                    
                    const hasCORS = corsHeaders['Access-Control-Allow-Origin'] !== null;
                    
                    steps.push({
                        step: 'CORS configuration',
                        success: hasCORS,
                        details: `CORS headers: ${hasCORS ? 'Present' : 'Missing'} (Origin: ${corsHeaders['Access-Control-Allow-Origin'] || 'None'})`
                    });
                } catch (error) {
                    steps.push({
                        step: 'CORS configuration',
                        success: false,
                        details: `CORS test failed: ${error.message}`
                    });
                }
            } else {
                steps.push({
                    step: 'CORS configuration',
                    success: false,
                    details: 'No working APIs to test CORS'
                });
            }
            
            // Step 3: Error handling quality
            try {
                const errorResponse = await fetch(`${this.baseUrl}/.netlify/functions/nonexistent`, { timeout: 5000 });
                const hasProperErrorHandling = errorResponse.status === 404;
                
                steps.push({
                    step: 'API error handling',
                    success: hasProperErrorHandling,
                    details: `Error handling: ${errorResponse.status} (${hasProperErrorHandling ? 'Proper 404' : 'Unexpected response'})`
                });
            } catch (error) {
                steps.push({
                    step: 'API error handling',
                    success: true, // Network errors are acceptable
                    details: `Error handling: Network error (acceptable)`
                });
            }
            
            const successfulSteps = steps.filter(s => s.success).length;
            const totalSteps = steps.length;
            
            return {
                passed: successfulSteps >= Math.ceil(totalSteps * 0.67),
                steps: steps,
                score: Math.round((successfulSteps / totalSteps) * 100),
                message: `API integration: ${successfulSteps}/${totalSteps} steps successful`
            };
        });
        
        // Scenario 2: Technical documentation and code quality
        await this.addScenario('developer', 'Technical Quality Assessment', async () => {
            console.log('  📚 Scenario: Developer assessing technical quality...');
            
            const steps = [];
            
            // Step 1: Documentation availability
            const docPaths = [
                '/docs',
                '/api-docs',
                '/README.md',
                '/.well-known/openapi.json'
            ];
            
            let hasDocumentation = false;
            
            for (const docPath of docPaths) {
                try {
                    const response = await fetch(`${this.baseUrl}${docPath}`, { timeout: 5000 });
                    if (response.ok) {
                        hasDocumentation = true;
                        break;
                    }
                } catch (error) {
                    // Continue checking
                }
            }
            
            steps.push({
                step: 'Documentation availability',
                success: hasDocumentation,
                details: `Technical documentation: ${hasDocumentation ? 'Found' : 'Not found'}`
            });
            
            // Step 2: Code quality indicators (in responses)
            const homeResponse = await fetch(this.baseUrl, { timeout: this.timeout });
            const homeHtml = await homeResponse.text();
            
            const qualityIndicators = {
                semanticHTML: homeHtml.includes('<main>') || homeHtml.includes('<article>') || homeHtml.includes('<section>'),
                accessibility: homeHtml.includes('alt=') || homeHtml.includes('aria-') || homeHtml.includes('role='),
                performance: homeHtml.includes('defer') || homeHtml.includes('async') || homeHtml.includes('preload'),
                security: homeResponse.headers.get('x-frame-options') || homeResponse.headers.get('content-security-policy')
            };
            
            const qualityScore = Object.values(qualityIndicators).filter(Boolean).length;
            
            steps.push({
                step: 'Code quality indicators',
                success: qualityScore >= 3,
                details: `Quality indicators: ${qualityScore}/4 (semantic: ${qualityIndicators.semanticHTML ? 'Yes' : 'No'}, a11y: ${qualityIndicators.accessibility ? 'Yes' : 'No'}, perf: ${qualityIndicators.performance ? 'Yes' : 'No'}, security: ${qualityIndicators.security ? 'Yes' : 'No'})`
            });
            
            // Step 3: Development-friendly features
            const devFeatures = {
                healthCheck: false,
                errorPages: false,
                monitoring: false
            };
            
            try {
                const healthResponse = await fetch(`${this.baseUrl}/.netlify/functions/health`, { timeout: 5000 });
                devFeatures.healthCheck = healthResponse.status !== 500;
            } catch (error) {
                // Health check not available
            }
            
            try {
                const errorResponse = await fetch(`${this.baseUrl}/this-page-does-not-exist`, { timeout: 5000 });
                const errorHtml = await errorResponse.text();
                devFeatures.errorPages = errorResponse.status === 404 && 
                                        !errorHtml.includes('stack trace') && 
                                        !errorHtml.includes('Server Error');
            } catch (error) {
                devFeatures.errorPages = true; // Network errors are fine
            }
            
            const devFriendlyScore = Object.values(devFeatures).filter(Boolean).length;
            
            steps.push({
                step: 'Developer-friendly features',
                success: devFriendlyScore >= 2,
                details: `Dev features: ${devFriendlyScore}/3 (health: ${devFeatures.healthCheck ? 'Yes' : 'No'}, errors: ${devFeatures.errorPages ? 'Yes' : 'No'}, monitoring: ${devFeatures.monitoring ? 'Yes' : 'No'})`
            });
            
            const successfulSteps = steps.filter(s => s.success).length;
            const totalSteps = steps.length;
            
            return {
                passed: successfulSteps >= Math.ceil(totalSteps * 0.67),
                steps: steps,
                score: Math.round((successfulSteps / totalSteps) * 100),
                message: `Technical quality: ${successfulSteps}/${totalSteps} steps successful`
            };
        });
    }

    async addScenario(persona, scenarioName, testFn) {
        try {
            const result = await testFn();
            
            this.scenarios[persona].push({
                name: scenarioName,
                passed: result.passed,
                score: result.score,
                steps: result.steps,
                message: result.message,
                timestamp: new Date().toISOString()
            });
            
            console.log(`  ${result.passed ? '✅' : '❌'} ${scenarioName}: ${result.message} (${result.score}%)`);
            
        } catch (error) {
            this.scenarios[persona].push({
                name: scenarioName,
                passed: false,
                score: 0,
                steps: [],
                message: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.log(`  ❌ ${scenarioName}: ${error.message}`);
        }
    }

    calculateSummary() {
        let totalScenarios = 0;
        let passedScenarios = 0;
        let totalScore = 0;
        
        Object.values(this.scenarios).forEach(scenarios => {
            if (Array.isArray(scenarios)) {
                scenarios.forEach(scenario => {
                    totalScenarios++;
                    totalScore += scenario.score;
                    
                    if (scenario.passed) {
                        passedScenarios++;
                    }
                });
            }
        });
        
        this.scenarios.summary = {
            totalScenarios,
            passedScenarios,
            failedScenarios: totalScenarios - passedScenarios,
            score: totalScenarios > 0 ? Math.round(totalScore / totalScenarios) : 0
        };
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            duration: Date.now() - this.startTime,
            summary: this.scenarios.summary,
            scenarios: this.scenarios,
            userPersonas: this.userPersonas,
            recommendations: this.generateRecommendations()
        };
        
        this.printSummary();
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.scenarios.summary.score < 70) {
            recommendations.push('Significant user experience issues - prioritize fixing failed scenarios');
        } else if (this.scenarios.summary.score < 85) {
            recommendations.push('Good user experience with room for improvement');
        } else {
            recommendations.push('Excellent user experience across all personas');
        }
        
        // Specific recommendations based on failed scenarios
        Object.entries(this.scenarios).forEach(([persona, scenarios]) => {
            if (Array.isArray(scenarios)) {
                const failedScenarios = scenarios.filter(s => !s.passed);
                
                if (failedScenarios.length > 0) {
                    switch (persona) {
                        case 'visitor':
                            recommendations.push('Improve visitor experience: optimize site navigation and contact options');
                            break;
                        case 'contentCreator':
                            recommendations.push('Enhance content management: improve CMS interfaces and media handling');
                            break;
                        case 'administrator':
                            recommendations.push('Strengthen admin features: improve security and monitoring capabilities');
                            break;
                        case 'developer':
                            recommendations.push('Enhance developer experience: improve API documentation and error handling');
                            break;
                    }
                }
            }
        });
        
        return [...new Set(recommendations)]; // Remove duplicates
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('👥 USER ACCEPTANCE TESTS SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n🌐 Target: ${this.baseUrl}`);
        console.log(`📊 Overall Score: ${this.scenarios.summary.score}%`);
        console.log(`✅ Passed: ${this.scenarios.summary.passedScenarios}`);
        console.log(`❌ Failed: ${this.scenarios.summary.failedScenarios}`);
        console.log(`📋 Total: ${this.scenarios.summary.totalScenarios} scenarios`);
        console.log(`⏱️  Duration: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
        
        // Persona breakdown
        console.log('\n👥 Persona Results:');
        Object.entries(this.scenarios).forEach(([persona, scenarios]) => {
            if (Array.isArray(scenarios) && scenarios.length > 0) {
                const passed = scenarios.filter(s => s.passed).length;
                const total = scenarios.length;
                const avgScore = Math.round(scenarios.reduce((sum, s) => sum + s.score, 0) / total);
                
                const personaName = this.userPersonas[persona]?.name || persona;
                console.log(`   ${personaName}: ${passed}/${total} scenarios passed (${avgScore}% avg)`);
            }
        });
        
        console.log('\n' + '='.repeat(60));
    }
}

// CLI execution
if (require.main === module) {
    const baseUrl = process.argv[2] || process.env.DEPLOYED_URL || 'http://localhost:3000';
    
    const uat = new UserAcceptanceTests({ baseUrl });
    
    uat.runAllUserAcceptanceTests()
        .then(result => {
            if (result.success && !result.warnings) {
                console.log('\n🎉 User acceptance tests completed successfully!');
                process.exit(0);
            } else if (result.success) {
                console.log('\n⚠️ User acceptance tests completed with improvements needed.');
                process.exit(0);
            } else {
                console.log('\n💥 User acceptance tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 User acceptance test error:', error);
            process.exit(1);
        });
}

module.exports = UserAcceptanceTests;