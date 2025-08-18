const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const EncryptedStorage = require('../utils/encryptedStorage');
const QuestionnaireParser = require('../utils/questionnaireParser');
const OMAIPathDiscovery = require('../services/omaiPathDiscovery');

// Big Book configuration
const BIGBOOK_ROOT = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook';
const TEMP_DIR = path.join(BIGBOOK_ROOT, 'storage/cache');
const LOG_DIR = path.join(BIGBOOK_ROOT, 'logs');

// Initialize encrypted storage
const encryptedStorage = new EncryptedStorage();
let storageInitialized = false;

// Initialize OMAI Path Discovery
const omaiDiscovery = new OMAIPathDiscovery();

// Ensure directories exist
async function ensureDirectories() {
  const dirs = [BIGBOOK_ROOT, TEMP_DIR, LOG_DIR];
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

// Initialize encrypted storage if not already done
async function ensureEncryptedStorage() {
  if (!storageInitialized) {
    try {
      await encryptedStorage.initialize();
      storageInitialized = true;
    } catch (error) {
      console.error('Failed to initialize encrypted storage:', error);
      throw error;
    }
  }
}

// Log function
async function logToFile(filename, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  await fs.appendFile(path.join(LOG_DIR, filename), logMessage);
}

// Database connection helper
async function getDbConnection(settings) {
  return mysql.createConnection({
    host: 'localhost',
    user: settings.databaseUser || 'root',
    password: settings.databasePassword || '',
    database: settings.defaultDatabase || 'omai_db',
    multipleStatements: true
  });
}

// Execute SQL file
async function executeSqlFile(content, settings) {
  const connection = await getDbConnection(settings);
  
  try {
    const startTime = Date.now();
    const [results] = await getAppPool().query(content);
    const duration = Date.now() - startTime;
    
    await logToFile('execution.log', `SQL executed successfully in ${duration}ms`);
    
    return {
      success: true,
      output: `SQL executed successfully in ${duration}ms\nAffected rows: ${results.affectedRows || 'N/A'}`,
      duration,
      results
    };
  } catch (error) {
    await logToFile('execution.log', `SQL execution error: ${error.message}`);
    throw error;
  } finally {
    await connection.end();
  }
}

// Execute shell script
async function executeShellScript(content, settings) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(TEMP_DIR, `script_${uuidv4()}.sh`);
    const startTime = Date.now();
    
    // Create temporary script file
    fs.writeFile(tempFile, content, { mode: 0o755 })
      .then(() => {
        const command = settings.useSudo 
          ? `echo '${settings.sudoPassword}' | sudo -S ${tempFile}`
          : tempFile;
        
        const child = exec(command, {
          timeout: settings.timeout || 30000,
          cwd: process.cwd(),
          env: {
            ...process.env,
            DB_USER: settings.databaseUser,
            DB_PASSWORD: settings.databasePassword,
            DB_NAME: settings.defaultDatabase
          }
        }, async (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          
          // Clean up temp file
          try {
            await fs.unlink(tempFile);
          } catch (cleanupError) {
            console.error('Failed to cleanup temp file:', cleanupError);
          }
          
          if (error) {
            await logToFile('execution.log', `Shell script execution error: ${error.message}`);
            reject(error);
          } else {
            await logToFile('execution.log', `Shell script executed successfully in ${duration}ms`);
            resolve({
              success: true,
              output: stdout,
              error: stderr,
              duration
            });
          }
        });
        
        child.on('error', async (error) => {
          await logToFile('execution.log', `Shell script process error: ${error.message}`);
          reject(error);
        });
      })
      .catch(reject);
  });
}

// Execute JavaScript file
async function executeJavaScriptFile(content, settings) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(TEMP_DIR, `script_${uuidv4()}.js`);
    const startTime = Date.now();
    
    // Create temporary script file
    fs.writeFile(tempFile, content)
      .then(() => {
        const command = `node ${tempFile}`;
        
        const child = exec(command, {
          timeout: settings.timeout || 30000,
          cwd: process.cwd(),
          env: {
            ...process.env,
            DB_USER: settings.databaseUser,
            DB_PASSWORD: settings.databasePassword,
            DB_NAME: settings.defaultDatabase
          }
        }, async (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          
          // Clean up temp file
          try {
            await fs.unlink(tempFile);
          } catch (cleanupError) {
            console.error('Failed to cleanup temp file:', cleanupError);
          }
          
          if (error) {
            await logToFile('execution.log', `JavaScript execution error: ${error.message}`);
            reject(error);
          } else {
            await logToFile('execution.log', `JavaScript executed successfully in ${duration}ms`);
            resolve({
              success: true,
              output: stdout,
              error: stderr,
              duration
            });
          }
        });
        
        child.on('error', async (error) => {
          await logToFile('execution.log', `JavaScript process error: ${error.message}`);
          reject(error);
        });
      })
      .catch(reject);
  });
}

// Execute Python file
async function executePythonFile(content, settings) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(TEMP_DIR, `script_${uuidv4()}.py`);
    const startTime = Date.now();
    
    // Create temporary script file
    fs.writeFile(tempFile, content)
      .then(() => {
        const command = `python3 ${tempFile}`;
        
        const child = exec(command, {
          timeout: settings.timeout || 30000,
          cwd: process.cwd(),
          env: {
            ...process.env,
            DB_USER: settings.databaseUser,
            DB_PASSWORD: settings.databasePassword,
            DB_NAME: settings.defaultDatabase
          }
        }, async (error, stdout, stderr) => {
          const duration = Date.now() - startTime;
          
          // Clean up temp file
          try {
            await fs.unlink(tempFile);
          } catch (cleanupError) {
            console.error('Failed to cleanup temp file:', cleanupError);
          }
          
          if (error) {
            await logToFile('execution.log', `Python execution error: ${error.message}`);
            reject(error);
          } else {
            await logToFile('execution.log', `Python executed successfully in ${duration}ms`);
            resolve({
              success: true,
              output: stdout,
              error: stderr,
              duration
            });
          }
        });
        
        child.on('error', async (error) => {
          await logToFile('execution.log', `Python process error: ${error.message}`);
          reject(error);
        });
      })
      .catch(reject);
  });
}

// Process document files (markdown, text, etc.)
async function processDocumentFile(content, fileName, fileType) {
  const timestamp = new Date().toISOString();
  const docInfo = {
    fileName,
    fileType,
    contentLength: content.length,
    timestamp,
    processed: true
  };
  
  await logToFile('documents.log', `Document processed: ${fileName} (${fileType}) - ${content.length} characters`);
  
  return {
    success: true,
    output: `Document processed successfully\nFile: ${fileName}\nType: ${fileType}\nSize: ${content.length} characters\nTimestamp: ${timestamp}`,
    documentInfo: docInfo
  };
}

// Get file type from extension
function getFileTypeFromExtension(extension) {
  switch (extension.toLowerCase()) {
    case 'sql':
      return 'sql';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'javascript';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    case 'py':
    case 'python':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'sass':
      return 'css';
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    case 'txt':
    case 'log':
      return 'text';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return 'image';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return 'video';
    case 'mp3':
    case 'wav':
    case 'ogg':
      return 'audio';
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
      return 'archive';
    case 'pdf':
      return 'pdf';
    default:
      return 'other';
  }
}

// POST /api/bigbook/execute - Execute a file
router.post('/execute', async (req, res) => {
  try {
    await ensureDirectories();
    
    const { fileId, fileName, content, type, settings } = req.body;
    
    if (!content || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'File content and name are required'
      });
    }
    
    await logToFile('execution.log', `Starting execution: ${fileName} (${type})`);
    
    let result;
    
    if (type === 'sql') {
      result = await executeSqlFile(content, settings);
    } else if (type === 'shell') {
      result = await executeShellScript(content, settings);
    } else if (type === 'javascript') {
      result = await executeJavaScriptFile(content, settings);
    } else if (type === 'python') {
      result = await executePythonFile(content, settings);
    } else {
      result = await processDocumentFile(content, fileName, getFileTypeFromExtension(path.extname(fileName)));
    }
    
    // Store execution record in Big Book database
    try {
      const connection = await getDbConnection(settings);
      await getAppPool().query(`
        INSERT INTO bigbook_executions (doc_id, execution_type, status, duration_ms, output, error_message, executed_by, environment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        fileId,
        'manual',
        result.success ? 'success' : 'failed',
        result.duration,
        result.output || null,
        result.error || null,
        'admin',
        'production'
      ]);
      await connection.end();
    } catch (dbError) {
      console.error('Failed to log execution to database:', dbError);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Big Book execution error:', error);
    await logToFile('execution.log', `Execution error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Execution failed'
    });
  }
});

