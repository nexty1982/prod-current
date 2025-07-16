// server/middleware/userAuthorization.js - User Management Authorization

// Root super admin email - can be overridden via environment variable
const ROOT_SUPERADMIN_EMAIL = process.env.ROOT_SUPERADMIN_EMAIL || 'superadmin@orthodoxmetrics.com';

/**
 * Check if current user is the root super admin
 */
function isRootSuperAdmin(user) {
    return user && user.email === ROOT_SUPERADMIN_EMAIL;
}

/**
 * Check if current user can manage the target user
 * @param {Object} currentUser - The user making the request
 * @param {Object} targetUser - The user being managed
 * @returns {boolean} - Whether the operation is allowed
 */
function canManageUser(currentUser, targetUser) {
    if (!currentUser || !targetUser) {
        console.warn('canManageUser: Missing user parameters', { currentUser: !!currentUser, targetUser: !!targetUser });
        return false;
    }

    const isRoot = isRootSuperAdmin(currentUser);
    const isManagingSelf = currentUser.id === targetUser.id;
    const isTargetRoot = isRootSuperAdmin(targetUser);

    console.log('User management authorization check:', {
        currentUserEmail: currentUser.email,
        currentUserRole: currentUser.role,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        isRoot,
        isManagingSelf,
        isTargetRoot
    });

    // Root super admin can manage anyone (including other super_admins)
    if (isRoot) {
        console.log('✅ Root super admin can manage anyone');
        return true;
    }

    // Nobody (except root) can manage the root super admin
    if (isTargetRoot) {
        console.warn('❌ Only root super admin can manage root account');
        return false;
    }

    // Users can manage themselves (limited operations like password change)
    if (isManagingSelf) {
        console.log('✅ User can manage themselves');
        return true;
    }

    // super_admins cannot manage other super_admins (except root manages all)
    if (currentUser.role === 'super_admin' && targetUser.role === 'super_admin') {
        console.warn('❌ super_admin cannot manage other super_admins');
        return false;
    }

    // super_admins can manage admins and below
    if (currentUser.role === 'super_admin' && targetUser.role !== 'super_admin') {
        console.log('✅ super_admin can manage non-super_admin users');
        return true;
    }

    // Admins can manage users below their level
    if (currentUser.role === 'admin' && !['admin', 'super_admin'].includes(targetUser.role)) {
        console.log('✅ admin can manage users below admin level');
        return true;
    }

    console.warn('❌ User management operation denied', {
        reason: 'Insufficient privileges for this operation'
    });
    return false;
}

/**
 * Check if current user can perform destructive operations (delete, disable)
 * @param {Object} currentUser - The user making the request
 * @param {Object} targetUser - The user being managed
 * @returns {boolean} - Whether destructive operations are allowed
 */
function canPerformDestructiveOperation(currentUser, targetUser) {
    console.log('🔍 canPerformDestructiveOperation called with:');
    console.log('   currentUser:', currentUser);
    console.log('   targetUser:', targetUser);
    
    if (!currentUser || !targetUser) {
        console.log('❌ Missing user parameters');
        return false;
    }

    const isRoot = isRootSuperAdmin(currentUser);
    const isManagingSelf = currentUser.id === targetUser.id;
    const isTargetRoot = isRootSuperAdmin(targetUser);

    console.log('   isRoot:', isRoot);
    console.log('   isManagingSelf:', isManagingSelf);
    console.log('   isTargetRoot:', isTargetRoot);
    console.log('   currentUser.email:', currentUser.email);
    console.log('   ROOT_SUPERADMIN_EMAIL:', ROOT_SUPERADMIN_EMAIL);

    // Root super admin can do anything
    if (isRoot) {
        console.log('✅ Root super admin can perform destructive operations');
        return true;
    }

    // Cannot perform destructive operations on root super admin
    if (isTargetRoot) {
        return false;
    }

    // Cannot disable/delete yourself
    if (isManagingSelf) {
        return false;
    }

    // super_admins cannot perform destructive operations on other super_admins
    if (currentUser.role === 'super_admin' && targetUser.role === 'super_admin') {
        return false;
    }

    // super_admins can perform destructive operations on non-super_admins
    if (currentUser.role === 'super_admin' && targetUser.role !== 'super_admin') {
        return true;
    }

    // Admins can perform destructive operations on users below their level
    if (currentUser.role === 'admin' && !['admin', 'super_admin'].includes(targetUser.role)) {
        return true;
    }

    return false;
}

/**
 * Check if current user can change roles
 * @param {Object} currentUser - The user making the request
 * @param {Object} targetUser - The user being managed
 * @param {string} newRole - The new role being assigned
 * @returns {boolean} - Whether role change is allowed
 */
function canChangeRole(currentUser, targetUser, newRole) {
    if (!currentUser || !targetUser || !newRole) {
        return false;
    }

    const isRoot = isRootSuperAdmin(currentUser);
    const isTargetRoot = isRootSuperAdmin(targetUser);

    // Root super admin can change any role
    if (isRoot) {
        return true;
    }

    // Cannot change root super admin's role
    if (isTargetRoot) {
        return false;
    }

    // Cannot assign super_admin role unless you are root
    if (newRole === 'super_admin' && !isRoot) {
        return false;
    }

    // super_admins cannot change other super_admin roles
    if (currentUser.role === 'super_admin' && targetUser.role === 'super_admin') {
        return false;
    }

    // Use general management rules for other role changes
    return canManageUser(currentUser, targetUser);
}

/**
 * Middleware to check user management permissions
 */
function requireUserManagementPermission(req, res, next) {
    const currentUser = req.user;
    const targetUserId = req.params.id || req.params.userId;

    if (!currentUser) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
        });
    }

    if (!targetUserId) {
        return res.status(400).json({
            error: 'Target user ID is required',
            code: 'MISSING_TARGET_USER'
        });
    }

    // Store target user ID for later use
    req.targetUserId = targetUserId;
    
    next();
}

/**
 * Log unauthorized access attempts
 */
function logUnauthorizedAttempt(currentUser, targetUser, operation) {
    const logData = {
        timestamp: new Date().toISOString(),
        currentUser: {
            id: currentUser?.id,
            email: currentUser?.email,
            role: currentUser?.role
        },
        targetUser: {
            id: targetUser?.id,
            email: targetUser?.email,
            role: targetUser?.role
        },
        operation,
        isRootAttempt: isRootSuperAdmin(targetUser),
        severity: isRootSuperAdmin(targetUser) ? 'CRITICAL' : 'WARNING'
    };

    console.warn('🚨 UNAUTHORIZED USER MANAGEMENT ATTEMPT:', JSON.stringify(logData, null, 2));
    
    // In production, you might want to send this to a security monitoring system
    devLogger.warn('Unauthorized user management attempt', logData);
}

module.exports = {
    ROOT_SUPERADMIN_EMAIL,
    isRootSuperAdmin,
    canManageUser,
    canPerformDestructiveOperation,
    canChangeRole,
    requireUserManagementPermission,
    logUnauthorizedAttempt
};
