import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Tailwind first, so our custom styles can override
import './assets/tailwind.css'
import './assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// Initialize stores after app is mounted
import { useAuthStore } from './stores/auth'
import { useSimulationStore } from './stores/simulation'

// Initialize auth
const authStore = useAuthStore()
authStore.initializeAuth()
