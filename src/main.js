import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from '@/scripts/router';
import axios from 'axios';

// Pinia 인스턴스 생성
const pinia = createPinia();

// Axios 설정
axios.defaults.withCredentials = true;
axios.interceptors.request.use(config => {
  const token = localStorage.getItem("jwt");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 앱 생성 및 마운트
const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount('#app');