// Create a new expense
const createExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { description, amount, date, categoryId, paymentMethod, note } = req.body;
    if (!description || !amount || !date || !categoryId || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const newExpense = await ExpenseModel.createExpense({
      userId,
      description,
      amount,
      date,
      categoryId,
      paymentMethod,
      note: note || ''
    });
    return res.status(201).json({ success: true, data: newExpense });
  } catch (error) {
    console.error('Error creating expense:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating expense', error: error.message });
  }
};
// expenses.controller.js - API controllers for expenses
import ExpenseModel from '../models/Expense.model.js';

// Get expense categories with transactions
const getExpenseCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Parse and validate filters from query parameters
    const filters = {
      startDate: req.query.startDate && req.query.startDate !== '' ? req.query.startDate : null,
      endDate: req.query.endDate && req.query.endDate !== '' ? req.query.endDate : null,
      category: req.query.category && req.query.category !== '' ? req.query.category : null,
      search: req.query.search && req.query.search !== '' ? req.query.search : null,
      limit: req.query.limit ? parseInt(req.query.limit) : 10
    };
    
    const categories = await ExpenseModel.getExpenseCategories(userId, filters);
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching expense categories',
      error: error.message 
    });
  }
};

// Get expense chart data
const getExpenseChartData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Parse and validate filters
    const filters = {
      period: req.query.period || 'monthly',
      startDate: req.query.startDate && req.query.startDate !== '' ? req.query.startDate : null,
      endDate: req.query.endDate && req.query.endDate !== '' ? req.query.endDate : null,
      category: req.query.category && req.query.category !== '' ? req.query.category : null
    };
    
    const chartData = await ExpenseModel.getExpenseChartData(userId, filters);
    return res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Error fetching expense chart data:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching expense chart data',
      error: error.message 
    });
  }
};

// Get expense summary
const getExpenseSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await ExpenseModel.getExpenseSummary(userId);
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching expense summary',
      error: error.message 
    });
  }
};

export default {
  getExpenseCategories,
  getExpenseChartData,
  getExpenseSummary
  ,createExpense
};
