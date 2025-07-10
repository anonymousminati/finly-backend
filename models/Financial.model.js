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
    getRecentTransactionsByAccountId: async (pool, userId, accountId, limit = 5, dateRange = {}) => {
        try {
            console.log('🔄 getRecentTransactionsByAccountId called with:', { userId, accountId, limit, dateRange });
            // Check if transactions table exists
            try {
                const [tables] = await pool.query("SHOW TABLES LIKE 'transactions'");
                console.log('🔍 Transactions table exists:', tables.length > 0)
                if (tables.length === 0) {
                        
                    console.log('⚠️ Transactions table does not exist, returning empty array');
                    return [];
                }
            } catch (tableError) {
                console.error('Error checking tables:', tableError);
                return [];
            }
            // Simple test query first to check if user has any transactions
            const testQuery = 'SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND account_id = ?';
            const [testResult] = await pool.query(testQuery, [parseInt(userId), parseInt(accountId)]);
            console.log('🔍 User has transactions:', testResult[0].count);

            if (testResult[0].count === 0) {
                console.log('⚠️ No transactions found for user');
                return [];
            }

            // Simplest possible query first
            const simpleQuery = 'SELECT * FROM transactions WHERE user_id = ? AND account_id = ? LIMIT ?';
            const [transactions] = await pool.query(simpleQuery, [parseInt(userId), parseInt(accountId), parseInt(limit)]);

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

    /**
     * Get expense statistics for the user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {number} days - Number of days for the statistics
     * @returns {Object} Expense statistics
     */
    getExpenseStatistics: async (pool, userId, days = 7) => {
        try {
            console.log('🔄 getExpenseStatistics called with:', { userId, days });
            
            // Check if transactions table exists
            try {
                const [tables] = await pool.query("SHOW TABLES LIKE 'transactions'");
                if (tables.length === 0) {
                    console.log('⚠️ Transactions table does not exist, returning empty stats');
                    return {
                        total_expenses: 0,
                        daily_expenses: [],
                        weekly_change: 0,
                        highest_category: {
                            category_name: 'No Categories',
                            category_id: 0,
                            total_amount: 0,
                            transaction_count: 0
                        },
                        lowest_category: {
                            category_name: 'No Categories',
                            category_id: 0,
                            total_amount: 0,
                            transaction_count: 0
                        },
                        period_start: new Date().toISOString().split('T')[0],
                        period_end: new Date().toISOString().split('T')[0]
                    };
                }
            } catch (tableError) {
                console.error('Error checking tables:', tableError);
                throw tableError;
            }
            
            // Calculate date ranges
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days + 1);
            
            const prevStartDate = new Date();
            prevStartDate.setDate(startDate.getDate() - days);
            const prevEndDate = new Date(startDate);
            prevEndDate.setDate(prevEndDate.getDate() - 1);
            
            const formatDate = (date) => date.toISOString().split('T')[0];
            
            // Get transactions for current period
            const currentQuery = `
                SELECT * FROM transactions 
                WHERE user_id = ? 
                AND DATE(transaction_date) BETWEEN ? AND ?
                AND (transaction_type = 'expense' OR transaction_type = 'debit' OR amount < 0)
                ORDER BY transaction_date DESC
                LIMIT 100
            `;
            
            // Get transactions for previous period (for comparison)
            const previousQuery = `
                SELECT * FROM transactions 
                WHERE user_id = ? 
                AND DATE(transaction_date) BETWEEN ? AND ?
                AND (transaction_type = 'expense' OR transaction_type = 'debit' OR amount < 0)
                ORDER BY transaction_date DESC
                LIMIT 100
            `;
            
            const [currentTransactions] = await pool.query(currentQuery, [
                parseInt(userId), 
                formatDate(startDate), 
                formatDate(endDate)
            ]);
            
            const [previousTransactions] = await pool.query(previousQuery, [
                parseInt(userId), 
                formatDate(prevStartDate), 
                formatDate(prevEndDate)
            ]);
            
            console.log('✅ Found current transactions:', currentTransactions.length);
            console.log('✅ Found previous transactions:', previousTransactions.length);
            
            // Calculate daily expenses
            const dailyExpenses = [];
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dateStr = formatDate(date);
                
                const dayTransactions = currentTransactions.filter(t => 
                    t.transaction_date && t.transaction_date.toISOString().split('T')[0] === dateStr
                );
                
                const dayTotal = dayTransactions.reduce((sum, t) => 
                    sum + Math.abs(parseFloat(t.amount || 0)), 0
                );
                
                dailyExpenses.push({
                    day: dayNames[date.getDay()],
                    amount: dayTotal,
                    date: dateStr
                });
            }
            
            // Calculate totals
            const totalExpenses = currentTransactions.reduce((sum, t) => 
                sum + Math.abs(parseFloat(t.amount || 0)), 0
            );
            
            const previousTotalExpenses = previousTransactions.reduce((sum, t) => 
                sum + Math.abs(parseFloat(t.amount || 0)), 0
            );
            
            // Calculate weekly change
            const weeklyChange = previousTotalExpenses > 0 
                ? ((totalExpenses - previousTotalExpenses) / previousTotalExpenses) * 100
                : 0;
            
            // Process categories (using basic categorization since we don't have category table)
            const categoryMap = new Map();
            
            currentTransactions.forEach(t => {
                const categoryName = t.category_name || 'Uncategorized';
                const categoryId = t.category_id || 0;
                
                if (categoryMap.has(categoryName)) {
                    const existing = categoryMap.get(categoryName);
                    existing.total_amount += Math.abs(parseFloat(t.amount || 0));
                    existing.transaction_count += 1;
                } else {
                    categoryMap.set(categoryName, {
                        category_name: categoryName,
                        category_id: categoryId,
                        total_amount: Math.abs(parseFloat(t.amount || 0)),
                        transaction_count: 1
                    });
                }
            });
            
            const sortedCategories = Array.from(categoryMap.values())
                .sort((a, b) => b.total_amount - a.total_amount);
            
            const defaultCategory = {
                category_name: 'No Categories',
                category_id: 0,
                total_amount: 0,
                transaction_count: 0
            };
            
            return {
                total_expenses: totalExpenses,
                daily_expenses: dailyExpenses,
                weekly_change: Math.round(weeklyChange * 100) / 100,
                highest_category: sortedCategories[0] || defaultCategory,
                lowest_category: sortedCategories[sortedCategories.length - 1] || defaultCategory,
                period_start: formatDate(startDate),
                period_end: formatDate(endDate)
            };
            
        } catch (error) {
            console.error('Error getting expense statistics:', error);
            throw error;
        }
    },

    /**
     * Get transactions with pagination and dynamic filters
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @param {number} options.limit - Maximum number of transactions to return
     * @param {number} options.offset - Number of transactions to skip
     * @param {Object} options.filters - Dynamic filters object
     * @param {string} options.sortBy - Sort field (default: 'transaction_date')
     * @param {string} options.sortOrder - Sort order (default: 'DESC')
     * @returns {Object} Transactions with pagination metadata
     */
    getTransactionsWithPagination: async (pool, userId, options = {}) => {
        try {
            console.log('🔄 getTransactionsWithPagination called with:', { userId, options });
            
            // Set default options
            const {
                limit = 20,
                offset = 0,
                filters = {},
                sortBy = 'transaction_date',
                sortOrder = 'DESC'
            } = options;
            
            // Validate limit and offset
            const parsedLimit = Math.min(Math.max(parseInt(limit), 1), 100); // Between 1 and 100
            const parsedOffset = Math.max(parseInt(offset), 0);
            
            // Check if transactions table exists
            const [tables] = await pool.query("SHOW TABLES LIKE 'transactions'");
            if (tables.length === 0) {
                console.log('⚠️ Transactions table does not exist, returning empty result');
                return {
                    transactions: [],
                    pagination: {
                        total: 0,
                        limit: parsedLimit,
                        offset: parsedOffset,
                        has_more: false,
                        current_page: Math.floor(parsedOffset / parsedLimit) + 1,
                        total_pages: 0
                    }
                };
            }
            
            // Build base query with joins
            let baseQuery = `
                SELECT 
                    t.id,
                    t.transaction_type,
                    t.category_id,
                    t.merchant_name,
                    t.description,
                    t.items,
                    t.amount,
                    t.currency,
                    t.payment_method,
                    t.transaction_date,
                    t.transaction_time,
                    t.status,
                    t.reference_number,
                    t.external_transaction_id,
                    t.location_data,
                    t.metadata,
                    t.created_at,
                    t.updated_at,
                    fa.account_name,
                    fa.account_type,
                    fa.bank_name,
                    fa.masked_account_number,
                    tc.name as category_name,
                    tc.color as category_color,
                    tc.icon as category_icon
                FROM transactions t
                LEFT JOIN financial_accounts fa ON t.account_id = fa.id
                LEFT JOIN transaction_categories tc ON t.category_id = tc.id
                WHERE t.user_id = ?
            `;
            
            let countQuery = `
                SELECT COUNT(*) as total
                FROM transactions t
                LEFT JOIN financial_accounts fa ON t.account_id = fa.id
                LEFT JOIN transaction_categories tc ON t.category_id = tc.id
                WHERE t.user_id = ?
            `;
            
            const queryParams = [userId];
            const countParams = [userId];
            
            // Apply dynamic filters
            if (filters.dateFrom) {
                baseQuery += ' AND t.transaction_date >= ?';
                countQuery += ' AND t.transaction_date >= ?';
                queryParams.push(filters.dateFrom);
                countParams.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                baseQuery += ' AND t.transaction_date <= ?';
                countQuery += ' AND t.transaction_date <= ?';
                queryParams.push(filters.dateTo);
                countParams.push(filters.dateTo);
            }
            
            if (filters.accountId) {
                baseQuery += ' AND t.account_id = ?';
                countQuery += ' AND t.account_id = ?';
                queryParams.push(filters.accountId);
                countParams.push(filters.accountId);
            }
            
            if (filters.transactionType && filters.transactionType.length > 0) {
                const placeholders = filters.transactionType.map(() => '?').join(', ');
                baseQuery += ` AND t.transaction_type IN (${placeholders})`;
                countQuery += ` AND t.transaction_type IN (${placeholders})`;
                queryParams.push(...filters.transactionType);
                countParams.push(...filters.transactionType);
            }
            
            if (filters.categoryId && filters.categoryId.length > 0) {
                const placeholders = filters.categoryId.map(() => '?').join(', ');
                baseQuery += ` AND t.category_id IN (${placeholders})`;
                countQuery += ` AND t.category_id IN (${placeholders})`;
                queryParams.push(...filters.categoryId);
                countParams.push(...filters.categoryId);
            }
            
            if (filters.paymentMethod && filters.paymentMethod.length > 0) {
                const placeholders = filters.paymentMethod.map(() => '?').join(', ');
                baseQuery += ` AND t.payment_method IN (${placeholders})`;
                countQuery += ` AND t.payment_method IN (${placeholders})`;
                queryParams.push(...filters.paymentMethod);
                countParams.push(...filters.paymentMethod);
            }
            
            if (filters.status && filters.status.length > 0) {
                const placeholders = filters.status.map(() => '?').join(', ');
                baseQuery += ` AND t.status IN (${placeholders})`;
                countQuery += ` AND t.status IN (${placeholders})`;
                queryParams.push(...filters.status);
                countParams.push(...filters.status);
            }
            
            if (filters.amountMin !== undefined && filters.amountMin !== null) {
                baseQuery += ' AND ABS(t.amount) >= ?';
                countQuery += ' AND ABS(t.amount) >= ?';
                queryParams.push(filters.amountMin);
                countParams.push(filters.amountMin);
            }
            
            if (filters.amountMax !== undefined && filters.amountMax !== null) {
                baseQuery += ' AND ABS(t.amount) <= ?';
                countQuery += ' AND ABS(t.amount) <= ?';
                queryParams.push(filters.amountMax);
                countParams.push(filters.amountMax);
            }
            
            if (filters.search) {
                baseQuery += ' AND (t.description LIKE ? OR t.merchant_name LIKE ? OR t.items LIKE ?)';
                countQuery += ' AND (t.description LIKE ? OR t.merchant_name LIKE ? OR t.items LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
                countParams.push(searchTerm, searchTerm, searchTerm);
            }
            
            // Validate sort fields
            const allowedSortFields = [
                'transaction_date', 'amount', 'created_at', 'updated_at',
                'merchant_name', 'transaction_type', 'status'
            ];
            const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'transaction_date';
            const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
            
            // Add sorting and pagination
            baseQuery += ` ORDER BY t.${validSortBy} ${validSortOrder}, t.id DESC`;
            baseQuery += ` LIMIT ${parsedLimit} OFFSET ${parsedOffset}`;
            
            console.log('🔍 Base Query:', baseQuery);
            console.log('🔍 Query Parameters:', queryParams);
            
            // Execute queries in parallel
            const [transactionsResult, countResult] = await Promise.all([
                pool.execute(baseQuery, queryParams),
                pool.execute(countQuery, countParams)
            ]);
            
            const [transactions] = transactionsResult;
            const [countRows] = countResult;
            const total = countRows[0]?.total || 0;
            
            console.log('✅ Found transactions:', transactions.length);
            console.log('✅ Total transactions:', total);
            
            // Format transactions
            const formattedTransactions = transactions.map(txn => ({
                id: txn.id,
                transaction_type: txn.transaction_type,
                category: txn.category_id ? {
                    id: txn.category_id,
                    name: txn.category_name || 'Uncategorized',
                    color: txn.category_color,
                    icon: txn.category_icon
                } : null,
                merchant_name: txn.merchant_name,
                description: txn.description,
                items: txn.items,
                amount: parseFloat(txn.amount || 0),
                currency: txn.currency,
                payment_method: txn.payment_method,
                transaction_date: txn.transaction_date,
                transaction_time: txn.transaction_time,
                status: txn.status,
                reference_number: txn.reference_number,
                external_transaction_id: txn.external_transaction_id,
                location_data: txn.location_data,
                metadata: txn.metadata,
                account: {
                    name: txn.account_name || 'Unknown Account',
                    type: txn.account_type,
                    bank: txn.bank_name || 'Unknown Bank',
                    masked_number: txn.masked_account_number
                },
                created_at: txn.created_at,
                updated_at: txn.updated_at
            }));
            
            // Calculate pagination metadata
            const totalPages = Math.ceil(total / parsedLimit);
            const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;
            const hasMore = (parsedOffset + parsedLimit) < total;
            
            return {
                transactions: formattedTransactions,
                pagination: {
                    total,
                    limit: parsedLimit,
                    offset: parsedOffset,
                    has_more: hasMore,
                    current_page: currentPage,
                    total_pages: totalPages
                }
            };
            
        } catch (error) {
            console.error('Error getting transactions with pagination:', error);
            throw error;
        }
    },

    /**
     * Get transaction statistics for a user
     * @param {Object} pool - Database connection pool
     * @param {number} userId - User ID
     * @param {Object} filters - Optional filters
     * @returns {Object} Transaction statistics
     */
    getTransactionStats: async (pool, userId, filters = {}) => {
        try {
            console.log('🔄 getTransactionStats called with:', { userId, filters });

            // Check if transactions table exists
            const [tables] = await pool.query("SHOW TABLES LIKE 'transactions'");
            if (tables.length === 0) {
                console.log('⚠️ Transactions table does not exist, returning empty stats');
                return {
                    total_transactions: 0,
                    total_income: 0,
                    total_expenses: 0,
                    net_amount: 0,
                    pending_count: 0,
                    completed_count: 0,
                    failed_count: 0,
                    this_month_transactions: 0,
                    this_month_income: 0,
                    this_month_expenses: 0,
                    avg_transaction_amount: 0,
                    largest_transaction: 0,
                    categories_count: 0
                };
            }

            // Build base query with filters
            let baseQuery = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN transaction_type = 'income' OR amount > 0 THEN ABS(amount) ELSE 0 END) as total_income,
                    SUM(CASE WHEN transaction_type = 'expense' OR amount < 0 THEN ABS(amount) ELSE 0 END) as total_expenses,
                    SUM(amount) as net_amount,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                    AVG(ABS(amount)) as avg_transaction_amount,
                    MAX(ABS(amount)) as largest_transaction
                FROM transactions t
                LEFT JOIN financial_accounts fa ON t.account_id = fa.id
                WHERE t.user_id = ?
            `;
            
            let monthQuery = `
                SELECT 
                    COUNT(*) as this_month_transactions,
                    SUM(CASE WHEN transaction_type = 'income' OR amount > 0 THEN ABS(amount) ELSE 0 END) as this_month_income,
                    SUM(CASE WHEN transaction_type = 'expense' OR amount < 0 THEN ABS(amount) ELSE 0 END) as this_month_expenses
                FROM transactions t
                LEFT JOIN financial_accounts fa ON t.account_id = fa.id
                WHERE t.user_id = ? 
                AND YEAR(t.transaction_date) = YEAR(CURRENT_DATE)
                AND MONTH(t.transaction_date) = MONTH(CURRENT_DATE)
            `;

            let categoryQuery = `
                SELECT COUNT(DISTINCT t.category_id) as categories_count
                FROM transactions t
                WHERE t.user_id = ? AND t.category_id IS NOT NULL
            `;

            const queryParams = [userId];
            const monthParams = [userId];
            const categoryParams = [userId];

            // Apply filters to all queries
            if (filters.dateFrom) {
                baseQuery += ' AND t.transaction_date >= ?';
                queryParams.push(filters.dateFrom);
            }

            if (filters.dateTo) {
                baseQuery += ' AND t.transaction_date <= ?';
                queryParams.push(filters.dateTo);
            }

            if (filters.accountId) {
                baseQuery += ' AND t.account_id = ?';
                queryParams.push(filters.accountId);
            }

            if (filters.transactionType && filters.transactionType.length > 0) {
                const placeholders = filters.transactionType.map(() => '?').join(', ');
                baseQuery += ` AND t.transaction_type IN (${placeholders})`;
                queryParams.push(...filters.transactionType);
            }

            if (filters.categoryId && filters.categoryId.length > 0) {
                const placeholders = filters.categoryId.map(() => '?').join(', ');
                baseQuery += ` AND t.category_id IN (${placeholders})`;
                queryParams.push(...filters.categoryId);
            }

            if (filters.paymentMethod && filters.paymentMethod.length > 0) {
                const placeholders = filters.paymentMethod.map(() => '?').join(', ');
                baseQuery += ` AND t.payment_method IN (${placeholders})`;
                queryParams.push(...filters.paymentMethod);
            }

            if (filters.status && filters.status.length > 0) {
                const placeholders = filters.status.map(() => '?').join(', ');
                baseQuery += ` AND t.status IN (${placeholders})`;
                queryParams.push(...filters.status);
            }

            // Apply same filters to category query
            if (filters.dateFrom) {
                categoryQuery += ' AND t.transaction_date >= ?';
                categoryParams.push(filters.dateFrom);
            }

            if (filters.dateTo) {
                categoryQuery += ' AND t.transaction_date <= ?';
                categoryParams.push(filters.dateTo);
            }

            if (filters.accountId) {
                categoryQuery += ' AND t.account_id = ?';
                categoryParams.push(filters.accountId);
            }

            if (filters.transactionType && filters.transactionType.length > 0) {
                const placeholders = filters.transactionType.map(() => '?').join(', ');
                categoryQuery += ` AND t.transaction_type IN (${placeholders})`;
                categoryParams.push(...filters.transactionType);
            }

            if (filters.categoryId && filters.categoryId.length > 0) {
                const placeholders = filters.categoryId.map(() => '?').join(', ');
                categoryQuery += ` AND t.category_id IN (${placeholders})`;
                categoryParams.push(...filters.categoryId);
            }

            if (filters.paymentMethod && filters.paymentMethod.length > 0) {
                const placeholders = filters.paymentMethod.map(() => '?').join(', ');
                categoryQuery += ` AND t.payment_method IN (${placeholders})`;
                categoryParams.push(...filters.paymentMethod);
            }

            if (filters.status && filters.status.length > 0) {
                const placeholders = filters.status.map(() => '?').join(', ');
                categoryQuery += ` AND t.status IN (${placeholders})`;
                categoryParams.push(...filters.status);
            }

            console.log('🔍 Stats Query:', baseQuery);
            console.log('🔍 Stats Parameters:', queryParams);

            // Execute queries in parallel
            const [statsResult, monthResult, categoryResult] = await Promise.all([
                pool.execute(baseQuery, queryParams),
                pool.execute(monthQuery, monthParams),
                pool.execute(categoryQuery, categoryParams)
            ]);

            const [statsRows] = statsResult;
            const [monthRows] = monthResult;
            const [categoryRows] = categoryResult;

            const stats = statsRows[0] || {};
            const monthStats = monthRows[0] || {};
            const categoryStats = categoryRows[0] || {};

            console.log('✅ Transaction statistics retrieved successfully');

            return {
                total_transactions: parseInt(stats.total_transactions || 0),
                total_income: parseFloat(stats.total_income || 0),
                total_expenses: parseFloat(stats.total_expenses || 0),
                net_amount: parseFloat(stats.net_amount || 0),
                pending_count: parseInt(stats.pending_count || 0),
                completed_count: parseInt(stats.completed_count || 0),
                failed_count: parseInt(stats.failed_count || 0),
                this_month_transactions: parseInt(monthStats.this_month_transactions || 0),
                this_month_income: parseFloat(monthStats.this_month_income || 0),
                this_month_expenses: parseFloat(monthStats.this_month_expenses || 0),
                avg_transaction_amount: parseFloat(stats.avg_transaction_amount || 0),
                largest_transaction: parseFloat(stats.largest_transaction || 0),
                categories_count: parseInt(categoryStats.categories_count || 0)
            };

        } catch (error) {
            console.error('Error getting transaction statistics:', error);
            throw error;
        }
    },

    // ...existing methods...
};

export default Financial;