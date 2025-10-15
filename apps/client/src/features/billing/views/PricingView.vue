<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth';
import { apiService } from '@/shared/services/api';
import PageHero from '@/shared/components/ui/PageHero.vue';
import CTABand from '@/shared/components/ui/CTABand.vue';

const router = useRouter();
const authStore = useAuthStore();

const billingCycle = ref<'monthly' | 'annual'>('monthly');

const plans = [
  { name: 'Free', planType: 'FREE', price: 0, description: 'Try EndowCast with limited features.', features: ['5 simulations per month'], buttonText: 'Start Free', popular: false },
  { name: 'Analyst Pro', planType: 'ANALYST_PRO', price: 49, description: 'For individual analysts', features: ['50 simulations / month'], buttonText: 'Start Analyst Pro', popular: false },
  { name: 'Foundation', planType: 'FOUNDATION', price: 249, description: 'For mid-size endowments', features: ['500 simulations / month'], buttonText: 'Start Foundation', popular: true },
  { name: 'Foundation Pro', planType: 'FOUNDATION_PRO', price: 449, description: 'Enterprise features', features: ['Unlimited simulations'], buttonText: 'Contact Sales', popular: false },
];

function annualPrice(monthly: number) {
  return Math.round(monthly * 12 * 0.85);
}

const displayedPlans = computed(() =>
  plans.map(p => billingCycle.value === 'annual' ? { ...p, displayPrice: annualPrice(p.price), period: 'yr' } : { ...p, displayPrice: p.price, period: 'mo' })
);

function setBillingCycle(v: 'monthly' | 'annual') { billingCycle.value = v; }

