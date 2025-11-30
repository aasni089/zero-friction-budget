const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /dashboard/monthly:
 *   get:
 *     summary: Get monthly summary with trends, category breakdown, and member contributions
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *         description: Household ID
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}$'
 *         description: Month in YYYY-MM format (defaults to current month)
 *     responses:
 *       200:
 *         description: Monthly summary with detailed breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         month:
 *                           type: number
 *                         year:
 *                           type: number
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                         daysElapsed:
 *                           type: number
 *                         totalDays:
 *                           type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalExpenses:
 *                           type: number
 *                         totalIncome:
 *                           type: number
 *                         net:
 *                           type: number
 *                         totalBudgetAmount:
 *                           type: number
 *                         budgetSpent:
 *                           type: number
 *                         budgetRemaining:
 *                           type: number
 *                         budgetUsagePercentage:
 *                           type: number
 *                     categoryBreakdown:
 *                       type: object
 *                     memberContributions:
 *                       type: array
 *                     trends:
 *                       type: object
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a member of household
 */
router.get('/monthly', authenticateToken, dashboardController.getMonthlySummary);

/**
 * @swagger
 * /dashboard/household/{id}:
 *   get:
 *     summary: Get household overview with stats and recent activity
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Household ID
 *     responses:
 *       200:
 *         description: Household overview with stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     household:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         memberCount:
 *                           type: number
 *                         members:
 *                           type: array
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalBudgets:
 *                           type: number
 *                         totalExpenses:
 *                           type: number
 *                         totalCategories:
 *                           type: number
 *                     recentActivity:
 *                       type: array
 *                     currentMonthSummary:
 *                       type: object
 *       403:
 *         description: Not a member of household
 *       404:
 *         description: Household not found
 */
router.get('/household/:id', authenticateToken, dashboardController.getHouseholdOverview);

/**
 * @swagger
 * /dashboard/budget-health:
 *   get:
 *     summary: Get budget health indicators for all active budgets
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *         description: Household ID
 *     responses:
 *       200:
 *         description: Budget health data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     budgets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           spent:
 *                             type: number
 *                           remaining:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                           healthStatus:
 *                             type: string
 *                             enum: [ON_TRACK, WARNING, OVER_BUDGET]
 *                           daysRemaining:
 *                             type: number
 *                           projectedSpending:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         onTrack:
 *                           type: number
 *                         warning:
 *                           type: number
 *                         overBudget:
 *                           type: number
 *                     grouped:
 *                       type: object
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a member of household
 */
router.get('/budget-health', authenticateToken, dashboardController.getBudgetHealth);

module.exports = router;
