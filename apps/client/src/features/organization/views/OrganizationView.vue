<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth';
import { apiService, ApiError } from '@/shared/services/api';

const authStore = useAuthStore();
const loading = ref(false);
const error = ref('');
const success = ref('');

// Organization data
const organizationUsers = ref<any[]>([]);
const usageStats = ref<any>(null);

// Edit organization form
const showEditOrganization = ref(false);
const editForm = ref({
  name: '',
  industry: ''
});

// Invite user form  
const showInviteUser = ref(false);
const inviteForm = ref({
  email: '',
  role: 'USER' as 'USER' | 'ADMIN'
});

// Computed properties
const isAdmin = computed(() => authStore.isAdmin);
const organization = computed(() => authStore.organization);
const subscription = computed(() => authStore.subscription);
const currentUsage = computed(() => authStore.usageStats);

onMounted(async () => {
  await loadOrganizationData();
});

async function loadOrganizationData() {
  try {
    loading.value = true;
    error.value = '';

    // Load organization users (if admin)
    if (isAdmin.value) {
      const usersResponse = await apiService.getOrganizationUsers();
      organizationUsers.value = usersResponse.users;
    }

    // Refresh usage stats
    await authStore.refreshUsage();
    
  } catch (err) {
    console.error('Failed to load organization data:', err);
    error.value = 'Failed to load organization data';
  } finally {
    loading.value = false;
  }
}

async function editOrganization() {
  if (!organization.value) return;
  
  editForm.value.name = organization.value.name;
  editForm.value.industry = organization.value.industry || '';
  showEditOrganization.value = true;
}

async function saveOrganization() {
  try {
    loading.value = true;
    error.value = '';
    
    const result = await authStore.updateOrganization({
      name: editForm.value.name,
      industry: editForm.value.industry
    });
    
    if (result.success) {
      success.value = 'Organization updated successfully';
      showEditOrganization.value = false;
      setTimeout(() => success.value = '', 3000);
    } else {
      error.value = result.error || 'Failed to update organization';
    }
  } catch (err) {
    console.error('Failed to update organization:', err);
    error.value = 'Failed to update organization';
  } finally {
    loading.value = false;
  }
}

async function inviteUser() {
  try {
    loading.value = true;
    error.value = '';
    
    await apiService.inviteUser({
      email: inviteForm.value.email,
      role: inviteForm.value.role
    });
    
    success.value = 'Invitation sent successfully';
    showInviteUser.value = false;
    inviteForm.value.email = '';
    inviteForm.value.role = 'USER';
    setTimeout(() => success.value = '', 3000);
    
    // Reload users list
    await loadOrganizationData();
    
  } catch (err) {
    console.error('Failed to invite user:', err);
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to send invitation';
    }
  } finally {
    loading.value = false;
  }
}

