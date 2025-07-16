// Notification integration helper for sending notifications from other parts of the application
const { notificationService } = require('../routes/notifications');

/**
 * Send a notification to a user
 * @param {number} userId - The user ID to send the notification to
 * @param {string} type - The notification type (must exist in notification_types table)
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {object} options - Additional options
 * @returns {Promise<number>} - The notification ID
 */
async function sendNotification(userId, type, title, message, options = {}) {
    try {
        return await notificationService.createNotification(userId, type, title, message, options);
    } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
        return null;
    }
}

/**
 * Send an email notification to a user
 * @param {number} userId - The user ID to send the email to
 * @param {string} type - The notification type (must exist in notification_types table)
 * @param {object} templateData - Data to populate the email template
 * @param {object} options - Additional options
 * @returns {Promise<number>} - The queue ID
 */
async function sendEmailNotification(userId, type, templateData, options = {}) {
    try {
        return await notificationService.queueEmailNotification(userId, type, templateData, options);
    } catch (error) {
        console.error(`Error sending email notification to user ${userId}:`, error);
        return null;
    }
}

/**
 * Send both in-app and email notifications
 * @param {number} userId - The user ID
 * @param {string} type - The notification type
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {object} templateData - Data for email template
 * @param {object} options - Additional options
 */
async function sendBothNotifications(userId, type, title, message, templateData, options = {}) {
    try {
        // Send in-app notification
        const notificationId = await sendNotification(userId, type, title, message, options);

        // Send email notification
        const emailId = await sendEmailNotification(userId, type, templateData, options);

        return { notificationId, emailId };
    } catch (error) {
        console.error(`Error sending notifications to user ${userId}:`, error);
        return null;
    }
}

/**
 * Common notification senders for various application events
 */
const NotificationSenders = {
    // Welcome notification for new users
    welcome: async (userId, userData) => {
        return await sendBothNotifications(
            userId,
            'welcome',
            'Welcome to Orthodox Metrics!',
            'Thank you for joining our platform. We are excited to have you here.',
            {
                user_name: userData.name || userData.email,
                email: userData.email,
                church_name: userData.church_name || ''
            },
            {
                priority: 'normal',
                actionUrl: '/dashboard',
                actionText: 'Go to Dashboard'
            }
        );
    },

    // Backup completion notification
    backupCompleted: async (userId, backupData) => {
        return await sendBothNotifications(
            userId,
            'backup_completed',
            'Backup Completed Successfully',
            `Your backup has been completed successfully. Size: ${backupData.size}, Duration: ${backupData.duration}`,
            {
                backup_size: backupData.size,
                backup_duration: backupData.duration,
                file_count: backupData.file_count,
                backup_date: backupData.date
            },
            {
                priority: 'normal',
                actionUrl: '/admin/settings',
                actionText: 'View Backups'
            }
        );
    },

    // Backup failure notification
    backupFailed: async (userId, errorData) => {
        return await sendBothNotifications(
            userId,
            'backup_failed',
            'Backup Failed',
            `Your backup failed to complete. Error: ${errorData.message}`,
            {
                error_message: errorData.message,
                backup_date: errorData.date
            },
            {
                priority: 'high',
                actionUrl: '/admin/settings',
                actionText: 'Check Settings'
            }
        );
    },

    // Certificate ready notification
    certificateReady: async (userId, certificateData) => {
        return await sendBothNotifications(
            userId,
            'certificate_ready',
            'Certificate Ready for Download',
            `Your ${certificateData.type} certificate for ${certificateData.person_name} is ready.`,
            {
                certificate_type: certificateData.type,
                person_name: certificateData.person_name,
                certificate_date: certificateData.date
            },
            {
                priority: 'normal',
                actionUrl: `/certificates/${certificateData.id}`,
                actionText: 'Download Certificate'
            }
        );
    },

    // Password reset notification
    passwordReset: async (userId, resetData) => {
        return await sendEmailNotification(
            userId,
            'password_reset',
            {
                user_name: resetData.user_name,
                reset_link: resetData.reset_link,
                expiry_time: resetData.expiry_time
            },
            {
                priority: 'high'
            }
        );
    },

    // Login alert notification
    loginAlert: async (userId, loginData) => {
        return await sendNotification(
            userId,
            'login_alert',
            'New Login Detected',
            `A new login was detected from ${loginData.location} at ${loginData.time}`,
            {
                priority: 'normal',
                data: loginData
            }
        );
    },

    // Profile updated notification
    profileUpdated: async (userId) => {
        return await sendNotification(
            userId,
            'profile_updated',
            'Profile Updated',
            'Your profile has been successfully updated.',
            {
                priority: 'low',
                actionUrl: '/profile',
                actionText: 'View Profile'
            }
        );
    },

    // Invoice created notification
    invoiceCreated: async (userId, invoiceData) => {
        return await sendBothNotifications(
            userId,
            'invoice_created',
            'New Invoice Created',
            `Invoice #${invoiceData.invoice_number} has been created for $${invoiceData.amount}`,
            {
                invoice_number: invoiceData.invoice_number,
                amount: invoiceData.amount,
                due_date: invoiceData.due_date
            },
            {
                priority: 'normal',
                actionUrl: `/invoices/${invoiceData.id}`,
                actionText: 'View Invoice'
            }
        );
    },

    // Invoice paid notification
    invoicePaid: async (userId, invoiceData) => {
        return await sendBothNotifications(
            userId,
            'invoice_paid',
            'Invoice Payment Received',
            `Payment for invoice #${invoiceData.invoice_number} has been received.`,
            {
                invoice_number: invoiceData.invoice_number,
                amount: invoiceData.amount,
                payment_date: invoiceData.payment_date
            },
            {
                priority: 'normal',
                actionUrl: `/invoices/${invoiceData.id}`,
                actionText: 'View Invoice'
            }
        );
    },

    // System maintenance notification
    systemMaintenance: async (userId, maintenanceData) => {
        return await sendBothNotifications(
            userId,
            'system_maintenance',
            'Scheduled Maintenance',
            `System maintenance is scheduled from ${maintenanceData.start_time} to ${maintenanceData.end_time}`,
            {
                start_time: maintenanceData.start_time,
                end_time: maintenanceData.end_time,
                description: maintenanceData.description
            },
            {
                priority: 'high',
                actionUrl: '/maintenance',
                actionText: 'Learn More'
            }
        );
    },

    // Note shared notification
    noteShared: async (userId, shareData) => {
        return await sendNotification(
            userId,
            'note_shared',
            'Note Shared With You',
            `${shareData.sharer_name} has shared a note titled "${shareData.note_title}" with you.`,
            {
                priority: 'normal',
                actionUrl: `/notes/${shareData.note_id}`,
                actionText: 'View Note',
                data: shareData
            }
        );
    }
};

module.exports = {
    sendNotification,
    sendEmailNotification,
    sendBothNotifications,
    NotificationSenders
};
