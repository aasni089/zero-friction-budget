// routes/admin/sync.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const syncController = require('../../controllers/admin/sync');

/**
 * @swagger
 * /api/admin/sync/municipal-properties:
 *   post:
 *     summary: Trigger a full synchronization of municipal properties
 *     tags: [Admin, Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: integer
 *                 description: Number of properties to process in each batch
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Sync operation started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 isAsync:
 *                   type: boolean
 *       500:
 *         description: Error starting sync
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
router.post('/municipal-properties', 
  authenticateToken, 
  requireAdmin, 
  syncController.syncMunicipalProperties
);

/**
 * @swagger
 * /api/admin/sync/status:
 *   get:
 *     summary: Get status of current or last sync operation
 *     tags: [Admin, Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current sync status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 isImplemented:
 *                   type: boolean
 *       500:
 *         description: Error fetching status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/status', 
  authenticateToken, 
  requireAdmin, 
  syncController.getSyncStatus
);

/**
 * @swagger
 * /api/admin/sync/municipal-property/{id}:
 *   post:
 *     summary: Sync a single municipal property
 *     tags: [Admin, Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Municipal property ID
 *     responses:
 *       200:
 *         description: Property synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Property not found
 *       500:
 *         description: Error syncing property
 */
router.post('/municipal-property/:id', 
  authenticateToken, 
  requireAdmin, 
  syncController.syncSingleProperty
);

/**
 * @swagger
 * /api/admin/sync/municipal-property/{id}:
 *   delete:
 *     summary: Delete a municipal property from the index
 *     tags: [Admin, Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Municipal property ID
 *     responses:
 *       200:
 *         description: Property deleted from index
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       500:
 *         description: Error deleting property
 */
router.delete('/municipal-property/:id', 
  authenticateToken, 
  requireAdmin, 
  syncController.deletePropertyFromIndex
);

module.exports = router;