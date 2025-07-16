// Quick test for Church Management functionality
// Run this to test if churches API is working

const testChurchManagement = async () => {
    try {
        console.log('Testing Church Management API...');

        // Test 1: Check if churches endpoint responds
        const response = await fetch('/api/churches', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Churches API Status:', response.status);

        if (response.status === 401) {
            console.log('❌ Authentication required - need to login first');
            return;
        }

        if (response.status === 403) {
            console.log('❌ Access denied - need admin role');
            return;
        }

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Churches API working!');
            console.log('Churches found:', data.churches?.length || 0);
            return data;
        } else {
            console.log('❌ API Error:', response.status, response.statusText);
            const errorText = await response.text();
            console.log('Error details:', errorText);
        }

    } catch (error) {
        console.error('❌ Network error:', error);
    }
};

// Test 2: Check if user has required permissions
const checkUserPermissions = async () => {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Current user:', data.user);
            console.log('User role:', data.user?.role);
            console.log('Has admin access:', ['admin', 'super_admin'].includes(data.user?.role));
        }
    } catch (error) {
        console.error('Error checking user permissions:', error);
    }
};

// Run tests
console.log('=== Church Management Test ===');
checkUserPermissions();
testChurchManagement();
