// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const createDirectories = () => {
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const propertiesDir = path.join(uploadDir, 'properties');
  if (!fs.existsSync(propertiesDir)) {
    fs.mkdirSync(propertiesDir, { recursive: true });
  }
  
  const identityDir = path.join(uploadDir, 'identity');
  if (!fs.existsSync(identityDir)) {
    fs.mkdirSync(identityDir, { recursive: true });
  }
};

// Create directories on startup
createDirectories();

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine the appropriate upload directory based on the route
    let uploadPath = path.join(__dirname, '..', 'public', 'uploads');
    
    if (req.originalUrl.includes('/properties')) {
      const propertyId = req.params.id;
      uploadPath = path.join(uploadPath, 'properties', propertyId);
      
      // Create property-specific directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
    } else if (req.originalUrl.includes('/identity')) {
      uploadPath = path.join(uploadPath, 'identity', req.user.id);
      
      // Create user-specific identity directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
    } else {
      // Default to user-specific uploads
      uploadPath = path.join(uploadPath, req.user.id);
      
      // Create user-specific directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    cb(null, `${uniqueId}${fileExtension}`);
  }
});

// File filter to validate uploads
const fileFilter = (req, file, cb) => {
  // Check file type based on the route
  if (req.originalUrl.includes('/properties')) {
    // For property images, only allow image files
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'), false);
    }
  } else if (req.originalUrl.includes('/identity')) {
    // For identity documents, allow images and PDFs
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'), false);
    }
  } else {
    // Default file validation
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'), false);
    }
  }
};

// Create the multer upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

// Error handling middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({ error: err.message });
  }
  
  // If no error, continue with the request
  next();
};

module.exports = upload;
module.exports.handleUploadErrors = handleUploadErrors;