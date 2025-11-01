/**
 * Monte Carlo Simulation Engine (Pure JavaScript - no external stats library)
 * Handles portfolio projections using stochastic modeling for a 7-factor asset model.
 */

/**
 * Performs Cholesky decomposition on a symmetric, positive-definite matrix.
 * @param {number[][]} matrix - The matrix to decompose.
 * @returns {number[][]} The lower triangular matrix (L) such that L * L^T = matrix.
 */
function cholesky(matrix) {
  const n = matrix.length;
  const L = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }

      if (i === j) {
        const val = matrix[i][i] - sum;
        if (val < 0) {
          // If matrix is not positive-definite, decomposition fails.
          // Use a small positive number to prevent sqrt(negative).
          L[i][j] = 1e-6;
        } else {
          L[i][j] = Math.sqrt(val);
        }
      } else {
        if (L[j][j] === 0) {
            L[i][j] = 0;
        } else {
            L[i][j] = (matrix[i][j] - sum) / L[j][j];
        }
      }
    }
  }
  return L;
}


/**
 * Generate a standard normal random variate using Box-Muller transform
 * @returns {number} Standard normal random value
 */
function generateNormal() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Run a single Monte Carlo simulation path using the 7-factor model.
 * @param {Object} params - Simulation parameters
 * @returns {Object} Path data including values, returns, and success flags
 */
function simulatePath(params, simIndex = 0) {
  const {
    years,
    initialValue,
    spendingRate,
    spendingGrowth,
    // 7-Factor Model Inputs
    assetAssumptions,
    portfolioWeights,
    correlationMatrix,
    // Optional Stress Test Inputs
    equityShock = 0, // Note: This needs to be applied thoughtfully to the correct asset class
    cpiShift = 0,
    grantTargets = []
  } = params;

  // Define asset class order to match correlation matrix and weights
  const ASSET_CLASSES = [
    'privateEquity',
    'publicEquity',
    'publicFixedIncome',
    'privateCredit',
    'realAssets',
    'diversifying',
    'cashShortTerm',
  ];
  const numAssets = ASSET_CLASSES.length;

  // Pre-calculate Cholesky decomposition of the correlation matrix
  const L = cholesky(correlationMatrix);

  const path = [initialValue]; // Start path with initial value
  const spendingPath = [];
  const successPath = [];
  const returnsPath = [];
  
  if (simIndex === 0) {
    console.log('\n--- Debugging First Simulation Path ---');
  }

  for (let year = 0; year < years; year++) {
    // Spending for the current year is based on the portfolio value at the START of the year (end of last year)
    const valueAtStartOfYear = path[year];
    const spendingForThisYear = valueAtStartOfYear * spendingRate;
    spendingPath.push(spendingForThisYear);

    // Check if portfolio can support spending target
    let meetsTarget = true;
    if (grantTargets[year] && valueAtStartOfYear < grantTargets[year]) {
      meetsTarget = false;
    }
    successPath.push(meetsTarget);

    // 1. Generate independent standard normal random variables
    const independentNormals = Array(numAssets).fill(0).map(generateNormal);

    // 2. Generate correlated standard normal variables using Cholesky matrix L
    const correlatedNormals = Array(numAssets).fill(0);
    for (let i = 0; i < numAssets; i++) {
      for (let j = 0; j < numAssets; j++) {
        correlatedNormals[i] += L[i][j] * independentNormals[j];
      }
    }

    // 3. Calculate the return for each asset class
    const assetReturns = {};
    ASSET_CLASSES.forEach((asset, i) => {
      const assumption = assetAssumptions[asset];
      if (!assumption) {
        assetReturns[asset] = 0;
        return;
      }
      let assetReturn = correlatedNormals[i] * assumption.sigma + assumption.mu;
      
      // Apply equity shock to public and private equity
      if ((asset === 'publicEquity' || asset === 'privateEquity') && equityShock !== 0) {
          assetReturn += equityShock;
      }
      
      assetReturns[asset] = assetReturn;
    });

    // 4. Calculate the total portfolio return as a weighted average of asset returns
    let portfolioReturn = 0;
    for (const asset of ASSET_CLASSES) {
      const weight = (portfolioWeights[asset] || 0) / 100; // Weights are in %, convert to decimal
      portfolioReturn += weight * (assetReturns[asset] || 0);
    }
    returnsPath.push(portfolioReturn);

    // 5. Update portfolio value: Value after spending grows by the portfolio return
    const valueAfterSpending = valueAtStartOfYear - spendingForThisYear;
    let valueAtEndOfYear = valueAfterSpending * (1 + portfolioReturn);

    // Prevent negative portfolio
    if (valueAtEndOfYear < 0) {
      valueAtEndOfYear = 0;
    }
    
    path.push(valueAtEndOfYear);

    if (simIndex === 0 && year < 5) { // Log first 5 years of the first simulation
      console.log(`  [Year ${year + 1}]`);
      console.log(`    Start Value: ${valueAtStartOfYear.toFixed(2)}`);
      console.log(`    Spending: ${spendingForThisYear.toFixed(2)}`);
      console.log(`    Return: ${(portfolioReturn * 100).toFixed(2)}%`);
      console.log(`    End Value: ${valueAtEndOfYear.toFixed(2)}`);
    }
  }

  const finalValue = path[path.length - 1];
  successPath.push(finalValue >= (grantTargets[years] || 0));

  return {
    path,
    spendingPath,
    successPath,
    returnsPath,
    finalValue,
    success: successPath.every(v => v)
  };
}

