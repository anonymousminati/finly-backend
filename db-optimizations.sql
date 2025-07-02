-- ============================================================================
-- DATABASE OPTIMIZATIONS FOR FINANCIAL SUMMARY API
-- Performance indexes and optimizations for financial data queries
-- ============================================================================

-- Add indexes for optimal performance on financial summary queries

-- 1. Optimize users table for UUID and ID lookups
ALTER TABLE users 
ADD INDEX idx_users_uuid (uuid),
ADD INDEX idx_users_id_status (id, status);

-- 2. Optimize financial_accounts table for user-based queries
ALTER TABLE financial_accounts 
ADD INDEX idx_accounts_user_active (user_id, is_active),
ADD INDEX idx_accounts_user_type_active (user_id, account_type, is_active),
ADD INDEX idx_accounts_user_primary (user_id, is_primary);

-- 3. Optimize transactions table for financial summary queries
ALTER TABLE transactions 
ADD INDEX idx_transactions_user_status_date (user_id, status, transaction_date),
ADD INDEX idx_transactions_account_status_date (account_id, status, transaction_date),
ADD INDEX idx_transactions_user_type_status (user_id, transaction_type, status),
ADD INDEX idx_transactions_category_account (category_id, account_id),
ADD INDEX idx_transactions_date_created (transaction_date, created_at);

-- 4. Optimize transaction_categories for category summaries
ALTER TABLE transaction_categories 
ADD INDEX idx_categories_user_active (user_id, is_active),
ADD INDEX idx_categories_system_active (is_system_category, is_active);

-- 5. Create composite indexes for common query patterns
ALTER TABLE transactions 
ADD INDEX idx_transactions_summary_query (user_id, status, transaction_date, transaction_type, amount),
ADD INDEX idx_transactions_account_summary (account_id, status, transaction_date, category_id);

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- 1. Create materialized view for account balances (if using MySQL 8.0+)
-- Note: MySQL doesn't support materialized views natively, but we can create a summary table

CREATE TABLE account_balance_summary (
    account_id BIGINT UNSIGNED PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    available_balance DECIMAL(15,2) DEFAULT 0.00,
    credit_limit DECIMAL(15,2) NULL,
    last_transaction_date DATE,
    transaction_count_30d INT DEFAULT 0,
    transaction_count_90d INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_balance_summary_user (user_id),
    INDEX idx_balance_summary_updated (updated_at)
);

-- 2. Create transaction summary cache table
CREATE TABLE user_transaction_summary_cache (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    cache_date DATE NOT NULL,
    total_transactions INT DEFAULT 0,
    total_income DECIMAL(15,2) DEFAULT 0.00,
    total_expenses DECIMAL(15,2) DEFAULT 0.00,
    average_transaction DECIMAL(15,2) DEFAULT 0.00,
    last_transaction_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY idx_user_cache_date (user_id, cache_date),
    INDEX idx_cache_updated (updated_at)
);

-- ============================================================================
-- STORED PROCEDURES FOR BETTER PERFORMANCE
-- ============================================================================

DELIMITER //

