# Component Interaction Diagrams
## Content Management System Architecture

### C4 Model Architecture Diagrams

## Level 1: System Context Diagram

```mermaid
graph TB
    User[Content Creator/Editor]
    Visitor[Site Visitor]
    Admin[System Administrator]
    
    CMS[Content Management System]
    Hugo[Hugo Static Site]
    Netlify[Netlify CDN]
    
    User --> CMS
    Admin --> CMS
    CMS --> Hugo
    Hugo --> Netlify
    Visitor --> Netlify
    
    style CMS fill:#e1f5fe
    style Hugo fill:#f3e5f5
    style Netlify fill:#e8f5e8
```

## Level 2: Container Diagram

```mermaid
graph TB
    subgraph "Content Management System"
        Web[Web Admin Interface<br/>React SPA]
        API[REST API<br/>Express.js]
        WS[WebSocket Server<br/>Real-time Updates]
        DB[(SQLite Database<br/>Metadata)]
        FS[(File System<br/>Markdown Content)]
        Cache[(Redis Cache<br/>Performance)]
    end
    
    subgraph "Hugo Static Site"
        Hugo[Hugo Generator<br/>Static Site Builder]
        Static[Static Assets<br/>HTML/CSS/JS]
    end
    
    User[Content Creator] --> Web
    Web --> API
    API --> DB
    API --> FS
    API --> Cache
    API --> WS
    WS --> Web
    
    API --> Hugo
    Hugo --> FS
    Hugo --> Static
    
    style Web fill:#e3f2fd
    style API fill:#e8f5e8
    style Hugo fill:#fff3e0
```

## Level 3: Component Diagram - API Layer

```mermaid
graph TB
    subgraph "Express.js API Server"
        subgraph "Controllers"
            ContentCtrl[Content Controller]
            AuthCtrl[Auth Controller]
            AssetCtrl[Asset Controller]
            WorkflowCtrl[Workflow Controller]
        end
        
        subgraph "Services"
            ContentSvc[Content Service]
            HugoSvc[Hugo Service]
            AuthSvc[Auth Service]
            FileSvc[File Service]
            ImageSvc[Image Service]
            CacheSvc[Cache Service]
            EmailSvc[Email Service]
            WorkflowSvc[Workflow Service]
        end
        
        subgraph "Middleware"
            Auth[Authentication]
            Valid[Validation]
            Cors[CORS]
            Rate[Rate Limiting]
            Log[Logging]
        end
        
        subgraph "Data Layer"
            SQLite[(SQLite DB)]
            FileSystem[(File System)]
            Redis[(Redis Cache)]
        end
    end
    
    ContentCtrl --> ContentSvc
    ContentCtrl --> WorkflowSvc
    AuthCtrl --> AuthSvc
    AssetCtrl --> FileSvc
    AssetCtrl --> ImageSvc
    
    ContentSvc --> SQLite
    ContentSvc --> FileSystem
    ContentSvc --> CacheSvc
    HugoSvc --> FileSystem
    FileSvc --> FileSystem
    CacheSvc --> Redis
    AuthSvc --> SQLite
    
    Auth --> AuthSvc
    Valid --> ContentSvc
    
    style ContentSvc fill:#e8f5e8
    style HugoSvc fill:#fff3e0
    style AuthSvc fill:#fce4ec
```

## Data Flow Diagrams

### Content Creation Flow

```mermaid
sequenceDiagram
    participant User as Content Creator
    participant UI as React Admin UI
    participant API as Express API
    participant ContentSvc as Content Service
    participant DB as SQLite DB
    participant FS as File System
    participant Hugo as Hugo Generator
    participant WS as WebSocket

    User->>UI: Create new content
    UI->>API: POST /api/content
    API->>ContentSvc: createContent()
    
    ContentSvc->>DB: Insert metadata
    ContentSvc->>FS: Write markdown file
    ContentSvc->>API: Return content ID
    
    API->>Hugo: Trigger incremental build
    API->>WS: Broadcast content:created
    WS->>UI: Real-time update
    
    Hugo->>FS: Read updated content
    Hugo->>Hugo: Generate static files
    
    API->>UI: Success response
    UI->>User: Show success notification
```

### Content Publishing Workflow

