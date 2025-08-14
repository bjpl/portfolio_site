const express = require('express');
const router = express.Router();

router.get('/content', (req, res) => {
    res.json([
        {
            id: '1',
            title: 'Test Post',
            status: 'draft',
            modified: '2 hours ago',
            wordCount: 500,
            path: 'test/post.md'
        }
    ]);
});

router.get('/content/:id', (req, res) => {
    res.json({
        id: req.params.id,
        title: 'Test Post',
        content: '# Test Content',
        status: 'draft'
    });
});

router.post('/content/:id/save', (req, res) => {
    res.json({ status: 'success' });
});

router.post('/quality', (req, res) => {
    res.json({
        score: 85,
        checks: [
            { status: 'pass', message: 'Title present', type: 'title' }
        ]
    });
});

module.exports = router;
