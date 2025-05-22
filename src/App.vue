<!-- App.vue -->
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

    <!-- 🍞 토스트 컨테이너 추가 -->
    <ToastContainer />
  </div>
</template>

<script setup>
import { onMounted, computed, ref, nextTick, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import Footer from "@/components/Footer.vue";
import Character from "@/components/Character.vue";
import Notification from "@/components/Notification.vue";
import ToastContainer from "@/components/ToastContainer.vue";
import { useUserStore } from "@/scripts/store";
import { useWebSocket } from '@/composables/useWebSocket';
import { useToast } from '@/composables/useToast';
import axios from "axios";

// 필요한 객체 초기화
const router = useRouter();
const userStore = useUserStore();
const { notification: showToastNotification } = useToast();
const showCharacter = ref(false);
const showInitialTooltip = ref(false);
const showNotification = ref(false);
const unreadCount = ref(0);

// 🔥 WebSocket 관련 수정
const {
  stompClient,
  isConnected,
  connect,
  disconnect,
  subscribe,
  checkConnection,  // 🆕 디버깅용
  forceReconnect    // 🆕 강제 재연결용
} = useWebSocket();

const notificationSubscription = ref(null);
const countSubscription = ref(null);

// 로그인 여부 확인
const check = async () => {
  try {
    const { data } = await axios.get("/api/auth/check");
    if (!data) {
      router.push("/login");
    } else {
      userStore.setCurrentMember(data);
      console.log('✅ 사용자 로그인 확인 완료:', data.id);
      fetchUnreadCountOnce();
    }
  } catch (error) {
    console.error('❌ 사용자 인증 확인 실패:', error);
    router.push("/login");
  }
};

// 한 번만 알림 개수 가져오기
const fetchUnreadCountOnce = async () => {
  if (!isLoggedIn.value) return;

  try {
    const response = await axios.get('/api/notifications/unread/count');
    unreadCount.value = response.data;
    console.log('📊 초기 알림 개수:', response.data);
  } catch (error) {
    console.error('❌ 알림 개수 조회 중 오류 발생:', error);
  }
};

// 🔥 WebSocket을 통한 실시간 알림 구독 (수정됨)
const subscribeToNotifications = () => {
  console.log('📡 알림 구독 시작...');
  console.log('📡 현재 연결 상태:', isConnected.value);

  if (!isConnected.value) {
    console.log('⏰ WebSocket 미연결 - 1초 후 재시도...');
    setTimeout(subscribeToNotifications, 1000);
    return;
  }

  console.log('🚀 WebSocket 구독 시작...');

  // 개인 알림 구독
  notificationSubscription.value = subscribe(
      '/user/queue/notifications',
      (message) => {
        const notification = JSON.parse(message.body);
        console.log('🔔 새 알림 수신:', notification);

        // 🍞 토스트 알림 표시
        showToastNotification(notification);

        // 브라우저 알림도 함께 표시
        showRealtimeNotification(notification);
      }
  );

  // 읽지 않은 알림 개수 실시간 구독
  countSubscription.value = subscribe(
      '/user/queue/notification-count',
      (message) => {
        const count = JSON.parse(message.body);
        console.log('🔢 알림 개수 실시간 업데이트:', count);
        unreadCount.value = count;
      }
  );

  if (notificationSubscription.value && countSubscription.value) {
    console.log('✅✅✅ WebSocket 구독 완료 ✅✅✅');
  } else {
    console.error('❌ WebSocket 구독 실패');
  }
};

// 🔥 WebSocket 연결 관리 (새로 추가)
const initializeWebSocket = async () => {
  console.log('🔌 WebSocket 초기화 시작...');

  if (!isLoggedIn.value) {
    console.log('❌ 로그인되지 않음 - WebSocket 연결 안함');
    return;
  }

  console.log('🚀 WebSocket 연결 시도...');
  connect();

  // 연결 상태 확인
  let attempts = 0;
  const maxAttempts = 10;

  const waitForConnection = () => {
    attempts++;
    console.log(`🔍 연결 상태 확인 시도 ${attempts}/${maxAttempts}...`);

    if (isConnected.value) {
      console.log('✅ WebSocket 연결 성공! 구독 시작...');
      setTimeout(subscribeToNotifications, 500);
    } else if (attempts < maxAttempts) {
      console.log('⏰ 아직 연결 안됨 - 1초 후 재확인...');
      setTimeout(waitForConnection, 1000);
    } else {
      console.error('❌ WebSocket 연결 최대 시도 횟수 초과');
      console.log('🔧 연결 상태 디버깅:');
      checkConnection();

      // 강제 재연결 시도
      console.log('🔄 강제 재연결 시도...');
      forceReconnect();
    }
  };

  waitForConnection();
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
    const permission = await Notification.requestPermission();
    console.log('📱 브라우저 알림 권한:', permission);
  }
};

