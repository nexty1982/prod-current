const { formatTimestampUser } = require('./formatTimestamp');

/**
 * Enhanced Build Output Parser
 * Categorizes build output into structured data with insights
 */
class BuildOutputParser {
  constructor() {
    this.patterns = {
      bug: [
        /fix:|fixed:|bug:|error:|crash:|failure:|issue:|problem:/i,
        /resolved:|corrected:|patched:|hotfix:/i,
        /memory leak:|timeout:|exception:|null pointer:/i
      ],
      feature: [
        /feat:|feature:|add:|added:|new:|implement:|create:|introduce:/i,
        /enhancement:|improve:|upgrade:|expand:|extend:/i,
        /component:|page:|route:|api:|endpoint:/i
      ],
      intelligence: [
        /omai|ai|artificial intelligence|machine learning|neural|cognitive:/i,
        /smart|intelligent|auto|prediction|recommendation:/i,
        /learning|training|model|algorithm:/i
      ],
      package: [
        /npm|yarn|package|dependency|node_modules|install|update:/i,
        /version|upgrade|downgrade|audit|security:/i,
        /peer.?dep|legacy.?peer|vulnerability:/i
      ],
      test: [
        /test:|testing:|spec:|jest:|cypress:|unit test|e2e|integration:/i,
        /coverage:|passed:|failed:|assertion|mock:|stub:/i,
        /✓|✗|✅|❌|🧪|test.*complete/i
      ],
      deploy: [
        /deploy:|deployment:|build.*complet|bundle|chunk|asset:/i,
        /production|staging|dist|output|artifact:/i,
        /ready.*deploy|successfully.*built|generated.*file/i
      ],
      comment: [
        /\/\/|\/\*|\*\/|comment:|note:|todo:|fixme:|hack:/i,
        /@param|@return|@deprecated|@override:/i
      ]
    };

    this.severityPatterns = {
      high: /critical|severe|major|fatal|urgent|breaking/i,
      medium: /warning|moderate|minor|deprecat/i,
      low: /info|notice|suggestion|tip/i
    };
  }

  /**
   * Parse build output and categorize into structured data
   * @param {string} output - Raw build output
   * @param {boolean} success - Build success status
   * @param {number} duration - Build duration in ms
   * @returns {Object} Categorized build data
   */
  parse(output, success = true, duration = 0) {
    const lines = output.split('\n').filter(line => line.trim());
    
    const categories = {
      bugsFixed: [],
      featuresAdded: [],
      intelligenceUpdates: [],
      packageUpdates: [],
      testResults: [],
      deploymentDetails: [],
      developerComments: [],
      other: []
    };

    // Process each line
    lines.forEach((line, index) => {
      const entry = this.categorizeLine(line.trim(), index);
      if (entry) {
        categories[entry.category].push(entry.data);
      }
    });

    // Generate summary
    const summary = this.generateSummary(categories, success, duration);

    // Add deployment details if successful
    if (success) {
      this.addDeploymentSummary(categories, output, duration);
    }

    // Add test summary if tests were run
    this.addTestSummary(categories, output);

    return {
      summary,
      ...categories,
      rawOutput: output
    };
  }

  /**
   * Categorize a single line of output
   * @param {string} line - Line to categorize
   * @param {number} index - Line index
   * @returns {Object|null} Category and data or null
   */
  categorizeLine(line, index) {
    if (!line || line.length < 5) return null;

    // Check each category
    for (const [category, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          return {
            category: this.getCategoryKey(category),
            data: {
              type: category,
              message: this.cleanMessage(line),
              severity: this.getSeverity(line),
              timestamp: new Date().toISOString(),
              lineNumber: index + 1
            }
          };
        }
      }
    }

    // Check for webpack/build specific messages
    if (this.isBuildMessage(line)) {
      return {
        category: 'deploymentDetails',
        data: {
          type: 'deploy',
          message: this.cleanMessage(line),
          severity: 'low'
        }
      };
    }

    // Catch important uncategorized messages
    if (this.isImportantMessage(line)) {
      return {
        category: 'other',
        data: {
          type: 'other',
          message: this.cleanMessage(line),
          severity: this.getSeverity(line)
        }
      };
    }

