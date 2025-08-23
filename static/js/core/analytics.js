// Analytics Tracking Module for Portfolio Site
(function() {
    'use strict';
    
    const Analytics = {
        // Configuration
        config: {
            endpoint: '/api/analytics',
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            heartbeatInterval: 60 * 1000, // 1 minute
            scrollDepthThresholds: [25, 50, 75, 100],
            debug: false
        },
        
        // Session data
        session: {
            id: null,
            startTime: null,
            pageViews: [],
            events: [],
            scrollDepth: 0,
            timeOnPage: 0
        },
        
        // Initialize analytics
        init() {
            if (this.isBot()) return;
            
            this.startSession();
            this.trackPageView();
            this.setupEventListeners();
            this.startHeartbeat();
            
            if (this.config.debug) {
                console.log('Analytics initialized', this.session);
            }
        },
        
        // Check if visitor is a bot
        isBot() {
            const botPatterns = /bot|crawler|spider|crawling/i;
            return botPatterns.test(navigator.userAgent);
        },
        
        // Start a new session
        startSession() {
            const storedSession = this.getStoredSession();
            
            if (storedSession && this.isSessionValid(storedSession)) {
                this.session = storedSession;
            } else {
                this.session.id = this.generateSessionId();
                this.session.startTime = Date.now();
                this.storeSession();
            }
        },
        
        // Generate unique session ID
        generateSessionId() {
            return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        // Check if stored session is still valid
        isSessionValid(session) {
            const now = Date.now();
            const lastActivity = session.lastActivity || session.startTime;
            return (now - lastActivity) < this.config.sessionTimeout;
        },
        
        // Get stored session from localStorage
        getStoredSession() {
            try {
                const stored = localStorage.getItem('analytics_session');
                return stored ? JSON.parse(stored) : null;
            } catch (e) {
                return null;
            }
        },
        
        // Store session in localStorage
        storeSession() {
            try {
                this.session.lastActivity = Date.now();
                localStorage.setItem('analytics_session', JSON.stringify(this.session));
            } catch (e) {
                // Silent fail for privacy mode
            }
        },
        
        // Track page view
        trackPageView() {
            const pageView = {
                url: window.location.href,
                path: window.location.pathname,
                title: document.title,
                referrer: document.referrer,
                timestamp: Date.now(),
                screenResolution: `${screen.width}x${screen.height}`,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                deviceType: this.getDeviceType()
            };
            
            this.session.pageViews.push(pageView);
            this.sendData('pageview', pageView);
        },
        
        // Track custom event
        trackEvent(category, action, label = null, value = null) {
            const event = {
                category,
                action,
                label,
                value,
                timestamp: Date.now()
            };
            
            this.session.events.push(event);
            this.sendData('event', event);
        },
        
        // Get device type
        getDeviceType() {
            const width = window.innerWidth;
            if (width < 768) return 'mobile';
            if (width < 1024) return 'tablet';
            return 'desktop';
        },
        
        // Setup event listeners
        setupEventListeners() {
            // Track link clicks
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link) {
                    const href = link.getAttribute('href');
                    if (href) {
                        const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
                        this.trackEvent('Link', isExternal ? 'External' : 'Internal', href);
                    }
                }
            });
            
            // Track form submissions
            document.addEventListener('submit', (e) => {
                const form = e.target;
                const formName = form.getAttribute('name') || form.getAttribute('id') || 'unnamed';
                this.trackEvent('Form', 'Submit', formName);
            });
            
            // Track scroll depth
            let maxScroll = 0;
            let scrollTimer = null;
            
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    const scrollPercent = this.getScrollPercent();
                    
                    this.config.scrollDepthThresholds.forEach(threshold => {
                        if (scrollPercent >= threshold && maxScroll < threshold) {
                            this.trackEvent('Scroll', 'Depth', `${threshold}%`);
                            maxScroll = threshold;
                        }
                    });
                    
                    this.session.scrollDepth = Math.max(this.session.scrollDepth, scrollPercent);
                }, 100);
            });
            
            // Track page visibility
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.trackEvent('Page', 'Hidden');
                    this.pauseTimer();
                } else {
                    this.trackEvent('Page', 'Visible');
                    this.resumeTimer();
                }
            });
            
            // Track page unload
            window.addEventListener('beforeunload', () => {
                this.trackEvent('Page', 'Unload', null, this.session.timeOnPage);
                this.sendData('session', this.session, false);
            });
        },
        
        // Get scroll percentage
        getScrollPercent() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            return Math.round((scrollTop / scrollHeight) * 100);
        },
        
        // Start heartbeat timer
        startHeartbeat() {
            this.heartbeatTimer = setInterval(() => {
                this.session.timeOnPage += this.config.heartbeatInterval;
                this.storeSession();
                
                // Send heartbeat
                this.sendData('heartbeat', {
                    sessionId: this.session.id,
                    timeOnPage: this.session.timeOnPage,
                    scrollDepth: this.session.scrollDepth
                });
            }, this.config.heartbeatInterval);
        },
        
        // Pause timer
        pauseTimer() {
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = null;
            }
        },
        
        // Resume timer
        resumeTimer() {
            if (!this.heartbeatTimer) {
                this.startHeartbeat();
            }
        },
        
        // Send data to server
        async sendData(type, data, async = true) {
            const payload = {
                type,
                sessionId: this.session.id,
                data,
                timestamp: Date.now(),
                url: window.location.href
            };
            
            if (this.config.debug) {
                console.log('Analytics event:', payload);
            }
            
            // Use sendBeacon for unload events
            if (!async && navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(this.config.endpoint, blob);
                return;
            }
            
            // Regular async request
            try {
                const response = await fetch(this.config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok && this.config.debug) {
                    console.error('Analytics request failed:', response.status);
                }
            } catch (error) {
                if (this.config.debug) {
                    console.error('Analytics error:', error);
                }
            }
        },
        
        // Public API
        api: {
            trackEvent(category, action, label, value) {
                Analytics.trackEvent(category, action, label, value);
            },
            
            trackGoal(goalName, value) {
                Analytics.trackEvent('Goal', goalName, null, value);
            },
            
            setUserId(userId) {
                Analytics.session.userId = userId;
                Analytics.storeSession();
            },
            
            setCustomData(key, value) {
                if (!Analytics.session.customData) {
                    Analytics.session.customData = {};
                }
                Analytics.session.customData[key] = value;
                Analytics.storeSession();
            }
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Analytics.init());
    } else {
        Analytics.init();
    }
    
    // Expose public API
    window.Analytics = Analytics.api;
})();