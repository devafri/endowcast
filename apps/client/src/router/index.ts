import { createRouter, createWebHistory } from 'vue-router'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
  { path: '/', name: 'Landing', component: () => import('../views/LandingView.vue') },
  { path: '/pricing', name: 'Pricing', component: () => import('../views/PricingView.vue') },
  { path: '/contact', name: 'Contact', component: () => import('../views/ContactView.vue') },
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue') },
  { path: '/signup', name: 'Signup', component: () => import('../views/SignupView.vue') },
  { path: '/terms', name: 'Terms', component: () => import('../views/TermsView.vue') },
  { path: '/privacy', name: 'Privacy', component: () => import('../views/PrivacyView.vue') },
  { path: '/instructions', name: 'Instructions', component: () => import('../views/InstructionsView.vue') },
  { path: '/settings', name: 'Settings', component: () => import('../views/SettingsView.vue') },
  { path: '/organization', name: 'Organization', component: () => import('../views/OrganizationView.vue') },
  { path: '/allocation', name: 'Allocation', component: () => import('../views/AllocationView.vue') },
  { path: '/results', name: 'Results', component: () => import('../views/ResultsView.vue') },
  // Backward-compat route
  { path: '/simulation', redirect: '/settings' },
  ],
})

export default router
 
