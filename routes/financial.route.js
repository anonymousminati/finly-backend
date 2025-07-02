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

export default FinancialRoute;