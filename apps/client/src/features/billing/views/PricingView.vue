<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth';
import { apiService } from '@/shared/services/api';

const router = useRouter();
const authStore = useAuthStore();

const plans = [
  {
    name: 'Free',
    planType: 'FREE',
    price: 0,
    period: 'forever',
    description: 'Try EndowCast and evaluate basic features',
    features: [
      '5 simulations per month',
      'Basic portfolio allocation',
      'Standard reporting (in-app)',
      'Community support',
      'Multi-user organizations (limited)'
    ],
    limitations: [
      'No stress testing',
      'No exports (CSV available on paid plans)',
      'Limited analytics features'
    ],
    buttonText: 'Start Free',
    buttonClass: 'btn-secondary',
    popular: false
  },
  {
    name: 'Analyst Pro',
    planType: 'ANALYST_PRO',
    price: 49,
    period: 'month',
    description: 'For small teams and advisors',
    features: [
      '25 simulations per month',
      'Stress testing & scenario comparison',
      'All asset class assumptions',
      'CSV export & scenario sharing',
      'Multi-user collaboration',
      'Email support (48hr response)',
      'Access to knowledge base'
    ],
    limitations: [],
    buttonText: 'Start Analyst Pro',
    buttonClass: 'btn-primary',
    popular: false
  },
  {
    name: 'Foundation',
    planType: 'FOUNDATION',
    price: 249,
    period: 'month',
    description: 'For larger teams with frequent analysis',
    features: [
      '100 simulations per month',
      'Everything in Analyst Pro',
      'Priority email support (24hr response)',
      'Advanced analytics dashboard',
      'User management & roles',
      'Usage reporting & monthly exports'
    ],
    limitations: [],
    buttonText: 'Start Foundation',
    buttonClass: 'btn-primary',
    popular: true
  },
  {
    name: 'Foundation Pro',
    planType: 'FOUNDATION_PRO',
    price: 449,
    period: 'month',
    description: 'For organizations needing high throughput',
    features: [
      '250 simulations per month',
      'Everything in Foundation',
      'Priority support (12hr response)',
      'API access & integrations (coming soon)',
      'Advanced export options (CSV, bulk)',
      'Dedicated customer success & onboarding'
    ],
    limitations: [],
    buttonText: 'Contact Sales',
    buttonClass: 'btn-primary',
    popular: false
  }
];

async function selectPlan(plan: typeof plans[0]) {
  if (authStore.isAuthenticated) {
    // User is logged in, handle plan upgrade
    if (plan.planType === 'FREE') {
      // Already on free plan - redirect to organization settings
      router.push('/organization');
    } else if (plan.planType === 'FOUNDATION_PRO') {
      // Contact sales for enterprise plan - route to contact page with subject
      router.push({ path: '/contact', query: { subject: 'Foundation Pro Plan Inquiry' } });
    } else {
      // For paid plans, start checkout flow
      try {
        if (!authStore.isAdmin) {
          alert('Only organization administrators can upgrade plans. Please contact your admin.');
          router.push('/organization');
          return;
        }

        const resp = await apiService.createCheckoutSession(plan.planType);
        if (resp && resp.url) {
          window.location.href = resp.url;
          return;
        }
      } catch (err) {
        console.error('Failed to create checkout session', err);
        alert('Unable to start checkout. Please contact support.');
      }
    }
  } else {
    // User not logged in, redirect to signup with plan
    if (plan.planType === 'FREE') {
      router.push('/signup');
    } else if (plan.planType === 'FOUNDATION_PRO') {
      // Contact sales for enterprise - route to contact page with subject
      router.push({ path: '/contact', query: { subject: 'Foundation Pro Plan Inquiry' } });
    } else {
      router.push(`/signup?plan=${plan.planType}`);
    }
  }
}

