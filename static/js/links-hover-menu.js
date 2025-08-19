// Hover Menu System for Links
(function() {
    'use strict';

    // SVG Icons
    const icons = {
        instagram: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
        </svg>`,
        
        website: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>`,
        
        youtube: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>`
    };

    // Initialize hover menus on page load
    document.addEventListener('DOMContentLoaded', initializeHoverMenus);

    function initializeHoverMenus() {
        console.log('Initializing hover menu system...');
        
        // Process all link grids
        const linkGrids = document.querySelectorAll('.link-grid');
        let processedCount = 0;
        
        linkGrids.forEach(grid => {
            const links = grid.querySelectorAll('a');
            
            links.forEach(link => {
                // Skip if already processed
                if (link.parentElement.classList.contains('link-item-wrapper')) {
                    return;
                }
                
                // Create wrapper
                const wrapper = document.createElement('div');
                wrapper.className = 'link-item-wrapper';
                
                // Clone the link as a div for display
                const linkDisplay = document.createElement('div');
                linkDisplay.className = 'link-item';
                linkDisplay.innerHTML = link.innerHTML;
                
                // Extract data from original link
                const instagramUrl = link.href;
                const linkText = link.textContent.trim();
                const tags = link.getAttribute('data-tags') || '';
                
                // Extract username from Instagram URL
                const username = instagramUrl.includes('instagram.com/') 
                    ? instagramUrl.split('instagram.com/')[1].replace('/', '') 
                    : '';
                
                // Create hover menu
                const hoverMenu = createHoverMenu({
                    instagram: instagramUrl,
                    website: getWebsiteUrl(username, linkText, tags),
                    youtube: getYoutubeUrl(username, linkText, tags)
                });
                
                // Assemble the wrapper
                wrapper.appendChild(linkDisplay);
                wrapper.appendChild(hoverMenu);
                
                // Replace original link with wrapper
                link.parentNode.replaceChild(wrapper, link);
                processedCount++;
            });
        });
        
        console.log(`✅ Processed ${processedCount} links with hover menus`);
    }

    function createHoverMenu(urls) {
        const menu = document.createElement('div');
        menu.className = 'hover-menu';
        
        // Instagram icon (always available)
        if (urls.instagram) {
            const instagramLink = createSocialIcon('instagram', urls.instagram, 'View on Instagram');
            menu.appendChild(instagramLink);
        }
        
        // Website icon
        if (urls.website) {
            const websiteLink = createSocialIcon('website', urls.website, 'Visit Website');
            menu.appendChild(websiteLink);
        } else {
            const websiteLink = createSocialIcon('website', '#', 'No website');
            websiteLink.classList.add('disabled');
            menu.appendChild(websiteLink);
        }
        
        // YouTube icon
        if (urls.youtube) {
            const youtubeLink = createSocialIcon('youtube', urls.youtube, 'Watch on YouTube');
            menu.appendChild(youtubeLink);
        } else {
            const youtubeLink = createSocialIcon('youtube', '#', 'No YouTube');
            youtubeLink.classList.add('disabled');
            menu.appendChild(youtubeLink);
        }
        
        return menu;
    }

    function createSocialIcon(type, url, tooltip) {
        const link = document.createElement('a');
        link.className = `social-icon ${type}`;
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('data-tooltip', tooltip);
        link.innerHTML = icons[type];
        
        // Prevent click if disabled
        if (url === '#') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
            });
        }
        
        return link;
    }

    function getWebsiteUrl(username, linkText, tags) {
        // Map known organizations to their websites
        const websiteMap = {
            // Embassies
            'embamexcol': 'https://embamex.sre.gob.mx/colombia/',
            'embamexeua': 'https://embamex.sre.gob.mx/eua/',
            'embamexcan': 'https://embamex.sre.gob.mx/canada/',
            
            // Museums
            'museonacional': 'https://museonacional.gov.co/',
            'banrepcultural': 'https://www.banrepcultural.org/',
            'mambo': 'https://mambogota.com/',
            
            // Government
            'alcaldiabogota': 'https://bogota.gov.co/',
            'presidenciacol': 'https://www.presidencia.gov.co/',
            'mincultura': 'https://www.mincultura.gov.co/',
            
            // Universities
            'uniandes': 'https://uniandes.edu.co/',
            'uninorte': 'https://www.uninorte.edu.co/',
            'univalle': 'https://www.univalle.edu.co/',
            
            // Add more mappings as needed
        };
        
        // Check if we have a known website
        if (websiteMap[username]) {
            return websiteMap[username];
        }
        
        // Check tags for government sites
        if (tags.includes('government') || tags.includes('ministry')) {
            if (tags.includes('colombia')) {
                return 'https://www.gov.co/';
            }
            if (tags.includes('mexico')) {
                return 'https://www.gob.mx/';
            }
        }
        
        // Return null if no website found
        return null;
    }

    function getYoutubeUrl(username, linkText, tags) {
        // Map known organizations to their YouTube channels
        const youtubeMap = {
            // Government channels
            'presidenciacol': 'https://www.youtube.com/@presidenciacolombia',
            'alcaldiabogota': 'https://www.youtube.com/@AlcaldiaBogota',
            
            // Cultural channels
            'banrepcultural': 'https://www.youtube.com/@BanrepCultural',
            'museonacional': 'https://www.youtube.com/@museonacionaldecolombia',
            
            // Add more mappings as needed
        };
        
        // Check if we have a known YouTube channel
        if (youtubeMap[username]) {
            return youtubeMap[username];
        }
        
        // Return null if no YouTube channel found
        return null;
    }

    // Re-initialize on dynamic content changes
    window.reinitializeHoverMenus = initializeHoverMenus;

})();