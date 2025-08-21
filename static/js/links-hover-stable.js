// Stable hover menu implementation with proper event handling
(function() {
    'use strict';
    
    // Configuration
    const HOVER_DELAY = 200; // ms to wait before showing menu
    const HIDE_DELAY = 300;  // ms to wait before hiding menu
    
    // State management
    const hoverState = new Map(); // Track hover state per element
    const timers = new Map();     // Track timers per element
    
    /**
     * Initialize hover menus for all link items
     */
    function initHoverMenus() {
        const linkItems = document.querySelectorAll('.link-item-wrapper');
        
        linkItems.forEach(link => {
            const hoverMenu = link.querySelector('.hover-menu');
            if (!hoverMenu) return;
            
            // Initialize state
            hoverState.set(link, false);
            
            // Set up event listeners
            setupHoverListeners(link, hoverMenu);
        });
    }
    
    /**
     * Set up hover event listeners for a link and its menu
     */
    function setupHoverListeners(link, menu) {
        // Mouse enter on link
        link.addEventListener('mouseenter', () => {
            clearHideTimer(link);
            setShowTimer(link, menu);
        });
        
        // Mouse leave from link
        link.addEventListener('mouseleave', (e) => {
            // Check if we're moving to the hover menu
            const toElement = e.relatedTarget;
            if (toElement && menu.contains(toElement)) {
                return; // Don't hide if moving to menu
            }
            clearShowTimer(link);
            setHideTimer(link, menu);
        });
        
        // Mouse enter on menu
        menu.addEventListener('mouseenter', () => {
            clearHideTimer(link);
            showMenu(link, menu);
        });
        
        // Mouse leave from menu
        menu.addEventListener('mouseleave', (e) => {
            // Check if we're moving back to the link
            const toElement = e.relatedTarget;
            if (toElement && link.contains(toElement)) {
                return; // Don't hide if moving to link
            }
            setHideTimer(link, menu);
        });
        
        // Prevent menu clicks from bubbling to link
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    /**
     * Show menu after delay
     */
    function setShowTimer(link, menu) {
        clearShowTimer(link);
        
        const timer = setTimeout(() => {
            showMenu(link, menu);
        }, HOVER_DELAY);
        
        timers.set(`show-${link.id || Math.random()}`, timer);
    }
    
    /**
     * Hide menu after delay
     */
    function setHideTimer(link, menu) {
        clearHideTimer(link);
        
        const timer = setTimeout(() => {
            hideMenu(link, menu);
        }, HIDE_DELAY);
        
        timers.set(`hide-${link.id || Math.random()}`, timer);
    }
    
    /**
     * Clear show timer
     */
    function clearShowTimer(link) {
        const key = `show-${link.id || Math.random()}`;
        const timer = timers.get(key);
        if (timer) {
            clearTimeout(timer);
            timers.delete(key);
        }
    }
    
    /**
     * Clear hide timer
     */
    function clearHideTimer(link) {
        const key = `hide-${link.id || Math.random()}`;
        const timer = timers.get(key);
        if (timer) {
            clearTimeout(timer);
            timers.delete(key);
        }
    }
    
    /**
     * Show the hover menu
     */
    function showMenu(link, menu) {
        if (hoverState.get(link)) return; // Already visible
        
        hoverState.set(link, true);
        menu.classList.add('active');
        
        // Ensure menu is interactive
        menu.style.pointerEvents = 'auto';
    }
    
    /**
     * Hide the hover menu
     */
    function hideMenu(link, menu) {
        if (!hoverState.get(link)) return; // Already hidden
        
        hoverState.set(link, false);
        menu.classList.remove('active');
        
        // Prevent interaction when hidden
        menu.style.pointerEvents = 'none';
    }
    
    /**
     * Clean up all timers on page unload
     */
    function cleanup() {
        timers.forEach(timer => clearTimeout(timer));
        timers.clear();
        hoverState.clear();
    }
    
    /**
     * Touch device support
     */
    function initTouchSupport() {
        if (!('ontouchstart' in window)) return;
        
        document.addEventListener('touchstart', (e) => {
            const link = e.target.closest('.link-item-wrapper');
            if (!link) {
                // Hide all menus when tapping outside
                document.querySelectorAll('.hover-menu.active').forEach(menu => {
                    menu.classList.remove('active');
                });
                return;
            }
            
            const menu = link.querySelector('.hover-menu');
            if (!menu) return;
            
            // Toggle menu on tap
            if (menu.classList.contains('active')) {
                hideMenu(link, menu);
            } else {
                // Hide other menus first
                document.querySelectorAll('.hover-menu.active').forEach(otherMenu => {
                    if (otherMenu !== menu) {
                        otherMenu.classList.remove('active');
                    }
                });
                showMenu(link, menu);
            }
            
            e.preventDefault();
        });
    }
    
    /**
     * Initialize everything when DOM is ready
     */
    function init() {
        // Wait for any dynamic content to load
        setTimeout(() => {
            initHoverMenus();
            initTouchSupport();
        }, 100);
        
        // Clean up on page unload
        window.addEventListener('beforeunload', cleanup);
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();