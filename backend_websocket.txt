// WebSocket Server for real-time updates
const WebSocket = require('ws');
require('dotenv').config();

const WS_PORT = process.env.WS_PORT || 3001;

const wss = new WebSocket.Server({ 
    port: WS_PORT,
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
    }
});

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('✅ New WebSocket client connected');
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Hugo Management WebSocket',
        timestamp: new Date().toISOString()
    }));

    // Handle messages from client
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);
            
            // Broadcast to all other clients
            broadcast(data, ws);
        } catch (err) {
            console.error('Invalid message:', err);
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });

    // Ping to keep connection alive
    const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(interval);
        }
    }, 30000);
});

// Broadcast function
function broadcast(data, sender = null) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Export for use in other modules
module.exports = {
    broadcast,
    wss
};

console.log(`🔌 WebSocket server running on ws://localhost:${WS_PORT}`);
