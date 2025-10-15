const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, prisma } = require('../../auth/middleware/auth');
const { trackSimulationUsage } = require('../../../shared/middleware/usage');

const router = express.Router();

// All simulation routes require authentication
router.use(authenticateToken);

// Validation middleware for simulation data
const validateSimulation = [
  body('name').trim().isLength({ min: 1 }).withMessage('Simulation name is required'),
  body('years').isInt({ min: 1, max: 30 }).withMessage('Years must be between 1 and 30'),
  body('startYear').isInt({ min: 2000, max: 2100 }).withMessage('Start year must be between 2000 and 2100'),
  body('initialValue').isFloat({ min: 0 }).withMessage('Initial value must be positive'),
  body('spendingRate').isFloat({ min: 0, max: 1 }).withMessage('Spending rate must be between 0 and 1'),
  body('equityReturn').isFloat().withMessage('Equity return must be a number'),
  body('equityVolatility').isFloat({ min: 0, max: 1 }).withMessage('Equity volatility must be between 0 and 1'),
  body('bondReturn').isFloat().withMessage('Bond return must be a number'),
  body('bondVolatility').isFloat({ min: 0, max: 1 }).withMessage('Bond volatility must be between 0 and 1'),
  body('correlation').isFloat({ min: -1, max: 1 }).withMessage('Correlation must be between -1 and 1'),
];

// GET /api/simulations
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orderBy = { [sortBy]: sortOrder };

    const [simulations, total] = await Promise.all([
      prisma.simulation.findMany({
        where: { 
          organizationId: req.user.organizationId
        },
        include: {
          portfolio: true
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.simulation.count({
        where: { 
          organizationId: req.user.organizationId
        }
      })
    ]);

    res.json({
      simulations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get simulations error:', error);
    res.status(500).json({ 
      error: 'Failed to get simulations' 
    });
  }
});

// GET /api/simulations/:id
router.get('/:id', async (req, res) => {
  try {
    const simulation = await prisma.simulation.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.user.organizationId
      },
      include: {
        portfolio: true
      }
    });

    if (!simulation) {
      return res.status(404).json({ 
        error: 'Simulation not found' 
      });
    }

    res.json(simulation);
  } catch (error) {
    console.error('Get simulation error:', error);
    res.status(500).json({ 
      error: 'Failed to get simulation' 
    });
  }
});

// POST /api/simulations
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
      equityReturn,
      equityVolatility,
      bondReturn,
      bondVolatility,
      correlation,
      equityShock = null,
      cpiShift = null,
      grantTargets = null,
      portfolio
    } = req.body;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create simulation
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
          equityReturn,
          equityVolatility,
          bondReturn,
          bondVolatility,
          correlation,
          equityShock,
          cpiShift,
          grantTargets,
        }
      });

      // Create associated portfolio if provided
      let portfolioRecord = null;
      if (portfolio) {
        portfolioRecord = await tx.portfolio.create({
          data: {
            name: portfolio.name || `${name} Portfolio`,
            userId: req.user.id,
            simulationId: simulation.id,
            equityAllocation: portfolio.equityAllocation,
            bondAllocation: portfolio.bondAllocation,
            alternativeAllocation: portfolio.alternativeAllocation || 0,
            cashAllocation: portfolio.cashAllocation || 0,
            description: portfolio.description,
          }
        });
      }

      // Usage tracking is now handled by the usage middleware
      // at the organization/subscription level
      
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

