// Simple Analytics Tracker for Portfolio Site
(function() {
    'use strict';
    
    // Generate or retrieve session ID
    function getSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }
    
    // Track page view
    function trackPageView() {
        const data = {
            type: 'pageview',
            data: {
                path: window.location.pathname,
                referrer: document.referrer,
                sessionId: getSessionId(),
                timestamp: new Date().toISOString(),
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                userAgent: navigator.userAgent
            }
        };
        
        // Send to backend
        fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch(err => {
            // Silently fail - don't break site if analytics fails
            console.debug('Analytics tracking failed:', err);
        });
    }
    
    // Track clicks on important elements
    function trackClick(element, label) {
        const data = {
            type: 'click',
            data: {
                label: label,
                path: window.location.pathname,
                sessionId: getSessionId(),
                timestamp: new Date().toISOString()
            }
        };
        
        fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch(err => {
            console.debug('Click tracking failed:', err);
        });
    }
    
    // Initialize tracking
    function init() {
        // Track initial page view
        trackPageView();
        
        // Track navigation clicks
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#')) {
                    trackClick(link, 'navigation: ' + (link.textContent || href));
                }
            }
            
            // Track CTA buttons
            if (e.target.matches('.cta, .btn-primary, [data-track]')) {
                trackClick(e.target, e.target.getAttribute('data-track') || e.target.textContent);
            }
        });
        
        // Track form submissions
        document.addEventListener('submit', function(e) {
            if (e.target.tagName === 'FORM') {
                trackClick(e.target, 'form: ' + (e.target.id || 'unknown'));
            }
        });
    }
    
    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();