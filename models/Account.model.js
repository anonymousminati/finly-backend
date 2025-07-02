const Account = {
    /**
     * Get account details by ID for a specific user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {number} accountId - Account ID
     * @returns {Object} Account details with transactions and analytics
     */
    getAccountById: async (pool, userId, accountId) => {
        try {
            console.log('🔄 Account.getAccountById called with:', { userId, accountId });
            
            // Check if accounts table exists
           
            // Get account details
            const accountQuery = `
                SELECT 
                   *
                FROM financial_accounts 
                WHERE id = ? AND user_id = ? 
            `;
            
            const [accounts] = await pool.query(accountQuery, [parseInt(accountId), parseInt(userId)]);
            
            if (accounts.length === 0) {
                throw new Error('Account not found or access denied');
            }
            
            const account = accounts[0];
            console.log('✅ Found account:', account.account_name);
            
            return {
                account_id: account.id,
                account_name: account.account_name,
                account_number: account.account_number,
                masked_account_number: account.masked_account_number,
                // account_type: account.account_type,
                bank_name: account.bank_name,
                branch_name: account.branch_name,
                current_balance: parseFloat(account.current_balance || 0),
                available_balance: parseFloat(account.available_balance || 0),
                credit_limit: account.credit_limit ? parseFloat(account.credit_limit) : null,
                currency: account.currency,
                status: account.status,
                created_at: account.created_at,
                updated_at: account.updated_at
            };
            
        } catch (error) {
            console.error('Error getting account by ID:', error);
            throw error;
        }
    },

    /**
     * Get account transactions with pagination and filtering
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {number} accountId - Account ID
     * @param {Object} options - Query options (limit, offset, from, to, type)
     * @returns {Array} Array of transactions
     */
    getAccountTransactions: async (pool, userId, accountId, options = {}) => {
        try {
            console.log('🔄 Account.getAccountTransactions called with:', { userId, accountId, options });
            
            const {
                limit = 20,
                offset = 0,
                from = null,
                to = null,
                type = null
            } = options;
            
            // Check if transactions table exists
            const [tables] = await pool.query("SHOW TABLES LIKE 'transactions'");
            if (tables.length === 0) {
                console.log('⚠️ Transactions table does not exist');
                return [];
            }
            
            // Build dynamic query
            let query = `
                SELECT 
                   *
                FROM transactions 
                WHERE user_id = ? AND account_id = ?
            `;
            
            const queryParams = [parseInt(userId), parseInt(accountId)];
            
            // Add date filters
            if (from) {
                query += ' AND DATE(transaction_date) >= ?';
                queryParams.push(from);
            }
            
            if (to) {
                query += ' AND DATE(transaction_date) <= ?';
                queryParams.push(to);
            }
            
            // Add type filter
            if (type) {
                query += ' AND transaction_type = ?';
                queryParams.push(type);
            }
            
            query += ' ORDER BY transaction_date DESC, id DESC';
            query += ' LIMIT ? OFFSET ?';
            queryParams.push(parseInt(limit), parseInt(offset));
            
            console.log('🔍 Query:', query);
            console.log('🔍 Params:', queryParams);
            
            const [transactions] = await pool.query(query, queryParams);
            console.log('✅ Found transactions:', transactions.length);
            
            return transactions.map(txn => ({
                transaction_id: txn.transaction_id,
                type: txn.type || 'unknown',
                amount: parseFloat(txn.amount || 0),
                description: txn.description || 'No description',
                date: txn.date,
                status: txn.status || 'completed',
                created_at: txn.created_at
            }));
            
        } catch (error) {
            console.error('Error getting account transactions:', error);
            throw error;
        }
    },

    /**
     * Get account analytics and statistics
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {number} accountId - Account ID
     * @param {number} days - Number of days for analytics (default 30)
     * @returns {Object} Account analytics data
     */
    getAccountAnalytics: async (pool, userId, accountId, days = 30) => {
        try {
            console.log('🔄 Account.getAccountAnalytics called with:', { userId, accountId, days });
            
            // Check if transactions table exists
            const [tables] = await pool.query("SHOW TABLES LIKE 'transactions'");
            if (tables.length === 0) {
                return {
                    total_transactions: 0,
                    total_income: 0,
                    total_expenses: 0,
                    average_transaction: 0,
                    transaction_count_by_type: {},
                    monthly_trend: []
                };
            }
            
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const formatDate = (date) => date.toISOString().split('T')[0];
            
            // Get transaction analytics
            const analyticsQuery = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses,
                    AVG(ABS(amount)) as average_transaction,
                    transaction_type,
                    COUNT(*) as type_count
                FROM transactions 
                WHERE user_id = ? AND account_id = ?
                AND DATE(transaction_date) >= ?
                GROUP BY transaction_type
            `;
            
            const [analytics] = await pool.query(analyticsQuery, [
                parseInt(userId), 
                parseInt(accountId), 
                formatDate(startDate)
            ]);
            
            // Process results
            let totalTransactions = 0;
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalAmount = 0;
            const transactionCountByType = {};
            
            analytics.forEach(row => {
                totalTransactions += parseInt(row.type_count);
                totalIncome += parseFloat(row.total_income || 0);
                totalExpenses += parseFloat(row.total_expenses || 0);
                totalAmount += parseFloat(row.total_income || 0) + parseFloat(row.total_expenses || 0);
                transactionCountByType[row.transaction_type] = parseInt(row.type_count);
            });
            
            const averageTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
            
            // Get monthly trend data
            const trendQuery = `
                SELECT 
                    DATE_FORMAT(transaction_date, '%Y-%m') as month,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
                    COUNT(*) as transaction_count
                FROM transactions 
                WHERE user_id = ? AND account_id = ?
                AND DATE(transaction_date) >= ?
                GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
                ORDER BY month DESC
                LIMIT 6
            `;
            
            const [trendData] = await pool.query(trendQuery, [
                parseInt(userId), 
                parseInt(accountId), 
                formatDate(startDate)
            ]);
            
            const monthlyTrend = trendData.map(row => ({
                month: row.month,
                income: parseFloat(row.income || 0),
                expenses: parseFloat(row.expenses || 0),
                transaction_count: parseInt(row.transaction_count || 0)
            }));
            
            return {
                total_transactions: totalTransactions,
                total_income: totalIncome,
                total_expenses: totalExpenses,
                average_transaction: Math.round(averageTransaction * 100) / 100,
                transaction_count_by_type: transactionCountByType,
                monthly_trend: monthlyTrend,
                period_days: days
            };
            
        } catch (error) {
            console.error('Error getting account analytics:', error);
            throw error;
        }
    },

    /**
     * Get all accounts for a user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @returns {Array} Array of user accounts
     */
    getUserAccounts: async (pool, userId) => {
        try {
            console.log('🔄 Account.getUserAccounts called with:', { userId });
            
            const query = `
                SELECT 
                    *
                FROM financial_accounts 
                WHERE user_id = ?
            `;
            
            const [accounts] = await pool.query(query, [parseInt(userId)]);
            console.log('✅ Found accounts:', accounts.length);
            
            return accounts.map(account => ({
                account_id: account.account_id,
                account_name: account.account_name,
                account_type: account.account_type,
                bank_name: account.bank_name,
                current_balance: parseFloat(account.current_balance || 0),
                currency: account.currency,
                status: account.status
            }));
            
        } catch (error) {
            console.error('Error getting user accounts:', error);
            throw error;
        }
    }
};

export default Account;
