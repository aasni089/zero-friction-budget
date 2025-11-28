const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense');
const { authenticateToken } = require('../middleware/auth');
const { canModifyExpense } = require('../middleware/household-auth');

/**
 * @swagger
 * /expenses:
 *   post:
 *     summary: Create expense
 *     tags: [Expenses]
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
 *               - amount
 *             properties:
 *               householdId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE, TRANSFER]
 *                 default: EXPENSE
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               date:
 *                 type: string
 *                 format: date-time
 *               budgetId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               isRecurring:
 *                 type: boolean
 *                 default: false
 *               recurringId:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Expense created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a member of household
 */
router.post('/', authenticateToken, expenseController.createExpense);

/**
 * @swagger
 * /expenses/bulk:
 *   post:
 *     summary: Bulk create expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expenses
 *             properties:
 *               expenses:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - householdId
 *                     - amount
 *                   properties:
 *                     householdId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     type:
 *                       type: string
 *                       enum: [INCOME, EXPENSE, TRANSFER]
 *                     description:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     budgetId:
 *                       type: string
 *                     categoryId:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: Expenses created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized for one or more households
 */
router.post('/bulk', authenticateToken, expenseController.bulkCreateExpenses);

/**
 * @swagger
 * /expenses/summary:
 *   get:
 *     summary: Get expense summary with aggregations
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: householdId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [category, type, month, budget]
 *           default: category
 *     responses:
 *       200:
 *         description: Expense summary with aggregations
 *       403:
 *         description: Not a member of household
 */
router.get('/summary', authenticateToken, expenseController.getExpenseSummary);

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: List expenses with filters
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: householdId
 *         schema:
 *           type: string
 *       - in: query
 *         name: budgetId
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INCOME, EXPENSE, TRANSFER]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *           description: Comma-separated list of tags
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of expenses with pagination
 *       403:
 *         description: Not a member of household
 */
router.get('/', authenticateToken, expenseController.listExpenses);

/**
 * @swagger
 * /expenses/{id}:
 *   get:
 *     summary: Get expense by ID
 *     tags: [Expenses]
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
 *         description: Expense details
 *       403:
 *         description: Not a member of household
 *       404:
 *         description: Expense not found
 */
router.get('/:id', authenticateToken, expenseController.getExpense);

/**
 * @swagger
 * /expenses/{id}:
 *   patch:
 *     summary: Update expense
 *     tags: [Expenses]
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
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE, TRANSFER]
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               budgetId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               isRecurring:
 *                 type: boolean
 *               recurringId:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Expense updated
 *       403:
 *         description: Not authorized (creator or Admin only)
 *       404:
 *         description: Expense not found
 */
router.patch('/:id', authenticateToken, canModifyExpense, expenseController.updateExpense);

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Delete expense
 *     tags: [Expenses]
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
 *         description: Expense deleted
 *       403:
 *         description: Not authorized (creator or Admin only)
 *       404:
 *         description: Expense not found
 */
router.delete('/:id', authenticateToken, canModifyExpense, expenseController.deleteExpense);

module.exports = router;
