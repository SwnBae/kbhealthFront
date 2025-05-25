<template>
  <div class="app-layout">
    <Footer v-if="isLoggedIn" class="sidebar-footer" />
    <div class="contentBox">
      <RouterView />
    </div>

    <!-- 우측 상단 알림 버튼 -->
    <div v-if="isLoggedIn" class="notification-button-container">
      <button
          @click="toggleNotification"
          class="notification-button"
          data-tooltip="알림 확인하기"
      >
        <img src="/assets/icon/notification.png" alt="알림" class="notification-icon">
        <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>
    </div>

    <!-- 알림 모달 -->
    <Notification
        v-if="showNotification"
        :isVisible="showNotification"
        @close="closeNotification"
    />

    <!-- 캐릭터 버튼 -->
    <div v-if="isLoggedIn" class="fixed-button">
      <button
          @click="toggleCharacter"
          class="character-button"
          data-tooltip="안녕하세요! 식단 도움이 필요하면 눌러주세요!"
          :class="{ 'show-initial-tooltip': showInitialTooltip }"
      >
        <img src="/assets/img/rabbit/rabbitgo (1).png" alt="토끼 캐릭터" class="button-image">
      </button>
    </div>

    <!-- 캐릭터 컴포넌트 -->
    <transition name="character-animation">
      <div v-if="showCharacter && isLoggedIn" class="fixed-character">
        <Character @close="showCharacter = false" />
      </div>
    </transition>

    <ToastChat ref="toastChatRef" />

    <!-- 토스트 컨테이너 -->
    <ToastContainer />
  </div>
</template>

