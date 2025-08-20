// Links Page Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    
    // Search functionality is now handled by links-search-filter.js
    // Removed duplicate search bar creation
    
    // Add collapsible functionality
    const sections = document.querySelectorAll('.instagram-links');
    
    sections.forEach(section => {
        // Add collapse functionality to main sections
        const h3 = section.querySelector('h3');
        const content = section.querySelector('.links-section-content');
        let isExpanded = true;
        
        h3.addEventListener('click', () => {
            isExpanded = !isExpanded;
            const icon = h3.querySelector('.collapse-icon');
            if (icon) {
                icon.textContent = isExpanded ? '▼' : '▶';
            }
            if (content) {
                content.style.display = isExpanded ? '' : 'none';
            }
        });

        // Add collapse functionality to subsections
        const h4s = section.querySelectorAll('h4');
        h4s.forEach(h4 => {
            const subContent = h4.nextElementSibling;
            let isSubExpanded = true;
            
            h4.addEventListener('click', (e) => {
                e.stopPropagation();
                isSubExpanded = !isSubExpanded;
                const icon = h4.querySelector('.collapse-icon');
                if (icon) {
                    icon.textContent = isSubExpanded ? '▼' : '▶';
                }
                if (subContent) {
                    subContent.style.display = isSubExpanded ? '' : 'none';
                }
            });
        });
    });
    
    // Add category filter buttons
    const categories = [
        { name: 'All', class: '' },
        { name: 'Government & Diplomatic', class: 'govdip' },
        { name: 'Education & Research', class: 'education' },
        { name: 'Culture & Arts', class: 'culture' },
        { name: 'Food & Dining', class: 'food' },
        { name: 'Travel & Tourism', class: 'travel' }
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
            
            btn.addEventListener('click', function(e) {
                // Create ripple effect
                const ripple = document.createElement('div');
                ripple.className = 'ripple';
                ripple.style.left = (e.offsetX - 5) + 'px';
                ripple.style.top = (e.offsetY - 5) + 'px';
                btn.appendChild(ripple);
                
                // Clean up ripple
                setTimeout(() => ripple.remove(), 600);

                // Remove active class from all buttons
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show/hide sections
                const allSections = document.querySelectorAll('.instagram-links');
                const recentlyViewed = document.querySelector('.recently-viewed');
                
                if (cat.class === '') {
                    // Show all except recently viewed
                    allSections.forEach(s => {
                        if (!s.classList.contains('recently-viewed')) {
                            s.style.display = '';
                        }
                    });
                } else {
                    // Show only selected category
                    allSections.forEach(section => {
                        if (section === recentlyViewed) return;
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
    
    // Removed link counters for cleaner design
    
    // Add copy link functionality
    document.querySelectorAll('.link-item-wrapper').forEach(wrapper => {
        wrapper.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            
            // Get all available URLs
            const instagramUrl = wrapper.querySelector('.social-icon.instagram')?.href;
            const websiteUrl = wrapper.querySelector('.social-icon.website')?.href;
            const youtubeUrl = wrapper.querySelector('.social-icon.youtube')?.href;
            
            // Create menu to choose which URL to copy
            const menu = document.createElement('div');
            menu.className = 'copy-menu';
            menu.style.cssText = `
                position: fixed;
                z-index: 1000;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 8px 0;
                min-width: 160px;
            `;
            menu.style.left = e.pageX + 'px';
            menu.style.top = e.pageY + 'px';
            
            // Add menu items
            const addMenuItem = (text, url) => {
                if (!url) return;
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 8px 16px;
                    cursor: pointer;
                    transition: background 0.2s;
                `;
                item.textContent = `Copy ${text}`;
                item.addEventListener('mouseenter', () => {
                    item.style.background = '#f3f4f6';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = 'transparent';
                });
                item.addEventListener('click', () => {
                    navigator.clipboard.writeText(url).then(() => {
                        menu.remove();
                        showNotification('Link copied!');
                    });
                });
                menu.appendChild(item);
            };
            
            addMenuItem('Instagram URL', instagramUrl);
            addMenuItem('Website URL', websiteUrl);
            addMenuItem('YouTube URL', youtubeUrl);
            
            // Add click outside listener
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
            
            document.body.appendChild(menu);
        });
    });
});

// Show notification
function showNotification(text) {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = text;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

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