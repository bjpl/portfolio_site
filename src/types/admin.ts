// Admin Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  totalContent: number;
  totalViews: number;
  conversionRate: number;
  systemHealth: 'good' | 'warning' | 'error';
  lastUpdate: Date;
}

export interface ActivityItem {
  id: string;
  type: 'user' | 'content' | 'system' | 'analytics';
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'success';
}

// Real-time Analytics Types
export interface AnalyticsData {
  realTimeUsers: number;
  pageViews: number;
  sessionDuration: number;
  bounceRate: number;
  topPages: Array<{ path: string; views: number; change: number }>;
  trafficSources: Array<{ source: string; users: number; percentage: number }>;
  deviceTypes: Array<{ type: string; count: number; percentage: number }>;
  geographicData: Array<{ country: string; users: number; sessions: number }>;
  realTimeEvents: Array<{ timestamp: Date; event: string; page: string; user: string }>;
}

// Content Calendar Types
export interface ContentItem {
  id: string;
  title: string;
  type: 'blog' | 'page' | 'portfolio' | 'social';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  author: string;
  scheduledDate: Date;
  publishedDate?: Date;
  tags: string[];
  category: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedReadTime?: number;
  wordCount?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ContentItem;
}

// User Management Types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'author' | 'user';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  permissions: string[];
  profile: {
    phone?: string;
    bio?: string;
    location?: string;
    website?: string;
  };
  stats: {
    contentCreated: number;
    loginCount: number;
    lastActive: Date;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: Date;
  ipAddress: string;
}

// Workflow Types
export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  type: 'start' | 'task' | 'decision' | 'end' | 'review' | 'publish';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  assignee?: string;
  estimatedTime?: number;
  actualTime?: number;
  dependencies?: string[];
  conditions?: string[];
  position: { x: number; y: number };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'content_creation' | 'content_review' | 'deployment' | 'user_onboarding' | 'custom';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  totalSteps: number;
  completedSteps: number;
  estimatedDuration: number;
  actualDuration?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  currentStepId?: string;
  executedSteps: Array<{
    stepId: string;
    status: 'completed' | 'failed' | 'skipped';
    startedAt: Date;
    completedAt?: Date;
    assignee?: string;
    notes?: string;
  }>;
  metadata?: any;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
    readSpeed: number;
    writeSpeed: number;
  };
  network: {
    inbound: number;
    outbound: number;
    latency: number;
    packetLoss: number;
  };
  application: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: number;
  };
  database: {
    connectionPool: number;
    queryTime: number;
    slowQueries: number;
    lockWaits: number;
  };
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  category: 'performance' | 'security' | 'system' | 'application';
}

export interface PerformanceHistory {
  timestamp: Date;
  metrics: Partial<PerformanceMetrics>;
}

// Content Analytics Types
export interface ContentMetrics {
  id: string;
  title: string;
  type: 'blog' | 'page' | 'portfolio';
  publishedDate: Date;
  views: number;
  uniqueViews: number;
  likes: number;
  shares: number;
  comments: number;
  avgTimeOnPage: number;
  bounceRate: number;
  conversionRate: number;
  socialEngagement: {
    facebook: number;
    twitter: number;
    linkedin: number;
    instagram: number;
  };
  searchTerms: Array<{ term: string; count: number }>;
  referrers: Array<{ source: string; count: number }>;
  demographics: {
    ageGroups: Array<{ range: string; count: number }>;
    locations: Array<{ country: string; count: number }>;
    devices: Array<{ type: string; count: number }>;
  };
  performance: {
    loadTime: number;
    coreWebVitals: {
      lcp: number;
      fid: number;
      cls: number;
    };
  };
}

export interface AnalyticsOverview {
  totalContent: number;
  totalViews: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topPerformingContent: ContentMetrics[];
  growthRate: number;
  periodComparison: {
    views: { current: number; previous: number; change: number };
    engagement: { current: number; previous: number; change: number };
    newContent: { current: number; previous: number; change: number };
  };
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system';
  category: 'user' | 'content' | 'system' | 'security' | 'analytics' | 'workflow';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  userId?: string;
  metadata?: any;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  browserEnabled: boolean;
  soundEnabled: boolean;
  categories: {
    user: boolean;
    content: boolean;
    system: boolean;
    security: boolean;
    analytics: boolean;
    workflow: boolean;
  };
  priority: {
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

// Theme and UI Types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
}

export interface AdminConfig {
  appName: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    realTimeAnalytics: boolean;
    contentCalendar: boolean;
    userManagement: boolean;
    workflowVisualization: boolean;
    performanceMonitoring: boolean;
    contentAnalytics: boolean;
    notificationCenter: boolean;
  };
  limits: {
    maxUploadSize: number;
    maxContentItems: number;
    maxUsers: number;
    maxWorkflows: number;
  };
}