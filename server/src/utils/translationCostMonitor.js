#!/usr/bin/env node

// Cost monitoring utilities for Google Cloud Translation API
const fs = require('fs').promises;
const path = require('path');

class TranslationCostMonitor {
  constructor() {
    this.costLogFile = path.join(__dirname, 'translation-costs.json');
    this.monthlyLimit = parseFloat(process.env.MONTHLY_TRANSLATION_LIMIT) || 10.0; // $10/month default
    this.dailyLimit = parseFloat(process.env.DAILY_TRANSLATION_LIMIT) || 2.0;     // $2/day default
  }

  // Calculate cost for character count
  calculateCost(characterCount) {
    // Google Cloud Translation API: $20 per million characters
    // First 500,000 characters per month are free
    const freeCharacters = 500000;
    const costPerMillion = 20;
    
    const chargeableCharacters = Math.max(0, characterCount - freeCharacters);
    const cost = (chargeableCharacters / 1000000) * costPerMillion;
    
    return {
      totalCharacters: characterCount,
      freeCharacters: Math.min(characterCount, freeCharacters),
      chargeableCharacters,
      cost: cost,
      formattedCost: `$${cost.toFixed(4)}`
    };
  }

  // Log translation cost
  async logCost(jobId, characterCount, actualCost, sourceLanguage, targetLanguage) {
    try {
      let costLog = [];
      
      // Load existing log
      try {
        const logData = await fs.readFile(this.costLogFile, 'utf8');
        costLog = JSON.parse(logData);
      } catch (error) {
        // File doesn't exist yet, start with empty array
      }

      // Add new entry
      const entry = {
        timestamp: new Date().toISOString(),
        jobId,
        characterCount,
        cost: actualCost,
        sourceLanguage,
        targetLanguage,
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
      };

      costLog.push(entry);

      // Keep only last 1000 entries
      if (costLog.length > 1000) {
        costLog = costLog.slice(-1000);
      }

      // Save log
      await fs.writeFile(this.costLogFile, JSON.stringify(costLog, null, 2));
      
      return entry;
    } catch (error) {
      console.error('Failed to log translation cost:', error);
      return null;
    }
  }

  // Check if translation is within limits
  async checkLimits(proposedCharacterCount) {
    try {
      const proposedCost = this.calculateCost(proposedCharacterCount).cost;
      
      // Load cost log
      let costLog = [];
      try {
        const logData = await fs.readFile(this.costLogFile, 'utf8');
        costLog = JSON.parse(logData);
      } catch (error) {
        // No existing log, limits not exceeded
        return { allowed: true, reason: 'No previous usage' };
      }

      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

      // Calculate daily usage
      const todayCosts = costLog
        .filter(entry => entry.date === today)
        .reduce((sum, entry) => sum + entry.cost, 0);

      // Calculate monthly usage  
      const monthCosts = costLog
        .filter(entry => entry.timestamp.startsWith(thisMonth))
        .reduce((sum, entry) => sum + entry.cost, 0);

      // Check limits
      if (todayCosts + proposedCost > this.dailyLimit) {
        return {
          allowed: false,
          reason: `Daily limit exceeded. Used: $${todayCosts.toFixed(4)}, Proposed: $${proposedCost.toFixed(4)}, Limit: $${this.dailyLimit}`,
          usage: { daily: todayCosts, monthly: monthCosts }
        };
      }

      if (monthCosts + proposedCost > this.monthlyLimit) {
        return {
          allowed: false,
          reason: `Monthly limit exceeded. Used: $${monthCosts.toFixed(4)}, Proposed: $${proposedCost.toFixed(4)}, Limit: $${this.monthlyLimit}`,
          usage: { daily: todayCosts, monthly: monthCosts }
        };
      }

      return {
        allowed: true,
        reason: 'Within limits',
        usage: { daily: todayCosts, monthly: monthCosts },
        proposedCost
      };

    } catch (error) {
      console.error('Failed to check translation limits:', error);
      // Fail safe - allow translation if we can't check limits
      return { allowed: true, reason: 'Limit check failed, allowing' };
    }
  }

  // Get usage statistics
  async getUsageStats() {
    try {
      let costLog = [];
      try {
        const logData = await fs.readFile(this.costLogFile, 'utf8');
        costLog = JSON.parse(logData);
      } catch (error) {
        return {
          totalCost: 0,
          totalCharacters: 0,
          totalTranslations: 0,
          dailyCost: 0,
          monthlyCost: 0,
          lastMonth: []
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().substring(0, 7);

      const totalCost = costLog.reduce((sum, entry) => sum + entry.cost, 0);
      const totalCharacters = costLog.reduce((sum, entry) => sum + entry.characterCount, 0);
      const totalTranslations = costLog.length;

      const dailyCost = costLog
        .filter(entry => entry.date === today)
        .reduce((sum, entry) => sum + entry.cost, 0);

      const monthlyCost = costLog
        .filter(entry => entry.timestamp.startsWith(thisMonth))
        .reduce((sum, entry) => sum + entry.cost, 0);

      // Last 30 days by day
      const lastMonth = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayCost = costLog
          .filter(entry => entry.date === dateStr)
          .reduce((sum, entry) => sum + entry.cost, 0);
        
        lastMonth.push({
          date: dateStr,
          cost: dayCost,
          translations: costLog.filter(entry => entry.date === dateStr).length
        });
      }

      return {
        totalCost,
        totalCharacters,
        totalTranslations,
        dailyCost,
        monthlyCost,
        lastMonth,
        limits: {
          daily: this.dailyLimit,
          monthly: this.monthlyLimit
        }
      };

    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }
}

module.exports = TranslationCostMonitor;
