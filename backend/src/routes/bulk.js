const express = require('express');
const router = express.Router();

router.post('/images', (req, res) => {
    res.json({ status: 'success', files: [] });
});

router.post('/youtube', (req, res) => {
    res.json({ status: 'success', files: [] });
});

router.post('/generate', (req, res) => {
    res.json({ status: 'success', output: 'Generated content...' });
});

module.exports = router;
