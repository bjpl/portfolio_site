# Technical Specifications
## Missing Components for Content Management System

### Overview
This document specifies the technical requirements for components that need to be implemented to complete the comprehensive content management system for the Hugo portfolio site.

## Component Specifications

### 1. ContentOrchestrator Service

#### Purpose
Coordinates complex content operations across multiple services to ensure data consistency and workflow integrity.

#### Technical Requirements

```typescript
interface ContentOrchestrator {
  // Transaction management
  executeTransaction<T>(operations: Operation[]): Promise<TransactionResult<T>>;
  rollbackTransaction(transactionId: string): Promise<void>;
  
  // Cross-language content management
  syncTranslations(contentId: string): Promise<SyncResult>;
  createTranslation(sourceId: string, targetLang: string): Promise<string>;
  
  // Bulk operations
  bulkImport(files: File[], options: ImportOptions): Promise<ImportResult>;
  bulkExport(filter: ContentFilter): Promise<ExportResult>;
  bulkUpdate(updates: BatchUpdate[]): Promise<UpdateResult>;
}

interface Operation {
  type: 'create' | 'update' | 'delete' | 'publish';
  service: string;
  payload: any;
  rollbackAction?: () => Promise<void>;
}

interface TransactionResult<T> {
  success: boolean;
  data?: T;
  errors?: Error[];
  transactionId: string;
}
```

#### Implementation Details

```javascript
class ContentOrchestrator {
  constructor(services, logger, eventBus) {
    this.services = services;
    this.logger = logger;
    this.eventBus = eventBus;
    this.activeTransactions = new Map();
  }

  async executeTransaction(operations) {
    const transactionId = crypto.randomUUID();
    const transaction = {
      id: transactionId,
      operations: [],
      rollbackActions: [],
      startTime: Date.now()
    };

    try {
      this.activeTransactions.set(transactionId, transaction);
      
      for (const operation of operations) {
        const result = await this.executeOperation(operation);
        transaction.operations.push({ operation, result });
        
        if (operation.rollbackAction) {
          transaction.rollbackActions.unshift(operation.rollbackAction);
        }
      }

      await this.commitTransaction(transactionId);
      return { success: true, transactionId };

    } catch (error) {
      await this.rollbackTransaction(transactionId);
      throw error;
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  async syncTranslations(contentId) {
    const baseContent = await this.services.content.getById(contentId);
    const translations = await this.services.content.getTranslations(contentId);
    
    const syncTasks = translations.map(async (translation) => {
      return this.synchronizeTranslationMetadata(baseContent, translation);
    });

    return Promise.allSettled(syncTasks);
  }
}
```

#### Database Schema

```sql
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    operations TEXT NOT NULL, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT
);

CREATE TABLE content_sync_log (
    id TEXT PRIMARY KEY,
    source_content_id TEXT NOT NULL,
    target_content_id TEXT NOT NULL,
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_content_id) REFERENCES content_items(id),
    FOREIGN KEY (target_content_id) REFERENCES content_items(id)
);
```

### 2. ContentValidator Service

#### Purpose
Provides comprehensive validation for content quality, SEO, accessibility, and Hugo compatibility.

#### Technical Requirements

```typescript
interface ContentValidator {
  validateContent(content: ContentItem): Promise<ValidationResult>;
  validateMarkdown(markdown: string): Promise<MarkdownValidationResult>;
  validateFrontmatter(frontmatter: any, schema: Schema): Promise<ValidationResult>;
  validateLinks(content: string): Promise<LinkValidationResult>;
  validateSEO(content: ContentItem): Promise<SEOValidationResult>;
  validateAccessibility(html: string): Promise<A11yValidationResult>;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: Suggestion[];
}

interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
}
```

#### Implementation Details

