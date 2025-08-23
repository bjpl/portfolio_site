// Collapsible Section System
class CollapsibleSection {
    constructor(header, options = {}) {
        this.header = header;
        this.content = header.nextElementSibling;
        this.options = {
            saveState: true,
            animate: true,
            defaultExpanded: true,
            storagePrefix: 'section_state_',
            ...options
        };

        // Determine section type and level
        this.type = this.determineSectionType();
        this.parent = this.findParentSection();
        this.children = [];
        
        if (this.isValidSection()) {
            this.init();
        }
    }
    
    determineSectionType() {
        // Main section headers
        if (this.header.tagName === 'H3') {
            return 'main';
        }
        
        // Category headers (e.g., "Embassies", "Government", etc.)
        if (this.header.tagName === 'H4' && this.header.closest('.instagram-links')) {
            const section = this.header.closest('.instagram-links');
            if (section.classList.contains('govdip')) return 'govdip';
            if (section.classList.contains('education')) return 'education';
            if (section.classList.contains('culture')) return 'culture';
            if (section.classList.contains('food')) return 'food';
            if (section.classList.contains('travel')) return 'travel';
            return 'category';
        }
        
        return 'subcategory';
    }
    
    isValidSection() {
        return (
            this.content?.classList.contains('link-grid') ||
            this.content?.classList.contains('subcategory-content')
        );
    }
    
    findParentSection() {
        let current = this.header.parentElement;
        while (current) {
            const parentHeader = current.previousElementSibling;
            if (parentHeader?.tagName === 'H3' || parentHeader?.tagName === 'H4') {
                return parentHeader._collapsible;
            }
            current = current.parentElement;
        }
        return null;
    }
    