/**
 * Run full Monte Carlo simulation with multiple paths
 * @param {Object} params - Simulation parameters (includes numSimulations)
 * @returns {Object} Aggregated results from all paths
 */
function runSimulation(params) {
  const { numSimulations = 1000, years, ...otherParams } = params;

  const paths = [];
  const finalValues = [];
  const allPortfolioReturns = [];
  const allSpendingPaths = [];
  let successCount = 0;

  for (let i = 0; i < numSimulations; i++) {
    const result = simulatePath({ years, ...otherParams }, i);
    paths.push(result.path);
    finalValues.push(result.finalValue);
    allPortfolioReturns.push(result.returnsPath);
    allSpendingPaths.push(result.spendingPath);
    if (result.success) {
      successCount++;
    }
  }

  const sortedValues = [...finalValues].sort((a, b) => a - b);
  const n = sortedValues.length;

  // Log spending paths to verify they're varying
  if (allSpendingPaths.length > 0) {
    console.log('\n--- Spending Paths Debug (Backend) ---');
    console.log('Total spending paths:', allSpendingPaths.length);
    console.log('First spending path:', allSpendingPaths[0]);
    console.log('Second spending path:', allSpendingPaths[1]);
    console.log('Last spending path:', allSpendingPaths[allSpendingPaths.length - 1]);
    
    // Check year 1 spending across all paths
    const year1Spending = allSpendingPaths.map(path => path[0]);
    console.log('Year 1 spending - Min:', Math.min(...year1Spending), 'Max:', Math.max(...year1Spending));
    
    if (allSpendingPaths[0].length > 1) {
      const year2Spending = allSpendingPaths.map(path => path[1]);
      console.log('Year 2 spending - Min:', Math.min(...year2Spending), 'Max:', Math.max(...year2Spending));
    }
  }

  return {
    paths,
    finalValues,
    portfolioReturns: allPortfolioReturns,
    spendingPaths: allSpendingPaths,
    median: percentile(sortedValues, 50),
    percentile10: percentile(sortedValues, 10),
    percentile25: percentile(sortedValues, 25),
    percentile75: percentile(sortedValues, 75),
    percentile90: percentile(sortedValues, 90),
    average: finalValues.reduce((a, b) => a + b, 0) / n,
    stdDev: standardDeviation(finalValues),
    successRate: successCount / numSimulations,
    minValue: sortedValues[0],
    maxValue: sortedValues[n - 1],
    successCount,
    totalPaths: numSimulations,
  };
}

/**
 * Calculate percentile from sorted array
 * @param {Array<number>} sortedArray - Sorted array of values
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Value at given percentile
 */
function percentile(sortedArray, percentile) {
  if (!sortedArray || sortedArray.length === 0) return 0;
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedArray[lower];
  }
  
  // Handle cases where index is out of bounds
  if (lower < 0 || upper >= sortedArray.length) return 0;

  const weight = index % 1;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Calculate standard deviation
 * @param {Array<number>} values - Array of values
 * @returns {number} Standard deviation
 */
function standardDeviation(values) {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate year-by-year success probability
 * @param {Array<Array<number>>} paths - All simulation paths
 * @param {Array<number>} grantTargets - Annual target values
 * @returns {Array<number>} Success probability for each year
 */
function calculateSuccessByYear(paths, grantTargets) {
  if (!grantTargets || grantTargets.length === 0) {
    return paths[0] ? paths[0].map(() => 1) : [];
  }

  const numYears = Math.min(paths[0]?.length || 0, grantTargets.length);
  const successByYear = [];

  for (let year = 0; year < numYears; year++) {
    let successCount = 0;
    for (const path of paths) {
      if (path && path[year] >= (grantTargets[year] || 0)) {
        successCount++;
      }
    }
    successByYear.push(paths.length > 0 ? successCount / paths.length : 0);
  }

  return successByYear;
}

module.exports = {
  runSimulation,
  simulatePath,
  calculateSuccessByYear,
  percentile,
  standardDeviation,
  generateNormal
};
