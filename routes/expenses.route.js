// expenses.route.js - API routes for expenses
import express from 'express';
import ExpensesController from '../controllers/expenses.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const ExpensesRoute = express.Router();

// Temporary middleware for development - will bypass authentication
const tempAuthMiddleware = (req, res, next) => {
    // Set Sophia Budget's user ID (ID: 10) for testing
    req.user = { id: 10 };
    next();
};

// Use tempAuthMiddleware for development, switch to authMiddleware for production
const auth = process.env.NODE_ENV === 'production' ? authMiddleware : tempAuthMiddleware;

// Route for getting expense categories with items
ExpensesRoute.get('/categories', auth, ExpensesController.getExpenseCategories);

// Route for getting expense chart data
ExpensesRoute.get('/chart', auth, ExpensesController.getExpenseChartData);


// Route for creating a new expense
ExpensesRoute.post('/', auth, ExpensesController.createExpense);

// Route for getting expense summary
ExpensesRoute.get('/summary', auth, ExpensesController.getExpenseSummary);

export default ExpensesRoute;
