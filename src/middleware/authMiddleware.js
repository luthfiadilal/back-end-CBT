import supabase from '../config/supabase.js';

/**
 * Middleware to verify JWT token
 * Extracts user information from the Authorization header using Supabase Auth
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

        // Verify token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('Supabase Auth Error:', authError?.message);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }

        // Get user role from app_users table
        const { data: appUser, error: roleError } = await supabase
            .from('app_users')
            .select('role')
            .eq('uid', user.id)
            .single();

        if (roleError || !appUser) {
            console.error('Role Fetch Error:', roleError?.message);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'User role not found'
            });
        }

        // Attach user to request object
        req.user = {
            id: user.id,
            email: user.email,
            role: appUser.role
        };

        next();
    } catch (error) {
        console.error('Authentication middleware error:', error);
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