    return null;
  }

  /**
   * Get category key for the categories object
   */
  getCategoryKey(category) {
    const mapping = {
      bug: 'bugsFixed',
      feature: 'featuresAdded',
      intelligence: 'intelligenceUpdates',
      package: 'packageUpdates',
      test: 'testResults',
      deploy: 'deploymentDetails',
      comment: 'developerComments'
    };
    return mapping[category] || 'other';
  }

  /**
   * Determine severity of a message
   */
  getSeverity(line) {
    for (const [severity, pattern] of Object.entries(this.severityPatterns)) {
      if (pattern.test(line)) return severity;
    }
    return 'low';
  }

  /**
   * Clean and format message
   */
  cleanMessage(line) {
    return line
      .replace(/^\s*\[.*?\]\s*/, '') // Remove timestamp prefixes
      .replace(/^\s*>\s*/, '') // Remove arrow prefixes
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI colors
      .trim();
  }

  /**
   * Check if line is a build-related message
   */
  isBuildMessage(line) {
    return /webpack|babel|typescript|eslint|prettier|vite|rollup/i.test(line) ||
           /compiled|bundling|minified|gzipped|asset/i.test(line) ||
           /\.js|\.tsx?|\.css|\.html|\.json/i.test(line);
  }

  /**
   * Check if message is important enough to include
   */
  isImportantMessage(line) {
    return line.length > 10 && 
           !/^\s*$/.test(line) &&
           !/^[\s\-\*\=]+$/.test(line) &&
           !line.includes('node_modules') &&
           !line.includes('webpack://');
  }

  /**
   * Generate build summary
   */
  generateSummary(categories, success, duration) {
    return {
      bugsFixed: categories.bugsFixed.length,
      featuresAdded: categories.featuresAdded.length,
      intelligenceUpdates: categories.intelligenceUpdates.length,
      packageUpdates: categories.packageUpdates.length,
      testsRun: categories.testResults.length,
      deploymentStatus: success ? 'success' : 'error',
      totalTime: duration,
      buildTime: formatTimestampUser(new Date()),
      linesProcessed: categories.bugsFixed.length + categories.featuresAdded.length + 
                     categories.intelligenceUpdates.length + categories.packageUpdates.length +
                     categories.testResults.length + categories.deploymentDetails.length +
                     categories.developerComments.length + categories.other.length
    };
  }

  /**
   * Add deployment summary details
   */
  addDeploymentSummary(categories, output, duration) {
    // Extract build statistics
    const chunkCount = (output.match(/chunk/gi) || []).length;
    const assetCount = (output.match(/asset/gi) || []).length;
    
    if (duration > 0) {
      categories.deploymentDetails.push({
        type: 'deploy',
        message: `📤 Build completed successfully in ${(duration / 1000).toFixed(1)}s`,
        severity: 'low'
      });
    }

    if (chunkCount > 0) {
      categories.deploymentDetails.push({
        type: 'deploy',
        message: `📦 Generated ${chunkCount} chunks for optimization`,
        severity: 'low'
      });
    }

    // Always add ready for deployment message
    categories.deploymentDetails.push({
      type: 'deploy',
      message: '🚀 Build ready for production deployment',
      severity: 'low'
    });
  }

  /**
   * Add test summary if tests were detected
   */
  addTestSummary(categories, output) {
    const testOutput = output.toLowerCase();
    
    // Look for common test patterns
    const passedMatch = testOutput.match(/(\d+)\s+passed/);
    const failedMatch = testOutput.match(/(\d+)\s+failed/);
    const totalMatch = testOutput.match(/(\d+)\s+total/);

    if (passedMatch || failedMatch || totalMatch) {
      const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
      const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed;

      if (total > 0) {
        categories.testResults.push({
          type: 'test',
          message: `🧪 Test Results: ${passed} passed, ${failed} failed (${total} total)`,
          severity: failed > 0 ? 'medium' : 'low'
        });
      }
    }
  }
}

module.exports = BuildOutputParser;