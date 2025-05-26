import Home from "@/pages/Home.vue";
import Login from "@/pages/Login.vue";
import Profile from "@/pages/Profile.vue";
import Record from "@/pages/Record.vue";
import Ranking from "@/pages/Ranking.vue";
import Chat from "@/pages/Chat.vue"
import axios from 'axios';
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/scripts/store';

const routes = [
  { path: '/', component: Home, meta: { requiresAuth: true } },
  { path: '/login', component: Login, meta: { guestOnly: true } },
  { path: '/profile/:account?', component: Profile, meta: { requiresAuth: true } },
  { path: '/records', component: Record, meta: { requiresAuth: true } },
  { path: '/ranking', component: Ranking, meta: { requiresAuth: true } },
  { path: '/home', component: Home, meta: { requiresAuth: true } },
  { path: '/chat', component: Chat, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// ✅ 인증 캐시 관리
let authCache = {
  isLoggedIn: null,
  lastCheckTime: 0,
  cacheValidTime: 5 * 60 * 1000, // 5분 캐시
  isChecking: false, // 중복 체크 방지
  checkPromise: null // 진행 중인 Promise 재사용
};

// ✅ JWT 토큰 기반 빠른 인증 체크
const isTokenValid = () => {
  const token = localStorage.getItem('jwt');
  if (!token) {
    // ✅ 토큰이 없어도 쿠키 인증이 있을 수 있으므로 null 반환 (서버 체크 필요)
    console.log('🍪 Router - JWT 토큰 없음, 쿠키 인증 서버 체크 필요');
    return null; // null = 서버 체크 필요
  }
  
  try {
    // JWT 토큰 만료 시간 체크 (선택사항)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    
    // 토큰이 만료되었으면 false
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem('jwt');
      return false;
    }
    
    return true;
  } catch (error) {
    // 토큰 파싱 실패시 false
    localStorage.removeItem('jwt');
    return false;
  }
};

// ✅ 최적화된 인증 체크 함수
const checkAuth = async () => {
  const now = Date.now();
  
  // 1. 토큰 검증
  const tokenValid = isTokenValid();
  
  if (tokenValid === false) {
    // 토큰이 명확히 무효한 경우만 즉시 false 반환
    console.log('🔒 Router - 토큰 무효함');
    authCache.isLoggedIn = false;
    authCache.lastCheckTime = now;
    return false;
  }
  
  // 2. 토큰이 유효하거나 없는 경우 캐시 확인
  if (authCache.isLoggedIn !== null && 
      now - authCache.lastCheckTime < authCache.cacheValidTime) {
    console.log('✅ Router - 캐시된 인증 상태 사용:', authCache.isLoggedIn);
    return authCache.isLoggedIn;
  }
  
  // 3. 이미 체크 중이면 기존 Promise 재사용
  if (authCache.isChecking && authCache.checkPromise) {
    console.log('⏳ Router - 진행 중인 인증 체크 대기');
    return await authCache.checkPromise;
  }
  
  // 4. 새로운 인증 체크 시작 (토큰이 있든 없든 서버에 확인)
  authCache.isChecking = true;
  authCache.checkPromise = performAuthCheck();
  
  try {
    const result = await authCache.checkPromise;
    return result;
  } finally {
    authCache.isChecking = false;
    authCache.checkPromise = null;
  }
};

// ✅ 실제 서버 인증 체크 (최소화된 호출)
// ✅ 개선된 실제 서버 인증 체크
const performAuthCheck = async () => {
  console.log('🔍 Router - 서버 인증 체크 시작');
  
  try {
    const { data } = await axios.get('/api/auth/check', {
      timeout: 5000, // 5초 타임아웃 (3초에서 증가)
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    const isLoggedIn = data && data.id;
    
    // 캐시 업데이트
    authCache.isLoggedIn = isLoggedIn;
    authCache.lastCheckTime = Date.now();
    
    // Pinia 스토어도 업데이트
    const userStore = useUserStore();
    if (isLoggedIn) {
      userStore.setCurrentMember(data);
      console.log('✅ Router - 로그인 상태, 사용자 정보 업데이트');
    } else {
      userStore.logout();
      console.log('❌ Router - 로그아웃 상태');
    }
    
    return isLoggedIn;
    
  } catch (error) {
    console.error('❌ Router - 인증 체크 실패:', error);
    
    // ✅ 개선된 에러 처리
    if (error.response?.status === 401) {
      // 명확한 401 인증 실패
      console.log('🚫 Router - 401 인증 실패, 토큰 무효');
      localStorage.removeItem('jwt'); // 무효한 토큰 제거
      authCache.isLoggedIn = false;
      authCache.lastCheckTime = Date.now();
      return false;
    } else if (error.code === 'ECONNABORTED' || !error.response) {
      // 네트워크 오류나 타임아웃 - 토큰 기반으로 판단
      console.log('🌐 Router - 네트워크 오류, 토큰 기반 판단');
      const hasValidToken = isTokenValid();
      authCache.isLoggedIn = hasValidToken;
      authCache.lastCheckTime = Date.now();
      return hasValidToken;
    } else {
      // 기타 서버 오류 - 보수적으로 false 반환
      console.log('🚫 Router - 서버 오류, 인증 실패로 처리');
      authCache.isLoggedIn = false;
      authCache.lastCheckTime = Date.now();
      return false;
    }
  }
};

// ✅ 인증 캐시 무효화 (로그인/로그아웃시 호출)
export const invalidateAuthCache = () => {
  console.log('🗑️ Router - 인증 캐시 무효화');
  authCache.isLoggedIn = null;
  authCache.lastCheckTime = 0;
};

// ✅ 강제 인증 체크 (필요시 사용)
export const forceAuthCheck = async () => {
  invalidateAuthCache();
  return await checkAuth();
};

// ✅ 최적화된 전역 네비게이션 가드
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth;
  const guestOnly = to.meta.guestOnly;
  
  console.log(`🧭 Router - 페이지 이동: ${from.path} → ${to.path}`);
  
  // 인증이 필요없는 페이지는 바로 통과
  if (!requiresAuth && !guestOnly) {
    console.log('📖 Router - 인증 불필요, 바로 통과');
    return next();
  }
  
  try {
    // ✅ 최적화된 인증 체크 (캐시 활용 + 중복 방지)
    const isLoggedIn = await checkAuth();
    
    console.log(`🔐 Router - 인증 상태: ${isLoggedIn ? '로그인됨' : '비로그인'}`);
    
    // 보호된 페이지 접근 시 로그인 체크
    if (requiresAuth && !isLoggedIn) {
      console.log('🚫 Router - 로그인 필요, /login으로 리디렉션');
      return next('/login');
    }
    
    // 게스트 전용 페이지에 로그인된 사용자 접근 시
    if (guestOnly && isLoggedIn) {
      console.log('🏠 Router - 이미 로그인됨, /home으로 리디렉션');
      return next('/home');
    }
    
    console.log('✅ Router - 페이지 이동 허용');
    return next();
    
  } catch (error) {
    console.error('❌ Router - 네비게이션 가드 오류:', error);
    
    // 오류 발생 시 안전한 처리
    if (requiresAuth) {
      console.log('🚫 Router - 오류로 인한 /login 리디렉션');
      return next('/login');
    }
    
    console.log('📖 Router - 오류 무시하고 페이지 이동 허용');
    return next();
  }
});

// ✅ 라우터 이동 완료 후 로깅 (디버깅용)
router.afterEach((to, from) => {
  console.log(`✅ Router - 페이지 이동 완료: ${to.path}`);
});

export default router;

export const updateAuthCache = (isLoggedIn = true) => {
  console.log('✅ Router - 인증 캐시 직접 업데이트:', isLoggedIn);
  authCache.isLoggedIn = isLoggedIn;
  authCache.lastCheckTime = Date.now();
};