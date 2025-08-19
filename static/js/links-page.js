// Links Page Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    
    // Add search functionality
    const searchContainer = document.querySelector('.page-content');
    if (searchContainer) {
        // Create search bar
        const searchBar = document.createElement('div');
        searchBar.className = 'search-container';
        searchBar.innerHTML = `
            <input type="text" id="link-search" class="search-input" placeholder="Search by country, city, or keyword... (e.g., 'Bogota', 'Mexico', 'Embassy', 'Medellin')">
            <div class="search-stats"></div>
        `;
        
        // Insert search bar after page header
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader) {
            pageHeader.insertAdjacentElement('afterend', searchBar);
        }
        
        // Search functionality
        const searchInput = document.getElementById('link-search');
        const searchStats = document.querySelector('.search-stats');
        
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                const allLinks = document.querySelectorAll('.link-grid a');
                const sections = document.querySelectorAll('.instagram-links, .cultural, .organizations, .food-brands, .other-brands');
                
                let visibleCount = 0;
                let totalCount = allLinks.length;
                
                // Show/hide links based on search
                allLinks.forEach(link => {
                    const text = link.textContent.toLowerCase();
                    const href = link.getAttribute('href').toLowerCase();
                    const tags = (link.getAttribute('data-tags') || '').toLowerCase();
                    
                    // Remove previous match indicators
                    link.classList.remove('tag-match', 'text-match');
                    
                    if (searchTerm === '') {
                        link.style.display = '';
                        visibleCount++;
                    } else if (text.includes(searchTerm) || href.includes(searchTerm)) {
                        link.style.display = '';
                        link.classList.add('text-match');
                        visibleCount++;
                    } else if (tags.includes(searchTerm)) {
                        link.style.display = '';
                        link.classList.add('tag-match');
                        visibleCount++;
                    } else {
                        link.style.display = 'none';
                    }
                });
                
                // Hide empty sections
                sections.forEach(section => {
                    const visibleLinks = section.querySelectorAll('.link-grid a:not([style*="display: none"])');
                    if (visibleLinks.length === 0 && searchTerm !== '') {
                        section.style.display = 'none';
                    } else {
                        section.style.display = '';
                    }
                });
                
                // Update search stats
                if (searchTerm !== '') {
                    searchStats.textContent = `Showing ${visibleCount} of ${totalCount} links`;
                    searchStats.style.display = 'block';
                } else {
                    searchStats.style.display = 'none';
                }
            });
        }
    }
    
    // Make sections collapsible
    const sectionHeaders = document.querySelectorAll('.instagram-links h4, .instagram-links h3');
    
    sectionHeaders.forEach(header => {
        // Skip the main section title
        if (header.tagName === 'H3') return;
        
        // Add collapse indicator
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        header.innerHTML = `<span class="collapse-icon">▼</span> ${header.innerHTML}`;
        
        // Get the next sibling (link-grid)
        const linkGrid = header.nextElementSibling;
        if (linkGrid && linkGrid.classList.contains('link-grid')) {
            // Add click handler
            header.addEventListener('click', function() {
                const icon = header.querySelector('.collapse-icon');
                
                if (linkGrid.style.display === 'none') {
                    linkGrid.style.display = '';
                    icon.textContent = '▼';
                    icon.style.transform = 'rotate(0deg)';
                } else {
                    linkGrid.style.display = 'none';
                    icon.textContent = '▶';
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        }
    });
    
    // Add category filter buttons
    const categories = [
        { name: 'All', class: '' },
        { name: 'Diplomatic', class: 'diplomatic' },
        { name: 'Cultural', class: 'cultural' },
        { name: 'Organizations', class: 'organizations' },
        { name: 'Government', class: 'government' },
        { name: 'Food Brands', class: 'food-brands' },
        { name: 'Local Food', class: 'local-food' },
        { name: 'Travel', class: 'travel' },
        { name: 'Education', class: 'education' },
        { name: 'Other', class: 'other-brands' }
    ];
    
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';
    filterContainer.innerHTML = '<div class="filter-buttons"></div>';
    
    const searchContainer2 = document.querySelector('.search-container');
    if (searchContainer2) {
        searchContainer2.insertAdjacentElement('afterend', filterContainer);
    }
    
    const filterButtons = document.querySelector('.filter-buttons');
    if (filterButtons) {
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = cat.name;
            if (cat.class === '') btn.classList.add('active');
            
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show/hide sections
                const allSections = document.querySelectorAll('.instagram-links');
                
                if (cat.class === '') {
                    // Show all
                    allSections.forEach(s => s.style.display = '');
                } else {
                    // Show only selected category
                    allSections.forEach(section => {
                        if (section.classList.contains(cat.class)) {
                            section.style.display = '';
                        } else {
                            section.style.display = 'none';
                        }
                    });
                }
                
                // Clear search
                const searchInput = document.getElementById('link-search');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
            });
            
            filterButtons.appendChild(btn);
        });
    }
    
    // Add link counter for each section
    document.querySelectorAll('.link-grid').forEach(grid => {
        const linkCount = grid.querySelectorAll('a').length;
        const header = grid.previousElementSibling;
        if (header && (header.tagName === 'H4' || header.tagName === 'H3')) {
            const counter = document.createElement('span');
            counter.className = 'link-counter';
            counter.textContent = `(${linkCount})`;
            header.appendChild(counter);
        }
    });
    
    // Add copy link functionality
    document.querySelectorAll('.link-grid a').forEach(link => {
        link.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const url = link.getAttribute('href');
            navigator.clipboard.writeText(url).then(() => {
                // Show copied notification
                const notification = document.createElement('div');
                notification.className = 'copy-notification';
                notification.textContent = 'Link copied!';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 2000);
            });
        });
    });
});

// Add smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});