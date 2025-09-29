const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow requests from your Vue client
app.use(express.json()); // Allow server to read JSON from request bodies

const PORT = process.env.PORT || 3000;

// Your core simulation logic, moved from the original script.js
// (This is a simplified version for demonstration)
function runSimulation(params) {
    const { initialEndowment, years, cpiMean, cpiStd } = params;
    // ... All the complex simulation logic from your original file goes here ...
    // For now, let's return a dummy result.
    console.log("Running simulation with params:", params);
    const finalValue = initialEndowment * Math.pow(1 + cpiMean, years);
    return {
        medianFinalValue: finalValue,
        p75FinalValue: finalValue * 1.2,
        p25FinalValue: finalValue * 0.8,
    };
}

// Define the API endpoint
app.post('/api/simulations/run', (req, res) => {
    try {
        const simulationParams = req.body;
        // Add validation here to ensure params are correct
        const results = runSimulation(simulationParams);
        res.json(results);
    } catch (error) {
        console.error("Simulation error:", error);
        res.status(500).json({ message: "An error occurred during the simulation." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});