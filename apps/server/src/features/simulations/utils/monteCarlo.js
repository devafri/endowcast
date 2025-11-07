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
    grantTargets = [],
    opExRate = 0.005 // Default 0.5% operating expense rate
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
    
    // Calculate total spending: policy spending + operating expenses + grants
    const policySpending = valueAtStartOfYear * spendingRate;
    const opExSpending = valueAtStartOfYear * opExRate;
    const grantSpending = grantTargets[year] || 0;
    const totalSpending = policySpending + opExSpending + grantSpending;
    
    spendingPath.push(totalSpending);

    // Check if portfolio can support spending target (success = portfolio value > 0)
    let meetsTarget = valueAtStartOfYear > 0;
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
    const valueAfterSpending = valueAtStartOfYear - totalSpending;
    let valueAtEndOfYear = valueAfterSpending * (1 + portfolioReturn);

    // Prevent negative portfolio
    if (valueAtEndOfYear < 0) {
      valueAtEndOfYear = 0;
    }
    
    path.push(valueAtEndOfYear);

    if (simIndex === 0 && year < 5) { // Log first 5 years of the first simulation
      console.log(`  [Year ${year + 1}]`);
      console.log(`    Start Value: ${valueAtStartOfYear.toFixed(2)}`);
      console.log(`    Policy Spending: ${(policySpending).toFixed(2)}`);
      console.log(`    OpEx: ${(opExSpending).toFixed(2)}`);
      console.log(`    Grants: ${(grantSpending).toFixed(2)}`);
      console.log(`    Total Spending: ${totalSpending.toFixed(2)}`);
      console.log(`    Return: ${(portfolioReturn * 100).toFixed(2)}%`);
      console.log(`    End Value: ${valueAtEndOfYear.toFixed(2)}`);
    }
  }

  const finalValue = path[path.length - 1];
  successPath.push(finalValue > 0);

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
/**
 * Generate benchmark paths for comparison
 * @param {Object} params - Benchmark parameters
 * @returns {Array<Array<number>>} Array of benchmark paths
 */
function generateBenchmarkPaths({ years, numSimulations, initialValue, benchmarkType, benchmarkValue, inflationRate, spendingRate, investmentExpenseRate }) {
  const paths = [];
  
  // Calculate net growth rate: benchmark return - spending rate - investment expense rate
  const spendingRateDecimal = spendingRate || 0;
  const invExpenseRate = investmentExpenseRate || 0;
  const totalDragRate = spendingRateDecimal + invExpenseRate;
  
  for (let i = 0; i < numSimulations; i++) {
    const path = [initialValue];
    
    for (let year = 0; year < years; year++) {
      const prevValue = path[year];
      
      // Calculate benchmark growth rate
      let benchmarkGrowthRate;
      if (benchmarkType === 'cpi_plus') {
        // CPI + fixed percentage (e.g., CPI + 6%)
        const cpiRate = inflationRate || 0.02;
        benchmarkGrowthRate = cpiRate + benchmarkValue;
      } else if (benchmarkType === 'fixed') {
        // Fixed percentage
        benchmarkGrowthRate = benchmarkValue;
      } else {
        // Default to CPI + benchmark value
        benchmarkGrowthRate = (inflationRate || 0.02) + benchmarkValue;
      }
      
      // Subtract spending and investment expense rates from benchmark
      // Example: CPI + 6% - 4.5% spending - 1% inv expense = CPI + 0.5%
      const netGrowthRate = benchmarkGrowthRate - totalDragRate;
      
      // Add some randomness (±0.5% standard deviation) to make it more realistic
      const noise = generateNormal() * 0.005;
      const nextValue = prevValue * (1 + netGrowthRate + noise);
      
      path.push(Math.max(0, nextValue));
    }
    
    paths.push(path);
  }
  
  return paths;
}

/**
 * Generate corpus paths (CPI growth only)
 * @param {Object} params - Corpus parameters
 * @returns {Array<Array<number>>} Array of corpus paths
 */
function generateCorpusPaths({ years, numSimulations, initialValue, inflationRate }) {
  const paths = [];
  const cpiRate = inflationRate || 0.02;
  
  for (let i = 0; i < numSimulations; i++) {
    const path = [initialValue];
    
    for (let year = 0; year < years; year++) {
      const prevValue = path[year];
      // CPI growth with small noise
      const noise = generateNormal() * 0.002;
      const nextValue = prevValue * (1 + cpiRate + noise);
      path.push(nextValue);
    }
    
    paths.push(path);
  }
  
  return paths;
}

/**
 * Run multiple Monte Carlo simulations for a given set of parameters.
 * @param {Object} params - Simulation parameters
 * @returns {Object} Aggregated simulation results
 */
function runSimulation(params) {
  const { numSimulations = 10000, years, benchmark, corpus, ...otherParams } = params;

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

  // Generate benchmark paths if enabled
  let benchmarkPaths = [];
  if (benchmark && benchmark.enabled) {
    console.log('[MonteCarlo] Generating benchmark paths:', benchmark);
    benchmarkPaths = generateBenchmarkPaths({
      years,
      numSimulations,
      initialValue: params.initialValue,
      benchmarkType: benchmark.type,
      benchmarkValue: benchmark.value,
      inflationRate: params.inflationRate || params.riskFreeRate || 0.02,
      spendingRate: params.spendingRate || 0,
      investmentExpenseRate: params.opExRate || 0
    });
  }

  // Generate corpus paths if enabled
  let corpusPaths = [];
  if (corpus && corpus.enabled && corpus.initialValue > 0) {
    console.log('[MonteCarlo] Generating corpus paths:', corpus);
    corpusPaths = generateCorpusPaths({
      years,
      numSimulations,
      initialValue: corpus.initialValue,
      inflationRate: params.inflationRate || params.riskFreeRate || 0.02
    });
  }

  const sortedValues = [...finalValues].sort((a, b) => a - b);
  const n = sortedValues.length;

  // Log spending paths to verify they're varying
  if (allSpendingPaths.length > 0) {
    console.log('\n--- Total Organization Spending Paths Debug (Backend) ---');
    console.log('Total spending paths:', allSpendingPaths.length);
    console.log('First spending path:', allSpendingPaths[0]);
    console.log('Second spending path:', allSpendingPaths[1]);
    console.log('Last spending path:', allSpendingPaths[allSpendingPaths.length - 1]);
    
    // Check year 1 spending across all paths
    const year1Spending = allSpendingPaths.map(path => path[0]);
    console.log('Year 1 total spending - Min:', Math.min(...year1Spending), 'Max:', Math.max(...year1Spending));
    
    if (allSpendingPaths[0].length > 1) {
      const year2Spending = allSpendingPaths.map(path => path[1]);
      console.log('Year 2 total spending - Min:', Math.min(...year2Spending), 'Max:', Math.max(...year2Spending));
    }
  }

  return {
    paths,
    finalValues,
    portfolioReturns: allPortfolioReturns,
    spendingPaths: allSpendingPaths,
    benchmarks: benchmarkPaths,
    corpusPaths: corpusPaths,
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
