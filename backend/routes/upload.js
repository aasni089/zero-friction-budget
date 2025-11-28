// routes/upload.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadController = require('../controllers/upload');

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a single file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 url:
 *                   type: string
 *                 fileName:
 *                   type: string
 *                 success:
 *                   type: boolean
 *       400:
 *         description: No file provided
 *       500:
 *         description: Failed to upload file
 */
router.post('/', 
  authenticateToken, 
  upload.single('file'), 
  uploadController.uploadFile
);

/**
 * @swagger
 * /api/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       url:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                       size:
 *                         type: number
 *                       mimetype:
 *                         type: string
 *                 success:
 *                   type: boolean
 *       400:
 *         description: No files provided
 *       500:
 *         description: Failed to upload files
 */
router.post('/multiple', 
  authenticateToken, 
  upload.array('files', 10), // Allow up to 10 files
  uploadController.uploadMultiple
);

module.exports = router;