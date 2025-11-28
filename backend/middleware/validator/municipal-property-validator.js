// middleware/validators/municipal-property.validator.js
const { body, query, param, validationResult } = require('express-validator');

/**
 * Middleware to validate the result of express-validator checks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: errors.array() 
    });
  }
  next();
};

/**
 * Validator for searching municipal properties
 */
exports.validateSearch = [
  query('lat').optional().isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90'),
  query('lng').optional().isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180'),
  query('radius').optional().isFloat({ min: 0.1, max: 100 })
    .withMessage('Radius must be a valid number between 0.1 and 100 kilometers'),
  query('page').optional().isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer not exceeding 100'),
  validate
];

/**
 * Validator for creating a new municipal property
 */
exports.validateCreate = [
  body('address').notEmpty().withMessage('Address is required')
    .isString().withMessage('Address must be a string')
    .isLength({ max: 255 }).withMessage('Address cannot exceed 255 characters'),
  body('city').notEmpty().withMessage('City is required')
    .isString().withMessage('City must be a string')
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),
  body('province').notEmpty().withMessage('Province is required')
    .isString().withMessage('Province must be a string')
    .isLength({ min: 2, max: 2 }).withMessage('Province must be a 2-character code'),
  body('postalCode').optional()
    .isString().withMessage('Postal code must be a string')
    .isLength({ max: 10 }).withMessage('Postal code cannot exceed 10 characters'),
  body('latitude').optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a valid number between -90 and 90'),
  body('longitude').optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a valid number between -180 and 180'),
  body('zoneCodeId').optional()
    .isString().withMessage('Zone code ID must be a string'),
  body('municipality').optional()
    .isString().withMessage('Municipality must be a string')
    .isLength({ max: 100 }).withMessage('Municipality cannot exceed 100 characters'),
  body('ward').optional()
    .isString().withMessage('Ward must be a string')
    .isLength({ max: 50 }).withMessage('Ward cannot exceed 50 characters'),
  body('zoningRawData').optional()
    .isObject().withMessage('Zoning raw data must be an object'),
  validate
];

/**
 * Validator for updating a municipal property
 */
exports.validateUpdate = [
  param('id').notEmpty().withMessage('Municipal property ID is required')
    .isString().withMessage('Municipal property ID must be a string'),
  body('address').optional()
    .isString().withMessage('Address must be a string')
    .isLength({ max: 255 }).withMessage('Address cannot exceed 255 characters'),
  body('city').optional()
    .isString().withMessage('City must be a string')
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),
  body('province').optional()
    .isString().withMessage('Province must be a string')
    .isLength({ min: 2, max: 2 }).withMessage('Province must be a 2-character code'),
  body('postalCode').optional()
    .isString().withMessage('Postal code must be a string')
    .isLength({ max: 10 }).withMessage('Postal code cannot exceed 10 characters'),
  body('latitude').optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a valid number between -90 and 90'),
  body('longitude').optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a valid number between -180 and 180'),
  body('zoneCodeId').optional()
    .isString().withMessage('Zone code ID must be a string'),
  body('municipality').optional()
    .isString().withMessage('Municipality must be a string')
    .isLength({ max: 100 }).withMessage('Municipality cannot exceed 100 characters'),
  body('ward').optional()
    .isString().withMessage('Ward must be a string')
    .isLength({ max: 50 }).withMessage('Ward cannot exceed 50 characters'),
  body('zoningRawData').optional()
    .isObject().withMessage('Zoning raw data must be an object'),
  validate
];

/**
 * Validator for getting a municipal property by ID
 */
exports.validateGetById = [
  param('id').notEmpty().withMessage('Municipal property ID is required')
    .isString().withMessage('Municipal property ID must be a string'),
  validate
];

/**
 * Validator for deleting a municipal property
 */
exports.validateDelete = [
  param('id').notEmpty().withMessage('Municipal property ID is required')
    .isString().withMessage('Municipal property ID must be a string'),
  validate
];

/**
 * Validator for getting a municipal property by address
 */
exports.validateGetByAddress = [
  query('address').notEmpty().withMessage('Address is required')
    .isString().withMessage('Address must be a string'),
  query('city').notEmpty().withMessage('City is required')
    .isString().withMessage('City must be a string'),
  query('province').notEmpty().withMessage('Province is required')
    .isString().withMessage('Province must be a string')
    .isLength({ min: 2, max: 2 }).withMessage('Province must be a 2-character code'),
  validate
];