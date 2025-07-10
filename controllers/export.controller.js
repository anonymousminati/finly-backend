// Function to format expenses for CSV export
function formatForCsv(expense) {
  const fields = [
    expense.transaction_date,
    expense.description,
    expense.amount,
    expense.category_name || '',
    expense.payment_method,
    expense.status
  ];
  return fields.map(field => 
    `"${String(field).replace(/"/g, '""')}"`
  ).join(',');
}

export async function exportExpenses(req, res) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Add filters similar to other expense endpoints
    const filters = {};
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    if (req.query.category) filters.category = req.query.category;

    // Get expenses from database
    const expensesQuery = `
      SELECT 
        t.transaction_date,
        t.description,
        ABS(t.amount) as amount,
        tc.name as category_name,
        t.payment_method,
        t.status
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      WHERE t.user_id = ?
        AND t.transaction_type = 'expense'
        AND t.status = 'completed'
        ${filters.startDate ? 'AND t.transaction_date >= ?' : ''}
        ${filters.endDate ? 'AND t.transaction_date <= ?' : ''}
        ${filters.category ? 'AND tc.id = ?' : ''}
      ORDER BY t.transaction_date DESC
    `;

    const queryParams = [userId];
    if (filters.startDate) queryParams.push(filters.startDate);
    if (filters.endDate) queryParams.push(filters.endDate);
    if (filters.category) queryParams.push(filters.category);

    const [expenses] = await pool.query(expensesQuery, queryParams);

    // Create CSV content with headers
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Payment Method', 'Status'];
    const csvContent = [
      headers.join(','),
      ...expenses.map(expense => formatForCsv(expense))
    ].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting expenses:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export expenses' 
    });
  }
}

export default {
  exportExpenses
};
