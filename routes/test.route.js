// Test route for debugging transactions API
import express from 'express';
import FinanceController from '../controllers/finance.controller.js';

const TestRoute = express.Router();

// Test route without authentication
TestRoute.get('/test-transactions', async (req, res) => {
    try {
        console.log('🧪 Test route called');
        console.log('🧪 Query params:', req.query);
        
        // Mock req.user for testing
        req.user = { id: 1 };
        
        // Add some default query params if missing
        if (!req.query.limit) req.query.limit = '20';
        if (!req.query.offset) req.query.offset = '0';
        if (!req.query.sortBy) req.query.sortBy = 'transaction_date';
        if (!req.query.sortOrder) req.query.sortOrder = 'DESC';
        
        console.log('🧪 Modified query params:', req.query);
        
        // Call the controller method
        await FinanceController.getTransactions(req, res);
        
    } catch (error) {
        console.error('❌ Test route error:', error);
        res.status(500).json({
            success: false,
            error: 'Test failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

export default TestRoute;
