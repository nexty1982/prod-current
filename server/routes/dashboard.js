const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/db');

// Get dashboard summary for a church
router.get('/summary/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    
    // Get record counts
    const [baptisms] = await promisePool.query(
      'SELECT COUNT(*) as count FROM baptism_records WHERE church_id = ?',
      [churchId]
    );
    
    const [marriages] = await promisePool.query(
      'SELECT COUNT(*) as count FROM marriage_records WHERE church_id = ?',
      [churchId]
    );
    
    const [funerals] = await promisePool.query(
      'SELECT COUNT(*) as count FROM funeral_records WHERE church_id = ?',
      [churchId]
    );
    
    // Get additional stats
    const recordsNeedingReview = 3;
    const uploadErrors = 1;
    
    // Get monthly activity for the last 6 months
    const monthlyActivity = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStart = month.toISOString().split('T')[0];
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const [baptismMonth] = await promisePool.query(
        'SELECT COUNT(*) as count FROM baptism_records WHERE church_id = ? AND date_entered >= ? AND date_entered <= ?',
        [churchId, monthStart, monthEnd]
      );
      
      const [marriageMonth] = await promisePool.query(
        'SELECT COUNT(*) as count FROM marriage_records WHERE church_id = ? AND date_entered >= ? AND date_entered <= ?',
        [churchId, monthStart, monthEnd]
      );
      
      const [funeralMonth] = await promisePool.query(
        'SELECT COUNT(*) as count FROM funeral_records WHERE church_id = ? AND date_entered >= ? AND date_entered <= ?',
        [churchId, monthStart, monthEnd]
      );
      
      const baptismCount = baptismMonth[0]?.count || 0;
      const marriageCount = marriageMonth[0]?.count || 0;
      const funeralCount = funeralMonth[0]?.count || 0;
      const uploads = Math.floor(Math.random() * 10); // Mock data
      
      monthlyActivity.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        baptisms: baptismCount,
        marriages: marriageCount,
        funerals: funeralCount,
        uploads: uploads,
        total: baptismCount + marriageCount + funeralCount
      });
    }
    
    const summary = {
      totalBaptisms: baptisms[0]?.count || 0,
      totalMarriages: marriages[0]?.count || 0,
      totalFunerals: funerals[0]?.count || 0,
      recordsNeedingReview,
      uploadErrors,
      monthlyActivity,
      lastUpdated: new Date().toISOString()
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Get activity log
router.get('/activity-log/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Mock activity log data
    const activities = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        userId: 'user1',
        userName: 'Father John',
        userRole: 'priest',
        action: 'CREATE_BAPTISM',
        recordType: 'baptism',
        recordId: 'B123',
        description: 'Created new baptism record for John Smith',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        changes: { name: 'John Smith', date: '2024-01-15' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        userId: 'user2',
        userName: 'Mary Johnson',
        userRole: 'volunteer',
        action: 'FILE_UPLOAD',
        recordType: 'upload',
        description: 'Uploaded file: baptism_records_1920.pdf',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        changes: { filename: 'baptism_records_1920.pdf', size: '2.5MB' }
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        userId: 'user3',
        userName: 'Administrator',
        userRole: 'admin',
        action: 'UPDATE_MARRIAGE',
        recordType: 'marriage',
        recordId: 'M456',
        description: 'Updated marriage record for Peter and Anna Wilson',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        changes: { witness1: 'Updated witness name' }
      }
    ];
    
    res.json({
      activities,
      totalCount: activities.length,
      hasMore: false
    });
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// Get activity log (legacy endpoint)
router.get('/activity/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Mock activity log data
    const activities = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        userId: 'user1',
        userName: 'Father John',
        userRole: 'priest',
        action: 'CREATE_BAPTISM',
        recordType: 'baptism',
        recordId: 'B123',
        description: 'Created new baptism record for John Smith',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        changes: { name: 'John Smith', date: '2024-01-15' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        userId: 'user2',
        userName: 'Mary Johnson',
        userRole: 'volunteer',
        action: 'FILE_UPLOAD',
        recordType: 'upload',
        description: 'Uploaded file: baptism_records_1920.pdf',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        changes: { filename: 'baptism_records_1920.pdf', size: '2.5MB' }
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        userId: 'user3',
        userName: 'Administrator',
        userRole: 'admin',
        action: 'UPDATE_MARRIAGE',
        recordType: 'marriage',
        recordId: 'M456',
        description: 'Updated marriage record for Peter and Anna Wilson',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        changes: { witness1: 'Updated witness name' }
      }
    ];
    
    res.json({
      activities,
      totalCount: activities.length,
      hasMore: false
    });
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// Get notifications
router.get('/notifications/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    
    // Mock notifications data
    const notifications = [
      {
        id: '1',
        type: 'error',
        title: 'File Processing Failed',
        message: 'Failed to process baptism_records_1920.pdf due to poor image quality',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'high',
        actionUrl: '/pages/records',
        metadata: { filename: 'baptism_records_1920.pdf' }
      },
      {
        id: '2',
        type: 'warning',
        title: 'Records Need Review',
        message: '3 processed records require manual verification',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        isRead: false,
        priority: 'medium',
        actionUrl: '/pages/records',
        metadata: { count: 3 }
      },
      {
        id: '3',
        type: 'success',
        title: 'Backup Completed',
        message: 'Daily backup of church records completed successfully',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        isRead: true,
        priority: 'low',
        metadata: { recordCount: 1247 }
      }
    ];
    
    res.json(notifications);
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Mock response - in real implementation, update database
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Get church information
router.get('/church/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    
    // Mock church data
    const church = {
      id: churchId,
      name: 'Saints Peter & Paul Orthodox Church',
      location: 'Manville, NJ 08835',
      established: '1952',
      recordsStartYear: 1952,
      recordsEndYear: new Date().getFullYear(),
      totalRecords: 1247,
      languages: ['English', 'Russian', 'Romanian', 'Greek'],
      timezone: 'America/New_York',
      contactEmail: 'records@ssppoc.org',
      contactPhone: '(732) 722-0992',
      website: 'https://ssppoc.org',
      address: '123 Church Street, Manville, NJ 08835',
      description: 'Orthodox Christian church serving the community since 1952',
      features: ['Digital Records', 'Certificate Generation', 'Liturgical Calendar', 'File Management']
    };
    
    res.json(church);
  } catch (error) {
    console.error('Church info error:', error);
    res.status(500).json({ error: 'Failed to fetch church information' });
  }
});

