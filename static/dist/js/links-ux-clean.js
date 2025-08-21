// Clean UX Enhancements for Links Page
(function() {
    'use strict';

    // Initialize UX enhancements
    document.addEventListener('DOMContentLoaded', initializeUX);

    function initializeUX() {
        console.log('Initializing UX enhancements...');
        
        // Add loading feedback
        setupLoadingFeedback();
        
        // Enhanced search experience
        setupSearchEnhancements();
        
        // Keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Visual feedback
        setupVisualFeedback();
        
        // Scroll improvements
        setupScrollEnhancements();
        
        // Mobile touch improvements
        setupMobileEnhancements();
    }

    // Loading Feedback
    function setupLoadingFeedback() {
        // Add subtle loading animation to search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchInput.parentElement.classList.add('searching');
                
                searchTimer = setTimeout(() => {
                    searchInput.parentElement.classList.remove('searching');
                }, 400);
            });
        }
    }

    // Search Enhancements
    function setupSearchEnhancements() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        // Add clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'search-clear';
        clearBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M14 1.4L12.6 0 7 5.6 1.4 0 0 1.4 5.6 7 0 12.6 1.4 14 7 8.4l5.6 5.6 1.4-1.4L8.4 7z" fill="currentColor"/></svg>';
        clearBtn.style.display = 'none';
        clearBtn.setAttribute('aria-label', 'Clear search');
        searchInput.parentElement.appendChild(clearBtn);
        
        // Show/hide clear button
        searchInput.addEventListener('input', (e) => {
            clearBtn.style.display = e.target.value ? 'block' : 'none';
            
            // Show result count
            updateResultCount();
        });
        
        // Clear button functionality
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            clearBtn.style.display = 'none';
            searchInput.focus();
        });
        
        // Add result counter
        const resultCounter = document.createElement('div');
        resultCounter.className = 'search-results-count';
        searchInput.parentElement.appendChild(resultCounter);
    }

    function updateResultCount() {
        const counter = document.querySelector('.search-results-count');
        if (!counter) return;
        
        const visibleLinks = document.querySelectorAll('.link-grid a:not([style*="none"])').length;
        const totalLinks = document.querySelectorAll('.link-grid a').length;
        
        if (document.getElementById('search-input').value) {
            counter.textContent = `${visibleLinks} of ${totalLinks} results`;
            counter.style.display = 'block';
        } else {
            counter.style.display = 'none';
        }
    }

    // Keyboard Shortcuts
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Forward slash to focus search
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // Escape to clear search
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('search-input');
                if (searchInput && searchInput === document.activeElement) {
                    if (searchInput.value) {
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input'));
                    } else {
                        searchInput.blur();
                    }
                }
            }
        });
        
        // Update placeholder with shortcut hint
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.setAttribute('placeholder', 'Search links, tags, countries... (Press /)');
        }
    }

    // Visual Feedback
    function setupVisualFeedback() {
        // Add click animation to links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.link-grid a');
            if (link) {
                // Create pulse effect
                link.style.animation = 'linkPulse 0.3s ease';
                setTimeout(() => {
                    link.style.animation = '';
                }, 300);
            }
        });
        
        // Add hover sound effect capability (silent by default)
        document.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('mouseenter', () => {
                pill.style.transform = 'scale(1.05)';
            });
            pill.addEventListener('mouseleave', () => {
                pill.style.transform = 'scale(1)';
            });
        });
    }

    // Scroll Enhancements
    function setupScrollEnhancements() {
        // Smooth scroll to section when category is selected
        document.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const category = pill.getAttribute('data-category');
                if (category && category !== 'all') {
                    setTimeout(() => {
                        const section = document.querySelector(`.instagram-links.${category}`);
                        if (section) {
                            const offset = section.offsetTop - 100;
                            window.scrollTo({
                                top: offset,
                                behavior: 'smooth'
                            });
                        }
                    }, 100);
                }
            });
        });
        
        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar';
        document.body.appendChild(progressBar);
        
        window.addEventListener('scroll', () => {
            const winScroll = window.pageYOffset;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + '%';
        });
        
        // Scroll to top button
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 4l8 8h-6v8h-4v-8H4z" fill="currentColor"/></svg>';
        scrollBtn.setAttribute('aria-label', 'Back to top');
        document.body.appendChild(scrollBtn);
        
        let scrollTimer;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            
            if (window.pageYOffset > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
            
            // Hide while scrolling
            scrollBtn.classList.add('scrolling');
            scrollTimer = setTimeout(() => {
                scrollBtn.classList.remove('scrolling');
            }, 150);
        });
        
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Mobile Enhancements
    function setupMobileEnhancements() {
        // Detect mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Add touch feedback
            document.querySelectorAll('.link-grid a').forEach(link => {
                link.addEventListener('touchstart', () => {
                    link.classList.add('touch-active');
                });
                link.addEventListener('touchend', () => {
                    setTimeout(() => {
                        link.classList.remove('touch-active');
                    }, 100);
                });
            });
            
            // Improve tap targets
            document.body.classList.add('touch-device');
        }
        
        // Add swipe to dismiss search
        let touchStartY = 0;
        const searchInput = document.getElementById('search-input');
        
        if (searchInput) {
            searchInput.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            });
            
            searchInput.addEventListener('touchmove', (e) => {
                const touchY = e.touches[0].clientY;
                const diff = touchStartY - touchY;
                
                // Swipe up to dismiss keyboard
                if (diff > 50 && searchInput === document.activeElement) {
                    searchInput.blur();
                }
            });
        }
    }

})();