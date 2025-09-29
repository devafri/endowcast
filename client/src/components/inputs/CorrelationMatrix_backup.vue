<script setup lang="ts">
import { computed, reactive } from 'vue';
import { assetClasses } from '../../lib/monteCarlo';

interface Props {
  modelValue: number[][];
}

interface Emits {
  (e: 'update:modelValue', value: number[][]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Create a local reactive copy for editing
const matrix = reactive(
  props.modelValue?.map(row => [...row]) || getDefaultMatrix()
);

function getDefaultMatrix(): number[][] {
  // Default correlation matrix from monteCarlo.ts
  return [
    [1.00, 0.75, 0.20, 0.25, 0.30, 0.25, 0.05],
    [0.75, 1.00, 0.15, 0.40, 0.35, 0.20, 0.05],
    [0.20, 0.15, 1.00, 0.30, 0.10, 0.10, 0.05],
    [0.25, 0.40, 0.30, 1.00, 0.15, 0.10, 0.05],
    [0.30, 0.35, 0.10, 0.15, 1.00, 0.20, 0.05],
    [0.25, 0.20, 0.10, 0.10, 0.20, 1.00, 0.05],
    [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 1.00],
  ];
}

function updateCorrelation(i: number, j: number, value: number) {
  // Ensure value is within valid correlation range
  const clampedValue = Math.max(-1, Math.min(1, value));
  
  // Update both symmetric positions
  matrix[i][j] = clampedValue;
  matrix[j][i] = clampedValue;
  
  // Emit the updated matrix
  emit('update:modelValue', matrix.map(row => [...row]));
}

function resetToDefaults() {
  const defaultMatrix = getDefaultMatrix();
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      matrix[i][j] = defaultMatrix[i][j];
    }
  }
  emit('update:modelValue', matrix.map(row => [...row]));
}

function getCorrelationColor(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.7) return 'bg-red-50 text-red-800 border-red-200';
  if (abs >= 0.5) return 'bg-orange-50 text-orange-800 border-orange-200';
  if (abs >= 0.3) return 'bg-yellow-50 text-yellow-800 border-yellow-200';
  if (abs >= 0.1) return 'bg-blue-50 text-blue-800 border-blue-200';
  return 'bg-gray-50 text-gray-800 border-gray-200';
}

function getCorrelationInterpretation(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.8) return value > 0 ? 'Very Strong Positive' : 'Very Strong Negative';
  if (abs >= 0.6) return value > 0 ? 'Strong Positive' : 'Strong Negative';
  if (abs >= 0.4) return value > 0 ? 'Moderate Positive' : 'Moderate Negative';
  if (abs >= 0.2) return value > 0 ? 'Weak Positive' : 'Weak Negative';
  return 'Very Weak';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header and controls -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Asset Class Correlation Matrix</h3>
        <p class="text-sm text-gray-600 mt-1">
          Customize correlations between asset classes for your Monte Carlo simulation
        </p>
      </div>
      <button 
        type="button" 
        @click="resetToDefaults"
        class="btn-secondary py-2 px-4 text-sm font-medium"
      >
        Reset to Defaults
      </button>
    </div>

    <!-- Correlation Matrix Table -->
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full">
        <table class="min-w-full border-collapse">
          <thead>
            <tr>
              <th class="p-2 text-left"></th>
              <th 
                v-for="(asset, index) in assetClasses" 
                :key="`header-${index}`"
                class="p-2 text-center text-xs font-medium text-gray-700 align-bottom"
                style="width: 80px; min-width: 80px;"
              >
                <!-- Keep two lines for column headers as they have limited horizontal space -->
                <div class="leading-tight">
                  <div>{{ asset.label.split(' ')[0] }}</div>
                  <div>{{ asset.label.split(' ').slice(1).join(' ') }}</div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(rowAsset, i) in assetClasses" :key="`row-${i}`">
              <!-- Row header -->
              <td class="p-2 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style="min-width: 140px;">
                <!-- Two lines on smaller screens, one line on larger screens -->
                <div class="leading-tight lg:hidden">
                  <div>{{ rowAsset.label.split(' ')[0] }}</div>
                  <div>{{ rowAsset.label.split(' ').slice(1).join(' ') }}</div>
                </div>
                <div class="hidden lg:block whitespace-nowrap">
                  {{ rowAsset.label }}
                </div>
              </td>
              
              <!-- Correlation cells -->
              <td 
                v-for="(colAsset, j) in assetClasses" 
                :key="`cell-${i}-${j}`"
                class="p-1 text-center border border-gray-200"
              >
                                <div v-if="i === j" class="w-16 h-8 flex items-center justify-center bg-gray-100 rounded text-sm font-bold text-gray-600">
                  1.00
                </div>
                <div v-else-if="i > j" class="w-16 h-8 flex items-center justify-center bg-gray-100 rounded text-sm text-gray-500">
                  {{ matrix[i][j].toFixed(2) }}
                </div>
                <div v-else :class="getCorrelationColor(matrix[i][j])">
                  <input
                    type="number"
                    step="0.01"
                    min="-1"
                    max="1" 
                    :value="matrix[i][j].toFixed(2)"
                    @input="updateCorrelation(i, j, parseFloat(($event.target as HTMLInputElement).value))"
                    class="w-16 h-8 text-center text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Legend and interpretation -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Correlation Legend -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-gray-900 mb-3">Correlation Strength Guide</h4>
        <div class="space-y-2 text-xs">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
            <span><strong>Strong (0.6-1.0):</strong> Assets move together closely</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
            <span><strong>Moderate (0.4-0.6):</strong> Noticeable relationship</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span><strong>Weak (0.2-0.4):</strong> Some relationship</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
            <span><strong>Very Weak (0.0-0.2):</strong> Little relationship</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
            <span><strong>Uncorrelated (≈0):</strong> Independent movement</span>
          </div>
        </div>
      </div>

      <!-- Key Relationships -->
      <div class="bg-blue-50 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-blue-900 mb-3">Typical Institutional Assumptions</h4>
        <div class="space-y-2 text-xs text-blue-800">
          <div><strong>Public ↔ Private Equity:</strong> High correlation (0.70-0.80)</div>
          <div><strong>Equity ↔ Fixed Income:</strong> Low correlation (0.10-0.30)</div>
          <div><strong>Real Assets ↔ Equities:</strong> Moderate correlation (0.25-0.40)</div>
          <div><strong>Cash ↔ Risk Assets:</strong> Very low correlation (≈0.05)</div>
          <div><strong>Diversifying Strategies:</strong> Designed for low correlation</div>
        </div>
      </div>
    </div>

    <!-- Advanced Warning -->
    <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div class="flex items-start">
        <svg class="w-5 h-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <div>
          <p class="text-sm font-medium text-amber-900">Advanced Feature Warning</p>
          <p class="text-xs text-amber-800 mt-1">
            Modifying correlations affects portfolio risk calculations. Ensure the matrix remains positive semi-definite. 
            Extreme values may impact simulation stability.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure table cells maintain consistent sizing */
table {
  table-layout: fixed;
}

/* Styling for rotated headers */
th {
  position: relative;
}

/* Input styling based on correlation strength */
input[type="number"] {
  transition: all 0.2s ease-in-out;
}

input[type="number"]:focus {
  transform: scale(1.1);
  z-index: 10;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