// POST /api/bigbook/settings - Save Big Book settings
router.post('/settings', async (req, res) => {
  try {
    await ensureDirectories();
    
    const settings = req.body;
    const settingsFile = path.join(BIGBOOK_ROOT, 'config/settings.json');
    
    // Save settings to file
    await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
    
    // Also save to database
    try {
      const connection = await getDbConnection(settings);
      
      // Clear existing settings
      await getAppPool().query('DELETE FROM bigbook_config WHERE config_key LIKE "user_%"');
      
      // Insert new settings
      const settingsToSave = [
        ['user_database_user', settings.databaseUser, 'string'],
        ['user_use_sudo', settings.useSudo.toString(), 'boolean'],
        ['user_default_database', settings.defaultDatabase, 'string'],
        ['user_script_timeout', settings.scriptTimeout.toString(), 'number'],
        ['user_max_file_size', settings.maxFileSize.toString(), 'number']
      ];
      
      for (const [key, value, type] of settingsToSave) {
        await getAppPool().query(`
          INSERT INTO bigbook_config (config_key, config_value, config_type, description, is_system)
          VALUES (?, ?, ?, ?, FALSE)
          ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
        `, [key, value, type, `User setting: ${key}`]);
      }
      
      await connection.end();
    } catch (dbError) {
      console.error('Failed to save settings to database:', dbError);
    }
    
    await logToFile('execution.log', 'Big Book settings saved');
    
    res.json({
      success: true,
      message: 'Settings saved successfully'
    });
    
  } catch (error) {
    console.error('Big Book settings error:', error);
    await logToFile('execution.log', `Settings error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save settings'
    });
  }
});

// GET /api/bigbook/settings - Get Big Book settings
router.get('/settings', async (req, res) => {
  try {
    await ensureDirectories();
    
    const settingsFile = path.join(BIGBOOK_ROOT, 'config/settings.json');
    
    try {
      const settingsData = await fs.readFile(settingsFile, 'utf8');
      const settings = JSON.parse(settingsData);
      res.json({
        success: true,
        settings
      });
    } catch (fileError) {
      // Return default settings if file doesn't exist
      const defaultSettings = {
        databaseUser: 'root',
        databasePassword: '',
        useSudo: true,
        sudoPassword: '',
        defaultDatabase: 'orthodoxmetrics_db',
        scriptTimeout: 30000,
        maxFileSize: 10485760
      };
      
      res.json({
        success: true,
        settings: defaultSettings
      });
    }
    
  } catch (error) {
    console.error('Big Book get settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get settings'
    });
  }
});

// POST /api/bigbook/process-all - Process all uploaded .md files
router.post('/process-all', async (req, res) => {
  try {
    await ensureDirectories();
    
    const { useSecureStorage = true, retryOnFailure = true } = req.body;
    const results = {
      success: true,
      processedFiles: [],
      failedFiles: [],
      secureStorage: {
        mounted: false,
        mountPath: '/mnt/bigbook_secure',
        retryCount: 0
      },
      summary: {
        totalFiles: 0,
        processedCount: 0,
        failedCount: 0,
        startTime: new Date().toISOString()
      }
    };

    await logToFile('process-all.log', 'Starting batch file processing...');

    // Step 1: Handle encrypted storage mounting if requested
    if (useSecureStorage) {
      results.secureStorage.mounted = await mountSecureStorage(results.secureStorage, retryOnFailure);
      
      if (!results.secureStorage.mounted) {
        await logToFile('process-all.log', 'Warning: Continuing without secure storage');
      }
    }

    // Step 2: Get all .md files from upload cache
    const uploadCacheDir = path.join(TEMP_DIR, 'uploads');
    let mdFiles = [];
    
    try {
      await fs.access(uploadCacheDir);
      const files = await fs.readdir(uploadCacheDir);
      mdFiles = files.filter(file => file.endsWith('.md'));
    } catch (error) {
      await logToFile('process-all.log', `Upload cache directory not found: ${error.message}`);
    }

    results.summary.totalFiles = mdFiles.length;
    await logToFile('process-all.log', `Found ${mdFiles.length} .md files to process`);

    // Step 3: Process each .md file
    for (const fileName of mdFiles) {
      const filePath = path.join(uploadCacheDir, fileName);
      const fileResult = {
        fileName,
        success: false,
        error: null,
        size: 0,
        processedAt: new Date().toISOString(),
        securelyStored: false
      };

      try {
        // Get file stats
        const stats = await fs.stat(filePath);
        fileResult.size = stats.size;

        // Read and process the file
        const content = await fs.readFile(filePath, 'utf8');
        const processResult = await processMarkdownFile(content, fileName);
        
        if (processResult.success) {
          fileResult.success = true;
          
          // Move to secure storage if available
          if (results.secureStorage.mounted) {
            try {
              const secureFilePath = path.join(results.secureStorage.mountPath, fileName);
              await fs.copyFile(filePath, secureFilePath);
              await fs.unlink(filePath); // Remove from cache after successful copy
              fileResult.securelyStored = true;
              await logToFile('process-all.log', `${fileName}: Moved to secure storage`);
            } catch (storageError) {
              await logToFile('process-all.log', `${fileName}: Failed to move to secure storage: ${storageError.message}`);
            }
          }
          
          results.processedFiles.push(fileResult);
          results.summary.processedCount++;
          await logToFile('process-all.log', `${fileName}: Processed successfully (${fileResult.size} bytes)`);
        } else {
          fileResult.error = processResult.error || 'Processing failed';
          results.failedFiles.push(fileResult);
          results.summary.failedCount++;
          await logToFile('process-all.log', `${fileName}: Processing failed - ${fileResult.error}`);
        }
      } catch (error) {
        fileResult.error = error.message;
        results.failedFiles.push(fileResult);
        results.summary.failedCount++;
        await logToFile('process-all.log', `${fileName}: Error - ${error.message}`);
      }
    }

    results.summary.endTime = new Date().toISOString();
    const duration = new Date(results.summary.endTime) - new Date(results.summary.startTime);
    results.summary.durationMs = duration;

    await logToFile('process-all.log', 
      `Batch processing completed: ${results.summary.processedCount}/${results.summary.totalFiles} files processed in ${duration}ms`);

    res.json(results);

  } catch (error) {
    console.error('Batch processing error:', error);
    await logToFile('process-all.log', `Batch processing error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Batch processing failed'
    });
  }
});

// POST /api/bigbook/test-secure-mount - Test encrypted storage mount
router.post('/test-secure-mount', async (req, res) => {
  try {
    const mountPath = '/mnt/bigbook_secure';
    const testResult = {
      mountPath,
      accessible: false,
      writable: false,
      error: null,
      testTime: new Date().toISOString()
    };

    try {
      // Test if mount path exists and is accessible
      await fs.access(mountPath);
      testResult.accessible = true;

      // Test if writable
      const testFile = path.join(mountPath, `.test-write-${Date.now()}.tmp`);
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      testResult.writable = true;

      await logToFile('mount-test.log', `Secure storage test passed: ${mountPath}`);
    } catch (error) {
      testResult.error = error.message;
      await logToFile('mount-test.log', `Secure storage test failed: ${error.message}`);
    }

    res.json({
      success: true,
      testResult
    });

  } catch (error) {
    console.error('Mount test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Mount test failed'
    });
  }
});

// Helper function to mount secure storage with retry logic
async function mountSecureStorage(storageInfo, retryOnFailure = true) {
  const maxRetries = retryOnFailure ? 3 : 1;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    storageInfo.retryCount = attempt;
    
    try {
      // Check if already mounted
      const testPath = path.join(storageInfo.mountPath, '.mount-test');
      try {
        await fs.access(storageInfo.mountPath);
        await fs.writeFile(testPath, 'test');
        await fs.unlink(testPath);
        await logToFile('mount.log', `Secure storage already mounted: ${storageInfo.mountPath}`);
        return true;
      } catch (e) {
        // Not mounted or not writable, proceed with mount attempt
      }

      // Attempt to mount
      const mountCommand = `mount -t ecryptfs ${BIGBOOK_ROOT}/encrypted ${storageInfo.mountPath} -o key=passphrase,ecryptfs_cipher=aes,ecryptfs_key_bytes=32,ecryptfs_passthrough=no,ecryptfs_enable_filename_crypto=yes,passwd=${process.env.BIGBOOK_ENCRYPTION_KEY || 'default_key'}`;
      
      await logToFile('mount.log', `Mount attempt ${attempt}/${maxRetries}: ${storageInfo.mountPath}`);
      
      await new Promise((resolve, reject) => {
        exec(mountCommand, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Mount failed: ${error.message}\nStderr: ${stderr}`));
          } else {
            resolve(stdout);
          }
        });
      });

      // Verify mount was successful
      await fs.writeFile(testPath, 'test');
      await fs.unlink(testPath);
      
      await logToFile('mount.log', `Secure storage mounted successfully on attempt ${attempt}`);
      return true;

    } catch (error) {
      await logToFile('mount.log', `Mount attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        await logToFile('mount.log', `Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        await logToFile('mount.log', `All mount attempts failed. Continuing without secure storage.`);
      }
    }
  }
  
  return false;
}

// Helper function to process markdown files
async function processMarkdownFile(content, fileName) {
  try {
    // Initialize encrypted storage if needed
    await ensureEncryptedStorage();

    // Process the markdown content
    const fileType = getFileTypeFromContent(content);
    let processResult;

    if (fileType === 'questionnaire') {
      // Use questionnaire parser
      const parser = new QuestionnaireParser();
      processResult = await parser.parseMarkdown(content);
    } else {
      // Generic document processing
      processResult = await processDocumentFile(content, fileName, 'markdown');
    }

    // Store in database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'omai_db'
    });

    try {
      const docId = uuidv4();
      await getAppPool().query(`
        INSERT INTO bigbook_documents (id, filename, content_type, file_size, status, created_at, processed_at)
        VALUES (?, ?, ?, ?, 'processed', NOW(), NOW())
      `, [docId, fileName, fileType, content.length]);

      await connection.end();
    } catch (dbError) {
      console.error('Database storage failed:', dbError);
      // Continue processing even if DB storage fails
    }

    return {
      success: true,
      type: fileType,
      result: processResult
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to detect file type from content
function getFileTypeFromContent(content) {
  if (content.includes('# Questionnaire') || content.includes('## Questions')) {
    return 'questionnaire';
  } else if (content.includes('```sql')) {
    return 'sql-document';
  } else if (content.includes('```javascript') || content.includes('```js')) {
    return 'javascript-document';
  } else if (content.includes('```python')) {
    return 'python-document';
  } else {
    return 'markdown';
  }
}

// GET /api/bigbook/status - Get Big Book system status
router.get('/status', async (req, res) => {
  try {
    await ensureDirectories();
    
    const status = {
      system: {
        bigbookRoot: BIGBOOK_ROOT,
        tempDir: TEMP_DIR,
        logDir: LOG_DIR,
        directoriesExist: true
      },
      database: {
        connected: false,
        tablesExist: false
      },
      files: {
        totalDocuments: 0,
        recentExecutions: 0
      }
    };
    
    // Check database connection
    try {
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'omai_db'
      });
      
      const [tables] = await getAppPool().query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'omai_db' 
        AND table_name LIKE 'bigbook_%'
      `);
      
      status.database.connected = true;
      status.database.tablesExist = tables[0].count > 0;
      
      // Get document count
      const [docCount] = await getAppPool().query('SELECT COUNT(*) as count FROM bigbook_documents');
      status.files.totalDocuments = docCount[0].count;
      
      // Get recent executions
      const [execCount] = await getAppPool().query(`
        SELECT COUNT(*) as count 
        FROM bigbook_executions 
        WHERE executed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);
      status.files.recentExecutions = execCount[0].count;
      
      await connection.end();
    } catch (dbError) {
      console.error('Database status check failed:', dbError);
    }
    
    res.json({
      success: true,
      status
    });
    
  } catch (error) {
    console.error('Big Book status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status'
    });
  }
});

// GET /api/bigbook/logs - Get recent logs
router.get('/logs', async (req, res) => {
  try {
    await ensureDirectories();
    
    const { type = 'execution', lines = 50 } = req.query;
    const logFile = path.join(LOG_DIR, `${type}.log`);
    
    try {
      const logContent = await fs.readFile(logFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim()).slice(-lines);
      
      res.json({
        success: true,
        logs: logLines,
        type,
        totalLines: logLines.length
      });
    } catch (fileError) {
      res.json({
        success: true,
        logs: [],
        type,
        totalLines: 0
      });
    }
    
  } catch (error) {
    console.error('Big Book logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get logs'
    });
  }
});

