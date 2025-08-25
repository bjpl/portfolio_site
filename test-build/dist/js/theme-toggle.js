// Theme Toggle JavaScript

// Initialize theme immediately to prevent flash
(function() {
    // Get saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    // Set initial theme immediately
    document.documentElement.setAttribute('data-theme', initialTheme);
})();

// Setup toggle functionality
(function() {
    // Update toggle button icon based on theme
    const updateToggleButton = (theme) => {
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
            toggleBtn.setAttribute('aria-label', 
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
    };

    // Toggle theme function - make it globally available
    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Add transition class for smooth change
        document.documentElement.classList.add('theme-transition');
        
        // Change theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateToggleButton(newTheme);
        
        // Remove transition class after animation
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 300);
        
        console.log('Theme changed to:', newTheme);
    };

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateToggleButton(newTheme);
        }
    });

    // Initialize button when DOM is ready
    const initButton = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        updateToggleButton(currentTheme);
    };

    // Initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initButton);
    } else {
        initButton();
    }

    // Add keyboard shortcut (Ctrl/Cmd + Shift + L)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            window.toggleTheme();
        }
    });
    
    // Ensure function is available
    console.log('Dark mode initialized. toggleTheme available:', typeof window.toggleTheme === 'function');
})();