/**
 * Monte Carlo Simulation Service
 * Handles portfolio projections using stochastic modeling
 *
 * 7-Factor Correlated Model
 */

const jStat = require('jstat').jStat;

// Core asset definitions (using the defaults from old engine.ts for reference)
const ASSET_CLASSES = [
    { key: 'publicEquity', label: 'Public Equity', mean: 0.08, sd: 0.15 },
    { key: 'privateEquity', label: 'Private Equity', mean: 0.12, sd: 0.22 },
    { key: 'publicFixedIncome', label: 'Public Fixed Income', mean: 0.03, sd: 0.04 },
    { key: 'privateCredit', label: 'Private Credit', mean: 0.07, sd: 0.10 },
    { key: 'realAssets', label: 'Real Assets', mean: 0.05, sd: 0.09 },
    { key: 'diversifying', label: 'Diversifying Strategies', mean: 0.05, sd: 0.08 },
    { key: 'cashShortTerm', label: 'Cash/Short-Term', mean: 0.015, sd: 0.005 },
];

// CPI Assumptions (from old engine.ts)
const CPI_MEAN = 0.025;
const CPI_STD = 0.005;

class SimulationService {
    
    // --- UTILITY FUNCTIONS FOR CORRELATION AND RANDOMNESS (Ported from old engine.ts) ---

