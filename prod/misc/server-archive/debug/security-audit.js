const fs = require('fs');
const path = require('path');

(async () => {
    try {
        console.log('🔒 SECURITY AUDIT - Checking for authentication bypasses...\n');
        
        // Function to search for security issues in a file
        function auditFile(filePath) {
            const content = fs.readFileSync(filePath, 'utf8');
            const issues = [];
            
            // Check for temporary bypass code
            if (content.includes('TEMPORARY') && content.includes('BYPASS')) {
                issues.push('❌ CRITICAL: Contains TEMPORARY BYPASS code');
            }
            
            // Check for authentication bypasses
            if (content.includes('bypass') && content.includes('auth')) {
                issues.push('⚠️  WARNING: Contains authentication bypass references');
            }
            
            // Check for hardcoded credentials
            if (content.includes('password') && (content.includes('=') || content.includes(':'))) {
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes('password') && (line.includes('=') || line.includes(':')) && 
                        !line.includes('password_hash') && !line.includes('req.body.password') && 
                        !line.includes('process.env') && !line.trim().startsWith('//')) {
                        issues.push(`⚠️  WARNING: Possible hardcoded password on line ${index + 1}`);
                    }
                });
            }
            
            // Check for debug code that might expose data
            if (content.includes('console.log') && content.includes('password')) {
                issues.push('⚠️  WARNING: Console.log statements with password references');
            }
            
            // Check for session manipulation
            if (content.includes('req.session.user =') && !content.includes('login')) {
                issues.push('⚠️  WARNING: Direct session manipulation outside login');
            }
            
            return issues;
        }
        
        // Files to audit
        const filesToAudit = [
            'server/routes/admin.js',
            'server/routes/auth.js',
            'server/middleware/auth.js',
            'server/config/session.js',
            'server/index.js'
        ];
        
        let totalIssues = 0;
        
        for (const file of filesToAudit) {
            const fullPath = path.join(__dirname, '..', file);
            
            if (fs.existsSync(fullPath)) {
                console.log(`🔍 Auditing: ${file}`);
                const issues = auditFile(fullPath);
                
                if (issues.length > 0) {
                    issues.forEach(issue => {
                        console.log(`   ${issue}`);
                        totalIssues++;
                    });
                } else {
                    console.log('   ✅ No security issues found');
                }
                console.log('');
            } else {
                console.log(`⚠️  File not found: ${file}\n`);
            }
        }
        
        // Summary
        console.log('🎯 SECURITY AUDIT SUMMARY:');
        console.log(`   Total issues found: ${totalIssues}`);
        
        if (totalIssues === 0) {
            console.log('   ✅ No major security issues detected');
        } else {
            console.log('   ❌ Security issues found - review and fix immediately');
        }
        
        // Additional recommendations
        console.log('\n🛡️  SECURITY RECOMMENDATIONS:');
        console.log('   1. ✅ Remove all TEMPORARY BYPASS code from production');
        console.log('   2. ✅ Never log passwords or sensitive data');
        console.log('   3. ✅ Use environment variables for secrets');
        console.log('   4. ✅ Implement proper session validation');
        console.log('   5. ✅ Regular security audits');
        
        console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
        console.log('   1. Clear all browser cookies and sessions');
        console.log('   2. Restart the backend server');
        console.log('   3. Login through proper authentication only');
        console.log('   4. Monitor logs for unauthorized access');
        
        process.exit(totalIssues > 0 ? 1 : 0);
        
    } catch (err) {
        console.error('❌ Security audit failed:', err.message);
        process.exit(1);
    }
})(); 