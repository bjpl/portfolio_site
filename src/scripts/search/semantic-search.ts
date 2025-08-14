// src/scripts/search/semantic-search.ts

import Fuse from 'fuse.js';

interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  snippet: string;
  highlights: string[];
  related: string[];
  confidence: number;
}

interface SearchHistory {
  query: string;
  results: string[];
  timestamp: number;
  clicked?: string;
}

export class SemanticSearch {
  private embeddings: Map<string, VectorEmbedding> = new Map();
  private searchHistory: SearchHistory[] = [];
  private fuse: Fuse<any> | null = null;
  private documents: any[] = [];
  private indexDB: IDBDatabase | null = null;
  private suggestions: Map<string, string[]> = new Map();
  private facets: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeIndexedDB();
    this.buildSearchIndex();
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SemanticSearchDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexDB = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('embeddings')) {
          db.createObjectStore('embeddings', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          historyStore.createIndex('timestamp', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'query' });
        }
      };
    });
  }

  private async buildSearchIndex(): Promise<void> {
    try {
      const response = await fetch('/search-index.json');
      this.documents = await response.json();
      
      this.fuse = new Fuse(this.documents, {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'content', weight: 0.3 },
          { name: 'tags', weight: 0.2 },
          { name: 'description', weight: 0.1 }
        ],
        threshold: 0.3,
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 2,
        findAllMatches: true,
        ignoreLocation: true
      });
      
      this.buildFacets();
      this.buildSuggestions();
    } catch (error) {
      console.error('Failed to build search index:', error);
    }
  }

  private buildFacets(): void {
    this.documents.forEach(doc => {
      if (!this.facets.has('section')) {
        this.facets.set('section', new Set());
      }
      this.facets.get('section')!.add(doc.section);
      
      if (!this.facets.has('tags')) {
        this.facets.set('tags', new Set());
      }
      doc.tags?.forEach((tag: string) => {
        this.facets.get('tags')!.add(tag);
      });
      
      if (doc.format) {
        if (!this.facets.has('format')) {
          this.facets.set('format', new Set());
        }
        this.facets.get('format')!.add(doc.format);
      }
      
      if (doc.date) {
        const date = new Date(doc.date);
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });
        
        if (!this.facets.has('year')) {
          this.facets.set('year', new Set());
        }
        this.facets.get('year')!.add(year);
        
        if (!this.facets.has('month')) {
          this.facets.set('month', new Set());
        }
        this.facets.get('month')!.add(month);
      }
    });
  }

  private buildSuggestions(): void {
    this.documents.forEach(doc => {
      const words = doc.title.toLowerCase().split(/\s+/);
      
      words.forEach(word => {
        if (word.length < 3) return;
        
        for (let i = 3; i <= word.length; i++) {
          const prefix = word.substring(0, i);
          
          if (!this.suggestions.has(prefix)) {
            this.suggestions.set(prefix, []);
          }
          
          const suggestions = this.suggestions.get(prefix)!;
          if (!suggestions.includes(doc.title)) {
            suggestions.push(doc.title);
          }
        }
      });
    });
    
    const commonPatterns = [
      'how to', 'what is', 'why', 'when', 'where',
      'tutorial', 'guide', 'example', 'best practices'
    ];
    
    commonPatterns.forEach(pattern => {
      this.documents.forEach(doc => {
        if (doc.content.toLowerCase().includes(pattern)) {
          if (!this.suggestions.has(pattern)) {
            this.suggestions.set(pattern, []);
          }
          this.suggestions.get(pattern)!.push(doc.title);
        }
      });
    });
  }

  public async search(
    query: string, 
    options: {
      limit?: number;
      filters?: Record<string, string[]>;
      fuzzyFallback?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 10, filters = {}, fuzzyFallback = true } = options;
    
    const cached = await this.getCachedResults(query);
    if (cached) return cached;
    
    let results: SearchResult[] = [];
    
    if (this.fuse) {
      results = this.fuzzySearch(query, limit, filters);
    }
    
    results = await this.enhanceResults(results);
    
    this.saveSearchHistory(query, results);
    
    await this.cacheResults(query, results);
    
    return results;
  }

  private fuzzySearch(
    query: string,
    limit: number,
    filters: Record<string, string[]>
  ): SearchResult[] {
    if (!this.fuse) return [];
    
    const fuseResults = this.fuse.search(query, { limit: limit * 2 });
    
    const filtered = fuseResults.filter(result => {
      return this.matchesFilters(result.item, filters);
    });
    
    return filtered.slice(0, limit).map(result => ({
      id: result.item.id,
      title: result.item.title,
      content: result.item.content,
      score: 1 - (result.score || 0),
      snippet: this.generateSnippet(result.item.content, query),
      highlights: this.extractHighlights(result.matches),
      related: [],
      confidence: 1 - (result.score || 0)
    }));
  }

  private matchesFilters(doc: any, filters: Record<string, string[]>): boolean {
    for (const [key, values] of Object.entries(filters)) {
      if (values.length === 0) continue;
      
      if (key === 'tags') {
        const hasTag = values.some(tag => doc.tags?.includes(tag));
        if (!hasTag) return false;
      } else if (key === 'section') {
        if (!values.includes(doc.section)) return false;
      } else if (key === 'format') {
        if (!values.includes(doc.format)) return false;
      }
    }
    
    return true;
  }

  private generateSnippet(content: string, query: string): string {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);
    
    let bestSentence = '';
    let bestScore = 0;
    
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      let score = 0;
      
      queryWords.forEach(word => {
        if (lower.includes(word)) {
          score++;
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    });
    
    if (bestSentence.length > 200) {
      return bestSentence.substring(0, 200) + '...';
    }
    
    return bestSentence;
  }

  private extractHighlights(matches: any[] | undefined): string[] {
    if (!matches) return [];
    
    const highlights: string[] = [];
    
    matches.forEach(match => {
      if (match.value && match.indices) {
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
        
        highlights.push(highlighted);
      }
    });
    
    return highlights;
  }

  private async enhanceResults(results: SearchResult[]): Promise<SearchResult[]> {
    for (const result of results) {
      result.related = await this.findRelated(result.id, 3);
    }
    
    return results;
  }

  private async findRelated(documentId: string, limit: number): Promise<string[]> {
    const doc = this.documents.find(d => d.id === documentId);
    if (!doc) return [];

    const related = this.documents
      .filter(d => d.id !== documentId)
      .map(d => ({
        id: d.id,
        score: this.calculateRelatedness(doc, d)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.id);

    return related;
  }

  private calculateRelatedness(doc1: any, doc2: any): number {
    let score = 0;
    
    if (doc1.section === doc2.section) score += 2;
    
    const sharedTags = doc1.tags?.filter((tag: string) => 
      doc2.tags?.includes(tag)
    ).length || 0;
    score += sharedTags;
    
    const title1Words = new Set(doc1.title.toLowerCase().split(/\s+/));
    const title2Words = new Set(doc2.title.toLowerCase().split(/\s+/));
    const sharedWords = [...title1Words].filter(w => title2Words.has(w)).length;
    score += sharedWords * 0.5;
    
    return score;
  }

  private async getCachedResults(query: string): Promise<SearchResult[] | null> {
    if (!this.indexDB) return null;
    
    return new Promise((resolve) => {
      const transaction = this.indexDB!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(query);
      
      request.onsuccess = () => {
        const cached = request.result;
        if (cached && Date.now() - cached.timestamp < 3600000) {
          resolve(cached.results);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => resolve(null);
    });
  }

  private async cacheResults(query: string, results: SearchResult[]): Promise<void> {
    if (!this.indexDB) return;
    
    const transaction = this.indexDB.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    store.put({
      query,
      results,
      timestamp: Date.now()
    });
  }

  private saveSearchHistory(query: string, results: SearchResult[]): void {
    const history: SearchHistory = {
      query,
      results: results.map(r => r.id),
      timestamp: Date.now()
    };
    
    this.searchHistory.push(history);
    
    if (this.indexDB) {
      const transaction = this.indexDB.transaction(['history'], 'readwrite');
      const store = transaction.objectStore('history');
      store.add(history);
    }
    
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(-100);
    }
  }

  public async getSuggestions(prefix: string, limit: number = 5): Promise<string[]> {
    const lower = prefix.toLowerCase();
    
    const suggestions = this.suggestions.get(lower) || [];
    
    const partial: string[] = [];
    this.suggestions.forEach((values, key) => {
      if (key.startsWith(lower) && key !== lower) {
        partial.push(...values);
      }
    });
    
    const historical = this.searchHistory
      .filter(h => h.query.toLowerCase().startsWith(lower))
      .map(h => h.query);
    
    const all = [...new Set([...historical, ...suggestions, ...partial])];
    
    all.sort((a, b) => {
      const aIsHistorical = historical.includes(a);
      const bIsHistorical = historical.includes(b);
      
      if (aIsHistorical && !bIsHistorical) return -1;
      if (!aIsHistorical && bIsHistorical) return 1;
      
      return a.localeCompare(b);
    });
    
    return all.slice(0, limit);
  }

  public getFacets(): Map<string, Set<string>> {
    return this.facets;
  }

  public getSearchHistory(): SearchHistory[] {
    return this.searchHistory;
  }

  public async clearCache(): Promise<void> {
    if (!this.indexDB) return;
    
    const transaction = this.indexDB.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    store.clear();
  }

  public async reindex(): Promise<void> {
    this.embeddings.clear();
    this.suggestions.clear();
    this.facets.clear();
    
    await this.buildSearchIndex();
  }

  public recordClick(query: string, resultId: string): void {
    const lastSearch = this.searchHistory[this.searchHistory.length - 1];
    if (lastSearch && lastSearch.query === query) {
      lastSearch.clicked = resultId;
    }
    
    this.updateRelevanceScores(query, resultId);
  }

  private updateRelevanceScores(query: string, clickedId: string): void {
    const doc = this.documents.find(d => d.id === clickedId);
    if (doc) {
      doc.relevanceBoost = (doc.relevanceBoost || 1) * 1.1;
    }
  }
}

let searchInstance: SemanticSearch | null = null;

export async function getSemanticSearch(): Promise<SemanticSearch> {
  if (!searchInstance) {
    searchInstance = new SemanticSearch();
  }
  return searchInstance;
}

export default SemanticSearch;
