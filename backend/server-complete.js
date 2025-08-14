const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        hugoServer: 'stopped'
    });
});

// ============================================
// DASHBOARD ROUTES
// ============================================
app.get('/api/dashboard/stats', (req, res) => {
    console.log('Stats endpoint hit');
    res.json({
        posts: 42,
        pages: 8,
        drafts: 5,
        buildTime: '1.2s',
        lastBuild: new Date().toISOString()
    });
});

app.post('/api/dashboard/server/start', (req, res) => {
    res.json({ 
        status: 'started', 
        url: 'http://localhost:1313' 
    });
});

app.post('/api/dashboard/server/stop', (req, res) => {
    res.json({ status: 'stopped' });
});

app.post('/api/dashboard/build', (req, res) => {
    res.json({ 
        status: 'success', 
        time: '1.2s' 
    });
});

app.post('/api/dashboard/create', (req, res) => {
    const { title = 'New Post' } = req.body;
    res.json({ 
        status: 'success', 
        file: `${title.toLowerCase().replace(/\s+/g, '-')}.md`,
        path: `/content/${title.toLowerCase().replace(/\s+/g, '-')}.md`
    });
});

// ============================================
// REVIEW ROUTES
// ============================================
app.get('/api/review/content', (req, res) => {
    console.log('Content list endpoint hit');
    res.json([
        {
            id: '1',
            title: 'Getting Started with Hugo',
            status: 'published',
            modified: '2 hours ago',
            wordCount: 1234,
            path: 'learn/built/getting-started.md'
        },
        {
            id: '2',
            title: 'React Best Practices',
            status: 'draft',
            modified: 'yesterday',
            wordCount: 892,
            path: 'learn/built/react-best-practices.md'
        },
        {
            id: '3',
            title: 'Portfolio Redesign',
            status: 'review',
            modified: '3 days ago',
            wordCount: 567,
            path: 'meet/work/portfolio-redesign.md'
        }
    ]);
});

app.get('/api/review/content/:id', (req, res) => {
    res.json({
        id: req.params.id,
        title: 'Sample Post',
        frontMatter: '---\ntitle: "Sample Post"\ndate: 2024-01-15\ndraft: false\n---',
        content: '# Sample Content\n\nThis is sample content for testing.',
        status: 'draft',
        metadata: {
            section: 'learn/built',
            tags: ['hugo', 'tutorial'],
            categories: ['development'],
            author: 'Content Team',
            readingTime: '5 minutes'
        }
    });
});

app.post('/api/review/content/:id/save', (req, res) => {
    console.log('Saving content:', req.params.id);
    res.json({ 
        status: 'success',
        message: 'Content saved successfully'
    });
});

app.post('/api/review/quality', (req, res) => {
    const { content = '', title = '' } = req.body;
    const wordCount = content.split(/\s+/).length;
    
    res.json({
        score: 85,
        checks: [
            { 
                status: title ? 'pass' : 'fail', 
                message: title ? 'Title present' : 'Missing title', 
                type: 'title' 
            },
            { 
                status: wordCount > 100 ? 'pass' : 'warning', 
                message: `Word count: ${wordCount}`, 
                type: 'wordcount' 
            },
            { 
                status: 'pass', 
                message: 'Valid structure', 
                type: 'structure' 
            }
        ]
    });
});

// ============================================
// BULK UPLOAD ROUTES
// ============================================
app.post('/api/bulk/images', (req, res) => {
    console.log('Image upload endpoint hit');
    res.json({ 
        status: 'success', 
        files: ['image1.jpg', 'image2.png'],
        message: 'Images uploaded successfully'
    });
});

app.post('/api/bulk/youtube', (req, res) => {
    const { videoIds = [] } = req.body;
    res.json({ 
        status: 'success', 
        files: videoIds.map(id => ({
            videoId: id,
            path: `/content/youtube-${id}.md`
        })),
        message: `Processed ${videoIds.length} YouTube videos`
    });
});

app.post('/api/bulk/generate', (req, res) => {
    const { items = [] } = req.body;
    res.json({ 
        status: 'success', 
        output: `# Generated Hugo Content\n\n${items.length} items processed`,
        message: 'Content generated successfully'
    });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((req, res) => {
    console.log('404 - Route not found:', req.path);
    res.status(404).json({ 
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '127.0.0.1', () => {
    console.log('=====================================');
    console.log('✅ Hugo Management API Server');
    console.log('=====================================');
    console.log(`🚀 Server: http://127.0.0.1:${PORT}`);
    console.log(`📊 Health: http://127.0.0.1:${PORT}/api/health`);
    console.log(`📈 Stats:  http://127.0.0.1:${PORT}/api/dashboard/stats`);
    console.log(`📝 Content: http://127.0.0.1:${PORT}/api/review/content`);
    console.log('=====================================');
});