<script setup>
import { onMounted, computed, ref, nextTick, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import Footer from "@/components/Footer.vue";
import Character from "@/components/Character.vue";
import Notification from "@/components/Notification.vue";
import ToastContainer from "@/components/ToastContainer.vue";
import ToastChat from '@/components/chat/ToastChat.vue';
import { useUserStore } from "@/scripts/store";
import { useWebSocket } from '@/composables/useWebSocket';
import { useToast } from '@/composables/useToast';
import axios from "axios";

const router = useRouter();
const userStore = useUserStore();
const { notification: showToastNotification } = useToast();
const showCharacter = ref(false);
const showInitialTooltip = ref(false);
const showNotification = ref(false);
const unreadCount = ref(0);
const toastChatRef = ref(null);

const {
  stompClient,
  isConnected,
  connect,
  disconnect,
  subscribe,
  checkConnection,
  forceReconnect
} = useWebSocket();

const notificationSubscription = ref(null);
const countSubscription = ref(null);
const chatMessageSubscription = ref(null); // 🆕 채팅 메시지 구독 관리

// 로그인 여부 확인
const isLoggedIn = computed(() => userStore.currentMember.id !== 0);

// 🆕 사용자 상태 변화 감지 (로그인/로그아웃 자동 처리)
watch(
    () => userStore.currentMember.id,
    (newId, oldId) => {
      console.log('👤 App.vue - 사용자 상태 변화:', { oldId, newId });
      console.log('👤 App.vue - 현재 사용자 정보:', userStore.currentMember);

      if (oldId !== 0 && newId === 0) {
        // 로그아웃 감지
        console.log('🚪 App.vue - 로그아웃 감지, WebSocket 정리');
        cleanupWebSocket();

      } else if (oldId === 0 && newId !== 0) {
        // 로그인 감지 (새로운 로그인)
        console.log('🔑 App.vue - 로그인 감지, WebSocket 초기화');
        console.log('🔑 App.vue - 로그인된 사용자:', userStore.currentMember);

        // 🆕 사용자 정보가 확실히 설정된 후 WebSocket 연결
        setTimeout(() => {
          console.log('🔌 WebSocket 연결 전 사용자 정보 재확인:', userStore.currentMember);
          if (userStore.currentMember && userStore.currentMember.id !== 0) {
            initializeWebSocket();
            fetchUnreadCountOnce();
          } else {
            console.warn('⚠️ 사용자 정보가 없어서 WebSocket 연결 지연');
            // 조금 더 기다려서 재시도
            setTimeout(() => {
              if (userStore.currentMember && userStore.currentMember.id !== 0) {
                console.log('🔄 지연 후 WebSocket 연결 재시도');
                initializeWebSocket();
                fetchUnreadCountOnce();
              }
            }, 1000);
          }
        }, 500); // 500ms로 단축
      }
    },
    { immediate: false }
);

// 로그인 여부 확인
const check = async () => {
  try {
    console.log('🔍 App.vue - 사용자 인증 체크 시작');
    console.log('🔍 App.vue - 요청 URL: /api/auth/check');

    const response = await axios.get("/api/auth/check");
    console.log('🔍 App.vue - HTTP 응답 상태:', response.status);
    console.log('🔍 App.vue - HTTP 응답 전체:', response);
    console.log('🔍 App.vue - 서버 응답 데이터:', response.data);
    console.log('🔍 App.vue - 응답 데이터 타입:', typeof response.data);

    const data = response.data;

    if (!data) {
      console.log('❌ App.vue - 응답 데이터가 falsy:', data);
      router.push("/login");
    } else if (!data.id) {
      console.log('❌ App.vue - 응답 데이터에 id가 없음:', data);
      console.log('❌ App.vue - data.id:', data.id);
      console.log('❌ App.vue - data의 모든 키:', Object.keys(data));
      router.push("/login");
    } else {
      console.log('✅ App.vue - 인증 성공, 사용자 정보 저장');
      console.log('👤 App.vue - 저장할 사용자 정보:', data);
      console.log('👤 App.vue - 사용자 ID:', data.id);

      userStore.setCurrentMember(data);

      // 저장 후 확인
      console.log('✅ App.vue - 저장 후 사용자 정보 확인:', userStore.currentMember);
      console.log('✅ App.vue - 저장 후 사용자 ID:', userStore.currentMember?.id);

      fetchUnreadCountOnce();
    }
  } catch (error) {
    console.error('❌ App.vue - 인증 체크 오류:', error);
    console.error('❌ App.vue - 오류 상세:', error.response?.data);
    console.error('❌ App.vue - HTTP 상태:', error.response?.status);
    router.push("/login");
  }
};

// 초기 알림 개수 조회
const fetchUnreadCountOnce = async () => {
  if (!isLoggedIn.value) return;

  try {
    const response = await axios.get('/api/notifications/unread/count');
    unreadCount.value = response.data;
  } catch (error) {
    console.error('알림 개수 조회 실패:', error);
  }
};

// 🆕 현재 페이지가 채팅 페이지인지 확인
const isCurrentPageChat = () => {
  return router.currentRoute.value.path === '/chat';
};

// 🆕 실시간 알림 구독 - 개선된 버전
const subscribeToNotifications = () => {
  if (!isConnected.value) {
    setTimeout(subscribeToNotifications, 1000);
    return;
  }

  console.log('📡 App.vue - 알림 구독 시작');

  // 개인 알림 구독 (댓글, 좋아요, 팔로우)
  notificationSubscription.value = subscribe(
      '/user/queue/notifications',
      (message) => {
        const notification = JSON.parse(message.body);
        console.log('🔔 App.vue - 새 알림 수신:', notification);

        // 토스트 알림 표시
        showToastNotification(notification);

        // 브라우저 알림 표시
        showRealtimeNotification(notification);
      }
  );

  // 알림 개수 실시간 구독
  countSubscription.value = subscribe(
      '/user/queue/notification-count',
      (message) => {
        const count = JSON.parse(message.body);
        console.log('🔢 App.vue - 알림 개수 업데이트:', count);
        unreadCount.value = count;
      }
  );

  // 🆕 채팅 메시지 구독 - 조건부 토스트 표시
  chatMessageSubscription.value = subscribe('/user/queue/chat-messages', (message) => {
    const chatMessage = JSON.parse(message.body);
    console.log('💬 App.vue - 새 채팅 메시지 수신:', chatMessage);

    // 🆕 현재 채팅 페이지가 아닌 경우에만 토스트 표시
    if (!isCurrentPageChat() && toastChatRef.value) {
      console.log('💬 App.vue - 채팅 토스트 표시');
      toastChatRef.value.addChatToast(chatMessage);
    } else {
      console.log('💬 App.vue - 채팅 페이지이므로 토스트 표시 안함');
    }
  });

  console.log('✅ App.vue - 모든 알림 구독 완료');
};

// WebSocket 연결 관리
const initializeWebSocket = async () => {
  if (!isLoggedIn.value) return;

  console.log('🔌 App.vue - WebSocket 초기화 시작');
  connect();

  let attempts = 0;
  const maxAttempts = 10;

  const waitForConnection = () => {
    attempts++;

    if (isConnected.value) {
      console.log('✅ App.vue - WebSocket 연결 완료, 알림 구독 시작');
      setTimeout(subscribeToNotifications, 500);
    } else if (attempts < maxAttempts) {
      setTimeout(waitForConnection, 1000);
    } else {
      console.warn('⚠️ App.vue - WebSocket 연결 실패, 재연결 시도');
      checkConnection();
      forceReconnect();
    }
  };

  waitForConnection();
};

// 🆕 WebSocket 정리 함수 - 개선된 버전
const cleanupWebSocket = () => {
  console.log('🧹 App.vue - WebSocket 정리 시작');

  // 🆕 모든 구독 해제
  const subscriptions = [
    { name: '알림', ref: notificationSubscription },
    { name: '카운트', ref: countSubscription },
    { name: '채팅 메시지', ref: chatMessageSubscription }
  ];

  subscriptions.forEach(({ name, ref }) => {
    if (ref.value) {
      try {
        ref.value.unsubscribe();
        ref.value = null;
        console.log(`✅ ${name} 구독 해제 완료`);
      } catch (error) {
        console.warn(`⚠️ ${name} 구독 해제 실패:`, error);
      }
    }
  });

  // WebSocket 연결 해제
  disconnect();

  // 알림 관련 상태 초기화
  unreadCount.value = 0;
  showNotification.value = false;

  console.log('✅ App.vue - WebSocket 정리 완료');
};

// 브라우저 알림 표시
const showRealtimeNotification = (notification) => {
  if (Notification.permission === 'granted') {
    new Notification(`🔔 새 알림`, {
      body: notification.content,
      icon: '/assets/icon/notification.png',
      tag: 'health-notification'
    });
  }
};

// 브라우저 알림 권한 요청
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const toggleCharacter = () => {
  nextTick(() => {
    showCharacter.value = !showCharacter.value;
  });
};

const toggleNotification = () => {
  nextTick(() => {
    showNotification.value = !showNotification.value;
  });
};

const closeNotification = () => {
  showNotification.value = false;
};

// 🆕 페이지 언로드 시 정리
const handleBeforeUnload = () => {
  console.log('🔄 페이지 언로드 - WebSocket 정리');
  cleanupWebSocket();
};

// 컴포넌트 마운트
onMounted(async () => {
  console.log('📱 App.vue 마운트 시작');

  await check();

  if (isLoggedIn.value) {
    // 초기 말풍선 표시
    setTimeout(() => {
      showInitialTooltip.value = true;
      setTimeout(() => {
        showInitialTooltip.value = false;
      }, 5000);
    }, 1000);

    // WebSocket 초기화
    await initializeWebSocket();

    // 브라우저 알림 권한 요청
    requestNotificationPermission();
  }

  // 🆕 페이지 언로드 이벤트 리스너 등록
  window.addEventListener('beforeunload', handleBeforeUnload);

  console.log('✅ App.vue 마운트 완료');
});

// 컴포넌트 해제
onBeforeUnmount(() => {
  console.log('🧹 App.vue 언마운트 - 정리 시작');

  // 이벤트 리스너 제거
  window.removeEventListener('beforeunload', handleBeforeUnload);

  // WebSocket 정리
  cleanupWebSocket();

  console.log('✅ App.vue 언마운트 완료');
});
</script>

<style>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar-footer {
  width: 80px;
  background-color: transparent;
  border-right: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 10;
}

.contentBox {
  flex-grow: 1;
  padding-left: 95px;
}

/* 캐릭터 버튼 */
.fixed-button {
  position: fixed;
  left: 60px;
  bottom: 40px;
  z-index: 11;
}

.character-button {
  width: 80px;
  height: 80px;
  background-color: transparent;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  padding: 0;
  position: relative;
  overflow: visible;
}

.character-button:hover {
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(120, 200, 100, 0.4);
  border-color: #A5D69A;
}

/* 말풍선 스타일 */
.character-button[data-tooltip]::before {
  content: attr(data-tooltip);
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  width: 240px;
  padding: 12px 16px;
  background-color: #E8F5E4;
  color: #4A7C40;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.2px;
  line-height: 1.4;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  opacity: 0;
  pointer-events: none;
  margin-left: 15px;
  text-align: center;
  z-index: 12;
  border: 2px solid #A5D69A;
  transition: opacity 0.3s ease, transform 0.3s ease;
  transform: translateY(-50%) translateX(-20px);
}

.character-button[data-tooltip]::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  border-width: 8px;
  border-style: solid;
  border-color: transparent #A5D69A transparent transparent;
  margin-left: 0px;
  z-index: 12;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  transform: translateY(-50%) translateX(-10px);
}

