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

    // Update simulation with results
    const updatedSimulation = await prisma.simulation.update({
      where: { id: req.params.id },
      data: {
        results,
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
