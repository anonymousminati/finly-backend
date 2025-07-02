

import mysql from 'mysql2/promise';

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
            // Get user's financial accounts with transaction counts
            const accountsQuery = `
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
                    ${from ? 'AND t.transaction_date >= ?' : ''}
                    ${to ? 'AND t.transaction_date <= ?' : ''}
                WHERE fa.user_id = ? AND fa.is_active = 1
                GROUP BY fa.id
                ORDER BY fa.is_primary DESC, fa.current_balance DESC
            `;
            
            const accountsParams = [];
            if (from) accountsParams.push(from);
            if (to) accountsParams.push(to);
            accountsParams.push(userId);
            
            const [accounts] = await pool.execute(accountsQuery, accountsParams);
            
            // Get transaction summary
            const transactionSummaryQuery = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expenses,
                    AVG(amount) as average_transaction
                FROM transactions t
                WHERE t.user_id = ? AND t.status = 'completed'
                    ${from ? 'AND t.transaction_date >= ?' : ''}
                    ${to ? 'AND t.transaction_date <= ?' : ''}
            `;
            
            const transactionParams = [userId];
            if (from) transactionParams.push(from);
            if (to) transactionParams.push(to);
            
            const [transactionSummary] = await pool.execute(transactionSummaryQuery, transactionParams);
            
            // Get recent transactions (last 5)
            const recentTransactionsQuery = `
                SELECT 
                    t.id as transaction_id,
                    t.transaction_type as type,
                    t.description,
                    t.amount,
                    t.transaction_date as date,
                    t.status,
                    tc.id as category_id,
                    tc.name as category_name,
                    tc.icon as category_icon
                FROM transactions t
                LEFT JOIN transaction_categories tc ON t.category_id = tc.id
                WHERE t.user_id = ? AND t.status = 'completed'
                    ${from ? 'AND t.transaction_date >= ?' : ''}
                    ${to ? 'AND t.transaction_date <= ?' : ''}
                ORDER BY t.transaction_date DESC, t.created_at DESC
                LIMIT 5
            `;
            
            const [recentTransactions] = await pool.execute(recentTransactionsQuery, transactionParams);
            
            // Get category summaries for each account (top 3 categories)
            const categorySummaryPromises = accounts.map(async (account) => {
                const categorySummaryQuery = `
                    SELECT 
                        tc.id as category_id,
                        tc.name as category_name,
                        SUM(t.amount) as total_amount,
                        COUNT(t.id) as transaction_count
                    FROM transactions t
                    JOIN transaction_categories tc ON t.category_id = tc.id
                    WHERE t.account_id = ? AND t.status = 'completed'
                        ${from ? 'AND t.transaction_date >= ?' : ''}
                        ${to ? 'AND t.transaction_date <= ?' : ''}
                    GROUP BY tc.id, tc.name
                    ORDER BY total_amount DESC
                    LIMIT 3
                `;
                
                const categoryParams = [account.account_id];
                if (from) categoryParams.push(from);
                if (to) categoryParams.push(to);
                
                const [categories] = await pool.execute(categorySummaryQuery, categoryParams);
                return {
                    account_id: account.account_id,
                    categories: categories
                };
            });
            
            const categorySummaries = await Promise.all(categorySummaryPromises);
            
            // Calculate summary totals
            const totalBalance = accounts
                .filter(acc => acc.account_type !== 'credit')
                .reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);
            
            const creditCards = accounts.filter(acc => acc.account_type === 'credit');
            const totalCreditLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.credit_limit || 0), 0);
            const totalCreditUtilized = creditCards.reduce((sum, card) => {
                const utilized = parseFloat(card.credit_limit || 0) - parseFloat(card.available_balance || 0);
                return sum + Math.max(0, utilized);
            }, 0);
            
            // Format accounts with category summaries
            const formattedAccounts = accounts.map(account => {
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
            });
            
            // Format response
            return {
                summary: {
                    total_balance: totalBalance,
                    total_active_accounts: accounts.length,
                    credit_card: {
                        total_limit: totalCreditLimit,
                        total_utilized: totalCreditUtilized,
                        utilization_percentage: totalCreditLimit > 0 ? 
                            Math.round((totalCreditUtilized / totalCreditLimit) * 100 * 100) / 100 : 0
                    }
                },
                accounts: formattedAccounts,
                transactions_summary: {
                    total_transactions: parseInt(transactionSummary[0]?.total_transactions || 0),
                    total_income: parseFloat(transactionSummary[0]?.total_income || 0),
                    total_expenses: parseFloat(transactionSummary[0]?.total_expenses || 0),
                    average_transaction: parseFloat(transactionSummary[0]?.average_transaction || 0),
                    recent_transactions: recentTransactions.map(txn => ({
                        transaction_id: txn.transaction_id,
                        type: txn.type,
                        category: txn.category_id ? {
                            id: txn.category_id,
                            name: txn.category_name,
                            icon: txn.category_icon
                        } : null,
                        description: txn.description,
                        amount: parseFloat(txn.amount),
                        date: txn.date,
                        status: txn.status
                    }))
                }
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
    }
};

export default Financial;