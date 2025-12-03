const express = require('express');
const router = express.Router();
const recurringExpenseController = require('../controllers/recurring-expense');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /recurring-expenses/generate:
 *   post:
 *     summary: Generate expenses from due recurring expenses (on-demand)
 *     tags: [Recurring Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expenses generated successfully
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
 *                     generated:
 *                       type: integer
 *                       description: Number of expenses generated
 *                     expenses:
 *                       type: array
 *                       description: List of generated expenses
 *                     errors:
 *                       type: array
 *                       description: Any errors that occurred during generation
 */
router.post('/generate', authenticateToken, recurringExpenseController.generateRecurringExpenses);

/**
 * @swagger
 * /recurring-expenses:
 *   get:
 *     summary: List recurring expenses for a household
 *     tags: [Recurring Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the household
 *     responses:
 *       200:
 *         description: List of recurring expenses
 *       400:
 *         description: Missing householdId parameter
 *       403:
 *         description: Not a member of household
 */
router.get('/', authenticateToken, recurringExpenseController.listRecurringExpenses);

/**
 * @swagger
 * /recurring-expenses:
 *   post:
 *     summary: Create recurring expense
 *     tags: [Recurring Expenses]
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
 *               - frequency
 *               - startDate
 *             properties:
 *               householdId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               frequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY]
 *               description:
 *                 type: string
 *                 maxLength: 255
 *               categoryId:
 *                 type: string
 *               dayOfWeek:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Required for WEEKLY and BIWEEKLY (0=Sunday, 6=Saturday)
 *               dayOfMonth:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *                 description: Required for MONTHLY and YEARLY
 *               monthOfYear:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *                 description: Required for YEARLY
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Recurring expense created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a member of household
 *       404:
 *         description: Category not found
 */
router.post('/', authenticateToken, recurringExpenseController.createRecurringExpense);

/**
 * @swagger
 * /recurring-expenses/{id}:
 *   get:
 *     summary: Get recurring expense by ID
 *     tags: [Recurring Expenses]
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
 *         description: Recurring expense details
 *       403:
 *         description: Not a member of household
 *       404:
 *         description: Recurring expense not found
 */
router.get('/:id', authenticateToken, recurringExpenseController.getRecurringExpense);

/**
 * @swagger
 * /recurring-expenses/{id}:
 *   patch:
 *     summary: Update recurring expense
 *     tags: [Recurring Expenses]
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
 *               frequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY]
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               dayOfWeek:
 *                 type: integer
 *               dayOfMonth:
 *                 type: integer
 *               monthOfYear:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Recurring expense updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized (creator, admin, or owner only)
 *       404:
 *         description: Recurring expense or category not found
 */
router.patch('/:id', authenticateToken, recurringExpenseController.updateRecurringExpense);

/**
 * @swagger
 * /recurring-expenses/{id}:
 *   delete:
 *     summary: Delete recurring expense
 *     tags: [Recurring Expenses]
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
 *         description: Recurring expense deleted successfully
 *       403:
 *         description: Not authorized (creator, admin, or owner only)
 *       404:
 *         description: Recurring expense not found
 */
router.delete('/:id', authenticateToken, recurringExpenseController.deleteRecurringExpense);

/**
 * @swagger
 * /recurring-expenses/{id}/toggle:
 *   post:
 *     summary: Pause or resume recurring expense
 *     tags: [Recurring Expenses]
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
 *         description: Recurring expense paused/resumed successfully
 *       403:
 *         description: Not authorized (creator, admin, or owner only)
 *       404:
 *         description: Recurring expense not found
 */
router.post('/:id/toggle', authenticateToken, recurringExpenseController.toggleRecurringExpense);

module.exports = router;
