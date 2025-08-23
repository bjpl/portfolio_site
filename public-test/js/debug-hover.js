// Debug hover menu issues
console.log('=== HOVER DEBUG START ===');

// Wait for page to fully load
window.addEventListener('load', function() {
    console.log('Page fully loaded');
    
    // Check for link wrappers
    const linkWrappers = document.querySelectorAll('.link-item-wrapper');
    console.log(`Link wrappers found: ${linkWrappers.length}`);
    
    // Check for hover menus
    const hoverMenus = document.querySelectorAll('.hover-menu');
    console.log(`Hover menus found: ${hoverMenus.length}`);
    
    // Check for social icons
    const socialIcons = document.querySelectorAll('.social-icon');
    console.log(`Social icons found: ${socialIcons.length}`);
    
    // If no hover menus, check why
    if (hoverMenus.length === 0) {
        console.error('❌ No hover menus found! Checking link structure...');
        
        // Check first few links
        linkWrappers.forEach((wrapper, i) => {
            if (i < 3) {
                console.log(`Link ${i} HTML:`, wrapper.innerHTML.substring(0, 200));
                console.log(`Link ${i} children:`, wrapper.children.length);
            }
        });
    } else {
        // Check hover menu visibility
        hoverMenus.forEach((menu, i) => {
            if (i < 3) {
                const styles = window.getComputedStyle(menu);
                console.log(`Menu ${i} styles:`, {
                    display: styles.display,
                    opacity: styles.opacity,
                    visibility: styles.visibility,
                    position: styles.position
                });
            }
        });
    }
    
    // Test hover functionality on first link
    if (linkWrappers.length > 0) {
        const firstLink = linkWrappers[0];
        console.log('Testing hover on first link...');
        
        // Simulate hover
        firstLink.classList.add('test-hover');
        
        // Check if hover menu appears
        setTimeout(() => {
            const menu = firstLink.querySelector('.hover-menu');
            if (menu) {
                const styles = window.getComputedStyle(menu);
                console.log('After hover simulation:', {
                    opacity: styles.opacity,
                    visibility: styles.visibility
                });
            } else {
                console.error('No hover menu in first link!');
            }
            firstLink.classList.remove('test-hover');
        }, 100);
    }
    
    console.log('=== HOVER DEBUG END ===');
});