async function handlePlanUpgrade(planType: 'ANALYST_PRO' | 'FOUNDATION' | 'FOUNDATION_PRO') {
  if (!authStore.isAuthenticated) {
    // Not logged in - redirect to signup with plan
    router.push(`/signup?plan=${planType}`);
    return;
  }

  if (!authStore.isAdmin) {
    // Not an admin - show message and redirect to organization page
    alert('Only organization administrators can upgrade plans. Please contact your admin.');
    router.push('/organization');
    return;
  }

  // Admin user - redirect to organization management for plan upgrade
  alert(`Plan upgrade to ${planType} would be handled through organization management. This would integrate with payment processing.`);
  router.push('/organization');
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Hero Section -->
    <section class="py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-5xl font-bold text-gray-900 mb-6">
          Choose Your Plan
        </h1>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Start with a free trial, then upgrade to unlock advanced features for comprehensive endowment analysis.
        </p>
        <div class="flex items-center justify-center gap-4 mb-12">
          <div class="flex items-center gap-2 text-sm text-green-600">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>No setup fees</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-blue-600">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>No long-term commitment</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>Hassle-free cancellation</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Cards -->
    <section class="pb-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="(plan, index) in plans" :key="index" class="relative">
            <!-- Popular badge -->
            <div v-if="plan.popular" class="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div class="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            </div>

            <!-- Card -->
            <div class="card p-8 h-full flex flex-col" :class="plan.popular ? 'ring-2 ring-blue-500 shadow-xl transform scale-105' : ''">
              <!-- Header -->
              <div class="text-center mb-8">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ plan.name }}</h3>
                <p class="text-gray-600 mb-4">{{ plan.description }}</p>
                <div class="flex items-baseline justify-center">
                  <span class="text-5xl font-bold text-gray-900">${{ plan.price }}</span>
                  <span class="text-gray-500 ml-2">{{ plan.price > 0 ? `/${plan.period}` : plan.period }}</span>
                </div>
              </div>

              <!-- Features -->
              <div class="flex-1 mb-8">
                <h4 class="font-semibold text-gray-900 mb-4">What's included:</h4>
                <ul class="space-y-3">
                  <li v-for="feature in plan.features" :key="feature" class="flex items-start">
                    <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-gray-700">{{ feature }}</span>
                  </li>
                </ul>

                <!-- Limitations for free trial -->
                <div v-if="plan.limitations.length > 0" class="mt-6">
                  <h4 class="font-semibold text-gray-900 mb-3">Limitations:</h4>
                  <ul class="space-y-2">
                    <li v-for="limitation in plan.limitations" :key="limitation" class="flex items-start">
                      <svg class="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                      </svg>
                      <span class="text-gray-500 text-sm">{{ limitation }}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- CTA Button -->
              <button 
                @click="selectPlan(plan)" 
                :disabled="false"
                :class="[
                  plan.buttonClass, 
                  'w-full py-4 px-6 text-lg font-semibold transition-all hover:shadow-lg',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none'
                ]"
              >
                <span v-if="authStore.isAuthenticated">
                  <span v-if="authStore.subscription && authStore.subscription.planType === plan.planType">
                    ✓ Current Plan
                  </span>
                  <span v-else>
                    {{ plan.buttonText }}
                  </span>
                </span>
                <span v-else>
                  {{ plan.buttonText }}
                </span>
              </button>

              <!-- Cancellation / commitment note -->
              <p v-if="plan.price > 0" class="text-center text-xs text-gray-500 mt-3">
                No long-term commitment — cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
        <div class="space-y-8">
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">What happens when I reach my simulation limit?</h3>
            <p class="text-gray-600">Your account won't be blocked, but you'll need to wait until next month for the limit to reset, or upgrade to a higher plan for more simulations.</p>
          </div>
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Can I cancel my subscription anytime?</h3>
            <p class="text-gray-600">Yes! You can cancel anytime. You'll keep access to all features until the end of your current billing period, then revert to view-only access for your historical simulations.</p>
          </div>
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Do you offer discounts for nonprofits or students?</h3>
            <p class="text-gray-600">Yes! Academic institutions and qualified nonprofits receive a 30% discount. Contact us with proof of eligibility.</p>
          </div>
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">How fast is your support response time?</h3>
            <p class="text-gray-600">Analyst Pro users receive email support within 48 hours. Foundation and Foundation Pro users get priority support within 24 hours. All support is provided via email.</p>
          </div>
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Is my endowment data secure and private?</h3>
            <p class="text-gray-600">Absolutely. All data is encrypted in transit and at rest using industry-standard practices. We never share or access your endowment data, and you can delete your account and all data anytime.</p>
          </div>
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">What counts as a "simulation"?</h3>
            <p class="text-gray-600">A simulation run is recorded each time a user clicks "Run monte carlo analysis" on the Results page. Usage is counted per organization across users.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 bg-gradient-to-r from-blue-600 to-blue-700">
      <div class="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-white mb-6">
          <span v-if="authStore.isAuthenticated">Upgrade your plan for more simulations</span>
          <span v-else>Ready to optimize your endowment strategy?</span>
        </h2>
        <p class="text-xl text-blue-100 mb-8">
          <span v-if="authStore.isAuthenticated">Get more simulations and advanced features with a paid plan.</span>
          <span v-else>Join hundreds of investment professionals who trust EndowCast for their forecasting needs.</span>
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <template v-if="authStore.isAuthenticated">
            <button @click="selectPlan(plans[1])" class="bg-white text-blue-600 hover:bg-gray-50 py-4 px-8 rounded-lg font-semibold transition-colors">
              <span v-if="authStore.subscription?.planType === 'ANALYST_PRO'">✓ Current Plan</span>
              <span v-else>Upgrade to Analyst Pro</span>
            </button>
            <button @click="selectPlan(plans[2])" class="border-2 border-white text-white hover:bg-white hover:text-blue-600 py-4 px-8 rounded-lg font-semibold transition-colors">
              <span v-if="authStore.subscription?.planType === 'FOUNDATION'">✓ Current Plan</span>
              <span v-else>Upgrade to Foundation</span>
            </button>
          </template>
          <template v-else>
            <RouterLink to="/signup" class="bg-white text-blue-600 hover:bg-gray-50 py-4 px-8 rounded-lg font-semibold transition-colors">
              Start Free
            </RouterLink>
            <RouterLink to="/signup?plan=ANALYST_PRO" class="border-2 border-white text-white hover:bg-white hover:text-blue-600 py-4 px-8 rounded-lg font-semibold transition-colors">
              Try Analyst Pro
            </RouterLink>
          </template>
        </div>
      </div>
    </section>
  </main>
</template>
