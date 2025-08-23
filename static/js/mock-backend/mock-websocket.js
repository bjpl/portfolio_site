/**
 * Mock WebSocket Implementation
 * Simulates WebSocket functionality for real-time features in offline mode
 * Provides event broadcasting, room management, and real-time updates
 */

class MockWebSocket {
  static instance = null;
  static clients = new Map();
  static rooms = new Map();
  static messageHandlers = new Map();

  constructor() {
    this.isInitialized = false;
    this.eventQueue = [];
    this.reconnectInterval = null;
    this.heartbeatInterval = null;
  }

  static getInstance() {
    if (!MockWebSocket.instance) {
      MockWebSocket.instance = new MockWebSocket();
    }
    return MockWebSocket.instance;
  }

  static async initialize() {
    const instance = MockWebSocket.getInstance();
    if (!instance.isInitialized) {
      await instance.init();
    }
    return instance;
  }

  async init() {
    if (this.isInitialized) return;

    this.setupMessageHandlers();
    this.startHeartbeat();
    this.isInitialized = true;

    console.log('[MockWebSocket] WebSocket simulation initialized');
  }

  setupMessageHandlers() {
    // Register default message handlers
    this.registerHandler('ping', this.handlePing.bind(this));
    this.registerHandler('join-room', this.handleJoinRoom.bind(this));
    this.registerHandler('leave-room', this.handleLeaveRoom.bind(this));
    this.registerHandler('broadcast', this.handleBroadcast.bind(this));
    this.registerHandler('direct-message', this.handleDirectMessage.bind(this));
    this.registerHandler('content-update', this.handleContentUpdate.bind(this));
    this.registerHandler('user-activity', this.handleUserActivity.bind(this));
  }

  // Client management
  static createClient(clientId, options = {}) {
    const client = {
      id: clientId,
      connected: true,
      connectionTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      rooms: new Set(),
      metadata: options.metadata || {},
      messageQueue: [],
      readyState: 1 // WebSocket.OPEN equivalent
    };

    MockWebSocket.clients.set(clientId, client);
    
    console.log(`[MockWebSocket] Client created: ${clientId}`);
    
    // Simulate connection event
    setTimeout(() => {
      MockWebSocket.getInstance().simulateEvent(clientId, 'open', {
        clientId,
        timestamp: client.connectionTime
      });
    }, 10);

    return client;
  }

  static removeClient(clientId) {
    const client = MockWebSocket.clients.get(clientId);
    if (!client) return;

    // Leave all rooms
    client.rooms.forEach(roomId => {
      MockWebSocket.getInstance().leaveRoom(clientId, roomId);
    });

    // Mark as disconnected
    client.connected = false;
    client.readyState = 3; // WebSocket.CLOSED equivalent

    // Remove from clients map
    MockWebSocket.clients.delete(clientId);

    console.log(`[MockWebSocket] Client removed: ${clientId}`);

    // Simulate close event
    MockWebSocket.getInstance().simulateEvent(clientId, 'close', {
      clientId,
      timestamp: new Date().toISOString()
    });
  }

  static getClient(clientId) {
    return MockWebSocket.clients.get(clientId);
  }

  static getAllClients() {
    return Array.from(MockWebSocket.clients.values());
  }

  static getActiveClients() {
    return Array.from(MockWebSocket.clients.values()).filter(client => client.connected);
  }

