// Recently Viewed Links Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const STORAGE_KEY = 'recently_viewed_links';
    const MAX_RECENT = 10;

    // Get recently viewed links from localStorage
    function getRecentlyViewed() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error reading recently viewed:', e);
            return [];
        }
    }

    // Save recently viewed links to localStorage
    function saveRecentlyViewed(links) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
        } catch (e) {
            console.error('Error saving recently viewed:', e);
        }
    }

    // Add a link to recently viewed
    function addToRecentlyViewed(link) {
        const recentLinks = getRecentlyViewed();
        
        // Remove existing entry if present
        const existing = recentLinks.findIndex(item => item.href === link.href);
        if (existing > -1) {
            recentLinks.splice(existing, 1);
        }
        
        // Add to front of array
        recentLinks.unshift({
            href: link.href,
            text: link.querySelector('.link-display').textContent,
            timestamp: Date.now()
        });
        
        // Keep only MAX_RECENT items
        while (recentLinks.length > MAX_RECENT) {
            recentLinks.pop();
        }
        
        saveRecentlyViewed(recentLinks);
        updateRecentlyViewedUI();
    }

    // Create and update the Recently Viewed section
    function updateRecentlyViewedUI() {
        let recentSection = document.querySelector('.recently-viewed');
        if (!recentSection) {
            recentSection = document.createElement('div');
            recentSection.className = 'instagram-links recently-viewed';
            recentSection.innerHTML = `
                <h3>Recently Viewed</h3>
                <div class="link-grid recent-links"></div>
            `;
            
            // Insert after search and filter
            const filterContainer = document.querySelector('.filter-container');
            if (filterContainer) {
                filterContainer.insertAdjacentElement('afterend', recentSection);
            }
        }

        const linkGrid = recentSection.querySelector('.link-grid');
        const recentLinks = getRecentlyViewed();

        // Show/hide section based on content
        recentSection.style.display = recentLinks.length ? '' : 'none';
        
        // Clear and rebuild links
        linkGrid.innerHTML = '';
        recentLinks.forEach(link => {
            const timeAgo = getTimeAgo(link.timestamp);
            const wrapper = document.createElement('div');
            wrapper.className = 'link-item-wrapper';
            wrapper.innerHTML = `
                <div class="link-display">${link.text}</div>
                <div class="time-ago">${timeAgo}</div>
            `;
            wrapper.addEventListener('click', () => {
                window.location.href = link.href;
            });
            linkGrid.appendChild(wrapper);
        });
    }

    // Format timestamp as "time ago"
    function getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const count = Math.floor(seconds / secondsInUnit);
            if (count >= 1) {
                return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
            }
        }
        
        return 'just now';
    }

    // Add click handlers to all link wrappers
    document.querySelectorAll('.link-item-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', () => {
            const link = {
                href: wrapper.querySelector('a')?.href || '#',
                text: wrapper.querySelector('.link-display').textContent,
                timestamp: Date.now()
            };
            addToRecentlyViewed(link);
        });
    });

    // Initial UI update
    updateRecentlyViewedUI();
});