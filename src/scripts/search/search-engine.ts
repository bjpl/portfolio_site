// src/scripts/search/search-engine.ts

import Fuse from 'fuse.js';

export interface SearchDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  categories: string[];
  section: string;
  url: string;
  date: string;
  readingTime?: string;
  image?: string;
}

export interface SearchOptions {
  threshold: number;
  includeScore: boolean;
  includeMatches: boolean;
  minMatchCharLength: number;
  keys: Array<{
    name: string;
    weight: number;
  }>;
}

export class SearchEngine {
  private fuse: Fuse<SearchDocument> | null = null;
  private documents: SearchDocument[] = [];
  private searchIndex: any = null;
  private isInitialized = false;
  private readonly defaultOptions: SearchOptions = {
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'content', weight: 0.2 },
      { name: 'tags', weight: 0.05 },
      { name: 'categories', weight: 0.05 }
    ]
  };

  constructor(private options: Partial<SearchOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load search index
      const response = await fetch('/search-index.json');
      if (!response.ok) throw new Error('Failed to load search index');
      
      this.documents = await response.json();
      
      // Create Fuse instance
      this.fuse = new Fuse(this.documents, this.options as Fuse.IFuseOptions<SearchDocument>);
      
      // Pre-build index for faster searches
      this.searchIndex = this.fuse.getIndex();
      
      this.isInitialized = true;
      console.log(`Search engine initialized with ${this.documents.length} documents`);
    } catch (error) {
      console.error('Failed to initialize search engine:', error);
      throw error;
    }
  }

  async search(query: string, limit: number = 10): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.fuse || !query.trim()) {
      return [];
    }

    // Perform search
    const results = this.fuse.search(query, { limit });
    
    // Process and enhance results
    return results.map(result => ({
      ...result.item,
      score: result.score,
      matches: result.matches,
      snippet: this.generateSnippet(result.item.content, query),
      highlights: this.generateHighlights(result.matches)
    }));
  }

  async searchBySection(section: string, query: string): Promise<any[]> {
    const sectionDocs = this.documents.filter(doc => doc.section === section);
    const sectionFuse = new Fuse(sectionDocs, this.options as Fuse.IFuseOptions<SearchDocument>);
    
    return sectionFuse.search(query).map(result => ({
      ...result.item,
      score: result.score
    }));
  }

  async searchByTags(tags: string[]): Promise<SearchDocument[]> {
    return this.documents.filter(doc => 
      tags.some(tag => doc.tags.includes(tag))
    );
  }

  async getSuggestions(partial: string, limit: number = 5): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const suggestions = new Set<string>();
    const lowerPartial = partial.toLowerCase();

    // Get title suggestions
    this.documents.forEach(doc => {
      if (doc.title.toLowerCase().includes(lowerPartial)) {
        suggestions.add(doc.title);
      }
    });

    // Get tag suggestions
    this.documents.forEach(doc => {
      doc.tags.forEach(tag => {
        if (tag.toLowerCase().includes(lowerPartial)) {
          suggestions.add(tag);
        }
      });
    });

    return Array.from(suggestions).slice(0, limit);
  }

  private generateSnippet(content: string, query: string, contextLength: number = 150): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index === -1) {
      return content.substring(0, contextLength) + '...';
    }

    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(content.length, index + lowerQuery.length + contextLength / 2);
    
    let snippet = '';
    if (start > 0) snippet += '...';
    snippet += content.substring(start, end);
    if (end < content.length) snippet += '...';
    
    return snippet;
  }

  private generateHighlights(matches: any[] | undefined): Record<string, string> {
    if (!matches) return {};
    
    const highlights: Record<string, string> = {};
    
    matches.forEach(match => {
      if (match.indices && match.indices.length > 0) {
        let highlighted = match.value;
        const indices = match.indices.sort((a: number[], b: number[]) => b[0] - a[0]);
        
        indices.forEach(([start, end]: number[]) => {
          highlighted = 
            highlighted.substring(0, start) +
            '<mark>' +
            highlighted.substring(start, end + 1) +
            '</mark>' +
            highlighted.substring(end + 1);
        });
        
        highlights[match.key] = highlighted;
      }
    });
    
    return highlights;
  }

  getDocumentCount(): number {
    return this.documents.length;
  }

  getRecentDocuments(limit: number = 5): SearchDocument[] {
    return [...this.documents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  getRelatedDocuments(documentId: string, limit: number = 5): SearchDocument[] {
    const doc = this.documents.find(d => d.id === documentId);
    if (!doc) return [];

    // Find documents with similar tags
    const relatedByTags = this.documents
      .filter(d => d.id !== documentId)
      .map(d => ({
        doc: d,
        score: d.tags.filter(tag => doc.tags.includes(tag)).length
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.doc);

    return relatedByTags;
  }
}
