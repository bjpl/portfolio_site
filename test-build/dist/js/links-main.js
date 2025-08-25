// Consolidated Links Page JavaScript - Clean Implementation
(function() {
    'use strict';
    
    // State management
    const state = {
        allLinks: [],
        searchTerm: '',
        activeFilter: 'all',
        initialized: false
    };
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        
        console.log('Initializing links page...');
        
        // Cache all link elements
        state.allLinks = Array.from(document.querySelectorAll('.link-item-wrapper'));
        console.log(`Found ${state.allLinks.length} links`);
        
        // Initialize features
        initializeSearch();
        initializeFilters();
        initializeCollapsibles();
        initializeHoverMenus();
        
        console.log('Links page initialized successfully');
    }
    
    // === SEARCH FUNCTIONALITY ===
    function initializeSearch() {
        const searchInput = document.getElementById('linkSearch');
        const searchContainer = document.querySelector('.search-container');
        
        if (!searchInput || !searchContainer) {
            console.warn('Search elements not found');
            return;
        }
        
        // Update placeholder
        searchInput.placeholder = `Search ${state.allLinks.length} links...`;
        
        // Create and add clear button
        let clearBtn = searchContainer.querySelector('.clear-search');
        if (!clearBtn) {
            clearBtn = document.createElement('button');
            clearBtn.className = 'clear-search';
            clearBtn.setAttribute('aria-label', 'Clear search');
            clearBtn.innerHTML = '×';
            searchContainer.appendChild(clearBtn);
        }
        
        // Search input handler
        let searchTimeout;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const value = e.target.value;
            
            // Update UI state
            if (value) {
                searchContainer.classList.add('has-value');
            } else {
                searchContainer.classList.remove('has-value');
            }
            
            // Debounced search
            searchTimeout = setTimeout(() => {
                state.searchTerm = value.toLowerCase().trim();
                applyFilters();
            }, 300);
        });
        
        // Focus/blur handlers
        searchInput.addEventListener('focus', () => searchContainer.classList.add('focused'));
        searchInput.addEventListener('blur', () => searchContainer.classList.remove('focused'));
        
        // Clear button handler
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
        
        console.log('Search initialized');
    }
    
    // === FILTER FUNCTIONALITY ===
    function initializeFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        if (filterButtons.length === 0) {
            console.warn('No filter buttons found');
            return;
        }
        
        // Update filter counts
        const categoryCounts = {};
        state.allLinks.forEach(link => {
            const section = link.closest('.instagram-links');
            if (section) {
                const classes = section.className.split(' ');
                const category = classes.find(c => ['govdip', 'education', 'culture', 'food', 'travel'].includes(c));
                if (category) {
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                }
            }
        });
        
        // Set up filter buttons
        filterButtons.forEach(btn => {
            const filter = btn.dataset.filter;
            
            // Update count
            if (filter !== 'all' && categoryCounts[filter]) {
                const countSpan = btn.querySelector('.filter-count');
                if (countSpan) {
                    countSpan.textContent = `(${categoryCounts[filter]})`;
                }
            } else if (filter === 'all') {
                const countSpan = btn.querySelector('.filter-count');
                if (countSpan) {
                    countSpan.textContent = `(${state.allLinks.length})`;
                }
            }
            
            // Click handler
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update filter
                state.activeFilter = filter;
                applyFilters();
            });
        });
        
        console.log('Filters initialized');
    }
    
    // === APPLY FILTERS AND SEARCH ===
    function applyFilters() {
        let visibleCount = 0;
        const visibleSections = new Set();
        
        state.allLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            const section = link.closest('.instagram-links');
            
            // Check category filter
            let categoryMatch = state.activeFilter === 'all';
            if (!categoryMatch && section) {
                const classes = section.className.split(' ');
                categoryMatch = classes.includes(state.activeFilter);
            }
            
            // Check search term
            let searchMatch = true;
            if (state.searchTerm) {
                searchMatch = text.includes(state.searchTerm);
                // Also check data-tags if present
                const tags = link.dataset.tags;
                if (tags && !searchMatch) {
                    searchMatch = tags.toLowerCase().includes(state.searchTerm);
                }
            }
            
            // Show/hide link
            const shouldShow = categoryMatch && searchMatch;
            link.style.display = shouldShow ? '' : 'none';
            
            if (shouldShow) {
                visibleCount++;
                if (section) visibleSections.add(section);
            }
            
            // Add/remove highlight class
            if (state.searchTerm && searchMatch) {
                link.classList.add('search-match');
            } else {
                link.classList.remove('search-match');
            }
        });
        
        // Show/hide sections
        document.querySelectorAll('.instagram-links').forEach(section => {
            const hasVisibleLinks = section.querySelectorAll('.link-item-wrapper:not([style*="display: none"])').length > 0;
            section.style.display = hasVisibleLinks ? '' : 'none';
        });
        
        // Update search stats
        const statsEl = document.getElementById('searchStats');
        if (statsEl) {
            if (state.searchTerm || state.activeFilter !== 'all') {
                statsEl.textContent = `Showing ${visibleCount} of ${state.allLinks.length} links`;
                statsEl.style.display = 'block';
            } else {
                statsEl.style.display = 'none';
            }
        }
        
        console.log(`Filters applied: ${visibleCount} links visible`);
    }
    
    // === COLLAPSIBLE SECTIONS ===
    function initializeCollapsibles() {
        const headers = document.querySelectorAll('.instagram-links h3, .instagram-links h4, .links-category h4');
        
        headers.forEach(header => {
            // Skip if already initialized
            if (header.dataset.collapsible === 'true') return;
            header.dataset.collapsible = 'true';
            
            // Find or create collapse icon
            let icon = header.querySelector('.collapse-icon');
            if (!icon) {
                icon = document.createElement('span');
                icon.className = 'collapse-icon';
                icon.textContent = '▼';
                header.appendChild(icon);
            }
            
            // Make header clickable
            header.style.cursor = 'pointer';
            
            // Click handler
            header.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleSection(header, icon);
            });
        });
        
        console.log(`Initialized ${headers.length} collapsible sections`);
    }
    
    function toggleSection(header, icon) {
        // Find content to toggle
        let content = header.nextElementSibling;
        
        // Make sure we're toggling the right element
        if (!content || content.tagName === 'H3' || content.tagName === 'H4') {
            console.warn('No content found to toggle');
            return;
        }
        
        const isHidden = content.style.display === 'none';
        
        // Toggle display
        content.style.display = isHidden ? '' : 'none';
        
        // Rotate icon
        icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
    
    // === HOVER MENUS ===
    function initializeHoverMenus() {
        // This should be handled by links-hover-menu.js
        // Just verify it's working
        setTimeout(() => {
            const hoverMenus = document.querySelectorAll('.hover-menu');
            console.log(`Hover menus found: ${hoverMenus.length}`);
        }, 1000);
    }
    
    // === UTILITY FUNCTIONS ===
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
})();