async function updateUserRole(userId: string, newRole: 'USER' | 'ADMIN') {
  try {
    loading.value = true;
    error.value = '';
    
    await apiService.updateUserRole(userId, newRole);
    success.value = 'User role updated successfully';
    setTimeout(() => success.value = '', 3000);
    
    // Reload users list
    await loadOrganizationData();
    
  } catch (err) {
    console.error('Failed to update user role:', err);
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to update user role';
    }
  } finally {
    loading.value = false;
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString();
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Organization Management</h1>
        <p class="text-gray-600 mt-2">Manage your organization settings, users, and subscription</p>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-red-600 text-sm">{{ error }}</p>
      </div>
      <div v-if="success" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <p class="text-green-600 text-sm">{{ success }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Organization Details -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Organization Info Card -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-gray-900">Organization Details</h2>
              <button 
                v-if="isAdmin"
                @click="editOrganization"
                class="btn-secondary text-sm"
              >
                Edit
              </button>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Organization Name</label>
                <p class="text-gray-900">{{ organization?.name || 'Loading...' }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Industry</label>
                <p class="text-gray-900">{{ organization?.industry || 'Not specified' }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Created</label>
                <p class="text-gray-900">{{ organization ? formatDate(organization.createdAt) : 'Loading...' }}</p>
              </div>
            </div>
          </div>

          <!-- Users Management (Admin Only) -->
          <div v-if="isAdmin" class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-gray-900">Organization Users</h2>
              <button 
                @click="showInviteUser = true"
                class="btn-primary text-sm"
              >
                Invite User
              </button>
            </div>
            
            <div v-if="loading" class="text-center py-4">
              <div class="loading-spinner mx-auto"></div>
            </div>
            
            <div v-else class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="user in organizationUsers" :key="user.id">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{{ user.firstName }} {{ user.lastName }}</div>
                        <div class="text-sm text-gray-500">{{ user.email }}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span :class="user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'" 
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                        {{ user.role }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ formatDate(user.createdAt) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <select 
                        :value="user.role"
                        @change="updateUserRole(user.id, ($event.target as HTMLSelectElement).value as 'USER' | 'ADMIN')"
                        class="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div v-if="organizationUsers.length === 0" class="text-center py-4 text-gray-500">
                No users found
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Subscription Card -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Plan</label>
                <p class="text-gray-900 font-medium">{{ subscription?.planType || 'FREE' }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <span :class="subscription?.status === 'active' ? 'text-green-600' : 'text-orange-600'" 
                      class="font-medium">
                  {{ subscription?.status || 'Active' }}
                </span>
              </div>
              <div v-if="subscription?.currentPeriodEnd">
                <label class="block text-sm font-medium text-gray-500 mb-1">Next Billing</label>
                <p class="text-sm text-gray-900">{{ formatDate(subscription.currentPeriodEnd) }}</p>
              </div>
            </div>
            <button class="btn-secondary w-full mt-4">
              Upgrade Plan
            </button>
          </div>

          <!-- Usage Stats -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h3>
            <div class="space-y-3">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm text-gray-600">Simulations</span>
                  <span class="text-sm font-medium text-gray-900">
                    {{ currentUsage?.monthlySimulations || 0 }} / {{ currentUsage?.monthlyLimit === -1 ? '∞' : currentUsage?.monthlyLimit || 10 }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all"
                    :style="{ width: currentUsage?.monthlyLimit === -1 ? '100%' : `${Math.min(100, (currentUsage?.monthlySimulations || 0) / (currentUsage?.monthlyLimit || 10) * 100)}%` }"
                  ></div>
                </div>
              </div>
              <div class="text-sm text-gray-600">
                {{ authStore.remainingSimulations === 'unlimited' ? 'Unlimited' : authStore.remainingSimulations }} remaining
              </div>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Total Users</span>
                <span class="text-sm font-medium text-gray-900">{{ organization?.userCount || organizationUsers.length }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Total Simulations</span>
                <span class="text-sm font-medium text-gray-900">{{ currentUsage?.totalSimulations || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Organization Modal -->
    <div v-if="showEditOrganization" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Edit Organization</h3>
          <form @submit.prevent="saveOrganization" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
              <input 
                v-model="editForm.name"
                type="text"
                required
                class="input-field w-full p-3 rounded-md"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Industry</label>
              <input 
                v-model="editForm.industry"
                type="text"
                class="input-field w-full p-3 rounded-md"
                placeholder="e.g., Education, Healthcare, Finance"
              />
            </div>
            <div class="flex justify-end space-x-3 pt-4">
              <button 
                type="button"
                @click="showEditOrganization = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit"
                :disabled="loading"
                class="btn-primary disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Invite User Modal -->
    <div v-if="showInviteUser" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Invite User</h3>
          <form @submit.prevent="inviteUser" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input 
                v-model="inviteForm.email"
                type="email"
                required
                class="input-field w-full p-3 rounded-md"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select 
                v-model="inviteForm.role"
                class="input-field w-full p-3 rounded-md"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div class="flex justify-end space-x-3 pt-4">
              <button 
                type="button"
                @click="showInviteUser = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit"
                :disabled="loading"
                class="btn-primary disabled:opacity-50"
              >
                Send Invitation
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>
</template>
