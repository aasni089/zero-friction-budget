// services/upload.js
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Ensures that the required directories exist
 */
exports.ensureDirectories = async () => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    const propertiesDir = path.join(uploadsDir, 'properties');
    const identityDir = path.join(uploadsDir, 'identity');

    // Create directories if they don't exist
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(propertiesDir, { recursive: true });
    await fs.mkdir(identityDir, { recursive: true });

    return true;
  } catch (error) {
    console.error('Error ensuring directories:', error);
    throw new Error('Failed to ensure upload directories exist');
  }
};

/**
 * Create user-specific directory
 */
exports.createUserDirectory = async (userId) => {
  try {
    const userDir = path.join(__dirname, '..', 'public', 'uploads', userId);
    await fs.mkdir(userDir, { recursive: true });
    return userDir;
  } catch (error) {
    console.error('Error creating user directory:', error);
    throw new Error('Failed to create user directory');
  }
};

/**
 * Create property-specific directory
 */
exports.createPropertyDirectory = async (propertyId) => {
  try {
    const propertyDir = path.join(__dirname, '..', 'public', 'uploads', 'properties', propertyId);
    await fs.mkdir(propertyDir, { recursive: true });
    return propertyDir;
  } catch (error) {
    console.error('Error creating property directory:', error);
    throw new Error('Failed to create property directory');
  }
};

/**
 * Save a file to disk
 */
exports.saveFile = async (file, directory) => {
  try {
    // Generate unique filename
    const uniqueId = uuidv4();
    const fileExt = path.extname(file.originalname);
    const filename = `${uniqueId}${fileExt}`;
    const filepath = path.join(directory, filename);

    // Move the file from temp to the target directory
    await fs.rename(file.path, filepath);

    return {
      id: uniqueId,
      filename,
      filepath,
      url: filepath.replace(path.join(__dirname, '..', 'public'), '')
    };
  } catch (error) {
    console.error('Error saving file:', error);
    throw new Error('Failed to save file');
  }
};

/**
 * Process uploaded file(s)
 */
exports.processUpload = async (files, userId, type = 'general') => {
  try {
    // Ensure directory structure exists
    await this.ensureDirectories();

    // Determine target directory based on type
    let targetDir;
    if (type === 'property') {
      targetDir = path.join(__dirname, '..', 'public', 'uploads', 'properties', files[0].propertyId);
    } else if (type === 'identity') {
      targetDir = path.join(__dirname, '..', 'public', 'uploads', 'identity', userId);
    } else {
      targetDir = path.join(__dirname, '..', 'public', 'uploads', userId);
    }

    // Create target directory if it doesn't exist
    await fs.mkdir(targetDir, { recursive: true });

    // Process each file
    if (Array.isArray(files)) {
      // Multiple files
      const results = await Promise.all(files.map(file => this.saveFile(file, targetDir)));
      return results;
    } else {
      // Single file
      const result = await this.saveFile(files, targetDir);
      return result;
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    throw new Error('Failed to process upload');
  }
};

/**
 * Delete a file
 */
exports.deleteFile = async (filepath) => {
  try {
    await fs.unlink(filepath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

/**
 * Get file information
 */
exports.getFileInfo = async (filepath) => {
  try {
    const stats = await fs.stat(filepath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      filepath
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    throw new Error('Failed to get file info');
  }
};

/**
 * Create a temporary URL for a file
 * This is a simple implementation - in production you might use signed URLs from a CDN
 */
exports.createTemporaryUrl = (filepath, expiryMinutes = 60) => {
  try {
    const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const token = uuidv4();
    
    // In a real implementation, you'd store this token and expiry in a database or cache
    const temporaryUrl = `/temp/${token}/${path.basename(filepath)}`;
    
    return {
      url: temporaryUrl,
      expires: expiryTime
    };
  } catch (error) {
    console.error('Error creating temporary URL:', error);
    throw new Error('Failed to create temporary URL');
  }
};

/**
 * Convert file size to human-readable format
 */
exports.formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};