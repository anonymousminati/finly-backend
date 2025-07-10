// bills.controller.js
import Bills from '../models/Bills.model.js';
import { pool } from '../configs/db.config.js';

/**
 * Parse an array from a query parameter
 * @param {string|string[]} param - The query parameter value
 * @returns {string[]} - The parsed array
 */
function parseArrayParam(param) {
    if (!param) return [];
    if (Array.isArray(param)) return param;
    return param.split(',').filter(item => item.trim());
}

const BillsController = {
    /**
     * Get all bills for the authenticated user with filtering and pagination
     * GET /api/bills
     */
    getBills: async (req, res) => {
        try {
            // In a real app, get userId from req.user (after auth middleware)
            const userId = req.user?.id || 10; // fallback to 10 (Sophia Budget) for mock/demo

            // Parse query params with defaults
            const statusArr = parseArrayParam(req.query.status);
            const companiesArr = parseArrayParam(req.query.companies);
            const frequencyArr = parseArrayParam(req.query.frequency);

            const amountMin = req.query.amountMin !== undefined && req.query.amountMin !== '' 
                ? Number(req.query.amountMin) : null;
                
            const amountMax = req.query.amountMax !== undefined && req.query.amountMax !== '' 
                ? Number(req.query.amountMax) : null;

            const limit = req.query.limit !== undefined ? parseInt(req.query.limit) : 20;
            const offset = req.query.offset !== undefined ? parseInt(req.query.offset) : 0;

            // Build options object with processed values
            const options = {
                status: statusArr,
                amountMin,
                amountMax,
                dueDateStart: req.query.dueDateStart || null,
                dueDateEnd: req.query.dueDateEnd || null,
                companies: companiesArr,
                frequency: frequencyArr,
                search: req.query.search || '',
                limit,
                offset
            };

            // Get bills from database
            const billsResult = await Bills.getBillsByUser(pool, userId, options);
            const { bills, total } = billsResult;
            
            // Return response with pagination metadata
            res.status(200).json({ 
                success: true, 
                data: bills, 
                total: total,
                page: Math.floor(options.offset / options.limit) + 1,
                pageSize: options.limit,
                totalPages: Math.ceil(total / options.limit)
            });
        } catch (error) {
            console.error('Error fetching bills:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch bills',
                message: error.message 
            });
        }
    },

    /**
     * Get a single bill by ID
     * GET /api/bills/:id
     */
    getBillById: async (req, res) => {
        try {
            const userId = req.user?.id || 10; // fallback to 10 (Sophia Budget) for mock/demo
            const billId = parseInt(req.params.id);
            
            if (isNaN(billId)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid bill ID' 
                });
            }

            const bill = await Bills.getBillById(pool, userId, billId);
            
            if (!bill) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Bill not found' 
                });
            }

            res.status(200).json({ 
                success: true, 
                data: bill 
            });
        } catch (error) {
            console.error('Error fetching bill by ID:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch bill details',
                message: error.message 
            });
        }
    },

    /**
     * Create a new bill for the authenticated user
     * POST /api/bills
     */
    createBill: async (req, res) => {
        try {
            const userId = req.user?.id || 10; // fallback to 10 (Sophia Budget) for mock/demo
            
            // Get bill data from request body
            const billData = {
                company_name: req.body.company,
                service_name: req.body.serviceName || req.body.company,
                plan_name: req.body.plan,
                description: req.body.description,
                amount: parseFloat(req.body.amount),
                currency: req.body.currency || 'USD',
                billing_frequency: req.body.frequency,
                next_due_date: req.body.nextDueDate,
                status: req.body.status || 'upcoming',
                auto_pay_enabled: req.body.autoPayEnabled || false,
                company_logo_url: req.body.logo,
                account_id: req.body.accountId,
                category_id: req.body.categoryId,
                website_url: req.body.websiteUrl,
                customer_account_number: req.body.customerAccountNumber,
                notes: req.body.notes
            };
            
            // Validate required fields
            const requiredFields = ['company_name', 'amount', 'billing_frequency', 'next_due_date'];
            const missingFields = requiredFields.filter(field => !billData[field]);
            
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    missingFields
                });
            }
            
            // Create bill in database
            const newBill = await Bills.createBill(pool, userId, billData);
            
            res.status(201).json({
                success: true,
                message: 'Bill created successfully',
                data: newBill
            });
        } catch (error) {
            console.error('Error creating bill:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create bill',
                message: error.message
            });
        }
    }
};

export default BillsController;
