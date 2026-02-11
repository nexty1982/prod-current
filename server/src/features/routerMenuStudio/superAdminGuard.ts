import type { Request, Response, NextFunction } from 'express';

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  // Check both JWT user (req.user) and session user (req.session.user)
  const u: any = (req as any).user || (req as any).session?.user || {};
  
  // Debug logging to see the actual user structure
  console.log('🔍 [SuperAdmin] JWT User (req.user):', JSON.stringify((req as any).user, null, 2));
  console.log('🔍 [SuperAdmin] Session User (req.session.user):', JSON.stringify((req as any).session?.user, null, 2));
  console.log('🔍 [SuperAdmin] Selected user object:', JSON.stringify(u, null, 2));
  
  const roles: string[] =
    Array.isArray(u.roles) ? u.roles :
    Array.isArray(u.role) ? u.role :
    Array.isArray(u?.claims?.roles) ? u.claims.roles :
    typeof u.role === 'string' ? [u.role] : 
    typeof u.roles === 'string' ? [u.roles] : [];

  console.log('🔍 [SuperAdmin] Parsed roles array:', roles);

  const ok =
    u.is_super_admin === true ||
    u.is_super_admin === 'true' ||
    roles.includes('super_admin') ||
    roles.includes('SUPER_ADMIN') ||
    roles.includes('admin:super') ||
    roles.includes('superadmin') ||
    u.role === 'super_admin' ||
    u.role === 'superadmin' ||
    u.roles === 'super_admin' ||
    u.roles === 'superadmin';

  console.log('🔍 [SuperAdmin] Access granted:', ok);

  if (!ok) {
    console.log('❌ [SuperAdmin] Access denied for user:', u.email || u.id || 'unknown');
    return res.status(403).json({ error: { code: 'forbidden', message: 'super_admin required' } });
  }
  
  console.log('✅ [SuperAdmin] Access granted for user:', u.email || u.id || 'unknown');
  return next();
}
