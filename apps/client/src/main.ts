import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Tailwind first, so our custom styles can override
import './shared/assets/tailwind.css'
import './shared/assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// Initialize auth after the app is fully mounted
import { useAuthStore } from './features/auth/stores/auth'

// Initialize auth asynchronously - don't block app startup
setTimeout(async () => {
  const authStore = useAuthStore()
  await authStore.initializeAuth()
}, 0)