// POST /api/bigbook/upload - Upload file to Big Book encrypted storage
router.post('/upload', async (req, res) => {
  try {
    await ensureDirectories();
    await ensureEncryptedStorage();
    
    const { fileName, content, fileType } = req.body;
    
    if (!fileName || !content) {
      return res.status(400).json({
        success: false,
        error: 'File name and content are required'
      });
    }
    
    const fileId = uuidv4();
    
    // Check if this is a questionnaire file
    let questionnaireMetadata = null;
    if (path.extname(fileName).toLowerCase() === '.tsx') {
      questionnaireMetadata = QuestionnaireParser.parseQuestionnaire(fileName, content);
      
      if (questionnaireMetadata) {
        // Validate content for security
        const validation = QuestionnaireParser.validateContent(content);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Questionnaire validation failed',
            issues: validation.issues,
            warnings: validation.warnings
          });
        }
        
        // Log questionnaire detection
        await logToFile('execution.log', `Questionnaire detected: ${fileName} -> ${questionnaireMetadata.title} (${questionnaireMetadata.ageGroup})`);
      }
    }
    
    // Store file in encrypted storage
    const storageResult = await encryptedStorage.storeFile(fileId, fileName, content, fileType);
    
    // Log upload
    await logToFile('execution.log', `File uploaded to encrypted storage: ${fileName} -> ${storageResult.encryptedPath}`);
    
    res.json({
      success: true,
      fileId,
      encryptedPath: storageResult.encryptedPath,
      originalName: storageResult.originalName,
      fileType: storageResult.fileType,
      isQuestionnaire: !!questionnaireMetadata,
      questionnaireMetadata: questionnaireMetadata,
      message: 'File uploaded to encrypted storage successfully'
    });
    
  } catch (error) {
    console.error('Big Book upload error:', error);
    await logToFile('execution.log', `Upload error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// GET /api/bigbook/storage/status - Get encrypted storage status
router.get('/storage/status', async (req, res) => {
  try {
    await ensureEncryptedStorage();
    const status = await encryptedStorage.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Storage status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get storage status'
    });
  }
});

// GET /api/bigbook/storage/files - List files in encrypted storage
router.get('/storage/files', async (req, res) => {
  try {
    await ensureEncryptedStorage();
    const files = await encryptedStorage.listFiles();
    
    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Storage files list error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list files'
    });
  }
});

// GET /api/bigbook/storage/file/:fileId - Retrieve file from encrypted storage
router.get('/storage/file/:fileId', async (req, res) => {
  try {
    await ensureEncryptedStorage();
    
    const { fileId } = req.params;
    const { encryptedPath } = req.query;
    
    if (!encryptedPath) {
      return res.status(400).json({
        success: false,
        error: 'Encrypted path is required'
      });
    }
    
    const content = await encryptedStorage.retrieveFile(fileId, encryptedPath);
    
    res.json({
      success: true,
      fileId,
      content,
      retrievedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve file'
    });
  }
});

// DELETE /api/bigbook/storage/file/:fileId - Delete file from encrypted storage
router.delete('/storage/file/:fileId', async (req, res) => {
  try {
    await ensureEncryptedStorage();
    
    const { fileId } = req.params;
    const { encryptedPath } = req.query;
    
    if (!encryptedPath) {
      return res.status(400).json({
        success: false,
        error: 'Encrypted path is required'
      });
    }
    
    await encryptedStorage.deleteFile(encryptedPath);
    
    res.json({
      success: true,
      fileId,
      message: 'File deleted from encrypted storage successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete file'
    });
  }
});

// POST /api/bigbook/storage/mount - Mount encrypted volume
router.post('/storage/mount', async (req, res) => {
  try {
    await ensureEncryptedStorage();
    
    res.json({
      success: true,
      message: 'Encrypted volume mounted successfully'
    });
  } catch (error) {
    console.error('Mount error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mount encrypted volume'
    });
  }
});

// POST /api/bigbook/storage/unmount - Unmount encrypted volume
router.post('/storage/unmount', async (req, res) => {
  try {
    await encryptedStorage.unmountEncryptedVolume();
    
    res.json({
      success: true,
      message: 'Encrypted volume unmounted successfully'
    });
  } catch (error) {
    console.error('Unmount error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unmount encrypted volume'
    });
  }
});

// POST /api/bigbook/storage/rotate-key - Rotate encryption key
router.post('/storage/rotate-key', async (req, res) => {
  try {
    await ensureEncryptedStorage();
    await encryptedStorage.rotateKey();
    
    res.json({
      success: true,
      message: 'Encryption key rotated successfully'
    });
  } catch (error) {
    console.error('Key rotation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rotate encryption key'
    });
  }
});

// POST /api/bigbook/submit-response - Submit questionnaire response
router.post('/submit-response', async (req, res) => {
  try {
    const { 
      questionnaireId, 
      userId, 
      responses, 
      ageGroup, 
      questionnaireTitle, 
      progressPercent, 
      isCompleted 
    } = req.body;
    
    if (!questionnaireId || !responses) {
      return res.status(400).json({
        success: false,
        error: 'Questionnaire ID and responses are required'
      });
    }
    
    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'orthodoxmetrics_db'
    });
    
    try {
      // Check if response already exists
      const [existingResponse] = await getAppPool().query(
        'SELECT id, responses, progress_percent FROM omai_survey_responses WHERE questionnaire_id = ? AND user_id = ?',
        [questionnaireId, userId || null]
      );
      
      if (existingResponse.length > 0) {
        // Update existing response
        const updateQuery = `
          UPDATE omai_survey_responses 
          SET responses = ?, 
              progress_percent = ?, 
              is_completed = ?, 
              completed_at = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        await getAppPool().query(updateQuery, [
          JSON.stringify(responses),
          progressPercent || 0,
          isCompleted || false,
          isCompleted ? new Date() : null,
          existingResponse[0].id
        ]);
        
        await logToFile('questionnaire.log', `Updated questionnaire response: ${questionnaireId} for user ${userId || 'anonymous'}`);
        
        res.json({
          success: true,
          responseId: existingResponse[0].id,
          action: 'updated',
          message: 'Response updated successfully'
        });
      } else {
        // Insert new response
        const insertQuery = `
          INSERT INTO omai_survey_responses 
          (questionnaire_id, user_id, responses, age_group, questionnaire_title, progress_percent, is_completed, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await getAppPool().query(insertQuery, [
          questionnaireId,
          userId || null,
          JSON.stringify(responses),
          ageGroup || null,
          questionnaireTitle || null,
          progressPercent || 0,
          isCompleted || false,
          isCompleted ? new Date() : null
        ]);
        
        await logToFile('questionnaire.log', `New questionnaire response: ${questionnaireId} for user ${userId || 'anonymous'} (ID: ${result.insertId})`);
        
        res.json({
          success: true,
          responseId: result.insertId,
          action: 'created',
          message: 'Response saved successfully'
        });
      }
    } finally {
      await connection.end();
    }
    
  } catch (error) {
    console.error('Questionnaire response submission error:', error);
    await logToFile('questionnaire.log', `Response submission error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save response'
    });
  }
});

// GET /api/bigbook/responses/:questionnaireId - Get responses for a questionnaire
router.get('/responses/:questionnaireId', async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const { userId } = req.query;
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'orthodoxmetrics_db'
    });
    
    try {
      let query = 'SELECT * FROM omai_survey_responses WHERE questionnaire_id = ?';
      let params = [questionnaireId];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [responses] = await getAppPool().query(query, params);
      
      res.json({
        success: true,
        responses: responses.map(response => ({
          ...response,
          responses: JSON.parse(response.responses)
        }))
      });
    } finally {
      await connection.end();
    }
    
  } catch (error) {
    console.error('Get questionnaire responses error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve responses'
    });
  }
});

// =====================================================
// OMAI PATH DISCOVERY ENDPOINTS
// =====================================================

/**
 * Initialize OMAI path discovery system
 * POST /api/bigbook/omai/initialize
 */
router.post('/omai/initialize', async (req, res) => {
  try {
    await logToFile('execution.log', 'OMAI Path Discovery initialization requested');
    
    const result = await omaiDiscovery.initialize();
    
    res.json({
      success: true,
      message: 'OMAI Path Discovery system initialized successfully',
      initialized: result,
      timestamp: new Date().toISOString()
    });
    
    await logToFile('execution.log', 'OMAI Path Discovery initialization completed');
  } catch (error) {
    await logToFile('execution.log', `OMAI Path Discovery initialization failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize OMAI Path Discovery system',
      details: error.message
    });
  }
});

/**
 * Start OMAI file discovery process
 * POST /api/bigbook/omai/discover
 */
router.post('/omai/discover', async (req, res) => {
  try {
    await logToFile('execution.log', 'OMAI file discovery process started');
    
    // Start discovery in background
    omaiDiscovery.discoverFiles().then(result => {
      logToFile('execution.log', `OMAI file discovery completed: ${result.processedFiles} files processed`);
    }).catch(error => {
      logToFile('execution.log', `OMAI file discovery failed: ${error.message}`);
    });
    
    res.json({
      success: true,
      message: 'OMAI file discovery process started',
      status: 'running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await logToFile('execution.log', `OMAI file discovery start failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to start OMAI file discovery',
      details: error.message
    });
  }
});

/**
 * Get OMAI discovery status
 * GET /api/bigbook/omai/status
 */
router.get('/omai/status', async (req, res) => {
  try {
    const status = await omaiDiscovery.getStatus();
    
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get OMAI discovery status',
      details: error.message
    });
  }
});

/**
 * Get Big Book index
 * GET /api/bigbook/omai/index
 */
router.get('/omai/index', async (req, res) => {
  try {
    const indexPath = path.join('/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook', 'bigbook-index.json');
    
    try {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      const index = JSON.parse(indexContent);
      
      res.json({
        success: true,
        index: index,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          success: true,
          index: null,
          message: 'Big Book index not found. Run discovery first.',
          timestamp: new Date().toISOString()
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get Big Book index',
      details: error.message
    });
  }
});

/**
 * Get files by category
 * GET /api/bigbook/omai/category/:category
 */
router.get('/omai/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const indexPath = path.join('/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook', 'bigbook-index.json');
    
    const indexContent = await fs.readFile(indexPath, 'utf8');
    const index = JSON.parse(indexContent);
    
    const categoryKey = Object.keys(index.categories).find(key => 
      key.toLowerCase().replace(/[^a-z0-9]/g, '_') === category.toLowerCase()
    );
    
    if (!categoryKey) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        availableCategories: Object.keys(index.categories)
      });
    }
    
    const categoryData = index.categories[categoryKey];
    
    res.json({
      success: true,
      category: categoryKey,
      files: categoryData.files,
      count: categoryData.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get category files',
      details: error.message
    });
  }
});

/**
 * Get file metadata
 * GET /api/bigbook/omai/file/:fileId
 */
router.get('/omai/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const metadataPath = path.join('/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/metadata', `${fileId}.json`);
    
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    res.json({
      success: true,
      file: metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: 'File metadata not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get file metadata',
        details: error.message
      });
    }
  }
});

/**
 * Read file content (with security redaction)
 * GET /api/bigbook/omai/file/:fileId/content
 */
router.get('/omai/file/:fileId/content', async (req, res) => {
  try {
    const { fileId } = req.params;
    const metadataPath = path.join('/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/metadata', `${fileId}.json`);
    
    // Get file metadata
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    // Read original file content
    let content = await fs.readFile(metadata.originalPath, 'utf8');
    
    // Apply security redaction if needed
    if (metadata.metadata.security.hasSecurityIssues && metadata.metadata.security.redactedContent) {
      content = metadata.metadata.security.redactedContent;
    }
    
    res.json({
      success: true,
      fileId: fileId,
      fileName: metadata.name,
      content: content,
      securityRedacted: metadata.metadata.security.hasSecurityIssues,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to read file content',
        details: error.message
      });
    }
  }
});

/**
 * Schedule periodic discovery
 * POST /api/bigbook/omai/schedule
 */
