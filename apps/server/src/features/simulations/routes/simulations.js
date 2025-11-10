const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, prisma } = require('../middleware/auth');
const { trackSimulationUsage } = require('../../../shared/middleware/usage');
const monteCarlo = require('../utils/monteCarlo');

const router = express.Router();

// All simulation routes require authentication
router.use(authenticateToken);

/**
 * POST /api/simulations/execute
 * Execute a Monte Carlo simulation immediately and return results
 * This is the new backend simulation endpoint for the 7-Factor Model
 */
router.post('/execute', trackSimulationUsage, [
  // --- CORE FIELDS ---
  body('years').isInt({ min: 1, max: 100 }).withMessage('Years must be 1-100'),
  body('startYear').isInt({ min: 1900, max: 2100 }).withMessage('Valid start year required'),
  body('initialValue').isFloat({ min: 0 }).withMessage('Initial value must be positive'),
  body('spendingRate').isFloat({ min: 0, max: 1 }).withMessage('Spending rate must be 0-1'),
  body('spendingGrowth').isFloat({ min: -0.5, max: 0.5 }).withMessage('Spending growth must be reasonable'),

  // --- 🎯 NEW 7-FACTOR VALIDATION ---
  body('assetAssumptions').exists().isObject().withMessage('Asset assumptions object is required'),
  body('correlationMatrix').exists().isArray().withMessage('Correlation matrix is required and must be an array'),
  body('portfolioWeights').exists().isObject().withMessage('Portfolio weights object is required'),
  
  // --- OPTIONAL FIELDS ---
  body('equityShock').optional({ nullable: true }).isFloat({ min: -1, max: 0 }).withMessage('Equity shock must be between -1 and 0'),
  body('cpiShift').optional({ nullable: true }).isFloat({ min: -1, max: 1 }).withMessage('CPI shift must be between -1 and 1'),
  body('grantTargets').optional().isArray().withMessage('Grant targets must be an array'),
  body('numSimulations').optional().isInt({ min: 100, max: 10000 }).withMessage('Simulations must be 100-10000')

], async (req, res) => {
  console.log('*** 7-FACTOR ROUTE IS ACTIVE! ***')
  try {
    // Check validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('[Validation Failed] Errors:', errors.array());
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    console.log('🔍 [SERVER] RAW REQUEST BODY benchmark:', req.body.benchmark);
    console.log('🔍 [SERVER] RAW REQUEST BODY corpus:', req.body.corpus);

    const userId = req.user.userId;
    const organizationId = req.user.organizationId;

    const {
      name,
      years,
      startYear,
      initialValue,
      spendingRate,
      spendingGrowth = 0,
      
      // 🎯 NEW DESTRUCTURING FOR 7-FACTOR MODEL
      assetAssumptions,
      correlationMatrix,
      portfolioWeights,
  inflationRate = null,
      
      equityShock = 0,
      cpiShift = 0,
      grantTargets = null,
      investmentExpenseRate = 0.005, // Default 0.5%
      numSimulations = 10000,
      
      // Additional spending parameters
      initialOperatingExpense = 0,
      initialGrant = 0,
      
      // Benchmark and corpus configuration
      benchmark = null,
      corpus = null
    } = req.body;
    
    // Safety check for riskFreeRate from another input field, falling back to 2%
    const rfPct = typeof req.body.riskFreeRate === 'number' ? req.body.riskFreeRate : 2;
    const rf = rfPct > 1 ? rfPct / 100 : rfPct;
    const inflPct = typeof inflationRate === 'number'
      ? inflationRate
      : (typeof req.body.inflationRate === 'number' ? req.body.inflationRate : rfPct);
    const infl = inflPct > 1 ? inflPct / 100 : inflPct;

    console.log('🔍 [SERVER] RECEIVED BENCHMARK:', benchmark);
    console.log('🔍 [SERVER] RECEIVED CORPUS:', corpus);

    console.log(`[Simulations] Executing ${numSimulations} paths for ${years} years (7-Factor Model)`);
    const startTime = Date.now();

    // Run Monte Carlo simulation
    const simulationParams = {
      years,
      startYear,
      initialValue: parseFloat(initialValue),
      spendingRate: parseFloat(spendingRate),
      spendingGrowth: parseFloat(spendingGrowth),
      
      // 🎯 PASSING NEW 7-FACTOR PARAMETERS TO MONTE CARLO UTILS
      assetAssumptions,
      correlationMatrix,
      portfolioWeights,
      
      equityShock: parseFloat(equityShock),
      cpiShift: parseFloat(cpiShift),
      grantTargets: grantTargets ? grantTargets.map(v => parseFloat(v)) : [],
      opExRate: parseFloat(investmentExpenseRate), // Operating expense rate
      numSimulations: parseInt(numSimulations),
      
      // Spending parameters for benchmark comparison
      initialOperatingExpense: parseFloat(initialOperatingExpense) || 0,
      initialGrant: parseFloat(initialGrant) || 0,
      
      // Pass through benchmark and corpus configuration
      riskFreeRate: rf,
      inflationRate: infl,
      benchmark: benchmark,
      corpus: corpus
    };

    // NOTE: The `monteCarlo.runSimulation` utility must be updated to use 7-factor params internally.
    const results = monteCarlo.runSimulation(simulationParams);
    console.log('🔍 [SERVER] MONTE CARLO RESULTS - benchmarks:', results.benchmarks?.length || 0, 'paths');
    console.log('🔍 [SERVER] MONTE CARLO RESULTS - corpusPaths:', results.corpusPaths?.length || 0, 'paths');
    const elapsedMs = Date.now() - startTime;

    // Calculate year-by-year success
    const successByYear = monteCarlo.calculateSuccessByYear(results.paths, simulationParams.grantTargets);

    // --- Derived analytics for KeyMetrics.vue and other sections ---
    // Helpers (no change, they operate on results, not inputs)
    const percentile = (arr, p) => {
      if (!arr || !arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor((p / 100) * (sorted.length - 1));
      return sorted[idx];
    };
    const annualizedReturn = (rets) => {
      if (!rets || !rets.length) return 0;
      let prod = 1;
      for (const r of rets) prod *= (1 + r);
      return Math.pow(prod, 1 / rets.length) - 1;
    };
    const stdev = (rets) => {
      if (!rets || !rets.length) return 0;
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const variance = rets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rets.length;
      return Math.sqrt(variance);
    };
    const sortinoRatio = (rets, target) => {
      if (!rets || !rets.length) return 0;
      const downside = rets.filter(r => (r - target) < 0).map(r => (r - target) * (r - target));
      const dd = downside.length ? Math.sqrt(downside.reduce((a, b) => a + b, 0) / downside.length) : 0;
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      return dd > 0 ? (mean - target) / dd : 0;
    };
    const maxDrawdown = (path) => {
      if (!path || !path.length) return 0;
      let peak = path[0];
      let mdd = 0;
      for (const v of path) {
        if (v > peak) peak = v; else mdd = Math.max(mdd, (peak - v) / peak);
      }
      return mdd;
    };

    // Compute per-simulation returns from paths (ignoring cash flows)
    const paths = Array.isArray(results.paths) ? results.paths : [];
    const perSimReturns = Array.isArray(results.portfolioReturns) ? results.portfolioReturns : [];

    console.log('[DEBUG] perSimReturns length:', perSimReturns.length);
    console.log('[DEBUG] perSimReturns[0]:', perSimReturns[0]?.slice(0, 3));

    // Per-simulation CAGR (annualized returns)
    const perSimCAGR = perSimReturns.map(annualizedReturn).filter((x) => isFinite(x));
    perSimCAGR.sort((a, b) => a - b);
    const medianCAGR = perSimCAGR.length ? perSimCAGR[Math.floor(perSimCAGR.length / 2)] : 0;
    const cagr10 = percentile(perSimCAGR, 10);
    const cagr25 = percentile(perSimCAGR, 25);
    const cagr75 = percentile(perSimCAGR, 75);
    const cagr90 = percentile(perSimCAGR, 90);
    
    console.log('[DEBUG] perSimCAGR length:', perSimCAGR.length);
    console.log('[DEBUG] cagr10, cagr25, cagr75, cagr90:', { cagr10, cagr25, cagr75, cagr90 });

    // Per-simulation annualized volatility
    const perSimVol = perSimReturns.map(stdev).filter((x) => isFinite(x));
    perSimVol.sort((a, b) => a - b);
    const medianVol = perSimVol.length ? perSimVol[Math.floor(perSimVol.length / 2)] : 0;
    const vol10 = percentile(perSimVol, 10);
    const vol25 = percentile(perSimVol, 25);
    const vol75 = percentile(perSimVol, 75);
    const vol90 = percentile(perSimVol, 90);
    
    console.log('[DEBUG] perSimVol length:', perSimVol.length);
    console.log('[DEBUG] vol10, vol25, vol75, vol90:', { vol10, vol25, vol75, vol90 });

    // Sharpe and Sortino (risk-free as decimal)
    const perSimSharpe = perSimReturns.map((r) => {
      const ar = annualizedReturn(r);
      const sd = stdev(r);
      return (isFinite(ar) && isFinite(sd) && sd > 0) ? (ar - rf) / sd : NaN;
    }).filter((x) => isFinite(x));
    perSimSharpe.sort((a, b) => a - b);
    const sharpeMedian = perSimSharpe.length ? perSimSharpe[Math.floor(perSimSharpe.length / 2)] : 0;
    const sharpe10 = percentile(perSimSharpe, 10);
    const sharpe25 = percentile(perSimSharpe, 25);
    const sharpe75 = percentile(perSimSharpe, 75);
    const sharpe90 = percentile(perSimSharpe, 90);
    
    console.log('[DEBUG] perSimSharpe length:', perSimSharpe.length);
    console.log('[DEBUG] sharpe10, sharpe25, sharpe75, sharpe90:', { sharpe10, sharpe25, sharpe75, sharpe90 });

    const perSimSortino = perSimReturns.map((r) => sortinoRatio(r, rf)).filter((x) => isFinite(x));
    perSimSortino.sort((a, b) => a - b);
    const sortinoMedian = perSimSortino.length ? perSimSortino[Math.floor(perSimSortino.length / 2)] : 0;
    const sortino10 = percentile(perSimSortino, 10);
    const sortino25 = percentile(perSimSortino, 25);
    const sortino75 = percentile(perSimSortino, 75);
    const sortino90 = percentile(perSimSortino, 90);
    
    console.log('[DEBUG] perSimSortino length:', perSimSortino.length);
    console.log('[DEBUG] sortino10, sortino25, sortino75, sortino90:', { sortino10, sortino25, sortino75, sortino90 });

    // Median max drawdown
    const perSimMDD = paths.map(maxDrawdown).filter((x) => isFinite(x));
    perSimMDD.sort((a, b) => a - b);
    const medianMDD = perSimMDD.length ? perSimMDD[Math.floor(perSimMDD.length / 2)] : 0;

    // CVaR 95 based on final values
    const finals = results.finalValues || [];
    const sortedFinals = [...finals].sort((a, b) => a - b);
    const cutoff = Math.floor(sortedFinals.length * 0.05);
    const tail = sortedFinals.slice(0, cutoff);
    const cvar95 = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : 0;

    // Probability of loss (final < initial)
    const probabilityOfLoss = finals.length ? finals.filter(v => v < simulationParams.initialValue).length / finals.length : 0;

    // Inflation-adjusted preservation (median final vs inflation growth of initial)
  const inflFactor = Math.pow(1 + infl, simulationParams.years);
    const medianFinalValue = percentile(sortedFinals, 50);
    const inflationPreservationPct = (isFinite(medianFinalValue) && inflFactor > 0)
      ? (medianFinalValue / (simulationParams.initialValue * inflFactor)) * 100
      : 0;

    // Format response
    const customId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const responseData = {
      id: customId,
      timestamp: new Date().toISOString(),
      computeTimeMs: elapsedMs,
      yearLabels: Array.from({ length: years }, (_, i) => (startYear + i).toString()),
      metadata: {
        simulationCount: numSimulations,
        yearsProjected: years,
        initialPortfolioValue: initialValue,
        annualSpendingRate: (spendingRate * 100).toFixed(2)
      },
      inputs: {
        initialEndowment: initialValue,
        horizon: years,
        riskFreeRate: rfPct,
        inflationRate: inflPct
      },
      benchmark: benchmark || undefined,
      corpus: corpus || undefined,
      benchmarks: results.benchmarks || [],
      corpusPaths: results.corpusPaths || [],
      summary: {
        medianFinalValue: Math.round(results.median * 100) / 100,
        probabilityOfLoss: Number((probabilityOfLoss).toFixed(4)),
        medianAnnualizedReturn: Number((medianCAGR * 100).toFixed(2)),
        annualizedReturn10: Number((cagr10 * 100).toFixed(2)),
        annualizedReturn25: Number((cagr25 * 100).toFixed(2)),
        annualizedReturn75: Number((cagr75 * 100).toFixed(2)),
        annualizedReturn90: Number((cagr90 * 100).toFixed(2)),
        annualizedVolatility: Number((medianVol * 100).toFixed(2)),
        annualizedVolatility10: Number((vol10 * 100).toFixed(2)),
        annualizedVolatility25: Number((vol25 * 100).toFixed(2)),
        annualizedVolatility75: Number((vol75 * 100).toFixed(2)),
        annualizedVolatility90: Number((vol90 * 100).toFixed(2)),
        sharpeMedian: Number(sharpeMedian.toFixed(2)),
        sharpe10: Number(sharpe10.toFixed(2)),
        sharpe25: Number(sharpe25.toFixed(2)),
        sharpe75: Number(sharpe75.toFixed(2)),
        sharpe90: Number(sharpe90.toFixed(2)),
        sortino: Number(sortinoMedian.toFixed(2)),
        sortino10: Number(sortino10.toFixed(2)),
        sortino25: Number(sortino25.toFixed(2)),
        sortino75: Number(sortino75.toFixed(2)),
        sortino90: Number(sortino90.toFixed(2)),
        medianMaxDrawdown: Number(medianMDD.toFixed(4)),
        cvar95: Math.round(cvar95 * 100) / 100,
        riskFreeRate: rfPct,
  inflationRate: inflPct,
        inflationPreservationPct: Number(inflationPreservationPct.toFixed(1)),
        finalValues: {
          percentile10: Math.round(results.percentile10 * 100) / 100,
          percentile25: Math.round(results.percentile25 * 100) / 100,
          percentile75: Math.round(results.percentile75 * 100) / 100,
          percentile90: Math.round(results.percentile90 * 100) / 100
        },
        success: {
          probability: (results.successRate * 100).toFixed(2) + '%',
          count: results.successCount,
          total: numSimulations,
          byYear: successByYear.map(p => (p * 100).toFixed(2) + '%')
        }
      },
      paths: results.paths,
      spendingPolicy: results.spendingPaths,
      pathsAvailable: true,
      note: null
    };

    console.log('[DEBUG] Summary object:', responseData.summary);

    // Save simulation to database
    let savedSimulationId = customId;
    
    try {
      // Avoid writing new schema fields (assetAssumptions/correlationMatrix) into Simulation
      // if the production database hasn't been migrated yet. Save core fields and create
      // the portfolio relation with weights; advanced 7-factor objects are stored on the
      // Portfolio model in newer schemas.
      const savedSimulation = await prisma.simulation.create({
        data: {
          name,
          userId,
          organizationId,
          years,
          startYear,
          initialValue: simulationParams.initialValue,
          spendingRate: simulationParams.spendingRate,
          spendingGrowth: simulationParams.spendingGrowth,
          // Legacy 2-factor model fields (NOT NULL in older production schemas)
          // Provide defaults so creation doesn't fail on old DB schema
          equityReturn: 0.07,      // Default 7% for backward compatibility
          bondReturn: 0.03,        // Default 3% for backward compatibility
          equityVolatility: 0.15,  // Default 15% volatility
          bondVolatility: 0.05,    // Default 5% volatility
          correlation: 0.3,        // Default 0.3 correlation between equity and bonds
          // Don't set assetAssumptions/correlationMatrix here to remain compatible with older DBs
          equityShock: simulationParams.equityShock || null,
          cpiShift: simulationParams.cpiShift || null,
          grantTargets: grantTargets ? JSON.stringify(grantTargets) : null,
          results: JSON.stringify(responseData), // Save the full response
          summary: JSON.stringify(responseData.summary),
          isCompleted: true,
          runCount: 1,
          portfolio: {
            create: {
              name: `Portfolio for ${name}`,
              userId,
              // Legacy 2-factor model fields (for backward compatibility)
              equityAllocation: (simulationParams.portfolioWeights.publicEquity || 0) + 
                               (simulationParams.portfolioWeights.privateEquity || 0),
              bondAllocation: (simulationParams.portfolioWeights.publicFixedIncome || 0) + 
                             (simulationParams.portfolioWeights.privateCredit || 0),
              // 7-factor model fields (now fully supported after DB migration)
              publicEquity: simulationParams.portfolioWeights.publicEquity || 0,
              privateEquity: simulationParams.portfolioWeights.privateEquity || 0,
              publicFixedIncome: simulationParams.portfolioWeights.publicFixedIncome || 0,
              privateCredit: simulationParams.portfolioWeights.privateCredit || 0,
              realAssets: simulationParams.portfolioWeights.realAssets || 0,
              diversifying: simulationParams.portfolioWeights.diversifying || 0,
              cashShortTerm: simulationParams.portfolioWeights.cashShortTerm || 0,
              // Asset assumptions and correlation matrix for detailed 7-factor analysis
              assetAssumptions: simulationParams.assetAssumptions ? JSON.stringify(simulationParams.assetAssumptions) : null,
              correlationMatrix: simulationParams.correlationMatrix ? JSON.stringify(simulationParams.correlationMatrix) : null,
            }
          }
        }
      });

      savedSimulationId = savedSimulation.id; 
      responseData.id = savedSimulationId;

      console.log(`[Simulations] Saved simulation to DB in ${Date.now() - startTime}ms`);
    } catch (dbErr) {
      console.error('[Simulations] DB error (non-blocking):', dbErr.message);
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error('[Simulations/Execute] Error:', error);
    res.status(500).json({ error: 'Simulation failed', details: error.message });
  }
});

// ----------------------------------------------------------------------
// --- Validation Middleware for Persistent CRUD Operations ---
// ----------------------------------------------------------------------

// 🎯 UPDATED Validation for persistent POST/PUT operations
const validateSimulation = [
  body('name').trim().isLength({ min: 1 }).withMessage('Simulation name is required'),
  body('years').isInt({ min: 1, max: 30 }).withMessage('Years must be between 1 and 30'),
  body('startYear').isInt({ min: 2000, max: 2100 }).withMessage('Start year must be between 2000 and 2100'),
  body('initialValue').isFloat({ min: 0 }).withMessage('Initial value must be positive'),
  body('spendingRate').isFloat({ min: 0, max: 1 }).withMessage('Spending rate must be between 0 and 1'),
  
  // 🎯 REMOVED old single-field validation (equityReturn, bondReturn, etc.)
  // We now validate the presence of the complex portfolio object
  body('portfolio').isObject().withMessage('Portfolio configuration object is required'),
  // We can add further validation checks for portfolio.assetAssumptions, etc., here if needed.
];

// GET /api/simulations
router.get('/', async (req, res) => {
  // No change needed here, as it fetches from the DB using the organization ID.
  try {
    const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    
    // Map frontend field names to Prisma schema field names
    const sortFieldMap = {
      'updated': 'updatedAt',
      'created': 'createdAt',
      'name': 'name',
      'initialValue': 'initialValue'
    };
    
    const mappedSortBy = sortFieldMap[sortBy] || sortBy;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orderBy = { [mappedSortBy]: sortOrder };

    // Use explicit select to avoid querying columns that may not exist in older DB schema
    let simulations = [];
    let total = 0;

    // Try the detailed select first. If the production DB hasn't been migrated
    // to include the JSON columns on `portfolios`, this query may fail. In that
    // case, fall back to a safer minimal select that omits the JSON fields.
    try {
      [simulations, total] = await Promise.all([
        prisma.simulation.findMany({
          where: { organizationId: req.user.organizationId },
          select: {
            id: true,
            name: true,
            userId: true,
            organizationId: true,
            years: true,
            startYear: true,
            initialValue: true,
            spendingRate: true,
            results: true,
            summary: true,
            isCompleted: true,
            runCount: true,
            createdAt: true,
            updatedAt: true,
            portfolio: {
              select: {
                id: true,
                publicEquity: true,
                privateEquity: true,
                publicFixedIncome: true,
                privateCredit: true,
                realAssets: true,
                diversifying: true,
                cashShortTerm: true,
                assetAssumptions: true,
                correlationMatrix: true
              }
            }
          },
          orderBy,
          skip,
          take: parseInt(limit),
        }),
        prisma.simulation.count({ where: { organizationId: req.user.organizationId } })
      ]);
    } catch (err) {
      // Log the error and retry with a minimal portfolio select (no JSON columns)
      console.warn('[Simulations] Detailed portfolio select failed, retrying safe fallback:', err && err.message ? err.message : String(err));
      [simulations, total] = await Promise.all([
        prisma.simulation.findMany({
          where: { organizationId: req.user.organizationId },
          select: {
            id: true,
            name: true,
            userId: true,
            organizationId: true,
            years: true,
            startYear: true,
            initialValue: true,
            spendingRate: true,
            results: true,
            summary: true,
            isCompleted: true,
            runCount: true,
            createdAt: true,
            updatedAt: true,
            portfolio: {
              select: {
                id: true,
                publicEquity: true,
                privateEquity: true,
                publicFixedIncome: true,
                privateCredit: true,
                realAssets: true,
                diversifying: true,
                cashShortTerm: true
              }
            }
          },
          orderBy,
          skip,
          take: parseInt(limit),
        }),
        prisma.simulation.count({ where: { organizationId: req.user.organizationId } })
      ]);
    }

    // Transform simulations to match frontend expectations
    const parsedSimulations = simulations.map(sim => {
      // Parse JSON fields with error handling
      let results, summary, assetAssumptions, correlationMatrix, grantTargets;
      try {
        results = typeof sim.results === 'string' ? JSON.parse(sim.results) : sim.results;
      } catch (e) {
        console.warn(`Failed to parse results for simulation ${sim.id}:`, e.message);
        results = null;
      }
      try {
        summary = typeof sim.summary === 'string' ? JSON.parse(sim.summary) : sim.summary;
      } catch (e) {
        console.warn(`Failed to parse summary for simulation ${sim.id}:`, e.message);
        summary = null;
      }
      try {
        assetAssumptions = typeof sim.assetAssumptions === 'string' ? JSON.parse(sim.assetAssumptions) : sim.assetAssumptions;
      } catch (e) {
        console.warn(`Failed to parse assetAssumptions for simulation ${sim.id}:`, e.message);
        assetAssumptions = null;
      }
      // Fallback: some deployments store 7-factor objects on the related portfolio record
      if (!assetAssumptions && sim.portfolio && sim.portfolio.assetAssumptions) {
        try {
          assetAssumptions = typeof sim.portfolio.assetAssumptions === 'string' ? JSON.parse(sim.portfolio.assetAssumptions) : sim.portfolio.assetAssumptions;
        } catch (e) {
          console.warn(`Failed to parse assetAssumptions from portfolio for simulation ${sim.id}:`, e.message);
          assetAssumptions = null;
        }
      }
      try {
        correlationMatrix = typeof sim.correlationMatrix === 'string' ? JSON.parse(sim.correlationMatrix) : sim.correlationMatrix;
      } catch (e) {
        console.warn(`Failed to parse correlationMatrix for simulation ${sim.id}:`, e.message);
        correlationMatrix = null;
      }
      if (!correlationMatrix && sim.portfolio && sim.portfolio.correlationMatrix) {
        try {
          correlationMatrix = typeof sim.portfolio.correlationMatrix === 'string' ? JSON.parse(sim.portfolio.correlationMatrix) : sim.portfolio.correlationMatrix;
        } catch (e) {
          console.warn(`Failed to parse correlationMatrix from portfolio for simulation ${sim.id}:`, e.message);
          correlationMatrix = null;
        }
      }
      try {
        grantTargets = typeof sim.grantTargets === 'string' ? JSON.parse(sim.grantTargets) : sim.grantTargets;
      } catch (e) {
        console.warn(`Failed to parse grantTargets for simulation ${sim.id}:`, e.message);
        grantTargets = null;
      }
      
      // Build portfolio weights from the portfolio relation
      const portfolioWeights = sim.portfolio ? {
        'Public Equity': sim.portfolio.publicEquity / 100,
        'Private Equity': sim.portfolio.privateEquity / 100,
        'Public Fixed Income': sim.portfolio.publicFixedIncome / 100,
        'Private Credit': sim.portfolio.privateCredit / 100,
        'Real Assets': sim.portfolio.realAssets / 100,
        'Diversifying': sim.portfolio.diversifying / 100,
        'Cash / Short-Term': sim.portfolio.cashShortTerm / 100
      } : {};

      // Build the inputs object that the frontend expects
      const inputs = {
        initialEndowment: sim.initialValue,
        spendingRate: sim.spendingRate, // Already a percentage, don't divide
        investmentExpenseRate: 0.5 / 100, // Default 0.5% as decimal
        years: sim.years,
        portfolioWeights,
        horizon: sim.years,
        simulations: 10000 // Default
      };

      // Fix summary percentage fields (convert to decimals)
      const fixPct = v => typeof v === 'number' ? v / 100 : v;
      const fixedSummary = summary ? {
        ...summary,
        // flatten finalValues percentiles if nested
        percentile10: summary.percentile10 ?? summary.finalValues?.percentile10,
        percentile25: summary.percentile25 ?? summary.finalValues?.percentile25,
        percentile75: summary.percentile75 ?? summary.finalValues?.percentile75,
        percentile90: summary.percentile90 ?? summary.finalValues?.percentile90,
        // scale percentage fields to decimals for UI formatting
        annualizedReturn10: fixPct(summary.annualizedReturn10),
        annualizedReturn25: fixPct(summary.annualizedReturn25),
        medianAnnualizedReturn: fixPct(summary.medianAnnualizedReturn),
        annualizedReturn75: fixPct(summary.annualizedReturn75),
        annualizedReturn90: fixPct(summary.annualizedReturn90),
        annualizedVolatility10: fixPct(summary.annualizedVolatility10),
        annualizedVolatility25: fixPct(summary.annualizedVolatility25),
        annualizedVolatility: fixPct(summary.annualizedVolatility),
        annualizedVolatility75: fixPct(summary.annualizedVolatility75),
        annualizedVolatility90: fixPct(summary.annualizedVolatility90)
      } : summary;

      return {
        ...sim,
        results,
        summary: fixedSummary,
        assetAssumptions,
        correlationMatrix,
        grantTargets,
        inputs // Add the inputs object
      };
    });

    res.json({
      simulations: parsedSimulations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    // Enhanced logging for debugging production 500s
    try {
      console.error('[Simulations] Get simulations error:', error && error.message ? error.message : String(error));
      console.error('[Simulations] Stack:', error && error.stack ? error.stack : 'no-stack');
      console.error('[Simulations] Request context:', {
        userId: req.user?.id || null,
        organizationId: req.user?.organizationId || null,
        query: req.query
      });
    } catch (logErr) {
      console.error('[Simulations] Failed while logging error details:', logErr);
    }

    // Return a safe error message to the client while ensuring logs contain details
    res.status(500).json({
      error: 'Failed to get simulations'
    });
  }
});

// GET /api/simulations/:id
router.get('/:id', async (req, res) => {
  // No change needed here, as it fetches from the DB using the organization ID.
  try {
    // Use explicit select to avoid schema mismatches on older DBs
    let simulation = null;
    try {
      simulation = await prisma.simulation.findFirst({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId
        },
        select: {
          id: true,
          name: true,
          userId: true,
          organizationId: true,
          years: true,
          startYear: true,
          initialValue: true,
          spendingRate: true,
          results: true,
          summary: true,
          isCompleted: true,
          runCount: true,
          createdAt: true,
          updatedAt: true,
          portfolio: {
            select: {
              id: true,
              publicEquity: true,
              privateEquity: true,
              publicFixedIncome: true,
              privateCredit: true,
              realAssets: true,
              diversifying: true,
              cashShortTerm: true,
              assetAssumptions: true,
              correlationMatrix: true
            }
          }
        }
      });
    } catch (err) {
      console.warn('[Simulations] Detailed get by id failed, retrying safe fallback:', err && err.message ? err.message : String(err));
      simulation = await prisma.simulation.findFirst({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId
        },
        select: {
          id: true,
          name: true,
          userId: true,
          organizationId: true,
          years: true,
          startYear: true,
          initialValue: true,
          spendingRate: true,
          results: true,
          summary: true,
          isCompleted: true,
          runCount: true,
          createdAt: true,
          updatedAt: true,
          portfolio: {
            select: {
              id: true,
              publicEquity: true,
              privateEquity: true,
              publicFixedIncome: true,
              privateCredit: true,
              realAssets: true,
              diversifying: true,
              cashShortTerm: true
            }
          }
        }
      });
    }

    if (!simulation) {
      return res.status(404).json({ 
        error: 'Simulation not found' 
      });
    }

    // Parse JSON fields and transform to match frontend expectations
    let results, summary, assetAssumptions, correlationMatrix, grantTargets;
    try {
      results = typeof simulation.results === 'string' ? JSON.parse(simulation.results) : simulation.results;
    } catch (e) {
      console.warn(`Failed to parse results for simulation ${simulation.id}:`, e.message);
      results = null;
    }
    try {
      summary = typeof simulation.summary === 'string' ? JSON.parse(simulation.summary) : simulation.summary;
    } catch (e) {
      console.warn(`Failed to parse summary for simulation ${simulation.id}:`, e.message);
      summary = null;
    }
    try {
      assetAssumptions = typeof simulation.assetAssumptions === 'string' ? JSON.parse(simulation.assetAssumptions) : simulation.assetAssumptions;
    } catch (e) {
      console.warn(`Failed to parse assetAssumptions for simulation ${simulation.id}:`, e.message);
      assetAssumptions = null;
    }
    if (!assetAssumptions && simulation.portfolio && simulation.portfolio.assetAssumptions) {
      try {
        assetAssumptions = typeof simulation.portfolio.assetAssumptions === 'string' ? JSON.parse(simulation.portfolio.assetAssumptions) : simulation.portfolio.assetAssumptions;
      } catch (e) {
        console.warn(`Failed to parse assetAssumptions from portfolio for simulation ${simulation.id}:`, e.message);
        assetAssumptions = null;
      }
    }
    try {
      correlationMatrix = typeof simulation.correlationMatrix === 'string' ? JSON.parse(simulation.correlationMatrix) : simulation.correlationMatrix;
    } catch (e) {
      console.warn(`Failed to parse correlationMatrix for simulation ${simulation.id}:`, e.message);
      correlationMatrix = null;
    }
    if (!correlationMatrix && simulation.portfolio && simulation.portfolio.correlationMatrix) {
      try {
        correlationMatrix = typeof simulation.portfolio.correlationMatrix === 'string' ? JSON.parse(simulation.portfolio.correlationMatrix) : simulation.portfolio.correlationMatrix;
      } catch (e) {
        console.warn(`Failed to parse correlationMatrix from portfolio for simulation ${simulation.id}:`, e.message);
        correlationMatrix = null;
      }
    }
    try {
      grantTargets = typeof simulation.grantTargets === 'string' ? JSON.parse(simulation.grantTargets) : simulation.grantTargets;
    } catch (e) {
      console.warn(`Failed to parse grantTargets for simulation ${simulation.id}:`, e.message);
      grantTargets = null;
    }
    
    // Build portfolio weights from the portfolio relation
    const portfolioWeights = simulation.portfolio ? {
      'Public Equity': simulation.portfolio.publicEquity / 100,
      'Private Equity': simulation.portfolio.privateEquity / 100,
      'Public Fixed Income': simulation.portfolio.publicFixedIncome / 100,
      'Private Credit': simulation.portfolio.privateCredit / 100,
      'Real Assets': simulation.portfolio.realAssets / 100,
      'Diversifying': simulation.portfolio.diversifying / 100,
      'Cash / Short-Term': simulation.portfolio.cashShortTerm / 100
    } : {};

    // Build the inputs object that the frontend expects
    const inputs = {
      initialEndowment: simulation.initialValue,
      spendingRate: simulation.spendingRate, // Already a percentage, don't divide
      investmentExpenseRate: 0.5 / 100, // Default 0.5% as decimal
      years: simulation.years,
      portfolioWeights,
      horizon: simulation.years,
      simulations: 10000 // Default
    };

    // Fix summary percentage fields (convert to decimals)
    const fixPct = v => typeof v === 'number' ? v / 100 : v;
    const fixedSummary = summary ? {
      ...summary,
      // flatten finalValues percentiles if nested
      percentile10: summary.percentile10 ?? summary.finalValues?.percentile10,
      percentile25: summary.percentile25 ?? summary.finalValues?.percentile25,
      percentile75: summary.percentile75 ?? summary.finalValues?.percentile75,
      percentile90: summary.percentile90 ?? summary.finalValues?.percentile90,
      // scale percentage fields to decimals for UI formatting
      annualizedReturn10: fixPct(summary.annualizedReturn10),
      annualizedReturn25: fixPct(summary.annualizedReturn25),
      medianAnnualizedReturn: fixPct(summary.medianAnnualizedReturn),
      annualizedReturn75: fixPct(summary.annualizedReturn75),
      annualizedReturn90: fixPct(summary.annualizedReturn90),
      annualizedVolatility10: fixPct(summary.annualizedVolatility10),
      annualizedVolatility25: fixPct(summary.annualizedVolatility25),
      annualizedVolatility: fixPct(summary.annualizedVolatility),
      annualizedVolatility75: fixPct(summary.annualizedVolatility75),
      annualizedVolatility90: fixPct(summary.annualizedVolatility90)
    } : summary;

    const parsedSimulation = {
      ...simulation,
      results,
      summary: fixedSummary,
      assetAssumptions,
      correlationMatrix,
      grantTargets,
      inputs // Add the inputs object
    };

    res.json(parsedSimulation);
  } catch (error) {
    console.error('Get simulation error:', error);
    res.status(500).json({ 
      error: 'Failed to get simulation' 
    });
  }
});

/**
 * POST /api/simulations - Create a new saved simulation
 */
router.post('/', trackSimulationUsage, validateSimulation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      name,
      years,
      startYear,
      initialValue,
      spendingRate,
      spendingGrowth = 0,
      
      // 🎯 REMOVED OLD FIELDS, ONLY DESTRUCTURING NON-PORTFOLIO FIELDS
      equityShock = null,
      cpiShift = null,
      grantTargets = null,
      
      portfolio // Destructure the portfolio object now containing 7-factor fields
    } = req.body;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 🎯 UPDATED SIMULATION CREATE - NO MORE 2-FACTOR FIELDS
      const simulation = await tx.simulation.create({
        data: {
          name,
          userId: req.user.id,
          organizationId: req.user.organizationId,
          years,
          startYear,
          initialValue,
          spendingRate,
          spendingGrowth,
          equityShock,
          cpiShift,
          grantTargets: grantTargets ? JSON.stringify(grantTargets) : null,
          // 🎯 No more equityReturn/bondReturn on Simulation model
        }
      });

      // Create associated portfolio
      let portfolioRecord = null;
      if (portfolio) {
        // 🎯 UPDATED PORTFOLIO CREATE - USING NEW 7-FACTOR FIELDS
        portfolioRecord = await tx.portfolio.create({
          data: {
            name: portfolio.name || `${name} Portfolio`,
            userId: req.user.id,
            simulationId: simulation.id,
            assetAssumptions: portfolio.assetAssumptions,       // NEW
            correlationMatrix: portfolio.correlationMatrix,   // NEW
            portfolioWeights: portfolio.portfolioWeights,     // NEW
            description: portfolio.description,
            // 🎯 REMOVED OLD ALLOCATION FIELDS (equityAllocation, etc.) 
          }
        });
      }
      
      return { simulation, portfolio: portfolioRecord };
    });

    res.status(201).json({
      message: 'Simulation created successfully',
      simulation: {
        ...result.simulation,
        portfolio: result.portfolio
      }
    });
  } catch (error) {
    console.error('Create simulation error:', error);
    res.status(500).json({ 
      error: 'Failed to create simulation' 
    });
  }
});

