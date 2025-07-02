const Financial = {
    /**
     * Get comprehensive financial summary for a user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {Object} dateRange - Optional date range filter
     * @returns {Object} Complete financial summary
     */
    getSummary: async (pool, userId, dateRange = {}) => {
        const { from, to } = dateRange;
        
        try {
            // 1. Get accounts with their transaction counts - Build query dynamically
            let accountsQuery = `
                SELECT 
                    fa.id as account_id,
                    fa.account_name,
                    fa.account_number,
                    fa.masked_account_number,
                    fa.bank_name,
                    fa.branch_name,
                    fa.card_type,
                    fa.account_type,
                    fa.current_balance,
                    fa.available_balance,
                    fa.credit_limit,
                    fa.currency,
                    COUNT(t.id) as transactions_count
                FROM financial_accounts fa
                LEFT JOIN transactions t ON fa.id = t.account_id 
                    AND t.status = 'completed'
            `;
            
            const accountsParams = [];
            
            // Add date range filters if provided
            if (from) {
                accountsQuery += ' AND t.transaction_date >= ?';
                accountsParams.push(from);
            }
            
            if (to) {
                accountsQuery += ' AND t.transaction_date <= ?';
                accountsParams.push(to);
            }
            
            accountsQuery += `
                WHERE fa.user_id = ? AND fa.is_active = 1
                GROUP BY fa.id
                ORDER BY fa.is_primary DESC, fa.account_type ASC
            `;
            accountsParams.push(userId);
            
            console.log('🔍 Accounts Query:', accountsQuery);
            console.log('🔍 Accounts Parameters:', accountsParams);
            
            const [accounts] = await pool.execute(accountsQuery, accountsParams);
            
            // 2. Get category summaries for each account using parallel execution
            const categorySummaryPromises = accounts.map(async (account) => {
                let categorySummaryQuery = `
                    SELECT 
                        tc.id as category_id,
                        tc.name as category_name,
                        SUM(t.amount) as total_amount,
                        COUNT(t.id) as transaction_count
                    FROM transactions t
                    JOIN transaction_categories tc ON t.category_id = tc.id
                    WHERE t.account_id = ? AND t.status = 'completed'
                `;
                
                const categoryParams = [account.account_id];
                
                // Add date range filters if provided
                if (from) {
                    categorySummaryQuery += ' AND t.transaction_date >= ?';
                    categoryParams.push(from);
                }
                
                if (to) {
                    categorySummaryQuery += ' AND t.transaction_date <= ?';
                    categoryParams.push(to);
                }
                
                categorySummaryQuery += `
                    GROUP BY tc.id, tc.name
                    ORDER BY total_amount DESC
                    LIMIT 3
                `;
                
                const [categories] = await pool.execute(categorySummaryQuery, categoryParams);
                return {
                    account_id: account.account_id,
                    categories: categories
                };
            });
            
            const categorySummaries = await Promise.all(categorySummaryPromises);
            
            // 3. Calculate summary totals with correct credit utilization
            const totalBalance = accounts
                .filter(acc => acc.account_type !== 'credit')
                .reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);
            
            const creditCards = accounts.filter(acc => acc.account_type === 'credit');
            const creditData = creditCards.reduce((data, card) => ({
                total_limit: data.total_limit + parseFloat(card.credit_limit || 0),
                total_utilized: data.total_utilized + Math.abs(parseFloat(card.current_balance || 0))
            }), { total_limit: 0, total_utilized: 0 });
            
            // 4. Format the exact response structure
            return {
                summary: {
                    total_balance: totalBalance,
                    total_active_accounts: accounts.length,
                    credit_card: {
                        total_limit: creditData.total_limit,
                        total_utilized: creditData.total_utilized,
                        utilization_percentage: creditData.total_limit > 0 ? 
                            Math.round((creditData.total_utilized / creditData.total_limit) * 100 * 100) / 100 : 0
                    }
                },
                accounts: accounts.map(account => {
                    const categorySummary = categorySummaries.find(cs => cs.account_id === account.account_id);
                    
                    return {
                        account_id: account.account_id,
                        account_name: account.account_name,
                        account_number: account.account_number,
                        masked_account_number: account.masked_account_number,
                        bank_name: account.bank_name,
                        branch_name: account.branch_name,
                        card_type: account.card_type,
                        current_balance: parseFloat(account.current_balance || 0),
                        available_balance: parseFloat(account.available_balance || 0),
                        credit_limit: account.credit_limit ? parseFloat(account.credit_limit) : null,
                        currency: account.currency,
                        transactions_count: parseInt(account.transactions_count || 0),
                        categories_summary: categorySummary ? categorySummary.categories.map(cat => ({
                            category_id: cat.category_id,
                            category_name: cat.category_name,
                            total_amount: parseFloat(cat.total_amount || 0),
                            transaction_count: parseInt(cat.transaction_count || 0)
                        })) : []
                    };
                })
            };
            
        } catch (error) {
            console.error('Error getting financial summary:', error);
            throw error;
        }
    },

    /**
     * Resolve user by UUID or numeric ID
     * @param {Object} pool - Database connection pool
     * @param {string|number} identifier - User UUID or ID
     * @param {number} requesterId - ID of user making the request
     * @returns {Object} User information
     */
    resolveUser: async (pool, identifier, requesterId) => {
        try {
            let query, params;
            
            // Check if identifier is UUID (v4 format) or numeric ID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
            
            if (isUUID) {
                query = 'SELECT id, uuid, username, email, full_name, status FROM users WHERE uuid = ? AND status = "active"';
                params = [identifier];
            } else {
                const numericId = parseInt(identifier);
                if (isNaN(numericId)) {
                    throw new Error('Invalid user identifier format');
                }
                query = 'SELECT id, uuid, username, email, full_name, status FROM users WHERE id = ? AND status = "active"';
                params = [numericId];
            }
            
            const [users] = await pool.execute(query, params);
            
            if (users.length === 0) {
                throw new Error('User not found');
            }
            
            const user = users[0];
            
            // Check if requester has permission to access this user's data
            if (user.id !== requesterId) {
                // Check if requester is admin (you may need to implement admin role check)
                const adminCheckQuery = 'SELECT id FROM users WHERE id = ? AND status = "active"';
                const [adminCheck] = await pool.execute(adminCheckQuery, [requesterId]);
                
                if (adminCheck.length === 0) {
                    throw new Error('Unauthorized access to user data');
                }
                
                // Additional admin role check can be added here if you have role-based access
                // For now, we'll allow only self-access
                throw new Error('Unauthorized access to user data');
            }
            
            return user;
            
        } catch (error) {
            console.error('Error resolving user:', error);
            throw error;
        }
    },

    /**
     * Get recent transactions for a user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {number} limit - Number of transactions to retrieve
     * @param {Object} dateRange - Optional date range filter
     * @returns {Array} List of recent transactions
     */
    getRecentTransactions: async (pool, userId, limit = 5, dateRange = {}) => {
        try {
            console.log('🔄 getRecentTransactions called with:', { userId, limit, dateRange });
            
            // Check if transactions table exists
            try {
                const [tables] = await pool.query("SHOW TABLES LIKE 'transactions'");
                console.log('🔍 Transactions table exists:', tables.length > 0);
                
                if (tables.length === 0) {
                    console.log('⚠️ Transactions table does not exist, returning empty array');
                    return [];
                }
            } catch (tableError) {
                console.error('Error checking tables:', tableError);
                return [];
            }
            
            // Simple test query first to check if user has any transactions
            const testQuery = 'SELECT COUNT(*) as count FROM transactions WHERE user_id = ?';
            const [testResult] = await pool.query(testQuery, [parseInt(userId)]);
            console.log('🔍 User has transactions:', testResult[0].count);
            
            // If no transactions, return empty array
            if (testResult[0].count === 0) {
                console.log('⚠️ No transactions found for user');
                return [];
            }
            
            // Simplest possible query first
            const simpleQuery = 'SELECT * FROM transactions WHERE user_id = ? LIMIT ?';
            const [transactions] = await pool.query(simpleQuery, [parseInt(userId), parseInt(limit)]);
            
            console.log('✅ Found transactions:', transactions.length);
            
            // Return basic transaction format
            return transactions.map(txn => ({
                transaction_id: txn.id,
                type: txn.transaction_type || 'unknown',
                category: null,
                description: txn.description || 'No description',
                amount: parseFloat(txn.amount || 0),
                date: txn.transaction_date || txn.created_at,
                status: txn.status || 'completed',
                account: {
                    name: 'Unknown Account',
                    bank: 'Unknown Bank'
                }
            }));
            
            
        } catch (error) {
            console.error('Error getting recent transactions:', error);
            throw error;
        }
    },
};

export default Financial;