// 로그인 여부
const isLoggedIn = computed(() => userStore.currentMember.id !== 0);

// 캐릭터 토글
const toggleCharacter = () => {
  nextTick(() => {
    showCharacter.value = !showCharacter.value;
  });
};

// 알림 모달 토글
const toggleNotification = () => {
  nextTick(() => {
    showNotification.value = !showNotification.value;
  });
};

// 알림 모달 닫기
const closeNotification = () => {
  showNotification.value = false;
};

// 🔥 컴포넌트 마운트 (수정됨)
onMounted(async () => {
  console.log('🎬 App 컴포넌트 마운트 시작...');

  await check();

  if (isLoggedIn.value) {
    console.log('✅ 로그인 상태 확인됨 - 초기화 시작...');

    // 초기 말풍선
    setTimeout(() => {
      showInitialTooltip.value = true;
      setTimeout(() => {
        showInitialTooltip.value = false;
      }, 5000);
    }, 1000);

    // 🔥 WebSocket 초기화 (수정됨)
    await initializeWebSocket();

    // 브라우저 알림 권한
    requestNotificationPermission();
  }
});

// 컴포넌트 해제
onBeforeUnmount(() => {
  console.log('🏁 App 컴포넌트 해제 시작...');

  if (notificationSubscription.value) {
    notificationSubscription.value.unsubscribe();
    console.log('🏁 알림 구독 해제');
  }
  if (countSubscription.value) {
    countSubscription.value.unsubscribe();
    console.log('🏁 개수 구독 해제');
  }

  disconnect();
  console.log('🏁 WebSocket 연결 해제 완료');
});
</script>

<!-- 기존 스타일 유지 -->

<style>
.app-layout {
  display: flex;
  min-height: 100vh; /* 최소 높이를 뷰포트 높이로 설정하여 푸터가 화면 전체 높이를 차지하도록 함 */
}

.sidebar-footer {
  width: 80px; /* 30px에서 80px로 증가 - Footer.vue의 너비(70px)보다 약간 크게 설정 */
  background-color: transparent; /* 배경색을 투명하게 변경 - Footer.vue에서 이미 배경색을 설정하고 있음 */
  border-right: none; /* 테두리 제거 */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px; /* 상단 여백 유지 */
  position: fixed; /* 좌측에 고정 유지 */
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 10; /* 다른 요소 위에 표시 유지 */
}

.contentBox {
  flex-grow: 1;
  padding-left: 95px; /* 75px에서 95px로 증가 - 푸터 크기가 커졌으므로 패딩도 늘림 */
}

/* 여기서부터 수정된 캐릭터 버튼 스타일 */
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
  border: 3px solid white; /* 흰색 테두리 추가 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.25); /* 테두리가 더 잘 보이도록 그림자 강화 */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  padding: 0;
  position: relative; /* 말풍선의 위치 기준점으로 설정 */
  overflow: visible;
}

.character-button:hover {
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(120, 200, 100, 0.4); /* 호버 시 연두색 그림자 추가 */
  border-color: #A5D69A; /* 호버 시 테두리 색상 변경 */
}

/* 말풍선 스타일 추가 */
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

/* 말풍선 꼬리 부분 */
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

/* 마우스 오버 시 애니메이션 */
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

/* 초기 말풍선 등장 효과 */
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
  left: 100px; /* 왼쪽에 배치 */
  top: 50px; /* 상단에서 여백 */
  z-index: 100;
  width: 350px; /* 너비 지정 */
}

/* Character 컴포넌트 애니메이션 스타일 추가 */
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

/* 알림 버튼 스타일 추가 */
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

/* 알림 배지 스타일 - Footer.vue에서 가져옴 */
.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #e74c3c; /* 빨간색 배지 */
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

/* 알림 버튼 말풍선 스타일 */
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