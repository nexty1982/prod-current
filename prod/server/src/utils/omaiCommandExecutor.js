const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const yaml = require('js-yaml');
const crypto = require('crypto');
const logger = require('./logger');

class OMAICommandExecutor {
  constructor() {
    this.configPath = path.join(process.cwd(), 'omai_commands.yaml');
    this.config = null;
    this.memoryCache = new Map();
    this.commandHistory = [];
    this.handsonMode = false;
    this.logFile = '/var/log/omai/executed.log';
    this.cacheFile = '/var/log/omai/command_cache.json';
    this.initialized = false;
  }

  /**
   * Initialize the OMAI Command Executor
   */
  async initialize() {
    try {
      await this.ensureLogDirectory();
      await this.loadConfig();
      await this.loadMemoryCache();
      this.initialized = true;
      logger.info('OMAI Command Executor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OMAI Command Executor:', error);
      throw error;
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    try {
      await fs.mkdir(logDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Load OMAI commands configuration
   */
  async loadConfig() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf8');
      this.config = yaml.load(configContent);
      logger.info('OMAI commands configuration loaded');
    } catch (error) {
      logger.error('Failed to load OMAI commands configuration:', error);
      throw new Error('Could not load omai_commands.yaml configuration file');
    }
  }

  /**
   * Load memory cache from file
   */
  async loadMemoryCache() {
    try {
      const cacheContent = await fs.readFile(this.cacheFile, 'utf8');
      const cacheData = JSON.parse(cacheContent);
      
      // Load cache entries
      for (const [key, entry] of Object.entries(cacheData.commands || {})) {
        if (this.isCacheEntryValid(entry)) {
          this.memoryCache.set(key, entry);
        }
      }
      
      logger.info(`Loaded ${this.memoryCache.size} cached commands`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Could not load memory cache:', error.message);
      }
      // Create empty cache if file doesn't exist
      this.memoryCache = new Map();
    }
  }

  /**
   * Check if cache entry is still valid
   */
  isCacheEntryValid(entry) {
    const cacheHours = this.config?.memory?.cache_duration_hours || 24;
    const cacheMs = cacheHours * 60 * 60 * 1000;
    const now = Date.now();
    
    return (now - entry.timestamp) < cacheMs;
  }

  /**
   * Save memory cache to file
   */
  async saveMemoryCache() {
    try {
      const cacheData = {
        version: '1.0.0',
        updated_at: new Date().toISOString(),
        commands: {}
      };
      
      // Convert Map to object for JSON serialization
      for (const [key, entry] of this.memoryCache.entries()) {
        cacheData.commands[key] = entry;
      }
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      logger.warn('Could not save memory cache:', error.message);
    }
  }

  /**
   * Enable hands-on mode
   */
  enableHandsOnMode() {
    this.handsonMode = true;
    logger.info('OMAI Hands-On Mode enabled');
  }

  /**
   * Disable hands-on mode
   */
  disableHandsOnMode() {
    this.handsonMode = false;
    logger.info('OMAI Hands-On Mode disabled');
  }

  /**
   * Parse natural language instruction and find matching command
   */
  async parseInstruction(instruction) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const normalizedInstruction = instruction.toLowerCase().trim();
    
    // Check memory cache first
    const cacheKey = this.generateCacheKey(normalizedInstruction);
    if (this.memoryCache.has(cacheKey)) {
      const cachedEntry = this.memoryCache.get(cacheKey);
      cachedEntry.frequency++;
      cachedEntry.last_used = Date.now();
      await this.saveMemoryCache();
      
      logger.info(`Found cached command for: "${instruction}"`);
      return cachedEntry.command_info;
    }
    
    // Search through command categories
    for (const [categoryName, category] of Object.entries(this.config.categories || {})) {
      for (const [commandName, commandInfo] of Object.entries(category.commands || {})) {
        for (const pattern of commandInfo.patterns || []) {
          if (this.matchesPattern(normalizedInstruction, pattern.toLowerCase())) {
            await this.updateMemoryCache(normalizedInstruction, commandName, commandInfo);
            return { ...commandInfo, name: commandName, category: categoryName };
          }
        }
      }
    }
    
    // Check aliases
    for (const [alias, commandName] of Object.entries(this.config.aliases || {})) {
      if (normalizedInstruction.includes(alias)) {
        const commandInfo = this.findCommandByName(commandName);
        if (commandInfo) {
          await this.updateMemoryCache(normalizedInstruction, commandName, commandInfo);
          return { ...commandInfo, name: commandName, alias: alias };
        }
      }
    }
    
    return null;
  }

  /**
   * Check if instruction matches pattern
   */
  matchesPattern(instruction, pattern) {
    // Simple fuzzy matching - can be enhanced with better NLP
    const instructionWords = instruction.split(/\s+/);
    const patternWords = pattern.split(/\s+/);
    
    // Check if at least 70% of pattern words are in instruction
    const matches = patternWords.filter(word => 
      instructionWords.some(instrWord => 
        instrWord.includes(word) || word.includes(instrWord)
      )
    );
    
    return matches.length / patternWords.length >= 0.7;
  }

  /**
   * Find command by name across all categories
   */
  findCommandByName(commandName) {
    for (const category of Object.values(this.config.categories || {})) {
      if (category.commands && category.commands[commandName]) {
        return category.commands[commandName];
      }
    }
    return null;
  }

  /**
   * Update memory cache with command usage
   */
  async updateMemoryCache(instruction, commandName, commandInfo) {
    const cacheKey = this.generateCacheKey(instruction);
    const frequencyThreshold = this.config?.memory?.frequency_threshold || 3;
    
    if (this.memoryCache.has(cacheKey)) {
      const entry = this.memoryCache.get(cacheKey);
      entry.frequency++;
      entry.last_used = Date.now();
    } else {
      this.memoryCache.set(cacheKey, {
        instruction,
        command_name: commandName,
        command_info: commandInfo,
        frequency: 1,
        timestamp: Date.now(),
        last_used: Date.now()
      });
    }
    
    // Check if we need to save cache (auto-cache after threshold)
    const entry = this.memoryCache.get(cacheKey);
    if (entry.frequency >= frequencyThreshold) {
      await this.saveMemoryCache();
      logger.info(`Auto-cached command "${commandName}" after ${entry.frequency} uses`);
    }
  }

  /**
   * Generate cache key for instruction
   */
  generateCacheKey(instruction) {
    return crypto.createHash('md5').update(instruction).digest('hex').substring(0, 16);
  }

  /**
   * Execute a command with safety checks
   */
  async executeCommand(commandInfo, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.handsonMode && !options.force) {
      throw new Error('Command execution requires hands-on mode or force flag');
    }
    
    const {
      command,
      safety = 'moderate',
      requires_sudo = false,
      trusted = false,
      description = 'No description',
      name = 'unknown'
    } = commandInfo;
    
    // Safety checks
    if (safety === 'dangerous' && !options.force) {
      throw new Error('Dangerous command requires --force flag');
    }
    
    if (requires_sudo && !trusted && !options.confirmSudo) {
      throw new Error('Sudo command requires explicit confirmation');
    }
    
    // Log command execution attempt
    await this.logCommand({
      command,
      name,
      description,
      safety,
      requires_sudo,
      trusted,
      timestamp: new Date().toISOString(),
      user: process.env.USER || 'unknown',
      status: 'attempting'
    });
    
    try {
      logger.info(`Executing OMAI command: ${name} - ${description}`);
      logger.info(`Command: ${command}`);
      
      const result = await this.runCommand(command, options);
      
      // Log successful execution
      await this.logCommand({
        command,
        name,
        description,
        safety,
        requires_sudo,
        trusted,
        timestamp: new Date().toISOString(),
        user: process.env.USER || 'unknown',
        status: 'success',
        output: result.stdout,
        error: result.stderr
      });
      
      return result;
    } catch (error) {
      // Log failed execution
      await this.logCommand({
        command,
        name,
        description,
        safety,
        requires_sudo,
        trusted,
        timestamp: new Date().toISOString(),
        user: process.env.USER || 'unknown',
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Run the actual command
   */
  async runCommand(command, options = {}) {
    const timeout = options.timeout || this.config?.settings?.timeout_seconds * 1000 || 300000;
    const workingDir = options.cwd || this.config?.settings?.working_directory || process.cwd();
    
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        cwd: workingDir,
        timeout: timeout,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Log command execution to file
   */
  async logCommand(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      logger.warn('Could not write to command log:', error.message);
    }
  }

  /**
   * Get command history
   */
  async getCommandHistory(limit = 50) {
    try {
      const logContent = await fs.readFile(this.logFile, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line.trim());
      
      const history = lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(entry => entry !== null)
        .reverse(); // Most recent first
      
      return history;
    } catch (error) {
      logger.warn('Could not read command history:', error.message);
      return [];
    }
  }

  /**
   * Get memory cache statistics
   */
  getMemoryStats() {
    const stats = {
      total_cached_commands: this.memoryCache.size,
      cache_file: this.cacheFile,
      most_used_commands: [],
      recent_commands: []
    };
    
    // Get most used commands
    const sortedByFrequency = Array.from(this.memoryCache.entries())
      .sort(([,a], [,b]) => b.frequency - a.frequency)
      .slice(0, 10);
    
    stats.most_used_commands = sortedByFrequency.map(([key, entry]) => ({
      instruction: entry.instruction,
      command: entry.command_name,
      frequency: entry.frequency,
      last_used: new Date(entry.last_used).toISOString()
    }));
    
    // Get recent commands
    const sortedByRecent = Array.from(this.memoryCache.entries())
      .sort(([,a], [,b]) => b.last_used - a.last_used)
      .slice(0, 10);
    
    stats.recent_commands = sortedByRecent.map(([key, entry]) => ({
      instruction: entry.instruction,
      command: entry.command_name,
      last_used: new Date(entry.last_used).toISOString()
    }));
    
    return stats;
  }

  /**
   * List available commands
   */
  listCommands() {
    const commands = [];
    
    for (const [categoryName, category] of Object.entries(this.config?.categories || {})) {
      for (const [commandName, commandInfo] of Object.entries(category.commands || {})) {
        commands.push({
          name: commandName,
          category: categoryName,
          description: commandInfo.description,
          safety: commandInfo.safety,
          patterns: commandInfo.patterns,
          requires_sudo: commandInfo.requires_sudo || false,
          trusted: commandInfo.trusted || false
        });
      }
    }
    
    return commands;
  }

  /**
   * Process instruction and execute if in hands-on mode
   */
  async processInstruction(instruction, options = {}) {
    const commandInfo = await this.parseInstruction(instruction);
    
    if (!commandInfo) {
      throw new Error(`No command found for instruction: "${instruction}"`);
    }
    
    if (this.handsonMode || options.force) {
      return await this.executeCommand(commandInfo, options);
    } else {
      return {
        found: true,
        command: commandInfo,
        message: 'Command found but not executed (hands-on mode disabled)',
        suggestion: 'Use --mode hands-on to enable command execution'
      };
    }
  }
}

module.exports = OMAICommandExecutor; 