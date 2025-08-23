// Debug script to identify issues with links page
console.log('=== LINKS PAGE DEBUG START ===');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Check for required elements
    const checks = {
        'Search Input': document.getElementById('linkSearch'),
        'Search Container': document.querySelector('.search-container'),
        'Filter Container': document.querySelector('.filter-container'),
        'Filter Buttons': document.querySelectorAll('.filter-btn'),
        'Link Items': document.querySelectorAll('.link-item-wrapper'),
        'Instagram Links Sections': document.querySelectorAll('.instagram-links'),
        'Link Grids': document.querySelectorAll('.link-grid'),
        'Hover Menus': document.querySelectorAll('.hover-menu'),
        'Category Headers (H3)': document.querySelectorAll('.instagram-links h3'),
        'Subcategory Headers (H4)': document.querySelectorAll('.instagram-links h4')
    };
    
    console.log('=== ELEMENT CHECK ===');
    for (const [name, element] of Object.entries(checks)) {
        if (element instanceof NodeList) {
            console.log(`✓ ${name}: ${element.length} found`);
        } else {
            console.log(`${element ? '✓' : '✗'} ${name}: ${element ? 'found' : 'NOT FOUND'}`);
        }
    }
    
    // Check for JavaScript errors
    window.addEventListener('error', function(e) {
        console.error('JavaScript Error:', e.message, 'at', e.filename, ':', e.lineno);
    });
    
    // Test search functionality
    const searchInput = document.getElementById('linkSearch');
    if (searchInput) {
        console.log('=== TESTING SEARCH ===');
        searchInput.value = 'test';
        searchInput.dispatchEvent(new Event('input'));
        setTimeout(() => {
            const visibleLinks = document.querySelectorAll('.link-item-wrapper:not([style*="display: none"])');
            console.log(`Search for "test": ${visibleLinks.length} visible links`);
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }, 500);
    }
    
    // Test filter functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns.length > 0) {
        console.log('=== TESTING FILTERS ===');
        filterBtns.forEach((btn, index) => {
            console.log(`Filter ${index}: "${btn.textContent.trim()}" - data-filter="${btn.dataset.filter}"`);
        });
    }
    
    // Check for duplicate event listeners
    console.log('=== CHECKING FOR ISSUES ===');
    
    // Check collapse icons
    const collapseIcons = document.querySelectorAll('.collapse-icon');
    console.log(`Collapse icons found: ${collapseIcons.length}`);
    
    // Check for duplicates
    document.querySelectorAll('.instagram-links h3, .instagram-links h4').forEach(header => {
        const icons = header.querySelectorAll('.collapse-icon');
        if (icons.length > 1) {
            console.warn(`Duplicate collapse icons in header: "${header.textContent.trim()}" (${icons.length} icons)`);
        }
    });
    
    // Log all loaded scripts
    console.log('=== LOADED SCRIPTS ===');
    document.querySelectorAll('script').forEach(script => {
        if (script.src) {
            console.log(`Script: ${script.src.split('/').pop()}`);
        }
    });
    
    console.log('=== LINKS PAGE DEBUG END ===');
});