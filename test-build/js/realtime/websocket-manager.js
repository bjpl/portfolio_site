/**
 * WebSocket Connection Manager
 * Manages WebSocket connections, reconnection logic, and channel subscriptions
 */

class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.channels = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.isOnline = navigator.onLine;
    this.heartbeatInterval = 30000; // 30 seconds
    this.heartbeatTimers = new Map();
    
    this.setupEventListeners();
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Network status changes
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleNetworkReconnect();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleNetworkDisconnect();
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handlePageVisible();
      } else {
        this.handlePageHidden();
      }
    });

    // Before page unload
    window.addEventListener('beforeunload', () => {
      this.cleanupConnections();
    });
  }

  /**
   * Create a new WebSocket connection
   */
  createConnection(url, protocols = [], options = {}) {
    const connectionId = this.generateConnectionId();
    
    try {
      const ws = new WebSocket(url, protocols);
      
      const connection = {
        id: connectionId,
        ws,
        url,
        protocols,
        options,
        status: 'connecting',
        lastActivity: Date.now(),
        reconnectAttempts: 0,
        channels: new Set()
      };

      this.setupConnectionHandlers(connection);
      this.connections.set(connectionId, connection);
      
      console.log(`WebSocket connection created: ${connectionId}`);
      return connectionId;
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      throw error;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupConnectionHandlers(connection) {
    const { ws, id } = connection;

    ws.onopen = (event) => {
      console.log(`WebSocket connected: ${id}`);
      connection.status = 'connected';
      connection.reconnectAttempts = 0;
      
      this.startHeartbeat(id);
      this.dispatchConnectionEvent('open', id, event);
      
      // Resubscribe to channels after reconnection
      this.resubscribeChannels(id);
    };

    ws.onmessage = (event) => {
      connection.lastActivity = Date.now();
      this.handleMessage(id, event);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed: ${id}`, event.code, event.reason);
      connection.status = 'closed';
      
      this.stopHeartbeat(id);
      this.dispatchConnectionEvent('close', id, event);
      
      // Attempt reconnection if not a clean close
      if (event.code !== 1000 && this.isOnline) {
        this.scheduleReconnect(id);
      }
    };

    ws.onerror = (event) => {
      console.error(`WebSocket error: ${id}`, event);
      connection.status = 'error';
      
      this.dispatchConnectionEvent('error', id, event);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(connectionId, event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle different message types
      switch (data.type) {
        case 'heartbeat':
          this.handleHeartbeat(connectionId, data);
          break;
        case 'channel_message':
          this.handleChannelMessage(connectionId, data);
          break;
        case 'system_message':
          this.handleSystemMessage(connectionId, data);
          break;
        default:
          this.dispatchConnectionEvent('message', connectionId, { data, raw: event.data });
      }
      
    } catch (error) {
      // Handle non-JSON messages
      this.dispatchConnectionEvent('message', connectionId, { raw: event.data });
    }
  }

  /**
   * Handle heartbeat messages
   */
  handleHeartbeat(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastActivity = Date.now();
    
    // Respond to heartbeat if required
    if (data.requireResponse) {
      this.sendMessage(connectionId, {
        type: 'heartbeat_response',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle channel-specific messages
   */
  handleChannelMessage(connectionId, data) {
    const { channel, payload } = data;
    
    if (this.channels.has(channel)) {
      const channelInfo = this.channels.get(channel);
      channelInfo.lastMessage = Date.now();
      
      // Dispatch to channel listeners
      this.dispatchChannelEvent(channel, 'message', payload);
    }
  }

  /**
   * Handle system messages
   */
  handleSystemMessage(connectionId, data) {
    console.log(`System message for ${connectionId}:`, data);
    
    switch (data.action) {
      case 'channel_subscribed':
        this.handleChannelSubscribed(data.channel);
        break;
      case 'channel_unsubscribed':
        this.handleChannelUnsubscribed(data.channel);
        break;
      case 'connection_limit':
        this.handleConnectionLimit(connectionId, data);
        break;
    }
  }

  /**
   * Send message through WebSocket connection
   */
  sendMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    
    if (!connection || connection.status !== 'connected') {
      console.warn(`Cannot send message: connection ${connectionId} not ready`);
      return false;
    }

    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      connection.ws.send(messageString);
      connection.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error(`Failed to send message on ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribeToChannel(connectionId, channelName, options = {}) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Add channel to connection
    connection.channels.add(channelName);

    // Store channel info
    const channelInfo = {
      name: channelName,
      connectionId,
      options,
      status: 'subscribing',
      subscribed: Date.now(),
      lastMessage: null,
      listeners: new Set()
    };

    this.channels.set(channelName, channelInfo);

    // Send subscription message
    const subscribeMessage = {
      type: 'subscribe',
      channel: channelName,
      ...options
    };

    this.sendMessage(connectionId, subscribeMessage);
    
    console.log(`Subscribed to channel: ${channelName}`);
    return channelName;
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelName) {
    const channelInfo = this.channels.get(channelName);
    
    if (!channelInfo) {
      console.warn(`Channel ${channelName} not found`);
      return;
    }

    const { connectionId } = channelInfo;
    const connection = this.connections.get(connectionId);

    if (connection) {
      // Send unsubscribe message
      this.sendMessage(connectionId, {
        type: 'unsubscribe',
        channel: channelName
      });

      // Remove from connection
      connection.channels.delete(channelName);
    }

    // Remove channel info
    this.channels.delete(channelName);
    
    console.log(`Unsubscribed from channel: ${channelName}`);
  }

  /**
   * Add event listener for channel
   */
  addChannelListener(channelName, eventType, callback) {
    const channelInfo = this.channels.get(channelName);
    
    if (!channelInfo) {
      console.warn(`Channel ${channelName} not found`);
      return;
    }

    const listener = { eventType, callback };
    channelInfo.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      channelInfo.listeners.delete(listener);
    };
  }

  /**
   * Start heartbeat for connection
   */
  startHeartbeat(connectionId) {
    this.stopHeartbeat(connectionId); // Clear existing timer

    const timer = setInterval(() => {
      const connection = this.connections.get(connectionId);
      
      if (!connection || connection.status !== 'connected') {
        this.stopHeartbeat(connectionId);
        return;
      }

      // Check if connection is stale
      const timeSinceActivity = Date.now() - connection.lastActivity;
      if (timeSinceActivity > this.heartbeatInterval * 2) {
        console.warn(`Connection ${connectionId} appears stale, reconnecting...`);
        this.reconnectConnection(connectionId);
        return;
      }

      // Send heartbeat
      this.sendMessage(connectionId, {
        type: 'heartbeat',
        timestamp: Date.now()
      });

    }, this.heartbeatInterval);

    this.heartbeatTimers.set(connectionId, timer);
  }

  /**
   * Stop heartbeat for connection
   */
  stopHeartbeat(connectionId) {
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionId);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (!connection || connection.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${connectionId}`);
      this.dispatchConnectionEvent('max_reconnect_attempts', connectionId);
      return;
    }

    connection.reconnectAttempts++;
    
    const delay = this.calculateReconnectDelay(connection.reconnectAttempts);
    
    console.log(`Scheduling reconnect for ${connectionId} in ${delay}ms (attempt ${connection.reconnectAttempts})`);

    setTimeout(() => {
      if (this.isOnline) {
        this.reconnectConnection(connectionId);
      }
    }, delay);
  }

  /**
   * Calculate reconnection delay with exponential backoff
   */
  calculateReconnectDelay(attempt) {
    return Math.min(this.reconnectInterval * Math.pow(2, attempt - 1), 30000);
  }

  /**
   * Reconnect a specific connection
   */
  reconnectConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) return;

    console.log(`Reconnecting ${connectionId}...`);

    // Close existing connection
    if (connection.ws) {
      connection.ws.close();
    }

    // Create new WebSocket
    try {
      const newWs = new WebSocket(connection.url, connection.protocols);
      connection.ws = newWs;
      connection.status = 'connecting';
      
      this.setupConnectionHandlers(connection);
      
    } catch (error) {
      console.error(`Failed to reconnect ${connectionId}:`, error);
      this.scheduleReconnect(connectionId);
    }
  }

  /**
   * Resubscribe to channels after reconnection
   */
  resubscribeChannels(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) return;

    connection.channels.forEach(channelName => {
      const channelInfo = this.channels.get(channelName);
      if (channelInfo) {
        // Resubscribe
        this.sendMessage(connectionId, {
          type: 'subscribe',
          channel: channelName,
          ...channelInfo.options
        });
      }
    });
  }

  /**
   * Handle network reconnection
   */
  handleNetworkReconnect() {
    console.log('Network reconnected, checking connections...');
    
    this.connections.forEach((connection, id) => {
      if (connection.status === 'closed' || connection.status === 'error') {
        this.reconnectConnection(id);
      }
    });
  }

  /**
   * Handle network disconnection
   */
  handleNetworkDisconnect() {
    console.log('Network disconnected');
    
    // Stop all heartbeats
    this.heartbeatTimers.forEach((timer, connectionId) => {
      this.stopHeartbeat(connectionId);
    });
  }

  /**
   * Handle page becoming visible
   */
  handlePageVisible() {
    console.log('Page visible, checking connection status...');
    
    this.connections.forEach((connection, id) => {
      if (connection.status === 'connected') {
        // Restart heartbeat
        this.startHeartbeat(id);
      } else {
        // Try to reconnect
        this.reconnectConnection(id);
      }
    });
  }

  /**
   * Handle page becoming hidden
   */
  handlePageHidden() {
    console.log('Page hidden, reducing activity...');
    
    // Stop heartbeats to save resources
    this.heartbeatTimers.forEach((timer, connectionId) => {
      this.stopHeartbeat(connectionId);
    });
  }

  /**
   * Handle channel subscribed event
   */
  handleChannelSubscribed(channelName) {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      channelInfo.status = 'subscribed';
      this.dispatchChannelEvent(channelName, 'subscribed');
    }
  }

  /**
   * Handle channel unsubscribed event
   */
  handleChannelUnsubscribed(channelName) {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      channelInfo.status = 'unsubscribed';
      this.dispatchChannelEvent(channelName, 'unsubscribed');
    }
  }

  /**
   * Handle connection limit reached
   */
  handleConnectionLimit(connectionId, data) {
    console.warn(`Connection limit reached for ${connectionId}:`, data);
    
    // Close oldest connection if needed
    if (data.closeOldest) {
      this.closeOldestConnection();
    }
  }

  /**
   * Close oldest connection
   */
  closeOldestConnection() {
    let oldestConnection = null;
    let oldestTime = Date.now();

    this.connections.forEach((connection, id) => {
      if (connection.lastActivity < oldestTime) {
        oldestTime = connection.lastActivity;
        oldestConnection = id;
      }
    });

    if (oldestConnection) {
      console.log(`Closing oldest connection: ${oldestConnection}`);
      this.closeConnection(oldestConnection);
    }
  }

  /**
   * Close a specific connection
   */
  closeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) return;

    // Unsubscribe from all channels
    connection.channels.forEach(channelName => {
      this.unsubscribeFromChannel(channelName);
    });

    // Stop heartbeat
    this.stopHeartbeat(connectionId);

    // Close WebSocket
    if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close(1000, 'Connection closed by manager');
    }

    // Remove from connections
    this.connections.delete(connectionId);
    
    console.log(`Connection closed: ${connectionId}`);
  }

  /**
   * Update channel status
   */
  updateChannelStatus(channelName, status) {
    const channelInfo = this.channels.get(channelName);
    if (channelInfo) {
      channelInfo.status = status;
      this.dispatchChannelEvent(channelName, 'status_change', { status });
    }
  }

  /**
   * Dispatch connection event
   */
  dispatchConnectionEvent(type, connectionId, data = {}) {
    const event = new CustomEvent(`ws:connection:${type}`, {
      detail: { connectionId, ...data }
    });
    window.dispatchEvent(event);
  }

  /**
   * Dispatch channel event
   */
  dispatchChannelEvent(channelName, type, data = {}) {
    const channelInfo = this.channels.get(channelName);
    
    if (channelInfo) {
      // Notify specific listeners
      channelInfo.listeners.forEach(listener => {
        if (listener.eventType === type || listener.eventType === '*') {
          try {
            listener.callback(data);
          } catch (error) {
            console.error('Error in channel listener:', error);
          }
        }
      });
    }

    // Dispatch global event
    const event = new CustomEvent(`ws:channel:${type}`, {
      detail: { channelName, ...data }
    });
    window.dispatchEvent(event);
  }

  /**
   * Generate unique connection ID
   */
  generateConnectionId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(connectionId) {
    const connection = this.connections.get(connectionId);
    return connection ? connection.status : null;
  }

  /**
   * Get all connection statuses
   */
  getAllConnectionStatuses() {
    const statuses = {};
    this.connections.forEach((connection, id) => {
      statuses[id] = {
        status: connection.status,
        url: connection.url,
        lastActivity: connection.lastActivity,
        reconnectAttempts: connection.reconnectAttempts,
        channels: Array.from(connection.channels)
      };
    });
    return statuses;
  }

  /**
   * Get channel information
   */
  getChannelInfo(channelName) {
    return this.channels.get(channelName) || null;
  }

  /**
   * Get all channels
   */
  getAllChannels() {
    const channels = {};
    this.channels.forEach((info, name) => {
      channels[name] = {
        ...info,
        listeners: info.listeners.size
      };
    });
    return channels;
  }

  /**
   * Cleanup all connections
   */
  cleanupConnections() {
    console.log('Cleaning up WebSocket connections...');
    
    this.connections.forEach((connection, id) => {
      this.closeConnection(id);
    });

    // Clear all maps
    this.connections.clear();
    this.channels.clear();
    this.reconnectAttempts.clear();
    this.heartbeatTimers.clear();
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager();

// Global access for debugging
window.wsManager = wsManager;