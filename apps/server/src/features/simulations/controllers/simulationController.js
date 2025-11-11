/**
 * Simulation Controller
 * Handles HTTP requests for simulation endpoints
 */

const SimulationService = require('../services/simulationService');
const prisma = require('../../../shared/db/prisma');

class SimulationController {
  /**
   * POST /api/simulations/run
   * Execute a Monte Carlo simulation and return results
   */
  static async runSimulation(req, res) {
    try {
      const userId = req.user?.userId; // From JWT token (you'll add auth middleware)
      const organizationId = req.user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 🎯 MODIFIED: Destructure to capture all 7-factor inputs
      const {
        name = 'Unnamed Simulation',
        years,
        startYear,
        initialValue,
        spendingRate,
        spendingGrowth,
        // 🛑 NEW 7-FACTOR PARAMETERS EXPECTED FROM FRONTEND
        assetAssumptions, // { publicEquity: { mu, sigma }, ... }
        portfolioWeights, // { publicEquity: 50, ... }
        correlationMatrix, // The 7x7 matrix
        // --------------------------------------------------
        equityShock,
        cpiShift,
        grantTargets,
        initialOperatingExpense = 0,
        initialGrant = 0,
        riskFreeRate = 2,
        numSimulations = 10000
      } = req.body;

      // Run the simulation
      const simulationParams = {
        years,
        startYear,
        initialValue,
        spendingRate,
        spendingGrowth,
        // 🎯 NEW: Pass the full model details
        assetAssumptions,
        portfolioWeights,
        correlationMatrix,
        // ------------------------------------
        equityShock,
        cpiShift,
        grantTargets,
        initialOperatingExpense,
        initialGrant,
        riskFreeRate,
        numSimulations
      };

      console.log(`[SimulationController] Running simulation with ${numSimulations} paths...`);
      const startTime = Date.now();

      // 🛑 ASSUMPTION: SimulationService.runSimulation(params) returns an object
      const fullResults = SimulationService.runSimulation(simulationParams);

      const elapsed = Date.now() - startTime;
      console.log(`[SimulationController] Simulation completed in ${elapsed}ms`);

      // Calculate year-by-year success rates
      const successByYear = SimulationService.calculateSuccessByYear(
        fullResults.paths, // Use the full paths from the result
        grantTargets
      );
      
      // Calculate final value percentiles, success rate, and basic summary metrics from final values
      const finalValueSummary = SimulationService.getFinalValueSummary(fullResults.paths, parseFloat(initialValue), grantTargets);

      // --- 🏆 FIX APPLIED HERE: Map all detailed metrics to the `summary` object ---
      const responseSummary = {
          // Basic final value stats (from SimulationService.getFinalValueSummary)
          medianFinalValue: finalValueSummary.median,
          averageFinalValue: finalValueSummary.average,
          probabilityOfLoss: 1 - finalValueSummary.successRate, // assuming successRate is probability of non-loss
          successRate: finalValueSummary.successRate,
          finalValues: {
            percentile10: finalValueSummary.percentile10,
            percentile90: finalValueSummary.percentile90,
            // Add other percentiles for completeness
            percentile25: finalValueSummary.percentile25,
            percentile75: finalValueSummary.percentile75,
          },
          successByYear: successByYear,
          totalPaths: fullResults.paths.length,
          
          // Detailed Risk/Performance Metrics (Assuming SimulationService computed these and put them in fullResults)
          medianAnnualizedReturn: fullResults.medianAnnualizedReturn,
          annualizedVolatility: fullResults.annualizedVolatility,
          sharpeMedian: fullResults.sharpeMedian,
          sortino: fullResults.sortino,
          medianMaxDrawdown: fullResults.medianMaxDrawdown,
          cvar95: fullResults.cvar95,
          inflationPreservationPct: fullResults.inflationPreservationPct,
          riskFreeRate: parseFloat(req.body.riskFreeRate) || 0.02, // Pass RF rate for frontend context
      };
      // --------------------------------------------------------------------------

      // Prepare the final response object
      const response = {
        id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        // Include the actual simulation paths only if the count is low (e.g., <= 500)
        paths: fullResults.paths.length <= 500 ? fullResults.paths : undefined,
        pathsAvailable: fullResults.paths.length <= 500,
        summary: responseSummary,
        
        // Removed the redundant 'statistics' object as 'summary' holds all UI data
        
        metadata: {
          simulationCount: numSimulations,
          years,
          initialPortfolioValue: initialValue,
          // 🎯 REMOVED 2-FACTOR ALLOCATIONS from metadata
          computeTimeMs: elapsed
        },
        yearLabels: fullResults.yearLabels, // Assuming yearLabels is part of fullResults
      };

      // Optionally save to database
      try {
        await prisma.simulation.create({
          data: {
            // ... (Prisma fields for 2-factor model need to be updated to 7-factor schema)
            // For now, we omit the old 2-factor fields to avoid database errors
            results: JSON.stringify(response),
            summary: JSON.stringify(response.summary),
            isCompleted: true,
            runCount: 1
          }
        });
      } catch (dbError) {
        console.error('[SimulationController] Error saving simulation to DB:', dbError);
      }

      res.status(200).json(response);
    } catch (error) {
      console.error('[SimulationController] Simulation error:', error);
      res.status(500).json({
        error: 'Simulation failed',
        details: error.message
      });
    }
  }

  /**
   * GET /api/simulations
   * Retrieve user's simulation history
   */
  static async getSimulations(req, res) {
    // ... (unchanged)
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const simulations = await prisma.simulation.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          years: true,
          initialValue: true,
          summary: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Last 50 simulations
      });

      // Parse summary JSON back to objects
      const parsedSimulations = simulations.map(sim => ({
        ...sim,
        summary: sim.summary ? JSON.parse(sim.summary) : null
      }));

      res.json(parsedSimulations);
    } catch (error) {
      console.error('[SimulationController] Get simulations error:', error);
      res.status(500).json({
        error: 'Failed to retrieve simulations',
        details: error.message
      });
    }
  }

  /**
   * GET /api/simulations/:id
   * Retrieve a specific simulation result
   */
  static async getSimulation(req, res) {
    // ... (unchanged)
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const simulation = await prisma.simulation.findUnique({
        where: { id }
      });

      if (!simulation) {
        return res.status(404).json({ error: 'Simulation not found' });
      }

      // Check authorization
      if (simulation.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Parse JSON fields
      const response = {
        ...simulation,
        results: simulation.results ? JSON.parse(simulation.results) : null,
        summary: simulation.summary ? JSON.parse(simulation.summary) : null,
        grantTargets: simulation.grantTargets ? JSON.parse(simulation.grantTargets) : null
      };

      res.json(response);
    } catch (error) {
      console.error('[SimulationController] Get simulation error:', error);
      res.status(500).json({
        error: 'Failed to retrieve simulation',
        details: error.message
      });
    }
  }
}

module.exports = SimulationController;