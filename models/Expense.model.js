// Expense.model.js - Database operations for expenses
import { pool } from '../configs/db.config.js';

class Expense {
  // Create a new expense
  async createExpense({ userId, description, amount, date, categoryId, paymentMethod, note }) {
    try {
      const insertQuery = `
        INSERT INTO transactions (user_id, description, amount, transaction_date, category_id, payment_method, note, transaction_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'expense')
      `;
      const [result] = await pool.query(insertQuery, [userId, description, amount, date, categoryId, paymentMethod, note || '']);
      return {
        id: result.insertId,
        userId,
        description,
        amount,
        date,
        categoryId,
        paymentMethod,
        note
      };
    } catch (error) {
      console.error('Error inserting expense:', error);
      throw error;
    }
  }

  // Get expense categories with items for a user
  async getExpenseCategories(userId, filters = {}) {
    try {
      const conditions = ['t.user_id = ?'];
      const queryParams = [userId];
      const dateConditions = [];

      // Handle date filters
      if (filters.startDate) {
        dateConditions.push('transaction_date >= ?');
        queryParams.push(filters.startDate);
      }
      if (filters.endDate) {
        dateConditions.push('transaction_date <= ?');
        queryParams.push(filters.endDate);
      }

      // Handle amount range
      if (filters.minAmount !== undefined) {
        conditions.push('t.amount >= ?');
        queryParams.push(filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        conditions.push('t.amount <= ?');
        queryParams.push(filters.maxAmount);
      }

      // Handle payment method
      if (filters.payment) {
        conditions.push('t.payment_method = ?');
        queryParams.push(filters.payment);
      }

      // Handle search
      if (filters.search) {
        conditions.push('(t.description LIKE ? OR tc.name LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm);
      }

      // Handle category filter
      if (filters.category) {
        conditions.push('tc.slug = ?');
        queryParams.push(filters.category);
      }

      // Create the date condition part for both main query and subquery
      const dateConditionSQL = dateConditions.length > 0 ? ` AND ${dateConditions.join(' AND ')}` : '';

      // Query for expense categories with their total amounts
      const categoriesQuery = `
        WITH total_expenses AS (
          SELECT SUM(amount) as total_amount
          FROM transactions
          WHERE user_id = ?
            AND transaction_type = 'expense'
            ${dateConditionSQL}
        )
        SELECT 
          tc.id,
          tc.name,
          tc.slug as category_id,
          COUNT(t.id) as count,
          COALESCE(SUM(t.amount), 0) as total_amount,
          CASE 
            WHEN te.total_amount > 0 
            THEN ROUND((COALESCE(SUM(t.amount), 0) / te.total_amount * 100), 2)
            ELSE 0 
          END as percentage
        FROM transaction_categories tc
        LEFT JOIN transactions t ON tc.id = t.category_id 
          AND t.transaction_type = 'expense'
          AND t.user_id = ?
          ${dateConditionSQL}
        CROSS JOIN total_expenses te
        GROUP BY tc.id, tc.name, tc.slug, te.total_amount
        ORDER BY total_amount DESC
        ${filters.limit ? 'LIMIT ?' : ''}
      `;

      // Add parameters: userId for total_expenses, userId for main query, 
      // date params twice (for both queries), and limit if specified
      const allParams = [
        userId, // For total_expenses subquery
        ...queryParams.slice(1), // Date params for total_expenses
        userId, // For main query
        ...queryParams.slice(1), // Date params for main query
      ];

      if (filters.limit) {
        allParams.push(filters.limit);
      }

      const [categories] = await pool.query(categoriesQuery, allParams);
      
      return categories.map(cat => ({
        id: cat.category_id,
        name: cat.name,
        amount: parseFloat(cat.total_amount || 0),
        count: parseInt(cat.count || 0),
        percentage: parseFloat(cat.percentage || 0)
      }));
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      throw error;
    }
  }

  // Helper method to get Tailwind color class
  getColorClass(hexColor) {
    if (!hexColor) return 'bg-blue-100 text-blue-600';
    const color = hexColor.replace('#', '');
    const colorMap = {
      'ff': 'red',
      'f0': 'orange',
      'ee': 'yellow',
      'cc': 'green',
      'aa': 'blue',
      '99': 'indigo',
      '88': 'purple',
      '77': 'pink',
      '66': 'gray'
    };
    
    let matchedColor = 'blue';
    for (const [hex, colorName] of Object.entries(colorMap)) {
      if (color.startsWith(hex)) {
        matchedColor = colorName;
        break;
      }
    }
    
    return `bg-${matchedColor}-100 text-${matchedColor}-600`;
  }
  
  // Get expense analytics data for chart
  async getExpenseChartData(userId, filters = {}) {
    try {
      const period = filters.period || 'monthly';
      
      // Build WHERE conditions for dates and status
      const conditions = [
        't.user_id = ?',
        't.transaction_type = ?',
        't.status = ?'
      ];
      const queryParams = [userId, 'expense', 'completed'];

      if (filters.startDate) {
        conditions.push('t.transaction_date >= ?');
        queryParams.push(filters.startDate);
      }
      if (filters.endDate) {
        conditions.push('t.transaction_date <= ?');
        queryParams.push(filters.endDate);
      }

      let dateFormat, groupBy;
      switch (period) {
        case 'weekly':
          dateFormat = '%Y-W%u';
          groupBy = 'YEARWEEK(t.transaction_date, 1)';
          break;
        case 'yearly':
          dateFormat = '%Y';
          groupBy = 'YEAR(t.transaction_date)';
          break;
        case 'monthly':
        default:
          dateFormat = '%b %Y';
          groupBy = 'DATE_FORMAT(t.transaction_date, "%Y-%m")';
      }

      const chartQuery = `
        SELECT 
          DATE_FORMAT(t.transaction_date, ?) as month,
          ${groupBy} as periodGroup,
          COALESCE(SUM(
            CASE WHEN t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
            THEN ABS(t.amount) END
          ), 0) as thisWeek,
          COALESCE(SUM(
            CASE WHEN t.transaction_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 2 MONTH) 
              AND DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
            THEN ABS(t.amount) END
          ), 0) as lastWeek
        FROM transactions t
        WHERE ${conditions.join(' AND ')}
        GROUP BY ${groupBy}, month
        ORDER BY periodGroup ASC
        LIMIT 12
      `;

      queryParams.unshift(dateFormat); // Add dateFormat as first parameter
      const [chartData] = await pool.query(chartQuery, queryParams);
      
      // Ensure the response matches the ChartData interface
      return chartData.map(row => ({
        month: row.month, // Already formatted by MySQL DATE_FORMAT
        thisWeek: Number(row.thisWeek || 0),
        lastWeek: Number(row.lastWeek || 0)
      }));
    } catch (error) {
      console.error('Error fetching expense chart data:', error);
      throw error;
    }
  }
  
  // Get expense summary statistics
  async getExpenseSummary(userId) {
    try {
      const queries = {
        thisMonth: `
          SELECT COALESCE(SUM(ABS(amount)), 0) as totalExpenses
          FROM transactions
          WHERE user_id = ?
            AND transaction_type = 'expense'
            AND transaction_date BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01')
            AND LAST_DAY(CURDATE())
        `,
        lastMonth: `
          SELECT COALESCE(SUM(ABS(amount)), 0) as lastMonthExpenses
          FROM transactions
          WHERE user_id = ?
            AND transaction_type = 'expense'
            AND transaction_date BETWEEN 
              DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
            AND LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        `,
        categories: `
          SELECT COUNT(DISTINCT category_id) as categoryCount
          FROM transactions
          WHERE user_id = ?
            AND transaction_type = 'expense'
            AND transaction_date BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01')
            AND LAST_DAY(CURDATE())
        `
      };

      const [totalResult, lastMonthResult, categoryResult] = await Promise.all([
        pool.query(queries.thisMonth, [userId]),
        pool.query(queries.lastMonth, [userId]),
        pool.query(queries.categories, [userId])
      ]);

      const totalExpenses = totalResult[0][0].totalExpenses;
      const lastMonthExpenses = lastMonthResult[0][0].lastMonthExpenses;
      const categoryCount = categoryResult[0][0].categoryCount;

      // Calculate monthly change percentage
      let monthlyIncrease = 0;
      if (lastMonthExpenses > 0) {
        monthlyIncrease = ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
      }

      const averagePerCategory = categoryCount > 0 ? totalExpenses / categoryCount : 0;

      return {
        totalExpenses,
        monthlyIncrease: parseFloat(monthlyIncrease.toFixed(1)),
        categoryCount,
        averagePerCategory: parseFloat(averagePerCategory.toFixed(2))
      };
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      throw error;
    }
  }
}

export default new Expense();
