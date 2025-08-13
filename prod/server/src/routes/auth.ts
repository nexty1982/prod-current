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

export default router;
