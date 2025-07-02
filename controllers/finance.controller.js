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
            
            // Resolve the target user (defaults to authenticated user if no userId/userUuid provided)
            const targetUserId = await FinanceController.resolveTargetUser(requesterId, userId, userUuid);
            
            // Validate and parse date range
            const { isValid, errors, dateRange } = FinanceController.validateDateRange(from, to);
            
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: errors.join(' '),
                    errors
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
            FinanceController.handleControllerError(error, res, 'fetching financial summary');
        }
    },

    /**
     * Get recent transactions for a user
     * GET /api/financial/recent-transactions
     */
    getRecentTransactions: async (req, res) => {
        try {
            const requesterId = req.user.id; // From JWT middleware
            const { userId, userUuid, from, to, limit = 5 } = req.query;
            
            // Resolve the target user (defaults to authenticated user if no userId/userUuid provided)
            const targetUserId = await FinanceController.resolveTargetUser(requesterId, userId, userUuid);
            
            // Validate limit
            const parsedLimit = parseInt(limit);
            if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid limit. Must be between 1 and 50.'
                });
            }
            
            // Validate and parse date range
            const { isValid, errors, dateRange } = FinanceController.validateDateRange(from, to);
            
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: errors.join(' '),
                    errors
                });
            }
            
            // Get recent transactions
            console.log('🔄 Controller: Calling getRecentTransactions with:', {
                targetUserId,
                parsedLimit,
                dateRange
            });
            const transactions = await Financial.getRecentTransactions(pool, targetUserId, parsedLimit, dateRange);
            
            // Format response
            const response = {
                success: true,
                data: {
                    transactions,
                    count: transactions.length
                },
                metadata: {
                    user_id: targetUserId,
                    limit: parsedLimit,
                    date_range: {
                        from: dateRange.from || null,
                        to: dateRange.to || null
                    },
                    generated_at: new Date().toISOString()
                }
            };
            
            res.status(200).json(response);
            
        } catch (error) {
            FinanceController.handleControllerError(error, res, 'fetching recent transactions');
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
    },

    // Helper function to validate date range
    validateDateRange: (from, to) => {
        const errors = [];
        
        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
                errors.push('Invalid "from" date format. Use YYYY-MM-DD format.');
            }
        }
        
        if (to) {
            const toDate = new Date(to);
            if (isNaN(toDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
                errors.push('Invalid "to" date format. Use YYYY-MM-DD format.');
            }
        }
        
        if (from && to && new Date(from) > new Date(to)) {
            errors.push('"from" date cannot be later than "to" date.');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            dateRange: { from: from || null, to: to || null }
        };
    },

    // Helper function to resolve target user
    resolveTargetUser: async (requesterId, userId, userUuid) => {
        if (!userId && !userUuid) {
            return requesterId;
        }
        
        const identifier = userId || userUuid;
        const resolvedUser = await Financial.resolveUser(pool, identifier, requesterId);
        return resolvedUser.id;
    },

    // Helper function to handle controller errors
    handleControllerError: (error, res, operation) => {
        console.error(`Error in ${operation}:`, error);
        
        if (error.message === 'User not found') {
            return res.status(404).json({
                success: false,
                message: 'User not found or inactive'
            });
        }
        
        if (error.message === 'Unauthorized access to user data') {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this user\'s data'
            });
        }
        
        if (error.message === 'Invalid user identifier format') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user identifier. Provide a valid UUID or numeric user ID.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: `Internal server error occurred while ${operation}`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    },

    // TEST METHOD (Remove in production)
    testRecentTransactions: async (req, res) => {
        try {
            const { userId } = req.params;
            const { limit = 5 } = req.query;
            
            console.log('🧪 TEST: Testing recent transactions for userId:', userId);
            
            // Test the recent transactions method directly
            const transactions = await Financial.getRecentTransactions(pool, parseInt(userId), parseInt(limit));
            
            res.json({
                success: true,
                data: transactions,
                metadata: {
                    user_id: parseInt(userId),
                    limit: parseInt(limit),
                    generated_at: new Date().toISOString(),
                    test_mode: true
                }
            });
        } catch (error) {
            console.error('🧪 TEST ERROR:', error);
            res.status(500).json({
                success: false,
                message: 'Test failed',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },
};

export default FinanceController;