const fs = require('fs');
const path = require('path');

(async () => {
    try {
        console.log('🚨 COMPREHENSIVE SECURITY SCAN - Finding ALL auth bypasses...\n');
        
        // Recursively scan directory for JS files
        function getAllJSFiles(dir, filelist = []) {
            const files = fs.readdirSync(dir);
            
            files.forEach(file => {
                const filepath = path.join(dir, file);
                const stat = fs.statSync(filepath);
                
                if (stat.isDirectory()) {
                    // Skip node_modules and other irrelevant directories
                    if (!['node_modules', '.git', 'uploads', 'logs', 'temp'].includes(file)) {
                        getAllJSFiles(filepath, filelist);
                    }
                } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
                    filelist.push(filepath);
                }
            });
            
            return filelist;
        }
        
        // Dangerous patterns to search for
        const dangerousPatterns = [
            {
                pattern: /TEMPORARY.*BYPASS/gi,
                severity: 'CRITICAL',
                description: 'Temporary authentication bypass code'
            },
            {
                pattern: /req\.session\.user\s*=.*admin/gi,
                severity: 'CRITICAL', 
                description: 'Direct admin session assignment'
            },
            {
                pattern: /bypass.*auth/gi,
                severity: 'HIGH',
                description: 'Authentication bypass references'
            },
            {
                pattern: /find.*admin.*user.*for.*bypass/gi,
                severity: 'CRITICAL',
                description: 'Admin user lookup for bypass'
            },
            {
                pattern: /console\.log.*password/gi,
                severity: 'MEDIUM',
                description: 'Password logging'
            },
            {
                pattern: /\bpassword\s*=\s*['"][^'"]+['"]/gi,
                severity: 'HIGH',
                description: 'Hardcoded password'
            }
        ];
        
        // Get all files to scan
        const serverFiles = getAllJSFiles(path.join(__dirname, '..', 'server'));
        const frontendFiles = getAllJSFiles(path.join(__dirname, '..', 'front-end', 'src'));
        const allFiles = [...serverFiles, ...frontendFiles];
        
        let totalIssues = 0;
        let criticalIssues = 0;
        const issuesByFile = {};
        
        console.log(`📁 Scanning ${allFiles.length} files...\n`);
        
        // Scan each file
        allFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const relativePath = path.relative(__dirname, filePath);
                const issues = [];
                
                // Check each dangerous pattern
                dangerousPatterns.forEach(({ pattern, severity, description }) => {
                    const matches = content.match(pattern);
                    if (matches) {
                        matches.forEach(match => {
                            issues.push({
                                severity,
                                description,
                                match: match.substring(0, 100) + (match.length > 100 ? '...' : ''),
                                line: content.substring(0, content.indexOf(match)).split('\n').length
                            });
                            
                            totalIssues++;
                            if (severity === 'CRITICAL') {
                                criticalIssues++;
                            }
                        });
                    }
                });
                
                if (issues.length > 0) {
                    issuesByFile[relativePath] = issues;
                }
                
            } catch (err) {
                console.log(`⚠️  Could not read file: ${filePath}`);
            }
        });
        
        // Report findings
        console.log('🔍 SECURITY SCAN RESULTS:\n');
        
        if (Object.keys(issuesByFile).length === 0) {
            console.log('✅ NO SECURITY ISSUES FOUND!');
        } else {
            Object.entries(issuesByFile).forEach(([file, issues]) => {
                console.log(`📄 ${file}:`);
                issues.forEach(issue => {
                    const icon = issue.severity === 'CRITICAL' ? '🚨' : 
                                issue.severity === 'HIGH' ? '⚠️' : '💡';
                    console.log(`   ${icon} ${issue.severity}: ${issue.description}`);
                    console.log(`      Line ${issue.line}: ${issue.match}`);
                });
                console.log('');
            });
        }
        
        // Summary
        console.log('📊 SCAN SUMMARY:');
        console.log(`   Total files scanned: ${allFiles.length}`);
        console.log(`   Files with issues: ${Object.keys(issuesByFile).length}`);
        console.log(`   Total issues: ${totalIssues}`);
        console.log(`   Critical issues: ${criticalIssues}`);
        
        // Recommendations
        console.log('\n🛡️  SECURITY RECOMMENDATIONS:');
        if (criticalIssues > 0) {
            console.log('   🚨 CRITICAL: Fix all critical issues immediately!');
            console.log('   🚨 CRITICAL: Restart all servers after fixes!');
            console.log('   🚨 CRITICAL: Clear all user sessions!');
        }
        console.log('   ✅ Remove all temporary/debugging authentication code');
        console.log('   ✅ Never log passwords or sensitive data');
        console.log('   ✅ Use environment variables for secrets');
        console.log('   ✅ Implement proper session validation');
        console.log('   ✅ Regular security audits');
        
        console.log('\n🔧 IMMEDIATE ACTIONS:');
        console.log('   1. Fix all critical issues');
        console.log('   2. Restart backend server');
        console.log('   3. Clear all sessions: node debug/cleanup-expired-sessions.js');
        console.log('   4. Test authentication flow thoroughly');
        
        process.exit(criticalIssues > 0 ? 1 : 0);
        
    } catch (err) {
        console.error('❌ Security scan failed:', err.message);
        process.exit(1);
    }
})(); 