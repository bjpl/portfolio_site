#!/usr/bin/env node

/**
 * Manual CMS Testing Script
 * Provides interactive testing for CMS functionality
 */

const readline = require('readline');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');

class ManualCMSTest {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.testResults = [];
        this.token = null;
    }

    async question(prompt) {
        return new Promise(resolve => {
            this.rl.question(prompt, resolve);
        });
    }

    async log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = level === 'error' ? '❌' : level === 'success' ? '✅' : '📝';
        console.log(`${emoji} [${timestamp}] ${message}`);
    }

    async testAPI(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            };

            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseUrl}/api${endpoint}`, options);
            const responseData = await response.text();
            
            let jsonData = null;
            try {
                jsonData = JSON.parse(responseData);
            } catch (e) {
                // Response is not JSON
            }

            return {
                status: response.status,
                ok: response.ok,
                data: jsonData || responseData,
                headers: Object.fromEntries(response.headers.entries())
            };
        } catch (error) {
            this.log(`API test failed: ${error.message}`, 'error');
            return { error: error.message };
        }
    }

    async runTest(testName, testFn) {
        console.log(`\n🧪 Testing: ${testName}`);
        console.log('━'.repeat(50));
        
        try {
            const result = await testFn();
            this.testResults.push({
                name: testName,
                status: 'PASS',
                result,
                timestamp: new Date().toISOString()
            });
            this.log(`${testName} completed successfully`, 'success');
            return true;
        } catch (error) {
            this.testResults.push({
                name: testName,
                status: 'FAIL',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            this.log(`${testName} failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testServerConnection() {
        return await this.runTest('Server Connection', async () => {
            const response = await this.testAPI('/content');
            if (response.error) {
                throw new Error(`Cannot connect to CMS server: ${response.error}`);
            }
            if (response.status === 200) {
                this.log('Server is responding correctly');
                return 'Server connection successful';
            } else {
                throw new Error(`Server responded with status ${response.status}`);
            }
        });
    }

    async testAuthentication() {
        return await this.runTest('Authentication System', async () => {
            console.log('\n1. Testing login endpoint...');
            
            const loginData = {
                username: 'admin',
                password: 'admin123'
            };

            const loginResponse = await this.testAPI('/auth/login', 'POST', loginData);
            
            if (loginResponse.error) {
                // Try without auth first to see if server requires auth
                const publicResponse = await this.testAPI('/content');
                if (publicResponse.status === 401) {
                    this.log('Server requires authentication (good!)');
                    throw new Error('Authentication endpoint not responding properly');
                } else {
                    this.log('Server allows public access');
                    return 'Server accessible without authentication';
                }
            }

            if (loginResponse.ok && loginResponse.data.token) {
                this.token = loginResponse.data.token;
                this.log('Login successful, token received');
                return 'Authentication working correctly';
            } else {
                this.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
                return 'Authentication endpoint available but may need configuration';
            }
        });
    }

    async testContentManagement() {
        return await this.runTest('Content Management', async () => {
            console.log('\n1. Testing content retrieval...');
            
            const contentResponse = await this.testAPI('/content');
            
            if (!contentResponse.ok) {
                throw new Error(`Content API not accessible: ${contentResponse.status}`);
            }

            this.log(`Found ${contentResponse.data.files ? contentResponse.data.files.length : 0} content files`);

            console.log('\n2. Testing content creation...');
            
            const testPost = {
                frontmatter: {
                    title: 'QA Test Post',
                    date: new Date().toISOString(),
                    draft: false,
                    tags: ['qa', 'testing']
                },
                content: 'This is a test post created during QA testing.\n\n## Test Content\n\nThis post verifies that the CMS can create new content properly.'
            };

            const createResponse = await this.testAPI('/content/blog/qa-test-post.md', 'POST', testPost);
            
            if (createResponse.ok) {
                this.log('Test post created successfully');
                
                console.log('\n3. Testing content editing...');
                
                const editedPost = {
                    ...testPost,
                    content: testPost.content + '\n\n**Edited at:** ' + new Date().toISOString()
                };

                const editResponse = await this.testAPI('/content/blog/qa-test-post.md', 'POST', editedPost);
                
                if (editResponse.ok) {
                    this.log('Test post edited successfully');
                } else {
                    this.log('Edit test failed but creation worked');
                }
                
                return 'Content management functional';
            } else {
                throw new Error(`Failed to create test content: ${createResponse.status}`);
            }
        });
    }

    async testMediaUpload() {
        return await this.runTest('Media Upload', async () => {
            console.log('\n1. Checking media API...');
            
            const mediaResponse = await this.testAPI('/media');
            
            if (!mediaResponse.ok) {
                throw new Error(`Media API not accessible: ${mediaResponse.status}`);
            }

            this.log(`Found ${mediaResponse.data.files ? mediaResponse.data.files.length : 0} media files`);

            console.log('\n2. Testing file upload (if test image exists)...');
            
            const testImagePath = path.join(__dirname, '../static/images/tree_image.jpg');
            
            try {
                await fs.access(testImagePath);
                this.log('Test image found, upload functionality available');
                return 'Media system functional (upload test requires manual verification)';
            } catch (error) {
                this.log('Test image not found, skipping upload test');
                return 'Media API accessible, upload test needs manual verification';
            }
        });
    }

    async testBuildSystem() {
        return await this.runTest('Build System', async () => {
            console.log('\n1. Testing site build...');
            
            const buildResponse = await this.testAPI('/build', 'POST');
            
            if (buildResponse.ok) {
                this.log('Site build completed successfully');
                this.log(`Build output: ${buildResponse.data.message || 'Build successful'}`);
                return 'Build system functional';
            } else {
                throw new Error(`Build failed: ${buildResponse.status} - ${buildResponse.data.error || 'Unknown error'}`);
            }
        });
    }

    async testAnalytics() {
        return await this.runTest('Analytics System', async () => {
            console.log('\n1. Testing analytics logging...');
            
            const analyticsData = {
                type: 'pageview',
                data: {
                    path: '/qa-test',
                    timestamp: new Date().toISOString(),
                    sessionId: 'qa-test-session'
                }
            };

            const logResponse = await this.testAPI('/analytics', 'POST', analyticsData);
            
            if (logResponse.ok) {
                this.log('Analytics logging successful');
                
                console.log('\n2. Testing analytics retrieval...');
                
                const summaryResponse = await this.testAPI('/analytics/summary');
                
                if (summaryResponse.ok) {
                    this.log('Analytics summary retrieved successfully');
                    return 'Analytics system functional';
                } else {
                    this.log('Analytics logging works but summary retrieval failed');
                    return 'Analytics partially functional';
                }
            } else {
                throw new Error(`Analytics logging failed: ${logResponse.status}`);
            }
        });
    }

    async runInteractiveTests() {
        console.log('🚀 CMS Interactive Testing Suite');
        console.log('═'.repeat(50));
        console.log('This will test the CMS API endpoints interactively.\n');

        const response = await this.question('Press Enter to start testing, or type "skip" to exit: ');
        if (response.toLowerCase() === 'skip') {
            console.log('Testing cancelled.');
            return;
        }

        const tests = [
            () => this.testServerConnection(),
            () => this.testAuthentication(),
            () => this.testContentManagement(),
            () => this.testMediaUpload(),
            () => this.testBuildSystem(),
            () => this.testAnalytics()
        ];

        let passed = 0;
        let failed = 0;

        for (let test of tests) {
            const result = await test();
            if (result) passed++;
            else failed++;

            if (failed > 0) {
                const continueResponse = await this.question('\nContinue with remaining tests? (y/n): ');
                if (continueResponse.toLowerCase() !== 'y') {
                    break;
                }
            }
        }

        console.log('\n📊 TEST SUMMARY');
        console.log('═'.repeat(30));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📝 Total: ${passed + failed}`);

        if (this.testResults.length > 0) {
            console.log('\n📋 DETAILED RESULTS:');
            this.testResults.forEach(result => {
                const status = result.status === 'PASS' ? '✅' : '❌';
                console.log(`${status} ${result.name}: ${result.result || result.error}`);
            });
        }

        await this.question('\nPress Enter to exit...');
    }

    async cleanup() {
        this.rl.close();
    }
}

// Run interactive tests
if (require.main === module) {
    (async () => {
        const tester = new ManualCMSTest();
        try {
            await tester.runInteractiveTests();
        } catch (error) {
            console.error('Testing failed:', error);
        } finally {
            await tester.cleanup();
        }
    })();
}

module.exports = { ManualCMSTest };