import { Router, Request, Response } from 'express';
import { AuthService } from '../modules/auth/service';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
const authService = new AuthService();

// Login endpoint
router.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(
      { email, password },
      ipAddress,
      userAgent
    );

    if (result.success && result.refresh_token) {
      // Set refresh token as httpOnly cookie
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    return res.status(result.success ? 200 : 401).json({
      success: result.success,
      message: result.message,
      access_token: result.access_token,
      user: result.user
    });
  } catch (error) {
    console.error('Login route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh endpoint
router.post('/api/auth/refresh', async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await authService.refresh(
      refreshToken,
      ipAddress,
      userAgent
    );

    if (result.success && result.refresh_token) {
      // Set new refresh token as httpOnly cookie
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    return res.status(result.success ? 200 : 401).json({
      success: result.success,
      message: result.message,
      access_token: result.access_token
    });
  } catch (error) {
    console.error('Refresh route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/api/auth/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await authService.logout(req.user.userId);
    }

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify endpoint (check if token is valid)
router.get('/api/auth/verify', requireAuth, (req: Request, res: Response) => {
  return res.json({
    success: true,
    user: req.user
  });
});

// ============================================================================
// Session Validation Endpoint (for nginx/environment gating)
// ============================================================================
// This endpoint validates the session and returns environment information.
// Used by nginx to determine if user can access /latest environment.
router.get('/api/auth/validate-session', (req: Request, res: Response) => {
  try {
    // Check if session exists
    const session = (req as any).session;
    const user = session?.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'No valid session',
        environment: 'stable'
      });
    }

    // Check if we need to verify super_admin access
    const checkSuperAdmin = req.query.check_super_admin === 'true';
    
    // Determine environment based on role
    const environment = user.role === 'super_admin' ? 'latest' : 'stable';
    const isSuperAdmin = user.role === 'super_admin';

    // If checking super_admin and user is not super_admin, return 403
    if (checkSuperAdmin && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        valid: true,
        message: 'Access denied: super_admin role required',
        role: user.role,
        environment: 'stable',
        isSuperAdmin: false
      });
    }

    // Set response headers for nginx
    res.setHeader('X-Environment', environment);
    res.setHeader('X-User-Role', user.role);
    res.setHeader('X-User-Id', user.id);

    return res.json({
      success: true,
      valid: true,
      role: user.role,
      environment,
      isSuperAdmin,
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Internal server error',
      environment: 'stable'
    });
  }
});

// Environment info endpoint (returns current user's environment)
router.get('/api/auth/environment', (req: Request, res: Response) => {
  const session = (req as any).session;
  const user = session?.user;

  if (!user) {
    return res.json({
      authenticated: false,
      environment: 'stable',
      features: {
        latestAccess: false,
        highRiskFeatures: false
      }
    });
  }

  const environment = user.role === 'super_admin' ? 'latest' : 'stable';
  
  return res.json({
    authenticated: true,
    environment,
    role: user.role,
    features: {
      latestAccess: environment === 'latest',
      highRiskFeatures: environment === 'latest',
      interactiveReports: true,
      ocrStudio: true,
      recordsV2: true
    }
  });
});

export default router;
