import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Tailwind first, so our custom styles can override
import './assets/tailwind.css'
import './assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
