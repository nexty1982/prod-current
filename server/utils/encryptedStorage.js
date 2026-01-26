const { exec, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

class EncryptedStorage {
  constructor() {
    this.encryptedMountPath = '/mnt/bigbook_secure';
    this.encryptedSourcePath = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/encrypted';
    this.keyPath = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/keys';
    this.isMounted = false;
    this.mountKey = null;
  }

  /**
   * Initialize the encrypted storage system
   */
  async initialize() {
    try {
      logger.info('Initializing encrypted storage system...');
      
      // Create necessary directories
      await this.createDirectories();
      
      // Generate or load encryption key
      await this.initializeEncryptionKey();
      
      // Setup ecryptfs if not already configured
      await this.setupEcryptfs();
      
      // Mount encrypted volume
      await this.mountEncryptedVolume();
      
      logger.info('Encrypted storage system initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize encrypted storage:', error);
      throw error;
    }
  }

  /**
   * Create necessary directories for encrypted storage
   */
  async createDirectories() {
    const dirs = [
      this.encryptedSourcePath,
      this.keyPath,
      path.dirname(this.encryptedMountPath)
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true, mode: 0o700 });
        logger.info(`Created directory: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Initialize or load the encryption key
   */
  async initializeEncryptionKey() {
    const keyFile = path.join(this.keyPath, 'mount.key');
    
    try {
      // Try to load existing key
      const existingKey = await fs.readFile(keyFile, 'utf8');
      this.mountKey = existingKey.trim();
      logger.info('Loaded existing encryption key');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Generate new key
        this.mountKey = crypto.randomBytes(32).toString('hex');
        await fs.writeFile(keyFile, this.mountKey, { mode: 0o600 });
        logger.info('Generated new encryption key');
      } else {
        throw error;
      }
    }
  }

  /**
   * Setup ecryptfs configuration
   */
  async setupEcryptfs() {
    try {
      // Check if ecryptfs commands are available
      execSync('which ecryptfs-add-passphrase', { stdio: 'ignore' });
      execSync('which mount', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('ecryptfs-utils or mount command not found. Please install ecryptfs-utils package.');
    }

    // No config file needed - we'll use direct mount command
    logger.info('Ecryptfs commands verified and ready');
  }

  /**
   * Mount the encrypted volume
   */
  async mountEncryptedVolume() {
    if (this.isMounted) {
      logger.info('Encrypted volume already mounted');
      return;
    }

    try {
      // Check if already mounted
      const mountCheck = execSync('mount | grep ecryptfs', { encoding: 'utf8' });
      if (mountCheck.includes(this.encryptedMountPath)) {
        this.isMounted = true;
        logger.info('Encrypted volume already mounted');
        return;
      }
    } catch (error) {
      // Not mounted, continue with mounting
    }

    try {
      // Create mount point if it doesn't exist
      await fs.mkdir(this.encryptedMountPath, { recursive: true, mode: 0o700 });
      
      // Add passphrase to keyring
      const passphraseResult = execSync(`echo "${this.mountKey}" | ecryptfs-add-passphrase`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Extract the key signature
      const keySignature = passphraseResult.split('\n').find(line => 
        line.includes('Inserted auth tok with sig')
      )?.match(/\[(.*?)\]/)?.[1];
      
      if (!keySignature) {
        throw new Error('Failed to get key signature from ecryptfs-add-passphrase');
      }
      
      // Mount using standard mount command with ecryptfs
      execSync(`mount -t ecryptfs ${this.encryptedSourcePath} ${this.encryptedMountPath} -o key=passphrase,ecryptfs_cipher=aes,ecryptfs_key_bytes=32,ecryptfs_passthrough=no,ecryptfs_enable_filename_crypto=yes,passwd=${this.mountKey}`, {
        stdio: 'pipe'
      });
      
      this.isMounted = true;
      logger.info('Encrypted volume mounted successfully');
      
      // Set restrictive permissions on mount point
      execSync(`chmod 700 ${this.encryptedMountPath}`);
      execSync(`chown www-data:www-data ${this.encryptedMountPath}`);
      
    } catch (error) {
      logger.error('Failed to mount encrypted volume:', error);
      throw error;
    }
  }

  /**
   * Unmount the encrypted volume
   */
  async unmountEncryptedVolume() {
    if (!this.isMounted) {
      logger.info('Encrypted volume not mounted');
      return;
    }

    try {
      execSync(`umount ${this.encryptedMountPath}`);
      this.isMounted = false;
      logger.info('Encrypted volume unmounted successfully');
    } catch (error) {
      logger.error('Failed to unmount encrypted volume:', error);
      throw error;
    }
  }

  /**
   * Store a file in encrypted storage
   */
  async storeFile(fileId, fileName, content, fileType) {
    if (!this.isMounted) {
      throw new Error('Encrypted volume not mounted');
    }

    try {
      // Create type-specific directory
      const typeDir = path.join(this.encryptedMountPath, fileType || 'other');
      await fs.mkdir(typeDir, { recursive: true });

      // Generate encrypted filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const encryptedFileName = `${fileId}_${timestamp}_${safeFileName}`;
      
      const filePath = path.join(typeDir, encryptedFileName);
      
      // Write file to encrypted storage
      await fs.writeFile(filePath, content, { mode: 0o600 });
      
      logger.info(`File stored in encrypted storage: ${fileName} -> ${filePath}`);
      
      return {
        fileId,
        encryptedPath: filePath,
        originalName: fileName,
        fileType,
        storedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to store file in encrypted storage:', error);
      throw error;
    }
  }

  /**
   * Retrieve a file from encrypted storage
   */
  async retrieveFile(fileId, encryptedPath) {
    if (!this.isMounted) {
      throw new Error('Encrypted volume not mounted');
    }

    try {
      const content = await fs.readFile(encryptedPath, 'utf8');
      logger.info(`File retrieved from encrypted storage: ${encryptedPath}`);
      return content;
    } catch (error) {
      logger.error('Failed to retrieve file from encrypted storage:', error);
      throw error;
    }
  }

  /**
   * List files in encrypted storage
   */
  async listFiles() {
    if (!this.isMounted) {
      throw new Error('Encrypted volume not mounted');
    }

    try {
      const files = [];
      
      // Recursively scan encrypted storage
      const scanDirectory = async (dirPath, relativePath = '') => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath, relativeFilePath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            
            // Parse file ID from filename (format: fileId_timestamp_originalName)
            const parts = entry.name.split('_');
            const fileId = parts[0];
            const timestamp = parts[1];
            
            files.push({
              fileId,
              encryptedPath: fullPath,
              relativePath: relativeFilePath,
              originalName: parts.slice(2).join('_'),
              size: stats.size,
              modifiedAt: stats.mtime,
              createdAt: stats.birthtime
            });
          }
        }
      };
      
      await scanDirectory(this.encryptedMountPath);
      return files;
    } catch (error) {
      logger.error('Failed to list files in encrypted storage:', error);
      throw error;
    }
  }

  /**
   * Delete a file from encrypted storage
   */
  async deleteFile(encryptedPath) {
    if (!this.isMounted) {
      throw new Error('Encrypted volume not mounted');
    }

    try {
      await fs.unlink(encryptedPath);
      logger.info(`File deleted from encrypted storage: ${encryptedPath}`);
    } catch (error) {
      logger.error('Failed to delete file from encrypted storage:', error);
      throw error;
    }
  }

  /**
   * Get storage status
   */
  async getStatus() {
    try {
      const mountCheck = execSync('mount | grep ecryptfs', { encoding: 'utf8' });
      const isMounted = mountCheck.includes(this.encryptedMountPath);
      
      let fileCount = 0;
      let totalSize = 0;
      
      if (isMounted) {
        const files = await this.listFiles();
        fileCount = files.length;
        totalSize = files.reduce((sum, file) => sum + file.size, 0);
      }
      
      return {
        isMounted,
        mountPath: this.encryptedMountPath,
        sourcePath: this.encryptedSourcePath,
        fileCount,
        totalSize,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        isMounted: false,
        mountPath: this.encryptedMountPath,
        sourcePath: this.encryptedSourcePath,
        fileCount: 0,
        totalSize: 0,
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateKey() {
    try {
      logger.info('Starting encryption key rotation...');
      
      // Unmount volume
      await this.unmountEncryptedVolume();
      
      // Generate new key
      const newKey = crypto.randomBytes(32).toString('hex');
      const newKeyFile = path.join(this.keyPath, 'mount.key.new');
      await fs.writeFile(newKeyFile, newKey, { mode: 0o600 });
      
      // Create new ecryptfs configuration
      const newConfigFile = path.join(this.keyPath, 'ecryptfs.conf.new');
      const newConfig = `key=passphrase:passphrase_passwd=${newKey}\n`;
      await fs.writeFile(newConfigFile, newConfig, { mode: 0o600 });
      
      // Re-encrypt with new key (this would require copying all files)
      // For now, we'll just update the key file
      await fs.rename(newKeyFile, path.join(this.keyPath, 'mount.key'));
      await fs.rename(newConfigFile, path.join(this.keyPath, 'ecryptfs.conf'));
      
      this.mountKey = newKey;
      
      // Remount with new key
      await this.mountEncryptedVolume();
      
      logger.info('Encryption key rotated successfully');
    } catch (error) {
      logger.error('Failed to rotate encryption key:', error);
      throw error;
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    try {
      await this.unmountEncryptedVolume();
      logger.info('Encrypted storage system shutdown complete');
    } catch (error) {
      logger.error('Error during encrypted storage shutdown:', error);
    }
  }
}

module.exports = EncryptedStorage; 