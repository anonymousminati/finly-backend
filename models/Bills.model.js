// Bills.model.js
// Model for handling bills data

const Bills = {
    /**
     * Get bills for a user with filters and pagination
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {Object} options - Filters and pagination
     * @returns {Object} { bills: [], total: number }
     */
    getBillsByUser: async (pool, userId, options = {}) => {
        try {
            const {
                status = [],
                amountMin = null,
                amountMax = null,
                dueDateStart = null,
                dueDateEnd = null,
                companies = [],
                frequency = [],
                search = '',
                limit = 20,
                offset = 0
            } = options;

            // Build dynamic WHERE clause
            let where = 'b.user_id = ?';
            const params = [userId];

            // Filter by status (upcoming, overdue, paid)
            if (status && status.length > 0) {
                where += ` AND b.status IN (${status.map(() => '?').join(',')})`;
                params.push(...status);
            }
            
            // Filter by amount range
            if (amountMin !== null && amountMin !== undefined) {
                where += ' AND b.amount >= ?';
                params.push(amountMin);
            }
            if (amountMax !== null && amountMax !== undefined) {
                where += ' AND b.amount <= ?';
                params.push(amountMax);
            }
            
            // Filter by due date range
            if (dueDateStart && dueDateStart.trim() !== '') {
                where += ' AND b.next_due_date >= ?';
                params.push(dueDateStart);
            }
            if (dueDateEnd && dueDateEnd.trim() !== '') {
                where += ' AND b.next_due_date <= ?';
                params.push(dueDateEnd);
            }
            
            // Filter by companies
            if (companies && companies.length > 0) {
                where += ` AND b.company_name IN (${companies.map(() => '?').join(',')})`;
                params.push(...companies);
            }
            
            // Filter by frequency (monthly, quarterly, yearly)
            if (frequency && frequency.length > 0) {
                where += ` AND b.billing_frequency IN (${frequency.map(() => '?').join(',')})`;
                params.push(...frequency);
            }
            
            // Search in company name, plan name, service name, or description
            if (search && search.trim() !== '') {
                where += ' AND (b.company_name LIKE ? OR b.plan_name LIKE ? OR b.service_name LIKE ? OR b.description LIKE ?)';
                const like = `%${search.trim()}%`;
                params.push(like, like, like, like);
            }

            // Get total count for pagination
            const [countRows] = await pool.query(`
                SELECT COUNT(*) as total
                FROM bills b
                WHERE ${where}
            `, params);
            const total = countRows[0]?.total || 0;

            // Get paginated bills with all required fields
            const [rows] = await pool.query(`
                SELECT 
                    b.id,
                    b.company_name AS company,
                    b.plan_name AS plan,
                    b.service_name,
                    b.description,
                    b.amount,
                    b.currency,
                    b.billing_frequency AS frequency,
                    b.next_due_date,
                    b.last_paid_date,
                    b.last_paid_amount,
                    b.status,
                    b.company_logo_url AS logo,
                    b.created_at,
                    b.updated_at,
                    a.account_name,
                    c.name AS category_name
                FROM bills b
                LEFT JOIN financial_accounts a ON b.account_id = a.id
                LEFT JOIN transaction_categories c ON b.category_id = c.id
                WHERE ${where}
                ORDER BY b.next_due_date ASC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            // Map SQL rows to frontend structure (matching the Bill interface in frontend)
            const bills = rows.map(row => ({
                id: row.id,
                dueDate: row.next_due_date
                    ? {
                        month: new Date(row.next_due_date).toLocaleString('en-US', { month: 'short' }),
                        day: new Date(row.next_due_date).getDate().toString(),
                        year: new Date(row.next_due_date).getFullYear().toString()
                    }
                    : { month: '', day: '', year: '' },
                logo: row.logo || 'default', // Default logo if none provided
                company: row.company,
                plan: row.plan || row.service_name,
                description: row.description || '',
                lastCharge: row.last_paid_date
                    ? new Date(row.last_paid_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Never',
                amount: row.amount !== undefined && row.amount !== null ? `$${parseFloat(row.amount).toFixed(2)}` : '$0.00',
                amountValue: row.amount !== undefined && row.amount !== null ? parseFloat(row.amount) : 0,
                status: row.status || 'upcoming',
                frequency: row.frequency || 'monthly',
                currency: row.currency || 'USD',
                accountName: row.account_name || '',
                categoryName: row.category_name || '',
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));

            return { bills, total };
        } catch (error) {
            console.error('Error fetching bills:', error);
            throw new Error('Failed to fetch bills: ' + error.message);
        }
    },

    /**
     * Get a bill by ID
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {number} billId - Bill ID
     * @returns {Object} Bill details
     */
    getBillById: async (pool, userId, billId) => {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    b.id,
                    b.company_name AS company,
                    b.plan_name AS plan,
                    b.service_name,
                    b.description,
                    b.amount,
                    b.currency,
                    b.billing_frequency AS frequency,
                    b.next_due_date,
                    b.last_paid_date,
                    b.last_paid_amount,
                    b.status,
                    b.company_logo_url AS logo,
                    b.created_at,
                    b.updated_at,
                    a.account_name,
                    c.name AS category_name
                FROM bills b
                LEFT JOIN financial_accounts a ON b.account_id = a.id
                LEFT JOIN transaction_categories c ON b.category_id = c.id
                WHERE b.user_id = ? AND b.id = ?
            `, [userId, billId]);

            if (rows.length === 0) {
                return null;
            }

            const row = rows[0];
            return {
                id: row.id,
                dueDate: row.next_due_date
                    ? {
                        month: new Date(row.next_due_date).toLocaleString('en-US', { month: 'short' }),
                        day: new Date(row.next_due_date).getDate().toString(),
                        year: new Date(row.next_due_date).getFullYear().toString()
                    }
                    : { month: '', day: '', year: '' },
                logo: row.logo || 'default',
                company: row.company,
                plan: row.plan || row.service_name,
                description: row.description || '',
                lastCharge: row.last_paid_date
                    ? new Date(row.last_paid_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Never',
                amount: row.amount !== undefined && row.amount !== null ? `$${parseFloat(row.amount).toFixed(2)}` : '$0.00',
                amountValue: row.amount !== undefined && row.amount !== null ? parseFloat(row.amount) : 0,
                status: row.status || 'upcoming',
                frequency: row.frequency || 'monthly',
                currency: row.currency || 'USD',
                accountName: row.account_name || '',
                categoryName: row.category_name || '',
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('Error fetching bill by ID:', error);
            throw new Error('Failed to fetch bill details: ' + error.message);
        }
    },

    /**
     * Create a new bill for a user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {Object} billData - Bill data to create
     * @returns {Object} Created bill details
     */
    createBill: async (pool, userId, billData) => {
        try {
            const {
                company_name,
                service_name,
                plan_name = null,
                description = null,
                amount,
                currency = 'USD',
                billing_frequency,
                next_due_date,
                last_paid_date = null,
                last_paid_amount = null,
                status = 'upcoming',
                auto_pay_enabled = false,
                reminder_days_before = 3,
                company_logo_url = null,
                account_id = null,
                category_id = null,
                website_url = null,
                customer_account_number = null,
                notes = null
            } = billData;

            // Required fields validation
            if (!company_name || !service_name || !amount || !billing_frequency || !next_due_date) {
                throw new Error('Missing required fields for creating a bill');
            }

            // Insert new bill
            const [result] = await pool.query(`
                INSERT INTO bills (
                    user_id, account_id, company_name, service_name, plan_name, 
                    description, amount, currency, billing_frequency, next_due_date,
                    last_paid_date, last_paid_amount, status, auto_pay_enabled,
                    reminder_days_before, company_logo_url, category_id, website_url,
                    customer_account_number, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId, account_id, company_name, service_name, plan_name,
                description, amount, currency, billing_frequency, next_due_date,
                last_paid_date, last_paid_amount, status, auto_pay_enabled,
                reminder_days_before, company_logo_url, category_id, website_url,
                customer_account_number, notes
            ]);

            if (!result.insertId) {
                throw new Error('Failed to create bill');
            }

            // Get the newly created bill
            return await Bills.getBillById(pool, userId, result.insertId);
        } catch (error) {
            console.error('Error creating bill:', error);
            throw new Error('Failed to create bill: ' + error.message);
        }
    }
};

export default Bills;
