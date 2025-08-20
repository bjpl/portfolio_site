// Collapsible Section Functionality
class CollapsibleSection {
    constructor(header, options = {}) {
        this.header = header;
        this.content = header.nextElementSibling;
        this.isMain = header.tagName === 'H3';
        this.options = {
            saveState: true,
            animate: true,
            defaultExpanded: true,
            storagePrefix: 'section_state_',
            ...options
        };
        
        this.init();
    }
    
    init() {
        if (this.isMain) return;
        if (!this.content?.classList.contains('link-grid')) return;
        
        // Add styling
        this.header.classList.add('collapsible-header');
        this.content.classList.add('collapsible-content');
        
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
        this.header.addEventListener('click', () => this.toggle());
        this.header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    getStorageKey() {
        return this.options.storagePrefix + this.header.textContent.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
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
    
    animateContent() {
        if (this.isExpanded) {
            // Show content
            this.content.style.display = '';
            this.content.style.overflow = 'hidden';
            const height = this.content.scrollHeight;
            this.content.style.height = '0';
            this.content.offsetHeight; // Force reflow
            this.content.style.transition = 'height 0.3s ease';
            this.content.style.height = height + 'px';
            
            const onTransitionEnd = () => {
                this.content.style.height = '';
                this.content.style.overflow = '';
                this.content.style.transition = '';
                this.content.removeEventListener('transitionend', onTransitionEnd);
            };
            this.content.addEventListener('transitionend', onTransitionEnd);
        } else {
            // Hide content
            this.content.style.overflow = 'hidden';
            this.content.style.height = this.content.scrollHeight + 'px';
            this.content.offsetHeight; // Force reflow
            this.content.style.transition = 'height 0.3s ease';
            this.content.style.height = '0';
            
            const onTransitionEnd = () => {
                this.content.style.display = 'none';
                this.content.style.height = '';
                this.content.style.overflow = '';
                this.content.style.transition = '';
                this.content.removeEventListener('transitionend', onTransitionEnd);
            };
            this.content.addEventListener('transitionend', onTransitionEnd);
        }
    }
    
    expandAll() {
        if (!this.isExpanded) {
            this.toggle();
        }
    }
    
    collapseAll() {
        if (this.isExpanded) {
            this.toggle();
        }
    }
}

// Initialize collapsible sections
document.addEventListener('DOMContentLoaded', () => {
    // Ensure content elements have IDs for ARIA
    document.querySelectorAll('.link-grid').forEach((grid, index) => {
        if (!grid.id) {
            grid.id = 'link-grid-' + index;
        }
    });
    
    // Initialize sections
    const sections = [];
    document.querySelectorAll('.instagram-links h4, .instagram-links h3').forEach(header => {
        const section = new CollapsibleSection(header, {
            saveState: true,
            animate: true,
            defaultExpanded: true
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
            <button class="control-btn expand-all">Expand All</button>
            <button class="control-btn collapse-all">Collapse All</button>
        `;
        
        controls.querySelector('.expand-all').addEventListener('click', () => {
            sections.forEach(section => section.expandAll());
        });
        
        controls.querySelector('.collapse-all').addEventListener('click', () => {
            sections.forEach(section => section.collapseAll());
        });
        
        container.insertAdjacentElement('beforebegin', controls);
    };
    
    addExpandCollapseAll();
});