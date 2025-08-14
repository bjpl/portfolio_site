const express = require('express');
const router = express.Router();

router.get('/stats', (req, res) => {
    res.json({
        posts: 42,
        pages: 8,
        drafts: 5,
        buildTime: '1.2s',
        lastBuild: new Date().toISOString()
    });
});

router.post('/server/start', (req, res) => {
    res.json({ status: 'started', url: 'http://localhost:1313' });
});

router.post('/server/stop', (req, res) => {
    res.json({ status: 'stopped' });
});

router.post('/build', (req, res) => {
    res.json({ status: 'success', time: '1.2s' });
});

router.post('/create', (req, res) => {
    res.json({ status: 'success', file: 'test.md' });
});

module.exports = router;
