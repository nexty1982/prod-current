const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const execAsync = promisify(exec);

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.session.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Super admin privileges required' });
    }
    next();
};

router.use(requireSuperAdmin);

// Certificate file locations
const CERT_PATHS = {
    local: {
        fullCert: '/etc/ssl/certs/orthodoxmetrics-full-cert.pem',
        fullChain: '/etc/ssl/certs/orthodoxmetrics-fullchain.pem',
    },
    remote: {
        host: '192.168.1.221',
        fullCert: '/etc/ssl/certs/orthodoxmetrics-full-cert.pem',
        privateKey: '/etc/ssl/private/orthodoxmetrics.key',
    },
    staging: '/var/www/orthodoxmetrics/prod/server/storage/ssl-staging',
};

/**
 * Parse certificate details using openssl
 */
async function getCertInfo(certPath, remote = false) {
    try {
        const prefix = remote ? `ssh ${CERT_PATHS.remote.host} ` : '';
        const { stdout: dates } = await execAsync(
            `${prefix}openssl x509 -in ${certPath} -noout -dates -subject -issuer -serial 2>/dev/null`
        );
        const { stdout: fingerprint } = await execAsync(
            `${prefix}openssl x509 -in ${certPath} -noout -fingerprint -sha256 2>/dev/null`
        );

        const lines = dates.trim().split('\n');
        const info = {};
        for (const line of lines) {
            const [key, ...valParts] = line.split('=');
            const val = valParts.join('=').trim();
            if (key === 'notBefore') info.validFrom = val;
            else if (key === 'notAfter') info.validTo = val;
            else if (key.includes('subject')) info.subject = val;
            else if (key.includes('issuer')) info.issuer = val;
            else if (key.includes('serial')) info.serial = val;
        }

        info.fingerprint = fingerprint.trim().split('=').slice(1).join('=').trim();

        // Calculate days until expiry
        const expiry = new Date(info.validTo);
        const now = new Date();
        info.daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
        info.isExpired = info.daysUntilExpiry < 0;
        info.isExpiringSoon = info.daysUntilExpiry >= 0 && info.daysUntilExpiry <= 30;

        // File stat
        const { stdout: stat } = await execAsync(
            `${prefix}stat -c '%Y %s' ${certPath} 2>/dev/null`
        );
        const [mtime, size] = stat.trim().split(' ');
        info.lastModified = new Date(parseInt(mtime) * 1000).toISOString();
        info.fileSize = parseInt(size);
        info.filePath = certPath;

        return info;
    } catch (err) {
        return { error: err.message, filePath: certPath };
    }
}

/**
 * GET /api/admin/ssl-certificates
 * Get current certificate status for both local and remote (proxy) servers
 */
