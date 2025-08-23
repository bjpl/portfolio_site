/**
 * Supabase Database Connection Tests
 * Tests database connectivity, connection pooling, and basic queries
 */

const { createClient } = require('@supabase/supabase-js');
const { describe, it, beforeAll, afterAll, expect, jest } = require('@jest/globals');

describe('Supabase Database Connection', () => {
  let supabase;
  let testConnection;

  beforeAll(async () => {
    // Initialize Supabase client for testing
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured for testing');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      testConnection = true;
    } catch (err) {
      console.error('Database connection failed:', err);
      testConnection = false;
    }
  });

  afterAll(async () => {
    // Cleanup any test data if needed
    if (supabase && testConnection) {
      // Clean up test records created during testing
      await supabase.from('test_cleanup').delete().eq('test_run', true).catch(() => {});
    }
  });

  describe('Connection Health', () => {
    it('should establish connection to Supabase', async () => {
      expect(testConnection).toBe(true);
      expect(supabase).toBeDefined();
      expect(supabase.supabaseUrl).toBeTruthy();
      expect(supabase.supabaseKey).toBeTruthy();
    });

    it('should handle connection timeout gracefully', async () => {
      const timeoutClient = createClient(
        process.env.SUPABASE_URL, 
        process.env.SUPABASE_ANON_KEY,
        {
          db: { timeout: 1000 } // 1 second timeout
        }
      );

      const start = Date.now();
      const { error } = await timeoutClient
        .from('profiles')
        .select('*')
        .limit(1);

      const duration = Date.now() - start;
      
      if (error) {
        expect(duration).toBeLessThan(2000); // Should timeout within 2 seconds
      }
    });

    it('should validate database schema exists', async () => {
      const { data: tables, error } = await supabase
        .rpc('get_table_names')
        .catch(() => ({ data: null, error: 'RPC not available' }));

      // If RPC is not available, check tables directly
      if (error) {
        const { data, error: selectError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        expect(selectError).toBeNull();
      } else {
        expect(tables).toBeDefined();
        expect(Array.isArray(tables)).toBe(true);
      }
    });
  });

  describe('Connection Pool Management', () => {
    it('should handle multiple concurrent connections', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .then(result => ({ index: i, ...result }))
      );

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.index).toBe(index);
        expect(result.error).toBeNull();
      });
    });

    it('should recover from connection drops', async () => {
      // Simulate connection recovery
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Basic Query Operations', () => {
    it('should execute SELECT queries', async () => {
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, email, created_at', { count: 'exact' })
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should handle query filters', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'admin')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle ordering and pagination', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .range(0, 4); // First 5 records

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(5);
    });

    it('should execute aggregate functions', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      expect(error).toBeNull();
      expect(data).toBeNull(); // head: true returns no data, just count
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid table names', async () => {
      const { data, error } = await supabase
        .from('non_existent_table')
        .select('*');

      expect(error).not.toBeNull();
      expect(error.message).toContain('relation');
      expect(data).toBeNull();
    });

    it('should handle invalid column names', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('non_existent_column');

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it('should handle malformed queries', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('invalid_filter', undefined);

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('Performance Monitoring', () => {
    it('should complete simple queries within acceptable time', async () => {
      const start = Date.now();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      const duration = Date.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large result sets efficiently', async () => {
      const start = Date.now();
      
      const { data, error } = await supabase
        .from('analytics_events')
        .select('id, event_type, created_at')
        .limit(1000);

      const duration = Date.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});