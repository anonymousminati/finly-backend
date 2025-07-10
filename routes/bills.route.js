// bills.route.js
import express from 'express';
import BillsController from '../controllers/bills.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const BillsRoute = express.Router();

// Temporary middleware for development - will bypass authentication
const tempAuthMiddleware = (req, res, next) => {
    // Set Sophia Budget's user ID (ID: 10) for testing
    req.user = { id: 10 };
    next();
};

// Use tempAuthMiddleware for development, switch to authMiddleware for production
const auth = process.env.NODE_ENV === 'production' ? authMiddleware : tempAuthMiddleware;

// Get all bills for the authenticated user with filtering and pagination
BillsRoute.get('/', auth, BillsController.getBills);

// Get a specific bill by ID
BillsRoute.get('/:id', auth, BillsController.getBillById);

export default BillsRoute;
