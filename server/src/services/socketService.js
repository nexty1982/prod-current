/**
 * Socket.IO Service for Real-time Admin Log Monitoring
 * Integrates with logMonitor service to push alerts to admin clients
 */

const { Server } = require('socket.io');
const logMonitor = require('./logMonitor');

class SocketService {
  constructor() {
    this.io = null;
    this.adminNamespace = null;
  }

  /**
   * Initialize Socket.IO server
   * @param {http.Server} httpServer - HTTP server instance
   * @param {Array} allowedOrigins - CORS allowed origins
   */
  initialize(httpServer, allowedOrigins) {
    console.log('[SocketService] Initializing Socket.IO...');

    // Create Socket.IO server with CORS configuration
    this.io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST']
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    // Create admin namespace for log monitoring
    this.adminNamespace = this.io.of('/admin');

    // Handle admin connections
    this.adminNamespace.on('connection', (socket) => {
      console.log('[SocketService] Admin client connected:', socket.id);

      // Send current log stats on connection
      const stats = logMonitor.getStats();
      const buffer = logMonitor.getLogBuffer();
      socket.emit('log-stats', stats);
      socket.emit('log-buffer', buffer);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('[SocketService] Admin client disconnected:', socket.id);
      });

      // Handle request for current buffer
      socket.on('request-buffer', () => {
        const buffer = logMonitor.getLogBuffer();
        socket.emit('log-buffer', buffer);
      });

      // Handle request for stats
      socket.on('request-stats', () => {
        const stats = logMonitor.getStats();
        socket.emit('log-stats', stats);
      });
    });

    // Listen to log monitor events and broadcast to admin clients
    logMonitor.on('log-alert', (logEntry) => {
      this.adminNamespace.emit('log-alert', logEntry);
      
      // Also emit updated stats
      const stats = logMonitor.getStats();
      this.adminNamespace.emit('log-stats', stats);
    });

    console.log('[SocketService] Socket.IO initialized successfully');
    console.log('[SocketService] Admin namespace available at /admin');
  }

  /**
   * Broadcast a message to all admin clients
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  broadcastToAdmins(event, data) {
    if (this.adminNamespace) {
      this.adminNamespace.emit(event, data);
    }
  }

  /**
   * Get Socket.IO instance
   * @returns {Server|null}
   */
  getIO() {
    return this.io;
  }
}

// Singleton instance
const socketService = new SocketService();

module.exports = socketService;
