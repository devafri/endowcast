import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Tailwind first, so our custom styles can override
import './shared/assets/tailwind.css'
import './shared/assets/main.css'
import './shared/assets/fonts.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// Global error handling
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', { error: err, info, instance })
}

app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue warning:', msg, trace)
}

app.use(pinia)
app.use(router)

// Mount app to DOM
const rootElement = document.getElementById('app')
if (rootElement) {
  app.mount(rootElement)
} else {
  console.error('✗ Root element #app not found in DOM')
}

// Initialize auth after the app is fully mounted
import { useAuthStore } from './features/auth/stores/auth'

// Initialize auth asynchronously - don't block app startup
setTimeout(async () => {
  const authStore = useAuthStore()
  console.log('Initializing auth...')
  try {
    await authStore.initializeAuth()
    console.log('✓ Auth initialized, isAuthenticated:', authStore.isAuthenticated)
  } catch (err) {
    console.error('✗ Auth initialization error:', err)
  }
}, 0)

// Global unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})