router.post('/omai/schedule', async (req, res) => {
  try {
    const { intervalHours = 24 } = req.body;
    
    await logToFile('execution.log', `OMAI periodic discovery scheduled for every ${intervalHours} hours`);
    
    // Schedule discovery (this would be better handled by a background service)
    omaiDiscovery.scheduleDiscovery(intervalHours).catch(error => {
      logToFile('execution.log', `OMAI scheduled discovery error: ${error.message}`);
    });
    
    res.json({
      success: true,
      message: `OMAI discovery scheduled every ${intervalHours} hours`,
      intervalHours: intervalHours,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await logToFile('execution.log', `OMAI discovery scheduling failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule OMAI discovery',
      details: error.message
    });
  }
});

/**
 * Get discovery summary
 * GET /api/bigbook/omai/summary
 */
router.get('/omai/summary', async (req, res) => {
  try {
    const summaryPath = path.join('/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook', 'discovery-summary.json');
    
    try {
      const summaryContent = await fs.readFile(summaryPath, 'utf8');
      const summary = JSON.parse(summaryContent);
      
      res.json({
        success: true,
        summary: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          success: true,
          summary: null,
          message: 'Discovery summary not found. Run discovery first.',
          timestamp: new Date().toISOString()
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get discovery summary',
      details: error.message
    });
  }
});

// =====================================================
// PARISH MAP AUTO-INSTALL SYSTEM
// =====================================================

const multer = require('multer');
const AdmZip = require('adm-zip');
const { authMiddleware: authenticate, requireRole: authorize } = require('../middleware/auth');

// Configure multer for zip file uploads
const upload = multer({
  dest: path.join(TEMP_DIR, 'uploads'),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow zip files
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'), false);
    }
  }
});

/**
 * Upload and auto-install Parish Map component
 * POST /api/bigbook/upload-parish-map
 */
router.post('/upload-parish-map', authenticate, authorize(['super_admin']), upload.single('parishMapZip'), async (req, res) => {
  let tempFilePath = null;
  let extractPath = null;
  
  try {
    await ensureDirectories();
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No zip file uploaded'
      });
    }
    
    tempFilePath = req.file.path;
    const originalName = req.file.originalname;
    
    await logToFile('parish-map.log', `Parish Map zip upload started: ${originalName} by ${req.user?.username || 'unknown'}`);
    
    // Security check: Validate file is actually a zip
    if (!originalName.toLowerCase().endsWith('.zip')) {
      throw new Error('File must have .zip extension');
    }
    
    // Extract zip file
    const zip = new AdmZip(tempFilePath);
    const zipEntries = zip.getEntries();
    
    // Validate zip contents
    const validation = validateParishMapZip(zipEntries);
    if (!validation.isValid) {
      throw new Error(`Invalid Parish Map zip: ${validation.errors.join(', ')}`);
    }
    
    // Extract to target directory (use development-friendly path)
    const addonsBaseDir = process.env.NODE_ENV === 'production' 
      ? '/var/www/orthodoxmetrics/addons' 
      : path.join(__dirname, '../../misc/public/addons');
    
    extractPath = path.join(addonsBaseDir, 'parish-map');
    await fs.mkdir(extractPath, { recursive: true });
    
    // Security check: Prevent path traversal during extraction
    for (const entry of zipEntries) {
      const entryPath = entry.entryName;
      
      // Check for path traversal attempts
      if (entryPath.includes('..') || 
          entryPath.includes('/') && !entryPath.startsWith('parish-map/') ||
          path.isAbsolute(entryPath)) {
        throw new Error(`Suspicious file path detected: ${entryPath}`);
      }
      
      // Extract file safely
      const targetPath = path.join(extractPath, path.basename(entryPath));
      const content = entry.getData();
      
      // Create subdirectories if needed
      if (entryPath.includes('/')) {
        const dirPath = path.dirname(targetPath);
        await fs.mkdir(dirPath, { recursive: true });
      }
      
      await fs.writeFile(targetPath, content);
    }
    
    await logToFile('parish-map.log', `Parish Map extracted to: ${extractPath}`);
    
    // Validate extracted content
    const extractedValidation = await validateExtractedParishMap(extractPath);
    if (!extractedValidation.isValid) {
      throw new Error(`Extracted content validation failed: ${extractedValidation.errors.join(', ')}`);
    }
    
    // Read package.json for metadata
    const packageJsonPath = path.join(extractPath, 'package.json');
    let packageInfo = {};
    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      packageInfo = JSON.parse(packageContent);
    } catch (error) {
      await logToFile('parish-map.log', `Warning: Could not read package.json: ${error.message}`);
    }
    
    // Update addons configuration (flexible paths for dev/prod)
    const configsBaseDir = process.env.NODE_ENV === 'production' 
      ? '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/configs' 
      : path.join(__dirname, '../../configs');
    
    const addonsConfigPath = path.join(configsBaseDir, 'addons.json');
    const addonConfig = {
      component: 'ParishMap',
      entry: '/addons/parish-map/index.js',
      displayName: packageInfo.displayName || 'Orthodox Parish Map',
      description: packageInfo.description || 'Interactive parish mapping component',
      version: packageInfo.version || '1.0.0',
      route: '/addons/parish-map',
      showInMenu: true,
      installedAt: new Date().toISOString(),
      installedBy: req.user?.username || 'admin'
    };
    
    // Ensure configs directory exists
    await fs.mkdir(configsBaseDir, { recursive: true });
    await updateAddonsConfig(addonsConfigPath, 'parish-map', addonConfig);
    await logToFile('parish-map.log', `Addon configuration updated: ${addonsConfigPath}`);
    
    // Update Big Book Components Index (flexible paths for dev/prod)
    const bigbookBaseDir = process.env.NODE_ENV === 'production' 
      ? '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook' 
      : path.join(__dirname, '../../bigbook');
    
    const indexPath = path.join(bigbookBaseDir, 'BIG_BOOK_COMPONENTS_INDEX.md');
    
    // Ensure bigbook directory exists
    await fs.mkdir(bigbookBaseDir, { recursive: true });
    await updateBigBookIndex(indexPath, addonConfig);
    await logToFile('parish-map.log', `Big Book index updated: ${indexPath}`);
    
    // Clean up temp file
    if (tempFilePath) {
      await fs.unlink(tempFilePath);
    }
    
    await logToFile('parish-map.log', `Parish Map installation completed successfully`);
    
    res.json({
      success: true,
      message: 'Parish Map installed successfully',
      addon: addonConfig,
      extractPath: extractPath,
      files: zipEntries.map(entry => entry.entryName),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Parish Map installation error:', error);
    await logToFile('parish-map.log', `Installation error: ${error.message}`);
    
    // Clean up on error
    try {
      if (tempFilePath) {
        await fs.unlink(tempFilePath);
      }
      if (extractPath && await fs.access(extractPath).then(() => true).catch(() => false)) {
        await fs.rmdir(extractPath, { recursive: true });
      }
    } catch (cleanupError) {
      await logToFile('parish-map.log', `Cleanup error: ${cleanupError.message}`);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Parish Map installation failed'
    });
  }
});

/**
 * Validate Parish Map zip contents
 */
function validateParishMapZip(zipEntries) {
  const validation = {
    isValid: false,
    errors: [],
    warnings: []
  };
  
  const requiredFiles = ['index.js', 'package.json'];
  const foundFiles = zipEntries.map(entry => path.basename(entry.entryName));
  
  // Check for required files
  for (const required of requiredFiles) {
    if (!foundFiles.includes(required)) {
      validation.errors.push(`Missing required file: ${required}`);
    }
  }
  
  // Check for suspicious files
  for (const entry of zipEntries) {
    const fileName = entry.entryName.toLowerCase();
    
    // Check for executable files
    if (fileName.endsWith('.exe') || fileName.endsWith('.sh') || fileName.endsWith('.bat')) {
      validation.errors.push(`Executable files not allowed: ${entry.entryName}`);
    }
    
    // Check for hidden files (except common ones)
    if (fileName.startsWith('.') && 
        !fileName.startsWith('.git') && 
        !fileName.startsWith('.npm')) {
      validation.warnings.push(`Hidden file detected: ${entry.entryName}`);
    }
  }
  
  validation.isValid = validation.errors.length === 0;
  return validation;
}

/**
 * Validate extracted Parish Map content
 */
async function validateExtractedParishMap(extractPath) {
  const validation = {
    isValid: false,
    errors: [],
    warnings: []
  };
  
  try {
    // Check index.js exists and is valid
    const indexPath = path.join(extractPath, 'index.js');
    if (await fs.access(indexPath).then(() => true).catch(() => false)) {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      
      // Basic React component validation
      if (!indexContent.includes('React') && !indexContent.includes('export')) {
        validation.warnings.push('index.js may not be a valid React component');
      }
    } else {
      validation.errors.push('index.js not found after extraction');
    }
    
    // Check package.json
    const packagePath = path.join(extractPath, 'package.json');
    if (await fs.access(packagePath).then(() => true).catch(() => false)) {
      try {
        const packageContent = await fs.readFile(packagePath, 'utf8');
        JSON.parse(packageContent); // Validate JSON
      } catch (error) {
        validation.errors.push('package.json is not valid JSON');
      }
    } else {
      validation.warnings.push('package.json not found');
    }
    
    validation.isValid = validation.errors.length === 0;
    
  } catch (error) {
    validation.errors.push(`Validation error: ${error.message}`);
  }
  
  return validation;
}

/**
 * Update addons configuration file
 */
async function updateAddonsConfig(configPath, addonId, addonConfig) {
  try {
    // Ensure config directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    
    let addonsConfig = {};
    
    // Read existing config if it exists
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      addonsConfig = JSON.parse(configContent);
    } catch (error) {
      // Create new config if file doesn't exist
      addonsConfig = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        addons: {}
      };
    }
    
    // Add/update addon
    addonsConfig.addons[addonId] = addonConfig;
    addonsConfig.lastUpdated = new Date().toISOString();
    
    // Write updated config
    await fs.writeFile(configPath, JSON.stringify(addonsConfig, null, 2));
    
  } catch (error) {
    throw new Error(`Failed to update addons config: ${error.message}`);
  }
}

/**
 * Update Big Book Components Index
 */
async function updateBigBookIndex(indexPath, addonConfig) {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    
    let indexContent = '';
    
    // Read existing index if it exists
    try {
      indexContent = await fs.readFile(indexPath, 'utf8');
    } catch (error) {
      // Create new index if file doesn't exist
      indexContent = `# Big Book Components Index

This file contains links to all installed components and addons.

## Auto-Installed Components

`;
    }
    
    // Create markdown link for the new component
    const markdownLink = `[🗺️ ${addonConfig.displayName}](${addonConfig.route})`;
    const linkLine = `${markdownLink} - ${addonConfig.description || 'No description'}`;
    
    // Check if component link already exists
    if (!indexContent.includes(markdownLink)) {
      // Add to Auto-Installed Components section
      const sectionMarker = '## Auto-Installed Components';
      if (indexContent.includes(sectionMarker)) {
        indexContent = indexContent.replace(
          sectionMarker,
          `${sectionMarker}\n\n${linkLine}`
        );
      } else {
        indexContent += `\n\n## Auto-Installed Components\n\n${linkLine}`;
      }
    }
    
    // Write updated index
    await fs.writeFile(indexPath, indexContent);
    
  } catch (error) {
    throw new Error(`Failed to update Big Book index: ${error.message}`);
  }
}

/**
 * Get installed addons
 * GET /api/bigbook/addons
 */
router.get('/addons', authenticate, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const addonsConfigPath = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/configs/addons.json';
    
    try {
      const configContent = await fs.readFile(addonsConfigPath, 'utf8');
      const addonsConfig = JSON.parse(configContent);
      
      res.json({
        success: true,
        addons: addonsConfig.addons || {},
        version: addonsConfig.version,
        lastUpdated: addonsConfig.lastUpdated
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          success: true,
          addons: {},
          message: 'No addons installed yet'
        });
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Get addons error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get addons'
    });
  }
});