-- Stored procedure to get financial summary with optimized queries
CREATE PROCEDURE GetUserFinancialSummary(
    IN p_user_id BIGINT,
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Temporary table for date-filtered transactions
    CREATE TEMPORARY TABLE temp_user_transactions AS
    SELECT 
        t.id,
        t.account_id,
        t.transaction_type,
        t.category_id,
        t.amount,
        t.description,
        t.transaction_date,
        t.status
    FROM transactions t
    WHERE t.user_id = p_user_id 
        AND t.status = 'completed'
        AND (p_from_date IS NULL OR t.transaction_date >= p_from_date)
        AND (p_to_date IS NULL OR t.transaction_date <= p_to_date);

    -- Add indexes to temporary table
    ALTER TABLE temp_user_transactions 
    ADD INDEX idx_temp_account (account_id),
    ADD INDEX idx_temp_category (category_id),
    ADD INDEX idx_temp_type (transaction_type);

    -- Return accounts with transaction counts
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
        COALESCE(txn_count.transaction_count, 0) as transactions_count
    FROM financial_accounts fa
    LEFT JOIN (
        SELECT account_id, COUNT(*) as transaction_count
        FROM temp_user_transactions
        GROUP BY account_id
    ) txn_count ON fa.id = txn_count.account_id
    WHERE fa.user_id = p_user_id AND fa.is_active = 1
    ORDER BY fa.is_primary DESC, fa.current_balance DESC;

    -- Return transaction summary
    SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expenses,
        AVG(amount) as average_transaction
    FROM temp_user_transactions;

    -- Return recent transactions
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
    FROM temp_user_transactions t
    LEFT JOIN transaction_categories tc ON t.category_id = tc.id
    ORDER BY t.transaction_date DESC, t.id DESC
    LIMIT 5;

    -- Clean up
    DROP TEMPORARY TABLE temp_user_transactions;

    COMMIT;
END //

-- Stored procedure to update account balance summary
CREATE PROCEDURE UpdateAccountBalanceSummary(IN p_account_id BIGINT)
BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_current_balance DECIMAL(15,2);
    DECLARE v_available_balance DECIMAL(15,2);
    DECLARE v_credit_limit DECIMAL(15,2);
    DECLARE v_last_transaction_date DATE;
    DECLARE v_count_30d INT DEFAULT 0;
    DECLARE v_count_90d INT DEFAULT 0;

    -- Get account details
    SELECT user_id, current_balance, available_balance, credit_limit
    INTO v_user_id, v_current_balance, v_available_balance, v_credit_limit
    FROM financial_accounts
    WHERE id = p_account_id;

    -- Get transaction counts and last transaction date
    SELECT 
        MAX(transaction_date),
        SUM(CASE WHEN transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END),
        SUM(CASE WHEN transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) THEN 1 ELSE 0 END)
    INTO v_last_transaction_date, v_count_30d, v_count_90d
    FROM transactions
    WHERE account_id = p_account_id AND status = 'completed';

    -- Insert or update summary
    INSERT INTO account_balance_summary (
        account_id, user_id, current_balance, available_balance, credit_limit,
        last_transaction_date, transaction_count_30d, transaction_count_90d
    ) VALUES (
        p_account_id, v_user_id, v_current_balance, v_available_balance, v_credit_limit,
        v_last_transaction_date, v_count_30d, v_count_90d
    ) ON DUPLICATE KEY UPDATE
        current_balance = v_current_balance,
        available_balance = v_available_balance,
        credit_limit = v_credit_limit,
        last_transaction_date = v_last_transaction_date,
        transaction_count_30d = v_count_30d,
        transaction_count_90d = v_count_90d;
END //

DELIMITER ;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC CACHE UPDATES
-- ============================================================================

-- Trigger to update account balance summary when transactions change
DELIMITER //

CREATE TRIGGER tr_transactions_after_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        CALL UpdateAccountBalanceSummary(NEW.account_id);
    END IF;
END //

CREATE TRIGGER tr_transactions_after_update
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status AND NEW.status = 'completed' THEN
        CALL UpdateAccountBalanceSummary(NEW.account_id);
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Query to check index usage
-- Run this periodically to ensure indexes are being used
/*
SHOW INDEX FROM financial_accounts;
SHOW INDEX FROM transactions;
SHOW INDEX FROM users;

-- Check query performance
EXPLAIN ANALYZE
SELECT 
    fa.id, fa.account_name, fa.current_balance,
    COUNT(t.id) as transaction_count
FROM financial_accounts fa
LEFT JOIN transactions t ON fa.id = t.account_id AND t.status = 'completed'
WHERE fa.user_id = 1 AND fa.is_active = 1
GROUP BY fa.id;
*/

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

-- Query to clean up old session tokens (run as scheduled job)
/*
DELETE FROM user_sessions 
WHERE expires_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Update account balance summaries (run daily)
INSERT INTO account_balance_summary (account_id, user_id, current_balance, available_balance, credit_limit)
SELECT id, user_id, current_balance, available_balance, credit_limit
FROM financial_accounts 
WHERE is_active = 1
ON DUPLICATE KEY UPDATE
    current_balance = VALUES(current_balance),
    available_balance = VALUES(available_balance),
    credit_limit = VALUES(credit_limit);
*/
