// Links Page Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    
    // Search functionality is now handled by links-search-filter.js
    // Removed duplicate search bar creation
    
    // Collapsible functionality is handled in links-search-filter.js
    // Removed duplicate implementation to prevent conflicts
    
    // Filter buttons are now handled in the template and links-search-filter.js
    // Removed duplicate filter button creation to prevent duplication
    
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