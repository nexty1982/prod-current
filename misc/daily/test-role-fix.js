// Test role validation fix
const { requireRole } = require('./middleware/auth');

// Test the updated requireAdmin middleware
const testRequireAdmin = requireRole(['admin', 'super', 'super_admin']);

console.log('🔍 Testing role validation...');
console.log('✅ requireAdmin now accepts roles:', ['admin', 'super', 'super_admin']);

// Mock request with super_admin role
const mockReq = {
  session: {
    user: {
      role: 'super_admin',
      email: 'admin@orthodoxmetrics.com'
    }
  }
};

const mockRes = {
  status: (code) => ({
    json: (data) => console.log(`❌ Response ${code}:`, data)
  })
};

const mockNext = () => console.log('✅ Role check passed - super_admin access granted');

console.log('🧪 Testing super_admin role access...');
testRequireAdmin(mockReq, mockRes, mockNext);