  // Room management
  joinRoom(clientId, roomId) {
    const client = MockWebSocket.clients.get(clientId);
    if (!client || !client.connected) return false;

    // Create room if it doesn't exist
    if (!MockWebSocket.rooms.has(roomId)) {
      MockWebSocket.rooms.set(roomId, {
        id: roomId,
        clients: new Set(),
        createdAt: new Date().toISOString(),
        metadata: {}
      });
    }

    const room = MockWebSocket.rooms.get(roomId);
    
    // Add client to room
    client.rooms.add(roomId);
    room.clients.add(clientId);

    console.log(`[MockWebSocket] Client ${clientId} joined room ${roomId}`);

    // Notify other clients in room
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      clientId,
      roomId,
      timestamp: new Date().toISOString()
    }, clientId); // Exclude the joining client

    return true;
  }

  leaveRoom(clientId, roomId) {
    const client = MockWebSocket.clients.get(clientId);
    const room = MockWebSocket.rooms.get(roomId);

    if (!client || !room) return false;

    // Remove client from room
    client.rooms.delete(roomId);
    room.clients.delete(clientId);

    console.log(`[MockWebSocket] Client ${clientId} left room ${roomId}`);

    // Notify other clients in room
    this.broadcastToRoom(roomId, {
      type: 'user-left',
      clientId,
      roomId,
      timestamp: new Date().toISOString()
    }, clientId);

    // Remove room if empty
    if (room.clients.size === 0) {
      MockWebSocket.rooms.delete(roomId);
      console.log(`[MockWebSocket] Room ${roomId} removed (empty)`);
    }

    return true;
  }

  // Message handling
  sendMessage(clientId, message) {
    const client = MockWebSocket.clients.get(clientId);
    if (!client || !client.connected) {
      console.warn(`[MockWebSocket] Cannot send message to disconnected client: ${clientId}`);
      return false;
    }

    // Update last activity
    client.lastActivity = new Date().toISOString();

    // Process message
    try {
      const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
      this.processMessage(clientId, parsedMessage);
    } catch (error) {
      console.error('[MockWebSocket] Failed to process message:', error);
      this.sendError(clientId, 'Invalid message format');
    }

    return true;
  }

  processMessage(clientId, message) {
    const { type, ...payload } = message;

    if (!type) {
      this.sendError(clientId, 'Message type is required');
      return;
    }

    const handler = MockWebSocket.messageHandlers.get(type);
    if (handler) {
      try {
        handler(clientId, payload, message);
      } catch (error) {
        console.error(`[MockWebSocket] Handler error for ${type}:`, error);
        this.sendError(clientId, `Handler error: ${error.message}`);
      }
    } else {
      console.warn(`[MockWebSocket] No handler for message type: ${type}`);
      this.sendError(clientId, `Unknown message type: ${type}`);
    }
  }

  // Broadcasting
  broadcastToAll(message, excludeClientId = null) {
    const clients = MockWebSocket.getActiveClients();
    let sentCount = 0;

    clients.forEach(client => {
      if (client.id !== excludeClientId) {
        if (this.deliverMessage(client.id, message)) {
          sentCount++;
        }
      }
    });

    console.log(`[MockWebSocket] Broadcast to ${sentCount} clients`);
    return sentCount;
  }

  broadcastToRoom(roomId, message, excludeClientId = null) {
    const room = MockWebSocket.rooms.get(roomId);
    if (!room) return 0;

    let sentCount = 0;

    room.clients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        if (this.deliverMessage(clientId, message)) {
          sentCount++;
        }
      }
    });

    console.log(`[MockWebSocket] Broadcast to room ${roomId}: ${sentCount} clients`);
    return sentCount;
  }

  deliverMessage(clientId, message) {
    const client = MockWebSocket.clients.get(clientId);
    if (!client || !client.connected) return false;

    // Simulate network delay
    setTimeout(() => {
      this.simulateEvent(clientId, 'message', {
        data: JSON.stringify(message),
        timestamp: new Date().toISOString()
      });
    }, Math.random() * 50 + 10); // 10-60ms delay

    return true;
  }

  sendError(clientId, errorMessage) {
    this.deliverMessage(clientId, {
      type: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  // Message handlers
  handlePing(clientId, payload) {
    this.deliverMessage(clientId, {
      type: 'pong',
      timestamp: new Date().toISOString(),
      ...payload
    });
  }

  handleJoinRoom(clientId, payload) {
    const { roomId, metadata = {} } = payload;
    
    if (!roomId) {
      this.sendError(clientId, 'Room ID is required');
      return;
    }

    const success = this.joinRoom(clientId, roomId);
    
    this.deliverMessage(clientId, {
      type: 'room-joined',
      roomId,
      success,
      timestamp: new Date().toISOString()
    });
  }

  handleLeaveRoom(clientId, payload) {
    const { roomId } = payload;
    
    if (!roomId) {
      this.sendError(clientId, 'Room ID is required');
      return;
    }

    const success = this.leaveRoom(clientId, roomId);
    
    this.deliverMessage(clientId, {
      type: 'room-left',
      roomId,
      success,
      timestamp: new Date().toISOString()
    });
  }

  handleBroadcast(clientId, payload) {
    const { message, roomId } = payload;
    
    const broadcastMessage = {
      type: 'broadcast-message',
      from: clientId,
      message,
      timestamp: new Date().toISOString()
    };

    if (roomId) {
      this.broadcastToRoom(roomId, broadcastMessage, clientId);
    } else {
      this.broadcastToAll(broadcastMessage, clientId);
    }
  }

  handleDirectMessage(clientId, payload) {
    const { targetClientId, message } = payload;
    
    if (!targetClientId) {
      this.sendError(clientId, 'Target client ID is required');
      return;
    }

    const success = this.deliverMessage(targetClientId, {
      type: 'direct-message',
      from: clientId,
      message,
      timestamp: new Date().toISOString()
    });

    // Confirm delivery to sender
    this.deliverMessage(clientId, {
      type: 'message-delivered',
      targetClientId,
      success,
      timestamp: new Date().toISOString()
    });
  }

  handleContentUpdate(clientId, payload) {
    const { contentId, action, data } = payload;
    
    // Broadcast content update to all clients
    this.broadcastToAll({
      type: 'content-updated',
      contentId,
      action,
      data,
      updatedBy: clientId,
      timestamp: new Date().toISOString()
    }, clientId);
  }

  handleUserActivity(clientId, payload) {
    const { activity, metadata = {} } = payload;
    
    const client = MockWebSocket.clients.get(clientId);
    if (client) {
      client.lastActivity = new Date().toISOString();
      
      // Broadcast user activity to relevant rooms
      client.rooms.forEach(roomId => {
        this.broadcastToRoom(roomId, {
          type: 'user-activity',
          clientId,
          activity,
          metadata,
          timestamp: new Date().toISOString()
        }, clientId);
      });
    }
  }

  // Event simulation
  simulateEvent(clientId, eventType, data) {
    // Simulate WebSocket events for the client
    if (typeof self !== 'undefined' && self.clients) {
      // In service worker context
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'mock-websocket-event',
            clientId,
            eventType,
            data
          });
        });
      });
    } else {
      // In main thread context
      window.dispatchEvent(new CustomEvent('mock-websocket-event', {
        detail: { clientId, eventType, data }
      }));
    }
  }

  // Utility methods
  registerHandler(messageType, handler) {
    MockWebSocket.messageHandlers.set(messageType, handler);
    console.log(`[MockWebSocket] Registered handler for: ${messageType}`);
  }

  unregisterHandler(messageType) {
    const removed = MockWebSocket.messageHandlers.delete(messageType);
    if (removed) {
      console.log(`[MockWebSocket] Unregistered handler for: ${messageType}`);
    }
  }

  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, 30000); // 30 seconds
  }

  performHeartbeat() {
    const now = new Date();
    const timeout = 60000; // 1 minute timeout

    // Check for inactive clients
    MockWebSocket.clients.forEach((client, clientId) => {
      const lastActivity = new Date(client.lastActivity);
      const timeDiff = now - lastActivity;

      if (timeDiff > timeout) {
        console.log(`[MockWebSocket] Client ${clientId} timed out`);
        MockWebSocket.removeClient(clientId);
      }
    });

    // Send ping to active clients
    MockWebSocket.getActiveClients().forEach(client => {
      this.deliverMessage(client.id, {
        type: 'ping',
        timestamp: now.toISOString()
      });
    });
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Statistics and monitoring
  getStats() {
    const activeClients = MockWebSocket.getActiveClients();
    const totalRooms = MockWebSocket.rooms.size;
    const roomStats = Array.from(MockWebSocket.rooms.entries()).map(([roomId, room]) => ({
      id: roomId,
      clientCount: room.clients.size,
      createdAt: room.createdAt
    }));

    return {
      connectedClients: activeClients.length,
      totalClients: MockWebSocket.clients.size,
      totalRooms,
      roomStats,
      uptime: this.isInitialized ? Date.now() - this.initTime : 0,
      messageHandlers: Array.from(MockWebSocket.messageHandlers.keys())
    };
  }

  // Cleanup
  cleanup() {
    this.stopHeartbeat();
    
    // Disconnect all clients
    MockWebSocket.clients.forEach((client, clientId) => {
      MockWebSocket.removeClient(clientId);
    });

    // Clear rooms
    MockWebSocket.rooms.clear();
    MockWebSocket.messageHandlers.clear();

    this.isInitialized = false;
    console.log('[MockWebSocket] Cleanup completed');
  }
}

// Export for use in service worker
if (typeof self !== 'undefined') {
  self.MockWebSocket = MockWebSocket;
}