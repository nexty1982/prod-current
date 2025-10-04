// Account Service Test - Quick verification
export const testAccountService = async () => {
    try {
        // Test GET profile
        const response = await fetch('/api/auth/profile', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        console.log('Profile data:', data);

        if (data.success) {
            console.log('✅ Profile fetch successful');
            console.log('Available fields:', Object.keys(data.user));
        } else {
            console.log('❌ Profile fetch failed:', data.message);
        }

        // Test PUT profile (optional)
        const updateResponse = await fetch('/api/auth/profile', {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                first_name: data.user.first_name,
                last_name: data.user.last_name,
                email: data.user.email,
                preferred_language: data.user.preferred_language,
                timezone: data.user.timezone || 'UTC'
            }),
        });

        const updateData = await updateResponse.json();
        if (updateData.success) {
            console.log('✅ Profile update successful');
        } else {
            console.log('❌ Profile update failed:', updateData.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// You can run this in browser console to test:
// testAccountService();