router.get('/', async (req, res) => {
    try {
        const [localCert, remoteCert] = await Promise.all([
            getCertInfo(CERT_PATHS.local.fullCert, false),
            getCertInfo(CERT_PATHS.remote.fullCert, true),
        ]);

        // Check if staging directory has pending certs
        let stagedFiles = [];
        try {
            const files = await fs.readdir(CERT_PATHS.staging);
            stagedFiles = files.filter(f => f.endsWith('.pem') || f.endsWith('.crt') || f.endsWith('.key'));
        } catch {
            // staging dir doesn't exist yet
        }

        res.json({
            success: true,
            data: {
                local: { ...localCert, label: 'Internal Server (.239)' },
                remote: { ...remoteCert, label: 'SSL Proxy (.221)' },
                stagedFiles,
                certPaths: CERT_PATHS,
            }
        });
    } catch (err) {
        console.error('SSL certificate check error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/admin/ssl-certificates/extract
 * Extract the uploaded zip from docs/ and stage certificates
 */
router.post('/extract', async (req, res) => {
    try {
        const zipPath = path.resolve('/var/www/orthodoxmetrics/prod/docs/orthodoxmetrics.com-certificates.zip');
        const stagingDir = CERT_PATHS.staging;

        // Verify zip exists
        try {
            await fs.access(zipPath);
        } catch {
            return res.status(404).json({ success: false, message: 'Certificate zip not found at docs/orthodoxmetrics.com-certificates.zip' });
        }

        // Create staging directory
        await fs.mkdir(stagingDir, { recursive: true });

        // Clean staging directory
        const existing = await fs.readdir(stagingDir);
        for (const f of existing) {
            await fs.unlink(path.join(stagingDir, f));
        }

        // Extract zip to staging
        await execAsync(`unzip -o "${zipPath}" -d "${stagingDir}"`);

        // List extracted files
        const files = await fs.readdir(stagingDir);
        const certFiles = files.filter(f => f.endsWith('.pem') || f.endsWith('.crt') || f.endsWith('.key'));

        // Parse each cert file for info
        const fileDetails = [];
        for (const f of certFiles) {
            const filePath = path.join(stagingDir, f);
            try {
                const { stdout } = await execAsync(
                    `openssl x509 -in "${filePath}" -noout -subject -dates 2>/dev/null`
                );
                fileDetails.push({ name: f, info: stdout.trim(), type: 'certificate' });
            } catch {
                // Might be a key file or intermediate
                const content = await fs.readFile(filePath, 'utf8');
                if (content.includes('PRIVATE KEY')) {
                    fileDetails.push({ name: f, type: 'private_key' });
                } else if (content.includes('CERTIFICATE')) {
                    fileDetails.push({ name: f, type: 'certificate_fragment' });
                } else {
                    fileDetails.push({ name: f, type: 'unknown' });
                }
            }
        }

        res.json({
            success: true,
            message: `Extracted ${certFiles.length} certificate files to staging`,
            data: { files: fileDetails, stagingDir }
        });
    } catch (err) {
        console.error('Certificate extraction error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/admin/ssl-certificates/install
 * Build fullchain and install certificates to local and remote servers
 */
router.post('/install', async (req, res) => {
    try {
        const stagingDir = CERT_PATHS.staging;
        const files = await fs.readdir(stagingDir);

        if (files.length === 0) {
            return res.status(400).json({ success: false, message: 'No staged certificate files. Extract first.' });
        }

        const steps = [];

        // Find the certificate and intermediate files
        const certFile = files.find(f => f.includes('certificate') && f.endsWith('.pem'));
        const intermFile = files.find(f => f.includes('intermediate'));
        const rootFile = files.find(f => f.includes('root'));

        if (!certFile) {
            return res.status(400).json({ success: false, message: 'No certificate .pem file found in staged files.' });
        }

        // Build fullchain: cert + intermediate + root (each section trimmed, joined with newlines)
        const parts = [await fs.readFile(path.join(stagingDir, certFile), 'utf8')];
        if (intermFile) parts.push(await fs.readFile(path.join(stagingDir, intermFile), 'utf8'));
        if (rootFile) parts.push(await fs.readFile(path.join(stagingDir, rootFile), 'utf8'));
        const fullChain = parts.map(p => p.trim()).join('\n');

        // Write fullchain to staging
        const fullChainPath = path.join(stagingDir, 'orthodoxmetrics-full-cert.pem');
        await fs.writeFile(fullChainPath, fullChain + '\n');
        steps.push('Built fullchain certificate (cert + intermediate + root)');

        // Install to local server
        await execAsync(`sudo cp "${fullChainPath}" "${CERT_PATHS.local.fullCert}"`);
        await execAsync(`sudo cp "${fullChainPath}" "${CERT_PATHS.local.fullChain}"`);
        steps.push('Installed fullchain to local server (.239)');

        // Copy to remote proxy server
        try {
            await execAsync(`scp "${fullChainPath}" ${CERT_PATHS.remote.host}:/tmp/orthodoxmetrics-full-cert.pem`);
            await execAsync(`ssh ${CERT_PATHS.remote.host} "sudo cp /tmp/orthodoxmetrics-full-cert.pem ${CERT_PATHS.remote.fullCert} && rm /tmp/orthodoxmetrics-full-cert.pem"`);
            steps.push('Installed fullchain to SSL proxy (.221)');
        } catch (err) {
            steps.push(`WARNING: Failed to install on remote proxy: ${err.message}`);
        }

        // Test nginx config on remote
        try {
            const { stdout: testResult } = await execAsync(`ssh ${CERT_PATHS.remote.host} "sudo nginx -t 2>&1"`);
            steps.push(`Nginx config test: ${testResult.trim()}`);
        } catch (err) {
            steps.push(`WARNING: Nginx config test failed: ${err.message}`);
        }

        res.json({
            success: true,
            message: 'Certificates installed successfully',
            data: { steps }
        });
    } catch (err) {
        console.error('Certificate installation error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/admin/ssl-certificates/reload-nginx
 * Reload nginx on the remote proxy to pick up new certificates
 */
router.post('/reload-nginx', async (req, res) => {
    try {
        const steps = [];

        // Reload nginx on remote proxy
        try {
            await execAsync(`ssh ${CERT_PATHS.remote.host} "sudo systemctl reload nginx"`);
            steps.push('Nginx reloaded on SSL proxy (.221)');
        } catch (err) {
            return res.status(500).json({ success: false, message: `Failed to reload nginx: ${err.message}` });
        }

        // Verify the certificate is being served
        try {
            const { stdout } = await execAsync(
                `echo | openssl s_client -connect orthodoxmetrics.com:443 -servername orthodoxmetrics.com 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null`
            );
            steps.push(`Live certificate check: ${stdout.trim()}`);
        } catch (err) {
            steps.push(`Note: Could not verify live certificate: ${err.message}`);
        }

        res.json({ success: true, message: 'Nginx reloaded', data: { steps } });
    } catch (err) {
        console.error('Nginx reload error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/admin/ssl-certificates/upload-key
 * Upload a private key file (sent as text in request body)
 */
router.post('/upload-key', async (req, res) => {
    try {
        const { keyContent } = req.body;
        if (!keyContent || !keyContent.includes('PRIVATE KEY')) {
            return res.status(400).json({ success: false, message: 'Invalid private key content' });
        }

        const stagingDir = CERT_PATHS.staging;
        await fs.mkdir(stagingDir, { recursive: true });

        const keyPath = path.join(stagingDir, 'orthodoxmetrics.key');
        await fs.writeFile(keyPath, keyContent, { mode: 0o600 });

        // Install to remote proxy
        const steps = ['Private key saved to staging'];
        try {
            await execAsync(`scp "${keyPath}" ${CERT_PATHS.remote.host}:/tmp/orthodoxmetrics.key`);
            await execAsync(`ssh ${CERT_PATHS.remote.host} "sudo cp /tmp/orthodoxmetrics.key ${CERT_PATHS.remote.privateKey} && sudo chmod 600 ${CERT_PATHS.remote.privateKey} && rm /tmp/orthodoxmetrics.key"`);
            steps.push('Private key installed on SSL proxy (.221)');
        } catch (err) {
            steps.push(`WARNING: Failed to install key on remote proxy: ${err.message}`);
        }

        res.json({ success: true, message: 'Private key uploaded and installed', data: { steps } });
    } catch (err) {
        console.error('Key upload error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
