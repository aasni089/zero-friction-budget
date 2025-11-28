// routes/admin/index.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const syncRoutes = require('./sync');

// Include sync routes
router.use('/sync', syncRoutes);

// Example admin dashboard route
router.get('/dashboard', 
  authenticateToken, 
  requireAdmin, 
  (req, res) => {
    res.json({ message: 'Admin dashboard' });
  }
);

module.exports = router;