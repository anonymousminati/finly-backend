import Account from '../models/Account.model.js';
import { pool } from '../configs/db.config.js';

const AccountController = {
    /**
     * Get account details by ID
     * GET /api/accounts/:accountId
     */
    getAccountDetails: async (req, res) => {
        try {
            console.log('🔴 getAccountDetails controller called - GET /api/accounts/:accountId (only authenticated user allowed)');
            console.log('🔍 req.params:', req.params);
            
            const requesterId = req.user.id; // Always use authenticated user
            const { accountId } = req.params;
            
            console.log('user id:', requesterId, 'account id:', accountId);
            
            // Validate accountId
            const parsedAccountId = parseInt(accountId);
            console.log('🔄 Controller: Validating account ID:', parsedAccountId);
            
            if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID. Must be a positive integer.'
                });
            }
            
            // Get account details for authenticated user only
            console.log('🔄 Controller: Getting account details for:', {
                userId: requesterId,
                accountId: parsedAccountId
            });
            
            const account = await Account.getAccountById(pool, requesterId, parsedAccountId);
            
            // Format response
            const response = {
                success: true,
                data: {
                    account
                },
                metadata: {
                    user_id: requesterId,
                    account_id: parsedAccountId,
                    generated_at: new Date().toISOString()
                }
            };
            
            res.status(200).json(response);
            
        } catch (error) {
            AccountController.handleControllerError(error, res, 'fetching account details');
        }
    },

    /**
     * Get account transactions with pagination and filtering
     * GET /api/accounts/:accountId/transactions
     */
    getAccountTransactions: async (req, res) => {
        try {
            console.log('🟡 getAccountTransactions controller called - GET /api/accounts/:accountId/transactions (only authenticated user allowed)');
            const requesterId = req.user.id; // Always use authenticated user
            const { accountId } = req.params;
            const { 
                limit = 20, 
                offset = 0, 
                from, 
                to, 
                type 
            } = req.query;
            
            // Validate accountId
            const parsedAccountId = parseInt(accountId);
            if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID. Must be a positive integer.'
                });
            }
            
            // Validate pagination parameters
            const parsedLimit = parseInt(limit);
            const parsedOffset = parseInt(offset);
            
            if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid limit. Must be between 1 and 100.'
                });
            }
            
            if (isNaN(parsedOffset) || parsedOffset < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid offset. Must be a non-negative integer.'
                });
            }
            
            // Validate date range if provided
            if (from || to) {
                const { isValid, errors } = AccountController.validateDateRange(from, to);
                if (!isValid) {
                    return res.status(400).json({
                        success: false,
                        message: errors.join(' '),
                        errors
                    });
                }
            }
            
            console.log('🔄 Controller: Getting account transactions for user_id:', requesterId, 'account_id:', accountId);
            
            const transactions = await Account.getAccountTransactions(
                pool, 
                requesterId, 
                parsedAccountId, 
                {
                    limit: parsedLimit,
                    offset: parsedOffset,
                    from,
                    to,
                    type
                }
            );
            
            // Format response
            const response = {
                success: true,
                data: {
                    transactions,
                    count: transactions.length,
                    pagination: {
                        limit: parsedLimit,
                        offset: parsedOffset,
                        has_more: transactions.length === parsedLimit
                    }
                },
                metadata: {
                    user_id: requesterId,
                    account_id: parsedAccountId,
                    filters: {
                        from: from || null,
                        to: to || null,
                        type: type || null
                    },
                    generated_at: new Date().toISOString()
                }
            };
            
            res.status(200).json(response);
            
        } catch (error) {
            AccountController.handleControllerError(error, res, 'fetching account transactions');
        }
    },

    /**
     * Get account analytics and statistics
     * GET /api/accounts/:accountId/analytics
     */
    getAccountAnalytics: async (req, res) => {
        try {
            console.log('🟣 getAccountAnalytics controller called - GET /api/accounts/:accountId/analytics (only authenticated user allowed)');
            const requesterId = req.user.id; // Always use authenticated user
            const { accountId } = req.params;
            const { days = 30 } = req.query;
            
            // Validate accountId
            const parsedAccountId = parseInt(accountId);
            if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID. Must be a positive integer.'
                });
            }
            
            // Validate days parameter
            const parsedDays = parseInt(days);
            if (isNaN(parsedDays) || parsedDays <= 0 || parsedDays > 365) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid days parameter. Must be between 1 and 365.'
                });
            }
            
            console.log('🔄 Controller: Getting account analytics for user_id:', requesterId, 'account_id:', accountId, 'days:', days);
            
            const analytics = await Account.getAccountAnalytics(
                pool, 
                requesterId, 
                parsedAccountId, 
                parsedDays
            );
            
            // Format response
            const response = {
                success: true,
                data: analytics,
                metadata: {
                    user_id: requesterId,
                    account_id: parsedAccountId,
                    period_days: parsedDays,
                    generated_at: new Date().toISOString()
                }
            };
            
            res.status(200).json(response);
            
        } catch (error) {
            AccountController.handleControllerError(error, res, 'fetching account analytics');
        }
    },

    /**
     * Get all accounts for a user
     * GET /api/accounts
     */
    getUserAccounts: async (req, res) => {
        try {
            console.log('🟢 getUserAccounts controller called - GET /api/accounts (only authenticated user allowed)');
            const requesterId = req.user.id; // Always use authenticated user

            // Get accounts from financial_accounts table for authenticated user only
            console.log('🔄 Controller: Getting user accounts for user_id:', requesterId);
            const accounts = await Account.getUserAccounts(pool, requesterId);

            // Format response
            const response = {
                success: true,
                data: {
                    accounts,
                    count: accounts.length
                },
                metadata: {
                    user_id: requesterId,
                    generated_at: new Date().toISOString()
                }
            };

            res.status(200).json(response);

        } catch (error) {
            AccountController.handleControllerError(error, res, 'fetching user accounts');
        }
    },

    /**
     * Helper function to validate date range
     */
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
            errors
        };
    },

    /**
     * Helper function to resolve target user
     * For now, we'll keep it simple and just return the requester ID
     * In the future, this could support admin access to other users' accounts
     */
    resolveTargetUser: async (requesterId, userId, userUuid) => {
        // For account access, we typically only allow users to access their own accounts
        // unless they have admin privileges (to be implemented later)
        
        if (userId || userUuid) {
            // For now, only allow access to own data
            // Future enhancement: check if requester has admin access
            console.log('⚠️ User attempting to access another user\'s account data');
            throw new Error('Access denied. You can only access your own account data.');
        }
        
        return requesterId;
    },

    /**
     * Create a new account
     * POST /api/accounts
     */
    createAccount: async (req, res) => {
        try {
            console.log('🔴 createAccount controller called - POST /api/accounts');
            console.log('🔍 req.body:', req.body);
            
            const requesterId = req.user.id; // Always use authenticated user
            const {
                account_type,
                account_name,
                account_number,
                masked_account_number,
                bank_name,
                branch_name,
                routing_number,
                card_type,
                current_balance,
                available_balance,
                credit_limit,
                currency,
                is_primary,
                is_active
            } = req.body;
            
            // Validate required fields
            if (!account_type || !account_name || !account_number || !bank_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: account_type, account_name, account_number, bank_name'
                });
            }
            
            // Validate account type
            const validAccountTypes = ['checking', 'savings', 'credit', 'investment', 'business'];
            if (!validAccountTypes.includes(account_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account type. Must be one of: ' + validAccountTypes.join(', ')
                });
            }
            
            // Validate card type for credit accounts
            if (account_type === 'credit' && !card_type) {
                return res.status(400).json({
                    success: false,
                    message: 'Card type is required for credit accounts'
                });
            }
            
            // Validate credit limit for credit accounts
            if (account_type === 'credit' && !credit_limit) {
                return res.status(400).json({
                    success: false,
                    message: 'Credit limit is required for credit accounts'
                });
            }
            
            // Prepare account data
            const accountData = {
                user_id: requesterId,
                account_type,
                account_name,
                account_number,
                masked_account_number: masked_account_number || account_number.replace(/(.{4}).*(.{4})/, '$1****$2'),
                bank_name,
                branch_name: branch_name || null,
                routing_number: routing_number || null,
                card_type: card_type || null,
                current_balance: current_balance || 0,
                available_balance: available_balance || current_balance || 0,
                credit_limit: credit_limit || null,
                currency: currency || 'USD',
                is_primary: is_primary || false,
                is_active: is_active !== undefined ? is_active : true
            };
            
            console.log('🔄 Controller: Creating account with data:', accountData);
            
            // Create the account
            const account = await Account.createAccount(pool, accountData);
            
            // Format response
            const response = {
                success: true,
                data: {
                    account
                },
                metadata: {
                    user_id: requesterId,
                    generated_at: new Date().toISOString()
                }
            };
            
            console.log('✅ Account created successfully:', account.account_id);
            res.status(201).json(response);
            
        } catch (error) {
            AccountController.handleControllerError(error, res, 'creating account');
        }
    },

    /**
     * Helper function to handle controller errors
     */
    handleControllerError: (error, res, operation) => {
        console.error(`Error in ${operation}:`, error);
        
        if (error.message === 'Account not found or access denied') {
            return res.status(404).json({
                success: false,
                message: 'Account not found or you do not have permission to access it'
            });
        }
        
        if (error.message === 'Accounts table not found') {
            return res.status(503).json({
                success: false,
                message: 'Account service temporarily unavailable'
            });
        }
        
        if (error.message === 'Access denied. You can only access your own account data.') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own account data.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: `Internal server error occurred while ${operation}`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export default AccountController;
