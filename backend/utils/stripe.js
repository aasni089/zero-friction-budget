// utils/stripe.js
const Stripe = require('stripe');

// Initialize Stripe with the API key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Export the Stripe instance for use in other modules
exports.stripe = stripe;

/**
 * Create a payment intent
 * @param {number} amount - Amount in cents
 * @param {string} currency - Currency code (e.g., 'usd')
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} - Stripe payment intent
 */
exports.createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata
    });
    
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
};

/**
 * Create a verification session
 * @param {string} userId - User ID for metadata
 * @param {string} returnUrl - URL to redirect to after verification
 * @returns {Promise<object>} - Stripe verification session
 */
exports.createVerificationSession = async (userId, returnUrl) => {
  try {
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        userId
      },
      return_url: returnUrl
    });
    
    return verificationSession;
  } catch (error) {
    console.error('Error creating verification session:', error);
    throw new Error('Failed to create verification session');
  }
};

/**
 * Retrieve a verification session
 * @param {string} sessionId - Verification session ID
 * @returns {Promise<object>} - Stripe verification session
 */
exports.getVerificationSession = async (sessionId) => {
  try {
    const verificationSession = await stripe.identity.verificationSessions.retrieve(sessionId);
    return verificationSession;
  } catch (error) {
    console.error('Error retrieving verification session:', error);
    throw new Error('Failed to retrieve verification session');
  }
};

/**
 * Create a customer
 * @param {string} email - Customer email
 * @param {string} name - Customer name
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} - Stripe customer
 */
exports.createCustomer = async (email, name, metadata = {}) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });
    
    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw new Error('Failed to create customer');
  }
};

/**
 * Create a payment method
 * @param {string} customerId - Stripe customer ID
 * @param {object} paymentMethodData - Payment method data
 * @returns {Promise<object>} - Stripe payment method
 */
exports.createPaymentMethod = async (customerId, paymentMethodData) => {
  try {
    const paymentMethod = await stripe.paymentMethods.create(paymentMethodData);
    
    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId
    });
    
    return paymentMethod;
  } catch (error) {
    console.error('Error creating payment method:', error);
    throw new Error('Failed to create payment method');
  }
};

/**
 * Process a webhook event
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature from headers
 * @param {string} endpointSecret - Webhook endpoint secret
 * @returns {object} - Stripe event
 */
exports.constructWebhookEvent = (payload, signature, endpointSecret) => {
  return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
};