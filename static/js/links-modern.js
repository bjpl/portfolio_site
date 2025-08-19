// Links Page Modern JavaScript
(function() {
    'use strict';

    // State management
    const state = {
        allLinks: [],
        currentCategory: 'all',
        currentRegion: 'all',
        searchTerm: '',
        stats: {
            totalLinks: 0,
            categories: new Set(),
            countries: new Set()
        }
    };

    // DOM Elements
    let searchInput;
    let categoryFilters;
    let regionFilters;
    let sidebarNav;
    let contentWrapper;
    let statsElements;

    // Initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM is already loaded
        setTimeout(initialize, 100);
    }

    function initialize() {
        console.log('Initializing links page...');
        
        // Cache DOM elements
        searchInput = document.getElementById('search-input');
        categoryFilters = document.getElementById('category-filters');
        regionFilters = document.getElementById('region-filters');
        sidebarNav = document.getElementById('sidebar-nav');
        contentWrapper = document.getElementById('content-wrapper');
        statsElements = {
            totalLinks: document.getElementById('total-links'),
            totalCategories: document.getElementById('total-categories'),
            totalCountries: document.getElementById('total-countries')
        };
        
        console.log('DOM elements found:', {
            searchInput: !!searchInput,
            categoryFilters: !!categoryFilters,
            statsElements: !!statsElements.totalLinks
        });
        
        // Check if links are present
        const testLinks = document.querySelectorAll('.link-grid a');
        console.log('Test query found', testLinks.length, 'links');
        
        if (testLinks.length === 0) {
            console.error('No links found! Retrying in 500ms...');
            setTimeout(initialize, 500);
            return;
        }

        // Process all links
        processLinks();
        
        // Setup event listeners
        setupEventListeners();
        
        // Build dynamic UI elements
        buildSidebarNavigation();
        buildRegionFilters();
        
        // Update stats
        updateStats();
        
        // Add collapsible functionality
        setupCollapsibles();
        
        // Add smooth scrolling
        setupSmoothScrolling();
        
        // Add intersection observer for animations
        setupIntersectionObserver();
        
        // Setup lazy loading
        setupLazyLoading();
        
        // Setup tooltips
        setupTooltips();
    }

    function processLinks() {
        try {
            const allLinkElements = document.querySelectorAll('.link-grid a');
            console.log('Found links:', allLinkElements.length);
            
            if (allLinkElements.length === 0) {
                console.warn('No links found to process');
                return;
            }
            
            allLinkElements.forEach(link => {
                try {
                    const linkData = {
                        element: link,
                        text: (link.textContent || '').toLowerCase().trim(),
                        href: link.href || '',
                        tags: (link.getAttribute('data-tags') || '').toLowerCase().trim(),
                        category: getCategory(link),
                        region: getRegion(link)
                    };
                    
                    // Skip invalid links
                    if (!linkData.href) {
                        console.warn('Skipping link without href:', linkData.text);
                        return;
                    }
                    
                    state.allLinks.push(linkData);
                    
                    // Extract stats
                    if (linkData.category) state.stats.categories.add(linkData.category);
                    
                    // Extract countries from tags
                    const countries = linkData.tags.match(/[a-z-]+(?=\s|$)/g) || [];
                    countries.forEach(country => {
                        if (country.length > 2 && country.length < 30) { // Sanity check
                            state.stats.countries.add(country);
                        }
                    });
                } catch (err) {
                    console.error('Error processing link:', err, link);
                }
            });
            
            state.stats.totalLinks = state.allLinks.length;
            console.log('Processed links:', state.stats.totalLinks);
        } catch (err) {
            console.error('Error in processLinks:', err);
        }
    }

    function getCategory(link) {
        const section = link.closest('.instagram-links');
        if (!section) return 'other';
        
        const classes = section.className.split(' ');
        for (const cls of classes) {
            if (cls !== 'instagram-links' && cls !== 'loading') {
                return cls;
            }
        }
        return 'other';
    }

    function getRegion(link) {
        const tags = link.getAttribute('data-tags') || '';
        // Extract common regions
        if (tags.includes('mexico')) return 'mexico';
        if (tags.includes('colombia')) return 'colombia';
        if (tags.includes('usa') || tags.includes('united-states')) return 'usa';
        if (tags.includes('europe')) return 'europe';
        if (tags.includes('asia')) return 'asia';
        if (tags.includes('latin-america')) return 'latin-america';
        return 'other';
    }

    function setupEventListeners() {
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
            searchInput.addEventListener('focus', () => {
                searchInput.parentElement.classList.add('focused');
            });
            searchInput.addEventListener('blur', () => {
                searchInput.parentElement.classList.remove('focused');
            });
        }

        // Category filters
        if (categoryFilters) {
            categoryFilters.addEventListener('click', handleCategoryFilter);
        }

        // Region filters (dynamically added)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('region-filter')) {
                handleRegionFilter(e);
            }
        });

        // Copy to clipboard
        document.addEventListener('click', (e) => {
            if (e.target.closest('.link-grid a')) {
                e.preventDefault();
                const link = e.target.closest('.link-grid a');
                handleLinkClick(link);
            }
        });
    }

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        state.searchTerm = searchTerm;
        
        console.log('Searching for:', searchTerm);
        
        filterLinks();
        highlightMatches(searchTerm);
        
        // Update search feedback
        updateSearchFeedback(searchTerm);
    }

    function handleCategoryFilter(e) {
        if (!e.target.classList.contains('pill')) return;
        
        // Update active state
        document.querySelectorAll('.pill').forEach(pill => {
            pill.classList.remove('active');
        });
        e.target.classList.add('active');
        
        // Update state
        state.currentCategory = e.target.getAttribute('data-category');
        
        // Apply filters
        filterLinks();
        
        // Smooth scroll to content
        if (state.currentCategory !== 'all') {
            const targetSection = document.querySelector(`.instagram-links.${state.currentCategory}`);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    function handleRegionFilter(e) {
        const filter = e.target;
        filter.classList.toggle('active');
        
        const activeRegions = Array.from(document.querySelectorAll('.region-filter.active'))
            .map(f => f.getAttribute('data-region'));
        
        state.currentRegion = activeRegions.length > 0 ? activeRegions : 'all';
        
        filterLinks();
    }

    function filterLinks() {
        const { searchTerm, currentCategory, currentRegion } = state;
        
        let visibleCount = 0;
        let hiddenCount = 0;
        
        state.allLinks.forEach(linkData => {
            const { element, text, href, tags, category, region } = linkData;
            
            // Search filter - check all fields including tags
            const matchesSearch = !searchTerm || 
                text.includes(searchTerm) || 
                href.includes(searchTerm) || 
                tags.includes(searchTerm);
            
            // Category filter
            const matchesCategory = currentCategory === 'all' || category === currentCategory;
            
            // Region filter
            const matchesRegion = currentRegion === 'all' || 
                (Array.isArray(currentRegion) ? currentRegion.includes(region) : region === currentRegion);
            
            // Show/hide element
            if (matchesSearch && matchesCategory && matchesRegion) {
                element.style.display = '';
                element.classList.add('fade-in');
                visibleCount++;
            } else {
                element.style.display = 'none';
                element.classList.remove('fade-in');
                hiddenCount++;
            }
        });
        
        console.log(`Filter results: ${visibleCount} visible, ${hiddenCount} hidden`);
        
        // Hide empty sections
        document.querySelectorAll('.instagram-links').forEach(section => {
            const allSectionLinks = section.querySelectorAll('.link-grid a');
            let hasVisibleLinks = false;
            
            allSectionLinks.forEach(link => {
                if (link.style.display !== 'none') {
                    hasVisibleLinks = true;
                }
            });
            
            section.style.display = hasVisibleLinks ? '' : 'none';
        });
    }

    function highlightMatches(searchTerm) {
        if (!searchTerm) {
            state.allLinks.forEach(linkData => {
                linkData.element.classList.remove('text-match', 'tag-match');
            });
            return;
        }
        
        state.allLinks.forEach(linkData => {
            const { element, text, tags } = linkData;
            
            element.classList.remove('text-match', 'tag-match');
            
            if (element.style.display === 'none') return;
            
            if (text.includes(searchTerm)) {
                element.classList.add('text-match');
            } else if (tags.includes(searchTerm)) {
                element.classList.add('tag-match');
            }
        });
    }

    function updateSearchFeedback(searchTerm) {
        if (!searchTerm) return;
        
        const visibleLinks = state.allLinks.filter(l => l.element.style.display !== 'none').length;
        const totalLinks = state.allLinks.length;
        
        // Create or update feedback element
        let feedback = document.querySelector('.search-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'search-feedback';
            searchInput.parentElement.appendChild(feedback);
        }
        
        if (visibleLinks === 0) {
            feedback.textContent = `No results found for "${searchTerm}"`;
            feedback.style.color = '#ef4444';
        } else {
            feedback.textContent = `Showing ${visibleLinks} of ${totalLinks} links`;
            feedback.style.color = '#6b7280';
        }
    }

    function buildSidebarNavigation() {
        if (!sidebarNav) return;
        
        const sections = document.querySelectorAll('.instagram-links');
        const navHTML = [];
        
        sections.forEach(section => {
            const title = section.querySelector('h3');
            if (title) {
                const id = title.textContent.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
                title.id = id;
                
                navHTML.push(`
                    <a href="#${id}" class="nav-link" data-section="${id}">
                        ${title.textContent}
                    </a>
                `);
            }
        });
        
        sidebarNav.innerHTML = navHTML.join('');
    }

    function buildRegionFilters() {
        const container = document.getElementById('region-filters');
        if (!container) return;
        
        const regions = [
            { code: 'mexico', label: '🇲🇽 Mexico' },
            { code: 'colombia', label: '🇨🇴 Colombia' },
            { code: 'usa', label: '🇺🇸 USA' },
            { code: 'europe', label: '🇪🇺 Europe' },
            { code: 'asia', label: '🌏 Asia' },
            { code: 'latin-america', label: '🌎 Latin America' }
        ];
        
        const filterHTML = regions.map(region => `
            <button class="region-filter" data-region="${region.code}">
                ${region.label}
            </button>
        `).join('');
        
        container.innerHTML = filterHTML;
    }

    function updateStats() {
        console.log('Updating stats:', {
            totalLinks: state.stats.totalLinks,
            categories: state.stats.categories.size,
            countries: state.stats.countries.size
        });
        
        if (statsElements.totalLinks) {
            animateNumber(statsElements.totalLinks, state.stats.totalLinks);
        }
        if (statsElements.totalCategories) {
            animateNumber(statsElements.totalCategories, state.stats.categories.size);
        }
        if (statsElements.totalCountries) {
            animateNumber(statsElements.totalCountries, state.stats.countries.size);
        }
    }

    function animateNumber(element, target) {
        const duration = 1000;
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    function setupCollapsibles() {
        document.querySelectorAll('.instagram-links h4').forEach(header => {
            const grid = header.nextElementSibling;
            
            // Add link count
            if (grid && grid.classList.contains('link-grid')) {
                const linkCount = grid.querySelectorAll('a').length;
                const countSpan = document.createElement('span');
                countSpan.className = 'count';
                countSpan.textContent = linkCount;
                
                // Add chevron icon
                const chevron = document.createElement('span');
                chevron.className = 'chevron';
                chevron.textContent = '▼';
                
                // Clear and rebuild header content
                const headerText = header.textContent;
                header.textContent = headerText;
                header.appendChild(countSpan);
                header.appendChild(chevron);
            }
            
            header.addEventListener('click', (e) => {
                e.preventDefault();
                header.classList.toggle('collapsed');
                const grid = header.nextElementSibling;
                if (grid && grid.classList.contains('link-grid')) {
                    if (header.classList.contains('collapsed')) {
                        grid.style.display = 'none';
                    } else {
                        grid.style.display = 'grid';
                    }
                }
            });
        });
    }

    function setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update active nav
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                    });
                    this.classList.add('active');
                }
            });
        });
    }

    function setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    
                    // Update sidebar navigation
                    const id = entry.target.querySelector('h3')?.id;
                    if (id) {
                        document.querySelectorAll('.nav-link').forEach(link => {
                            link.classList.remove('active');
                        });
                        const activeLink = document.querySelector(`.nav-link[data-section="${id}"]`);
                        if (activeLink) activeLink.classList.add('active');
                    }
                }
            });
        }, options);
        
        document.querySelectorAll('.instagram-links').forEach(section => {
            observer.observe(section);
        });
    }

    function handleLinkClick(link) {
        const href = link.href;
        
        // Open in new tab
        window.open(href, '_blank');
        
        // Copy to clipboard
        navigator.clipboard.writeText(href).then(() => {
            showNotification('Link copied to clipboard!');
        });
        
        // Add visited state
        link.classList.add('visited');
    }
    
    // Add strategic tooltips - DISABLED to keep cards clean
    function setupTooltips() {
        // Tooltips disabled - tags are only for search, not display
        return;
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    function setupLazyLoading() {
        // Lazy load sections that are not immediately visible
        const lazyOptions = {
            rootMargin: '200px',
            threshold: 0
        };
        
        const lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target;
                    
                    // Load links in this section
                    const links = section.querySelectorAll('.link-grid a');
                    links.forEach((link, index) => {
                        setTimeout(() => {
                            link.classList.add('loaded');
                            link.style.animation = `fadeInUp 0.4s ease ${index * 0.02}s both`;
                        }, index * 10);
                    });
                    
                    // Stop observing this section
                    lazyObserver.unobserve(section);
                }
            });
        }, lazyOptions);
        
        // Observe all sections except the first few
        const sections = document.querySelectorAll('.instagram-links');
        sections.forEach((section, index) => {
            if (index > 2) { // Don't lazy load first 3 sections
                lazyObserver.observe(section);
                
                // Initially hide links in lazy sections
                const links = section.querySelectorAll('.link-grid a');
                links.forEach(link => {
                    link.style.opacity = '0';
                });
            }
        });
    }

    // Utility functions
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

