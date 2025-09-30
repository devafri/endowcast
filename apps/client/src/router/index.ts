import { createRouter, createWebHistory } from 'vue-router'


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
  { path: '/signup', name: 'Signup', component: () => import('../features/auth/views/SignupView.vue') },
  { path: '/verify-email', name: 'VerifyEmail', component: () => import('../features/auth/views/VerifyEmailView.vue') },
  
  // Billing
  { path: '/pricing', name: 'Pricing', component: () => import('../features/billing/views/PricingView.vue') },
  
  // Organization Management
  { path: '/settings', name: 'Settings', component: () => import('../features/organization/views/SettingsView.vue') },
  { path: '/organization', name: 'Organization', component: () => import('../features/organization/views/OrganizationView.vue') },
  
  // Simulation Features
  { path: '/allocation', name: 'Allocation', component: () => import('../features/simulation/views/AllocationView.vue') },
  { path: '/results', name: 'Results', component: () => import('../features/simulation/views/ResultsView.vue') },
  { path: '/history', name: 'History', component: () => import('../features/simulation/views/HistoryView.vue') },
  { path: '/simulation', name: 'Simulation', component: () => import('../features/simulation/views/SimulationView.vue') },
  ],
})

export default router
 
