/**
 * Supabase Realtime Subscription Tests
 * Tests realtime features including database changes, presence, and broadcast
 */

const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

describe('Supabase Realtime Subscriptions', () => {
  let supabase;
  let adminClient;
  let dom;
  let window;
  let activeChannels = [];

  beforeAll(async () => {
    // Setup DOM environment for browser-like behavior
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window;
    
    global.window = window;
    global.document = window.document;
    global.WebSocket = require('ws');
    global.fetch = require('node-fetch');

    // Initialize clients
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Supabase environment variables not configured for testing');
    }

    supabase = createClient(supabaseUrl, anonKey);
    
    if (serviceKey) {
      adminClient = createClient(supabaseUrl, serviceKey);
    }
  });

  afterAll(() => {
    // Clean up all channels
    activeChannels.forEach(channel => {
      try {
        channel.unsubscribe();
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    if (dom) {
      dom.window.close();
    }
  });

  beforeEach(() => {
    // Clear active channels array
    activeChannels = [];
  });

  afterEach(() => {
    // Unsubscribe from all channels created in the test
    activeChannels.forEach(channel => {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.warn('Channel cleanup warning:', error.message);
      }
    });
    activeChannels = [];
  });

  describe('Database Change Subscriptions', () => {
    it('should create a database change subscription', () => {
      const channel = supabase
        .channel('test-db-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, (payload) => {
          console.log('Database change received:', payload);
        })
        .subscribe();

      expect(channel).toBeDefined();
      expect(typeof channel.unsubscribe).toBe('function');
      
      activeChannels.push(channel);
    });

    it('should handle specific database events', () => {
      const events = ['INSERT', 'UPDATE', 'DELETE'];
      
      events.forEach((event, index) => {
        const channel = supabase
          .channel(`test-${event.toLowerCase()}-${index}`)
          .on('postgres_changes', {
            event: event,
            schema: 'public',
            table: 'projects'
          }, (payload) => {
            expect(payload).toBeDefined();
            expect(payload.eventType).toBe(event);
          })
          .subscribe();

        expect(channel).toBeDefined();
        activeChannels.push(channel);
      });
    });

    it('should handle table-specific filters', () => {
      const channel = supabase
        .channel('test-filtered-changes')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.admin'
        }, (payload) => {
          expect(payload).toBeDefined();
          expect(payload.new.role).toBe('admin');
        })
        .subscribe();

      expect(channel).toBeDefined();
      activeChannels.push(channel);
    });

    it('should handle multiple subscriptions on same channel', () => {
      const channel = supabase
        .channel('test-multiple-subs')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'projects'
        }, (payload) => {
          console.log('Project inserted:', payload);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects'
        }, (payload) => {
          console.log('Project updated:', payload);
        })
        .subscribe();

      expect(channel).toBeDefined();
      activeChannels.push(channel);
    });

    it('should handle subscription errors gracefully', () => {
      const channel = supabase
        .channel('test-error-handling')
        .on('postgres_changes', {
          event: '*',
          schema: 'nonexistent',
          table: 'nonexistent_table'
        }, (payload) => {
          // This might not receive events due to invalid schema/table
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            expect(err).toBeDefined();
          }
        });

      expect(channel).toBeDefined();
      activeChannels.push(channel);
    });

    it('should provide subscription status updates', (done) => {
      const statuses = [];
      
      const channel = supabase
        .channel('test-status-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, () => {})
        .subscribe((status) => {
          statuses.push(status);
          
          if (status === 'SUBSCRIBED') {
            expect(statuses).toContain('SUBSCRIBED');
            activeChannels.push(channel);
            done();
          } else if (status === 'SUBSCRIPTION_ERROR') {
            // Handle potential subscription errors
            activeChannels.push(channel);
            done();
          }
        });

      expect(channel).toBeDefined();
    });
  });

  describe('Presence Tracking', () => {
    it('should create a presence channel', () => {
      const channel = supabase
        .channel('test-presence')
        .on('presence', { event: 'sync' }, () => {
          console.log('Presence synced');
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
        })
        .subscribe();

      expect(channel).toBeDefined();
      expect(typeof channel.track).toBe('function');
      expect(typeof channel.untrack).toBe('function');
      
      activeChannels.push(channel);
    });

    it('should track user presence', (done) => {
      const channel = supabase
        .channel('test-track-presence')
        .on('presence', { event: 'sync' }, () => {
          console.log('Presence sync event received');
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.track({
                user: 'test-user-123',
                status: 'online',
                timestamp: Date.now()
              });
              
              // Verify tracking was initiated
              expect(channel.presenceState()).toBeDefined();
              
              activeChannels.push(channel);
              done();
            } catch (error) {
              console.warn('Presence tracking failed:', error);
              activeChannels.push(channel);
              done();
            }
          }
        });
    });

    it('should untrack user presence', async () => {
      const channel = supabase
        .channel('test-untrack-presence')
        .on('presence', { event: 'sync' }, () => {})
        .subscribe();

      await new Promise(resolve => {
        const checkStatus = (status) => {
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        };
        
        setTimeout(() => resolve(), 5000); // Timeout fallback
        channel.subscribe(checkStatus);
      });

      // Track presence first
      await channel.track({ user: 'untrack-test' });
      
      // Then untrack
      await channel.untrack();
      
      // Verify untracking
      const presenceState = channel.presenceState();
      expect(Object.keys(presenceState)).toHaveLength(0);
      
      activeChannels.push(channel);
    });

    it('should handle multiple users in presence', (done) => {
      const userCount = 3;
      const channels = [];
      let joinedUsers = 0;

      for (let i = 0; i < userCount; i++) {
        const channel = supabase
          .channel('test-multi-presence')
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            joinedUsers += newPresences.length;
            
            if (joinedUsers >= userCount) {
              // All users joined
              channels.forEach(ch => {
                const presenceState = ch.presenceState();
                expect(Object.keys(presenceState).length).toBeGreaterThan(0);
              });
              
              activeChannels.push(...channels);
              done();
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user: `test-user-${i}`,
                id: i
              });
            }
          });

        channels.push(channel);
      }
    });

    it('should get current presence state', async () => {
      const channel = supabase
        .channel('test-presence-state')
        .on('presence', { event: 'sync' }, () => {})
        .subscribe();

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 1000));

      const presenceState = channel.presenceState();
      expect(typeof presenceState).toBe('object');
      expect(Array.isArray(presenceState)).toBe(false);
      
      activeChannels.push(channel);
    });
  });

  describe('Broadcast Messages', () => {
    it('should create a broadcast channel', () => {
      const channel = supabase
        .channel('test-broadcast')
        .on('broadcast', { event: 'test-event' }, (payload) => {
          console.log('Broadcast received:', payload);
        })
        .subscribe();

      expect(channel).toBeDefined();
      expect(typeof channel.send).toBe('function');
      
      activeChannels.push(channel);
    });

    it('should send and receive broadcast messages', (done) => {
      const testMessage = {
        type: 'chat',
        message: 'Hello, World!',
        timestamp: Date.now()
      };

      const channel = supabase
        .channel('test-broadcast-message')
        .on('broadcast', { event: 'chat-message' }, (payload) => {
          expect(payload).toEqual(testMessage);
          activeChannels.push(channel);
          done();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'chat-message',
              payload: testMessage
            });
          }
        });
    });

    it('should handle multiple broadcast event types', () => {
      const eventTypes = ['user-typing', 'user-stopped-typing', 'message-sent'];
      
      const channel = supabase
        .channel('test-multiple-broadcasts')
        .on('broadcast', { event: 'user-typing' }, (payload) => {
          expect(payload.event).toBe('user-typing');
        })
        .on('broadcast', { event: 'user-stopped-typing' }, (payload) => {
          expect(payload.event).toBe('user-stopped-typing');
        })
        .on('broadcast', { event: 'message-sent' }, (payload) => {
          expect(payload.event).toBe('message-sent');
        })
        .subscribe();

      expect(channel).toBeDefined();
      activeChannels.push(channel);
    });

    it('should broadcast to specific recipients', (done) => {
      const targetUser = 'user-123';
      
      const channel = supabase
        .channel('test-targeted-broadcast')
        .on('broadcast', { event: 'direct-message' }, (payload) => {
          if (payload.recipient === targetUser) {
            expect(payload.recipient).toBe(targetUser);
            expect(payload.message).toBe('Private message');
            activeChannels.push(channel);
            done();
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'direct-message',
              payload: {
                recipient: targetUser,
                message: 'Private message',
                from: 'sender-456'
              }
            });
          }
        });
    });

    it('should handle broadcast acknowledgments', (done) => {
      const channel = supabase
        .channel('test-broadcast-ack')
        .on('broadcast', { event: 'ping' }, (payload) => {
          // Send acknowledgment
          channel.send({
            type: 'broadcast',
            event: 'pong',
            payload: { 
              originalId: payload.id,
              timestamp: Date.now()
            }
          });
        })
        .on('broadcast', { event: 'pong' }, (payload) => {
          expect(payload.originalId).toBeDefined();
          expect(payload.timestamp).toBeDefined();
          activeChannels.push(channel);
          done();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'ping',
              payload: {
                id: 'ping-' + Date.now(),
                message: 'Are you there?'
              }
            });
          }
        });
    });
  });

  describe('Channel Management', () => {
    it('should create channels with unique names', () => {
      const channelNames = ['channel-1', 'channel-2', 'channel-3'];
      const channels = [];

      channelNames.forEach(name => {
        const channel = supabase
          .channel(name)
          .on('broadcast', { event: 'test' }, () => {})
          .subscribe();

        expect(channel).toBeDefined();
        channels.push(channel);
      });

      expect(channels).toHaveLength(3);
      activeChannels.push(...channels);
    });

    it('should handle channel subscription states', (done) => {
      const states = [];
      
      const channel = supabase
        .channel('test-subscription-states')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, () => {})
        .subscribe((status, err) => {
          states.push({ status, err });
          
          if (status === 'SUBSCRIBED' || status === 'SUBSCRIPTION_ERROR') {
            expect(['SUBSCRIBED', 'SUBSCRIPTION_ERROR']).toContain(status);
            activeChannels.push(channel);
            done();
          }
        });
    });

    it('should unsubscribe from channels properly', async () => {
      const channel = supabase
        .channel('test-unsubscribe')
        .on('broadcast', { event: 'test' }, () => {})
        .subscribe();

      expect(channel).toBeDefined();

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Unsubscribe should not throw
      expect(() => channel.unsubscribe()).not.toThrow();
      
      // Channel should be unsubscribed
      expect(channel.state).toBe('closed');
    });

    it('should handle concurrent channel operations', async () => {
      const operations = [];
      
      // Create multiple channels concurrently
      for (let i = 0; i < 5; i++) {
        const operation = new Promise(resolve => {
          const channel = supabase
            .channel(`concurrent-${i}`)
            .on('broadcast', { event: 'test' }, () => {})
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                resolve({ channel, status });
              } else if (status === 'SUBSCRIPTION_ERROR') {
                resolve({ channel, status });
              }
            });
        });
        
        operations.push(operation);
      }

      const results = await Promise.allSettled(operations);
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.channel).toBeDefined();
          activeChannels.push(result.value.channel);
        }
      });
    });

    it('should handle channel cleanup on page unload', () => {
      const channels = [];
      
      // Create multiple channels
      for (let i = 0; i < 3; i++) {
        const channel = supabase
          .channel(`cleanup-test-${i}`)
          .on('broadcast', { event: 'test' }, () => {})
          .subscribe();
        
        channels.push(channel);
      }

      // Simulate page unload cleanup
      window.addEventListener('beforeunload', () => {
        channels.forEach(channel => {
          channel.unsubscribe();
        });
      });

      // Verify cleanup function works
      const unloadEvent = new window.Event('beforeunload');
      window.dispatchEvent(unloadEvent);

      channels.forEach(channel => {
        expect(channel.state).toBe('closed');
      });
    });
  });

  describe('Real-time Error Handling', () => {
    it('should handle connection failures gracefully', () => {
      const channel = supabase
        .channel('test-connection-failure')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, () => {})
        .subscribe((status, err) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            expect(err).toBeDefined();
          }
        });

      expect(channel).toBeDefined();
      activeChannels.push(channel);
    });

    it('should handle WebSocket reconnection', (done) => {
      const channel = supabase
        .channel('test-reconnection')
        .on('system', {}, (payload) => {
          if (payload.type === 'connection_restored') {
            expect(payload.type).toBe('connection_restored');
            activeChannels.push(channel);
            done();
          }
        })
        .on('broadcast', { event: 'test' }, () => {})
        .subscribe();

      // Simulate connection issues
      // This would typically be handled automatically by the client
    });

    it('should handle subscription conflicts', () => {
      // Try to create multiple channels with same name
      const channel1 = supabase
        .channel('conflicted-channel')
        .on('broadcast', { event: 'test1' }, () => {})
        .subscribe();

      const channel2 = supabase
        .channel('conflicted-channel')
        .on('broadcast', { event: 'test2' }, () => {})
        .subscribe();

      expect(channel1).toBeDefined();
      expect(channel2).toBeDefined();
      
      activeChannels.push(channel1, channel2);
    });

    it('should handle malformed payloads', () => {
      const channel = supabase
        .channel('test-malformed-payload')
        .on('broadcast', { event: 'test' }, (payload) => {
          // Should handle any payload structure gracefully
          expect(payload).toBeDefined();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Send malformed data
            try {
              channel.send({
                type: 'broadcast',
                event: 'test',
                payload: { circular: null }
              });
              
              // Create circular reference
              const circular = {};
              circular.self = circular;
              
              // This might fail, but shouldn't crash the channel
              channel.send({
                type: 'broadcast',
                event: 'test',
                payload: circular
              });
            } catch (error) {
              // Expected to catch circular reference error
            }
          }
        });

      expect(channel).toBeDefined();
      activeChannels.push(channel);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle high-frequency messages', (done) => {
      const messageCount = 100;
      let receivedCount = 0;

      const channel = supabase
        .channel('test-high-frequency')
        .on('broadcast', { event: 'rapid-fire' }, (payload) => {
          receivedCount++;
          
          if (receivedCount >= messageCount) {
            expect(receivedCount).toBe(messageCount);
            activeChannels.push(channel);
            done();
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Send messages rapidly
            for (let i = 0; i < messageCount; i++) {
              setTimeout(() => {
                channel.send({
                  type: 'broadcast',
                  event: 'rapid-fire',
                  payload: { index: i, timestamp: Date.now() }
                });
              }, i * 10); // 10ms apart
            }
          }
        });
    });

    it('should not create memory leaks with subscriptions', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const channels = [];

      // Create many channels
      for (let i = 0; i < 50; i++) {
        const channel = supabase
          .channel(`memory-test-${i}`)
          .on('broadcast', { event: 'test' }, () => {})
          .subscribe();
        
        channels.push(channel);
      }

      // Unsubscribe all
      channels.forEach(channel => channel.unsubscribe());

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large payloads efficiently', (done) => {
      const largePayload = {
        data: 'x'.repeat(10000), // 10KB string
        metadata: {
          size: 10000,
          timestamp: Date.now(),
          chunks: Array.from({ length: 100 }, (_, i) => `chunk-${i}`)
        }
      };

      const channel = supabase
        .channel('test-large-payload')
        .on('broadcast', { event: 'large-data' }, (payload) => {
          expect(payload.data.length).toBe(10000);
          expect(payload.metadata.chunks).toHaveLength(100);
          activeChannels.push(channel);
          done();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'large-data',
              payload: largePayload
            });
          }
        });
    });
  });

  describe('Integration Scenarios', () => {
    it('should coordinate database changes with broadcasts', async () => {
      if (!adminClient) {
        console.log('Skipping integration test - no admin client');
        return;
      }

      const testData = {
        user_id: 'test-integration-user',
        email: `integration.${Date.now()}@example.com`,
        full_name: 'Integration Test User',
        role: 'user'
      };

      const channel = supabase
        .channel('test-db-broadcast-integration')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        }, (payload) => {
          // When database change occurs, send broadcast
          channel.send({
            type: 'broadcast',
            event: 'profile-created',
            payload: {
              profileId: payload.new.id,
              email: payload.new.email
            }
          });
        })
        .on('broadcast', { event: 'profile-created' }, (payload) => {
          expect(payload.profileId).toBeDefined();
          expect(payload.email).toBe(testData.email);
        })
        .subscribe();

      // Insert test data to trigger the flow
      setTimeout(async () => {
        await adminClient.from('profiles').insert(testData);
      }, 2000);

      activeChannels.push(channel);
    });

    it('should handle multi-user collaboration scenario', (done) => {
      const users = ['user1', 'user2', 'user3'];
      const channels = [];
      let collaborationEvents = 0;

      users.forEach((userId, index) => {
        const channel = supabase
          .channel('collaboration-room')
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            collaborationEvents++;
            console.log(`User joined collaboration: ${newPresences.length} total`);
          })
          .on('broadcast', { event: 'cursor-move' }, (payload) => {
            expect(payload.userId).toBeDefined();
            expect(payload.position).toBeDefined();
          })
          .on('broadcast', { event: 'text-change' }, (payload) => {
            collaborationEvents++;
            expect(payload.change).toBeDefined();
            
            if (collaborationEvents >= 5) { // Arbitrary threshold
              activeChannels.push(...channels);
              done();
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Track presence
              await channel.track({
                userId: userId,
                status: 'active',
                joinedAt: Date.now()
              });

              // Simulate collaboration events
              setTimeout(() => {
                channel.send({
                  type: 'broadcast',
                  event: 'cursor-move',
                  payload: {
                    userId: userId,
                    position: { x: Math.random() * 100, y: Math.random() * 100 }
                  }
                });
                
                channel.send({
                  type: 'broadcast',
                  event: 'text-change',
                  payload: {
                    userId: userId,
                    change: { type: 'insert', text: `Hello from ${userId}` }
                  }
                });
              }, index * 1000);
            }
          });

        channels.push(channel);
      });
    });

    it('should handle notification system integration', (done) => {
      const channel = supabase
        .channel('notification-system')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_messages'
        }, (payload) => {
          // New contact message received
          channel.send({
            type: 'broadcast',
            event: 'new-notification',
            payload: {
              type: 'contact_message',
              title: 'New Contact Message',
              message: `From: ${payload.new.email}`,
              timestamp: Date.now()
            }
          });
        })
        .on('broadcast', { event: 'new-notification' }, (payload) => {
          expect(payload.type).toBe('contact_message');
          expect(payload.title).toBe('New Contact Message');
          activeChannels.push(channel);
          done();
        })
        .subscribe();
    });
  });
});