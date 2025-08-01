/**
 * OMAI Fallback Responder - Intelligent Context-Aware Responses
 * Provides smart fallback responses when specific handlers don't match
 * Created: 2025-07-27
 */

/**
 * Context-aware fallback response generator
 */
class FallbackResponder {
  constructor(memoryCore = null) {
    this.memoryCore = memoryCore;
    this.responsePatterns = this.initializeResponsePatterns();
    this.conversationalTone = true;
  }

  /**
   * Initialize response patterns for different scenarios
   */
  initializeResponsePatterns() {
    return {
      // Weather requests
      weather: {
        patterns: [/weather|temperature|rain|snow|sunny|cloudy|forecast/i],
        responses: [
          "🌤️ I don't currently have weather API access, but I can help you debug sunny SQL queries and cloudy code issues!",
          "☀️ No weather data here, but I can definitely help brighten your day by fixing those pesky frontend bugs!",
          "🌧️ Can't predict rain, but I can predict your database needs optimization. Want me to take a look?"
        ]
      },
      
      // Humor/jokes
      humor: {
        patterns: [/joke|funny|humor|laugh|haha|lol/i],
        responses: [
          "😂 OrthodoxMetrics isn't funny... but I can debug your database with a smile! 🐛→✨",
          "🤖 Why did the developer pray? Because their code had too many bugs and not enough features! Now, how can I help you?",
          "😄 I'm funnier when I'm fixing your code than when I'm telling jokes. Got any broken components for me?"
        ]
      },
      
      // Emotional/personal
      emotional: {
        patterns: [/love|like|hate|feel|emotion|sad|happy|angry/i],
        responses: [
          "💙 I feel most alive when optimizing your SQL queries and fixing frontend bugs! How can I help?",
          "❤️ I love a good debugging session! What's not working the way you'd like it to?",
          "🤗 I care deeply about your code quality. Show me something that needs improvement!"
        ]
      },
      
      // Food/drinks
      food: {
        patterns: [/food|eat|drink|coffee|tea|hungry|thirsty/i],
        responses: [
          "☕ I don't drink coffee, but I do consume error logs! Got any for me to analyze?",
          "🍕 I feed on well-structured JSON and perfectly formatted code. Want to show me yours?",
          "🥤 The only thing I'm thirsty for is optimizing your database queries!"
        ]
      },
      
      // Time/scheduling
      time: {
        patterns: [/schedule|meeting|appointment|calendar|busy/i],
        responses: [
          "📅 My calendar is always open for debugging sessions! What needs fixing?",
          "⏰ I'm available 24/7 for code reviews and system optimization. What's on your mind?",
          "🗓️ No meetings in my schedule, just continuous integration and deployment help!"
        ]
      },
      
      // Nonsense/gibberish
      nonsense: {
        patterns: [/^[^a-zA-Z]*$/, /^(z+|x+|a+|q+|zzz|xxx|aaa|qqq)$/i, /^[!@#$%^&*()_+=-]+$/],
        responses: [
          "🤔 That doesn't look like any programming language I know! Try asking me about your code instead.",
          "🧩 Interesting pattern, but I speak JavaScript, SQL, and React better than... whatever that was! 😅",
          "🔤 I need actual words to help you effectively. What's the real question you'd like to ask?"
        ]
      },
      
      // Greetings
      greetings: {
        patterns: [/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))/i],
        responses: [
          "👋 Hello! I'm OMAI, ready to help optimize your OrthodoxMetrics system. What can I improve for you today?",
          "🤖 Greetings! I'm here to debug, optimize, and enhance your code. What's on your troubleshooting list?",
          "✨ Hi there! Let's make your code run smoother than a Sunday service. What needs attention?"
        ]
      },
      
      // Compliments
      compliments: {
        patterns: [/good\s+job|great|awesome|amazing|excellent|perfect|wonderful/i],
        responses: [
          "🙏 Thank you! I do my best work when helping optimize your OrthodoxMetrics platform. What's next?",
          "😊 Glad I could help! I'm always here when you need debugging assistance or code improvements.",
          "✨ Appreciate it! Ready for the next challenge - got any tricky bugs that need squashing?"
        ]
      },
      
      // Technical but unclear
      technical_unclear: {
        patterns: [/code|program|debug|fix|error|bug|optimize|improve/i],
        responses: [
          "🔧 I'm great with technical problems! Could you be more specific about what code or system needs attention?",
          "💻 I love debugging! What specific component, file, or error message are you working with?",
          "🐛 Technical issues are my specialty! Share some details about what's not working as expected."
        ]
      }
    };
  }

  /**
   * Generate intelligent fallback response
   * @param {string} prompt - User's input
   * @param {Object} context - Additional context (user, system state, etc.)
   * @returns {string} Contextual response
   */
  generateFallback(prompt, context = {}) {
    if (!prompt || typeof prompt !== 'string') {
      return this.getDefaultResponse();
    }

    const cleanPrompt = prompt.trim();
    
    // Try memory-based contextual response first
    if (this.memoryCore) {
      try {
        const memoryResponse = this.memoryCore.getContextualFallback(cleanPrompt);
        if (memoryResponse && !memoryResponse.includes('not sure how to answer')) {
          return memoryResponse;
        }
      } catch (error) {
        console.warn('[OMAI Fallback] Memory core error:', error.message);
      }
    }

    // Check for pattern matches
    for (const [category, config] of Object.entries(this.responsePatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(cleanPrompt)) {
          return this.selectResponse(config.responses, context);
        }
      }
    }

