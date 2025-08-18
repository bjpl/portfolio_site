// Test authentication flow
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testAuth() {
    console.log('🔍 Testing Authentication Flow...\n');
    
    // 1. Test login
    console.log('1. Testing login endpoint...');
    try {
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                emailOrUsername: 'admin',
                password: 'password123'
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok && loginData.accessToken) {
            console.log('✅ Login successful!');
            console.log(`   User: ${loginData.user.username}`);
            console.log(`   Token: ${loginData.accessToken.substring(0, 50)}...`);
            
            // 2. Test token validation
            console.log('\n2. Testing token validation...');
            const meResponse = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${loginData.accessToken}`
                }
            });
            
            if (meResponse.ok) {
                const meData = await meResponse.json();
                console.log('✅ Token is valid!');
                console.log(`   User verified: ${meData.user.username}`);
            } else {
                console.log('❌ Token validation failed');
            }
            
            // 3. Test protected endpoint
            console.log('\n3. Testing protected endpoint...');
            const statsResponse = await fetch(`${API_BASE}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${loginData.accessToken}`
                }
            });
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                console.log('✅ Protected endpoint accessible!');
                console.log('   Dashboard stats:', statsData);
            } else {
                console.log('❌ Protected endpoint failed');
            }
            
        } else {
            console.log('❌ Login failed:', loginData.error || 'Unknown error');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('\n✨ Authentication test complete!');
}

testAuth();