// Test hover menu visibility
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== HOVER MENU TEST ===');
    
    // Check for hover menus
    const hoverMenus = document.querySelectorAll('.hover-menu');
    console.log(`Found ${hoverMenus.length} hover menus`);
    
    // Check for social icons
    const socialIcons = document.querySelectorAll('.social-icon');
    console.log(`Found ${socialIcons.length} social icons`);
    
    // Check specific icon types
    const instagram = document.querySelectorAll('.social-icon.instagram');
    const website = document.querySelectorAll('.social-icon.website');
    const youtube = document.querySelectorAll('.social-icon.youtube');
    
    console.log(`Instagram icons: ${instagram.length}`);
    console.log(`Website icons: ${website.length}`);
    console.log(`YouTube icons: ${youtube.length}`);
    
    // Check if hover menus are visible
    hoverMenus.forEach((menu, index) => {
        const styles = window.getComputedStyle(menu);
        console.log(`Menu ${index}: opacity=${styles.opacity}, visibility=${styles.visibility}, display=${styles.display}`);
    });
    
    // Force show all hover menus for testing
    setTimeout(() => {
        console.log('Forcing hover menus visible...');
        hoverMenus.forEach(menu => {
            menu.style.opacity = '1';
            menu.style.visibility = 'visible';
        });
    }, 2000);
});