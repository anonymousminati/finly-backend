import express from 'express';
import { corsMiddleware } from './configs/cors.config.js';
import { pool } from './configs/db.config.js';
import dotenv from 'dotenv';
import UserRoute from './routes/users.route.js';
import FinancialRoute from './routes/financial.route.js';
import AccountRoute from './routes/account.route.js';
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