```javascript
class ContentValidator {
  constructor(markdownIt, linkChecker, seoChecker) {
    this.markdown = markdownIt;
    this.linkChecker = linkChecker;
    this.seoChecker = seoChecker;
    
    // Validation rules
    this.rules = {
      frontmatter: {
        required: ['title', 'date'],
        optional: ['description', 'tags', 'categories'],
        types: {
          title: 'string',
          date: 'date',
          draft: 'boolean'
        }
      },
      content: {
        minWordCount: 100,
        maxWordCount: 5000,
        maxHeadingDepth: 4
      },
      seo: {
        titleLength: { min: 30, max: 60 },
        descriptionLength: { min: 120, max: 160 },
        maxInternalLinks: 5
      }
    };
  }

  async validateContent(content) {
    const results = await Promise.all([
      this.validateFrontmatter(content.frontmatter),
      this.validateMarkdown(content.body),
      this.validateSEO(content),
      this.validateLinks(content.body)
    ]);

    return this.combineResults(results);
  }

  async validateMarkdown(markdown) {
    const errors = [];
    const warnings = [];

    try {
      // Parse markdown for syntax errors
      const tokens = this.markdown.parse(markdown);
      
      // Check for common issues
      this.checkHeadingStructure(tokens, errors);
      this.checkImageAltText(tokens, warnings);
      this.checkCodeBlocks(tokens, warnings);
      
      return { valid: errors.length === 0, errors, warnings };
    } catch (error) {
      errors.push({
        code: 'MARKDOWN_PARSE_ERROR',
        message: `Markdown parsing failed: ${error.message}`,
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }
  }

  async validateLinks(content) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [...content.matchAll(linkRegex)];
    
    const validationPromises = links.map(async ([match, text, url]) => {
      if (url.startsWith('http')) {
        return this.linkChecker.check(url);
      }
      return this.validateInternalLink(url);
    });

    const results = await Promise.allSettled(validationPromises);
    return this.processLinkResults(results, links);
  }
}
```

### 3. WorkflowEngine Service

#### Purpose
Manages content publishing workflows with customizable states, approvals, and automated actions.

#### Technical Requirements

```typescript
interface WorkflowEngine {
  createWorkflow(definition: WorkflowDefinition): Promise<string>;
  startWorkflow(workflowId: string, contentId: string): Promise<string>;
  transitionState(instanceId: string, action: string, userId: string): Promise<void>;
  getWorkflowHistory(instanceId: string): Promise<WorkflowHistory[]>;
  cancelWorkflow(instanceId: string, reason: string): Promise<void>;
}

interface WorkflowDefinition {
  name: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  automations: WorkflowAutomation[];
}

interface WorkflowState {
  id: string;
  name: string;
  type: 'start' | 'intermediate' | 'end';
  assignable: boolean;
  notifications: NotificationConfig[];
}

interface WorkflowTransition {
  from: string;
  to: string;
  action: string;
  permissions: string[];
  conditions?: Condition[];
  automations?: string[];
}
```

#### Implementation Details

```javascript
class WorkflowEngine {
  constructor(database, notificationService, eventBus) {
    this.db = database;
    this.notifications = notificationService;
    this.eventBus = eventBus;
    this.automations = new Map();
  }

  async startWorkflow(workflowId, contentId, initiatorId) {
    const workflow = await this.getWorkflow(workflowId);
    const startState = workflow.states.find(s => s.type === 'start');
    
    const instance = {
      id: crypto.randomUUID(),
      workflowId,
      contentId,
      currentState: startState.id,
      initiatedBy: initiatorId,
      createdAt: new Date(),
      metadata: {}
    };

    await this.db.workflow_instances.create(instance);
    await this.executeStateActions(instance, startState);
    
    return instance.id;
  }

  async transitionState(instanceId, action, userId) {
    const instance = await this.getWorkflowInstance(instanceId);
    const workflow = await this.getWorkflow(instance.workflowId);
    
    const transition = workflow.transitions.find(t => 
      t.from === instance.currentState && t.action === action
    );

    if (!transition) {
      throw new Error(`Invalid transition: ${action} from ${instance.currentState}`);
    }

    // Check permissions
    await this.checkTransitionPermissions(transition, userId);
    
    // Check conditions
    await this.evaluateConditions(transition.conditions, instance);

    // Execute transition
    await this.executeTransition(instance, transition, userId);
  }

  async executeStateActions(instance, state) {
    // Send notifications
    for (const notification of state.notifications) {
      await this.sendNotification(notification, instance);
    }

    // Execute automations
    for (const automation of state.automations || []) {
      await this.executeAutomation(automation, instance);
    }

    // Emit event
    this.eventBus.emit('workflow:state_changed', {
      instanceId: instance.id,
      contentId: instance.contentId,
      previousState: instance.previousState,
      currentState: instance.currentState
    });
  }
}
```

#### Database Schema

