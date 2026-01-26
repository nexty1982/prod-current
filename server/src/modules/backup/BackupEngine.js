const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class BackupEngine {
  constructor(db, config = {}) {
    this.db = db;
    this.backupRoot = config.backupRoot || '/var/backups/orthodoxmetrics';
    this.prodRoot = config.prodRoot || '/var/www/orthodoxmetrics/prod';
    this.dbConfig = config.database || {
      host: 'localhost',
      user: 'orthodoxmetrics_user',
      password: process.env.DB_PASSWORD,
      database: 'orthodoxmetrics_db'
    };
  }

  async initialize() {
    try {
      await fs.mkdir(this.backupRoot, { recursive: true });
      console.log('Backup engine initialized');
    } catch (error) {
      console.error('Failed to initialize backup engine:', error);
      throw error;
    }
  }

  async createBackupJob(kind, requestedBy, filters = {}) {
    const jobId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // Insert job record
      await this.db.query(
        'INSERT INTO backup_jobs (id, kind, status, created_at, requested_by) VALUES (?, ?, ?, ?, ?)',
        [jobId, kind, 'queued', timestamp, requestedBy]
      );

      // Start backup process asynchronously
      this.executeBackup(jobId, kind, filters);

      return {
        jobId,
        status: 'queued',
        message: `Backup job ${jobId} queued successfully`
      };
    } catch (error) {
      console.error('Failed to create backup job:', error);
      throw error;
    }
  }

  async executeBackup(jobId, kind, filters = {}) {
    const startTime = Date.now();
    let artifacts = [];

    try {
      // Update job status to running
      await this.db.query(
        'UPDATE backup_jobs SET status = ?, started_at = ? WHERE id = ?',
        ['running', new Date().toISOString(), jobId]
      );

      // Create job directory
      const jobDir = path.join(this.backupRoot, jobId);
      await fs.mkdir(jobDir, { recursive: true });

      if (kind === 'files' || kind === 'both') {
        const filesArtifact = await this.backupFiles(jobId, jobDir, filters);
        artifacts.push(filesArtifact);
      }

      if (kind === 'db' || kind === 'both') {
        const dbArtifact = await this.backupDatabase(jobId, jobDir);
        artifacts.push(dbArtifact);
      }

      // Calculate duration
      const duration = Date.now() - startTime;

      // Update job as completed
      await this.db.query(
        'UPDATE backup_jobs SET status = ?, completed_at = ?, duration_ms = ? WHERE id = ?',
        ['success', new Date().toISOString(), duration, jobId]
      );

      console.log(`Backup job ${jobId} completed successfully in ${duration}ms`);
    } catch (error) {
      console.error(`Backup job ${jobId} failed:`, error);
      
      // Update job as failed
      await this.db.query(
        'UPDATE backup_jobs SET status = ?, completed_at = ?, error_message = ? WHERE id = ?',
        ['failed', new Date().toISOString(), error.message, jobId]
      );
    }
  }

  async backupFiles(jobId, jobDir, filters = {}) {
    return new Promise(async (resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveName = `files-${timestamp}.tar.gz`;
      const archivePath = path.join(jobDir, archiveName);
      const manifestPath = path.join(jobDir, `files-manifest-${timestamp}.json`);

      try {
        // Build tar command with filters
        const tarArgs = ['czf', archivePath, '-C', this.prodRoot];
        
        // Apply filters
        if (filters.excludePatterns && filters.excludePatterns.length > 0) {
          filters.excludePatterns.forEach(pattern => {
            tarArgs.push('--exclude', pattern);
          });
        }

        // Default exclusions
        tarArgs.push(
          '--exclude', 'node_modules',
          '--exclude', '.git',
          '--exclude', 'logs/*',
          '--exclude', 'uploads/temp/*',
          '--exclude', '*.log'
        );

        tarArgs.push('.'); // Backup everything in prod root

        console.log('Starting files backup with command:', 'tar', tarArgs.join(' '));

        const tarProcess = spawn('tar', tarArgs);
        let stderr = '';

        tarProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        tarProcess.on('close', async (code) => {
          if (code !== 0) {
            return reject(new Error(`tar failed with code ${code}: ${stderr}`));
          }

          try {
            // Get file stats
            const stats = await fs.stat(archivePath);
            const sha256 = await this.calculateSHA256(archivePath);

            // Create manifest
            const manifest = {
              jobId,
              type: 'files',
              timestamp,
              source: this.prodRoot,
              archive: archivePath,
              size: stats.size,
              sha256,
              filters: filters,
              created: new Date().toISOString()
            };

            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

            // Store artifact in database
            const artifactId = uuidv4();
            await this.db.query(
              'INSERT INTO backup_artifacts (id, job_id, artifact_type, file_path, file_size, sha256, manifest_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [artifactId, jobId, 'files', archivePath, stats.size, sha256, manifestPath, new Date().toISOString()]
            );

            resolve({ id: artifactId, type: 'files', path: archivePath, size: stats.size, manifest: manifestPath });
          } catch (error) {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async backupDatabase(jobId, jobDir) {
    return new Promise(async (resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dumpName = `database-${timestamp}.sql.gz`;
      const dumpPath = path.join(jobDir, dumpName);
      const manifestPath = path.join(jobDir, `database-manifest-${timestamp}.json`);

      try {
        console.log('Starting database backup...');

        // Use mysqldump with compression
        const mysqldumpArgs = [
          '--host', this.dbConfig.host,
          '--user', this.dbConfig.user,
          `--password=${this.dbConfig.password}`,
          '--single-transaction',
          '--routines',
          '--triggers',
          '--complete-insert',
          '--extended-insert',
          '--add-drop-table',
          '--add-locks',
          '--disable-keys',
          '--lock-tables=false',
          this.dbConfig.database
        ];

        const mysqldump = spawn('mysqldump', mysqldumpArgs);
        const gzip = spawn('gzip', ['-c']);
        
        // Create write stream for the compressed output
        const writeStream = require('fs').createWriteStream(dumpPath);

        // Pipe mysqldump to gzip to file
        mysqldump.stdout.pipe(gzip.stdin);
        gzip.stdout.pipe(writeStream);

        let stderr = '';
        mysqldump.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        gzip.on('close', async (code) => {
          if (code !== 0) {
            return reject(new Error(`Database backup failed: ${stderr}`));
          }

          try {
            // Get file stats
            const stats = await fs.stat(dumpPath);
            const sha256 = await this.calculateSHA256(dumpPath);

            // Create manifest
            const manifest = {
              jobId,
              type: 'database',
              timestamp,
              database: this.dbConfig.database,
              archive: dumpPath,
              size: stats.size,
              sha256,
              created: new Date().toISOString()
            };

            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

            // Store artifact in database
            const artifactId = uuidv4();
            await this.db.query(
              'INSERT INTO backup_artifacts (id, job_id, artifact_type, file_path, file_size, sha256, manifest_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [artifactId, jobId, 'database', dumpPath, stats.size, sha256, manifestPath, new Date().toISOString()]
            );

            resolve({ id: artifactId, type: 'database', path: dumpPath, size: stats.size, manifest: manifestPath });
          } catch (error) {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async calculateSHA256(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = require('fs').createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async getJobs(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const [jobs] = await this.db.query(
      'SELECT * FROM backup_jobs ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return jobs;
  }

  async getJobDetails(jobId) {
    const [jobs] = await this.db.query('SELECT * FROM backup_jobs WHERE id = ?', [jobId]);
    if (jobs.length === 0) {
      throw new Error('Job not found');
    }

    const [artifacts] = await this.db.query('SELECT * FROM backup_artifacts WHERE job_id = ?', [jobId]);

    return {
      job: jobs[0],
      artifacts
    };
  }

  async getArtifactManifest(artifactId) {
    const [artifacts] = await this.db.query('SELECT * FROM backup_artifacts WHERE id = ?', [artifactId]);
    if (artifacts.length === 0) {
      throw new Error('Artifact not found');
    }

    const manifest = await fs.readFile(artifacts[0].manifest_path, 'utf8');
    return JSON.parse(manifest);
  }

  async initiateRestore(artifactId, mode, options = {}) {
    const [artifacts] = await this.db.query('SELECT * FROM backup_artifacts WHERE id = ?', [artifactId]);
    if (artifacts.length === 0) {
      throw new Error('Artifact not found');
    }

    const artifact = artifacts[0];
    const restoreId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (artifact.artifact_type === 'files') {
      return this.restoreFiles(artifact, restoreId, timestamp, options);
    } else if (artifact.artifact_type === 'database') {
      return this.restoreDatabase(artifact, restoreId, timestamp, options);
    }

    throw new Error('Unknown artifact type');
  }

  async restoreFiles(artifact, restoreId, timestamp, options) {
    const targetDir = options.overwriteTarget 
      ? this.prodRoot 
      : `/var/www/orthodoxmetrics/prod.restore-${timestamp}`;

    if (!options.overwriteTarget) {
      await fs.mkdir(targetDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const tarArgs = ['xzf', artifact.file_path, '-C', targetDir];
      console.log('Restoring files with command:', 'tar', tarArgs.join(' '));

      const tarProcess = spawn('tar', tarArgs);
      let stderr = '';

      tarProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tarProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Restore failed with code ${code}: ${stderr}`));
        }

        resolve({
          restoreId,
          message: `Files restored to ${targetDir}`,
          targetPath: targetDir,
          overwritten: options.overwriteTarget
        });
      });
    });
  }

  async restoreDatabase(artifact, restoreId, timestamp, options) {
    const targetDb = options.overwriteTarget 
      ? this.dbConfig.database 
      : `orthodoxmetrics_db_restore_${timestamp.replace(/-/g, '_')}`;

    return new Promise((resolve, reject) => {
      // First create the database if it's a new restore
      if (!options.overwriteTarget) {
        const createDb = spawn('mysql', [
          '--host', this.dbConfig.host,
          '--user', this.dbConfig.user,
          `--password=${this.dbConfig.password}`,
          '-e', `CREATE DATABASE ${targetDb};`
        ]);

        createDb.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error('Failed to create restore database'));
          }
          this.performDbRestore(artifact, targetDb, restoreId, options, resolve, reject);
        });
      } else {
        this.performDbRestore(artifact, targetDb, restoreId, options, resolve, reject);
      }
    });
  }

  performDbRestore(artifact, targetDb, restoreId, options, resolve, reject) {
    const gunzip = spawn('gunzip', ['-c', artifact.file_path]);
    const mysql = spawn('mysql', [
      '--host', this.dbConfig.host,
      '--user', this.dbConfig.user,
      `--password=${this.dbConfig.password}`,
      targetDb
    ]);

    gunzip.stdout.pipe(mysql.stdin);

    let stderr = '';
    mysql.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mysql.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Database restore failed: ${stderr}`));
      }

      resolve({
        restoreId,
        message: `Database restored to ${targetDb}`,
        targetDatabase: targetDb,
        overwritten: options.overwriteTarget
      });
    });
  }
}

module.exports = BackupEngine;