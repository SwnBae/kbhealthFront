import {createApp} from 'vue'
import store from "@/scripts/store"
import router from "@/scripts/router";
import App from './App.vue'
import axios from "axios";

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

createApp(App).use(store).use(router).mount('#app')