/**
 * Uninstall addon
 * DELETE /api/bigbook/addons/:addonId
 */
router.delete('/addons/:addonId', authenticate, authorize(['super_admin']), async (req, res) => {
  try {
    const { addonId } = req.params;
    
    await logToFile('parish-map.log', `Addon uninstall requested: ${addonId} by ${req.user?.username || 'unknown'}`);
    
    // Read current addons config
    const addonsConfigPath = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/configs/addons.json';
    const configContent = await fs.readFile(addonsConfigPath, 'utf8');
    const addonsConfig = JSON.parse(configContent);
    
    if (!addonsConfig.addons[addonId]) {
      return res.status(404).json({
        success: false,
        error: 'Addon not found'
      });
    }
    
    const addonConfig = addonsConfig.addons[addonId];
    
    // Remove addon files
    const addonPath = `/var/www/orthodoxmetrics/addons/${addonId}`;
    if (await fs.access(addonPath).then(() => true).catch(() => false)) {
      await fs.rmdir(addonPath, { recursive: true });
      await logToFile('parish-map.log', `Addon files removed: ${addonPath}`);
    }
    
    // Update config
    delete addonsConfig.addons[addonId];
    addonsConfig.lastUpdated = new Date().toISOString();
    await fs.writeFile(addonsConfigPath, JSON.stringify(addonsConfig, null, 2));
    
    await logToFile('parish-map.log', `Addon uninstalled successfully: ${addonId}`);
    
    res.json({
      success: true,
      message: `Addon '${addonConfig.displayName}' uninstalled successfully`,
      uninstalledAddon: addonConfig
    });
    
  } catch (error) {
    console.error('Addon uninstall error:', error);
    await logToFile('parish-map.log', `Uninstall error: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to uninstall addon'
    });
  }
});

// =====================================================
// CENTRALIZED FILE INGESTION SYSTEM
// =====================================================

/**
 * Registry Management System
 * Handles all file type registries: addons, scripts, docs, configs
 */
class FileRegistryManager {
  constructor() {
    this.registryPaths = {
      addons: this.getRegistryPath('addons.json'),
      scripts: this.getRegistryPath('scripts.json'),
      docs: this.getRegistryPath('docs.json'),
      configs: this.getRegistryPath('configs.json'),
      data: this.getRegistryPath('data.json')
    };
    
    this.storagePaths = {
      addons: this.getStoragePath('addons'),
      scripts: this.getStoragePath('scripts'),
      docs: this.getStoragePath('docs'),
      configs: this.getStoragePath('configs'),
      data: this.getStoragePath('data')
    };
  }
  
  getRegistryPath(filename) {
    const configsBaseDir = process.env.NODE_ENV === 'production' 
      ? '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/configs' 
      : path.join(__dirname, '../../configs');
    return path.join(configsBaseDir, filename);
  }
  
  getStoragePath(type) {
    const baseDir = process.env.NODE_ENV === 'production' 
      ? '/var/www/orthodoxmetrics' 
      : path.join(__dirname, '../../misc/public');
    
    switch (type) {
      case 'addons': return path.join(baseDir, 'addons');
      case 'scripts': return path.join(baseDir, 'bigbook', 'scripts');
      case 'docs': return path.join(baseDir, 'bigbook', 'docs');
      case 'configs': return path.join(baseDir, 'bigbook', 'configs');
      case 'data': return path.join(baseDir, 'bigbook', 'data');
      default: throw new Error(`Unknown storage type: ${type}`);
    }
  }
  
  async ensureRegistryDirectories() {
    for (const [type, storagePath] of Object.entries(this.storagePaths)) {
      await fs.mkdir(storagePath, { recursive: true });
    }
    
    // Ensure configs directory exists
    const configsDir = path.dirname(this.registryPaths.addons);
    await fs.mkdir(configsDir, { recursive: true });
  }
  
  async loadRegistry(type) {
    try {
      const registryPath = this.registryPaths[type];
      const content = await fs.readFile(registryPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // Return empty registry if file doesn't exist
      return { version: '1.0.0', lastUpdated: new Date().toISOString(), items: {} };
    }
  }
  
  async saveRegistry(type, registry) {
    const registryPath = this.registryPaths[type];
    registry.lastUpdated = new Date().toISOString();
    registry.version = registry.version || '1.0.0';
    
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    await logToFile('registry.log', `Registry updated: ${type} -> ${registryPath}`);
  }
  
  async addItem(type, id, item) {
    const registry = await this.loadRegistry(type);
    registry.items[id] = {
      ...item,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.saveRegistry(type, registry);
    return registry.items[id];
  }
  
  async updateItem(type, id, updates) {
    const registry = await this.loadRegistry(type);
    if (!registry.items[id]) {
      throw new Error(`Item not found: ${id} in ${type} registry`);
    }
    
    registry.items[id] = {
      ...registry.items[id],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.saveRegistry(type, registry);
    return registry.items[id];
  }
  
  async removeItem(type, id) {
    const registry = await this.loadRegistry(type);
    if (registry.items[id]) {
      delete registry.items[id];
      await this.saveRegistry(type, registry);
      return true;
    }
    return false;
  }
  
  async getAllRegistries() {
    const registries = {};
    for (const type of Object.keys(this.registryPaths)) {
      registries[type] = await this.loadRegistry(type);
    }
    return registries;
  }
}

/**
 * File Type Processors
 * Handle specific processing logic for each file type
 */
class FileTypeProcessors {
  constructor(registryManager) {
    this.registry = registryManager;
  }
  
  async processZipFile(file, tempPath) {
    try {
      // Detect zip type based on contents
      const zip = new AdmZip(tempPath);
      const entries = zip.getEntries();
      
      // Check if it's a Parish Map
      if (this.isParishMapZip(entries)) {
        return await this.processParishMapZip(file, tempPath);
      }
      
      // Check if it's a component addon
      if (this.isComponentZip(entries)) {
        return await this.processComponentZip(file, tempPath);
      }
      
      // Generic zip extraction
      return await this.processGenericZip(file, tempPath);
      
    } catch (error) {
      throw new Error(`ZIP processing failed: ${error.message}`);
    }
  }
  
  isParishMapZip(entries) {
    return entries.some(entry => 
      entry.entryName.includes('parish-map') || 
      entry.entryName.includes('ParishMap')
    );
  }
  
  isComponentZip(entries) {
    return entries.some(entry => 
      entry.entryName.endsWith('package.json') ||
      entry.entryName.endsWith('index.js') ||
      entry.entryName.endsWith('component.js')
    );
  }
  
  async processParishMapZip(file, tempPath) {
    // Use existing Parish Map logic (simplified)
    return {
      type: 'addon',
      category: 'parish-map',
      message: 'Parish Map zip detected - use dedicated endpoint',
      action: 'redirect',
      endpoint: '/api/bigbook/upload-parish-map'
    };
  }
  
  async processComponentZip(file, tempPath) {
    const zip = new AdmZip(tempPath);
    const entries = zip.getEntries();
    const fileId = uuidv4();
    const componentName = path.basename(file.originalname, '.zip');
    
    // Extract to addons directory
    const extractPath = path.join(this.registry.storagePaths.addons, componentName);
    await fs.mkdir(extractPath, { recursive: true });
    
    // Extract files safely
    for (const entry of entries) {
      if (entry.entryName.includes('..') || path.isAbsolute(entry.entryName)) {
        throw new Error(`Unsafe path detected: ${entry.entryName}`);
      }
      
      const targetPath = path.join(extractPath, entry.entryName);
      const targetDir = path.dirname(targetPath);
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(targetPath, entry.getData());
    }
    
    // Register component
    const addonItem = {
      name: componentName,
      displayName: componentName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'component',
      source: 'zip-upload',
      path: extractPath,
      entry: `/addons/${componentName}/index.js`,
      route: `/addons/${componentName}`,
      enabled: true,
      showInMenu: true
    };
    
    await this.registry.addItem('addons', fileId, addonItem);
    
    return {
      type: 'addon',
      category: 'component',
      id: fileId,
      item: addonItem,
      message: `Component '${componentName}' extracted and registered`
    };
  }
  
  async processGenericZip(file, tempPath) {
    // Store in data directory for manual processing
    const fileId = uuidv4();
    const fileName = path.basename(file.originalname, '.zip');
    const storagePath = path.join(this.registry.storagePaths.data, `${fileName}-${fileId}.zip`);
    
    await fs.copyFile(tempPath, storagePath);
    
    const dataItem = {
      name: fileName,
      originalName: file.originalname,
      type: 'zip-archive',
      storagePath,
      size: file.size,
      status: 'stored'
    };
    
    await this.registry.addItem('data', fileId, dataItem);
    
    return {
      type: 'data',
      category: 'zip-archive',
      id: fileId,
      item: dataItem,
      message: `ZIP archive '${fileName}' stored for manual processing`
    };
  }
  
  async processJsFile(file, content) {
    const fileId = uuidv4();
    const fileName = path.basename(file.originalname, '.js');
    const storagePath = path.join(this.registry.storagePaths.addons, `${fileName}.js`);
    
    // Security check: Basic JS validation
    if (content.includes('eval(') || content.includes('Function(')) {
      throw new Error('JavaScript file contains potentially unsafe code');
    }
    
    await fs.writeFile(storagePath, content);
    
    const addonItem = {
      name: fileName,
      displayName: fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'javascript-module',
      source: 'direct-upload',
      path: storagePath,
      entry: `/addons/${fileName}.js`,
      enabled: false, // Require manual enable for JS files
      showInMenu: false
    };
    
    await this.registry.addItem('addons', fileId, addonItem);
    
    return {
      type: 'addon',
      category: 'javascript-module',
      id: fileId,
      item: addonItem,
      message: `JavaScript module '${fileName}' uploaded (requires manual enable)`
    };
  }
  
  async processJsonFile(file, content) {
    const fileId = uuidv4();
    const fileName = path.basename(file.originalname, '.json');
    const storagePath = path.join(this.registry.storagePaths.configs, file.originalname);
    
    // Validate JSON
    try {
      JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
    
    await fs.writeFile(storagePath, content);
    
    const configItem = {
      name: fileName,
      originalName: file.originalname,
      type: 'json-config',
      storagePath,
      size: file.size,
      status: 'active'
    };
    
    await this.registry.addItem('configs', fileId, configItem);
    
    return {
      type: 'config',
      category: 'json-config',
      id: fileId,
      item: configItem,
      message: `JSON configuration '${fileName}' stored`
    };
  }
  
  async processMarkdownFile(file, content) {
    const fileId = uuidv4();
    const fileName = path.basename(file.originalname, '.md');
    const storagePath = path.join(this.registry.storagePaths.docs, file.originalname);
    
    await fs.writeFile(storagePath, content);
    
    // Extract title from markdown
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : fileName;
    
    const docItem = {
      name: fileName,
      title,
      originalName: file.originalname,
      type: 'markdown-doc',
      storagePath,
      size: file.size,
      webPath: `/bigbook/docs/${file.originalname}`,
      tags: this.extractMarkdownTags(content)
    };
    
    await this.registry.addItem('docs', fileId, docItem);
    
    return {
      type: 'doc',
      category: 'markdown-doc',
      id: fileId,
      item: docItem,
      message: `Markdown document '${title}' stored`
    };
  }
  
  async processShellScript(file, content) {
    const fileId = uuidv4();
    const fileName = path.basename(file.originalname, '.sh');
    const storagePath = path.join(this.registry.storagePaths.scripts, file.originalname);
    
    // Security check: Basic shell script validation
    const dangerousPatterns = ['rm -rf /', 'sudo rm', 'mkfs', 'dd if=', '> /dev/'];
    for (const pattern of dangerousPatterns) {
      if (content.includes(pattern)) {
        throw new Error(`Shell script contains potentially dangerous command: ${pattern}`);
      }
    }
    
    await fs.writeFile(storagePath, content);
    
    // Make executable (on Unix systems)
    try {
      await fs.chmod(storagePath, '755');
    } catch (error) {
      // Ignore chmod errors on Windows
    }
    
    const scriptItem = {
      name: fileName,
      originalName: file.originalname,
      type: 'shell-script',
      storagePath,
      size: file.size,
      executable: true,
      enabled: false // Require manual enable for scripts
    };
    
    await this.registry.addItem('scripts', fileId, scriptItem);
    
    return {
      type: 'script',
      category: 'shell-script',
      id: fileId,
      item: scriptItem,
      message: `Shell script '${fileName}' stored (requires manual enable)`
    };
  }
  
  extractMarkdownTags(content) {
    const tags = [];
    const tagMatches = content.match(/\[([^\]]+)\]/g);
    if (tagMatches) {
      tags.push(...tagMatches.map(match => match.slice(1, -1)));
    }
    return tags;
  }
}

// Initialize registry manager and processors
const registryManager = new FileRegistryManager();
const fileProcessors = new FileTypeProcessors(registryManager);

// Configure multer for multiple file types
const uploadMultiType = multer({
  dest: path.join(TEMP_DIR, 'uploads'),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.zip', '.js', '.json', '.md', '.sh'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Explicitly reject .tsx files (they should use the TSX component wizard)
    if (ext === '.tsx') {
      cb(new Error('TSX files must be processed through the TSX Component Installation Wizard'), false);
      return;
    }
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported. Allowed: ${allowedExtensions.join(', ')}`), false);
    }
  }
});