```sql
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition TEXT NOT NULL, -- JSON
    version INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_instances (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    current_state TEXT NOT NULL,
    previous_state TEXT,
    initiated_by TEXT NOT NULL,
    assigned_to TEXT,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
    FOREIGN KEY (content_id) REFERENCES content_items(id),
    FOREIGN KEY (initiated_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE workflow_history (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    from_state TEXT,
    to_state TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instance_id) REFERENCES workflow_instances(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4. AssetManager Service

#### Purpose
Comprehensive asset lifecycle management with optimization, versioning, and CDN integration.

#### Technical Requirements

```typescript
interface AssetManager {
  uploadAsset(file: File, options: UploadOptions): Promise<AssetInfo>;
  optimizeAsset(assetId: string, optimizations: OptimizationConfig): Promise<void>;
  generateVariants(assetId: string, variants: VariantConfig[]): Promise<AssetVariant[]>;
  deleteAsset(assetId: string): Promise<void>;
  getAssetUsage(assetId: string): Promise<UsageInfo>;
  migrateAssets(fromPath: string, toPath: string): Promise<MigrationResult>;
}

interface AssetInfo {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  dimensions?: { width: number; height: number };
  url: string;
  cdnUrl?: string;
  variants: AssetVariant[];
  metadata: AssetMetadata;
}

interface OptimizationConfig {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  resize?: { width?: number; height?: number; fit?: string };
  progressive?: boolean;
}
```

#### Implementation Details

```javascript
class AssetManager {
  constructor(storage, imageProcessor, cdnService) {
    this.storage = storage;
    this.processor = imageProcessor;
    this.cdn = cdnService;
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  }

  async uploadAsset(file, options = {}) {
    // Validate file
    await this.validateFile(file);
    
    // Generate unique filename
    const filename = this.generateFilename(file.originalname);
    const assetId = crypto.randomUUID();
    
    // Process image if applicable
    let processedFile = file;
    if (this.isImage(file.mimetype)) {
      processedFile = await this.processor.process(file.buffer, {
        quality: options.quality || 85,
        progressive: true
      });
    }

    // Save to storage
    const filePath = await this.storage.save(filename, processedFile);
    
    // Extract metadata
    const metadata = await this.extractMetadata(processedFile, file.mimetype);
    
    // Create asset record
    const asset = {
      id: assetId,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: processedFile.length,
      filePath,
      metadata,
      uploadedAt: new Date()
    };

    await this.db.assets.create(asset);

    // Upload to CDN if configured
    if (this.cdn) {
      asset.cdnUrl = await this.cdn.upload(filename, processedFile);
    }

    // Generate responsive variants for images
    if (this.isImage(file.mimetype)) {
      asset.variants = await this.generateImageVariants(assetId, processedFile);
    }

    return asset;
  }

  async generateImageVariants(assetId, imageBuffer) {
    const variants = [
      { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
      { name: 'small', width: 400, fit: 'inside' },
      { name: 'medium', width: 800, fit: 'inside' },
      { name: 'large', width: 1200, fit: 'inside' }
    ];

    const generatedVariants = [];

    for (const variant of variants) {
      const processed = await this.processor.resize(imageBuffer, variant);
      const filename = `${assetId}_${variant.name}.webp`;
      const filePath = await this.storage.save(filename, processed);
      
      generatedVariants.push({
        name: variant.name,
        filename,
        filePath,
        width: variant.width,
        height: variant.height,
        size: processed.length
      });
    }

    return generatedVariants;
  }

  async getAssetUsage(assetId) {
    // Find all content that references this asset
    const usages = await this.db.query(`
      SELECT ci.id, ci.title, ci.section, ci.language 
      FROM content_items ci 
      WHERE ci.body LIKE '%${assetId}%' 
         OR ci.frontmatter LIKE '%${assetId}%'
    `);

    return {
      assetId,
      usageCount: usages.length,
      usages: usages.map(u => ({
        contentId: u.id,
        title: u.title,
        section: u.section,
        language: u.language
      }))
    };
  }
}
```

### 5. SearchEngine Service

#### Purpose
Advanced search capabilities with full-text search, faceted filtering, and semantic search.

#### Technical Requirements

```typescript
interface SearchEngine {
  indexContent(content: ContentItem): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult>;
  suggest(query: string): Promise<Suggestion[]>;
  getRelatedContent(contentId: string): Promise<ContentItem[]>;
  rebuildIndex(): Promise<void>;
  getSearchAnalytics(): Promise<SearchAnalytics>;
}

interface SearchQuery {
  text: string;
  filters?: SearchFilter[];
  facets?: string[];
  sort?: SortOption;
  pagination?: PaginationOption;
}

interface SearchResult {
  items: SearchResultItem[];
  total: number;
  facets: FacetResult[];
  suggestions: string[];
  query: string;
  executionTime: number;
}
```

#### Implementation Details

```javascript
class SearchEngine {
  constructor(fuseOptions) {
    this.fuse = null;
    this.index = new Map();
    this.analytics = new Map();
    
    this.defaultOptions = {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'description', weight: 2 },
        { name: 'content', weight: 1 },
        { name: 'tags', weight: 2 },
        { name: 'categories', weight: 1.5 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true
    };
  }

