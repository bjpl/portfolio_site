// Keyboard Navigation for Links Page
(function() {
    'use strict';

    let currentFocusIndex = -1;
    let allLinks = [];
    let isSearchFocused = false;

    document.addEventListener('DOMContentLoaded', initKeyboardNavigation);

    function initKeyboardNavigation() {
        console.log('🎹 Initializing keyboard navigation...');
        
        // Get all link items
        updateLinksList();
        
        // Add keyboard event listeners
        document.addEventListener('keydown', handleKeyDown);
        
        // Add focus styles
        addFocusStyles();
        
        // Setup search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('focus', () => {
                isSearchFocused = true;
                currentFocusIndex = -1;
                clearFocus();
            });
            
            searchInput.addEventListener('blur', () => {
                isSearchFocused = false;
            });
        }
        
        // Update links list when content changes
        const observer = new MutationObserver(() => {
            updateLinksList();
        });
        
        const contentWrapper = document.getElementById('content-wrapper');
        if (contentWrapper) {
            observer.observe(contentWrapper, { childList: true, subtree: true });
        }
    }

    function updateLinksList() {
        allLinks = Array.from(document.querySelectorAll('.link-item-wrapper'));
        console.log(`Found ${allLinks.length} navigable links`);
    }

    function handleKeyDown(e) {
        // Don't interfere with search input
        if (isSearchFocused && !['Escape', 'Enter'].includes(e.key)) {
            return;
        }
        
        switch(e.key) {
            case 'ArrowDown':
            case 'j': // Vim-style navigation
                if (!isSearchFocused) {
                    e.preventDefault();
                    navigateNext();
                }
                break;
                
            case 'ArrowUp':
            case 'k': // Vim-style navigation
                if (!isSearchFocused) {
                    e.preventDefault();
                    navigatePrevious();
                }
                break;
                
            case 'ArrowRight':
            case 'l': // Vim-style navigation
                if (!isSearchFocused && currentFocusIndex >= 0) {
                    e.preventDefault();
                    openHoverMenu();
                }
                break;
                
            case 'ArrowLeft':
            case 'h': // Vim-style navigation
                if (!isSearchFocused && currentFocusIndex >= 0) {
                    e.preventDefault();
                    closeHoverMenu();
                }
                break;
                
            case 'Enter':
                if (currentFocusIndex >= 0) {
                    e.preventDefault();
                    activateCurrentLink();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                if (isSearchFocused) {
                    document.getElementById('search-input').blur();
                } else {
                    clearFocus();
                }
                break;
                
            case '/':
                if (!isSearchFocused) {
                    e.preventDefault();
                    focusSearch();
                }
                break;
                
            case '?':
                if (!isSearchFocused) {
                    e.preventDefault();
                    showKeyboardHelp();
                }
                break;
                
            case 'g':
                if (!isSearchFocused) {
                    if (e.shiftKey) { // G - go to bottom
                        e.preventDefault();
                        currentFocusIndex = allLinks.length - 1;
                        focusLink(currentFocusIndex);
                    } else { // gg - go to top (requires double g)
                        e.preventDefault();
                        handleDoubleG();
                    }
                }
                break;
                
            case '1':
            case '2':
            case '3':
                if (!isSearchFocused && currentFocusIndex >= 0) {
                    e.preventDefault();
                    selectSocialIcon(parseInt(e.key) - 1);
                }
                break;
        }
    }

    let lastGPress = 0;
    function handleDoubleG() {
        const now = Date.now();
        if (now - lastGPress < 500) { // Double g pressed
            currentFocusIndex = 0;
            focusLink(currentFocusIndex);
        }
        lastGPress = now;
    }

    function navigateNext() {
        if (allLinks.length === 0) return;
        
        currentFocusIndex = (currentFocusIndex + 1) % allLinks.length;
        focusLink(currentFocusIndex);
    }

    function navigatePrevious() {
        if (allLinks.length === 0) return;
        
        currentFocusIndex = currentFocusIndex <= 0 ? allLinks.length - 1 : currentFocusIndex - 1;
        focusLink(currentFocusIndex);
    }

    function focusLink(index) {
        clearFocus();
        
        if (index >= 0 && index < allLinks.length) {
            const link = allLinks[index];
            link.classList.add('keyboard-focus');
            
            // Scroll into view
            link.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Announce to screen readers
            announceLink(link);
        }
    }

    function clearFocus() {
        allLinks.forEach(link => {
            link.classList.remove('keyboard-focus');
            const menu = link.querySelector('.hover-menu');
            if (menu) {
                menu.classList.remove('keyboard-open');
            }
        });
    }

    function openHoverMenu() {
        if (currentFocusIndex >= 0 && currentFocusIndex < allLinks.length) {
            const link = allLinks[currentFocusIndex];
            const menu = link.querySelector('.hover-menu');
            if (menu) {
                menu.classList.add('keyboard-open');
                
                // Focus first icon
                const firstIcon = menu.querySelector('.social-icon');
                if (firstIcon) {
                    firstIcon.focus();
                }
            }
        }
    }

    function closeHoverMenu() {
        if (currentFocusIndex >= 0 && currentFocusIndex < allLinks.length) {
            const link = allLinks[currentFocusIndex];
            const menu = link.querySelector('.hover-menu');
            if (menu) {
                menu.classList.remove('keyboard-open');
            }
        }
    }

    function selectSocialIcon(iconIndex) {
        if (currentFocusIndex >= 0 && currentFocusIndex < allLinks.length) {
            const link = allLinks[currentFocusIndex];
            const icons = link.querySelectorAll('.social-icon');
            if (icons[iconIndex]) {
                icons[iconIndex].click();
            }
        }
    }

    function activateCurrentLink() {
        if (currentFocusIndex >= 0 && currentFocusIndex < allLinks.length) {
            const link = allLinks[currentFocusIndex];
            const instagramLink = link.querySelector('.social-icon.instagram');
            if (instagramLink) {
                instagramLink.click();
            }
        }
    }

    function focusSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    function announceLink(link) {
        const linkText = link.querySelector('.link-item')?.textContent || '';
        const announcement = `Link ${currentFocusIndex + 1} of ${allLinks.length}: ${linkText}`;
        
        // Create or update ARIA live region
        let liveRegion = document.getElementById('keyboard-nav-announcer');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'keyboard-nav-announcer';
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-9999px';
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = announcement;
    }

    function showKeyboardHelp() {
        const helpText = `
Keyboard Navigation Help:
━━━━━━━━━━━━━━━━━━━━━━━━
↓/j     - Next link
↑/k     - Previous link
→/l     - Open hover menu
←/h     - Close hover menu
Enter   - Open Instagram link
1,2,3   - Select social icon
/       - Focus search
Escape  - Clear focus
g       - Go to top (press twice)
G       - Go to bottom
?       - Show this help
━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        alert(helpText);
    }

    function addFocusStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .link-item-wrapper.keyboard-focus .link-item {
                outline: 3px solid #667eea;
                outline-offset: 2px;
                transform: translateY(-4px);
                box-shadow: 0 12px 24px rgba(102, 126, 234, 0.2);
            }
            
            .hover-menu.keyboard-open {
                opacity: 1 !important;
                visibility: visible !important;
                transform: translateY(-50%) scale(1) !important;
                pointer-events: auto !important;
            }
            
            .social-icon:focus {
                outline: 2px solid #667eea;
                outline-offset: 2px;
            }
            
            /* Focus visible only for keyboard navigation */
            .social-icon:focus:not(:focus-visible) {
                outline: none;
            }
            
            /* Smooth transitions for keyboard navigation */
            .link-item-wrapper {
                scroll-margin: 100px;
            }
        `;
        document.head.appendChild(style);
    }

    // Export for debugging
    window.keyboardNav = {
        getCurrentIndex: () => currentFocusIndex,
        getTotalLinks: () => allLinks.length,
        navigateToIndex: (index) => {
            currentFocusIndex = index;
            focusLink(index);
        }
    };

})();