/**
 * PUT /api/simulations/:id - Update a saved simulation
 */
router.put('/:id', validateSimulation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if simulation belongs to organization
    const existingSimulation = await prisma.simulation.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.user.organizationId
      },
      include: {
        portfolio: true
      }
    });

    if (!existingSimulation) {
      return res.status(404).json({ 
        error: 'Simulation not found' 
      });
    }

    const {
      name,
      years,
      startYear,
      initialValue,
      spendingRate,
      spendingGrowth,
      
      // 🎯 REMOVED OLD FIELDS, ONLY DESTRUCTURING NON-PORTFOLIO FIELDS
      equityShock,
      cpiShift,
      grantTargets,
      
      portfolio // Destructure the portfolio object now containing 7-factor fields
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 🎯 UPDATED SIMULATION UPDATE - NO MORE 2-FACTOR FIELDS
      const updatedSimulation = await tx.simulation.update({
        where: { id: req.params.id },
        data: {
          name,
          years,
          startYear,
          initialValue,
          spendingRate,
          spendingGrowth,
          equityShock,
          cpiShift,
          grantTargets: grantTargets ? JSON.stringify(grantTargets) : null,
          // 🎯 No more equityReturn/bondReturn on Simulation model
        }
      });

      // Update or create portfolio
      let portfolioRecord = null;
      if (portfolio) {
        // 🎯 UPDATED PORTFOLIO UPSERT - USING NEW 7-FACTOR FIELDS
        portfolioRecord = await tx.portfolio.upsert({
          where: { simulationId: req.params.id },
          update: {
            name: portfolio.name,
            assetAssumptions: portfolio.assetAssumptions,       // NEW
            correlationMatrix: portfolio.correlationMatrix,   // NEW
            portfolioWeights: portfolio.portfolioWeights,     // NEW
            description: portfolio.description,
            // 🎯 REMOVED OLD ALLOCATION FIELDS
          },
          create: {
            name: portfolio.name || `${name} Portfolio`,
            userId: req.user.id,
            simulationId: req.params.id,
            assetAssumptions: portfolio.assetAssumptions,       // NEW
            correlationMatrix: portfolio.correlationMatrix,   // NEW
            portfolioWeights: portfolio.portfolioWeights,     // NEW
            description: portfolio.description,
            // 🎯 REMOVED OLD ALLOCATION FIELDS
          }
        });
      } else if (existingSimulation.portfolio) {
        // If portfolio data is missing but existed, ensure the relation is handled or deleted if needed.
        // For simplicity, we just won't update the portfolio if no portfolio object is provided.
        portfolioRecord = existingSimulation.portfolio;
      }

      return { simulation: updatedSimulation, portfolio: portfolioRecord };
    });

    res.json({
      message: 'Simulation updated successfully',
      simulation: {
        ...result.simulation,
        portfolio: result.portfolio
      }
    });
  } catch (error) {
    console.error('Update simulation error:', error);
    res.status(500).json({ 
      error: 'Failed to update simulation' 
    });
  }
});