  async indexContent(content) {
    // Prepare content for indexing
    const indexableContent = {
      id: content.id,
      title: content.title,
      description: content.description || '',
      content: this.extractTextContent(content.body),
      tags: content.tags || [],
      categories: content.categories || [],
      section: content.section,
      language: content.language,
      url: content.url,
      lastModified: content.updatedAt
    };

    this.index.set(content.id, indexableContent);
    await this.rebuildSearchIndex();
  }

  async search(query) {
    const startTime = Date.now();
    
    // Record search analytics
    this.recordSearch(query.text);
    
    let results = [];
    
    if (query.text) {
      // Full-text search
      results = this.fuse.search(query.text);
    } else {
      // Get all items
      results = Array.from(this.index.values()).map(item => ({ item }));
    }

    // Apply filters
    if (query.filters) {
      results = this.applyFilters(results, query.filters);
    }

    // Generate facets
    const facets = this.generateFacets(results, query.facets);

    // Apply sorting
    if (query.sort) {
      results = this.applySorting(results, query.sort);
    }

    // Apply pagination
    const { items, total } = this.applyPagination(results, query.pagination);

    const executionTime = Date.now() - startTime;

    return {
      items: items.map(r => this.formatSearchResult(r)),
      total,
      facets,
      suggestions: this.generateSuggestions(query.text),
      query: query.text,
      executionTime
    };
  }