```mermaid
sequenceDiagram
    participant Author as Content Author
    participant Editor as Content Editor
    participant UI as Admin Interface
    participant API as API Server
    participant WorkflowSvc as Workflow Service
    participant NotifSvc as Notification Service
    participant Hugo as Hugo Generator

    Author->>UI: Submit for review
    UI->>API: POST /api/workflow/submit
    API->>WorkflowSvc: changeState(draft → review)
    WorkflowSvc->>NotifSvc: Send notification
    NotifSvc->>Editor: Email notification
    
    Editor->>UI: Review content
    Editor->>UI: Approve for publication
    UI->>API: POST /api/workflow/approve
    API->>WorkflowSvc: changeState(review → approved)
    
    WorkflowSvc->>Hugo: Trigger production build
    Hugo->>Hugo: Generate production site
    WorkflowSvc->>NotifSvc: Send success notification
    NotifSvc->>Author: Publication confirmation
```

### Asset Upload and Processing Flow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Upload Interface
    participant API as API Server
    participant AssetSvc as Asset Service
    participant ImageSvc as Image Service
    participant FS as File System
    participant CDN as CDN/Storage

    User->>UI: Select and upload image
    UI->>API: POST /api/assets/upload
    API->>AssetSvc: processUpload()
    
    AssetSvc->>ImageSvc: optimizeImage()
    ImageSvc->>ImageSvc: Resize, compress, convert
    ImageSvc->>FS: Save optimized versions
    
    AssetSvc->>CDN: Upload to CDN (optional)
    AssetSvc->>API: Return asset metadata
    
    API->>UI: Upload success + URLs
    UI->>User: Show preview + insert options
```

## System Integration Diagram

```mermaid
graph TB
    subgraph "Content Management Layer"
        AdminUI[Admin Interface]
        ContentAPI[Content API]
        AssetMgmt[Asset Management]
        Workflow[Workflow Engine]
    end
    
    subgraph "Hugo Integration Layer"
        HugoAPI[Hugo API Service]
        BuildQueue[Build Queue]
        FileWatcher[File Watcher]
    end
    
    subgraph "Data Layer"
        SQLite[(Metadata DB)]
        ContentFiles[(Markdown Files)]
        AssetFiles[(Asset Storage)]
        BuildCache[(Build Cache)]
    end
    
    subgraph "External Services"
        Netlify[Netlify Deploy]
        CDN[Asset CDN]
        Email[Email Service]
        Analytics[Analytics]
    end
    
    AdminUI --> ContentAPI
    ContentAPI --> SQLite
    ContentAPI --> ContentFiles
    ContentAPI --> AssetMgmt
    
    AssetMgmt --> AssetFiles
    AssetMgmt --> CDN
    
    Workflow --> Email
    Workflow --> HugoAPI
    
    HugoAPI --> BuildQueue
    HugoAPI --> FileWatcher
    BuildQueue --> BuildCache
    
    FileWatcher --> ContentFiles
    BuildQueue --> Netlify
    
    style AdminUI fill:#e3f2fd
    style ContentAPI fill:#e8f5e8
    style HugoAPI fill:#fff3e0
    style SQLite fill:#f3e5f5
```

## Service Interaction Matrix

| Service | ContentSvc | HugoSvc | AuthSvc | FileSvc | ImageSvc | CacheSvc | EmailSvc | WorkflowSvc |
|---------|------------|---------|---------|---------|----------|----------|----------|-------------|
| ContentSvc | - | ✓ | ✓ | ✓ | - | ✓ | - | ✓ |
| HugoSvc | ✓ | - | - | ✓ | - | ✓ | - | - |
| AuthSvc | - | - | - | - | - | ✓ | ✓ | - |
| FileSvc | ✓ | ✓ | - | - | ✓ | - | - | - |
| ImageSvc | ✓ | - | - | ✓ | - | ✓ | - | - |
| CacheSvc | ✓ | ✓ | ✓ | - | ✓ | - | - | ✓ |
| EmailSvc | - | - | ✓ | - | - | - | - | ✓ |
| WorkflowSvc | ✓ | ✓ | ✓ | - | - | ✓ | ✓ | - |

## Performance and Scalability Patterns

### Caching Architecture

```mermaid
graph TB
    subgraph "Caching Layers"
        Browser[Browser Cache<br/>Static Assets]
        CDN[CDN Cache<br/>Global Edge]
        AppCache[Application Cache<br/>Redis]
        DBCache[Database Cache<br/>Query Results]
    end
    
    subgraph "Cache Invalidation"
        FileWatch[File Watcher]
        APIUpdate[API Updates]
        TimeExpiry[Time-based Expiry]
        ManualFlush[Manual Cache Flush]
    end
    
    User[User Request] --> Browser
    Browser --> CDN
    CDN --> AppCache
    AppCache --> DBCache
    
    FileWatch --> AppCache
    APIUpdate --> AppCache
    TimeExpiry --> AppCache
    ManualFlush --> AppCache
    
    style AppCache fill:#e8f5e8
    style CDN fill:#fff3e0
