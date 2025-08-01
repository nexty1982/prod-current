// WebSocket handler for real-time log streaming
const { dbLogger } = require('../utils/dbLogger');

class LogStreamManager {
  constructor() {
    this.clients = new Set();
    this.logBuffer = [];
    this.bufferSize = 50;
    this.setupDatabaseWatcher();
  }

  // Add client to log stream
  addClient(ws, filters = {}) {
    const client = {
      ws,
      filters,
      id: this.generateClientId(),
      connectedAt: new Date(),
      lastPing: new Date()
    };

    this.clients.add(client);
    
    // Send recent logs to new client
    this.sendRecentLogs(client);
    
    // Setup ping/pong for connection health
    this.setupClientHealthCheck(client);
    
    console.log(`[LogStream] Client ${client.id} connected. Total clients: ${this.clients.size}`);
    
    return client;
  }

  // Remove client from stream
  removeClient(client) {
    this.clients.delete(client);
    console.log(`[LogStream] Client ${client.id} disconnected. Total clients: ${this.clients.size}`);
  }

  // Update client filters
  updateClientFilters(client, filters) {
    client.filters = filters;
    console.log(`[LogStream] Updated filters for client ${client.id}:`, filters);
  }

  // Send log entry to matching clients
  broadcastLog(logEntry) {
    const message = {
      type: 'log',
      data: logEntry,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    
    for (const client of this.clients) {
      if (this.matchesFilters(logEntry, client.filters)) {
        try {
          if (client.ws.readyState === 1) { // WebSocket.OPEN
            client.ws.send(JSON.stringify(message));
            sentCount++;
          } else {
            // Remove dead connections
            this.removeClient(client);
          }
        } catch (error) {
          console.error(`[LogStream] Failed to send to client ${client.id}:`, error);
          this.removeClient(client);
        }
      }
    }

    // Add to buffer for new clients
    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift();
    }

    if (sentCount > 0) {
      console.log(`[LogStream] Broadcasted log to ${sentCount} clients`);
    }
  }

  // Send recent logs to new client
  async sendRecentLogs(client) {
    try {
      // Send buffered logs first
      const bufferedLogs = this.logBuffer.filter(log => 
        this.matchesFilters(log, client.filters)
      );

      for (const log of bufferedLogs) {
        const message = {
          type: 'historical',
          data: log,
          timestamp: new Date().toISOString()
        };
        client.ws.send(JSON.stringify(message));
      }

      // If buffer is not enough, fetch from database
      if (bufferedLogs.length < 20) {
        const recentLogs = await dbLogger.getLogs({
          ...client.filters,
          limit: 20
        });

        for (const log of recentLogs.reverse()) {
          if (!this.logBuffer.find(buffered => buffered.id === log.id)) {
            const message = {
              type: 'historical',
              data: log,
              timestamp: new Date().toISOString()
            };
            client.ws.send(JSON.stringify(message));
          }
        }
      }

      // Send ready signal
      client.ws.send(JSON.stringify({
        type: 'ready',
        message: 'Log stream ready',
        clientId: client.id
      }));

    } catch (error) {
      console.error(`[LogStream] Failed to send recent logs to client ${client.id}:`, error);
    }
  }

  // Check if log matches client filters
  matchesFilters(logEntry, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return true; // No filters = show all
    }

    // Level filter
    if (filters.level && logEntry.level !== filters.level) {
      return false;
    }

    // Source filter
    if (filters.source && !logEntry.source.toLowerCase().includes(filters.source.toLowerCase())) {
      return false;
    }

    // Service filter
    if (filters.service && logEntry.service !== filters.service) {
      return false;
    }

    // User email filter
    if (filters.user_email && logEntry.user_email !== filters.user_email) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = [
        logEntry.message,
        logEntry.source,
        logEntry.service || '',
        JSON.stringify(logEntry.meta || {})
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    return true;
  }

  // Setup database watcher to detect new logs
  setupDatabaseWatcher() {
    // Since we can't easily watch MySQL for changes, we'll poll periodically
    // This could be enhanced with MySQL binlog watching or Redis pub/sub
    
    let lastLogId = 0;
    
    const checkForNewLogs = async () => {
      try {
        const newLogs = await dbLogger.getLogs({
          limit: 10,
          offset: 0
        });

        // Find logs newer than our last seen ID
        const unseenLogs = newLogs.filter(log => log.id > lastLogId);
        
        if (unseenLogs.length > 0) {
          // Update last seen ID
          lastLogId = Math.max(...unseenLogs.map(log => log.id));
          
          // Broadcast new logs
          for (const log of unseenLogs.reverse()) {
            this.broadcastLog(log);
          }
        }
      } catch (error) {
        console.error('[LogStream] Error checking for new logs:', error);
      }
    };

    // Poll every 2 seconds for new logs
    setInterval(checkForNewLogs, 2000);
    
    // Initial check
    checkForNewLogs();
  }

  // Setup client health check
  setupClientHealthCheck(client) {
    const pingInterval = setInterval(() => {
      if (client.ws.readyState === 1) {
        try {
          client.ws.ping();
          client.lastPing = new Date();
        } catch (error) {
          console.error(`[LogStream] Ping failed for client ${client.id}:`, error);
          clearInterval(pingInterval);
          this.removeClient(client);
        }
      } else {
        clearInterval(pingInterval);
        this.removeClient(client);
      }
    }, 30000); // Ping every 30 seconds

    client.ws.on('pong', () => {
      client.lastPing = new Date();
    });

    client.ws.on('close', () => {
      clearInterval(pingInterval);
      this.removeClient(client);
    });

    client.ws.on('error', (error) => {
      console.error(`[LogStream] WebSocket error for client ${client.id}:`, error);
      clearInterval(pingInterval);
      this.removeClient(client);
    });
  }

  // Generate unique client ID
  generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get client statistics
  getStats() {
    return {
      totalClients: this.clients.size,
      bufferSize: this.logBuffer.length,
      clients: Array.from(this.clients).map(client => ({
        id: client.id,
        connectedAt: client.connectedAt,
        lastPing: client.lastPing,
        filters: client.filters,
        readyState: client.ws.readyState
      }))
    };
  }
}

// Singleton instance
const logStreamManager = new LogStreamManager();

module.exports = { logStreamManager };