  async getRelatedContent(contentId, limit = 5) {
    const content = this.index.get(contentId);
    if (!content) return [];

    // Find related content based on tags and categories
    const candidates = Array.from(this.index.values())
      .filter(item => item.id !== contentId && item.language === content.language);

    const scored = candidates.map(candidate => ({
      content: candidate,
      score: this.calculateSimilarity(content, candidate)
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.content);
  }

  calculateSimilarity(content1, content2) {
    let score = 0;

    // Tag similarity
    const commonTags = content1.tags.filter(tag => content2.tags.includes(tag));
    score += commonTags.length * 2;

    // Category similarity
    const commonCategories = content1.categories.filter(cat => 
      content2.categories.includes(cat)
    );
    score += commonCategories.length * 3;

    // Section similarity
    if (content1.section === content2.section) {
      score += 1;
    }

    return score;
  }
}
```

### 6. RecommendationEngine Service

#### Purpose
Content recommendation system based on user behavior, content similarity, and popularity metrics.

#### Technical Requirements

```typescript
interface RecommendationEngine {
  getRecommendations(userId: string, contentId?: string): Promise<Recommendation[]>;
  trackUserInteraction(userId: string, contentId: string, interaction: InteractionType): Promise<void>;
  getPopularContent(timeframe: string, limit: number): Promise<ContentItem[]>;
  getTrendingTags(): Promise<TagTrend[]>;
  updateRecommendationModel(): Promise<void>;
}

interface Recommendation {
  contentId: string;
  score: number;
  reason: RecommendationReason;
  content: ContentItem;
}

interface InteractionType {
  type: 'view' | 'share' | 'bookmark' | 'download';
  duration?: number;
  source?: string;
}
```

#### Implementation Details

```javascript
class RecommendationEngine {
  constructor(analytics, contentService) {
    this.analytics = analytics;
    this.contentService = contentService;
    this.userProfiles = new Map();
    this.contentSimilarity = new Map();
  }

  async getRecommendations(userId, contentId, limit = 10) {
    const recommendations = [];

    // Get user profile
    const userProfile = await this.getUserProfile(userId);

    if (contentId) {
      // Content-based recommendations
      const similarContent = await this.getContentBasedRecommendations(contentId, limit / 2);
      recommendations.push(...similarContent);
    }

    // Collaborative filtering recommendations
    const collaborativeRecs = await this.getCollaborativeRecommendations(userProfile, limit / 2);
    recommendations.push(...collaborativeRecs);

    // Popular content recommendations
    const popularContent = await this.getPopularContent('week', 5);
    const popularRecs = popularContent.map(content => ({
      contentId: content.id,
      score: 0.5,
      reason: { type: 'popular', details: 'Trending this week' },
      content
    }));
    recommendations.push(...popularRecs);

    // Score and sort recommendations
    const scored = await this.scoreRecommendations(recommendations, userProfile);
    return scored.slice(0, limit);
  }

  async getContentBasedRecommendations(contentId, limit) {
    const content = await this.contentService.getById(contentId);
    const similarContent = await this.findSimilarContent(content, limit * 2);

    return similarContent.map(similar => ({
      contentId: similar.id,
      score: similar.similarity,
      reason: {
        type: 'similar_content',
        details: `Similar to "${content.title}"`
      },
      content: similar.content
    }));
  }

  async trackUserInteraction(userId, contentId, interaction) {
    const timestamp = Date.now();
    
    // Store interaction
    await this.analytics.recordInteraction({
      userId,
      contentId,
      ...interaction,
      timestamp
    });

    // Update user profile
    await this.updateUserProfile(userId, contentId, interaction);

    // Update content popularity
    await this.updateContentPopularity(contentId, interaction);
  }

  async updateUserProfile(userId, contentId, interaction) {
    const profile = this.userProfiles.get(userId) || {
      interests: new Map(),
      categories: new Map(),
      interactionCount: 0
    };

    const content = await this.contentService.getById(contentId);
    
    // Update interest scores based on tags
    content.tags?.forEach(tag => {
      const current = profile.interests.get(tag) || 0;
      profile.interests.set(tag, current + this.getInteractionWeight(interaction.type));
    });

    // Update category preferences
    content.categories?.forEach(category => {
      const current = profile.categories.get(category) || 0;
      profile.categories.set(category, current + this.getInteractionWeight(interaction.type));
    });

    profile.interactionCount++;
    this.userProfiles.set(userId, profile);
  }

  getInteractionWeight(type) {
    const weights = {
      'view': 1,
      'share': 3,
      'bookmark': 5,
      'download': 4
    };
    return weights[type] || 1;
  }
}
```

## Integration Strategy

### Phase 1: Core Services (Weeks 1-2)
1. **ContentOrchestrator**: Implement transaction management and bulk operations
2. **ContentValidator**: Basic validation rules and markdown checking
3. **Database Schema**: Create new tables for enhanced functionality

### Phase 2: Workflow Management (Weeks 3-4)
1. **WorkflowEngine**: Implement state machine and transition logic
2. **NotificationService**: Enhance existing email service with multi-channel support
3. **Admin Interface**: Add workflow management UI components

### Phase 3: Asset and Search (Weeks 5-6)
1. **AssetManager**: Replace existing ImageService with comprehensive asset management
2. **SearchEngine**: Implement full-text search and faceted filtering
3. **RecommendationEngine**: Basic content recommendations

### Phase 4: Advanced Features (Weeks 7-8)
1. **Performance Optimization**: Implement caching and indexing strategies
2. **Analytics Integration**: Add comprehensive tracking and reporting
3. **Security Hardening**: Implement additional security measures

## Testing Strategy

### Unit Tests
- Service layer: 95% code coverage
- Business logic: 100% coverage for critical paths
- Error handling: Test all error scenarios

### Integration Tests
- API endpoints: Test all REST endpoints
- Database operations: Test data consistency
- File operations: Test file system interactions

### End-to-End Tests
- Content workflows: Complete content lifecycle
- User journeys: Critical user paths
- Performance tests: Load and stress testing

## Deployment Requirements

### Environment Variables
```bash
# Database
DATABASE_URL=sqlite:./data/cms.db
REDIS_URL=redis://localhost:6379

# Storage
UPLOAD_PATH=/var/www/uploads
CDN_URL=https://cdn.example.com
CDN_API_KEY=your_cdn_api_key

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Search
SEARCH_INDEX_PATH=/var/www/search
FUSE_THRESHOLD=0.3

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
```

### System Requirements
- **Node.js**: 18.x or higher
- **Memory**: Minimum 512MB, recommended 2GB
- **Storage**: SSD recommended for database performance
- **Network**: Reliable internet for CDN and email services

---

*This technical specification provides detailed implementation guidance for the missing components needed to complete the comprehensive content management system. Each component is designed to integrate seamlessly with the existing Hugo portfolio architecture while providing enhanced functionality and scalability.*