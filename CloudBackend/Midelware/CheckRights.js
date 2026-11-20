import { ensureUserPermissions, isFullAccessAccount, userHasPermission } from '../utils/userPermissions.js'

/**
 * Permission Check Middleware Factory
 *
 * Usage:
 *   router.get('/path', checkPermission('Permission Name'), handler)
 *   router.post('/path', checkPermission('Add Something'), handler)
 *
 * Requires authMiddleware to run first so req.user is populated.
 * Access is decided from the user's own Roles list.
 *
 * @param {string} permissionName - The exact permission string to check
 * @returns {Function} Express middleware
 */
const checkPermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    status: false,
                    error: 'Authentication required. Use authMiddleware first.',
                });
            }

            const userPermissions = await ensureUserPermissions(req.user);
            if (isFullAccessAccount(req.user)) return next();
            const hasPermission = userHasPermission(userPermissions, permissionName);

            if (hasPermission) {
                next();
            } else {
                return res.status(403).json({
                    status: false,
                    error: `Access denied: Missing permission "${permissionName}"`,
                    userPermissions: Array.isArray(userPermissions) ? userPermissions : [],
                });
            }
        } catch (err) {
            console.error('Permission check error:', err);
            return res.status(500).json({
                status: false,
                error: 'Internal server error',
            });
        }
    };
};

export default checkPermission;
