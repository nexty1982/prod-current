import { BoundComponent } from '../../../front-end/src/pages/omb/types';

export default {
  name: "securityAnalyzer",
  description: "Analyzes security aspects of components",
  run: async (component: BoundComponent): Promise<string> => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check for security issues
    if (component.roles.length === 0) {
      issues.push("No access roles defined");
      recommendations.push("Define appropriate access roles");
    }
    
    if (component.roles.includes('super_admin') && component.type === 'icon') {
      issues.push("Super admin access on icon component may be too broad");
      recommendations.push("Consider more specific role assignments");
    }
    
    if (component.route && !component.route.startsWith('/api/')) {
      issues.push("Route doesn't follow API convention");
      recommendations.push("Use /api/ prefix for backend routes");
    }
    
    if (component.dbTable && component.dbTable.includes('user') && !component.roles.includes('admin')) {
      issues.push("User data access without admin role");
      recommendations.push("Add admin role for user data access");
    }
    
    // Generate report
    let report = "🔒 Security Analysis:\n";
    
    if (issues.length === 0) {
      report += "✅ No security issues detected\n";
    } else {
      report += `⚠️ Found ${issues.length} potential issues:\n`;
      issues.forEach(issue => {
        report += `  • ${issue}\n`;
      });
    }
    
    if (recommendations.length > 0) {
      report += "\n💡 Recommendations:\n";
      recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
    }
    
    return report;
  }
}; 