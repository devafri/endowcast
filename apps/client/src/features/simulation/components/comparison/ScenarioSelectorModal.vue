<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-container">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="text-xl font-semibold text-gray-900">Select Scenario</h2>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search and Filters -->
        <div class="modal-filters">
          <div class="search-box">
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search scenarios..."
              class="search-input"
            />
          </div>

          <div class="filter-buttons">
            <button
              v-for="status in filterOptions"
              :key="status.value"
              @click="filterStatus = status.value"
              :class="['filter-btn', { active: filterStatus === status.value }]"
            >
              {{ status.label }}
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="modal-body">
          <div class="flex items-center justify-center py-12">
            <div class="loading-spinner"></div>
            <span class="ml-2 text-sm text-gray-600">Loading scenarios...</span>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="modal-body">
          <div class="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
            <p class="font-medium">Error loading scenarios</p>
            <p class="mt-1">{{ error }}</p>
            <button @click="() => loadScenarios()" class="mt-3 text-red-800 hover:text-red-900 underline">
              Try again
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredScenarios.length === 0" class="modal-body">
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No scenarios found</h3>
            <p class="mt-1 text-sm text-gray-500">
              {{ searchQuery ? 'Try adjusting your search or filters.' : 'Create your first simulation to get started.' }}
            </p>
          </div>
        </div>

        <!-- Scenarios List -->
        <div v-else class="modal-body">
          <div class="scenarios-list">
            <button
              v-for="scenario in filteredScenarios"
              :key="scenario.id"
              @click="selectScenario(scenario)"
              class="scenario-item"
              :disabled="isAlreadyAdded(scenario.id)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-medium text-gray-900 truncate">{{ scenario.name }}</h3>
                  <span
                    v-if="!scenario.isCompleted"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    Draft
                  </span>
                  <span
                    v-if="isAlreadyAdded(scenario.id)"
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                  >
                    Added
                  </span>
                </div>

                <p v-if="scenario.description" class="text-sm text-gray-500 truncate mb-2">
                  {{ scenario.description }}
                </p>

                <div class="flex items-center gap-4 text-xs text-gray-500">
                  <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ formatCurrency(scenario.initialValue) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {{ scenario.years }} years
                  </span>
                  <span class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ formatDate(scenario.createdAt) }}
                  </span>
                </div>
              </div>

              <div class="flex-shrink-0">
                <svg 
                  class="w-5 h-5 transition-transform"
                  :class="{ 'text-gray-300': isAlreadyAdded(scenario.id), 'text-blue-600': !isAlreadyAdded(scenario.id) }"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <p class="text-sm text-gray-500">
            {{ filteredScenarios.length }} scenario{{ filteredScenarios.length === 1 ? '' : 's' }} available
          </p>
          <button
            @click="$emit('close')"
            class="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useScenarioHistory, type Scenario } from '../../composables/useScenarioHistory';

const emit = defineEmits<{
  close: [];
  select: [simulationId: string, name: string, description?: string];
}>();

const props = defineProps<{
  excludeIds?: string[];
}>();

const {
  scenarios,
  isLoading,
  error,
  loadScenarios,
} = useScenarioHistory();

const searchQuery = ref('');
const filterStatus = ref('all');

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'draft', label: 'Drafts' }
];

const filteredScenarios = computed(() => {
  let filtered = scenarios.value;

  // Filter by completion status
  if (filterStatus.value === 'completed') {
    filtered = filtered.filter(s => s.isCompleted);
  } else if (filterStatus.value === 'draft') {
    filtered = filtered.filter(s => !s.isCompleted);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Sort by most recent first
  return filtered.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
});

function isAlreadyAdded(scenarioId: string): boolean {
  return props.excludeIds?.includes(scenarioId) || false;
}

function selectScenario(scenario: Scenario) {
  if (isAlreadyAdded(scenario.id)) return;
  
  emit('select', scenario.id, scenario.name, scenario.description);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

onMounted(() => {
  loadScenarios();
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 42rem;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-filters {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #6b7280;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover {
  background: #f9fafb;
}

.filter-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.scenarios-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scenario-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}

.scenario-item:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #f9fafb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.scenario-item:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  background: white;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.loading-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
