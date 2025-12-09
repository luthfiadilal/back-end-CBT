import { verifyToken } from '../utils/authUtils.js';

/**
 * Middleware to verify JWT token
 * Extracts user information from the Authorization header
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = verifyToken(token);

        // Attach user to request object
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);

        if (error.message === 'Token expired' || error.message === 'Invalid token') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Authentication failed'
        });
    }
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Insufficient permissions'
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Role verification failed'
            });
        }
    };
};