// POST /api/simulations/:id/run
router.post('/:id/run', trackSimulationUsage, async (req, res) => {
  // Logic remains mostly the same as it operates on the returned 'results' and 'summary'
  // and saves them as JSON, which is schema-agnostic.
  try {
    const simulation = await prisma.simulation.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.user.organizationId
      }
    });

    if (!simulation) {
      return res.status(404).json({ 
        error: 'Simulation not found' 
      });
    }

    const { results } = req.body;
    
    // ... Diagnostic logging and helper functions (no change) ...
    // ... Summary and Medoid/WorstCuts logic (no change) ...

    const simulationsArr = Array.isArray(results?.paths) ? results.paths : []; // Changed from results?.simulations to results?.paths to match POST /execute results
    const spendingArr = Array.isArray(results?.spendingPolicy) ? results.spendingPolicy : [];
    const worstCuts = computePerSimWorstCuts(simulationsArr, spendingArr);
    const medoidIdx = computeMedoidIndex(simulationsArr);
    const representativePath = (medoidIdx !== null && simulationsArr[medoidIdx]) ? simulationsArr[medoidIdx] : null;
    
    // Helper: compute per-simulation worst year-over-year spending cuts
    function computePerSimWorstCuts(simulations = [], spendingPolicy = []) {
      const cuts = [];
      for (let i = 0; i < simulations.length; i++) {
        const sim = simulations[i] || [];
        const spend = (spendingPolicy && spendingPolicy[i]) ? spendingPolicy[i] : null;
        let worst = null;
        const series = spend && spend.length === sim.length ? spend : sim;
        for (let t = 0; t < series.length - 1; t++) {
          const a = series[t];
          const b = series[t+1];
          if (!isFinite(a) || !isFinite(b) || a === 0) continue;
          const pct = (b - a) / Math.abs(a); 
          if (worst === null || pct < worst) worst = pct;
        }
        cuts.push(worst === null ? null : Math.round(worst * 10000) / 100); 
      }
      return cuts.filter((c) => c !== null);
    }

    // Helper: compute medoid index 
    function computeMedoidIndex(simulations = []) {
      if (!simulations || simulations.length === 0) return null;
      const n = simulations.length;
      const finals = simulations.map(s => (s && s.length ? s[s.length - 1] : 0));
      let bestIdx = 0; let bestSum = Infinity;
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          const d = finals[i] - finals[j]; sum += d * d;
        }
        if (sum < bestSum) { bestSum = sum; bestIdx = i; }
      }
      return bestIdx;
    }

    const summary = {
      worstCutDistribution: worstCuts,
      worstCutPercentiles: {
        p10: worstCuts.length ? worstCuts[Math.floor(worstCuts.length * 0.1)] : null,
        p25: worstCuts.length ? worstCuts[Math.floor(worstCuts.length * 0.25)] : null,
        p50: worstCuts.length ? worstCuts[Math.floor(worstCuts.length * 0.5)] : null,
        p75: worstCuts.length ? worstCuts[Math.floor(worstCuts.length * 0.75)] : null,
        p90: worstCuts.length ? worstCuts[Math.floor(worstCuts.length * 0.9)] : null,
      },
      representative: {
        medoidIndex: medoidIdx,
        path: representativePath,
      }
    };
    
    try {
      const updatedSimulation = await prisma.simulation.update({
        where: { id: req.params.id },
        data: {
          results: JSON.stringify(results), // Ensure results is stringified if saving as JSON/String
          summary: JSON.stringify(summary), // Ensure summary is stringified if saving as JSON/String
          isCompleted: true,
          runCount: {
            increment: 1
          }
        }
      });

      res.json({
        message: 'Simulation results saved successfully',
        simulation: updatedSimulation
      });
    } catch (dbErr) {
      // Log DB error and include as much context as possible without leaking sensitive data
      console.error('Prisma update error saving simulation results:', dbErr);
      console.error('Simulation id:', req.params.id, 'Organization:', req.user?.organizationId, 'User:', req.user?.id);
      try {
        console.error('Results keys at error time:', Object.keys(results || {}));
      } catch (kErr) {}
      return res.status(500).json({
        error: 'Failed to save simulation results',
        details: dbErr?.message || String(dbErr)
      });
    }
  } catch (error) {
    console.error('Save simulation results error:', error);
    res.status(500).json({ 
      error: 'Failed to save simulation results' 
    });
  }
});

// DELETE /api/simulations/:id
router.delete('/:id', async (req, res) => {
  try {
    const simulation = await prisma.simulation.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.user.organizationId
      }
    });

    if (!simulation) {
      return res.status(404).json({ 
        error: 'Simulation not found' 
      });
    }

    // Since the Portfolio model has a foreign key to Simulation, deleting the Simulation
    // will typically cascade delete the Portfolio, but to be safe and explicit:
    await prisma.$transaction([
        prisma.portfolio.deleteMany({ where: { simulationId: req.params.id } }),
        prisma.simulation.delete({ where: { id: req.params.id } })
    ]);


    res.json({
      message: 'Simulation deleted successfully'
    });
  } catch (error) {
    console.error('Delete simulation error:', error);
    res.status(500).json({ 
      error: 'Failed to delete simulation' 
    });
  }
});

module.exports = router;