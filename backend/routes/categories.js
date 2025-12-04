const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /categories/default:
 *   get:
 *     summary: Get default category templates
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default category templates
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
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           color:
 *                             type: string
 *                     count:
 *                       type: integer
 */
router.get('/default', authenticateToken, categoryController.getDefaultCategories);

/**
 * @swagger
 * /categories/seed:
 *   post:
 *     summary: Seed default categories for a household
 *     tags: [Categories]
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
 *             properties:
 *               householdId:
 *                 type: string
 *                 description: ID of the household to seed categories for
 *     responses:
 *       201:
 *         description: Categories seeded successfully
 *       400:
 *         description: Household already has categories or validation error
 *       403:
 *         description: Not authorized (Admin or Owner only)
 */
router.post('/seed', authenticateToken, categoryController.seedCategories);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: List categories for a household
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the household to list categories for
 *     responses:
 *       200:
 *         description: List of categories with usage counts
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
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           householdId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           color:
 *                             type: string
 *                           parentId:
 *                             type: string
 *                           parent:
 *                             type: object
 *                           children:
 *                             type: array
 *                           expenseCount:
 *                             type: integer
 *                           budgetCount:
 *                             type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Missing householdId parameter
 *       403:
 *         description: Not a member of household
 */
router.get('/', authenticateToken, categoryController.listCategories);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create category
 *     tags: [Categories]
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
 *             properties:
 *               householdId:
 *                 type: string
 *                 description: ID of the household
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Category name
 *               icon:
 *                 type: string
 *                 maxLength: 10
 *                 description: Emoji or icon identifier
 *               color:
 *                 type: string
 *                 pattern: ^#[0-9A-Fa-f]{6}$
 *                 description: Hex color code (e.g., #10b981)
 *               parentId:
 *                 type: string
 *                 description: ID of parent category for hierarchical organization
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized (Admin or Owner only)
 *       404:
 *         description: Parent category not found
 */
router.post('/', authenticateToken, categoryController.createCategory);

/**
 * @swagger
 * /categories/{id}/analytics:
 *   get:
 *     summary: Get spending analytics for a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for analytics (defaults to 6 months ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for analytics (defaults to today)
 *     responses:
 *       200:
 *         description: Category analytics retrieved successfully
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
 *                     category:
 *                       type: object
 *                     period:
 *                       type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSpent:
 *                           type: number
 *                         expenseCount:
 *                           type: integer
 *                         averagePerMonth:
 *                           type: number
 *                         averagePerExpense:
 *                           type: number
 *                         trend:
 *                           type: string
 *                           enum: [increasing, decreasing, stable]
 *                     monthlyBreakdown:
 *                       type: array
 *                     topSpenders:
 *                       type: array
 *       403:
 *         description: Not a member of household
 *       404:
 *         description: Category not found
 */
router.get('/:id/analytics', authenticateToken, categoryController.getCategoryAnalytics);

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     summary: Update category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               icon:
 *                 type: string
 *                 maxLength: 10
 *               color:
 *                 type: string
 *                 pattern: ^#[0-9A-Fa-f]{6}$
 *               parentId:
 *                 type: string
 *                 description: ID of parent category (null to remove parent)
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error (e.g., category cannot be its own parent)
 *       403:
 *         description: Not authorized (Admin or Owner only)
 *       404:
 *         description: Category or parent category not found
 */
router.patch('/:id', authenticateToken, categoryController.updateCategory);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *       - in: query
 *         name: force
 *         schema:
 *           type: string
 *           enum: [true]
 *         description: Set to 'true' to delete category even if it's being used (will set references to null)
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Category is being used (use force=true) or has child categories
 *       403:
 *         description: Not authorized (Admin or Owner only)
 *       404:
 *         description: Category not found
 */
router.delete('/:id', authenticateToken, categoryController.deleteCategory);

module.exports = router;
