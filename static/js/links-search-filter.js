// Enhanced Search and Filter System for Links Page
(function() {
    'use strict';
    
    let allLinks = [];
    let activeFilter = 'all';
    let searchTerm = '';
    
    document.addEventListener('DOMContentLoaded', function() {
        initializeSearchFilter();
        updateLinkCounts();
        setupCollapsibleSections();
    });
    
    function initializeSearchFilter() {
        // Get all link elements
        allLinks = Array.from(document.querySelectorAll('.link-item-wrapper'));
        console.log(`Found ${allLinks.length} links to index`);
        
        // Setup search
        const searchInput = document.getElementById('linkSearch');
        const searchContainer = document.querySelector('.search-container');
        
        if (searchInput) {
            // Create clear button
            const clearBtn = document.createElement('button');
            clearBtn.className = 'clear-search';
            clearBtn.setAttribute('aria-label', 'Clear search');
            searchContainer.appendChild(clearBtn);
            
            searchInput.addEventListener('input', (e) => {
                debounce(handleSearch, 300)(e);
                // Update container state
                if (e.target.value) {
                    searchContainer.classList.add('has-value');
                } else {
                    searchContainer.classList.remove('has-value');
                }
            });
            
            searchInput.addEventListener('focus', () => {
                searchContainer.classList.add('focused');
            });
            
            searchInput.addEventListener('blur', () => {
                searchContainer.classList.remove('focused');
            });
            
            // Clear button functionality
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.focus();
            });
        }
        
        // Setup filters
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', handleFilter);
            
            // Add ripple effect
            btn.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                ripple.style.left = (e.offsetX - 5) + 'px';
                ripple.style.top = (e.offsetY - 5) + 'px';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
        
        // Update placeholder with actual count
        if (searchInput) {
            searchInput.placeholder = `Search ${allLinks.length} links...`;
        }
    }
    
    function handleSearch(event) {
        searchTerm = event.target.value.toLowerCase().trim();
        applyFilters();
        updateSearchStats();
    }
    
    function handleFilter(event) {
        // Remove active class from all buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        event.target.classList.add('active');
        
        // Get filter value
        activeFilter = event.target.dataset.filter;
        
        // Apply filters
        applyFilters();
    }
    
    function applyFilters() {
        let visibleCount = 0;
        let matchedSections = new Set();
        
        allLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            const tags = (link.dataset.tags || '').toLowerCase();
            const section = link.closest('.instagram-links');
            const sectionClass = section ? section.className.split(' ').find(c => 
                ['govdip', 'education', 'culture', 'food', 'travel'].includes(c)
            ) : '';
            
            // Check filter match
            let filterMatch = activeFilter === 'all' || sectionClass === activeFilter;
            
            // Check search match
            let searchMatch = searchTerm === '' || 
                             text.includes(searchTerm) || 
                             tags.includes(searchTerm);
            
            // Show/hide link
            if (filterMatch && searchMatch) {
                link.style.display = '';
                visibleCount++;
                if (section) matchedSections.add(section);
            } else {
                link.style.display = 'none';
            }
            
            // Add visual feedback for search matches
            if (searchTerm && searchMatch) {
                link.classList.add('search-match');
            } else {
                link.classList.remove('search-match');
            }
        });
        
        // Show/hide empty sections
        document.querySelectorAll('.instagram-links').forEach(section => {
            const visibleLinks = section.querySelectorAll('.link-item-wrapper:not([style*="display: none"])');
            if (visibleLinks.length === 0) {
                section.style.display = 'none';
            } else {
                section.style.display = '';
            }
        });
        
        // Update stats
        updateSearchStats(visibleCount);
    }
    
    function updateSearchStats(count) {
        const statsEl = document.getElementById('searchStats');
        if (!statsEl) return;
        
        if (searchTerm || activeFilter !== 'all') {
            const total = allLinks.length;
            count = count !== undefined ? count : 
                    allLinks.filter(l => l.style.display !== 'none').length;
            
            statsEl.textContent = `Showing ${count} of ${total} links`;
            statsEl.style.display = 'block';
            
            // Add animation
            statsEl.style.animation = 'fadeIn 0.3s ease';
        } else {
            statsEl.style.display = 'none';
        }
    }
    
    function updateLinkCounts() {
        // Count links per category
        const categories = {
            'govdip': 0,
            'education': 0,
            'culture': 0,
            'food': 0,
            'travel': 0
        };
        
        document.querySelectorAll('.instagram-links').forEach(section => {
            const links = section.querySelectorAll('.link-item-wrapper').length;
            const category = section.className.split(' ').find(c => categories.hasOwnProperty(c));
            if (category) {
                categories[category] = links;
            }
        });
        
        // Update filter button counts
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const filter = btn.dataset.filter;
            if (filter !== 'all' && categories[filter] !== undefined) {
                const countSpan = btn.querySelector('.filter-count');
                if (countSpan) {
                    countSpan.textContent = `(${categories[filter]})`;
                }
            }
        });
        
        // Removed section header counts per user request
        // Clean minimalist design without counters
    }
    
    function setupCollapsibleSections() {
        // Fix duplicate collapse icons and setup click handlers
        document.querySelectorAll('.instagram-links h3, .instagram-links h4').forEach(header => {
            // Remove any duplicate collapse icons
            const icons = header.querySelectorAll('.collapse-icon');
            if (icons.length > 1) {
                for (let i = 1; i < icons.length; i++) {
                    icons[i].remove();
                }
            }
            
            // Ensure there's exactly one collapse icon
            let icon = header.querySelector('.collapse-icon');
            if (!icon) {
                icon = document.createElement('span');
                icon.className = 'collapse-icon';
                icon.textContent = '▼';
                header.insertBefore(icon, header.firstChild);
            }
            
            // Add click handler
            header.style.cursor = 'pointer';
            header.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleSection(header, icon);
            });
        });
    }
    
    function toggleSection(header, icon) {
        const content = header.tagName === 'H3' ? 
                       header.parentElement.querySelector('.links-section-content') :
                       header.nextElementSibling;
        
        if (!content) return;
        
        const isCollapsed = content.style.display === 'none';
        
        // Animate icon rotation
        icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
        
        // Toggle content visibility with animation
        if (isCollapsed) {
            content.style.display = '';
            content.style.animation = 'slideDown 0.3s ease';
        } else {
            content.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                content.style.display = 'none';
            }, 280);
        }
    }
    
    // Utility function: debounce
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
    
    // Add required animations to page
    if (!document.getElementById('links-animations')) {
        const style = document.createElement('style');
        style.id = 'links-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes slideDown {
                from { 
                    opacity: 0;
                    max-height: 0;
                    transform: translateY(-20px);
                }
                to { 
                    opacity: 1;
                    max-height: 5000px;
                    transform: translateY(0);
                }
            }
            
            @keyframes slideUp {
                from { 
                    opacity: 1;
                    max-height: 5000px;
                }
                to { 
                    opacity: 0;
                    max-height: 0;
                }
            }
            
            .search-match {
                animation: highlight 0.5s ease;
                border-color: var(--color-primary) !important;
                background: linear-gradient(135deg, 
                    rgba(99, 102, 241, 0.1), 
                    transparent) !important;
            }
            
            @keyframes highlight {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }
            
            .collapse-icon {
                transition: transform 0.3s ease;
                display: inline-block;
            }
            
            .search-container.focused .search-input {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
        `;
        document.head.appendChild(style);
    }
})();