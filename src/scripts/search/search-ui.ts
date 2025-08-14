// src/scripts/search/search-ui.ts

import { SearchEngine } from './search-engine';

export class SearchUI {
  private searchEngine: SearchEngine;
  private searchInput: HTMLInputElement | null = null;
  private searchResults: HTMLElement | null = null;
  private searchOverlay: HTMLElement | null = null;
  private searchButton: HTMLButtonElement | null = null;
  private isOpen = false;
  private currentQuery = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.searchEngine = new SearchEngine();
    this.init();
  }

  private async init(): Promise<void> {
    // Initialize search engine
    await this.searchEngine.initialize();
    
    // Create search UI elements
    this.createSearchUI();
    
    // Bind events
    this.bindEvents();
  }

  private createSearchUI(): void {
    // Create search overlay
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-modal">
        <div class="search-header">
          <input 
            type="search" 
            class="search-input" 
            placeholder="Search posts, projects, thoughts..."
            autocomplete="off"
            aria-label="Search"
          >
          <button class="search-close" aria-label="Close search">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="search-suggestions" aria-live="polite"></div>
        <div class="search-results" aria-live="polite"></div>
        <div class="search-footer">
          <div class="search-stats"></div>
          <div class="search-shortcuts">
            <kbd>↑↓</kbd> Navigate
            <kbd>Enter</kbd> Select
            <kbd>Esc</kbd> Close
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Store references
    this.searchOverlay = overlay;
    this.searchInput = overlay.querySelector('.search-input');
    this.searchResults = overlay.querySelector('.search-results');
    
    // Add search button to header
    const header = document.querySelector('.site-header__actions');
    if (header) {
      const button = document.createElement('button');
      button.className = 'search-button';
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <kbd class="search-shortcut">⌘K</kbd>
      `;
      button.setAttribute('aria-label', 'Open search');
      header.insertBefore(button, header.firstChild);
      this.searchButton = button;
    }
  }

  private bindEvents(): void {
    // Search button click
    this.searchButton?.addEventListener('click', () => this.openSearch());
    
    // Close button click
    this.searchOverlay?.querySelector('.search-close')?.addEventListener('click', () => this.closeSearch());
    
    // Overlay click (outside modal)
    this.searchOverlay?.addEventListener('click', (e) => {
      if (e.target === this.searchOverlay) {
        this.closeSearch();
      }
    });
    
    // Search input
    this.searchInput?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.handleSearch(query);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.openSearch();
      }
      
      // Escape to close
      if (e.key === 'Escape' && this.isOpen) {
        this.closeSearch();
      }
      
      // Arrow navigation
      if (this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        this.navigateResults(e.key === 'ArrowDown' ? 'down' : 'up');
      }
      
      // Enter to select
      if (this.isOpen && e.key === 'Enter') {
        const active = this.searchResults?.querySelector('.search-result--active');
        if (active) {
          const link = active.querySelector('a');
          if (link) {
            e.preventDefault();
            window.location.href = link.href;
          }
        }
      }
    });
  }

  private handleSearch(query: string): void {
    this.currentQuery = query;
    
    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Debounce search
    this.debounceTimer = setTimeout(async () => {
      if (query.trim()) {
        await this.performSearch(query);
      } else {
        this.showRecentDocuments();
      }
    }, 200);
  }

  private async performSearch(query: string): Promise<void> {
    const results = await this.searchEngine.search(query, 10);
    
    if (!this.searchResults) return;
    
    if (results.length === 0) {
      this.searchResults.innerHTML = `
        <div class="search-empty">
          <p>No results found for "<strong>${this.escapeHtml(query)}</strong>"</p>
          <p class="search-empty__hint">Try different keywords or check your spelling</p>
        </div>
      `;
      return;
    }
    
    const resultsHtml = results.map((result, index) => `
      <div class="search-result ${index === 0 ? 'search-result--active' : ''}" data-index="${index}">
        <a href="${result.url}" class="search-result__link">
          <div class="search-result__header">
            <span class="search-result__section">${result.section}</span>
            <span class="search-result__score">${Math.round((1 - result.score) * 100)}% match</span>
          </div>
          <h3 class="search-result__title">${result.highlights?.title || result.title}</h3>
          <p class="search-result__snippet">${result.snippet}</p>
          ${result.tags.length > 0 ? `
            <div class="search-result__tags">
              ${result.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </a>
      </div>
    `).join('');
    
    this.searchResults.innerHTML = resultsHtml;
    
    // Update stats
    const stats = this.searchOverlay?.querySelector('.search-stats');
    if (stats) {
      stats.textContent = `${results.length} results for "${query}"`;
    }
  }

  private showRecentDocuments(): void {
    const recent = this.searchEngine.getRecentDocuments(5);
    
    if (!this.searchResults) return;
    
    this.searchResults.innerHTML = `
      <div class="search-recent">
        <h3>Recent Posts</h3>
        ${recent.map(doc => `
          <div class="search-result">
            <a href="${doc.url}" class="search-result__link">
              <span class="search-result__section">${doc.section}</span>
              <h4 class="search-result__title">${doc.title}</h4>
            </a>
          </div>
        `).join('')}
      </div>
    `;
  }

  private navigateResults(direction: 'up' | 'down'): void {
    const results = this.searchResults?.querySelectorAll('.search-result');
    if (!results || results.length === 0) return;
    
    const current = this.searchResults?.querySelector('.search-result--active');
    let newIndex = 0;
    
    if (current) {
      const currentIndex = parseInt(current.getAttribute('data-index') || '0');
      current.classList.remove('search-result--active');
      
      if (direction === 'down') {
        newIndex = (currentIndex + 1) % results.length;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
      }
    }
    
    results[newIndex].classList.add('search-result--active');
    results[newIndex].scrollIntoView({ block: 'nearest' });
  }

  private openSearch(): void {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.searchOverlay?.classList.add('search-overlay--open');
    this.searchInput?.focus();
    document.body.style.overflow = 'hidden';
    
    // Show recent documents by default
    this.showRecentDocuments();
    
    // Trap focus
    this.trapFocus();
  }

  private closeSearch(): void {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.searchOverlay?.classList.remove('search-overlay--open');
    document.body.style.overflow = '';
    
    // Clear search
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    if (this.searchResults) {
      this.searchResults.innerHTML = '';
    }
    
    // Release focus trap
    this.releaseFocus();
  }

  private trapFocus(): void {
    const focusableElements = this.searchOverlay?.querySelectorAll(
      'input, button, a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    this.searchOverlay?.addEventListener('keydown', handleTabKey);
  }

  private releaseFocus(): void {
    // Focus back to search button
    this.searchButton?.focus();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize search UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SearchUI());
} else {
  new SearchUI();
}