    /**
     * Cholesky Decomposition
     * @param {number[][]} A - Symmetric positive-definite matrix (Correlation Matrix)
     * @returns {number[][]} Lower triangular matrix L
     */
    static cholesky(A) {
        const n = A.length;
        const L = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let sum = 0;
                for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
                if (i === j) L[i][j] = Math.sqrt(Math.max(A[i][i] - sum, 0));
                else L[i][j] = (1 / L[j][j]) * (A[i][j] - sum);
            }
        }
        return L;
    }

    /**
     * Standard Normal Variate Generator (Wrapper for jStat)
     * @returns {number} A standard normal variate (mean=0, sd=1)
     */
    static normalRand() {
        return jStat.normal.sample(0, 1);
    }

    /**
     * Generate 7 Correlated Standard Normal Variates
     * @param {number[][]} L - Cholesky decomposed correlation matrix
     * @returns {number[]} Array of 7 correlated standard normal variates
     */
    static correlatedNormals(L) {
        const n = L.length;
        const z = Array.from({ length: n }, () => this.normalRand()); // 7 independent normals
        const x = Array(n).fill(0);
        
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let k = 0; k <= i; k++) sum += L[i][k] * z[k];
            x[i] = sum;
        }
        return x;
    }
    
    // --- CORE SIMULATION LOGIC ---

    /**
     * Run a single Monte Carlo simulation path (7-FACTOR)
     * @param {Object} params - Simulation parameters
     * @returns {Object} Path data including values, spending, and success flags
     */
    static simulatePath(params) {
        const {
            years,
            initialValue,
            spendingRate,
            spendingGrowth, // Simplified: Not used in old model, keeping for now
            assetAssumptions, // { publicEquity: { mu, sigma }, ... }
            portfolioWeights, // { publicEquity: 50, ... }
            correlationMatrix, // The 7x7 matrix
            equityShock, // Simplified: Need to expand to support array of shocks
            cpiShift, // Simplified: Need to expand to support array of shifts
            grantTargets = [],
            initialOperatingExpense = 0,
            initialGrant = 0,
            riskFreeRate = 2
        } = params;

        // --- PRE-PROCESSING ---
        
        // 1. Get 7 Asset Parameters (ensuring order matches the matrix)
        const assets = ASSET_CLASSES.map(a => {
            const defaults = assetAssumptions?.[a.key] || a;
            return {
                key: a.key,
                targetWeight: (portfolioWeights[a.key] ?? 0) / 100, // as decimal
                mean: defaults.mu ?? defaults.mean,
                sd: defaults.sigma ?? defaults.sd
            };
        });
        const assetMeans = assets.map(a => a.mean);
        const assetSDs = assets.map(a => a.sd);
        
        // 2. Cholesky Decomposition of the 7x7 matrix
        const L = this.cholesky(correlationMatrix);
        
        // 3. Initialize 7 Portfolio Sleeves
        let sleeves = assets.map(a => a.targetWeight * initialValue);
        let portfolioValue = initialValue;
        let cpiIndex = 1; // Base 1 at year 0
        
        // --- PATH TRACKING ARRAYS ---
        const path = [];
        const spendingPath = [];
        const cpiRates = [];
        const portRets = [];
        
        // Calculate inflation rate from risk-free rate (simplified assumption)
        const inflation = (riskFreeRate / 100) || 0.02;

        // --- SIMULATION LOOP ---
        
        for (let y = 0; y < years; y++) {
            path.push(portfolioValue); // Value at the start of the year

            // 1. Generate CPI
            const cpi = Math.max(-0.02, this.normalRand() * CPI_STD + CPI_MEAN);
            cpiRates.push(cpi);
            cpiIndex *= (1 + cpi);

            // 2. Generate 7 Correlated Returns (Standard Normals)
            const z = this.correlatedNormals(L); 
            
            // 3. Calculate 7 Asset Returns (R_i = mu_i + z_i * sigma_i)
            let adjReturns = z.map((zi, i) => assetMeans[i] + zi * assetSDs[i]);
            
            // 4. Apply Shocks (Simplified to single shock for now)
            if (equityShock && (y + 1) === params.equityShockYear) {
                 // Apply shock to Public Equity (index 0)
                 const equityIndex = ASSET_CLASSES.findIndex(a => a.key === 'publicEquity');
                 if (equityIndex >= 0) {
                     adjReturns[equityIndex] = (adjReturns[equityIndex] + 1) * (1 + equityShock / 100) - 1;
                 }
            }

            // 5. Apply Returns to Sleeves
            sleeves = sleeves.map((v, i) => v * (1 + adjReturns[i]));

            // 6. Calculate Effective Portfolio Return (for tracking)
            const totalAfterReturns = sleeves.reduce((a, b) => a + b, 0);
            const totalBeforeReturns = portfolioValue;
            const portfolioReturnEffective = (totalAfterReturns / totalBeforeReturns) - 1;
            portRets.push(portfolioReturnEffective);


            // 7. Calculate Spending: Policy + OpEx + Grants 
            const policySpending = portfolioValue * spendingRate; // Use CURRENT portfolio value, not initial
            const operatingExpense = initialOperatingExpense * Math.pow(1 + inflation, y); // Inflated OpEx
            const grantAmount = Array.isArray(grantTargets) && grantTargets.length > y && grantTargets[y] > 0
                ? grantTargets[y]  // Use manual grant target if provided
                : initialGrant * Math.pow(1 + inflation, y); // Otherwise use inflated initial grant
            
            const totalSpending = policySpending + operatingExpense + grantAmount;
            
            // Withdraw from portfolio (proportional to current sleeve values)
            const ratio = totalAfterReturns > 0 ? (totalSpending / totalAfterReturns) : 0;
            if (ratio > 0) {
                sleeves = sleeves.map(v => Math.max(0, v * (1 - ratio)));
            }
            
            // 8. Rebalance (Simplified: annual rebalance to target weights)
            const totalEndValue = sleeves.reduce((a, b) => a + b, 0);
            sleeves = assets.map(a => a.targetWeight * totalEndValue);

            // 9. Update Portfolio Value
            portfolioValue = totalEndValue;

            // 10. Track spending for this year
            spendingPath.push(totalSpending);
        }

        // Final value is the last calculated portfolioValue
        path.push(portfolioValue); 
        
        // Success logic: endowment is successful if it can sustain spending without depletion
        // Check if portfolio value never goes to zero or negative (can afford all spending)
        let pathSuccess = true;
        for (let year = 0; year < years; year++) {
            const yearEndValue = path[year + 1]; // Value at end of year 'year'
            if (yearEndValue <= 0) {
                pathSuccess = false;
                break;
            }
        }
        const success = pathSuccess;

        return {
            path,
            spendingPath,
            finalValue: portfolioValue,
            success,
            portfolioReturns: portRets,
            cpiRates,
            cpiIndex
        };
    }

    /**
     * Run full Monte Carlo simulation with multiple paths (7-FACTOR)
     * @param {Object} params - Simulation parameters (includes numSimulations)
     * @returns {Object} Aggregated results from all paths
     */
    static runSimulation(params) {
        const {
            numSimulations = 10000,
            years,
            ...otherParams
        } = params;

        const paths = [];
        const returns = [];
        const finalValues = [];
        let successCount = 0;

        // Run each simulation path
        for (let sim = 0; sim < numSimulations; sim++) {
            const result = this.simulatePath({ years, ...otherParams });
            paths.push(result.path);
            returns.push(...result.portfolioReturns);
            finalValues.push(result.finalValue);
            if (result.success) successCount++;
        }

        // Calculate statistics
        const sortedValues = [...finalValues].sort((a, b) => a - b);
        const n = sortedValues.length;
        const nReturns = returns.length;

        // Calculate Annualized Return and Volatility across ALL return samples
        const avgReturn = returns.reduce((a, b) => a + b, 0) / nReturns;
        const stdDevReturn = this.standardDeviation(returns); // Annualized Volatility
        
        const summary = {
            paths,
            finalValues,
            median: this.percentile(sortedValues, 50),
            percentile10: this.percentile(sortedValues, 10),
            percentile25: this.percentile(sortedValues, 25),
            percentile75: this.percentile(sortedValues, 75),
            percentile90: this.percentile(sortedValues, 90),
            average: finalValues.reduce((a, b) => a + b, 0) / n,
            // 🎯 The core fix: annualized return and volatility come from the 7-factor paths
            medianAnnualizedReturn: avgReturn, 
            annualizedVolatility: stdDevReturn,
            
            stdDev: this.standardDeviation(finalValues), // Std Dev of final values
            successRate: successCount / numSimulations,
            minValue: Math.min(...finalValues),
            maxValue: Math.max(...finalValues),
            successCount,
            totalPaths: numSimulations
        };
        
        // NOTE: Sharpe, Sortino, Drawdown, etc. are typically calculated on the frontend 
        // using the full path data or require the risk-free rate and down-side deviation, 
        // which are not currently computed here. Assuming these metrics are either calculated 
        // on the frontend or computed by helper functions in this service (which aren't shown).
        // For now, we return the core stats.

        return summary;
    }

    // --- HELPER FUNCTIONS (Remains the same) ---
    
    /**
     * Calculate percentile from sorted array
     */
    static percentile(sortedArray, percentile) {
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;

        if (lower === upper) {
            return sortedArray[lower];
        }

        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }

    /**
     * Calculate standard deviation
     */
    static standardDeviation(values) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }

    /**
     * Calculate year-by-year success probability
     */
    static calculateSuccessByYear(paths, grantTargets) {
        if (!paths || !paths.length) return [];
        
        // Use the length of the shortest path or the target length
        const numYears = Math.min(paths[0].length - 1, grantTargets ? grantTargets.length : paths[0].length - 1);
        const successByYear = [];

        for (let year = 0; year < numYears; year++) {
            let successCount = 0;
            for (const path of paths) {
                // Check if portfolio value at end of year is positive (can sustain spending)
                const yearEndValue = path[year + 1];
                if (yearEndValue > 0) { 
                    successCount++;
                }
            }
            successByYear.push(successCount / paths.length);
        }

        return successByYear;
    }

    /**
     * Calculate final value summary statistics
     */
    static getFinalValueSummary(paths, initialValue, grantTargets) {
        if (!paths || !paths.length) return {};

        const finalValues = paths.map(path => path[path.length - 1]);
        const sortedValues = [...finalValues].sort((a, b) => a - b);
        const n = sortedValues.length;

        // Calculate success rate: endowment is successful if it can sustain spending without depletion
        let successCount = 0;
        for (const path of paths) {
            let pathSuccess = true;
            const numYears = path.length - 1; // path has length years+1
            for (let year = 0; year < numYears; year++) {
                const yearEndValue = path[year + 1];
                if (yearEndValue <= 0) {
                    pathSuccess = false;
                    break;
                }
            }
            if (pathSuccess) successCount++;
        }
        const successRate = successCount / n;

        return {
            median: this.percentile(sortedValues, 50),
            percentile10: this.percentile(sortedValues, 10),
            percentile25: this.percentile(sortedValues, 25),
            percentile75: this.percentile(sortedValues, 75),
            percentile90: this.percentile(sortedValues, 90),
            average: finalValues.reduce((a, b) => a + b, 0) / n,
            successRate,
            minValue: Math.min(...finalValues),
            maxValue: Math.max(...finalValues)
        };
    }
}

module.exports = SimulationService;