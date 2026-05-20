import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.scss'
import { vLazySrc } from './composables/useLazyImage'

const app = createApp(App)
app.use(router)
app.directive('lazy-src', vLazySrc)
app.mount('#app')
