// Main TypeScript entry point

class ThemeManager {
    private currentTheme: 'light' | 'dark' | 'auto' = 'auto';
    
    constructor() {
        this.initTheme();
        this.bindEvents();
    }
    
    private initTheme(): void {
        const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'auto';
        if (saved) {
            this.currentTheme = saved;
            this.applyTheme();
        }
    }
    
    private applyTheme(): void {
        if (this.currentTheme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', this.currentTheme);
        }
    }
    
    private bindEvents(): void {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
            });
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.currentTheme === 'auto') {
                this.applyTheme();
            }
        });
    }
}

class SearchManager {
    private searchIndex: any[] = [];
    private searchInput: HTMLInputElement | null = null;
    
    constructor() {
        this.loadSearchIndex();
        this.bindEvents();
    }
    
    private async loadSearchIndex(): Promise<void> {
        try {
            const response = await fetch('/index.json');
            this.searchIndex = await response.json();
        } catch (error) {
            console.error('Failed to load search index:', error);
        }
    }
    
    private bindEvents(): void {
        // Add search functionality here
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new SearchManager();
    
    console.log('Portfolio initialized');
});

export { ThemeManager, SearchManager };
