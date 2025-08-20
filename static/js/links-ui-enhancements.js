// Modern UI Enhancements for Links Page
(function() {
    'use strict';

    // State management
    const uiState = {
        viewMode: 'grid', // grid, compact, list, card
        sortBy: 'default', // default, alphabetical, category
        filterBy: {
            categories: [],
            countries: [],
            searchTerm: ''
        }
    };

    document.addEventListener('DOMContentLoaded', initUIEnhancements);

    function initUIEnhancements() {
        console.log('🎨 Initializing UI enhancements...');
        
        // Add category headers with icons
        enhanceCategoryHeaders();
        
        // Create view toggle controls
        createViewControls();
        
        // Add advanced filtering
        enhanceFiltering();
        
        // Add sort options
        addSortingOptions();
        
        // Initialize link preview system
        initLinkPreviews();
        
        // Track recently viewed
        initRecentlyViewed();
        
        // Load saved preferences
        loadUserPreferences();
    }

    function enhanceCategoryHeaders() {
        const sections = document.querySelectorAll('.instagram-links');
        
        const categoryIcons = {
            'diplomatic': '🏛️',
            'cultural': '🎨',
            'government': '⚖️',
            'food-brands': '🍽️',
            'travel': '✈️',
            'education': '📚',
            'organizations': '🏢',
            'sports': '⚽',
            'media': '📺',
            'technology': '💻'
        };
        
        const categoryDescriptions = {
            'diplomatic': 'Embassies, consulates, and international relations',
            'cultural': 'Museums, theaters, and cultural institutions',
            'government': 'Government agencies and public services',
            'food-brands': 'Restaurants, cafes, and food brands',
            'travel': 'Tourism boards and travel destinations',
            'education': 'Universities and educational institutions',
            'organizations': 'NGOs and international organizations',
            'sports': 'Sports teams and federations',
            'media': 'News outlets and media organizations',
            'technology': 'Tech companies and digital services'
        };
        
        sections.forEach(section => {
            // Get category from classes
            const classList = Array.from(section.classList);
            const category = classList.find(c => categoryIcons[c]) || 'organizations';
            
            // Count links in section
            const linkCount = section.querySelectorAll('.link-grid a').length;
            
            // Get existing header
            const existingHeader = section.querySelector('h3, h4');
            if (!existingHeader) return;
            
            // Create enhanced header
            const enhancedHeader = document.createElement('div');
            enhancedHeader.className = 'category-header';
            enhancedHeader.innerHTML = `
                <div class="category-icon">${categoryIcons[category] || '📂'}</div>
                <div class="category-info">
                    <div class="category-title">${existingHeader.textContent}</div>
                    <div class="category-description">${categoryDescriptions[category] || ''}</div>
                </div>
                <div class="category-stats">
                    <span class="category-count">${linkCount} links</span>
                    <span class="chevron">▼</span>
                </div>
            `;
            
            // Replace old header
            existingHeader.replaceWith(enhancedHeader);
            
            // Keep existing click functionality
            enhancedHeader.addEventListener('click', () => {
                enhancedHeader.classList.toggle('collapsed');
                const grid = enhancedHeader.nextElementSibling;
                if (grid && grid.classList.contains('link-grid')) {
                    grid.style.display = enhancedHeader.classList.contains('collapsed') ? 'none' : 'grid';
                }
            });
        });
    }

    function createViewControls() {
        const controls = document.createElement('div');
        controls.className = 'view-controls';
        controls.innerHTML = `
            <button class="view-toggle active" data-view="grid" title="Grid View">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z"/>
                </svg>
            </button>
            <button class="view-toggle" data-view="compact" title="Compact View">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                </svg>
            </button>
            <button class="view-toggle" data-view="list" title="List View">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                </svg>
            </button>
            <button class="view-toggle" data-view="card" title="Card View">
                <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                </svg>
            </button>
        `;
        
        document.body.appendChild(controls);
        
        // Add view toggle functionality
        controls.querySelectorAll('.view-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                changeViewMode(view);
                
                // Update active state
                controls.querySelectorAll('.view-toggle').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    function changeViewMode(mode) {
        uiState.viewMode = mode;
        saveUserPreferences();
        
        const linkGrids = document.querySelectorAll('.link-grid');
        linkGrids.forEach(grid => {
            // Remove all view classes
            grid.classList.remove('grid-view', 'compact-view', 'list-view', 'card-view');
            // Add new view class
            grid.classList.add(`${mode}-view`);
        });
        
        console.log(`View changed to: ${mode}`);
    }

    function enhanceFiltering() {
        // Create filter panel
        const filterPanel = document.createElement('div');
        filterPanel.className = 'filter-panel';
        filterPanel.style.display = 'none'; // Start hidden
        
        filterPanel.innerHTML = `
            <div class="filter-section">
                <h4>Filter by Category</h4>
                <div class="filter-chips" id="category-filters">
                    <span class="filter-chip" data-category="all">All <span class="count">(405)</span></span>
                    <span class="filter-chip" data-category="diplomatic">Diplomatic <span class="count">(66)</span></span>
                    <span class="filter-chip" data-category="cultural">Cultural <span class="count">(23)</span></span>
                    <span class="filter-chip" data-category="government">Government <span class="count">(31)</span></span>
                    <span class="filter-chip" data-category="food">Food & Beverage <span class="count">(27)</span></span>
                    <span class="filter-chip" data-category="education">Education <span class="count">(18)</span></span>
                    <span class="filter-chip" data-category="travel">Travel <span class="count">(9)</span></span>
                </div>
            </div>
            <div class="filter-section">
                <h4>Filter by Region</h4>
                <div class="filter-chips" id="region-filters">
                    <span class="filter-chip" data-region="colombia">🇨🇴 Colombia</span>
                    <span class="filter-chip" data-region="mexico">🇲🇽 Mexico</span>
                    <span class="filter-chip" data-region="venezuela">🇻🇪 Venezuela</span>
                    <span class="filter-chip" data-region="usa">🇺🇸 USA</span>
                    <span class="filter-chip" data-region="brazil">🇧🇷 Brazil</span>
                    <span class="filter-chip" data-region="argentina">🇦🇷 Argentina</span>
                    <span class="filter-chip" data-region="chile">🇨🇱 Chile</span>
                    <span class="filter-chip" data-region="peru">🇵🇪 Peru</span>
                </div>
            </div>
        `;
        
        // Insert after search section
        const searchSection = document.querySelector('.search-section');
        if (searchSection) {
            searchSection.appendChild(filterPanel);
        }
        
        // Add filter functionality
        filterPanel.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
                applyFilters();
            });
        });
    }

    function addSortingOptions() {
        const sortPanel = document.createElement('div');
        sortPanel.className = 'sort-options';
        sortPanel.innerHTML = `
            <span style="font-size: 0.875rem; color: #6b7280; margin-right: 0.5rem;">Sort by:</span>
            <button class="sort-option active" data-sort="default">Default</button>
            <button class="sort-option" data-sort="alphabetical">A-Z</button>
            <button class="sort-option" data-sort="category">Category</button>
            <button class="sort-option" data-sort="recent">Recently Added</button>
        `;
        
        // Add to search section
        const categoryPills = document.querySelector('.category-pills');
        if (categoryPills) {
            categoryPills.parentNode.insertBefore(sortPanel, categoryPills.nextSibling);
        }
        
        // Add sort functionality
        sortPanel.querySelectorAll('.sort-option').forEach(btn => {
            btn.addEventListener('click', () => {
                sortPanel.querySelectorAll('.sort-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const sortBy = btn.dataset.sort;
                applySorting(sortBy);
            });
        });
    }

    function applySorting(sortBy) {
        uiState.sortBy = sortBy;
        saveUserPreferences();
        
        const sections = document.querySelectorAll('.instagram-links');
        
        sections.forEach(section => {
            const grid = section.querySelector('.link-grid');
            if (!grid) return;
            
            const links = Array.from(grid.querySelectorAll('.link-item-wrapper, a'));
            
            // Sort links based on criteria
            links.sort((a, b) => {
                const textA = (a.querySelector('.link-item') || a).textContent.trim();
                const textB = (b.querySelector('.link-item') || b).textContent.trim();
                
                switch(sortBy) {
                    case 'alphabetical':
                        return textA.localeCompare(textB);
                    case 'category':
                        const tagsA = (a.querySelector('[data-tags]') || a).getAttribute('data-tags') || '';
                        const tagsB = (b.querySelector('[data-tags]') || b).getAttribute('data-tags') || '';
                        return tagsA.localeCompare(tagsB);
                    case 'recent':
                        // Reverse order (newest first)
                        return links.indexOf(b) - links.indexOf(a);
                    default:
                        return 0; // Keep original order
                }
            });
            
            // Re-append sorted links
            links.forEach(link => grid.appendChild(link));
        });
        
        console.log(`Sorted by: ${sortBy}`);
    }

    function applyFilters() {
        // Get active filters
        const activeCategories = Array.from(document.querySelectorAll('#category-filters .filter-chip.active'))
            .map(chip => chip.dataset.category);
        const activeRegions = Array.from(document.querySelectorAll('#region-filters .filter-chip.active'))
            .map(chip => chip.dataset.region);
        
        // Apply filters to links
        const links = document.querySelectorAll('.link-grid a, .link-item-wrapper');
        
        links.forEach(link => {
            const element = link.querySelector('[data-tags]') || link;
            const tags = element.getAttribute('data-tags') || '';
            const text = element.textContent || '';
            
            let showLink = true;
            
            // Category filter
            if (activeCategories.length > 0 && !activeCategories.includes('all')) {
                showLink = activeCategories.some(cat => tags.includes(cat));
            }
            
            // Region filter
            if (showLink && activeRegions.length > 0) {
                showLink = activeRegions.some(region => 
                    tags.includes(region) || text.toLowerCase().includes(region)
                );
            }
            
            // Show/hide link
            if (link.classList.contains('link-item-wrapper')) {
                link.style.display = showLink ? '' : 'none';
            } else {
                link.style.display = showLink ? '' : 'none';
            }
        });
        
        // Update section visibility
        updateSectionVisibility();
    }

    function updateSectionVisibility() {
        const sections = document.querySelectorAll('.instagram-links');
        
        sections.forEach(section => {
            const grid = section.querySelector('.link-grid');
            if (!grid) return;
            
            const visibleLinks = grid.querySelectorAll('.link-item-wrapper:not([style*="display: none"]), a:not([style*="display: none"])');
            const header = section.querySelector('.category-header, h3, h4');
            
            if (visibleLinks.length === 0) {
                section.style.display = 'none';
            } else {
                section.style.display = '';
                // Update count
                if (header) {
                    const countSpan = header.querySelector('.category-count');
                    if (countSpan) {
                        countSpan.textContent = `${visibleLinks.length} links`;
                    }
                }
            }
        });
    }

    function initLinkPreviews() {
        // Disabled - using inline hover icons instead
        return;
    }

    function showLinkPreview(link, preview, event) {
        const text = link.textContent.trim();
        const tags = link.getAttribute('data-tags') || '';
        const tagCount = tags.split(' ').filter(t => t).length;
        
        // Determine category
        let category = 'Other';
        if (tags.includes('embassy') || tags.includes('consulate')) category = 'Diplomatic';
        else if (tags.includes('museum') || tags.includes('culture')) category = 'Cultural';
        else if (tags.includes('government') || tags.includes('ministry')) category = 'Government';
        else if (tags.includes('food') || tags.includes('restaurant')) category = 'Food';
        else if (tags.includes('university') || tags.includes('education')) category = 'Education';
        else if (tags.includes('travel') || tags.includes('tourism')) category = 'Travel';
        
        // Update preview content
        preview.querySelector('.link-preview-title').textContent = text;
        preview.querySelector('.link-preview-username').textContent = '@' + link.href.split('/').pop();
        preview.querySelectorAll('.preview-stat-value')[0].textContent = '1';
        preview.querySelectorAll('.preview-stat-value')[1].textContent = tagCount;
        preview.querySelectorAll('.preview-stat-value')[2].textContent = category;
        
        // Position preview
        const rect = link.getBoundingClientRect();
        preview.style.left = `${Math.min(event.clientX + 10, window.innerWidth - 320)}px`;
        preview.style.top = `${event.clientY + 10}px`;
        
        preview.classList.add('show');
    }

    function initRecentlyViewed() {
        const recentLinks = JSON.parse(localStorage.getItem('recentlyViewedLinks') || '[]');
        
        if (recentLinks.length > 0) {
            const recentSection = document.createElement('div');
            recentSection.className = 'recently-viewed';
            recentSection.innerHTML = `
                <h3>Recently Viewed</h3>
                <div class="recent-links"></div>
            `;
            
            const contentWrapper = document.querySelector('#content-wrapper');
            if (contentWrapper && contentWrapper.firstChild) {
                contentWrapper.insertBefore(recentSection, contentWrapper.firstChild);
            }
            
            // Add recent links
            const container = recentSection.querySelector('.recent-links');
            recentLinks.slice(0, 10).forEach(item => {
                const link = document.createElement('a');
                link.href = item.url;
                link.className = 'recent-link';
                link.textContent = item.text;
                link.target = '_blank';
                container.appendChild(link);
            });
        }
        
        // Track link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href*="instagram.com"]');
            if (!link) return;
            
            const recentLinks = JSON.parse(localStorage.getItem('recentlyViewedLinks') || '[]');
            const newItem = {
                url: link.href,
                text: link.textContent.trim(),
                timestamp: Date.now()
            };
            
            // Remove duplicates and add to front
            const filtered = recentLinks.filter(item => item.url !== newItem.url);
            filtered.unshift(newItem);
            
            // Keep only last 20
            localStorage.setItem('recentlyViewedLinks', JSON.stringify(filtered.slice(0, 20)));
        });
    }

    function saveUserPreferences() {
        localStorage.setItem('linksUIPreferences', JSON.stringify(uiState));
    }

    function loadUserPreferences() {
        const saved = localStorage.getItem('linksUIPreferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            Object.assign(uiState, preferences);
            
            // Apply saved view mode
            if (uiState.viewMode !== 'grid') {
                changeViewMode(uiState.viewMode);
                document.querySelector(`[data-view="${uiState.viewMode}"]`)?.classList.add('active');
            }
            
            // Apply saved sort
            if (uiState.sortBy !== 'default') {
                applySorting(uiState.sortBy);
            }
        }
    }

})();