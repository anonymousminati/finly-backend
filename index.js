import express from 'express';
import { corsMiddleware } from './configs/cors.config.js';
import { pool } from './configs/db.config.js';
import dotenv from 'dotenv';
import UserRoute from './routes/users.route.js';
import FinancialRoute from './routes/financial.route.js';
import AccountRoute from './routes/account.route.js';
import TestRoute from './routes/test.route.js';
dotenv.config();

const app = express();

// Apply CORS middleware
app.use(corsMiddleware);

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/users', UserRoute);
app.use('/api/financial', FinancialRoute);
app.use('/api/accounts', AccountRoute);
app.use('/api/bills', (await import('./routes/bills.route.js')).default);
app.use('/api/test', TestRoute);

// Debug endpoint to check for bills in the database
app.get('/api/debug/bills', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM bills');
    const [sampleBills] = await pool.query('SELECT * FROM bills LIMIT 5');
    res.status(200).json({
      billsCount: rows[0].count,
      sampleBills: sampleBills
    });
  } catch (error) {
    console.error('Error checking bills table:', error.message);
    res.status(500).json({
      error: 'Error checking bills table',
      message: error.message
    });
  }
});

// Debug endpoint to check for bills for specific user
app.get('/api/debug/user-bills/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM bills WHERE user_id = ?', [userId]);
    const [userBills] = await pool.query('SELECT * FROM bills WHERE user_id = ? LIMIT 10', [userId]);
    res.status(200).json({
      userId: userId,
      billsCount: countRows[0].count,
      bills: userBills
    });
  } catch (error) {
    console.error(`Error checking bills for user ${req.params.userId}:`, error.message);
    res.status(500).json({
      error: `Error checking bills for user ${req.params.userId}`,
      message: error.message
    });
  }
});

// Debug endpoint to check bills table schema
app.get('/api/debug/bill-schema', async (req, res) => {
  try {
    const [fields] = await pool.query('DESCRIBE bills');
    res.status(200).json({
      tableExists: fields.length > 0,
      fields: fields
    });
  } catch (error) {
    console.error('Error checking bills table schema:', error.message);
    res.status(500).json({
      error: 'Error checking bills table schema',
      message: error.message
    });
  }
});

// Test database connection on startup
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connection successful');
        connection.release();
    } catch (error) {
        console.error('❌ Failed to connect to database:', error.message);
        process.exit(1);
    }
}

app.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        res.status(200).json({
            message: "Welcome to Finly Backend",
            status: "Connected to database",
            tables: rows
        });
    } catch (error) {
        console.error('Database query error:', error.message);
        res.status(500).json({
            message: "Database connection error",
            error: error.message
        });
    }
});

// Add a simple test endpoint that doesn't require authentication
app.get('/api/test', (req, res) => {
    res.status(200).json({
        message: "Backend is working!",
        timestamp: new Date().toISOString(),
        status: "OK"
    });
});

const PORT = process.env.PORT || 3001;

// Initialize database connection and start server
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port: ${PORT}`);
    });
}

startServer();