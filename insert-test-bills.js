// insert-test-bills.js
// Simple script to insert test bills data

import { pool } from './configs/db.config.js';

async function insertTestBills() {
  try {
    console.log('Connecting to database...');
    
    // Check if bills table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'bills'");
    if (tables.length === 0) {
      console.error('Bills table does not exist. Please create the table first.');
      process.exit(1);
    }
    
    console.log('Bills table exists, proceeding with data insertion...');
    
    // Delete existing test bills if any
    await pool.query("DELETE FROM bills WHERE company_name LIKE 'Test%'");
    
    // Insert 5 test bills for user ID 1
    const currentDate = new Date();
    const nextDueDate = new Date();
    nextDueDate.setDate(currentDate.getDate() + 15); // 15 days from now
    
    const lastPaidDate = new Date();
    lastPaidDate.setDate(currentDate.getDate() - 15); // 15 days ago
    
    const insertQuery = `
      INSERT INTO bills 
      (user_id, company_name, service_name, plan_name, description, amount, currency, billing_frequency, next_due_date, last_paid_date, status, company_logo_url) 
      VALUES ?
    `;
    
    const values = [
      [1, 'Test Netflix', 'Streaming Service', 'Premium Plan', 'Monthly streaming subscription', 19.99, 'USD', 'monthly', nextDueDate, lastPaidDate, 'upcoming', 'netflix'],
      [1, 'Test Spotify', 'Music Streaming', 'Family Plan', 'Music streaming service', 14.99, 'USD', 'monthly', nextDueDate, lastPaidDate, 'upcoming', 'spotify'],
      [1, 'Test Adobe', 'Creative Cloud', 'All Apps', 'Creative software subscription', 52.99, 'USD', 'monthly', nextDueDate, lastPaidDate, 'upcoming', 'adobe'],
      [1, 'Test Figma', 'Design Tool', 'Professional', 'Design platform subscription', 15.00, 'USD', 'monthly', nextDueDate, lastPaidDate, 'upcoming', 'figma'],
      [1, 'Test GitHub', 'Code Repository', 'Team Plan', 'Code hosting platform', 4.00, 'USD', 'monthly', nextDueDate, lastPaidDate, 'upcoming', 'github'],
      // Add an overdue bill
      [1, 'Test Electricity', 'Utilities', 'Standard Service', 'Monthly electricity bill', 85.00, 'USD', 'monthly', 
        new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        new Date(currentDate.getTime() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        'overdue', 'default'],
      // Add a paid bill
      [1, 'Test Water', 'Utilities', 'Standard Service', 'Monthly water bill', 45.00, 'USD', 'monthly', 
        new Date(currentDate.getTime() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        'paid', 'default']
    ];
    
    await pool.query(insertQuery, [values]);
    
    console.log('Successfully inserted 7 test bills!');
    
    // Verify insertion
    const [results] = await pool.query("SELECT * FROM bills WHERE company_name LIKE 'Test%'");
    console.log(`Verification: Found ${results.length} test bills in the database.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error inserting test bills:', error);
    process.exit(1);
  }
}

insertTestBills();
