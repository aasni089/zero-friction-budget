// controllers/webhooks/stripe.js
const prisma = require('../../config/database');
const { stripe } = require('../../utils/stripe');

// Process Stripe webhook events
exports.processWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    // Get the endpoint secret from environment variables
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    
    // Read the raw body as text so that Stripe can verify the signature
    const payload = req.rawBody;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: "Signature verification failed" });
    }

    // Handle different event types
    switch (event.type) {
      case "identity.verification_session.verified": {
        const sessionObject = event.data.object;
        const userId = sessionObject.metadata?.userId;
        const lastError = sessionObject.last_error
          ? {
              code: sessionObject.last_error.code,
              reason: sessionObject.last_error.reason,
            }
          : null;
        
        if (userId) {
          // Mark the user as verified and set a flash message for success
          await prisma.user.update({
            where: { id: userId },
            data: {
              idVerified: true,
              idVerifiedAt: new Date(),
              idDocuments: {
                sessionId: sessionObject.id,
                status: sessionObject.status,
                lastError,
                flashMessage: "Your identification was successfully verified!",
                flashType: "success"
              },
            },
          });
          console.log(`User ${userId} has been marked as verified.`);
        } else {
          console.error("User ID not found in verification session metadata.");
        }
        break;
      }

      case "identity.verification_session.requires_input": {
        const sessionObject = event.data.object;
        const userId = sessionObject.metadata?.userId;
        const lastError = sessionObject.last_error
          ? {
              code: sessionObject.last_error.code,
              reason: sessionObject.last_error.reason,
            }
          : null;

        if (userId) {
          // Set a flash message so the UI can show that additional input is required
          await prisma.user.update({
            where: { id: userId },
            data: {
              idVerified: false,
              idDocuments: {
                sessionId: sessionObject.id,
                status: sessionObject.status,
                lastError,
                flashMessage: "Please make sure to provide a valid identification document.",
                flashType: "destructive"
              },
            },
          });
          console.log(`User ${userId} verification session requires additional input.`);
        }
        break;
      }

      case "identity.verification_session.canceled": {
        const sessionObject = event.data.object;
        const userId = sessionObject.metadata?.userId;
        const lastError = sessionObject.last_error
          ? {
              code: sessionObject.last_error.code,
              reason: sessionObject.last_error.reason,
            }
          : null;

        if (userId) {
          // Set a flash message so the UI can show that the verification was canceled
          await prisma.user.update({
            where: { id: userId },
            data: {
              idVerified: false,
              idDocuments: {
                sessionId: sessionObject.id,
                status: sessionObject.status,
                lastError,
                flashMessage: "Your verification was canceled. Please try again.",
                flashType: "destructive"
              },
            },
          });
          console.log(`User ${userId} verification session was canceled.`);
        }
        break;
      }

      default: {
        console.log("Unhandled event type:", event.type);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error handling webhook:", err);
    return res.status(500).json({ error: "Webhook handling failed" });
  }
};