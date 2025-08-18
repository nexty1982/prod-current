const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');

// Create dedicated connection to OMAI error tracking database
const omaiPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: 'orthodoxmetrics_db',
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

/**
 * POST /api/errors/report-to-github
 * Create a GitHub issue for a critical/error log entry
 */
router.post('/report-to-github', [
  body('error_hash').notEmpty().withMessage('Error hash is required'),
  body('log_message').isLength({ min: 1, max: 500 }).withMessage('Log message required'),
  body('log_details').optional().isLength({ max: 2000 }).withMessage('Details too long'),
  body('log_level').isIn(['ERROR', 'CRITICAL']).withMessage('Only ERROR and CRITICAL logs can be reported'),
  body('source_component').optional().isLength({ max: 128 }).withMessage('Source component too long')
], async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      error_hash,
      log_message,
      log_details = '',
      log_level,
      source_component = 'Unknown',
      occurrence_count = 1
    } = req.body;

    // Check if GitHub issue already exists for this error
    const [existingIssue] = await getAppPool().query(
      'SELECT github_issue_url FROM errors WHERE hash = ? AND github_issue_url IS NOT NULL',
      [error_hash]
    );

    if (existingIssue.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'GitHub issue already exists for this error',
        github_url: existingIssue[0].github_issue_url
      });
    }

    // Create GitHub issue payload
    const issueTitle = `[${log_level}] ${log_message.substring(0, 80)}${log_message.length > 80 ? '...' : ''}`;
    const issueBody = `
## Error Details

**Level:** ${log_level}
**Component:** ${source_component}
**Occurrences:** ${occurrence_count}
**Hash:** \`${error_hash}\`

## Message
\`\`\`
${log_message}
\`\`\`

## Details
\`\`\`
${log_details || 'No additional details provided'}
\`\`\`

## Environment
- **Server:** ${process.env.NODE_ENV || 'development'}
- **Timestamp:** ${new Date().toISOString()}
- **Source:** OrthodoxMetrics OMAI Logger

## Priority
${log_level === 'CRITICAL' ? '🔴 **CRITICAL** - Immediate attention required' : '🟠 **ERROR** - Needs investigation'}

---
*This issue was automatically created by the OMAI Ultimate Logger system.*
`;

    // GitHub API configuration
    const githubConfig = {
      owner: process.env.GITHUB_REPO_OWNER || 'orthodoxmetrics',
      repo: process.env.GITHUB_REPO_NAME || 'error-tracking',
      token: process.env.GITHUB_TOKEN
    };

    if (!githubConfig.token) {
      return res.status(500).json({
        success: false,
        message: 'GitHub integration not configured'
      });
    }

    // Create GitHub issue
    const githubResponse = await fetch(`https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: [
          log_level.toLowerCase(),
          'auto-generated',
          'omai-logger',
          source_component.toLowerCase().replace(/[^a-z0-9]/g, '-')
        ]
      })
    });

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json();
      console.error('GitHub API Error:', errorData);
      return res.status(500).json({
        success: false,
        message: 'Failed to create GitHub issue',
        error: errorData.message
      });
    }

    const githubIssue = await githubResponse.json();
    const issueUrl = githubIssue.html_url;
    const issueNumber = githubIssue.number;

    // Update the errors table with GitHub issue URL
            await getAppPool().query(
      'UPDATE errors SET github_issue_url = ? WHERE hash = ?',
      [issueUrl, error_hash]
    );

    // Insert into github_issues tracking table
        await getAppPool().query(`
      INSERT INTO github_issues (
        error_hash,
        issue_number,
        issue_url,
        issue_title,
        issue_state
      ) VALUES (?, ?, ?, ?, 'open')
    `, [error_hash, issueNumber, issueUrl, issueTitle]);

    res.json({
      success: true,
      message: 'GitHub issue created successfully',
      github_url: issueUrl,
      issue_number: issueNumber,
      issue_title: issueTitle
    });

  } catch (error) {
    console.error('GitHub Issue Creation Error:', error);
    console.error('GitHub Issue Creation Stack:', error.stack);
    console.error('GitHub Issue Creation Request Body:', JSON.stringify(req.body, null, 2));
    
    // Log this error to the database as well
    try {
      const crypto = require('crypto');
      const errorHash = crypto.createHash('md5').update(`GitHub Issue Creation Error: ${error.message}`).digest('hex');
      await getAppPool().query(`
        INSERT INTO errors (
          hash, message, details, log_level, origin, source_component, type, first_seen, last_seen, occurrences
        ) VALUES (?, ?, ?, 'ERROR', 'server', 'GitHubIssueAPI', 'backend', NOW(), NOW(), 1)
        ON DUPLICATE KEY UPDATE 
        last_seen = NOW(), 
        occurrences = occurrences + 1
      `, [errorHash, `GitHub Issue Creation Error: ${error.message}`, error.stack || 'No stack trace']);
    } catch (dbError) {
      console.error('Failed to log GitHub Issue Creation error to database:', dbError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/errors/github-issues
 * Get all GitHub issues created for errors
 */
router.get('/github-issues', async (req, res) => {
  try {
    const [issues] = await getAppPool().query(`
      SELECT 
        gi.*,
        e.message as error_message,
        e.log_level,
        e.occurrences
      FROM github_issues gi
      JOIN errors e ON gi.error_hash = e.hash
      ORDER BY gi.created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      issues: issues
    });
  } catch (error) {
    console.error('GitHub Issues Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GitHub issues'
    });
  }
});

/**
 * PUT /api/errors/github-issues/:issueNumber/close
 * Mark a GitHub issue as closed
 */
router.put('/github-issues/:issueNumber/close', async (req, res) => {
  try {
    const { issueNumber } = req.params;

            await getAppPool().query(
      'UPDATE github_issues SET issue_state = ? WHERE issue_number = ?',
      ['closed', issueNumber]
    );

    res.json({
      success: true,
      message: `Issue #${issueNumber} marked as closed`
    });
  } catch (error) {
    console.error('GitHub Issue Close Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close GitHub issue'
    });
  }
});

module.exports = router;