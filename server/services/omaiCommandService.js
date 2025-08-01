/**
 * OMAI Command Service - Database Implementation
 * Replaces omai-commands.json with database queries
 */

const { promisePool } = require('../config/db');

class OmaiCommandService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all OMAI commands organized by category
   * @returns {Object} Commands organized by category
   */
  async getAllCommands() {
    const cacheKey = 'all_commands';
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const [commands] = await promisePool.execute(`
        SELECT command_key, category, patterns, description, action, safety,
               context_aware, requires_hands_on, requires_confirmation, 
               requires_parameters, allowed_roles
        FROM omai_commands 
        WHERE is_active = TRUE
        ORDER BY category, command_key
      `);

      // Organize commands by category
      const result = {
        version: '1.0.0',
        description: 'Global OMAI command mappings for site-wide AI assistance (from database)',
        settings: {
          logFile: '/var/log/omai/global-commands.log',
          requireConfirmation: true,
          maxHistoryItems: 50,
          timeoutSeconds: 30,
          allowedRoles: ['super_admin']
        },
        categories: {},
        contextual_suggestions: {},
        security: {
          destructive_commands: [],
          confirmation_required: [],
          hands_on_required: []
        },
        logging: {
          enabled: true,
          log_commands: true,
          log_results: true,
          log_context: true,
          retention_days: 30
        }
      };

      // Build categories structure
      commands.forEach(cmd => {
        if (!result.categories[cmd.category]) {
          result.categories[cmd.category] = {
            description: `${cmd.category.charAt(0).toUpperCase() + cmd.category.slice(1)} commands`,
            commands: {}
          };
        }

        result.categories[cmd.category].commands[cmd.command_key] = {
          patterns: JSON.parse(cmd.patterns || '[]'),
          description: cmd.description,
          action: cmd.action,
          safety: cmd.safety,
          context_aware: cmd.context_aware || false,
          requires_hands_on: cmd.requires_hands_on || false,
          requires_confirmation: cmd.requires_confirmation || false,
          ...(cmd.requires_parameters ? { requires_parameters: JSON.parse(cmd.requires_parameters) } : {})
        };

        // Build security lists
        if (cmd.requires_hands_on) {
          result.security.hands_on_required.push(cmd.command_key);
        }
        if (cmd.requires_confirmation) {
          result.security.confirmation_required.push(cmd.command_key);
        }
        if (cmd.safety === 'moderate' || cmd.safety === 'dangerous') {
          result.security.destructive_commands.push(cmd.command_key);
        }
      });

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error fetching OMAI commands from database:', error);
      return this.getFallbackCommands();
    }
  }

  /**
   * Get contextual suggestions for a specific page
   * @param {string} pagePath - The page path
   * @returns {Array} Array of suggested commands
   */
  async getContextualSuggestions(pagePath) {
    try {
      const [rows] = await promisePool.execute(`
        SELECT suggested_commands 
        FROM omai_command_contexts 
        WHERE page_path = ?
      `, [pagePath]);

      if (rows.length > 0) {
        return JSON.parse(rows[0].suggested_commands || '[]');
      }

      // Return general suggestions if no specific ones found
      return ['help', 'status', 'explain this page'];
    } catch (error) {
      console.error('Error fetching contextual suggestions:', error);
      return ['help', 'status'];
    }
  }

  /**
   * Add contextual suggestions for a page
   * @param {string} pagePath - The page path
   * @param {Array} suggestions - Array of command suggestions
   */
  async setContextualSuggestions(pagePath, suggestions) {
    try {
      await promisePool.execute(`
        INSERT INTO omai_command_contexts (page_path, suggested_commands)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          suggested_commands = VALUES(suggested_commands),
          updated_at = CURRENT_TIMESTAMP
      `, [pagePath, JSON.stringify(suggestions)]);

      console.log(`Updated contextual suggestions for ${pagePath}`);
    } catch (error) {
      console.error('Error setting contextual suggestions:', error);
    }
  }

  /**
   * Get all contextual suggestions
   * @returns {Object} All contextual suggestions by page path
   */
  async getAllContextualSuggestions() {
    try {
      const [rows] = await promisePool.execute(`
        SELECT page_path, suggested_commands 
        FROM omai_command_contexts
      `);

      const result = {};
      rows.forEach(row => {
        result[row.page_path] = JSON.parse(row.suggested_commands || '[]');
      });

      return result;
    } catch (error) {
      console.error('Error fetching all contextual suggestions:', error);
      return {};
    }
  }

  /**
   * Find commands by pattern matching
   * @param {string} input - User input to match against patterns
   * @returns {Array} Matching commands
   */
  async findMatchingCommands(input) {
    try {
      const [commands] = await promisePool.execute(`
        SELECT command_key, category, patterns, description, action, safety,
               context_aware, requires_hands_on, requires_confirmation
        FROM omai_commands 
        WHERE is_active = TRUE
      `);

      const matches = [];
      const inputLower = input.toLowerCase();

      commands.forEach(cmd => {
        const patterns = JSON.parse(cmd.patterns || '[]');
        const isMatch = patterns.some(pattern => 
          inputLower.includes(pattern.toLowerCase()) || 
          pattern.toLowerCase().includes(inputLower)
        );

        if (isMatch) {
          matches.push({
            command_key: cmd.command_key,
            category: cmd.category,
            description: cmd.description,
            action: cmd.action,
            safety: cmd.safety,
            context_aware: cmd.context_aware,
            requires_hands_on: cmd.requires_hands_on,
            requires_confirmation: cmd.requires_confirmation,
            confidence: this.calculateConfidence(inputLower, patterns)
          });
        }
      });

      // Sort by confidence score
      return matches.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error finding matching commands:', error);
      return [];
    }
  }

  /**
   * Calculate confidence score for pattern matching
   * @private
   */
  calculateConfidence(input, patterns) {
    let maxScore = 0;
    
    patterns.forEach(pattern => {
      const patternLower = pattern.toLowerCase();
      if (input === patternLower) {
        maxScore = Math.max(maxScore, 1.0);
      } else if (input.includes(patternLower)) {
        maxScore = Math.max(maxScore, 0.8);
      } else if (patternLower.includes(input)) {
        maxScore = Math.max(maxScore, 0.6);
      } else {
        // Levenshtein distance-based scoring could be added here
        maxScore = Math.max(maxScore, 0.2);
      }
    });
    
    return maxScore;
  }

  /**
   * Clear command cache
   */
  clearCache() {
    this.cache.clear();
    console.log('OMAI command cache cleared');
  }

  /**
   * Fallback commands if database is unavailable
   * @private
   */
  getFallbackCommands() {
    return {
      version: '1.0.0',
      description: 'Fallback OMAI commands (database unavailable)',
      categories: {
        system: {
          description: 'Basic system commands',
          commands: {
            help: {
              patterns: ['help', 'commands'],
              description: 'Show available commands',
              action: 'show_help',
              safety: 'safe'
            },
            status: {
              patterns: ['status', 'system status'],
              description: 'Show system status',
              action: 'get_system_status',
              safety: 'safe'
            }
          }
        }
      },
      settings: {
        allowedRoles: ['super_admin']
      }
    };
  }
}

module.exports = OmaiCommandService;