/**
 * Centralized File Ingestion Endpoint
 * POST /api/bigbook/ingest-file
 */
router.post('/ingest-file', authenticate, authorize(['super_admin']), uploadMultiType.single('file'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    await registryManager.ensureRegistryDirectories();
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    tempFilePath = req.file.path;
    const originalName = req.file.originalname;
    const extension = path.extname(originalName).toLowerCase();
    
    await logToFile('ingestion.log', `File ingestion started: ${originalName} by ${req.user?.username || 'unknown'}`);
    
    let result;
    
    switch (extension) {
      case '.zip':
        result = await fileProcessors.processZipFile(req.file, tempFilePath);
        break;
      case '.js':
        const jsContent = await fs.readFile(tempFilePath, 'utf8');
        result = await fileProcessors.processJsFile(req.file, jsContent);
        break;
      case '.json':
        const jsonContent = await fs.readFile(tempFilePath, 'utf8');
        result = await fileProcessors.processJsonFile(req.file, jsonContent);
        break;
      case '.md':
        const mdContent = await fs.readFile(tempFilePath, 'utf8');
        result = await fileProcessors.processMarkdownFile(req.file, mdContent);
        break;
      case '.sh':
        const shContent = await fs.readFile(tempFilePath, 'utf8');
        result = await fileProcessors.processShellScript(req.file, shContent);
        break;
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
    
    await logToFile('ingestion.log', `File processed successfully: ${originalName} -> ${result.type}/${result.category}`);
    
    // Optionally notify OMAI for learning (if enabled)
    if (req.body.notifyOMAI === 'true') {
      try {
        await notifyOMAIForLearning(result);
      } catch (error) {
        await logToFile('ingestion.log', `OMAI notification failed: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      result,
      registries: await registryManager.getAllRegistries()
    });
    
  } catch (error) {
    await logToFile('ingestion.log', `File ingestion failed: ${req.file?.originalname || 'unknown'} - ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      debug: {
        file: req.file?.originalname,
        size: req.file?.size,
        mimetype: req.file?.mimetype
      }
    });
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
});

/**
 * Get All Registries
 * GET /api/bigbook/registries
 */
router.get('/registries', authenticate, authorize(['super_admin']), async (req, res) => {
  try {
    const registries = await registryManager.getAllRegistries();
    res.json({
      success: true,
      registries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Toggle Item Status
 * POST /api/bigbook/toggle-item/:type/:id
 */
router.post('/toggle-item/:type/:id', authenticate, authorize(['super_admin']), async (req, res) => {
  try {
    const { type, id } = req.params;
    const { enabled } = req.body;
    
    if (!registryManager.registryPaths[type]) {
      return res.status(400).json({
        success: false,
        error: `Invalid registry type: ${type}`
      });
    }
    
    const updatedItem = await registryManager.updateItem(type, id, { enabled });
    
    await logToFile('registry.log', `Item toggled: ${type}/${id} -> enabled: ${enabled}`);
    
    res.json({
      success: true,
      item: updatedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * OMAI Learning Notification
 */
async function notifyOMAIForLearning(result) {
  try {
    await logToFile('omai-learning.log', `OMAI Learning Notification: ${JSON.stringify(result, null, 2)}`);
    
    // Connect to OMAI orchestrator for learning ingestion (temporarily disabled)
    // const { OMAIOrchestrator } = require('../omai/services/orchestrator');
    
    // Initialize orchestrator if needed (temporarily mocked)
    let orchestrator;
    try {
      // orchestrator = new OMAIOrchestrator();
      orchestrator = {
        ingestLearningData: async (data) => {
          await logToFile('omai-learning.log', `OMAI Learning Data (mocked): ${JSON.stringify(data, null, 2)}`);
          return { success: true, message: 'Learning data logged (orchestrator disabled)' };
        }
      };
    } catch (error) {
      await logToFile('omai-learning.log', `OMAI Orchestrator initialization failed: ${error.message}`);
      return false;
    }
    
    // Prepare content for OMAI ingestion
    const content = await prepareContentForOMAI(result);
    const metadata = await prepareMetadataForOMAI(result);
    
    // Ingest into OMAI memory
    await orchestrator.omaiMemoryIngest(content, metadata);
    
    await logToFile('omai-learning.log', `OMAI ingestion successful for: ${result.item?.name || result.id}`);
    return true;
    
  } catch (error) {
    await logToFile('omai-learning.log', `OMAI ingestion failed: ${error.message}`);
    return false;
  }
}

/**
 * Prepare content for OMAI ingestion
 */
async function prepareContentForOMAI(result) {
  try {
    const { item, type, category } = result;
    
    let content = '';
    let sections = [];
    
    switch (type) {
      case 'doc':
        // For markdown documents, read the file content
        if (item.storagePath) {
          try {
            content = await fs.readFile(item.storagePath, 'utf8');
            
            // Extract sections from markdown
            const lines = content.split('\n');
            let currentSection = '';
            let currentContent = '';
            
            for (const line of lines) {
              if (line.startsWith('#')) {
                if (currentSection && currentContent) {
                  sections.push({
                    title: currentSection,
                    content: currentContent.trim()
                  });
                }
                currentSection = line.replace(/^#+\s*/, '');
                currentContent = '';
              } else {
                currentContent += line + '\n';
              }
            }
            
            // Add last section
            if (currentSection && currentContent) {
              sections.push({
                title: currentSection,
                content: currentContent.trim()
              });
            }
          } catch (error) {
            content = `Document: ${item.title || item.name}\nDescription: ${item.description || 'No description available'}`;
          }
        }
        break;
        
      case 'addon':
        // For addons, create descriptive content
        content = `Component: ${item.displayName || item.name}
Type: ${item.type}
Route: ${item.route || 'N/A'}
Entry Point: ${item.entry || 'N/A'}
Description: ${item.description || 'Interactive component'}
Source: ${item.source}
Status: ${item.enabled ? 'Enabled' : 'Disabled'}`;
        
        sections = [
          {
            title: 'Component Information',
            content: `Name: ${item.displayName || item.name}\nType: ${item.type}\nRoute: ${item.route}`
          },
          {
            title: 'Technical Details',
            content: `Entry: ${item.entry}\nSource: ${item.source}\nEnabled: ${item.enabled}`
          }
        ];
        break;
        
      case 'script':
        // For scripts, read the content if possible
        content = `Script: ${item.name}
Type: ${item.type}
Executable: ${item.executable}
Path: ${item.storagePath}
Status: ${item.enabled ? 'Enabled' : 'Disabled'}`;
        
        if (item.storagePath) {
          try {
            const scriptContent = await fs.readFile(item.storagePath, 'utf8');
            content += `\n\nScript Content:\n${scriptContent}`;
          } catch (error) {
            // If can't read script, just use metadata
          }
        }
        break;
        
      case 'config':
        // For configs, read JSON content
        content = `Configuration: ${item.name}
Type: ${item.type}
Path: ${item.storagePath}`;
        
        if (item.storagePath) {
          try {
            const configContent = await fs.readFile(item.storagePath, 'utf8');
            content += `\n\nConfiguration Content:\n${configContent}`;
          } catch (error) {
            // If can't read config, just use metadata
          }
        }
        break;
        
      default:
        content = `File: ${item.name || 'Unknown'}
Type: ${type}/${category}
Description: ${item.description || 'No description available'}`;
    }
    
    return {
      content,
      sections
    };
  } catch (error) {
    return {
      content: `Error preparing content: ${error.message}`,
      sections: []
    };
  }
}

/**
 * Prepare metadata for OMAI ingestion
 */
async function prepareMetadataForOMAI(result) {
  const { item, type, category, id } = result;
  
  return {
    source: item.storagePath || item.path || `big-book-${type}-${id}`,
    sourceType: mapBigBookTypeToOMAI(type),
    fileType: category,
    tags: getBigBookTags(type, category, item),
    priority: type === 'doc' || type === 'addon' ? 'high' : 'medium',
    processor: 'bigbook-ingestion',
    chunking: type === 'doc' ? 'section' : 'single',
    timestamp: new Date().toISOString(),
    size: item.size || 0,
    relativePath: item.name || `${type}-${id}`,
    bigBookMeta: {
      registryType: type,
      category,
      enabled: item.enabled || false,
      displayName: item.displayName || item.title || item.name,
      route: item.route,
      webPath: item.webPath
    }
  };
}

/**
 * Map Big Book types to OMAI source types
 */
function mapBigBookTypeToOMAI(type) {
  const mapping = {
    'doc': 'documentation',
    'addon': 'react-component',
    'script': 'code',
    'config': 'json',
    'data': 'general'
  };
  return mapping[type] || 'general';
}

/**
 * Get appropriate tags for Big Book items
 */
function getBigBookTags(type, category, item) {
  const baseTags = ['BigBook', 'Auto-Ingested'];
  
  switch (type) {
    case 'doc':
      return [...baseTags, 'Documentation', 'Markdown', 'User Guide'];
    case 'addon':
      return [...baseTags, 'Component', 'Frontend', 'React', 'UI', 'Interactive'];
    case 'script':
      return [...baseTags, 'Script', 'Automation', 'Admin Tool'];
    case 'config':
      return [...baseTags, 'Configuration', 'Settings', 'JSON'];
    case 'data':
      return [...baseTags, 'Data', 'Archive', 'Storage'];
    default:
      return [...baseTags, 'General'];
  }
}

/**
 * Big Book Custom Components Registry
 * GET /api/bigbook/custom-components-registry
 */
router.get('/custom-components-registry', authenticate, authorize(['super_admin', 'editor']), async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const registryPath = path.join(__dirname, '../../front-end/src/config/bigbook-custom-components.json');
    
    try {
      const registryContent = await fs.readFile(registryPath, 'utf8');
      const registry = JSON.parse(registryContent);
      
      res.json({
        success: true,
        ...registry
      });
    } catch (error) {
      // Registry doesn't exist, return empty registry
      res.json({
        success: true,
        components: {},
        routes: {},
        menu: [],
        lastUpdated: null,
        version: "1.0.0"
      });
    }
    
  } catch (error) {
    await logToFile('tsx-components.log', `Failed to load custom components registry: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Big Book Custom Component Installation (Enhanced)
 * POST /api/bigbook/install-bigbook-component
 */
router.post('/install-bigbook-component', authenticate, authorize(['super_admin', 'editor']), async (req, res) => {
  try {
    const { componentInfo, installOptions } = req.body;
    
    if (!componentInfo || !installOptions) {
      return res.status(400).json({
        success: false,
        error: 'Component info and install options are required'
      });
    }
    
    await logToFile('tsx-components.log', `Installing Big Book custom component: ${componentInfo.componentName} by ${req.user?.username || 'unknown'}`);
    
    // Force Big Book-specific settings
    const bigBookInstallOptions = {
      ...installOptions,
      targetDirectory: 'src/components/bigbook/custom',
      registerInRegistry: true // Always register Big Book components
    };
    
    // Install the component using enhanced Big Book function
    const installResult = await installBigBookCustomComponent(componentInfo, bigBookInstallOptions, req.user?.username || 'unknown');
    
    res.json({
      success: true,
      ...installResult
    });
    
  } catch (error) {
    await logToFile('tsx-components.log', `Big Book component installation failed: ${req.body?.componentInfo?.componentName || 'unknown'} - ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Big Book Custom Component Removal (Enhanced)
 * DELETE /api/bigbook/remove-bigbook-component
 */
router.delete('/remove-bigbook-component', authenticate, authorize(['super_admin', 'editor']), async (req, res) => {
  try {
    const { installationResult } = req.body;
    
    if (!installationResult) {
      return res.status(400).json({
        success: false,
        error: 'Installation result is required for removal'
      });
    }
    
    await logToFile('tsx-components.log', `Removing Big Book custom component: ${installationResult.componentName} by ${req.user?.username || 'unknown'}`);
    
    // Remove the component using enhanced Big Book function
    const removalResult = await removeBigBookCustomComponent(installationResult, req.user?.username || 'unknown');
    
    res.json({
      success: true,
      ...removalResult
    });
    
  } catch (error) {
    await logToFile('tsx-components.log', `Big Book component removal failed: ${req.body?.installationResult?.componentName || 'unknown'} - ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * TSX Component Parser and Validator
 * POST /api/bigbook/parse-tsx-component
 */
router.post('/parse-tsx-component', authenticate, authorize(['super_admin', 'editor']), async (req, res) => {
  try {
    const { fileName, content } = req.body;
    
    if (!fileName || !content) {
      return res.status(400).json({
        success: false,
        error: 'File name and content are required'
      });
    }
    
    if (!fileName.endsWith('.tsx')) {
      return res.status(400).json({
        success: false,
        error: 'File must be a .tsx file'
      });
    }
    
    await logToFile('tsx-components.log', `Parsing TSX component: ${fileName} by ${req.user?.username || 'unknown'}`);
    
    // Parse component information
    const componentInfo = await parseTSXComponent(fileName, content);
    
    res.json({
      success: true,
      componentInfo
    });
    
  } catch (error) {
    await logToFile('tsx-components.log', `TSX parsing failed: ${req.body?.fileName || 'unknown'} - ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      errors: error.errors || [],
      warnings: error.warnings || []
    });
  }
});

/**
 * TSX Component Installation
 * POST /api/bigbook/install-tsx-component
 */
router.post('/install-tsx-component', authenticate, authorize(['super_admin', 'editor']), async (req, res) => {
  try {
    const { componentInfo, installOptions } = req.body;
    
    if (!componentInfo || !installOptions) {
      return res.status(400).json({
        success: false,
        error: 'Component info and install options are required'
      });
    }
    
    await logToFile('tsx-components.log', `Installing TSX component: ${componentInfo.componentName} by ${req.user?.username || 'unknown'}`);
    
    // Install the component
    const installResult = await installTSXComponent(componentInfo, installOptions, req.user?.username || 'unknown');
    
    res.json({
      success: true,
      ...installResult
    });
    
  } catch (error) {
    await logToFile('tsx-components.log', `TSX installation failed: ${req.body?.componentInfo?.componentName || 'unknown'} - ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * TSX Component Removal
 * DELETE /api/bigbook/remove-tsx-component
 */
router.delete('/remove-tsx-component', authenticate, authorize(['super_admin', 'editor']), async (req, res) => {
  try {
    const { installationResult } = req.body;
    
    if (!installationResult) {
      return res.status(400).json({
        success: false,
        error: 'Installation result is required for removal'
      });
    }
    
    await logToFile('tsx-components.log', `Removing TSX component: ${installationResult.componentName} by ${req.user?.username || 'unknown'}`);
    
    // Remove the component
    const removalResult = await removeTSXComponent(installationResult, req.user?.username || 'unknown');
    
    res.json({
      success: true,
      ...removalResult
    });
    
  } catch (error) {
    await logToFile('tsx-components.log', `TSX removal failed: ${req.body?.installationResult?.componentName || 'unknown'} - ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * TSX Component Parser Implementation
 */
async function parseTSXComponent(fileName, content) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const componentInfo = {
    fileName,
    componentName: '',
    isDefaultExport: false,
    imports: [],
    content,
    size: content.length,
    isValid: false,
    errors: [],
    warnings: [],
    missingPackages: [],
    hasJSX: false,
    hasHooks: false,
    dependencies: []
  };
  
  try {
    // Enhanced Security Validation
    if (!fileName.endsWith('.tsx')) {
      componentInfo.errors.push('File must have .tsx extension');
      componentInfo.isValid = false;
      return componentInfo;
    }
    
    // Check for malicious patterns
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /document\.write/,
      /innerHTML\s*=/,
      /outerHTML\s*=/,
      /dangerouslySetInnerHTML/,
      /window\s*\[\s*['"`]/,
      /globalThis/,
      /process\.env/,
      /__dirname/,
      /__filename/,
      /require\s*\(/,
      /import\s*\(\s*['"`]/
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        componentInfo.errors.push(`Potentially dangerous code pattern detected: ${pattern.toString()}`);
      }
    }
    
    // Validate file size (max 1MB)
    if (content.length > 1024 * 1024) {
      componentInfo.errors.push('File size too large (max 1MB allowed)');
    }
    
    // Extract component name from file name
    const baseName = path.basename(fileName, '.tsx');
    
    // Convert kebab-case or snake_case to PascalCase for React component name
    const convertToPascalCase = (str) => {
      return str.split(/[-_]/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join('');
    };
    
    // Get the actual component name that will be used
    const actualComponentName = convertToPascalCase(baseName);
    
    // Validate that the converted component name is valid
    if (!/^[A-Z][A-Za-z0-9]*$/.test(actualComponentName)) {
      componentInfo.errors.push(`Invalid component name "${baseName}". Component names must contain only letters, numbers, hyphens, or underscores`);
    }
    
    componentInfo.componentName = actualComponentName;
    
    // Check for JSX content
    componentInfo.hasJSX = /<\w+/.test(content) || /jsx/.test(content);
    
    // Check for React hooks
    componentInfo.hasHooks = /use[A-Z]\w*\s*\(/.test(content);
    
    // Extract imports
    const importMatches = content.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/g) || [];
    componentInfo.imports = importMatches.map(match => {
      const moduleMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
      return moduleMatch ? moduleMatch[1] : '';
    }).filter(Boolean);
    
    // Check for default export
    componentInfo.isDefaultExport = /export\s+default\s+/.test(content);
    
    // Check for valid React component (check for both original filename and converted name)
    const hasComponentDefinition = new RegExp(`(const|function|class)\\s+(${baseName}|${actualComponentName})\\s*[=:(<]`).test(content);
    const hasReactImport = /import\s+.*?React.*?from\s+['"`]react['"`]/.test(content) || 
                          /import\s+React/.test(content);
    
    if (!hasComponentDefinition) {
      componentInfo.warnings.push(`Component definition should match filename. Expected: ${actualComponentName} (converted from ${baseName})`);
    }
    
    if (!hasReactImport && componentInfo.hasJSX) {
      componentInfo.warnings.push('JSX detected but no React import found');
    }
    
    // Validate syntax (basic checks)
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      componentInfo.errors.push('Mismatched braces in component');
    }
    
    // Check for common missing packages
    const packageChecks = {
      '@mui/material': /@mui\/material/.test(content),
      '@mui/icons-material': /@mui\/icons-material/.test(content),
      'react-router-dom': /react-router-dom/.test(content),
      'axios': /axios/.test(content)
    };
    
    for (const [pkg, isUsed] of Object.entries(packageChecks)) {
      if (isUsed && !componentInfo.imports.includes(pkg)) {
        componentInfo.missingPackages.push(pkg);
      }
    }
    
    // Component is valid if no errors
    componentInfo.isValid = componentInfo.errors.length === 0;
    
    // Extract dependencies
    componentInfo.dependencies = componentInfo.imports.filter(imp => 
      !imp.startsWith('.') && !imp.startsWith('/')
    );
    
    return componentInfo;
    
  } catch (error) {
    componentInfo.errors.push(`Parse error: ${error.message}`);
    componentInfo.isValid = false;
    return componentInfo;
  }
}

/**
 * TSX Component Installation Implementation
 */
async function installTSXComponent(componentInfo, installOptions, username) {
  const fs = require('fs').promises;
  const path = require('path');
  const { execSync } = require('child_process');
  
  const frontEndRoot = path.join(__dirname, '../../front-end');
  const targetPath = path.join(frontEndRoot, installOptions.targetDirectory);
  const filePath = path.join(targetPath, componentInfo.fileName);
  
  const result = {
    componentName: componentInfo.componentName,
    installedPath: path.relative(frontEndRoot, filePath),
    packagesInstalled: [],
    registryUpdated: false,
    previewUrl: null,
    backupCreated: null
  };
  
  try {
    // Ensure target directory exists
    await fs.mkdir(targetPath, { recursive: true });
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      if (!installOptions.overwriteExisting) {
        throw new Error(`File already exists: ${componentInfo.fileName}. Enable overwrite to replace.`);
      }
      
      // Create backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
      result.backupCreated = path.relative(frontEndRoot, backupPath);
    } catch (error) {
      // File doesn't exist, that's fine
    }
    
    // Write the component file
    await fs.writeFile(filePath, componentInfo.content, 'utf8');
    
    // Install missing packages if requested
    if (installOptions.installMissingPackages && componentInfo.missingPackages.length > 0) {
      try {
        const packagesStr = componentInfo.missingPackages.join(' ');
        execSync(`cd ${frontEndRoot} && npm install ${packagesStr} --legacy-peer-deps`, {
          stdio: 'inherit',
          timeout: 120000 // 2 minutes timeout
        });
        result.packagesInstalled = componentInfo.missingPackages;
      } catch (error) {
        // Package installation failed, but component was still installed
        await logToFile('tsx-components.log', `Package installation failed: ${error.message}`);
      }
    }
    
    // Register in component registry if requested
    if (installOptions.registerInRegistry && componentInfo.isDefaultExport) {
      try {
        await registerComponentInRegistry(componentInfo, result.installedPath);
        result.registryUpdated = true;
      } catch (error) {
        await logToFile('tsx-components.log', `Registry registration failed: ${error.message}`);
      }
    }
    
    // Generate preview URL if requested
    if (installOptions.openPreview) {
      result.previewUrl = `/admin/settings#big-book-registry`;
    }
    
    await logToFile('tsx-components.log', `TSX component installed successfully: ${componentInfo.componentName} by ${username}`);
    
    return result;
    
  } catch (error) {
    // Clean up on failure
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
}

/**
 * TSX Component Removal Implementation
 */
async function removeTSXComponent(installationResult, username) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const frontEndRoot = path.join(__dirname, '../../front-end');
  const filePath = path.join(frontEndRoot, installationResult.installedPath);
  
  try {
    // Remove the component file
    await fs.unlink(filePath);
    
    // Restore backup if it exists
    if (installationResult.backupCreated) {
      const backupPath = path.join(frontEndRoot, installationResult.backupCreated);
      try {
        await fs.copyFile(backupPath, filePath);
        await fs.unlink(backupPath);
      } catch (error) {
        await logToFile('tsx-components.log', `Backup restoration failed: ${error.message}`);
      }
    }
    
    // Remove from registry if it was registered
    if (installationResult.registryUpdated) {
      try {
        await unregisterComponentFromRegistry(installationResult.componentName);
      } catch (error) {
        await logToFile('tsx-components.log', `Registry removal failed: ${error.message}`);
      }
    }
    
    await logToFile('tsx-components.log', `TSX component removed successfully: ${installationResult.componentName} by ${username}`);
    
    return {
      componentName: installationResult.componentName,
      removed: true
    };
    
  } catch (error) {
    throw new Error(`Failed to remove component: ${error.message}`);
  }
}

/**
 * Register component in the component registry
 */
async function registerComponentInRegistry(componentInfo, installedPath) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const registryPath = path.join(__dirname, '../../front-end/src/config/component-registry.json');
  
  try {
    let registry = {};
    
    // Try to read existing registry
    try {
      const registryContent = await fs.readFile(registryPath, 'utf8');
      registry = JSON.parse(registryContent);
    } catch (error) {
      // Registry doesn't exist, start with empty object
    }
    
    // Add component to registry
    registry[componentInfo.componentName] = {
      id: componentInfo.componentName,
      name: componentInfo.componentName,
      path: installedPath,
      isDefaultExport: componentInfo.isDefaultExport,
      hasJSX: componentInfo.hasJSX,
      hasHooks: componentInfo.hasHooks,
      dependencies: componentInfo.dependencies,
      installedAt: new Date().toISOString(),
      autoInstalled: true
    };
    
    // Write updated registry
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    
  } catch (error) {
    throw new Error(`Registry update failed: ${error.message}`);
  }
}

/**
 * Remove component from the component registry
 */
async function unregisterComponentFromRegistry(componentName) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const registryPath = path.join(__dirname, '../../front-end/src/config/component-registry.json');
  
  try {
    const registryContent = await fs.readFile(registryPath, 'utf8');
    const registry = JSON.parse(registryContent);
    
    if (registry[componentName]) {
      delete registry[componentName];
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    }
    
  } catch (error) {
    throw new Error(`Registry removal failed: ${error.message}`);
  }
}

/**
 * Enhanced TSX Component Installation for Big Book Custom Components
 */
async function installBigBookCustomComponent(componentInfo, installOptions, username) {
  const fs = require('fs').promises;
  const path = require('path');
  const { execSync } = require('child_process');
  
  const frontEndRoot = path.join(__dirname, '../../front-end');
  
  // Force Big Book custom components directory
  const bigBookCustomDir = 'src/components/bigbook/custom';
  const targetPath = path.join(frontEndRoot, bigBookCustomDir);
  const filePath = path.join(targetPath, componentInfo.fileName);
  
  // Generate component route name (kebab-case)
  const routeName = componentInfo.componentName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
  
  const displayName = componentInfo.componentName
    .replace(/([A-Z])/g, ' $1')
    .trim();
  
  const result = {
    componentName: componentInfo.componentName,
    installedPath: path.relative(frontEndRoot, filePath),
    route: `/bigbook/component/${routeName}`,
    displayName: displayName,
    packagesInstalled: [],
    registryUpdated: false,
    menuUpdated: false,
    previewUrl: null,
    backupCreated: null
  };
  
  try {
    // Ensure Big Book custom components directory exists
    await fs.mkdir(targetPath, { recursive: true });
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      if (!installOptions.overwriteExisting) {
        throw new Error(`Component already exists: ${componentInfo.fileName}. Enable overwrite to replace.`);
      }
      
      // Create backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
      result.backupCreated = path.relative(frontEndRoot, backupPath);
    } catch (error) {
      // File doesn't exist, that's fine
    }
    
    // Write the component file
    await fs.writeFile(filePath, componentInfo.content, 'utf8');
    
    // Install missing packages if requested
    if (installOptions.installMissingPackages && componentInfo.missingPackages.length > 0) {
      try {
        const packagesStr = componentInfo.missingPackages.join(' ');
        execSync(`cd ${frontEndRoot} && npm install ${packagesStr} --legacy-peer-deps`, {
          stdio: 'inherit',
          timeout: 120000 // 2 minutes timeout
        });
        result.packagesInstalled = componentInfo.missingPackages;
      } catch (error) {
        // Package installation failed, but component was still installed
        await logToFile('tsx-components.log', `Package installation failed: ${error.message}`);
      }
    }
    
    // Register in Big Book custom component registry
    if (installOptions.registerInRegistry && componentInfo.isDefaultExport) {
      try {
        await registerBigBookCustomComponent(componentInfo, result);
        result.registryUpdated = true;
        result.menuUpdated = true;
      } catch (error) {
        await logToFile('tsx-components.log', `Big Book registry registration failed: ${error.message}`);
      }
    }
    
    // Generate preview URL for Big Book custom component
    if (installOptions.openPreview) {
      result.previewUrl = result.route;
    }
    
    await logToFile('tsx-components.log', `Big Book custom component installed successfully: ${componentInfo.componentName} by ${username}`);
    
    return result;
    
  } catch (error) {
    // Clean up on failure
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
}

/**
 * Register component in Big Book custom component registry
 */
async function registerBigBookCustomComponent(componentInfo, installResult) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const registryPath = path.join(__dirname, '../../front-end/src/config/bigbook-custom-components.json');
  
  try {
    let registry = {
      components: {},
      routes: {},
      menu: [],
      lastUpdated: null,
      version: "1.0.0"
    };
    
    // Try to read existing registry
    try {
      const registryContent = await fs.readFile(registryPath, 'utf8');
      registry = JSON.parse(registryContent);
    } catch (error) {
      // Registry doesn't exist, use default structure
    }
    
    // Add component to registry
    const componentData = {
      id: componentInfo.componentName,
      name: componentInfo.componentName,
      path: installResult.installedPath,
      route: installResult.route,
      displayName: installResult.displayName,
      description: `Custom Big Book component: ${installResult.displayName}`,
      installedAt: new Date().toISOString(),
      autoInstalled: true,
      isDefaultExport: componentInfo.isDefaultExport,
      hasJSX: componentInfo.hasJSX,
      hasHooks: componentInfo.hasHooks,
      dependencies: componentInfo.dependencies
    };
    
    registry.components[componentInfo.componentName] = componentData;
    registry.routes[installResult.route] = componentInfo.componentName;
    
    // Add to menu if not already present
    const existingMenuIndex = registry.menu.findIndex(item => item.id === componentInfo.componentName);
    const menuItem = {
      id: componentInfo.componentName,
      name: componentInfo.componentName,
      displayName: installResult.displayName,
      route: installResult.route,
      icon: 'Extension'
    };
    
    if (existingMenuIndex >= 0) {
      registry.menu[existingMenuIndex] = menuItem;
    } else {
      registry.menu.push(menuItem);
    }
    
    // Sort menu items by display name
    registry.menu.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    registry.lastUpdated = new Date().toISOString();
    
    // Write updated registry
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    
  } catch (error) {
    throw new Error(`Big Book registry update failed: ${error.message}`);
  }
}

/**
 * Remove component from Big Book custom component registry
 */
async function unregisterBigBookCustomComponent(componentName) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const registryPath = path.join(__dirname, '../../front-end/src/config/bigbook-custom-components.json');
  
  try {
    const registryContent = await fs.readFile(registryPath, 'utf8');
    const registry = JSON.parse(registryContent);
    
    if (registry.components[componentName]) {
      const component = registry.components[componentName];
      
      // Remove from components
      delete registry.components[componentName];
      
      // Remove from routes
      if (component.route && registry.routes[component.route]) {
        delete registry.routes[component.route];
      }
      
      // Remove from menu
      registry.menu = registry.menu.filter(item => item.id !== componentName);
      
      registry.lastUpdated = new Date().toISOString();
      
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    }
    
  } catch (error) {
    throw new Error(`Big Book registry removal failed: ${error.message}`);
  }
}

/**
 * Enhanced TSX Component Removal for Big Book Custom Components
 */
async function removeBigBookCustomComponent(installationResult, username) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const frontEndRoot = path.join(__dirname, '../../front-end');
  const filePath = path.join(frontEndRoot, installationResult.installedPath);
  
  try {
    // Remove the component file
    await fs.unlink(filePath);
    
    // Restore backup if it exists
    if (installationResult.backupCreated) {
      const backupPath = path.join(frontEndRoot, installationResult.backupCreated);
      try {
        await fs.copyFile(backupPath, filePath);
        await fs.unlink(backupPath);
      } catch (error) {
        await logToFile('tsx-components.log', `Backup restoration failed: ${error.message}`);
      }
    }
    
    // Remove from Big Book registry if it was registered
    if (installationResult.registryUpdated) {
      try {
        await unregisterBigBookCustomComponent(installationResult.componentName);
      } catch (error) {
        await logToFile('tsx-components.log', `Big Book registry removal failed: ${error.message}`);
      }
    }
    
    await logToFile('tsx-components.log', `Big Book custom component removed successfully: ${installationResult.componentName} by ${username}`);
    
    return {
      componentName: installationResult.componentName,
      removed: true,
      menuUpdated: true
    };
    
  } catch (error) {
    throw new Error(`Failed to remove Big Book custom component: ${error.message}`);
  }
}

module.exports = router; 