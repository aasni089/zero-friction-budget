// controllers/profile/index.js
const prisma = require('../../config/database');
const { stripe } = require('../../utils/stripe');

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        idType: true,
        idNumber: true,
        idVerified: true,
        idVerifiedAt: true,
        idDocuments: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the current user from the database
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Double check that the user exists
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the update data from the request
    const { 
      name, 
      phoneNumber,
      address, 
      city, 
      province, 
      postalCode,
      idType,
      idNumber
    } = req.body;

    // Basic validation
    if (name && name.length > 100) {
      return res.status(400).json({ error: 'Name is too long' });
    }

    // If user is already verified, prevent changes to ID fields
    let finalIdType = idType;
    let finalIdNumber = idNumber;
    if (currentUser.idVerified) {
      // Option A: silently ignore changes, keep existing
      finalIdType = currentUser.idType;
      finalIdNumber = currentUser.idNumber;
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phoneNumber,
        address,
        city,
        province,
        postalCode,
        idType: finalIdType,
        idNumber: finalIdNumber,
        updatedAt: new Date(), // Explicitly update the updatedAt field
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        idType: true,
        idNumber: true,
        idVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Create verification session with Stripe
 */
exports.createVerificationSession = async (req, res) => {
  try {
    const userId = req.user.id;

    // In dev only:
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "ID verification not enabled in production" });
    }

    // Get current user from DB to confirm existence
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        userId: userId, // So we can identify which user was verified
      },
      return_url: process.env.VERIFICATION_RETURN_URL || "http://localhost:3000/profile",
    });

    return res.status(200).json({ url: verificationSession.url });
  } catch (err) {
    console.error("Error creating verification session:", err);
    return res.status(500).json({ error: err.message || "Error creating verification session" });
  }
};

/**
 * Clear flash message from ID documents
 */
exports.clearFlash = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Clear the flashMessage from idDocuments
    const idDocuments = (user.idDocuments || {});
    if (idDocuments.flashMessage) {
      delete idDocuments.flashMessage;
      delete idDocuments.flashType;
      await prisma.user.update({
        where: { id: userId },
        data: { idDocuments },
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error clearing flash message:', error);
    return res.status(500).json({ error: 'Failed to clear flash message' });
  }
};