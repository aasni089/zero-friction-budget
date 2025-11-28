// routes/webhooks.js
const express = require('express');
const router = express.Router();
const stripeWebhookController = require('../controllers/webhooks/stripe');

// Special middleware to preserve raw body for Stripe signature verification
const rawBodyMiddleware = (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
};

/**
 * @swagger
 * /api/webhooks/stripe:
 *   post:
 *     summary: Handle Stripe webhook events
 *     tags: [Webhooks]
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe signature for verifying webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *       400:
 *         description: Missing stripe-signature or signature verification failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Webhook handling failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/stripe', 
  express.raw({ type: 'application/json' }),
  rawBodyMiddleware,
  stripeWebhookController.processWebhook
);

module.exports = router;