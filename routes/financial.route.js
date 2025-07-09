import express from 'express';
import FinanceController from '../controllers/finance.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const FinancialRoute = express.Router();

// Financial routes (Protected)
FinancialRoute.get(
    '/summary',
    authMiddleware,
    FinanceController.validateSummaryRequest,
    FinanceController.getFinancialSummary
);

FinancialRoute.get(
    '/recent-transactions',
    authMiddleware,
    FinanceController.validateSummaryRequest,
    FinanceController.getRecentTransactions
);
FinancialRoute.get(
    '/recent-transactions/:accountId',
    authMiddleware,
    FinanceController.validateSummaryRequest,
    FinanceController.getRecentTransactionsbyAccountId
);

FinancialRoute.get(
    '/expense-statistics',
    authMiddleware,
    FinanceController.validateSummaryRequest,
    FinanceController.getExpenseStatistics
);

// TEST ENDPOINT (Remove in production)
FinancialRoute.get(
    '/test-transactions/:userId',
    FinanceController.testRecentTransactions
);

// TEST ENDPOINT for header verification (Remove in production)
FinancialRoute.get(
    '/test-headers',
    (req, res) => {
        console.log('🔍 Headers received:', req.headers);
        console.log('🔍 Authorization header:', req.headers.authorization);
        console.log('🔍 Content-Type header:', req.headers['content-type']);
        
        res.json({
            message: 'Headers logged to console',
            authorization: req.headers.authorization || 'Not provided',
            contentType: req.headers['content-type'] || 'Not provided',
            allHeaders: req.headers
        });
    }
);

// DEBUG ENDPOINT - Check transaction data (Remove in production)
FinancialRoute.get(
    '/debug-transactions/:accountId',
    authMiddleware,
    async (req, res) => {
        try {
            const { accountId } = req.params;
            const requesterId = req.user.id;
            
            console.log('🧪 DEBUG: Checking transactions for user', requesterId, 'account', accountId);
            
            // Direct database query to check what's in the transactions table
            const { pool } = await import('../configs/db.config.js');
            
            // Check if transactions table exists
            const [tables] = await pool.query("SHOW TABLES LIKE 'transactions'");
            console.log('🧪 Transactions table exists:', tables.length > 0);
            
            if (tables.length === 0) {
                return res.json({
                    success: false,
                    message: 'Transactions table does not exist',
                    data: { table_exists: false }
                });
            }
            
            // Check total transactions for this user
            const [userTransactions] = await pool.query(
                'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?', 
                [requesterId]
            );
            
            // Check transactions for this specific account
            const [accountTransactions] = await pool.query(
                'SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND account_id = ?', 
                [requesterId, parseInt(accountId)]
            );
            
            // Get a sample of transactions
            const [sampleTransactions] = await pool.query(
                'SELECT * FROM transactions WHERE user_id = ? AND account_id = ? LIMIT 3', 
                [requesterId, parseInt(accountId)]
            );
            
            res.json({
                success: true,
                debug_info: {
                    table_exists: true,
                    user_id: requesterId,
                    account_id: parseInt(accountId),
                    total_user_transactions: userTransactions[0].count,
                    account_transactions: accountTransactions[0].count,
                    sample_transactions: sampleTransactions
                }
            });
            
        } catch (error) {
            console.error('🧪 DEBUG ERROR:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

export default FinancialRoute;