// WebSocket route for real-time log streaming
const { logStreamManager } = require('../../websockets/logStream');
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let dbLoggerModule;
if (isDist) {
    dbLoggerModule = require('../../utils/dbLogger');
} else {
    try {
        dbLoggerModule = require('../../utils/dbLogger');
    } catch (e) {
        dbLoggerModule = require('../../src/utils/dbLogger');
    }
}
const { info, error } = dbLoggerModule;

/**
 * Setup WebSocket routes for log streaming
 * @param {Object} wss - WebSocket server instance
 */
function setupLogWebSocket(wss) {
  console.log('[LogWebSocket] Initializing log streaming WebSocket...');

  wss.on('connection', async (ws, req) => {
    let client = null;
    
    try {
      // Extract user information from session if available
      const user = req.session?.user;
      const userEmail = user?.email;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      console.log(`[LogWebSocket] New connection from ${ipAddress}${userEmail ? ` (${userEmail})` : ''}`);

      // Log connection
      await info('LogWebSocket', 'Client connected to log stream', {
        userEmail,
        ipAddress,
        userAgent,
        connectionTime: new Date().toISOString()
      }, user, 'websocket-logs');

      // Add client to stream manager with initial filters
      client = logStreamManager.addClient(ws, {});

      // Handle incoming messages from client
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'filters':
              // Update client filters
              if (message.data && typeof message.data === 'object') {
                logStreamManager.updateClientFilters(client, message.data);
                
                // Log filter update
                await info('LogWebSocket', 'Client updated filters', {
                  clientId: client.id,
                  filters: message.data,
                  userEmail
                }, user, 'websocket-logs');
              }
              break;

            case 'ping':
              // Respond to ping with pong
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
              }));
              break;

            case 'get_recent':
              // Client requesting recent logs (manual refresh)
              const limit = Math.min(message.limit || 50, 100);
              await logStreamManager.sendRecentLogs(client);
              break;

            default:
              console.warn(`[LogWebSocket] Unknown message type from client ${client.id}:`, message.type);
          }
        } catch (parseError) {
          console.error(`[LogWebSocket] Failed to parse message from client ${client?.id}:`, parseError);
          
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: new Date().toISOString()
          }));
        }
      });

      // Handle client disconnect
      ws.on('close', async (code, reason) => {
        console.log(`[LogWebSocket] Client ${client?.id} disconnected (${code}: ${reason})`);
        
        if (client) {
          // Log disconnection
          await info('LogWebSocket', 'Client disconnected from log stream', {
            clientId: client.id,
            userEmail,
            disconnectCode: code,
            disconnectReason: reason?.toString(),
            connectionDuration: Date.now() - client.connectedAt.getTime()
          }, user, 'websocket-logs');

          // Remove from stream manager
          logStreamManager.removeClient(client);
        }
      });

      // Handle WebSocket errors
      ws.on('error', async (wsError) => {
        console.error(`[LogWebSocket] WebSocket error for client ${client?.id}:`, wsError);
        
        if (client) {
          await error('LogWebSocket', 'WebSocket error occurred', {
            clientId: client.id,
            userEmail,
            error: wsError.message,
            stack: wsError.stack
          }, user, 'websocket-logs');

          logStreamManager.removeClient(client);
        }
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to log stream',
        clientId: client.id,
        timestamp: new Date().toISOString()
      }));

    } catch (connectionError) {
      console.error('[LogWebSocket] Connection setup error:', connectionError);
      
      if (client) {
        logStreamManager.removeClient(client);
      }

      // Send error to client if WebSocket is still open
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Connection setup failed',
          timestamp: new Date().toISOString()
        }));
        ws.close(1011, 'Connection setup failed');
      }
    }
  });

  // Handle server-level WebSocket errors
  wss.on('error', (serverError) => {
    console.error('[LogWebSocket] WebSocket server error:', serverError);
  });

  console.log('[LogWebSocket] Log streaming WebSocket ready');
}

/**
 * Get WebSocket statistics
 */
function getWebSocketStats() {
  return logStreamManager.getStats();
}

/**
 * Broadcast a log entry to all connected clients
 * This is called by the database logger when new logs are created
 */
function broadcastLogEntry(logEntry) {
  return logStreamManager.broadcastLog(logEntry);
}

module.exports = {
  setupLogWebSocket,
  getWebSocketStats,
  broadcastLogEntry
};