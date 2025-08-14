// Simple authentication middleware
module.exports = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    // Skip auth in development
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
};