// Export dashboard data
router.get('/export/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    const { format = 'json', type = 'summary' } = req.query;
    
    // Mock export functionality
    const exportData = {
      churchId,
      exportType: type,
      format,
      timestamp: new Date().toISOString(),
      recordCount: 1247,
      downloadUrl: `/api/dashboard/download/${churchId}/${type}-${Date.now()}.${format}`
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export dashboard data' });
  }
});

// Get metrics
router.get('/metrics/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    
    // Mock metrics data
    const metrics = {
      recordGrowth: [
        { month: 'Jan', baptisms: 15, marriages: 8, funerals: 12, total: 35 },
        { month: 'Feb', baptisms: 18, marriages: 10, funerals: 9, total: 37 },
        { month: 'Mar', baptisms: 22, marriages: 12, funerals: 11, total: 45 },
        { month: 'Apr', baptisms: 20, marriages: 15, funerals: 13, total: 48 },
        { month: 'May', baptisms: 25, marriages: 18, funerals: 10, total: 53 },
        { month: 'Jun', baptisms: 30, marriages: 20, funerals: 14, total: 64 }
      ],
      userActivity: {
        activeUsers: 12,
        totalSessions: 156,
        averageSessionTime: 18.5,
        topUsers: [
          { name: 'Father John', sessions: 45, timeSpent: 12.5 },
          { name: 'Mary Johnson', sessions: 38, timeSpent: 8.2 },
          { name: 'Administrator', sessions: 32, timeSpent: 15.8 }
        ]
      },
      systemHealth: {
        uptime: 99.8,
        responseTime: 180,
        cpuUsage: 45.2,
        memoryUsage: 67.8,
        diskUsage: 32.1,
        lastBackup: new Date(Date.now() - 86400000).toISOString() // 24 hours ago
      }
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

module.exports = router;
