const express = require('express');
const router = express.Router();
const householdController = require('../controllers/household');
const { authenticateToken } = require('../middleware/auth');
const {
  requireHouseholdMember,
  requireAdmin,
  requireOwner,
} = require('../middleware/household-auth');

/**
 * @swagger
 * /households:
 *   post:
 *     summary: Create new household
 *     tags: [Households]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: Household created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, householdController.createHousehold);

/**
 * @swagger
 * /households:
 *   get:
 *     summary: List user's households
 *     tags: [Households]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of households
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, householdController.listHouseholds);

/**
 * @swagger
 * /households/{id}:
 *   get:
 *     summary: Get household details
 *     tags: [Households]
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
 *         description: Household details
 *       403:
 *         description: Not a member of household
 *       404:
 *         description: Household not found
 */
router.get('/:id', authenticateToken, householdController.getHousehold);

/**
 * @swagger
 * /households/{id}:
 *   patch:
 *     summary: Update household settings
 *     tags: [Households]
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
 *     responses:
 *       200:
 *         description: Household updated
 *       403:
 *         description: Admin or owner role required
 */
router.patch(
  '/:id',
  authenticateToken,
  requireHouseholdMember,
  requireAdmin,
  householdController.updateHousehold
);

/**
 * @swagger
 * /households/{id}:
 *   delete:
 *     summary: Delete household (owner only)
 *     tags: [Households]
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
 *         description: Household deleted
 *       403:
 *         description: Owner role required
 */
router.delete(
  '/:id',
  authenticateToken,
  requireHouseholdMember,
  requireOwner,
  householdController.deleteHousehold
);

/**
 * @swagger
 * /households/{id}/invite:
 *   post:
 *     summary: Invite member via email
 *     tags: [Households]
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
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [MEMBER, ADMIN]
 *                 default: MEMBER
 *     responses:
 *       200:
 *         description: Invitation sent
 *       403:
 *         description: Admin or owner role required
 */
router.post(
  '/:id/invite',
  authenticateToken,
  requireHouseholdMember,
  requireAdmin,
  householdController.inviteMember
);

/**
 * @swagger
 * /households/{id}/join:
 *   post:
 *     summary: Accept invitation and join household
 *     tags: [Households]
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
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *               role:
 *                 type: string
 *                 default: MEMBER
 *     responses:
 *       200:
 *         description: Successfully joined household
 *       400:
 *         description: Already a member
 *       404:
 *         description: Household not found
 */
router.post('/:id/join', authenticateToken, householdController.joinHousehold);

/**
 * @swagger
 * /households/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from household
 *     tags: [Households]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       403:
 *         description: Admin or owner role required
 */
router.delete(
  '/:id/members/:userId',
  authenticateToken,
  requireHouseholdMember,
  requireAdmin,
  householdController.removeMember
);

/**
 * @swagger
 * /households/{id}/members/{userId}/role:
 *   patch:
 *     summary: Update member role
 *     tags: [Households]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER, VIEWER]
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Owner role required
 */
router.patch(
  '/:id/members/:userId/role',
  authenticateToken,
  requireHouseholdMember,
  requireOwner,
  householdController.updateMemberRole
);

/**
 * @swagger
 * /households/{id}/leave:
 *   post:
 *     summary: Leave household
 *     tags: [Households]
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
 *         description: Successfully left household
 *       403:
 *         description: Owner cannot leave (delete household instead)
 */
router.post(
  '/:id/leave',
  authenticateToken,
  requireHouseholdMember,
  householdController.leaveHousehold
);

module.exports = router;