// Fallback simple search if modern features don't work
window.addEventListener('load', function() {
    console.log('Running fallback setup...');
    const searchInput = document.getElementById('search-input');
    const categoryFilters = document.getElementById('category-filters');
    
    // Update stats immediately in fallback
    const allLinks = document.querySelectorAll('.link-grid a');
    const totalLinksElement = document.getElementById('total-links');
    const totalCategoriesElement = document.getElementById('total-categories');
    const totalCountriesElement = document.getElementById('total-countries');
    
    if (totalLinksElement && totalLinksElement.textContent === '0') {
        totalLinksElement.textContent = allLinks.length;
    }
    
    // Count unique categories
    const categories = new Set();
    document.querySelectorAll('.instagram-links').forEach(section => {
        const classes = section.className.split(' ');
        classes.forEach(cls => {
            if (cls !== 'instagram-links' && cls !== 'loading') {
                categories.add(cls);
            }
        });
    });
    
    if (totalCategoriesElement && totalCategoriesElement.textContent === '0') {
        totalCategoriesElement.textContent = categories.size;
    }
    
    // Estimate countries from tags
    const countries = new Set();
    allLinks.forEach(link => {
        const tags = (link.getAttribute('data-tags') || '').split(' ');
        tags.forEach(tag => {
            if (tag.match(/^(mexico|colombia|venezuela|usa|canada|brazil|argentina|chile|peru|spain|france|germany|italy|uk|japan|china|india)/i)) {
                countries.add(tag);
            }
        });
    });
    
    if (totalCountriesElement && totalCountriesElement.textContent === '0') {
        totalCountriesElement.textContent = countries.size > 0 ? countries.size : '30+';
    }
    
    // Setup search
    if (searchInput && !searchInput.hasAttribute('data-fallback')) {
        searchInput.setAttribute('data-fallback', 'true');
        
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            console.log('Fallback search:', searchTerm);
            
            // Get all links
            const allLinks = document.querySelectorAll('.link-grid a');
            let visibleCount = 0;
            
            allLinks.forEach(link => {
                const text = link.textContent.toLowerCase().trim();
                const tags = (link.getAttribute('data-tags') || '').toLowerCase().trim();
                const href = (link.href || '').toLowerCase();
                
                // Handle edge cases
                const searchTerms = searchTerm.split(/\s+/).filter(t => t.length > 0);
                let matches = false;
                
                if (!searchTerm || searchTerm.length === 0) {
                    matches = true;
                } else if (searchTerms.length > 1) {
                    // Multi-word search - match ALL terms
                    matches = searchTerms.every(term => 
                        text.includes(term) || tags.includes(term) || href.includes(term)
                    );
                } else {
                    // Single word search
                    matches = text.includes(searchTerm) || tags.includes(searchTerm) || href.includes(searchTerm);
                }
                
                if (matches) {
                    link.style.display = '';
                    link.style.opacity = '1';
                    visibleCount++;
                } else {
                    link.style.display = 'none';
                }
            });
            
            console.log('Fallback search results:', visibleCount, 'visible');
            
            // Hide empty sections
            document.querySelectorAll('.instagram-links').forEach(section => {
                const links = section.querySelectorAll('.link-grid a');
                let hasVisible = false;
                links.forEach(l => {
                    if (l.style.display !== 'none') hasVisible = true;
                });
                section.style.display = hasVisible ? '' : 'none';
            });
        });
    }
    
    // Setup category filters
    if (categoryFilters) {
        categoryFilters.addEventListener('click', function(e) {
            if (e.target.classList.contains('pill')) {
                console.log('Fallback category filter:', e.target.getAttribute('data-category'));
                
                // Update active state
                document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                
                const category = e.target.getAttribute('data-category');
                
                if (category === 'all') {
                    // Show all sections
                    document.querySelectorAll('.instagram-links').forEach(section => {
                        section.style.display = '';
                    });
                    document.querySelectorAll('.link-grid a').forEach(link => {
                        link.style.display = '';
                        link.style.opacity = '1';
                    });
                } else {
                    // Hide all sections first
                    document.querySelectorAll('.instagram-links').forEach(section => {
                        if (section.classList.contains(category)) {
                            section.style.display = '';
                        } else {
                            section.style.display = 'none';
                        }
                    });
                }
            }
        });
    }
});