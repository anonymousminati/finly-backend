import Financial from '../models/Financial.model.js';
import { pool } from '../configs/db.config.js';

const FinanceController = {
    /**
     * Get comprehensive financial summary for a user
     * GET /api/financial/summary
     */
    getFinancialSummary: async (req, res) => {
        try {
            const requesterId = req.user.id; // From JWT middleware
            const { userId, userUuid, from, to } = req.query;
            
            let targetUserId = requesterId; // Default to authenticated user
            
            // If userId or userUuid is provided, resolve the target user
            if (userId || userUuid) {
                const identifier = userId || userUuid;
                const resolvedUser = await Financial.resolveUser(pool, identifier, requesterId);
                targetUserId = resolvedUser.id;
            }
            
            // Validate and parse date range
            let dateRange = {};
            
            if (from) {
                const fromDate = new Date(from);
                if (isNaN(fromDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid "from" date format. Use YYYY-MM-DD format.'
                    });
                }
                dateRange.from = from;
            }
            
            if (to) {
                const toDate = new Date(to);
                if (isNaN(toDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid "to" date format. Use YYYY-MM-DD format.'
                    });
                }
                dateRange.to = to;
            }
            
            // Validate date range logic
            if (from && to && new Date(from) > new Date(to)) {
                return res.status(400).json({
                    success: false,
                    message: '"from" date cannot be later than "to" date.'
                });
            }
            
            // Get financial summary
            const summary = await Financial.getSummary(pool, targetUserId, dateRange);
            
            // Add metadata to response
            const response = {
                success: true,
                data: summary,
                metadata: {
                    user_id: targetUserId,
                    date_range: {
                        from: dateRange.from || null,
                        to: dateRange.to || null
                    },
                    generated_at: new Date().toISOString(),
                    cache_duration: 60 // seconds
                }
            };
            
            // Set cache headers
            res.set({
                'Cache-Control': 'private, max-age=60',
                'ETag': `"${Buffer.from(JSON.stringify(summary)).toString('base64').slice(0, 32)}"`
            });
            
            res.status(200).json(response);
            
        } catch (error) {
            console.error('Error in getFinancialSummary:', error);
            
            // Handle specific error types
            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: 'User not found or inactive'
                });
            }
            
            if (error.message === 'Unauthorized access to user data') {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this user\'s financial data'
                });
            }
            
            if (error.message === 'Invalid user identifier format') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user identifier. Provide a valid UUID or numeric user ID.'
                });
            }
            
            // Generic server error
            res.status(500).json({
                success: false,
                message: 'Internal server error occurred while fetching financial summary',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Middleware for request validation
     */
    validateSummaryRequest: (req, res, next) => {
        const { userId, userUuid } = req.query;
        
        // Validate userId if provided
        if (userId) {
            const numericId = parseInt(userId);
            if (isNaN(numericId) || numericId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid userId. Must be a positive integer.'
                });
            }
        }
        
        // Validate userUuid if provided
        if (userUuid) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(userUuid)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid userUuid. Must be a valid UUID v4 format.'
                });
            }
        }
        
        // Cannot provide both userId and userUuid
        if (userId && userUuid) {
            return res.status(400).json({
                success: false,
                message: 'Provide either userId or userUuid, not both.'
            });
        }
        
        next();
    }
};

export default FinanceController;