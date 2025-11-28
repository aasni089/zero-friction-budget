// controllers/upload/index.js
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * Handle file upload
 */
exports.uploadFile = async (req, res) => {
  try {
    // Check for file
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // File is already processed by multer middleware
    const file = req.file;
    const userId = req.user.id;
    
    // Generate a unique ID for the image
    const imageId = uuidv4();
    
    // File is saved in the uploads directory by multer
    // Generate the full URL for the file (including backend domain)
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const fileUrl = `${apiBaseUrl}/uploads/${userId}/${file.filename}`;
    
    console.log("File uploaded successfully:", {
      id: imageId,
      fileName: file.filename,
      url: fileUrl,
      size: file.size
    });
    
    return res.status(200).json({ 
      id: imageId,
      url: fileUrl,
      fileName: file.filename,
      success: true 
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ error: "Failed to upload file" });
  }
};

/**
 * Handle multiple file uploads
 */
exports.uploadMultiple = async (req, res) => {
  try {
    // Check for files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    // Files are already processed by multer middleware
    const files = req.files;
    const userId = req.user.id;
    
    // Process each file
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const uploadedFiles = files.map(file => {
      const imageId = uuidv4();
      const fileUrl = `${apiBaseUrl}/uploads/${userId}/${file.filename}`;

      return {
        id: imageId,
        url: fileUrl,
        fileName: file.filename,
        size: file.size,
        mimetype: file.mimetype
      };
    });
    
    console.log(`${uploadedFiles.length} files uploaded successfully`);
    
    return res.status(200).json({ 
      files: uploadedFiles,
      success: true 
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    return res.status(500).json({ error: "Failed to upload files" });
  }
};