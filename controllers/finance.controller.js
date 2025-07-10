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

    getRecentTransactionsbyAccountId: async (req, res) => {
        try {
            const requesterId = req.user.id; // From JWT middleware
            const { accountId } = req.params; // Get from URL path parameter
            const { from, to, limit = 20 } = req.query; // Get from query parameters with higher default
            
            // Validate accountId
            const parsedAccountId = parseInt(accountId);
            if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid accountId. Must be a positive integer.'
                });
            }
            // Validate limit - increased max to support "All Time" view
            const parsedLimit = parseInt(limit);
            if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid limit. Must be between 1 and 200.'
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
            // Get recent transactions by account ID
            console.log('🔄 Controller: Calling getRecentTransactionsbyAccountId with:', 
                    {
                        userId: requesterId,
                        accountId: parsedAccountId,
                        parsedLimit,
                        dateRange
                    });
            const transactions = await Financial.getRecentTransactionsByAccountId(pool, requesterId, parsedAccountId, parsedLimit, dateRange);
            // Format response
            const response = {
                success: true,
                data: {
                    transactions,
                    count: transactions.length,
                    pagination: {
                        limit: parsedLimit,
                        offset: 0,
                        has_more: transactions.length === parsedLimit // Indicates if there might be more
                    }
                },
                metadata: {
                    user_id: requesterId,
                    account_id: parsedAccountId,
                    filters: {
                        from: dateRange.from || null,
                        to: dateRange.to || null,
                        type: null
                    },
                    generated_at: new Date().toISOString()
                }
            };
            res.status(200).json(response);
        } catch (error) {
            FinanceController.handleControllerError(error, res, 'fetching recent transactions by account ID');
        }
    },


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
     * Get expense statistics for a user
     * GET /api/financial/expense-statistics
     */
    getExpenseStatistics: async (req, res) => {
        try {
            const requesterId = req.user.id; // From JWT middleware
            const { userId, userUuid, days = 7 } = req.query;
            
            // Resolve the target user (defaults to authenticated user if no userId/userUuid provided)
            const targetUserId = await FinanceController.resolveTargetUser(requesterId, userId, userUuid);
            
            // Validate days parameter
            const parsedDays = parseInt(days);
            if (isNaN(parsedDays) || parsedDays <= 0 || parsedDays > 365) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid days parameter. Must be between 1 and 365.'
                });
            }
            
            // Get expense statistics
            console.log('🔄 Controller: Calling getExpenseStatistics with:', {
                targetUserId,
                parsedDays
            });
            const stats = await Financial.getExpenseStatistics(pool, targetUserId, parsedDays);
            
            // Format response
            const response = {
                success: true,
                data: stats,
                metadata: {
                    user_id: targetUserId,
                    period_days: parsedDays,
                    generated_at: new Date().toISOString()
                }
            };
            
            res.status(200).json(response);
            
        } catch (error) {
            FinanceController.handleControllerError(error, res, 'fetching expense statistics');
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

    /**
     * Validate pagination parameters
     */
    validatePaginationParams: (limit, offset) => {
        const parsedLimit = parseInt(limit);
        const parsedOffset = parseInt(offset);
        
        if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
            return { valid: false, error: 'Invalid limit. Must be between 1 and 100.' };
        }
        
        if (isNaN(parsedOffset) || parsedOffset < 0) {
            return { valid: false, error: 'Invalid offset. Must be a non-negative integer.' };
        }
        
        return { valid: true, limit: parsedLimit, offset: parsedOffset };
    },

    /**
     * Parse array filters from query parameters
     */
    parseArrayFilter: (value, validValues) => {
        if (!value) return null;
        const items = Array.isArray(value) ? value : value.split(',');
        const validItems = items.filter(item => validValues.includes(item.trim()));
        return validItems.length > 0 ? validItems : null;
    },

    /**
     * Parse numeric array filters from query parameters
     */
    parseNumericArrayFilter: (value) => {
        if (!value) return null;
        const items = Array.isArray(value) ? value : value.split(',');
        const validItems = items
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id) && id > 0);
        return validItems.length > 0 ? validItems : null;
    },

    /**
     * Parse amount filters from query parameters
     */
    parseAmountFilters: (amountMin, amountMax) => {
        const filters = {};
        
        if (amountMin !== undefined && amountMin !== '') {
            const parsed = parseFloat(amountMin);
            if (!isNaN(parsed) && parsed >= 0) {
                filters.amountMin = parsed;
            }
        }
        
        if (amountMax !== undefined && amountMax !== '') {
            const parsed = parseFloat(amountMax);
            if (!isNaN(parsed) && parsed >= 0) {
                filters.amountMax = parsed;
            }
        }
        
        return filters;
    },

    /**
     * Build filters object from query parameters
     */
    buildTransactionFilters: (queryParams) => {
        const {
            dateFrom, dateTo, accountId, transactionType, categoryId,
            paymentMethod, status, amountMin, amountMax, search
        } = queryParams;
        
        const filters = {};
        
        // Date filters
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;
        
        // Account filter
        if (accountId) {
            const parsedAccountId = parseInt(accountId);
            if (!isNaN(parsedAccountId) && parsedAccountId > 0) {
                filters.accountId = parsedAccountId;
            }
        }
        
        // Array filters
        const transactionTypes = FinanceController.parseArrayFilter(
            transactionType, ['income', 'expense', 'transfer']
        );
        if (transactionTypes) filters.transactionType = transactionTypes;
        
        const categories = FinanceController.parseNumericArrayFilter(categoryId);
        if (categories) filters.categoryId = categories;
        
        const paymentMethods = FinanceController.parseArrayFilter(
            paymentMethod, ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'upi', 'paypal']
        );
        if (paymentMethods) filters.paymentMethod = paymentMethods;
        
        const statuses = FinanceController.parseArrayFilter(
            status, ['completed', 'pending', 'failed', 'cancelled']
        );
        if (statuses) filters.status = statuses;
        
        // Amount filters
        const amountFilters = FinanceController.parseAmountFilters(amountMin, amountMax);
        Object.assign(filters, amountFilters);
        
        // Search filter
        if (search && search.trim()) {
            filters.search = search.trim();
        }
        
        return filters;
    },

    /**
     * Get transactions with pagination and dynamic filters
     * GET /api/financial/transactions
     */
    getTransactions: async (req, res) => {
        try {
            const requesterId = req.user.id;
            const { 
                userId, userUuid, limit = 20, offset = 0, 
                sortBy = 'transaction_date', sortOrder = 'DESC',
                dateFrom, dateTo
            } = req.query;
            
            console.log('🔄 getTransactions called with query:', req.query);
            
            // Resolve target user
            const targetUserId = await FinanceController.resolveTargetUser(requesterId, userId, userUuid);
            
            // Validate pagination
            const paginationResult = FinanceController.validatePaginationParams(limit, offset);
            if (!paginationResult.valid) {
                return res.status(400).json({
                    success: false,
                    message: paginationResult.error
                });
            }
            
            // Validate date range
            const { isValid, errors } = FinanceController.validateDateRange(dateFrom, dateTo);
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date range.',
                    errors
                });
            }
            
            // Build filters
            const filters = FinanceController.buildTransactionFilters(req.query);
            
            // Validate sort parameters
            const allowedSortFields = [
                'transaction_date', 'amount', 'created_at', 'updated_at',
                'merchant_name', 'transaction_type', 'status'
            ];
            const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'transaction_date';
            const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
            
            // Prepare options for the model
            const options = {
                limit: paginationResult.limit,
                offset: paginationResult.offset,
                filters,
                sortBy: validSortBy,
                sortOrder: validSortOrder
            };
            
            console.log('🔄 Calling Financial.getTransactionsWithPagination with options:', options);
            
            // Get transactions from model
            const result = await Financial.getTransactionsWithPagination(pool, targetUserId, options);
            
            // Format response
            const response = {
                success: true,
                data: result,
                metadata: {
                    user_id: targetUserId,
                    filters: filters,
                    sort: {
                        by: validSortBy,
                        order: validSortOrder
                    },
                    generated_at: new Date().toISOString()
                }
            };
            
            // Set cache headers
            res.set({
                'Cache-Control': 'private, max-age=30',
                'ETag': `"${Buffer.from(JSON.stringify(result)).toString('base64').slice(0, 32)}"`
            });
            
            res.status(200).json(response);
            
        } catch (error) {
            FinanceController.handleControllerError(error, res, 'fetching transactions');
        }
    },

    /**
     * Get transaction statistics for a user
     * GET /api/financial/transactions/stats
     */
    getTransactionStats: async (req, res) => {
        try {
            const requesterId = req.user.id;
            const { userId, userUuid } = req.query;
            // Use buildTransactionFilters to support all query params
            const filters = FinanceController.buildTransactionFilters(req.query);
            // Resolve target user
            const targetUserId = await FinanceController.resolveTargetUser(requesterId, userId, userUuid);
            console.log('🔄 getTransactionStats called with filters:', filters);
            const stats = await Financial.getTransactionStats(pool, targetUserId, filters);
            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('❌ Error getting transaction stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get transaction statistics',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    // Helper function to check if a string is a valid date
    isValidDate: (dateString) => {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        return regex.test(dateString);
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