.character-button[data-tooltip]:hover::before,
.character-button.show-initial-tooltip[data-tooltip]::before {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.character-button[data-tooltip]:hover::after,
.character-button.show-initial-tooltip[data-tooltip]::after {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.character-button.show-initial-tooltip {
  animation: gentle-pulse 1s infinite alternate;
}

@keyframes gentle-pulse {
  from {
    box-shadow: 0 0 8px rgba(120, 200, 100, 0.4);
  }
  to {
    box-shadow: 0 0 15px rgba(120, 200, 100, 0.7);
  }
}

.button-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.fixed-character {
  position: fixed;
  left: 100px;
  top: 50px;
  z-index: 100;
  width: 350px;
}

/* 캐릭터 애니메이션 */
.character-animation-enter-active {
  animation: bounce-in 0.5s;
}

.character-animation-leave-active {
  animation: bounce-out 0.4s;
}

@keyframes bounce-in {
  0% {
    transform: scale(0.3) translateY(40px);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes bounce-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  30% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(0.3) translateY(40px);
    opacity: 0;
  }
}

/* 알림 버튼 */
.notification-button-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 15;
}

.notification-button {
  width: 48px;
  height: 48px;
  background-color: white;
  border-radius: 50%;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  padding: 0;
  position: relative;
}

.notification-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.notification-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #e74c3c;
  color: white;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.notification-button[data-tooltip]::before {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -40px;
  right: 0;
  width: max-content;
  padding: 8px 12px;
  background-color: #333;
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.2px;
  line-height: 1.4;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;
  transform: translateY(-10px);
  z-index: 12;
}

.notification-button[data-tooltip]:hover::before {
  opacity: 1;
  transform: translateY(0);
}

.bd-placeholder-img {
  font-size: 1.125rem;
  text-anchor: middle;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}

@media (min-width: 768px) {
  .bd-placeholder-img-lg {
    font-size: 3.5rem;
  }
}

.b-example-divider {
  height: 3rem;
  background-color: rgba(0, 0, 0, .1);
  border: solid rgba(0, 0, 0, .15);
  border-width: 1px 0;
  box-shadow: inset 0 .5em 1.5em rgba(0, 0, 0, .1), inset 0 .125em .5em rgba(0, 0, 0, .15);
}

.b-example-vr {
  flex-shrink: 0;
  width: 1.5rem;
  height: 100vh;
}

.bi {
  vertical-align: -.125em;
  fill: currentColor;
}

.nav-scroller {
  position: relative;
  z-index: 2;
  height: 2.75rem;
  overflow-y: hidden;
}

.nav-scroller .nav {
  display: flex;
  flex-wrap: nowrap;
  padding-bottom: 1rem;
  margin-top: -1px;
  overflow-x: auto;
  text-align: center;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

/* 모바일 최적화 */
@media (max-width: 480px) {
  .notification-button-container {
    top: 15px;
    right: 15px;
  }

  .notification-button {
    width: 42px;
    height: 42px;
  }

  .notification-icon {
    width: 20px;
    height: 20px;
  }
}
</style>