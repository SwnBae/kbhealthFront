import Home from "@/pages/Home.vue";
import Login from "@/pages/Login.vue";
import Cart from "@/pages/Cart.vue";
import Register from "@/pages/Register.vue";
import Profile from "@/pages/Profile.vue";
import Record from "@/pages/Record.vue";
import Ranking from "@/pages/Ranking.vue";
import FeedWrite from "@/components/FeedWrite.vue";

import axios from 'axios';
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login, meta: { guestOnly: true } },
  { path: '/register', component: Register, meta: { guestOnly: true } },
  { path: '/cart', component: Cart, meta: { requiresAuth: true } },
  { path: '/profile/:account?', component: Profile, meta: { requiresAuth: true } },
  { path: '/records', component: Record, meta: { requiresAuth: true } },
  { path: '/ranking', component: Ranking, meta: { requiresAuth: true } },
  { path: '/home', component: Home, meta: { requiresAuth: true } },
  { path: '/feed/write', component: FeedWrite, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 전역 네비게이션 가드
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth;
  const guestOnly   = to.meta.guestOnly;

  try {
    const { data } = await axios.get('/api/auth/check');
    const isLoggedIn = data && data.id;

    if (requiresAuth && !isLoggedIn) {
      return next('/login');
    }
    if (guestOnly && isLoggedIn) {
      return next('/home');
    }
    return next();
  } catch (err) {
    // 인증 체크 실패 시, 보호된 페이지면 로그인으로
    if (requiresAuth) {
      return next('/login');
    }
    return next();
  }
});

export default router;
