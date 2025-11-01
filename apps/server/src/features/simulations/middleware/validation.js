/**
 * Validation middleware for simulation endpoints
 */

const { body, validationResult } = require('express-validator');

const validateSimulationRequest = [
  // --- EXISTING/BASIC FIELDS ---
  body('years')
    .isInt({ min: 1, max: 100 })
    .withMessage('Years must be an integer between 1 and 100'),
  body('startYear')
    .isInt({ min: 1900 })
    .withMessage('Start year must be a valid year'),
  body('initialValue')
    .isFloat({ min: 1 })
    .withMessage('Initial value must be a positive number'),
  body('spendingRate')
    .isFloat({ min: 0, max: 1 })
    .withMessage('Spending rate must be between 0 and 1'),
  body('spendingGrowth')
    .isFloat({ min: -0.5, max: 0.5 })
    .withMessage('Spending growth must be between -0.5 and 0.5'),

  // --- NEW 7-FACTOR FIELDS (Validation needs to be generic for JSON/Object) ---
  body('assetAssumptions')
    .exists()
    .withMessage('Asset assumptions object is required')
    .isObject()
    .withMessage('Asset assumptions must be an object'),

  body('correlationMatrix')
    .exists()
    .withMessage('Correlation matrix is required')
    .isArray() // It is an array of arrays
    .withMessage('Correlation matrix must be an array'),
    
  // Assuming portfolioWeights is also sent in the body and should be validated
  body('portfolioWeights')
    .exists()
    .withMessage('Portfolio weights object is required')
    .isObject()
    .withMessage('Portfolio weights must be an object'),
    
  // --- REMOVED: equityReturn, bondReturn, correlation, etc. ---

  // --- OPTIONAL FIELDS ---
  body('equityShock')
    .optional()
    .isFloat({ min: -1, max: 0 })
    .withMessage('Equity shock must be between -1 and 0'),
  body('cpiShift')
    .optional()
    .isFloat({ min: -1, max: 1 })
    .withMessage('CPI shift must be between -1 and 1'),
  body('grantTargets')
    .optional()
    .isArray()
    .withMessage('Grant targets must be an array'),
  body('numSimulations')
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage('Number of simulations must be between 100 and 10000')
];


/**
 * Middleware to check validation results and respond with errors if any
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  validateSimulationRequest,
  handleValidationErrors
};