// PUT /api/simulations/:id
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
      equityReturn,
      equityVolatility,
      bondReturn,
      bondVolatility,
      correlation,
      equityShock,
      cpiShift,
      grantTargets,
      portfolio
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Update simulation
      const updatedSimulation = await tx.simulation.update({
        where: { id: req.params.id },
        data: {
          name,
          years,
          startYear,
          initialValue,
          spendingRate,
          spendingGrowth,
          equityReturn,
          equityVolatility,
          bondReturn,
          bondVolatility,
          correlation,
          equityShock,
          cpiShift,
          grantTargets,
        }
      });

      // Update or create portfolio
      let portfolioRecord = null;
      if (portfolio) {
        portfolioRecord = await tx.portfolio.upsert({
          where: { simulationId: req.params.id },
          update: {
            name: portfolio.name,
            equityAllocation: portfolio.equityAllocation,
            bondAllocation: portfolio.bondAllocation,
            alternativeAllocation: portfolio.alternativeAllocation || 0,
            cashAllocation: portfolio.cashAllocation || 0,
            description: portfolio.description,
          },
          create: {
            name: portfolio.name || `${name} Portfolio`,
            userId: req.user.id,
            simulationId: req.params.id,
            equityAllocation: portfolio.equityAllocation,
            bondAllocation: portfolio.bondAllocation,
            alternativeAllocation: portfolio.alternativeAllocation || 0,
            cashAllocation: portfolio.cashAllocation || 0,
            description: portfolio.description,
          }
        });
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

    // Diagnostic logging: record metadata about incoming results so we can
    // quickly identify payload size / shape issues that cause 500s.
    try {
      console.log(`Save run requested: simulationId=${req.params.id} user=${req.user?.id || 'unknown'} time=${new Date().toISOString()}`);
      if (!results) {
        console.warn('No results payload present in request body');
      } else {
        try {
          const raw = JSON.stringify(results);
          const sizeBytes = Buffer.byteLength(raw, 'utf8');
          const simsCount = Array.isArray(results.simulations) ? results.simulations.length : 0;
          const yearsPerSim = simsCount && Array.isArray(results.simulations[0]) ? results.simulations[0].length : 0;
          console.log(`Results payload size: ${sizeBytes} bytes; simulations: ${simsCount}; yearsPerSim: ${yearsPerSim}`);
          // Log top-level keys to see what is being sent
          console.log('Results top-level keys:', Object.keys(results));
        } catch (sizeErr) {
          console.warn('Could not compute results payload size or inspect contents', sizeErr);
        }
      }
    } catch (diagErr) {
      console.warn('Unexpected error while logging request diagnostics', diagErr);
    }

    // Update simulation with results
    // Helper: compute per-simulation worst year-over-year spending cuts
    function computePerSimWorstCuts(simulations = [], spendingPolicy = []) {
      // simulations: array of arrays; spendingPolicy: array of arrays matching sims length
      const cuts = [];
      for (let i = 0; i < simulations.length; i++) {
        const sim = simulations[i] || [];
        const spend = (spendingPolicy && spendingPolicy[i]) ? spendingPolicy[i] : null;
        let worst = null;
        // If spending path exists, compute YoY on spending; otherwise compute YoY on sim values
        const series = spend && spend.length === sim.length ? spend : sim;
        for (let t = 0; t < series.length - 1; t++) {
          const a = series[t];
          const b = series[t+1];
          if (!isFinite(a) || !isFinite(b) || a === 0) continue;
          const pct = (b - a) / Math.abs(a); // relative change
          if (worst === null || pct < worst) worst = pct;
        }
        cuts.push(worst === null ? null : Math.round(worst * 10000) / 100); // percent with 2 decimals
      }
      return cuts.filter((c) => c !== null);
    }

    // Helper: compute medoid index (closest to all others under euclidean on final values)
    function computeMedoidIndex(simulations = []) {
      if (!simulations || simulations.length === 0) return null;
      const n = simulations.length;
      // Reduce each sim to its final value to keep this cheap; could use full path distance later
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

    const simulationsArr = Array.isArray(results?.simulations) ? results.simulations : [];
    const spendingArr = Array.isArray(results?.spendingPolicy) ? results.spendingPolicy : [];
    const worstCuts = computePerSimWorstCuts(simulationsArr, spendingArr);
    const medoidIdx = computeMedoidIndex(simulationsArr);
    const representativePath = (medoidIdx !== null && simulationsArr[medoidIdx]) ? simulationsArr[medoidIdx] : null;

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
          results,
          summary,
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
      // If possible, log the size/shape again for correlation with the error
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

    await prisma.simulation.delete({
      where: { id: req.params.id }
    });

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
