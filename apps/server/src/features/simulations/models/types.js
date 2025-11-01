/**
 * Simulation domain types and interfaces
 */

/**
 * @typedef {Object} SimulationRequest
 * @property {number} years - Number of years to simulate
 * @property {number} startYear - Starting year for the simulation
 * @property {number} initialValue - Starting portfolio value in dollars
 * @property {number} spendingRate - Annual spending rate (e.g., 0.05 for 5%)
 * @property {number} spendingGrowth - Annual growth of spending amount (e.g., 0.03 for 3%)

* @property {Object} assetAssumptions - Object containing 7-factor asset assumptions (mean, vol)
 * @property {Array<Array<number>>} correlationMatrix - 7x7 matrix of asset correlations
 *
 * @property {Object} portfolioWeights - Object containing 7-factor asset weights 
* @property {number} [equityShock] - Optional negative shock to equity returns (e.g., -0.30 for -30%)
 * @property {number} [cpiShift] - Optional shift to inflation/spending growth (e.g., 0.02 for +2%)
 * @property {Array<number>} [grantTargets] - Optional annual grant targets (spending minimums)
 * @property {number} numSimulations - Number of Monte Carlo paths to run (default 1000)
 */

/**
 * @typedef {Object} SimulationResult
 * @property {string} id - Unique simulation ID
 * @property {Array<Array<number>>} paths - Array of simulation paths (each path is array of portfolio values)
 * @property {Object} summary - Summary statistics
 * @property {Array<number>} summary.finalValues - Final portfolio value for each path
 * @property {number} summary.median - Median final value
 * @property {number} summary.percentile10 - 10th percentile
 * @property {number} summary.percentile25 - 25th percentile
 * @property {number} summary.percentile75 - 75th percentile
 * @property {number} summary.percentile90 - 90th percentile
 * @property {Array<number>} summary.successRate - Probability of success by year
 * @property {number} summary.average - Average final value
 * @property {number} summary.stdDev - Standard deviation of final values
 * @property {Date} createdAt - Timestamp of when simulation was run
 */

/**
 * @typedef {Object} PortfolioMetrics
 * @property {number} medianEndingValue - Median portfolio value at end of period
 * @property {number} percentile10 - 10th percentile ending value
 * @property {number} percentile25 - 25th percentile ending value
 * @property {number} percentile75 - 75th percentile ending value
 * @property {number} percentile90 - 90th percentile ending value
 * @property {number} average - Average ending value
 * @property {number} stdDev - Standard deviation of ending values
 * @property {number} successProbability - Overall probability portfolio lasts full period
 * @property {Array<number>} successByYear - Annual success probabilities
 * @property {number} minEndingValue - Worst-case ending value
 * @property {number} maxEndingValue - Best-case ending value
 */

module.exports = {
  // Types are exported as documentation; actual validation happens in middleware
};
