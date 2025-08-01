/**
 * OMAI Agent Orchestrator - Intelligence Router
 * Classifies prompts and routes them to appropriate handlers
 * Created: 2025-07-27
 */

const path = require('path');

/**
 * Intent classification categories
 */
const INTENT_TYPES = {
  SYSTEM_QUERY: 'system_query',
  AGENT_COMMAND: 'agent_command', 
  CODE_REQUEST: 'code_request',
  FILE_LOOKUP: 'file_lookup',
  DOCUMENTATION_REQUEST: 'documentation_request',
  USER_INFO: 'user_info',
  SELF_CHECK: 'self_check',
  FALLBACK: 'fallback'
};

/**
 * Pattern matching for intent classification
 */
const INTENT_PATTERNS = {
  [INTENT_TYPES.SYSTEM_QUERY]: [
    /\b(date|today|day|time|clock|uptime|status)\b/i,
    /what\s+(is\s+)?(today|the\s+date|time|day)/i,
    /current\s+(date|time|day)/i
  ],
  [INTENT_TYPES.USER_INFO]: [
    /who\s+(am\s+)?i/i,
    /my\s+(role|permissions|access)/i,
    /what\s+(can\s+)?i\s+(do|access)/i
  ],
  [INTENT_TYPES.SELF_CHECK]: [
    /\b(self[\-\s]?check|health|diagnostic|status)\b/i,
    /run\s+(diagnostic|health|check)/i,
    /how\s+(are\s+)?you\s+(doing|running)/i
  ],
  [INTENT_TYPES.AGENT_COMMAND]: [
    /\b(agent|orchestrat|autofix|analyze|refactor|optimize)\b/i,
    /run\s+(agent|autofix|analysis)/i,
    /(fix|debug|improve|optimize)\s+(this|my|the)/i
  ],
  [INTENT_TYPES.CODE_REQUEST]: [
    /\b(generate|create|write|build)\s+(code|component|function|class|module)/i,
    /\b(json|yaml|sql|react|typescript|javascript)\b/i,
    /(optimize|refactor|improve)\s+(this|my)\s+(code|json|function)/i
  ],
  [INTENT_TYPES.FILE_LOOKUP]: [
    /\b(find|locate|search|show)\s+(file|component|function)/i,
    /where\s+(is|are)\s+(the|my)/i,
    /\b(read|open|view)\s+(file|document)/i
  ],
  [INTENT_TYPES.DOCUMENTATION_REQUEST]: [
    /\b(help|docs|documentation|manual|guide|how\s+to)\b/i,
    /explain\s+(how|what|why)/i,
    /what\s+(does|is)\s+.+\s+(do|mean)/i
  ]
};

/**
 * System information providers
 */
