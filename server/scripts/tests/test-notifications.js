const { notificationService } = require('./routes/notifications');

// Helper function to create test notifications
async function createTestNotifications() {
    try {
        console.log('Creating test notifications...');

        // Example test notification for user ID 1 (replace with actual user ID)
        const userId = 1;

        // Test welcome notification
        await notificationService.createNotification(
            userId,
            'welcome',
            'Welcome to Orthodox Metrics!',
            'Thank you for joining our platform. We are excited to have you here.',
            {
                priority: 'normal',
                actionUrl: '/dashboard',
                actionText: 'Go to Dashboard',
                icon: 'person'
            }
        );

        // Test backup notification
        await notificationService.createNotification(
            userId,
            'backup_completed',
            'Backup Completed Successfully',
            'Your database backup has been completed. The backup file is now available for download.',
            {
                priority: 'normal',
                actionUrl: '/admin/settings',
                actionText: 'View Backups',
                icon: 'backup'
            }
        );

        // Test high priority notification
        await notificationService.createNotification(
            userId,
            'system_alert',
            'System Maintenance Scheduled',
            'A scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM EST. The system will be temporarily unavailable.',
            {
                priority: 'high',
                actionUrl: '/maintenance',
                actionText: 'Learn More',
                icon: 'warning'
            }
        );

        // Test urgent notification
        await notificationService.createNotification(
            userId,
            'security',
            'Security Alert: New Login Detected',
            'A new login to your account was detected from an unrecognized device. If this was not you, please secure your account immediately.',
            {
                priority: 'urgent',
                actionUrl: '/settings/security',
                actionText: 'Secure Account',
                icon: 'security'
            }
        );

        console.log('Test notifications created successfully!');
    } catch (error) {
        console.error('Error creating test notifications:', error);
    }
}

// Helper function to test email notifications
async function testEmailNotification() {
    try {
        console.log('Testing email notification...');

        const userId = 1; // Replace with actual user ID

        await notificationService.queueEmailNotification(
            userId,
            'welcome',
            {
                user_name: 'Test User',
                email: 'test@example.com',
                church_name: 'Test Church'
            },
            {
                priority: 'normal'
            }
        );

        console.log('Email notification queued successfully!');
    } catch (error) {
        console.error('Error testing email notification:', error);
    }
}

// Export functions for use
module.exports = {
    createTestNotifications,
    testEmailNotification
};

// If running this file directly
if (require.main === module) {
    createTestNotifications();
}
