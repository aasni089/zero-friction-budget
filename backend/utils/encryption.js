// utils/encryption.js - Fixed implementation
const crypto = require('crypto');

// Get encryption key and IV from environment variables or generate them securely
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString('hex').slice(0, 16);

// Ensure key and IV are the correct length
const NORMALIZED_KEY = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
const NORMALIZED_IV = Buffer.from(ENCRYPTION_IV.padEnd(16).slice(0, 16));

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text (base64 encoded)
 */
exports.encrypt = (text) => {
  try {
    // Create cipher with key and IV
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      NORMALIZED_KEY,
      NORMALIZED_IV
    );
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt a string encrypted with AES-256-CBC
 * @param {string} encryptedText - Encrypted text (base64 encoded)
 * @returns {string} - Decrypted text
 */
exports.decrypt = (encryptedText) => {
  try {
    // Create decipher with key and IV
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      NORMALIZED_KEY,
      NORMALIZED_IV
    );
    
    // Decrypt the text
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Add a method to log the current encryption configuration (for debugging)
exports.logConfig = () => {
  console.log('Encryption Configuration:');
  console.log(`Key length: ${NORMALIZED_KEY.length} bytes`);
  console.log(`IV length: ${NORMALIZED_IV.length} bytes`);
  
  // First few characters for verification (never log the full key/IV in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`Key prefix: ${NORMALIZED_KEY.toString('hex').substring(0, 6)}...`);
    console.log(`IV prefix: ${NORMALIZED_IV.toString('hex').substring(0, 6)}...`);
  }
};