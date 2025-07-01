import sessionService from '../services/session.service.js';
import { pool } from '../configs/db.config.js';

/**
 * Authentication middleware to protect routes
 * Validates session token from Authorization header or request body
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Extract token from Authorization header (Bearer token) or body
        let sessionToken = null;
        
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
        } else if (req.body.sessionToken) {
            sessionToken = req.body.sessionToken;
        }

        if (!sessionToken) {
            return res.status(401).json({
                message: 'Access denied. No session token provided.',
                error: 'Authentication required'
            });
        }

        // Validate session token
        const session = await sessionService.getSessionByToken(pool, sessionToken);
        
        if (!session) {
            return res.status(401).json({
                message: 'Access denied. Invalid or expired session token.',
                error: 'Authentication failed'
            });
        }

        // Check if user is active
        if (session.status !== 'active') {
            return res.status(403).json({
                message: 'Access denied. Account is not active.',
                error: 'Account suspended or deactivated'
            });
        }

        // Update session activity
        await sessionService.updateSessionActivity(pool, sessionToken);

        // Add user and session info to request object
        req.user = {
            id: session.user_id,
            uuid: session.user_uuid,
            username: session.username,
            email: session.email,
            full_name: session.full_name,
            status: session.status
        };
        
        req.session = {
            id: session.id,
            token: sessionToken,
            expiresAt: session.expires_at,
            lastActivity: session.last_activity,
            deviceInfo: session.device_info,
            ipAddress: session.ip_address,
            userAgent: session.user_agent
        };

        next();
    } catch (error) {
        console.error('Authentication middleware error:', error.message);
        res.status(500).json({
            message: 'Authentication error',
            error: 'Internal server error during authentication'
        });
    }
};

/**
 * Optional authentication middleware
 * Adds user info if token is provided, but doesn't require authentication
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        let sessionToken = null;
        
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            sessionToken = authHeader.substring(7);
        }

        if (!sessionToken) {
            // No token provided, continue without user info
            return next();
        }

        // Validate session token
        const session = await sessionService.getSessionByToken(pool, sessionToken);
        
        if (session && session.status === 'active') {
            // Update session activity
            await sessionService.updateSessionActivity(pool, sessionToken);

            // Add user info to request object
            req.user = {
                id: session.user_id,
                uuid: session.user_uuid,
                username: session.username,
                email: session.email,
                full_name: session.full_name,
                status: session.status
            };
            
            req.session = {
                id: session.id,
                token: sessionToken,
                expiresAt: session.expires_at,
                lastActivity: session.last_activity,
                deviceInfo: session.device_info,
                ipAddress: session.ip_address,
                userAgent: session.user_agent
            };
        }

        next();
    } catch (error) {
        console.error('Optional authentication middleware error:', error.message);
        // Don't fail the request, just continue without user info
        next();
    }
};

/**
 * Role-based authorization middleware
 * Requires authMiddleware to be used first
 */
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Access denied. Authentication required.',
                error: 'User not authenticated'
            });
        }

        // Check if user has required role
        // Note: This would require a user_roles table and role checking logic
        // For now, we'll just check if user is active
        if (req.user.status !== 'active') {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.',
                error: 'User role not authorized'
            });
        }

        next();
    };
};

export { authMiddleware, optionalAuthMiddleware, requireRole };
