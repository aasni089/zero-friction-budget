const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /budgets:
 *   post:
 *     summary: Create budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - householdId
 *               - name
 *               - amount
 *               - period
 *               - startDate
 *             properties:
 *               householdId:
 *                 type: string
 *               name:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               period:
 *                 type: string
 *                 enum: [WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               categoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Budget created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized (Owner/Admin only)
 */
router.post('/', authenticateToken, budgetController.createBudget);

/**
 * @swagger
 * /budgets:
 *   get:
 *     summary: List budgets with progress
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: householdId
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM]
 *     responses:
 *       200:
 *         description: List of budgets with progress
 *       403:
 *         description: Not a member of household
 */
router.get('/', authenticateToken, budgetController.listBudgets);

/**
 * @swagger
 * /budgets/primary:
 *   get:
 *     summary: Get the primary budget for a household
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Primary budget with line items and progress
 *       400:
 *         description: householdId is required
 *       403:
 *         description: Not a member of household
 */
router.get('/primary', authenticateToken, budgetController.getPrimaryBudget);

/**
 * @swagger
 * /budgets/{id}:
 *   get:
 *     summary: Get budget details with progress
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget details with progress
 *       403:
 *         description: Not a member of household
 *       404:
 *         description: Budget not found
 */
router.get('/:id', authenticateToken, budgetController.getBudget);

/**
 * @swagger
 * /budgets/{id}:
 *   patch:
 *     summary: Update budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               amount:
 *                 type: number
 *               period:
 *                 type: string
 *                 enum: [WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               categoryId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Budget updated
 *       403:
 *         description: Not authorized (Owner/Admin only)
 *       404:
 *         description: Budget not found
 */
router.patch('/:id', authenticateToken, budgetController.updateBudget);

/**
 * @swagger
 * /budgets/{id}:
 *   delete:
 *     summary: Delete budget
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget deleted
 *       403:
 *         description: Not authorized (Owner/Admin only)
 *       404:
 *         description: Budget not found
 */
router.delete('/:id', authenticateToken, budgetController.deleteBudget);

/**
 * @swagger
 * /budgets/{id}/progress:
 *   get:
 *     summary: Get budget usage/progress with category breakdown
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget progress with breakdown
 *       403:
 *         description: Not a member of household
 *       404:
 *         description: Budget not found
 */
router.get('/:id/progress', authenticateToken, budgetController.getBudgetProgress);

/**
 * @swagger
 * /budgets/{id}/rollover:
 *   post:
 *     summary: Create new budget for next period
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: New budget created
 *       403:
 *         description: Not authorized (Owner/Admin only)
 *       404:
 *         description: Budget not found
 */
router.post('/:id/rollover', authenticateToken, budgetController.rolloverBudget);

module.exports = router;
