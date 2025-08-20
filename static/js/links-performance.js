// Performance Optimization for Links Page
(function() {
    'use strict';

    // Configuration
    const BATCH_SIZE = 20;
    const LOAD_THRESHOLD = 100; // pixels before bottom to trigger load
    const DEBOUNCE_DELAY = 150;

    let isLoading = false;
    let currentBatch = 0;
    let allSections = [];
    let visibleSections = new Set();

    document.addEventListener('DOMContentLoaded', initPerformanceOptimizations);

    function initPerformanceOptimizations() {
        console.log('⚡ Initializing performance optimizations...');
        
        // Implement intersection observer for lazy loading
        setupIntersectionObserver();
        
        // Optimize hover menu initialization
        optimizeHoverMenus();
        
        // Add progressive rendering
        implementProgressiveRendering();
        
        // Optimize search with debouncing
        optimizeSearch();
        
        // Add performance monitoring
        monitorPerformance();
    }

    function setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '100px',
            threshold: 0.01
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target;
                    if (!visibleSections.has(section)) {
                        visibleSections.add(section);
                        loadSectionLinks(section);
                    }
                } else {
                    // Optionally unload distant sections to save memory
                    const section = entry.target;
                    if (visibleSections.has(section)) {
                        const rect = section.getBoundingClientRect();
                        if (Math.abs(rect.top) > window.innerHeight * 3) {
                            visibleSections.delete(section);
                            unloadSectionLinks(section);
                        }
                    }
                }
            });
        }, options);

        // Observe all sections
        document.querySelectorAll('.instagram-links').forEach(section => {
            observer.observe(section);
            allSections.push(section);
        });
    }

    function loadSectionLinks(section) {
        // Skip if already loaded
        if (section.dataset.loaded === 'true') return;

        const linkGrids = section.querySelectorAll('.link-grid');
        linkGrids.forEach(grid => {
            const links = grid.querySelectorAll('a');
            links.forEach((link, index) => {
                // Stagger the animation for smooth appearance
                setTimeout(() => {
                    link.style.opacity = '1';
                    link.style.transform = 'translateY(0)';
                }, index * 10);
            });
        });

        section.dataset.loaded = 'true';
        console.log(`Loaded section: ${section.querySelector('h3')?.textContent}`);
    }

    function unloadSectionLinks(section) {
        // Only unload if section is far from viewport
        const linkGrids = section.querySelectorAll('.link-grid');
        linkGrids.forEach(grid => {
            const links = grid.querySelectorAll('.link-item-wrapper');
            links.forEach(wrapper => {
                // Remove hover menus to save memory
                const hoverMenu = wrapper.querySelector('.hover-menu');
                if (hoverMenu && !wrapper.matches(':hover')) {
                    hoverMenu.style.display = 'none';
                }
            });
        });
    }

    function optimizeHoverMenus() {
        // Hover menus are already initialized by links-hover-menu.js
        // Just ensure they're not duplicated
        console.log('✓ Hover menus handled by links-hover-menu.js');
    }

    function implementProgressiveRendering() {
        // Initially hide all links with CSS
        const style = document.createElement('style');
        style.textContent = `
            .link-grid a {
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            
            .instagram-links[data-loaded="true"] .link-grid a {
                opacity: 1;
                transform: translateY(0);
            }
            
            /* Loading skeleton */
            .instagram-links:not([data-loaded="true"]) .link-grid {
                position: relative;
                min-height: 200px;
            }
            
            .instagram-links:not([data-loaded="true"]) .link-grid::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
                border-radius: 10px;
            }
            
            @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(style);
    }

    function optimizeSearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;

        let searchTimeout;
        const originalHandler = searchInput.oninput;

        searchInput.oninput = function(e) {
            clearTimeout(searchTimeout);
            
            // Show loading state
            searchInput.classList.add('searching');
            
            searchTimeout = setTimeout(() => {
                // Call original handler if exists
                if (originalHandler) {
                    originalHandler.call(this, e);
                }
                
                // Remove loading state
                searchInput.classList.remove('searching');
                
                // Re-observe sections after search
                setTimeout(() => {
                    allSections.forEach(section => {
                        if (section.style.display !== 'none') {
                            loadSectionLinks(section);
                        }
                    });
                }, 100);
            }, DEBOUNCE_DELAY);
        };
    }

    function monitorPerformance() {
        // Monitor FPS
        let lastTime = performance.now();
        let frames = 0;
        let fps = 0;

        function measureFPS() {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                fps = Math.round((frames * 1000) / (currentTime - lastTime));
                frames = 0;
                lastTime = currentTime;
                
                // Log if FPS drops below 30
                if (fps < 30 && fps > 0) {
                    console.warn(`⚠️ Low FPS detected: ${fps}`);
                }
            }
            
            requestAnimationFrame(measureFPS);
        }
        
        // Start monitoring after page load
        window.addEventListener('load', () => {
            requestAnimationFrame(measureFPS);
        });

        // Monitor memory usage (if available)
        if (performance.memory) {
            setInterval(() => {
                const memoryUsage = {
                    used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                    total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                };
                
                if (memoryUsage.used > memoryUsage.total * 0.9) {
                    console.warn('⚠️ High memory usage:', memoryUsage);
                }
            }, 10000); // Check every 10 seconds
        }

        // Log performance metrics
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('📊 Page Performance Metrics:');
                console.log(`  DOM Content Loaded: ${Math.round(perfData.domContentLoadedEventEnd)}ms`);
                console.log(`  Page Load Complete: ${Math.round(perfData.loadEventEnd)}ms`);
                console.log(`  Links Count: ${document.querySelectorAll('.link-grid a').length}`);
            }
        });
    }

    // Utility function for smooth scroll with performance
    function smoothScrollTo(element) {
        // Use native smooth scroll if available
        if ('scrollBehavior' in document.documentElement.style) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Fallback for older browsers
            const targetY = element.getBoundingClientRect().top + window.pageYOffset - (window.innerHeight / 2);
            window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
    }

    // Export performance utilities
    window.linksPerformance = {
        getVisibleSections: () => Array.from(visibleSections),
        reloadAllSections: () => {
            allSections.forEach(section => loadSectionLinks(section));
        },
        getMemoryUsage: () => {
            if (performance.memory) {
                return {
                    used: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
                    total: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB'
                };
            }
            return 'Not available';
        }
    };

})();