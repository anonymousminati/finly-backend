import express from 'express';
import exportController from '../controllers/export.controller.js';

const router = express.Router();

// Export expenses route
router.get('/expenses/export', exportController.exportExpenses);

export default router;
