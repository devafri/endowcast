<script setup lang="ts">
const props = defineProps<{ results: any }>();

function formatPercent(num: number | null | undefined): string {
  if (!num && num !== 0) return '-';
  return `${((num as number) * 100).toFixed(2)}%`;
}

function formatRatio(num: number | null | undefined): string {
  if (!num && num !== 0) return '-';
  return (num as number).toFixed(2);
}

function formatCurrency(num: number | null | undefined): string {
  if (!num && num !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num as number);
}
</script>

<template>
  <div class="card p-4">
    <h3 class="section-title mb-4">Statistical Summary</h3>
    
    <!-- Summary Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm bg-white rounded-lg border border-border">
        <thead>
          <tr class="bg-gray-100 border-b border-gray-300">
            <th class="px-4 py-3 text-left font-semibold text-gray-700">Metric</th>
            <th class="px-4 py-3 text-center font-bold text-indigo-700 bg-indigo-100">90TH</th>
            <th class="px-4 py-3 text-center font-bold text-indigo-700 bg-indigo-100">75TH</th>
            <th class="px-4 py-3 text-center font-bold text-green-700 bg-green-100">MEDIAN (50TH)</th>
            <th class="px-4 py-3 text-center font-bold text-indigo-700 bg-indigo-100">25TH</th>
            <th class="px-4 py-3 text-center font-bold text-indigo-700 bg-indigo-100">10TH</th>
          </tr>
        </thead>
        <tbody>
          <!-- Final Value -->
          <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="px-4 py-3 font-semibold text-gray-700">Final Value</td>
            <td class="px-4 py-3 text-right text-gray-900 text-xs">{{ formatCurrency(results?.summary?.finalValues?.percentile90) }}</td>
            <td class="px-4 py-3 text-right text-gray-900 text-xs">-</td>
            <td class="px-4 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatCurrency(results?.summary?.medianFinalValue) }}</td>
            <td class="px-4 py-3 text-right text-gray-900 text-xs">-</td>
            <td class="px-4 py-3 text-right text-gray-900 text-xs">{{ formatCurrency(results?.summary?.finalValues?.percentile10) }}</td>
          </tr>

          <!-- Annualized Return -->
          <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="px-4 py-3 font-semibold text-gray-700">Annualized Return</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatPercent(results?.summary?.annualizedReturn90) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatPercent(results?.summary?.annualizedReturn75) }}</td>
            <td class="px-4 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatPercent(results?.summary?.medianAnnualizedReturn) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatPercent(results?.summary?.annualizedReturn25) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatPercent(results?.summary?.annualizedReturn10) }}</td>
          </tr>

          <!-- Annualized Volatility -->
          <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="px-4 py-3 font-semibold text-gray-700">Annualized Volatility</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatPercent(results?.summary?.annualizedVolatility90) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatPercent(results?.summary?.annualizedVolatility75) }}</td>
            <td class="px-4 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatPercent(results?.summary?.annualizedVolatility) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatPercent(results?.summary?.annualizedVolatility25) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatPercent(results?.summary?.annualizedVolatility10) }}</td>
          </tr>

          <!-- Sharpe Ratio -->
          <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="px-4 py-3 font-semibold text-gray-700">Sharpe Ratio</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatRatio(results?.summary?.sharpe90) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatRatio(results?.summary?.sharpe75) }}</td>
            <td class="px-4 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatRatio(results?.summary?.sharpeMedian) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatRatio(results?.summary?.sharpe25) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatRatio(results?.summary?.sharpe10) }}</td>
          </tr>

          <!-- Sortino Ratio -->
          <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="px-4 py-3 font-semibold text-gray-700">Sortino Ratio</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatRatio(results?.summary?.sortino90) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatRatio(results?.summary?.sortino75) }}</td>
            <td class="px-4 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatRatio(results?.summary?.sortino) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatRatio(results?.summary?.sortino25) }}</td>
            <td class="px-4 py-3 text-right text-gray-900">{{ formatRatio(results?.summary?.sortino10) }}</td>
          </tr>

          <!-- Probability of Falling Below Initial Value -->
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 font-semibold text-gray-700">Probability of Falling Below Initial Value</td>
            <td colspan="5" class="px-4 py-3 text-center text-red-600 font-bold">{{ formatPercent(results?.summary?.probabilityOfLoss) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
