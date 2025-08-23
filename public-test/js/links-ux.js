// Enhanced UX Features for Links Page
(function() {
    'use strict';

    // State for UX features
    const uxState = {
        recentlyViewed: [],
        favorites: new Set(),
        searchHistory: [],
        currentView: 'grid', // grid or list
        isLoading: false
    };

    // Initialize UX enhancements
    document.addEventListener('DOMContentLoaded', initializeUX);

    function initializeUX() {
        console.log('Initializing UX enhancements...');
        
        // Load saved state from localStorage
        loadUserPreferences();
        
        // Add loading indicators
        setupLoadingIndicators();
        
        // Add search enhancements
        setupSearchEnhancements();
        
        // Add keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Add visual feedback
        setupVisualFeedback();
        
        // Add view toggle
        setupViewToggle();
        
        // Add favorites feature
        setupFavorites();
        
        // Add scroll to top button
        setupScrollToTop();
        
        // Add progress indicator
        setupProgressIndicator();
    }

    // Loading Indicators
    function setupLoadingIndicators() {
        // Add skeleton loading for initial page load
        const linkGrids = document.querySelectorAll('.link-grid');
        
        if (linkGrids.length === 0) {
            // Show skeleton while content loads
            showSkeletonLoader();
        }
        
        // Add loading state to search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                showSearchLoading();
                setTimeout(hideSearchLoading, 300);
            });
        }
    }

    function showSkeletonLoader() {
        const container = document.querySelector('.content-wrapper');
        if (!container) return;
        
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-loader';
        skeleton.innerHTML = `
            <div class="skeleton-section">
                <div class="skeleton-title"></div>
                <div class="skeleton-grid">
                    ${Array(12).fill('<div class="skeleton-card"></div>').join('')}
                </div>
            </div>
        `;
        
        container.appendChild(skeleton);
        
        // Remove skeleton when content loads
        setTimeout(() => {
            skeleton.remove();
        }, 1000);
    }

    function showSearchLoading() {
        const searchWrapper = document.querySelector('.search-wrapper');
        if (searchWrapper) {
            searchWrapper.classList.add('searching');
        }
    }

    function hideSearchLoading() {
        const searchWrapper = document.querySelector('.search-wrapper');
        if (searchWrapper) {
            searchWrapper.classList.remove('searching');
        }
    }

    // Search Enhancements
    function setupSearchEnhancements() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        // Add search suggestions container
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'search-suggestions';
        searchInput.parentElement.appendChild(suggestionsContainer);
        
        // Track search history
        searchInput.addEventListener('change', (e) => {
            const term = e.target.value.trim();
            if (term && !uxState.searchHistory.includes(term)) {
                uxState.searchHistory.unshift(term);
                if (uxState.searchHistory.length > 10) {
                    uxState.searchHistory.pop();
                }
                saveUserPreferences();
            }
        });
        
        // Show suggestions on focus
        searchInput.addEventListener('focus', () => {
            showSearchSuggestions(suggestionsContainer);
        });
        
        // Hide suggestions on blur
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionsContainer.style.display = 'none';
            }, 200);
        });
        
        // Add clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'search-clear';
        clearBtn.innerHTML = '✕';
        clearBtn.style.display = 'none';
        searchInput.parentElement.appendChild(clearBtn);
        
        searchInput.addEventListener('input', (e) => {
            clearBtn.style.display = e.target.value ? 'block' : 'none';
        });
        
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            clearBtn.style.display = 'none';
            searchInput.focus();
        });
    }

    function showSearchSuggestions(container) {
        if (uxState.searchHistory.length === 0) return;
        
        container.innerHTML = `
            <div class="suggestions-header">Recent Searches</div>
            ${uxState.searchHistory.map(term => `
                <div class="suggestion-item" data-term="${term}">
                    <span class="suggestion-icon">🔍</span>
                    <span>${term}</span>
                </div>
            `).join('')}
        `;
        
        container.style.display = 'block';
        
        // Handle suggestion clicks
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const searchInput = document.getElementById('search-input');
                searchInput.value = item.dataset.term;
                searchInput.dispatchEvent(new Event('input'));
                container.style.display = 'none';
            });
        });
    }

    // Keyboard Shortcuts
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.focus();
            }
            
            // Escape to clear search
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('search-input');
                if (searchInput && searchInput.value) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
            }
            
            // Number keys 1-8 for category filters
            if (e.key >= '1' && e.key <= '8' && !e.ctrlKey && !e.metaKey) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT') {
                    const pills = document.querySelectorAll('.pill');
                    const index = parseInt(e.key) - 1;
                    if (pills[index]) {
                        pills[index].click();
                    }
                }
            }
        });
        
        // Add keyboard hint
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.placeholder = 'Search links... (Ctrl+K)';
        }
    }

    // Visual Feedback
    function setupVisualFeedback() {
        // Add ripple effect to buttons
        document.querySelectorAll('.pill, button').forEach(element => {
            element.addEventListener('click', createRipple);
        });
        
        // Add link click feedback
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.link-grid a');
            if (link) {
                // Add to recently viewed
                addToRecentlyViewed(link);
                
                // Visual pulse
                link.classList.add('clicked');
                setTimeout(() => {
                    link.classList.remove('clicked');
                }, 600);
            }
        });
    }

    function createRipple(e) {
        const button = e.currentTarget;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // View Toggle (Grid/List)
    function setupViewToggle() {
        const container = document.querySelector('.search-section .container');
        if (!container) return;
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'view-toggle';
        toggleBtn.innerHTML = '⊞ Grid View';
        toggleBtn.setAttribute('aria-label', 'Toggle view');
        
        container.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', () => {
            uxState.currentView = uxState.currentView === 'grid' ? 'list' : 'grid';
            
            document.querySelectorAll('.link-grid').forEach(grid => {
                grid.className = uxState.currentView === 'list' ? 'link-list' : 'link-grid';
            });
            
            toggleBtn.innerHTML = uxState.currentView === 'grid' ? '⊞ Grid View' : '☰ List View';
            saveUserPreferences();
        });
    }

    // Favorites Feature
    function setupFavorites() {
        // Load favorites from localStorage
        const saved = localStorage.getItem('linksFavorites');
        if (saved) {
            uxState.favorites = new Set(JSON.parse(saved));
        }
        
        // Add favorite buttons to links
        document.querySelectorAll('.link-grid a').forEach(link => {
            const favBtn = document.createElement('span');
            favBtn.className = 'fav-btn';
            favBtn.innerHTML = '☆';
            
            const href = link.href;
            if (uxState.favorites.has(href)) {
                favBtn.classList.add('active');
                favBtn.innerHTML = '★';
            }
            
            favBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(href, favBtn);
            });
            
            link.appendChild(favBtn);
        });
        
        // Add favorites filter
        const filterContainer = document.querySelector('.category-pills');
        if (filterContainer) {
            const favFilter = document.createElement('button');
            favFilter.className = 'pill fav-filter';
            favFilter.innerHTML = '★ Favorites';
            favFilter.addEventListener('click', showOnlyFavorites);
            filterContainer.appendChild(favFilter);
        }
    }

    function toggleFavorite(href, btn) {
        if (uxState.favorites.has(href)) {
            uxState.favorites.delete(href);
            btn.classList.remove('active');
            btn.innerHTML = '☆';
        } else {
            uxState.favorites.add(href);
            btn.classList.add('active');
            btn.innerHTML = '★';
        }
        
        localStorage.setItem('linksFavorites', JSON.stringify([...uxState.favorites]));
        
        // Show feedback
        showNotification(uxState.favorites.has(href) ? 'Added to favorites' : 'Removed from favorites');
    }

    function showOnlyFavorites() {
        document.querySelectorAll('.link-grid a').forEach(link => {
            if (uxState.favorites.has(link.href)) {
                link.style.display = '';
            } else {
                link.style.display = 'none';
            }
        });
    }

    // Scroll to Top Button
    function setupScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.innerHTML = '↑';
        scrollBtn.setAttribute('aria-label', 'Scroll to top');
        document.body.appendChild(scrollBtn);
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });
        
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Progress Indicator
    function setupProgressIndicator() {
        const progress = document.createElement('div');
        progress.className = 'scroll-progress';
        document.body.appendChild(progress);
        
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            const height = document.documentElement.scrollHeight - window.innerHeight;
            const percent = (scrolled / height) * 100;
            progress.style.width = percent + '%';
        });
    }


    // Utility Functions
    function loadUserPreferences() {
        const saved = localStorage.getItem('linksPagePrefs');
        if (saved) {
            const prefs = JSON.parse(saved);
            uxState.searchHistory = prefs.searchHistory || [];
            uxState.recentlyViewed = prefs.recentlyViewed || [];
            uxState.currentView = prefs.currentView || 'grid';
        }
    }

    function saveUserPreferences() {
        const prefs = {
            searchHistory: uxState.searchHistory,
            recentlyViewed: uxState.recentlyViewed,
            currentView: uxState.currentView
        };
        localStorage.setItem('linksPagePrefs', JSON.stringify(prefs));
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'ux-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

})();