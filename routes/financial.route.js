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

export default FinancialRoute;