async function selectPlan(plan: any) {
  if (authStore.isAuthenticated) {
    if (plan.planType === 'FREE') return router.push('/organization');
    if (!authStore.isAdmin) { alert('Only organization admins can upgrade.'); return router.push('/organization'); }
    try { const resp = await apiService.createCheckoutSession(plan.planType, 'card'); if (resp?.url) window.location.href = resp.url; } catch (e) { console.error(e); alert('Unable to start checkout.'); }
  } else {
    router.push(`/signup?plan=${plan.planType}`);
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-800">
    <PageHero>
      <template #title>Choose Your Plan</template>
      <template #subtitle>Start with a free trial — then upgrade to unlock advanced features.</template>
      <template #controls>
        <div class="inline-flex items-center bg-white rounded-full p-1 shadow-sm border border-slate-100">
          <button @click.prevent="setBillingCycle('monthly')" :class="billingCycle === 'monthly' ? 'px-4 py-2 rounded-full bg-slate-800 text-white text-sm' : 'px-4 py-2 rounded-full text-sm text-slate-600'" class="transition-colors duration-150 hover:bg-slate-100">Monthly</button>
          <button @click.prevent="setBillingCycle('annual')" :class="billingCycle === 'annual' ? 'px-4 py-2 rounded-full bg-slate-800 text-white text-sm' : 'px-4 py-2 rounded-full text-sm text-slate-600'" class="ml-1 transition-colors duration-150 hover:bg-slate-100">Annual (save 15%)</button>
        </div>
      </template>
    </PageHero>

    <div class="max-w-7xl mx-auto px-4 pb-12">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="(plan, idx) in displayedPlans" :key="idx" class="rounded-xl border border-slate-100 bg-white p-6 text-center">
            <div class="text-sm font-semibold text-slate-600">{{ plan.name }}</div>
            <div class="mt-4 flex items-baseline justify-center gap-2">
              <div class="text-3xl font-extrabold">${{ plan.displayPrice }}</div>
              <div class="text-sm text-slate-500">/{{ plan.period }}</div>
            </div>
            <p class="text-sm text-slate-500 mt-3">{{ plan.description }}</p>

            <!-- Feature list (keep small) -->
            <ul class="mt-4 text-sm text-slate-600 space-y-2 text-left">
              <li v-for="(f, i) in plan.features" :key="i">{{ f }}</li>
              <!-- Add some common filler items if plan.features is minimal -->
              <li v-if="plan.planType === 'FREE'">Standard assumption sets</li>
              <li v-if="plan.planType === 'FREE'">Community support</li>
              <li v-if="plan.planType === 'ANALYST_PRO'">Custom assumption sets</li>
              <li v-if="plan.planType === 'ANALYST_PRO'">Exportable reports</li>
              <li v-if="plan.planType === 'FOUNDATION'">Team access & permissions</li>
              <li v-if="plan.planType === 'FOUNDATION'">Priority email support</li>
              <li v-if="plan.planType === 'FOUNDATION_PRO'">Dedicated CSM</li>
              <li v-if="plan.planType === 'FOUNDATION_PRO'">Onboarding assistance</li>
            </ul>

            <div class="mt-6">
              <button @click="selectPlan(plan)" class="mt-2 inline-block w-full px-4 py-2 rounded-md font-semibold text-sm" :class="plan.popular ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-800'">{{ plan.buttonText }}</button>
            </div>
          </div>
      </div>
    </div>

      <!-- Feature comparison table (contained) -->
      <div class="max-w-7xl mx-auto px-4">
        <section class="mt-12 bg-white rounded-xl border border-slate-100 p-6">
          <h3 class="text-lg font-semibold">Feature comparison</h3>
          <div class="mt-4 overflow-x-auto">
              <table class="w-full text-sm max-w-full">
                <thead class="text-slate-600">
                  <tr>
                    <th class="py-3 text-left">Feature</th>
                    <th class="py-3 text-center">Free</th>
                    <th class="py-3 text-center">Analyst Pro</th>
                    <th class="py-3 text-center">Foundation</th>
                    <th class="py-3 text-center">Foundation Pro</th>
                  </tr>
                </thead>
                <tbody class="text-slate-600 divide-y">
                  <tr>
                    <td class="py-3">Simulations / month</td>
                    <td class="py-3 text-center">5</td>
                    <td class="py-3 text-center">50</td>
                    <td class="py-3 text-center">500</td>
                    <td class="py-3 text-center">Unlimited</td>
                  </tr>
                  <tr>
                    <td class="py-3">Custom assumptions</td>
                    <td class="py-3 text-center">—</td>
                    <td class="py-3 text-center">✓</td>
                    <td class="py-3 text-center">✓</td>
                    <td class="py-3 text-center">✓</td>
                  </tr>
                  <tr>
                    <td class="py-3">Team seats</td>
                    <td class="py-3 text-center">—</td>
                    <td class="py-3 text-center">1</td>
                    <td class="py-3 text-center">5</td>
                    <td class="py-3 text-center">Custom</td>
                  </tr>
                  <tr>
                    <td class="py-3">Support</td>
                    <td class="py-3 text-center">Community</td>
                    <td class="py-3 text-center">Email</td>
                    <td class="py-3 text-center">Priority Email</td>
                    <td class="py-3 text-center">Dedicated</td>
                  </tr>
                </tbody>
              </table>
        </div>
          </section>

      <!-- FAQ (two-column, centered to match table/cards) -->
      <section class="mt-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <h3 class="text-lg font-semibold">Frequently Asked Questions</h3>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
            <div>
              <div class="font-medium">Can I cancel my subscription anytime?</div>
              <div class="mt-1">Yes — you can cancel at any time from your billing settings.</div>
            </div>
            <div>
              <div class="font-medium">Do you offer discounts for nonprofits?</div>
              <div class="mt-1">Yes — contact sales for nonprofit & academic pricing.</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <CTABand>
      <template #title>Ready to upgrade?</template>
      <template #subtitle>Pick a plan that suits your organization.</template>
      <template #actions>
        <router-link to="/signup" class="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold">Start Free</router-link>
      </template>
    </CTABand>
  </main>
</template>

