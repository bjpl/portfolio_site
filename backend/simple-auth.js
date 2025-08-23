const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Simple file-based user storage
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users file with admin account
async function initUsers() {
    try {
        await fs.access(USERS_FILE);
    } catch {
        // Create default admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const users = [{
            id: 1,
            email: 'admin@portfolio.com',
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            firstName: 'Admin',
            lastName: 'User'
        }];
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        console.log('Created default admin user:');
        console.log('Email: admin@portfolio.com');
        console.log('Password: admin123');
    }
}

// Load users from file
async function getUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'simple-auth'
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

        const users = await getUsers();
        const user = users.find(u => 
            u.email === email || u.username === email
        );

        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { 
                id: user.id, 
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
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
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

// Logout endpoint (just for completeness)
app.post('/api/auth/logout', (req, res) => {
    res.json({ 
        message: 'Logged out successfully' 
    });
});

// Generic API endpoint for other routes (returns success)
app.all('/api/*', (req, res) => {
    res.json({ 
        message: 'API endpoint placeholder', 
        path: req.path 
    });
});

// Start server
async function start() {
    await initUsers();
    app.listen(PORT, () => {
        console.log(`Simple auth server running on http://localhost:${PORT}`);
        console.log('Health check: http://localhost:3001/api/health');
        console.log('Login endpoint: http://localhost:3001/api/auth/login');
    });
}

start().catch(console.error);