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

export default FinancialRoute;