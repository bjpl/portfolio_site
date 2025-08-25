// Complete Links Page JavaScript with Working Hover Menus
(function() {
    'use strict';
    
    console.log('Links script starting...');
    
    // Wait for URL mappings to be available
    function waitForMappings(callback) {
        if (window.urlMappings) {
            callback();
        } else {
            setTimeout(() => waitForMappings(callback), 50);
        }
    }
    
    // Initialize when mappings are ready
    waitForMappings(() => {
        console.log('URL mappings loaded, initializing links...');
        console.log('Total mappings available:', Object.keys(window.urlMappings || {}).length);
        initializeLinks();
    });
    
    function initializeLinks() {
    // Use URL mappings from url-mappings-complete.js
    const urlMappings = window.urlMappings || {
        // Government & Diplomacy
        'potus': { website: 'https://www.whitehouse.gov/', youtube: 'https://www.youtube.com/@WhiteHouse' },
        'vp': { website: 'https://www.whitehouse.gov/', youtube: 'https://www.youtube.com/@WhiteHouse' },
        'whitehouse': { website: 'https://www.whitehouse.gov/', youtube: 'https://www.youtube.com/@WhiteHouse' },
        'usairforce': { website: 'https://www.af.mil/', youtube: 'https://www.youtube.com/@AFRecruiting' },
        'usarmy': { website: 'https://www.army.mil/', youtube: 'https://www.youtube.com/@USArmy' },
        'usnavy': { website: 'https://www.navy.mil/', youtube: 'https://www.youtube.com/@usnavy' },
        'usmarinecorps': { website: 'https://www.marines.mil/', youtube: 'https://www.youtube.com/@Marines' },
        'spaceforce': { website: 'https://www.spaceforce.mil/', youtube: 'https://www.youtube.com/@USSpaceForceOfficial' },
        'uscapitol': { website: 'https://www.capitol.gov/', youtube: 'https://www.youtube.com/@usCapitol' },
        'smithsonian': { website: 'https://www.si.edu/', youtube: 'https://www.youtube.com/@smithsonian' },
        'nasa': { website: 'https://www.nasa.gov/', youtube: 'https://www.youtube.com/@NASA' },
        'un': { website: 'https://www.un.org/', youtube: 'https://www.youtube.com/@unitednations' },
        'who': { website: 'https://www.who.int/', youtube: 'https://www.youtube.com/@who' },
        'worldbank': { website: 'https://www.worldbank.org/', youtube: 'https://www.youtube.com/@worldbank' },
        'imf': { website: 'https://www.imf.org/', youtube: 'https://www.youtube.com/@imf' },
        'wto': { website: 'https://www.wto.org/', youtube: 'https://www.youtube.com/@WTO' },
        
        // Education & Research  
        'harvard': { website: 'https://www.harvard.edu/', youtube: 'https://www.youtube.com/@harvard' },
        'mit': { website: 'https://www.mit.edu/', youtube: 'https://www.youtube.com/@MIT' },
        'stanford': { website: 'https://www.stanford.edu/', youtube: 'https://www.youtube.com/@StanfordUniversity' },
        'yale': { website: 'https://www.yale.edu/', youtube: 'https://www.youtube.com/@YaleUniversity' },
        'princeton': { website: 'https://www.princeton.edu/', youtube: 'https://www.youtube.com/@Princeton' },
        'columbia': { website: 'https://www.columbia.edu/', youtube: 'https://www.youtube.com/@Columbia' },
        'oxford_uni': { website: 'https://www.ox.ac.uk/', youtube: 'https://www.youtube.com/@oxford' },
        'cambridge_uni': { website: 'https://www.cam.ac.uk/', youtube: 'https://www.youtube.com/@CambridgeUniversity' },
        'caltech': { website: 'https://www.caltech.edu/', youtube: 'https://www.youtube.com/@caltech' },
        'nyu': { website: 'https://www.nyu.edu/', youtube: 'https://www.youtube.com/@nyu' },
        'berkeley': { website: 'https://www.berkeley.edu/', youtube: 'https://www.youtube.com/@UCBerkeley' },
        'ucla': { website: 'https://www.ucla.edu/', youtube: 'https://www.youtube.com/@UCLA' },
        
        // Culture & Arts
        'themet': { website: 'https://www.metmuseum.org/', youtube: 'https://www.youtube.com/@metmuseum' },
        'moma': { website: 'https://www.moma.org/', youtube: 'https://www.youtube.com/@themuseumofmodernart' },
        'guggenheim': { website: 'https://www.guggenheim.org/', youtube: 'https://www.youtube.com/@GuggenheimMuseum' },
        'whitneymuseum': { website: 'https://whitney.org/', youtube: 'https://www.youtube.com/@whitneymuseum' },
        'tate': { website: 'https://www.tate.org.uk/', youtube: 'https://www.youtube.com/@tate' },
        'louvre': { website: 'https://www.louvre.fr/', youtube: 'https://www.youtube.com/@museelouvre' },
        'britishmuseum': { website: 'https://www.britishmuseum.org/', youtube: 'https://www.youtube.com/@britishmuseum' },
        'vamuseum': { website: 'https://www.vam.ac.uk/', youtube: 'https://www.youtube.com/@VAMuseum' },
        'rijksmuseum': { website: 'https://www.rijksmuseum.nl/', youtube: 'https://www.youtube.com/@rijksmuseum' },
        'lacma': { website: 'https://www.lacma.org/', youtube: 'https://www.youtube.com/@lacma' },
        
        // Food & Culinary
        'gordon_ramsay': { website: 'https://www.gordonramsay.com/', youtube: 'https://www.youtube.com/@gordonramsay' },
        'gordonramsay': { website: 'https://www.gordonramsay.com/', youtube: 'https://www.youtube.com/@gordonramsay' },
        'jamieoliver': { website: 'https://www.jamieoliver.com/', youtube: 'https://www.youtube.com/@jamieoliver' },
        'alvinzhou': { website: null, youtube: 'https://www.youtube.com/@alvinzhou' },
        'bingingwithbabish': { website: 'https://www.bingingwithbabish.com/', youtube: 'https://www.youtube.com/@bingingwithbabish' },
        'joshuaweissman': { website: null, youtube: 'https://www.youtube.com/@JoshuaWeissman' },
        'matty_matheson': { website: null, youtube: 'https://www.youtube.com/@mattymatheson' },
        'bonappetitmag': { website: 'https://www.bonappetit.com/', youtube: 'https://www.youtube.com/@bonappetit' },
        'eater': { website: 'https://www.eater.com/', youtube: 'https://www.youtube.com/@eater' },
        'foodandwine': { website: 'https://www.foodandwine.com/', youtube: 'https://www.youtube.com/@foodandwine' },
        'seriouseats': { website: 'https://www.seriouseats.com/', youtube: 'https://www.youtube.com/@seriouseats' },
        
        // Travel & Adventure
        'natgeo': { website: 'https://www.nationalgeographic.com/', youtube: 'https://www.youtube.com/@NatGeo' },
        'natgeotravel': { website: 'https://www.nationalgeographic.com/travel/', youtube: 'https://www.youtube.com/@NatGeo' },
        'lonelyplanet': { website: 'https://www.lonelyplanet.com/', youtube: 'https://www.youtube.com/@lonelyplanet' },
        'travelandleisure': { website: 'https://www.travelandleisure.com/', youtube: 'https://www.youtube.com/@travelandleisure' },
        'cntraveler': { website: 'https://www.cntraveler.com/', youtube: 'https://www.youtube.com/@CondeNastTraveler' },
        'wanderlust': { website: 'https://www.wanderlust.co.uk/', youtube: 'https://www.youtube.com/@wanderlustmagazine' },
        'beautifuldestinations': { website: 'https://www.beautifuldestinations.com/', youtube: 'https://www.youtube.com/@beautifuldestinations' }
    };
    
    // Get SVG icon for platform
    function getSvgIcon(platform) {
        const icons = {
            instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/></svg>',
            website: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
            youtube: '<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
        };
        return icons[platform] || '';
    }
    
    // Create individual social icon
    function createSocialIcon(platform, url) {
        const icon = document.createElement(url ? 'a' : 'span');
        icon.className = `social-icon ${platform}`;
        
        if (url) {
            icon.href = url;
            icon.target = '_blank';
            icon.rel = 'noopener noreferrer';
            icon.title = `View on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
            
            // Critical: Prevent parent link click
            icon.addEventListener('click', function(e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log(`Clicking ${platform} link: ${url}`);
            });
            
            // Also handle mousedown to be extra sure
            icon.addEventListener('mousedown', function(e) {
                e.stopPropagation();
            });
        } else {
            icon.classList.add('disabled');
            icon.title = `No ${platform} link available`;
        }
        
        // Add SVG
        icon.innerHTML = getSvgIcon(platform);
        
        return icon;
    }
    
    // Create hover menu with icons only for available links
    function createHoverMenu(urls) {
        const menu = document.createElement('div');
        menu.className = 'hover-menu';
        
        // Always show Instagram icon (it's the main link)
        const instagramIcon = createSocialIcon('instagram', urls.instagram);
        menu.appendChild(instagramIcon);
        
        // Only show website icon if URL exists
        if (urls.website) {
            const websiteIcon = createSocialIcon('website', urls.website);
            menu.appendChild(websiteIcon);
        }
        
        // Only show YouTube icon if URL exists
        if (urls.youtube) {
            const youtubeIcon = createSocialIcon('youtube', urls.youtube);
            menu.appendChild(youtubeIcon);
        }
        
        // Prevent menu clicks from triggering parent
        menu.addEventListener('click', function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        menu.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });
        
        return menu;
    }
    
    // Process all Instagram links
    function processLinks() {
        const links = document.querySelectorAll('.link-grid a.link-item-wrapper[href*="instagram.com"]');
        console.log(`Found ${links.length} Instagram links to process`);
        
        links.forEach((link, index) => {
            // Skip if already processed
            if (link.querySelector('.hover-menu')) {
                console.log(`Link ${index} already has hover menu`);
                return;
            }
            
            // Extract username
            const instagramUrl = link.href;
            const matches = instagramUrl.match(/instagram\.com\/([^\/\?]+)/);
            const username = matches ? matches[1] : null;
            
            if (!username) {
                console.log(`Link ${index}: Could not extract username from ${instagramUrl}`);
                return;
            }
            
            console.log(`Link ${index}: Processing @${username}`);
            
            // Get URLs for this user
            const urls = {
                instagram: instagramUrl,
                website: urlMappings[username]?.website || null,
                youtube: urlMappings[username]?.youtube || null
            };
            
            // Debug logging
            console.log(`Processing @${username}:`, {
                hasWebsite: !!urls.website,
                hasYouTube: !!urls.youtube,
                mappingExists: !!urlMappings[username]
            });
            
            // Create and add hover menu
            const hoverMenu = createHoverMenu(urls);
            link.appendChild(hoverMenu);
            
            console.log(`Link ${index}: Added hover menu with ${Object.values(urls).filter(u => u).length} active links`);
        });
        
        console.log('Finished processing links');
        
        // Initialize hover functionality after creating menus
        if (typeof window.initHoverMenus === 'function') {
            console.log('Initializing hover menu interactions');
            setTimeout(() => window.initHoverMenus(), 100);
        }
    }
    
    // Search functionality
    function initSearch() {
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) return;
        
        const allLinks = document.querySelectorAll('.link-item-wrapper');
        const sections = document.querySelectorAll('.instagram-links, .links-category');
        
        searchInput.addEventListener('input', debounce(function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            if (!searchTerm) {
                // Show all
                allLinks.forEach(link => link.style.display = '');
                sections.forEach(section => section.style.display = '');
                return;
            }
            
            // Filter links
            allLinks.forEach(link => {
                const text = link.textContent.toLowerCase();
                const matches = text.includes(searchTerm);
                link.style.display = matches ? '' : 'none';
            });
            
            // Hide empty sections
            sections.forEach(section => {
                const visibleLinks = section.querySelectorAll('.link-item-wrapper:not([style*="display: none"])');
                section.style.display = visibleLinks.length > 0 ? '' : 'none';
            });
        }, 300));
    }
    
    // Filter buttons
    function initFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const sections = document.querySelectorAll('.instagram-links');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.dataset.filter;
                
                // Update active state
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Apply filter
                if (filter === 'all') {
                    sections.forEach(section => section.style.display = '');
                } else {
                    sections.forEach(section => {
                        const matches = section.classList.contains(filter);
                        section.style.display = matches ? '' : 'none';
                    });
                }
            });
        });
    }
    
    // Collapsible sections
    function initCollapsibles() {
        const headers = document.querySelectorAll('.instagram-links h3, .instagram-links h4, .links-category h4');
        
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', function() {
                const section = this.parentElement;
                const grid = section.querySelector('.link-grid, .links-section-content');
                
                if (grid) {
                    const isHidden = grid.style.display === 'none';
                    grid.style.display = isHidden ? '' : 'none';
                    
                    // Update collapse icon if present
                    const icon = this.querySelector('.collapse-icon');
                    if (icon) {
                        icon.textContent = isHidden ? '▼' : '▶';
                    }
                }
            });
        });
    }
    
    // Debounce helper
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
    
    // Initialize everything
    function init() {
        console.log('Initializing links page...');
        processLinks();
        initSearch();
        initFilters();
        initCollapsibles();
        console.log('Links page initialized');
    }
    
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded
        init();
    }
    
    } // End of initializeLinks function
})();