```

### Load Balancing and Scaling

```mermad
graph TB
    subgraph "Load Balancer"
        LB[Nginx/Cloudflare]
    end
    
    subgraph "Application Servers"
        App1[Node.js Instance 1]
        App2[Node.js Instance 2]
        App3[Node.js Instance 3]
    end
    
    subgraph "Shared Services"
        Redis[(Redis Cache)]
        SQLite[(SQLite DB)]
        FileStore[(Shared File Storage)]
    end
    
    Users[Users] --> LB
    LB --> App1
    LB --> App2
    LB --> App3
    
    App1 --> Redis
    App1 --> SQLite
    App1 --> FileStore
    
    App2 --> Redis
    App2 --> SQLite
    App2 --> FileStore
    
    App3 --> Redis
    App3 --> SQLite
    App3 --> FileStore
    
    style LB fill:#e3f2fd
    style Redis fill:#ffebee
    style SQLite fill:#f3e5f5
```

## Error Handling and Recovery

### Error Flow Diagram

```mermaid
graph TB
    Request[Incoming Request]
    
    Middleware[Validation Middleware]
    Controller[Route Controller]
    Service[Business Service]
    
    ValidationError[Validation Error]
    BusinessError[Business Logic Error]
    SystemError[System Error]
    
    ErrorHandler[Global Error Handler]
    Logger[Error Logger]
    Response[Error Response]
    
    Request --> Middleware
    Middleware --> Controller
    Controller --> Service
    
    Middleware -->|Invalid Input| ValidationError
    Service -->|Business Rule| BusinessError
    Service -->|System Failure| SystemError
    
    ValidationError --> ErrorHandler
    BusinessError --> ErrorHandler
    SystemError --> ErrorHandler
    
    ErrorHandler --> Logger
    ErrorHandler --> Response
    
    style ErrorHandler fill:#ffebee
    style Logger fill:#fff3e0
```

## Security Architecture

### Authentication and Authorization Flow

```mermaid
sequenceDiagram
    participant Client as Client Application
    participant API as API Gateway
    participant Auth as Auth Service
    participant Resource as Resource Service
    participant DB as Database

    Client->>API: Request with JWT token
    API->>Auth: Validate token
    Auth->>Auth: Verify signature & expiry
    Auth->>DB: Check user permissions
    Auth->>API: Return user context
    API->>Resource: Forward request + context
    Resource->>Resource: Check authorization
    Resource->>API: Return response
    API->>Client: Final response
```

## Monitoring and Observability

### System Health Monitoring

```mermaid
graph TB
    subgraph "Monitoring Stack"
        HealthCheck[Health Check Endpoints]
        Metrics[Application Metrics]
        Logs[Structured Logging]
        Alerts[Alert System]
    end
    
    subgraph "Data Collection"
        Winston[Winston Logger]
        Prometheus[Metrics Collection]
        Uptime[Uptime Monitoring]
    end
    
    subgraph "Dashboards"
        AdminDash[Admin Dashboard]
        DevDash[Developer Dashboard]
        AlertMgr[Alert Manager]
    end
    
    HealthCheck --> Uptime
    Metrics --> Prometheus
    Logs --> Winston
    
    Uptime --> AdminDash
    Prometheus --> DevDash
    Winston --> AlertMgr
    
    Alerts --> AlertMgr
    
    style HealthCheck fill:#e8f5e8
    style Metrics fill:#e3f2fd
    style Logs fill:#fff3e0
```

---

*These component diagrams provide a comprehensive view of the system architecture, showing how different components interact and data flows through the system. They serve as a reference for development and help identify potential bottlenecks or areas for optimization.*