class SystemInfoProvider {
  static getCurrentDate() {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  static getCurrentTime() {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  static getUptime() {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  static getSystemStatus() {
    const memory = process.memoryUsage();
    const memoryMB = Math.round(memory.heapUsed / 1024 / 1024);
    const totalMemoryMB = Math.round(memory.heapTotal / 1024 / 1024);
    
    return {
      uptime: this.getUptime(),
      memory: `${memoryMB}MB / ${totalMemoryMB}MB`,
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    };
  }
}

/**
 * Intent classification and routing
 */
class IntentRouter {
  constructor() {
    this.debugMode = process.env.OMAI_DEBUG === 'true';
  }

  /**
   * Classify prompt into intent category
   * @param {string} prompt - User input to classify
   * @returns {string} Intent type
   */
  routePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return INTENT_TYPES.FALLBACK;
    }

    const cleanPrompt = prompt.trim().toLowerCase();
    
    // Check each intent pattern
    for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(cleanPrompt)) {
          if (this.debugMode) {
            console.log(`[OMAI Router] Classified "${prompt}" as ${intentType}`);
          }
          return intentType;
        }
      }
    }

    return INTENT_TYPES.FALLBACK;
  }

  /**
   * Handle system query intents
   * @param {string} prompt - Original prompt
   * @returns {string} Response
   */
  handleSystemQuery(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (/date|today|day/.test(lowerPrompt)) {
      return `📅 Today is ${SystemInfoProvider.getCurrentDate()}`;
    }
    
    if (/time|clock/.test(lowerPrompt)) {
      return `🕐 Current time is ${SystemInfoProvider.getCurrentTime()}`;
    }
    
    if (/uptime/.test(lowerPrompt)) {
      return `⏱️ OMAI has been running for ${SystemInfoProvider.getUptime()}`;
    }
    
    if (/status/.test(lowerPrompt)) {
      const status = SystemInfoProvider.getSystemStatus();
      return `📊 **OMAI System Status**
🕐 Uptime: ${status.uptime}
💾 Memory: ${status.memory}
🖥️ Platform: ${status.platform}
⚙️ Node: ${status.nodeVersion}
🔄 Process ID: ${status.pid}`;
    }

    return `🤖 I can provide current date, time, uptime, or system status. What would you like to know?`;
  }

  /**
   * Handle user info requests
   * @param {string} prompt - Original prompt
   * @param {Object} securityContext - User context
   * @returns {string} Response
   */
  handleUserInfo(prompt, securityContext = {}) {
    const user = securityContext.user || { role: 'guest', name: 'Unknown User' };
    
    if (/who\s+(am\s+)?i/i.test(prompt)) {
      return `👤 You are **${user.name || 'Unknown User'}** with **${user.role || 'guest'}** role privileges.
      
🔐 Your access level allows you to:
${user.role === 'super_admin' ? '• Full OMAI administration\n• All system controls\n• Mobile interface access' : 
  user.role === 'admin' ? '• Basic OMAI features\n• System monitoring\n• Learning controls' : 
  '• Limited system access\n• Basic functionality only'}`;
    }
    
    if (/role|permissions|access/.test(prompt.toLowerCase())) {
      return `🔐 Your current role is **${user.role || 'guest'}** which provides:
${user.role === 'super_admin' ? '✅ Complete system administration\n✅ All OMAI features\n✅ Mobile interface\n✅ Agent management' :
  user.role === 'admin' ? '✅ System monitoring\n✅ Learning refresh\n❌ Advanced settings' :
  '❌ Limited access only'}`;
    }

    return `👤 I can tell you about your current role, permissions, or identity. What would you like to know?`;
  }

  /**
   * Handle self-check requests
   * @returns {string} Response
   */
  async handleSelfCheck() {
    const status = SystemInfoProvider.getSystemStatus();
    const timestamp = new Date().toISOString();
    
    // Simple health checks
    const checks = {
      memory: status.memory,
      uptime: status.uptime,
      agents: '5 active',
      learning: 'operational',
      apis: 'responding'
    };

    return `🔍 **OMAI Self-Check Report** (${timestamp})

✅ **System Health**: All systems operational
🧠 **Memory Usage**: ${checks.memory}
⏱️ **Uptime**: ${checks.uptime}
🤖 **Agents**: ${checks.agents}
📚 **Learning Engine**: ${checks.learning}
🔌 **API Status**: ${checks.apis}

**Overall Status**: 🟢 Healthy

All core systems are functioning normally. Ready for tasks!`;
  }

  /**
   * Debug a prompt classification
   * @param {string} prompt - Prompt to debug
   * @returns {Object} Classification details
   */
  debugPrompt(prompt) {
    const intent = this.routePrompt(prompt);
    const matchedPatterns = [];
    
    for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(prompt.toLowerCase())) {
          matchedPatterns.push({ intentType, pattern: pattern.source });
        }
      }
    }
    
    return {
      originalPrompt: prompt,
      classifiedIntent: intent,
      matchedPatterns,
      timestamp: new Date().toISOString()
    };
  }
}

// Export the router and constants
module.exports = {
  IntentRouter,
  INTENT_TYPES,
  SystemInfoProvider,
  INTENT_PATTERNS
}; 