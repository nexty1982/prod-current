# JIT Terminal Configuration Guide

## Environment Variables

Add these variables to your `.env` file:

```bash
# JIT Terminal Configuration
ALLOW_JIT_TERMINAL=true           # Enable/disable JIT Terminal globally
JIT_ALLOW_PRODUCTION=false        # Allow JIT Terminal in production (security risk)
JIT_TIMEOUT_MINUTES=10            # Session timeout in minutes (1-60)
JIT_MAX_SESSIONS=3                # Maximum concurrent sessions per user (1-10)
JIT_REQUIRE_REAUTH=false          # Require password re-entry for new sessions
JIT_LOG_COMMANDS=true             # Log all commands and output
JIT_LOG_DIR=/var/log/orthodoxmetrics  # Directory for JIT logs
```

## Security Considerations

### Production Environment
- **NEVER** set `JIT_ALLOW_PRODUCTION=true` without proper security measures
- Ensure proper network isolation and VPN access
- Implement additional monitoring and alerting
- Consider using dedicated jump servers

### Logging and Audit
- All commands and outputs are logged to `${JIT_LOG_DIR}/jit_terminal.log`
- Individual session logs stored in `${JIT_LOG_DIR}/jit_sessions/`
- Logs include timestamps, user information, and command history
- Session transcripts can be downloaded for compliance

### Access Control
- Only `super_admin` role can access JIT Terminal
- Role checking enforced at both frontend and backend
- WebSocket connections authenticated and authorized
- Session isolation per user

## Installation Requirements

### Node.js Dependencies
```bash
npm install node-pty ws xterm xterm-addon-fit xterm-addon-web-links xterm-addon-search
```

### System Requirements
- Linux/Unix environment for PTY support
- Proper user permissions for shell access
- Write access to log directory
- Network access for WebSocket connections

## Backend Integration

1. **Add routes to your Express app:**
```javascript
const { router: jitRouter, setupJITWebSocket } = require('./routes/jit-terminal');
app.use('/api/jit', jitRouter);

// Setup WebSocket server
const server = http.createServer(app);
setupJITWebSocket(server);
```

2. **Ensure authentication middleware:**
```javascript
// routes/jit-terminal.js uses these middleware functions
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
```

3. **Create log directories:**
```bash
sudo mkdir -p /var/log/orthodoxmetrics/jit_sessions
sudo chown -R your-app-user:your-app-group /var/log/orthodoxmetrics
```

## Frontend Dependencies

The frontend requires these dependencies:
```bash
npm install xterm xterm-addon-fit xterm-addon-web-links xterm-addon-search
```

And these CSS imports in your app:
```css
@import 'xterm/css/xterm.css';
```

## Usage

1. **Access JIT Terminal:**
   - Navigate to Settings → JIT Terminal Access
   - Only visible to super_admin users

2. **Create Session:**
   - Click "New Session" button
   - Configure timeout and security options
   - Session automatically expires after timeout

3. **Terminal Operations:**
   - Full shell access with elevated privileges
   - All commands logged and monitored
   - Real-time session management

4. **Session Management:**
   - View active sessions
   - Download session logs
   - Terminate sessions manually
   - Automatic cleanup of expired sessions

## Troubleshooting

### Common Issues

1. **Permission Denied:**
   - Check log directory permissions
   - Verify user has shell access
   - Ensure proper sudo configuration

2. **WebSocket Connection Failed:**
   - Check network configuration
   - Verify WebSocket proxy settings
   - Check firewall rules

3. **PTY Spawn Error:**
   - Verify node-pty installation
   - Check shell executable path
   - Review system dependencies

### Debug Mode

Enable debug logging:
```bash
DEBUG=jit:* npm start
```

### Log Analysis

Check audit logs:
```bash
tail -f /var/log/orthodoxmetrics/jit_terminal.log
```

Monitor active sessions:
```bash
ps aux | grep jit-
```

## Security Best Practices

1. **Network Security:**
   - Use VPN for remote access
   - Implement IP allowlisting
   - Enable TLS/SSL for WebSocket connections

2. **Monitoring:**
   - Set up alerts for JIT session creation
   - Monitor log files for suspicious activity
   - Regular audit of session logs

3. **Access Control:**
   - Limit super_admin role assignment
   - Regular review of user permissions
   - Multi-factor authentication

4. **Operational Security:**
   - Regular security updates
   - Session timeout policies
   - Emergency session termination procedures 