    // Handle code-related but unclear requests
    if (this.isCodeRelated(cleanPrompt)) {
      return this.getCodeRelatedResponse(cleanPrompt, context);
    }

    // Handle questions
    if (this.isQuestion(cleanPrompt)) {
      return this.getQuestionResponse(cleanPrompt, context);
    }

    // Handle commands that don't match patterns
    if (this.isCommand(cleanPrompt)) {
      return this.getCommandResponse(cleanPrompt, context);
    }

    // Final fallback
    return this.getIntelligentDefaultResponse(cleanPrompt, context);
  }

  /**
   * Select a response from available options
   */
  selectResponse(responses, context = {}) {
    if (!Array.isArray(responses) || responses.length === 0) {
      return this.getDefaultResponse();
    }

    // For now, select randomly. Could be enhanced with context-aware selection
    const index = Math.floor(Math.random() * responses.length);
    return responses[index];
  }

  /**
   * Check if prompt is code-related
   */
  isCodeRelated(prompt) {
    const codeKeywords = [
      'function', 'component', 'class', 'variable', 'api', 'database',
      'frontend', 'backend', 'react', 'typescript', 'javascript', 'sql',
      'json', 'html', 'css', 'npm', 'node', 'server', 'client'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return codeKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  /**
   * Check if prompt is a question
   */
  isQuestion(prompt) {
    return /^(what|how|why|when|where|who|can|could|would|should|is|are|do|does|will)\b/i.test(prompt) ||
           prompt.includes('?');
  }

  /**
   * Check if prompt is a command
   */
  isCommand(prompt) {
    return /^(run|execute|start|stop|create|delete|update|show|list|get|set)\b/i.test(prompt);
  }

  /**
   * Generate code-related response
   */
  getCodeRelatedResponse(prompt, context) {
    const suggestions = [
      "💻 I can help with that! Could you share the specific file, component, or error message you're working with?",
      "🔧 That sounds like something I can assist with! What specific part of your code needs attention?",
      "🐛 I'm ready to dive into the technical details! Can you provide more context about the issue?",
      "⚡ I love solving coding problems! What's the exact error or behavior you're experiencing?"
    ];

    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    if (context.user?.role === 'super_admin') {
      return `${suggestion}\n\n🔐 As a super admin, you also have access to the mobile OMAI interface at \`/admin/omai/mobile\` for quick diagnostics!`;
    }
    
    return suggestion;
  }

  /**
   * Generate question response
   */
  getQuestionResponse(prompt, context) {
    const responses = [
      "🤔 That's an interesting question! Could you provide more context so I can give you a specific answer?",
      "💭 I'd love to help answer that! Can you share more details about what you're trying to accomplish?",
      "🎯 Good question! The answer depends on your specific situation. What's the context?",
      "📝 I can help with that! Could you be more specific about what aspect you're most curious about?"
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Generate command response
   */
  getCommandResponse(prompt, context) {
    return `🎮 I recognize that as a command! For the best results, try using specific OMAI commands like:

🔧 \`status\` - Check system health
📚 \`learning refresh\` - Update knowledge base  
🤖 \`autofix\` - Run automatic fixes
🔍 \`agents\` - View available agents

Or ask me about specific files, components, or issues you'd like help with!`;
  }

  /**
   * Generate intelligent default response
   */
  getIntelligentDefaultResponse(prompt, context) {
    const defaultResponses = [
      "🤔 I'm not sure how to handle that specific request yet. Could you rephrase it or ask about something more specific?",
      "💡 I didn't quite catch that. Try asking me about code debugging, system optimization, or check my Operators Manual for guidance!",
      "🔍 I'm still learning! Could you be more specific about what you need help with? I'm great with technical problems!",
      "📚 That's outside my current knowledge base. Ask me about OrthodoxMetrics components, debugging, or system administration instead!"
    ];

    const baseResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    
    // Add contextual hints based on user role
    if (context.user?.role === 'super_admin') {
      return `${baseResponse}\n\n💡 **Super Admin Tip**: Check the OMAI Operators Manual or use the mobile interface for advanced features!`;
    } else if (context.user?.role === 'admin') {
      return `${baseResponse}\n\n💡 **Admin Tip**: Try asking about system status, learning refresh, or component debugging!`;
    }
    
    return baseResponse;
  }

  /**
   * Basic default response
   */
  getDefaultResponse() {
    return "🤖 I'm OMAI, your OrthodoxMetrics AI assistant! I'm here to help with code debugging, system optimization, and platform maintenance. What can I help you with?";
  }

  /**
   * Log unhandled prompts for training improvements
   */
  logUnhandledPrompt(prompt, context = {}) {
    if (process.env.OMAI_LOG_UNHANDLED === 'true') {
      console.log('[OMAI Unhandled]', {
        prompt: prompt.substring(0, 100),
        timestamp: new Date().toISOString(),
        userRole: context.user?.role || 'unknown',
        length: prompt.length
      });
    }
  }

  /**
   * Update response patterns dynamically
   */
  updatePatterns(newPatterns) {
    this.responsePatterns = { ...this.responsePatterns, ...newPatterns };
  }

  /**
   * Get statistics about fallback usage
   */
  getStats() {
    return {
      totalPatterns: Object.keys(this.responsePatterns).length,
      totalResponses: Object.values(this.responsePatterns).reduce(
        (sum, config) => sum + config.responses.length, 0
      ),
      memoryEnabled: !!this.memoryCore
    };
  }
}

module.exports = { FallbackResponder }; 