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
    function addToRecentlyViewed(wrapper) {
        const instagramLink = wrapper.querySelector('.social-icon.instagram');
        const websiteLink = wrapper.querySelector('.social-icon.website');
        const youtubeLink = wrapper.querySelector('.social-icon.youtube');
        const displayText = wrapper.querySelector('.link-display').textContent;

        const recentLinks = getRecentlyViewed();
        
        // Create link object with all available URLs
        const linkData = {
            instagram: instagramLink?.href,
            website: websiteLink?.href,
            youtube: youtubeLink?.href,
            text: displayText,
            timestamp: Date.now()
        };

        // Remove existing entry if present (match by Instagram URL)
        const existing = recentLinks.findIndex(item => item.instagram === linkData.instagram);
        if (existing > -1) {
            recentLinks.splice(existing, 1);
        }
        
        // Add to front of array
        recentLinks.unshift(linkData);
        
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
                <div class="link-grid"></div>
            `;
            
            // Insert at the top of the content
            const content = document.querySelector('.page-content');
            if (content) {
                content.insertAdjacentElement('afterbegin', recentSection);
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
            
            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'link-item-wrapper';
            
            // Create display text
            const display = document.createElement('div');
            display.className = 'link-display';
            display.textContent = link.text;
            wrapper.appendChild(display);

            // Create hover menu
            const menu = document.createElement('div');
            menu.className = 'hover-menu compact-icons';

            // Add Instagram icon (always present)
            const instagramLink = createSocialIcon('instagram', link.instagram, 'View on Instagram');
            menu.appendChild(instagramLink);

            // Add Website icon if available
            if (link.website) {
                const websiteLink = createSocialIcon('website', link.website, 'Visit Website');
                menu.appendChild(websiteLink);
            }

            // Add YouTube icon if available
            if (link.youtube) {
                const youtubeLink = createSocialIcon('youtube', link.youtube, 'Watch on YouTube');
                menu.appendChild(youtubeLink);
            }

            // Add time ago
            const time = document.createElement('div');
            time.className = 'time-ago';
            time.textContent = timeAgo;
            menu.appendChild(time);

            wrapper.appendChild(menu);
            linkGrid.appendChild(wrapper);
        });
    }

    // Create social icon link
    function createSocialIcon(type, url, tooltip) {
        const link = document.createElement('a');
        link.className = `social-icon ${type}`;
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('data-tooltip', tooltip);
        link.innerHTML = icons[type];
        return link;
    }

    // Social media icons SVG
    const icons = {
        instagram: \`<svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
        </svg>\`,
        website: \`<svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>\`,
        youtube: \`<svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M21.582 7.15A2.513 2.513 0 0 0 19.814 5.4C18.254 5 12 5 12 5s-6.254 0-7.814.4c-.86.228-1.54.898-1.768 1.75C2 8.7 2 12 2 12s0 3.3.418 4.85c.228.852.908 1.522 1.768 1.75C5.746 19 12 19 12 19s6.254 0 7.814-.4a2.513 2.513 0 0 0 1.768-1.75C22 15.3 22 12 22 12s0-3.3-.418-4.85zM10 15V9l5.2 3-5.2 3z"/>
        </svg>\`
    };

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
            addToRecentlyViewed(wrapper);
        });
    });

    // Initial UI update
    updateRecentlyViewedUI();
});