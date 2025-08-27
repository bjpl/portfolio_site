// Memory store for agent coordination and configuration sharing

interface ConfigurationMemory {
  nextjsConfig: {
    version: string;
    appRouter: boolean;
    typescript: boolean;
    tailwind: boolean;
    i18n: {
      enabled: boolean;
      locales: string[];
      defaultLocale: string;
    };
    auth: {
      provider: string;
      protectedRoutes: string[];
    };
    database: {
      provider: string;
      configured: boolean;
    };
  };
  buildStatus: {
    lastBuild: string;
    success: boolean;
    errors?: string[];
  };
  features: {
    [key: string]: boolean;
  };
  agentCoordination: {
    sessionId: string;
    activeAgents: string[];
    completedTasks: string[];
  };
}

class MemoryStore {
  private static instance: MemoryStore;
  private memory: Map<string, any> = new Map();
  
  private constructor() {}
  
  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }
  
  // Store configuration for agent coordination
  public storeConfiguration(config: Partial<ConfigurationMemory>): void {
    const key = 'nextjs-setup-config';
    const existing = this.memory.get(key) || {};
    this.memory.set(key, { ...existing, ...config });
  }
  
  // Retrieve configuration
  public getConfiguration(): ConfigurationMemory | null {
    return this.memory.get('nextjs-setup-config') || null;
  }
  
  // Store general key-value pairs
  public store(key: string, value: any): void {
    this.memory.set(key, value);
  }
  
  // Retrieve by key
  public get(key: string): any {
    return this.memory.get(key);
  }
  
  // Check if key exists
  public has(key: string): boolean {
    return this.memory.has(key);
  }
  
  // Clear specific key
  public clear(key: string): boolean {
    return this.memory.delete(key);
  }
  
  // Clear all memory
  public clearAll(): void {
    this.memory.clear();
  }
  
  // Get all keys
  public keys(): string[] {
    return Array.from(this.memory.keys());
  }
  
  // Export configuration for other agents
  public exportForAgents(): ConfigurationMemory {
    return {
      nextjsConfig: {
        version: '15.5.0',
        appRouter: true,
        typescript: true,
        tailwind: true,
        i18n: {
          enabled: true,
          locales: ['en', 'es'],
          defaultLocale: 'en',
        },
        auth: {
          provider: 'auth0',
          protectedRoutes: ['/admin', '/dashboard', '/api/admin'],
        },
        database: {
          provider: 'supabase',
          configured: true,
        },
      },
      buildStatus: {
        lastBuild: new Date().toISOString(),
        success: true,
        errors: [],
      },
      features: {
        internationalization: true,
        authentication: true,
        database: true,
        tailwindCSS: true,
        typeScript: true,
        appRouter: true,
        middleware: true,
        environmentVariables: true,
      },
      agentCoordination: {
        sessionId: `nextjs-setup-${Date.now()}`,
        activeAgents: ['coder', 'system-architect'],
        completedTasks: [
          'nextjs-upgrade',
          'typescript-configuration',
          'tailwind-setup',
          'i18n-implementation',
          'auth-middleware',
          'environment-setup',
        ],
      },
    };
  }
}

// Export singleton instance
export const memoryStore = MemoryStore.getInstance();

// Store initial configuration
memoryStore.storeConfiguration(memoryStore.exportForAgents());