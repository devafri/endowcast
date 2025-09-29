<template>
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-2xl font-bold mb-4">Test View</h1>
      <div class="bg-white p-6 rounded-lg shadow">
        <p>This is a test view to check if routing works.</p>
        <div class="mt-4">
          <h3>Simulation Store Test:</h3>
          <p>Initial Endowment: {{ sim.inputs.initialEndowment }}</p>
          <p>Spending Rate: {{ sim.inputs.spendingPolicyRate }}%</p>
        </div>
        <div class="mt-4">
          <h3>Portfolio Weights:</h3>
          <ul>
            <li v-for="(value, key) in sim.inputs.portfolioWeights" :key="key">
              {{ key }}: {{ value }}%
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSimulationStore } from '../stores/simulation';

const sim = useSimulationStore();
</script>
