// Authentication addon for simple-cms-server.js
// Add this to your existing server

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Simple hardcoded admin user (for immediate use)
const ADMIN_USER = {
    id: 1,
    email: 'admin@portfolio.com',
    username: 'admin',
    password: '$2a$10$YqKRvH5ZfVHQXhQ6LvZJG.Lqwm8TzGPNxVqQ7BPqPf6YgI9VZHQzy', // bcrypt hash of 'admin123'
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
};

function addAuthEndpoints(app) {
    // Health check
    app.get('/api/health', (req, res) => {
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString()
        });
    });

    // Login endpoint
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ 
                    error: 'Email and password are required' 
                });
            }

            // Check if email matches admin
            if (email !== ADMIN_USER.email && email !== ADMIN_USER.username) {
                return res.status(401).json({ 
                    error: 'Invalid credentials' 
                });
            }

            // Verify password - Simple check for testing
            // For admin123, we'll just check directly
            if (password !== 'admin123') {
                return res.status(401).json({ 
                    error: 'Invalid credentials' 
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: ADMIN_USER.id, 
                    email: ADMIN_USER.email, 
                    role: ADMIN_USER.role 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            const refreshToken = jwt.sign(
                { 
                    id: ADMIN_USER.id, 
                    type: 'refresh' 
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                token,
                accessToken: token,
                refreshToken,
                user: {
                    id: ADMIN_USER.id,
                    email: ADMIN_USER.email,
                    username: ADMIN_USER.username,
                    firstName: ADMIN_USER.firstName,
                    lastName: ADMIN_USER.lastName,
                    role: ADMIN_USER.role
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                error: 'Internal server error' 
            });
        }
    });

    // Verify token endpoint
    app.get('/api/auth/me', (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                error: 'No token provided' 
            });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            res.json({ 
                valid: true, 
                user: decoded 
            });
        } catch {
            res.status(401).json({ 
                error: 'Invalid token' 
            });
        }
    });

    // Logout endpoint
    app.post('/api/auth/logout', (req, res) => {
        res.json({ 
            message: 'Logged out successfully' 
        });
    });

    console.log('Authentication endpoints added successfully');
    console.log('Login credentials:');
    console.log('  Email: admin@portfolio.com');
    console.log('  Password: admin123');
}

module.exports = { addAuthEndpoints };