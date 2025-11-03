<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../auth/stores/auth';
import apiService, { ApiError } from '@/shared/services/api';


const router = useRouter();
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

function goToPricing() {
  router.push({ name: 'Pricing' });
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <header class="mb-10 text-center">
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Organization Management</h1>
        <p class="text-slate-600 mt-2 text-sm">Manage your organization settings, users, and subscription details</p>
      </header>

      <!-- Error / Success Messages -->
      <transition name="fade">
        <div
          v-if="error"
          class="mb-6 rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 shadow-sm"
        >
          {{ error }}
        </div>
      </transition>
      <transition name="fade">
        <div
          v-if="success"
          class="mb-6 rounded-lg border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-700 shadow-sm"
        >
          {{ success }}
        </div>
      </transition>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Organization Info -->
          <section class="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-slate-800">Organization Details</h2>

              <!-- Edit button (tertiary) -->
              <button
                v-if="isAdmin"
                @click="editOrganization"
                class="text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium transition px-3 py-1.5 rounded-md"
                aria-label="Edit organization"
              >
                Edit
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-slate-500 uppercase mb-1">Organization Name</label>
                <p class="text-slate-800 font-medium">{{ organization?.name || 'Loading…' }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-500 uppercase mb-1">Industry</label>
                <p class="text-slate-800 font-medium">{{ organization?.industry || 'Not specified' }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-500 uppercase mb-1">Created</label>
                <p class="text-slate-800 font-medium">{{ organization ? formatDate(organization.createdAt) : 'Loading…' }}</p>
              </div>
            </div>
          </section>

          <!-- User Management -->
          <section v-if="isAdmin" class="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-slate-800">Organization Users</h2>

              <!-- Invite User (outlined sage) -->
              <button
                @click="showInviteUser = true"
                class="inline-flex items-center gap-2 border border-accent text-accent font-medium px-3 py-1.5 rounded-lg hover:bg-sky-50 transition"
                aria-label="Invite user"
              >
                Invite User
              </button>
            </div>

            <div v-if="loading" class="text-center py-6">
              <div class="loading-spinner mx-auto"></div>
            </div>

            <div v-else class="overflow-x-auto rounded-lg border border-slate-100">
              <table class="min-w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-600 uppercase text-xs font-medium">
                  <tr>
                    <th class="px-6 py-3">User</th>
                    <th class="px-6 py-3">Role</th>
                    <th class="px-6 py-3">Joined</th>
                    <th class="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr
                    v-for="user in organizationUsers"
                    :key="user.id"
                    class="hover:bg-slate-50 transition"
                  >
                    <td class="px-6 py-3">
                      <div>
                        <p class="font-medium text-slate-800">{{ user.firstName }} {{ user.lastName }}</p>
                        <p class="text-xs text-slate-500">{{ user.email }}</p>
                      </div>
                    </td>
                    <td class="px-6 py-3">
                      <span
                        class="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full"
                        :class="user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'"
                      >
                        {{ user.role }}
                      </span>
                    </td>
                    <td class="px-6 py-3 text-slate-600">
                      {{ formatDate(user.createdAt) }}
                    </td>
                    <td class="px-6 py-3">
                      <select
                        :value="user.role"
                        @change="updateUserRole(user.id, ($event.target as HTMLSelectElement).value as 'USER' | 'ADMIN')"
                        class="border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-accent))]"
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="organizationUsers.length === 0" class="text-center py-6 text-slate-500 text-sm">
                No users found.
              </div>
            </div>
          </section>
        </div>

        <!-- Sidebar -->
        <aside class="space-y-6">
          <!-- Subscription -->
          <div class="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition p-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Subscription</h3>
            <div class="space-y-3 text-sm">
              <div>
                <span class="text-slate-500 block text-xs uppercase mb-1">Plan</span>
                <p class="text-slate-800 font-medium">{{ subscription?.planType || 'FREE' }}</p>
              </div>
              <div>
                <span class="text-slate-500 block text-xs uppercase mb-1">Status</span>
                <span
                  :class="subscription?.status === 'active' ? 'text-green-700' : 'text-orange-600'"
                  class="font-medium"
                >
                  {{ subscription?.status || 'Active' }}
                </span>
              </div>
              <div v-if="subscription?.currentPeriodEnd">
                <span class="text-slate-500 block text-xs uppercase mb-1">Next Billing</span>
                <p class="text-slate-800 font-medium">{{ formatDate(subscription.currentPeriodEnd) }}</p>
              </div>
            </div>

            <!-- Upgrade  -->
            <button
              @click="goToPricing"
              class="w-full mt-5 inline-flex items-center justify-center gap-2 bg-accent text-white font-medium px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
            >
              Upgrade Plan
            </button>
          </div>

          <!-- Usage -->
          <div class="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition p-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Usage This Month</h3>
            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Simulations</span>
                  <span class="font-medium text-slate-900">
                    {{ currentUsage?.monthlySimulations || 0 }} / {{ currentUsage?.monthlyLimit === -1 ? '∞' : currentUsage?.monthlyLimit || 10 }}
                  </span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all duration-500 bg-accent"
                    :style="{ width: currentUsage?.monthlyLimit === -1 ? '100%' : `${Math.min(100, (currentUsage?.monthlySimulations || 0) / (currentUsage?.monthlyLimit || 10) * 100)}%` }"
                  ></div>
                </div>
              </div>
              <p class="text-xs text-slate-500">
                {{ authStore.remainingSimulations === 'unlimited' ? 'Unlimited' : authStore.remainingSimulations }} remaining
              </p>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition p-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Quick Stats</h3>
            <ul class="space-y-2 text-sm">
              <li class="flex justify-between">
                <span class="text-slate-600">Total Users</span>
                <span class="font-medium text-slate-900">{{ organization?.userCount || organizationUsers.length }}</span>
              </li>
              <li class="flex justify-between">
                <span class="text-slate-600">Total Simulations</span>
                <span class="font-medium text-slate-900">{{ currentUsage?.totalSimulations || 0 }}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>

    <!-- Edit Organization Modal -->
    <div
      v-if="showEditOrganization"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h3 class="text-lg font-semibold text-slate-800 mb-4">Edit Organization</h3>
        <form @submit.prevent="saveOrganization" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Organization Name</label>
            <input v-model="editForm.name" type="text" required class="input-field w-full p-3 rounded-md border border-slate-200" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Industry</label>
            <input
              v-model="editForm.industry"
              type="text"
              class="input-field w-full p-3 rounded-md border border-slate-200"
              placeholder="e.g., Education, Healthcare, Finance"
            />
          </div>
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="showEditOrganization = false" class="inline-flex items-center px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" :disabled="loading" class="inline-flex items-center px-4 py-2 rounded-md bg-accent text-white font-medium disabled:opacity-50 hover:opacity-90 transition">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Invite User Modal -->
    <div
      v-if="showInviteUser"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h3 class="text-lg font-semibold text-slate-800 mb-4">Invite User</h3>
        <form @submit.prevent="inviteUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input
              v-model="inviteForm.email"
              type="email"
              required
              class="input-field w-full p-3 rounded-md border border-slate-200"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <select v-model="inviteForm.role" class="input-field w-full p-3 rounded-md border border-slate-200">
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="showInviteUser = false" class="inline-flex items-center px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" :disabled="loading" class="inline-flex items-center px-4 py-2 rounded-md bg-accent text-white font-medium disabled:opacity-50 hover:opacity-90 transition">
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>
