import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../features/auth/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
  // Public pages
  { path: '/', name: 'Landing', component: () => import('../pages/public/LandingView.vue') },
  { path: '/contact', name: 'Contact', component: () => import('../pages/public/ContactView.vue') },
  { path: '/terms', name: 'Terms', component: () => import('../pages/public/TermsView.vue') },
  { path: '/privacy', name: 'Privacy', component: () => import('../pages/public/PrivacyView.vue') },
  { path: '/instructions', name: 'Instructions', component: () => import('../pages/public/InstructionsView.vue') },
  { path: '/definitions', name: 'Definitions', component: () => import('../pages/public/DefinitionsView.vue') },
  
  // Authentication
  { path: '/login', name: 'Login', component: () => import('../features/auth/views/LoginView.vue') },
  { path: '/register', name: 'Signup', component: () => import('../features/auth/views/SignupView.vue') },
  { path: '/verify-email', name: 'VerifyEmail', component: () => import('../features/auth/views/VerifyEmailView.vue') },
  { path: '/accept-invitation', name: 'AcceptInvitation', component: () => import('../features/organization/views/AcceptInvitationView.vue') },
  
  // Billing
  { path: '/pricing', name: 'Pricing', component: () => import('../features/billing/views/PricingView.vue') },
  { 
    path: '/payment/success', 
    name: 'PaymentSuccess', 
    component: () => import('../features/billing/views/PaymentSuccess.vue'),
    meta: { requiresAuth: true }
  },
  { 
    path: '/payment/cancel', 
    name: 'PaymentCancel', 
    component: () => import('../features/billing/views/PaymentCancel.vue'),
    meta: { requiresAuth: true }
  },
  
  // Protected routes - require authentication
  { 
    path: '/settings', 
    name: 'Settings', 
    component: () => import('../features/organization/views/SettingsView.vue'),
    meta: { requiresAuth: true }
  },
  { 
    path: '/organization', 
    name: 'Organization', 
    component: () => import('../features/organization/views/OrganizationView.vue'),
    meta: { requiresAuth: true }
  },
  
  // Simulation Features - require authentication
  { 
    path: '/allocation', 
    name: 'Allocation', 
    component: () => import('../features/simulation/views/AllocationView.vue'),
    meta: { requiresAuth: true }
  },
  // Route for creating a new simulation / viewing results without an ID
  { 
    path: '/results', 
    name: 'Results', 
    component: () => import('../features/simulation/views/ResultsView.vue'),
    meta: { requiresAuth: true },
    alias: ['/simulation', '/simulation/results']
  },
  // Named route for viewing a specific saved scenario by id (permalink)
  {
    path: '/results/:scenarioId',
    name: 'ResultsById',
    component: () => import('../features/simulation/views/ResultsView.vue'),
    meta: { requiresAuth: true }
  },
  { 
    path: '/history', 
    name: 'History', 
    component: () => import('../features/simulation/views/HistoryView.vue'),
    meta: { requiresAuth: true },
    alias: ['/simulation/history']
  },
  { 
    path: '/simulation/compare', 
    name: 'ScenarioComparison', 
    component: () => import('../features/simulation/views/ScenarioComparison.vue'),
    meta: { requiresAuth: true }
  },
  ],
})

// Navigation guard to handle authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    // If user is not authenticated, try to initialize auth first
    if (!authStore.isAuthenticated) {
      try {
        await authStore.initializeAuth()
      } catch (err) {
        console.error('Auth initialization failed:', err)
      }
    }
    
    // If still not authenticated after initialization, redirect to login
    if (!authStore.isAuthenticated) {
      next({ 
        name: 'Login', 
        query: { redirect: to.fullPath } // Store intended destination
      })
      return
    }
  }
  
  // If user is authenticated and trying to access login/signup, redirect to settings
  if (authStore.isAuthenticated && (to.name === 'Login' || to.name === 'Signup')) {
    next({ name: 'Settings' })
    return
  }
  
  next()
})

export default router
 
