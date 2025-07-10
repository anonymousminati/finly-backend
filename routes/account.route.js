import express from 'express';
import AccountController from '../controllers/account.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const AccountRoute = express.Router();

// Account routes (All protected with authentication)

/**
 * Create a new account
 * POST /api/accounts
 * Body: account data (account_type, account_name, etc.)
 * Uses authenticated user only
 */
AccountRoute.post(
    '/new-account',
    authMiddleware,
    AccountController.createAccount
);

/**
 * Get all accounts for the authenticated user
 * GET /api/accounts
 * No query params needed - uses authenticated user only
 */
AccountRoute.get(
    '/',
    authMiddleware,
    AccountController.getUserAccounts
);

/**
 * Get specific account details
 * GET /api/accounts/:accountId
 * Params: accountId (required)
 * Uses authenticated user only
 */
AccountRoute.get(
    '/:accountId',
    authMiddleware,
    AccountController.getAccountDetails
);

/**
 * Get account transactions with pagination and filtering
 * GET /api/accounts/:accountId/transactions
 * Params: accountId (required)
 * Query params:
 *   - limit (1-100, default 20)
 *   - offset (default 0)
 *   - from (YYYY-MM-DD format, optional)
 *   - to (YYYY-MM-DD format, optional)
 *   - type (transaction type filter, optional)
 * Uses authenticated user only
 */
AccountRoute.get(
    '/:accountId/transactions',
    authMiddleware,
    AccountController.getAccountTransactions
);

/**
 * Get account analytics and statistics
 * GET /api/accounts/:accountId/analytics
 * Params: accountId (required)
 * Query params:
 *   - days (1-365, default 30) - Number of days for analytics
 * Uses authenticated user only
 */
AccountRoute.get(
    '/:accountId/analytics',
    authMiddleware,
    AccountController.getAccountAnalytics
);

export default AccountRoute;
