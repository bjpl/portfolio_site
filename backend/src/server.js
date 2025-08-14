const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins during development
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import routes
try {
    const dashboardRoutes = require('./routes/dashboard');
    const reviewRoutes = require('./routes/review');
    const bulkRoutes = require('./routes/bulk');
    
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/review', reviewRoutes);
    app.use('/api/bulk', bulkRoutes);
} catch (err) {
    console.log('Routes not yet created, using fallback');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        hugoServer: 'stopped'
    });
});

// Bind to 0.0.0.0 to accept connections from any interface
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ API Server running on http://localhost:${PORT}`);
    console.log(`📝 Test health: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Also available at: http://127.0.0.1:${PORT}/api/health`);
});
