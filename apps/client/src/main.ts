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

// Initialize stores after app is mounted
import { useAuthStore } from './features/auth/stores/auth'
import { useSimulationStore } from './features/simulation/stores/simulation'

// Initialize auth
const authStore = useAuthStore()
authStore.initializeAuth()