    init() {
        // Register this instance with parent
        if (this.parent) {
            this.parent.children.push(this);
        }
        
        // Store instance on header element
        this.header._collapsible = this;
        
        // Add styling
        this.header.classList.add('collapsible-header');
        this.content.classList.add('collapsible-content');
        
        // Add category class if applicable
        if (this.type !== 'main') {
            this.header.classList.add(`collapsible-${this.type}`);
        }
        
        // Create header content
        const icon = document.createElement('span');
        icon.className = 'collapse-icon';
        const text = document.createElement('span');
        text.className = 'header-text';
        text.innerHTML = this.header.innerHTML;
        this.header.innerHTML = '';
        this.header.appendChild(icon);
        this.header.appendChild(text);
        
        // Set initial state
        const savedState = this.options.saveState && localStorage.getItem(this.getStorageKey());
        this.isExpanded = savedState !== null ? savedState === 'true' : this.options.defaultExpanded;
        this.updateState(false);
        
        // Add event listeners
        this.header.addEventListener('click', (e) => {
            // Don't trigger if clicking a link
            if (e.target.tagName === 'A') return;
            this.toggle();
        });
        
        this.header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    getStorageKey() {
        return this.options.storagePrefix + 
               this.type + '_' + 
               this.header.textContent.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    
    saveState() {
        if (this.options.saveState) {
            localStorage.setItem(this.getStorageKey(), this.isExpanded);
        }
    }
    
    toggle() {
        this.isExpanded = !this.isExpanded;
        this.updateState(true);
        this.saveState();
        
        // Update children based on parent state
        if (!this.isExpanded) {
            this.children.forEach(child => {
                if (child.isExpanded) {
                    child.toggle();
                }
            });
        }
    }
    
    updateState(animate = true) {
        // Update ARIA attributes
        this.header.setAttribute('aria-expanded', this.isExpanded);
        this.header.setAttribute('aria-controls', this.content.id);
        this.content.setAttribute('aria-hidden', !this.isExpanded);
        
        // Update icon
        const icon = this.header.querySelector('.collapse-icon');
        icon.textContent = this.isExpanded ? '▼' : '▶';
        
        // Update content visibility
        if (this.options.animate && animate) {
            this.animateContent();
        } else {
            this.content.style.display = this.isExpanded ? '' : 'none';
        }
    }
    
    updateState(animate = true) {
        this.header.setAttribute('aria-expanded', this.isExpanded);
        this.header.setAttribute('aria-controls', this.content.id);
        this.content.setAttribute('aria-hidden', !this.isExpanded);
        
        const icon = this.header.querySelector('.collapse-icon');
        icon.textContent = this.isExpanded ? '▼' : '▶';
        
        this.content.style.display = this.isExpanded ? '' : 'none';
    }
    
    expandAll() {
        if (!this.isExpanded) {
            this.toggle();
        }
        this.children.forEach(child => child.expandAll());
    }
    
    collapseAll() {
        this.children.forEach(child => child.collapseAll());
        if (this.isExpanded) {
            this.toggle();
        }
    }
}

// Initialize collapsible sections
document.addEventListener('DOMContentLoaded', () => {
    // Ensure content elements have IDs for ARIA
    document.querySelectorAll('.link-grid, .subcategory-content').forEach((grid, index) => {
        if (!grid.id) {
            grid.id = 'content-' + index;
        }
    });
    
    // Initialize sections in order (main sections first, then categories, then subcategories)
    const sections = [];
    
    // Main sections (h3)
    document.querySelectorAll('.instagram-links > h3').forEach(header => {
        const section = new CollapsibleSection(header, {
            saveState: true,
            animate: true,
            defaultExpanded: true
        });
        sections.push(section);
    });
    
    // Category sections (h4)
    document.querySelectorAll('.instagram-links > h4').forEach(header => {
        const section = new CollapsibleSection(header, {
            saveState: true,
            animate: true,
            defaultExpanded: true
        });
        sections.push(section);
    });
    
    // Subcategory sections
    document.querySelectorAll('.link-grid > h4').forEach(header => {
        const section = new CollapsibleSection(header, {
            saveState: true,
            animate: true,
            defaultExpanded: false
        });
        sections.push(section);
    });
    
    // Add expand/collapse all functionality
    const addExpandCollapseAll = () => {
        const container = document.querySelector('.filter-container');
        if (!container) return;
        
        const controls = document.createElement('div');
        controls.className = 'section-controls';
        controls.innerHTML = `
            <div class="control-group">
                <button class="control-btn expand-all" role="button" aria-label="Expand all sections">Expand All</button>
                <button class="control-btn collapse-all" role="button" aria-label="Collapse all sections">Collapse All</button>
            </div>
            <div class="control-group">
                <button class="control-btn expand-category" role="button" aria-label="Expand current category" style="display:none">Expand Category</button>
                <button class="control-btn collapse-category" role="button" aria-label="Collapse current category" style="display:none">Collapse Category</button>
            </div>
        `;
        
        // Global expand/collapse
        controls.querySelector('.expand-all').addEventListener('click', () => {
            sections.filter(s => s.type === 'main').forEach(section => section.expandAll());
        });
        
        controls.querySelector('.collapse-all').addEventListener('click', () => {
            sections.filter(s => s.type === 'main').forEach(section => section.collapseAll());
        });
        
        // Category expand/collapse
        const categoryControls = controls.querySelectorAll('.control-group:last-child button');
        const updateCategoryControls = () => {
            const activeFilter = document.querySelector('.filter-btn.active');
            const category = activeFilter?.textContent.toLowerCase().replace(/\s+/g, '-');
            
            if (category && category !== 'all') {
                categoryControls.forEach(btn => btn.style.display = '');
                controls.querySelector('.expand-category').onclick = () => {
                    sections.filter(s => s.type === category).forEach(section => section.expandAll());
                };
                controls.querySelector('.collapse-category').onclick = () => {
                    sections.filter(s => s.type === category).forEach(section => section.collapseAll());
                };
            } else {
                categoryControls.forEach(btn => btn.style.display = 'none');
            }
        };
        
        // Listen for filter changes
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', updateCategoryControls);
        });
        
        container.insertAdjacentElement('beforebegin', controls);
        updateCategoryControls();
    };
    
    addExpandCollapseAll();
});