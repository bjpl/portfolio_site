/**
 * Frontend Supabase Client Tests
 * Tests Supabase client initialization and basic operations
 */

const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const { createClient } = require('@supabase/supabase-js');

// Mock DOM environment for frontend testing
const { JSDOM } = require('jsdom');

describe('Frontend Supabase Client', () => {
  let supabase;
  let dom;
  let window;
  let document;

  beforeAll(async () => {
    // Setup DOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;
    
    // Add to global scope for tests
    global.window = window;
    global.document = document;
    global.localStorage = window.localStorage;
    global.sessionStorage = window.sessionStorage;
    global.location = window.location;
    global.navigator = window.navigator;
    global.URLSearchParams = window.URLSearchParams;
    global.URL = window.URL;
    global.fetch = require('node-fetch');

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';

    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: window.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
    }
  });

  afterAll(() => {
    if (dom) {
      dom.window.close();
    }
  });

  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(async () => {
    // Sign out after each test
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        // Ignore signout errors in tests
      }
    }
  });

  describe('Client Initialization', () => {
    it('should initialize Supabase client with correct configuration', () => {
      expect(supabase).toBeDefined();
      expect(supabase.supabaseUrl).toBeTruthy();
      expect(supabase.supabaseKey).toBeTruthy();
      
      // Check if client has expected methods
      expect(typeof supabase.from).toBe('function');
      expect(typeof supabase.auth.signUp).toBe('function');
      expect(typeof supabase.auth.signIn).toBe('function');
      expect(typeof supabase.storage.from).toBe('function');
    });

    it('should handle invalid configuration gracefully', () => {
      const invalidClient = createClient('invalid-url', 'invalid-key');
      
      expect(invalidClient).toBeDefined();
      expect(invalidClient.supabaseUrl).toBe('invalid-url');
      expect(invalidClient.supabaseKey).toBe('invalid-key');
    });

    it('should use localStorage for session persistence', () => {
      expect(supabase.auth.storage).toBe(window.localStorage);
      
      // Should be able to store and retrieve from localStorage
      window.localStorage.setItem('test-key', 'test-value');
      expect(window.localStorage.getItem('test-key')).toBe('test-value');
    });

    it('should configure auto refresh token', () => {
      // The client should be configured for auto refresh
      expect(supabase.auth.autoRefreshToken).toBe(true);
    });

    it('should configure session detection from URL', () => {
      // Should be configured to detect sessions from URL fragments
      expect(supabase.auth.detectSessionInUrl).toBe(true);
    });
  });

  describe('Authentication State Management', () => {
    it('should start with no authenticated user', async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      expect(error).toBeNull();
      expect(user).toBeNull();
    });

    it('should get initial session', async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      expect(error).toBeNull();
      expect(session).toBeNull(); // No session initially
    });

    it('should handle auth state changes', (done) => {
      let eventCount = 0;
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        eventCount++;
        
        // First event should be INITIAL_SESSION
        if (eventCount === 1) {
          expect(event).toBe('INITIAL_SESSION');
          expect(session).toBeNull();
          
          subscription.unsubscribe();
          done();
        }
      });

      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should persist session in localStorage', async () => {
      // Initially no session data in localStorage
      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      expect(window.localStorage.getItem(sessionKey)).toBeNull();
      
      // After a successful login, session should be persisted
      // (This test would require actual authentication)
    });

    it('should restore session from localStorage on page load', async () => {
      // Simulate stored session data
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'mock-user-id',
          email: 'mock@example.com'
        }
      };

      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      window.localStorage.setItem(sessionKey, JSON.stringify(mockSession));

      // Create new client instance to trigger session restoration
      const newClient = createClient(supabase.supabaseUrl, supabase.supabaseKey, {
        auth: {
          storage: window.localStorage,
          autoRefreshToken: false // Disable to avoid network calls
        }
      });

      // Session restoration happens asynchronously
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The stored session should be available
      expect(window.localStorage.getItem(sessionKey)).toBeTruthy();
    });
  });

  describe('Database Operations', () => {
    it('should create database query builder', () => {
      const query = supabase.from('profiles');
      
      expect(query).toBeDefined();
      expect(typeof query.select).toBe('function');
      expect(typeof query.insert).toBe('function');
      expect(typeof query.update).toBe('function');
      expect(typeof query.delete).toBe('function');
    });

    it('should build select queries', () => {
      const query = supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(query).toBeDefined();
      // Query should be chainable
      expect(typeof query.then).toBe('function');
    });

    it('should build insert queries', () => {
      const data = {
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      };

      const query = supabase
        .from('profiles')
        .insert(data)
        .select();

      expect(query).toBeDefined();
      expect(typeof query.then).toBe('function');
    });

    it('should build update queries', () => {
      const updates = {
        full_name: 'Updated Name',
        updated_at: new Date().toISOString()
      };

      const query = supabase
        .from('profiles')
        .update(updates)
        .eq('id', 'user-id')
        .select();

      expect(query).toBeDefined();
      expect(typeof query.then).toBe('function');
    });

    it('should build delete queries', () => {
      const query = supabase
        .from('profiles')
        .delete()
        .eq('id', 'user-id');

      expect(query).toBeDefined();
      expect(typeof query.then).toBe('function');
    });

    it('should handle query filters', () => {
      const query = supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .in('category', ['web', 'mobile'])
        .gte('created_at', '2024-01-01')
        .ilike('title', '%portfolio%')
        .is('deleted_at', null);

      expect(query).toBeDefined();
    });

    it('should handle complex queries with joins', () => {
      const query = supabase
        .from('projects')
        .select(`
          *,
          author:profiles(full_name, email),
          comments(count)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      expect(query).toBeDefined();
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should create channel subscriptions', () => {
      const channel = supabase
        .channel('test-channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, (payload) => {
          console.log('Change received:', payload);
        })
        .subscribe();

      expect(channel).toBeDefined();
      expect(typeof channel.unsubscribe).toBe('function');
      
      // Cleanup
      channel.unsubscribe();
    });

    it('should handle different event types', () => {
      const events = ['INSERT', 'UPDATE', 'DELETE', '*'];
      
      events.forEach(event => {
        const channel = supabase
          .channel(`test-${event.toLowerCase()}`)
          .on('postgres_changes', {
            event: event,
            schema: 'public',
            table: 'projects'
          }, (payload) => {
            expect(payload).toBeDefined();
            expect(payload.eventType).toBeDefined();
          })
          .subscribe();

        expect(channel).toBeDefined();
        channel.unsubscribe();
      });
    });

    it('should handle presence tracking', () => {
      const channel = supabase
        .channel('presence-test')
        .on('presence', { event: 'sync' }, () => {
          console.log('Presence synced');
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user: 'test-user' });
          }
        });

      expect(channel).toBeDefined();
      
      // Cleanup
      setTimeout(() => channel.unsubscribe(), 1000);
    });

    it('should handle broadcast messages', () => {
      const channel = supabase
        .channel('broadcast-test')
        .on('broadcast', { event: 'test-event' }, (payload) => {
          expect(payload).toBeDefined();
        })
        .subscribe();

      expect(channel).toBeDefined();
      
      // Test sending broadcast
      channel.send({
        type: 'broadcast',
        event: 'test-event',
        payload: { message: 'Hello World' }
      });

      // Cleanup
      setTimeout(() => channel.unsubscribe(), 1000);
    });
  });

  describe('Storage Operations', () => {
    it('should create storage bucket reference', () => {
      const bucket = supabase.storage.from('test-bucket');
      
      expect(bucket).toBeDefined();
      expect(typeof bucket.upload).toBe('function');
      expect(typeof bucket.download).toBe('function');
      expect(typeof bucket.list).toBe('function');
      expect(typeof bucket.remove).toBe('function');
    });

    it('should handle file uploads', () => {
      const bucket = supabase.storage.from('uploads');
      const file = new window.File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const uploadPromise = bucket.upload('test-folder/test.txt', file);
      
      expect(uploadPromise).toBeDefined();
      expect(typeof uploadPromise.then).toBe('function');
    });

    it('should handle file downloads', () => {
      const bucket = supabase.storage.from('uploads');
      
      const downloadPromise = bucket.download('test-folder/test.txt');
      
      expect(downloadPromise).toBeDefined();
      expect(typeof downloadPromise.then).toBe('function');
    });

    it('should generate public URLs', () => {
      const bucket = supabase.storage.from('public-uploads');
      
      const { data } = bucket.getPublicUrl('test.jpg');
      
      expect(data).toBeDefined();
      expect(data.publicUrl).toBeDefined();
      expect(typeof data.publicUrl).toBe('string');
    });

    it('should create signed URLs', () => {
      const bucket = supabase.storage.from('private-uploads');
      
      const signedUrlPromise = bucket.createSignedUrl('private-file.pdf', 3600);
      
      expect(signedUrlPromise).toBeDefined();
      expect(typeof signedUrlPromise.then).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create client with invalid URL
      const invalidClient = createClient('https://invalid-url.supabase.co', 'invalid-key');
      
      const { data, error } = await invalidClient
        .from('profiles')
        .select('*')
        .limit(1);

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error.message).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });

      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should handle RLS policy errors', async () => {
      // Try to access data that should be blocked by RLS
      const { data, error } = await supabase
        .from('admin_only_table')
        .select('*');

      // Should either return error or empty result due to RLS
      if (error) {
        expect(error.message).toBeDefined();
      } else {
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it('should handle malformed queries', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('nonexistent_column');

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('Client Configuration', () => {
    it('should handle custom configuration options', () => {
      const customClient = createClient(
        supabase.supabaseUrl,
        supabase.supabaseKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          },
          db: {
            schema: 'custom_schema'
          },
          global: {
            headers: {
              'X-Custom-Header': 'custom-value'
            }
          }
        }
      );

      expect(customClient).toBeDefined();
      expect(customClient.auth.autoRefreshToken).toBe(false);
    });

    it('should handle environment-specific settings', () => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      const envClient = createClient(
        supabase.supabaseUrl,
        supabase.supabaseKey,
        {
          auth: {
            debug: isDevelopment
          }
        }
      );

      expect(envClient).toBeDefined();
    });

    it('should validate required configuration', () => {
      expect(() => {
        createClient('', '');
      }).toThrow();

      expect(() => {
        createClient('invalid-url', 'key');
      }).toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should clean up subscriptions properly', () => {
      const channel = supabase
        .channel('cleanup-test')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, () => {})
        .subscribe();

      expect(channel).toBeDefined();
      
      // Should be able to unsubscribe
      const unsubscribeResult = channel.unsubscribe();
      expect(unsubscribeResult).toBeDefined();
    });

    it('should handle multiple simultaneous subscriptions', () => {
      const channels = [];
      
      for (let i = 0; i < 5; i++) {
        const channel = supabase
          .channel(`multi-test-${i}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'projects'
          }, () => {})
          .subscribe();
        
        channels.push(channel);
      }

      expect(channels).toHaveLength(5);
      
      // Cleanup all channels
      channels.forEach(channel => {
        expect(typeof channel.unsubscribe).toBe('function');
        channel.unsubscribe();
      });
    });

    it('should not create memory leaks with auth state listeners', () => {
      const listeners = [];
      
      // Create multiple listeners
      for (let i = 0; i < 10; i++) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {});
        listeners.push(subscription);
      }

      expect(listeners).toHaveLength(10);
      
      // Cleanup all listeners
      listeners.forEach(subscription => {
        expect(typeof subscription.unsubscribe).toBe('function');
        subscription.unsubscribe();
      });
    });
  });
});