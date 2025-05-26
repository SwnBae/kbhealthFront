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

    <!-- ✅ 최적화된 알림 모달 - props로 데이터 전달 -->
    <Notification
        v-if="showNotification"
        :isVisible="showNotification"
        :notifications="notifications"
        :unreadCount="unreadCount"
        @close="closeNotification"
        @refresh-notifications="handleRefreshNotifications"
        @mark-as-read="handleMarkAsRead"
        @delete-notification="handleDeleteNotification"
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

// ===== 기본 설정 =====
const router = useRouter();
const userStore = useUserStore();
const { notification: showToastNotification } = useToast();

// ===== 상태 관리 =====
const showCharacter = ref(false);
const showInitialTooltip = ref(false);
const showNotification = ref(false);
const toastChatRef = ref(null);

// ✅ 알림 관련 모든 상태를 App.vue에서 중앙 관리
const unreadCount = ref(0);
const notifications = ref([]); // 알림 목록
const isLoadingNotifications = ref(false);
const notificationPage = ref(0);
const notificationPageSize = ref(20);
const hasMoreNotifications = ref(true);

// ✅ WebSocket 관리
const {
  stompClient,
  isConnected,
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  checkConnection,
  forceReconnect,
  waitForConnection
} = useWebSocket();

// ✅ WebSocket 구독 관리 - 고유 ID로 구독 관리
const subscriptions = ref({
  notifications: null,
  notificationCount: null,
  chatToast: null
});

// ✅ 재시도 관리
const connectionRetryCount = ref(0);
const maxConnectionRetries = ref(5);
const subscriptionRetryCount = ref(0);
const maxSubscriptionRetries = ref(3);

// ✅ 연결 모니터링
const connectionMonitor = ref(null);
const initializationComplete = ref(false);

// ===== 계산된 속성 =====
const isLoggedIn = computed(() => userStore.currentMember.id !== 0);

// ===== WebSocket 연결 관리 =====

// ✅ WebSocket 초기화 - 완전 개선된 버전
const initializeWebSocket = async () => {
  if (!isLoggedIn.value) {
    console.log('❌ 로그인되지 않음 - WebSocket 초기화 중단');
    return;
  }

  console.log('🔌 App.vue WebSocket 초기화 시작');
  
  // 기존 연결이 있다면 정리
  if (isConnected.value) {
    console.log('🧹 기존 WebSocket 연결 정리');
    cleanupWebSocket();
  }
  
  // 연결 시작
  connect();
  
  // 연결 대기 로직 - 개선된 재시도
  const waitForConnection = async () => {
    connectionRetryCount.value++;
    
    try {
      // 최대 10초 대기
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('연결 대기 시간 초과'));
        }, 10000);

        const checkInterval = setInterval(() => {
          if (isConnected.value) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      console.log('✅ WebSocket 연결 완료');
      connectionRetryCount.value = 0; // 성공시 리셋
      
      // 구독 시작 (약간의 지연)
      setTimeout(() => {
        subscribeToNotifications();
      }, 1000);
      
    } catch (error) {
      console.error('❌ WebSocket 연결 실패:', error);
      
      if (connectionRetryCount.value < maxConnectionRetries.value) {
        const delay = Math.min(2000 * connectionRetryCount.value, 15000); // 최대 15초
        console.log(`⏱️ WebSocket 연결 재시도 ${connectionRetryCount.value}/${maxConnectionRetries.value} - ${delay}ms 후`);
        
        setTimeout(waitForConnection, delay);
        
      } else {
        console.error('❌ WebSocket 연결 최대 재시도 초과');
        connectionRetryCount.value = 0;
        
        // 사용자에게 알림
        showConnectionError();
      }
    }
  };

  waitForConnection();
};

// ✅ WebSocket 구독 관리 - 완전 개선
const subscribeToNotifications = () => {
  if (!isConnected.value) {
    console.warn('❌ WebSocket 연결되지 않음 - 구독 중단');
    return;
  }

  if (!userStore.currentMember?.id) {
    console.warn('❌ 사용자 정보 없음 - 구독 중단');
    return;
  }

  console.log('📡 App.vue WebSocket 구독 시작');

  try {
    // ✅ 기존 구독 완전 해제 (중복 방지)
    unsubscribeAll();

    const userId = userStore.currentMember.id;
    const timestamp = Date.now();

    // ✅ 1. 알림 구독 - 고유 ID 사용  
    console.log('📡 알림 구독 시작...');
    const notificationSubId = `app-notifications-${userId}-${timestamp}-1`;
    
    subscriptions.value.notifications = subscribe(
      '/user/queue/notifications',
      (message) => {
        try {
          const newNotification = JSON.parse(message.body);
          console.log('🔔 App.vue - 새 알림 수신:', newNotification.type, newNotification.notificationId);

          // 알림 목록에 추가 (맨 앞에)
          notifications.value.unshift(newNotification);
          
          // 목록이 너무 길어지면 뒤에서 제거 (메모리 관리)
          if (notifications.value.length > 100) {
            notifications.value = notifications.value.slice(0, 100);
          }
          
          // 읽지 않은 알림이면 카운트 증가
          if (!newNotification.read) {
            unreadCount.value++;
          }

          // 토스트 알림 표시
          showToastNotification(newNotification);

          // 브라우저 알림 표시
          showRealtimeNotification(newNotification);
          
        } catch (parseError) {
          console.error('❌ 알림 메시지 파싱 실패:', parseError);
        }
      },
      notificationSubId
    );

    // ✅ 2. 알림 개수 실시간 구독
    console.log('📡 알림 개수 구독 시작...');
    const countSubId = `app-notification-count-${userId}-${timestamp}-2`;
    
    subscriptions.value.notificationCount = subscribe(
      '/user/queue/notification-count',
      (message) => {
        try {
          const count = parseInt(message.body);
          console.log('🔢 App.vue - 알림 개수 업데이트:', count);
          unreadCount.value = count;
        } catch (parseError) {
          console.error('❌ 알림 카운트 파싱 실패:', parseError);
        }
      },
      countSubId
    );

    // ✅ 3. 채팅 메시지 구독 (토스트 전용) - Chat.vue와 완전 분리
    console.log('📡 채팅 토스트 구독 시작...');
    const chatToastSubId = `app-chat-toast-${userId}-${timestamp}-3`;
    
    subscriptions.value.chatToast = subscribe(
      '/user/queue/chat-messages',
      (message) => {
        try {
          const chatMessage = JSON.parse(message.body);
          console.log('💬 App.vue - 채팅 메시지 수신 (토스트 전용):', {
            id: chatMessage.id,
            senderId: chatMessage.senderId,
            chatRoomId: chatMessage.chatRoomId,
            currentPage: router.currentRoute.value.path
          });

          // 🔧 현재 채팅 페이지가 아닌 경우에만 토스트 표시
          if (!isCurrentPageChat() && toastChatRef.value) {
            console.log('💬 채팅 토스트 표시');
            toastChatRef.value.addChatToast(chatMessage);
          } else {
            console.log('💬 채팅 페이지에서는 토스트 표시 안함');
          }
          
        } catch (parseError) {
          console.error('❌ 채팅 메시지 파싱 실패:', parseError);
        }
      },
      chatToastSubId
    );

    console.log('✅ App.vue WebSocket 구독 완료');
    subscriptionRetryCount.value = 0; // 성공시 리셋
    
    // 🔧 구독 상태 확인
    setTimeout(() => {
      const subscriptionStatus = {
        notifications: !!subscriptions.value.notifications,
        notificationCount: !!subscriptions.value.notificationCount,
        chatToast: !!subscriptions.value.chatToast,
        isConnected: isConnected.value
      };
      
      console.log('🔍 App.vue 구독 상태:', subscriptionStatus);
      
      // 구독 실패한 것이 있으면 경고
      const failedSubs = Object.entries(subscriptionStatus)
        .filter(([key, status]) => key !== 'isConnected' && !status)
        .map(([key]) => key);
      
      if (failedSubs.length > 0) {
        console.warn('⚠️ 실패한 구독:', failedSubs);
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ WebSocket 구독 실패:', error);
    
    // 구독 재시도 로직
    if (subscriptionRetryCount.value < maxSubscriptionRetries.value) {
      subscriptionRetryCount.value++;
      const delay = 3000 * subscriptionRetryCount.value;
      
      console.log(`🔄 WebSocket 구독 재시도 ${subscriptionRetryCount.value}/${maxSubscriptionRetries.value} - ${delay}ms 후`);
      setTimeout(subscribeToNotifications, delay);
    } else {
      console.error('❌ WebSocket 구독 최대 재시도 초과');
      subscriptionRetryCount.value = 0;
      
      // 사용자에게 알림
      showNotificationError('실시간 알림 연결에 실패했습니다.');
    }
  }
};

// ✅ 구독 해제 함수 완전 개선
const unsubscribeAll = () => {
  console.log('🧹 App.vue 구독 해제 시작...');

  Object.entries(subscriptions.value).forEach(([key, subscription]) => {
    if (subscription) {
      try {
        if (typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
        console.log(`✅ ${key} 구독 해제 완료`);
      } catch (error) {
        console.warn(`⚠️ ${key} 구독 해제 실패:`, error);
      }
      subscriptions.value[key] = null;
    }
  });

  console.log('✅ App.vue 구독 해제 완료');
};

// ✅ WebSocket 완전 정리
const cleanupWebSocket = () => {
  console.log('🧹 App.vue WebSocket 정리 시작');

  // 연결 모니터링 중지
  stopConnectionMonitoring();

  // 구독 해제
  unsubscribeAll();

  // 재시도 카운트 리셋
  connectionRetryCount.value = 0;
  subscriptionRetryCount.value = 0;

  // WebSocket 연결 해제
  disconnect();

  // 상태 초기화
  unreadCount.value = 0;
  notifications.value = [];
  showNotification.value = false;
  initializationComplete.value = false;

  console.log('✅ App.vue WebSocket 정리 완료');
};

// ✅ 연결 상태 모니터링
const startConnectionMonitoring = () => {
  if (connectionMonitor.value) {
    clearInterval(connectionMonitor.value);
  }

  connectionMonitor.value = setInterval(() => {
    if (isLoggedIn.value && !isConnected.value) {
      console.warn('⚠️ App.vue - WebSocket 연결 끊어짐 감지');
      
      // 연결 상태 체크 후 재연결
      checkConnection().then(() => {
        if (isConnected.value) {
          console.log('🔄 App.vue - 연결 복구됨, 재구독 시도');
          subscribeToNotifications();
        } else {
          console.log('🔄 App.vue - 연결 복구 실패, 재초기화 시도');
          setTimeout(initializeWebSocket, 5000);
        }
      });
    }
  }, 15000); // 15초마다 체크

  console.log('✅ App.vue 연결 상태 모니터링 시작');
};

const stopConnectionMonitoring = () => {
  if (connectionMonitor.value) {
    clearInterval(connectionMonitor.value);
    connectionMonitor.value = null;
    console.log('🛑 App.vue 연결 상태 모니터링 중지');
  }
};

// ===== 알림 데이터 관리 =====

// ✅ 알림 목록 로드 (페이징 지원)
const loadNotifications = async (page = 0, size = 20, append = false) => {
  if (isLoadingNotifications.value) {
    console.log('⏳ 이미 알림 로딩 중 - 중복 요청 방지');
    return;
  }
  
  try {
    isLoadingNotifications.value = true;
    console.log(`📋 알림 로드: page=${page}, size=${size}, append=${append}`);
    
    const response = await axios.get(`/api/notifications/paged?page=${page}&size=${size}`, {
      timeout: 10000 // 10초 타임아웃
    });
    
    const data = response.data;
    
    if (append) {
      // 무한 스크롤용 추가
      const newNotifications = data.content.filter(
        newNotif => !notifications.value.find(existing => existing.notificationId === newNotif.notificationId)
      );
      notifications.value.push(...newNotifications);
      console.log(`✅ ${newNotifications.length}개 알림 추가됨`);
    } else {
      // 새로 로드
      notifications.value = data.content;
      console.log(`✅ ${data.content.length}개 알림 로드됨`);
    }
    
    notificationPage.value = data.number;
    hasMoreNotifications.value = !data.last;
    
    return data;
    
  } catch (error) {
    console.error('❌ 알림 로드 실패:', error);
    
    if (error.code === 'ECONNABORTED') {
      showNotificationError('네트워크 연결이 불안정합니다.');
    } else if (error.response?.status === 401) {
      // 인증 실패시 로그인 페이지로
      router.push('/login');
    } else {
      showNotificationError('알림을 불러올 수 없습니다.');
    }
    
    throw error;
  } finally {
    isLoadingNotifications.value = false;
  }
};

// ✅ 더 많은 알림 로드 (무한 스크롤용)
const loadMoreNotifications = async () => {
  if (!hasMoreNotifications.value || isLoadingNotifications.value) return;
  
  try {
    await loadNotifications(notificationPage.value + 1, notificationPageSize.value, true);
  } catch (error) {
    console.error('❌ 추가 알림 로드 실패:', error);
  }
};

// ✅ 알림 읽음 처리
const markNotificationAsRead = async (notificationId) => {
  try {
    console.log(`📖 알림 읽음 처리: ${notificationId}`);
    
    // 낙관적 업데이트
    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    if (index !== -1 && !notifications.value[index].read) {
      notifications.value[index] = { ...notifications.value[index], read: true };
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
    
    // API 호출
    await axios.put(`/api/notifications/${notificationId}/read`, null, {
      timeout: 5000
    });
    
    console.log('✅ 알림 읽음 처리 완료');
  } catch (error) {
    console.error('❌ 알림 읽음 처리 실패:', error);
    
    // 실패시 원상복구
    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    if (index !== -1) {
      notifications.value[index] = { ...notifications.value[index], read: false };
      unreadCount.value++;
    }
  }
};

// ✅ 알림 삭제 처리
const deleteNotification = async (notificationId) => {
  try {
    console.log(`🗑️ 알림 삭제: ${notificationId}`);
    
    // 낙관적 업데이트
    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    let wasUnread = false;
    
    if (index !== -1) {
      wasUnread = !notifications.value[index].read;
      notifications.value.splice(index, 1);
      
      if (wasUnread) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    }
    
    // API 호출
    await axios.delete(`/api/notifications/${notificationId}`, {
      timeout: 5000
    });
    
    console.log('✅ 알림 삭제 완료');
  } catch (error) {
    console.error('❌ 알림 삭제 실패:', error);
    
    // 실패시 데이터 다시 로드
    loadNotifications(0, notificationPageSize.value);
  }
};

// ✅ 알림 새로고침
const refreshNotifications = () => {
  console.log('🔄 알림 새로고침');
  notifications.value = [];
  notificationPage.value = 0;
  hasMoreNotifications.value = true;
  loadNotifications(0, notificationPageSize.value);
};

// ✅ 초기 알림 개수 조회
const fetchInitialUnreadCount = async () => {
  if (!isLoggedIn.value) return;

  try {
    console.log('📊 초기 알림 개수 조회');
    const response = await axios.get('/api/notifications/unread/count', {
      timeout: 5000
    });
    
    unreadCount.value = response.data;
    console.log(`📊 읽지 않은 알림: ${unreadCount.value}개`);
    
  } catch (error) {
    console.error('❌ 알림 개수 조회 실패:', error);
    // 실패해도 치명적이지 않으므로 계속 진행
  }
};

// ===== 사용자 상태 변화 감지 =====

// ✅ 로그인/로그아웃 자동 감지 - 완전 개선된 버전
watch(
  () => userStore.currentMember.id,
  (newId, oldId) => {
    console.log('👤 App.vue - 사용자 상태 변화:', { oldId, newId });

    if (oldId !== 0 && newId === 0) {
      // 로그아웃 감지
      console.log('🚪 로그아웃 감지 - 모든 리소스 정리');
      cleanupWebSocket();
      
    } else if (oldId === 0 && newId !== 0) {
      // 로그인 감지
      console.log('🔑 로그인 감지 - 시스템 초기화');
      
      // 사용자 정보가 완전히 설정될 때까지 대기
      setTimeout(() => {
        if (userStore.currentMember?.id) {
          console.log('🚀 로그인 후 초기화 시작');
          
          initializeWebSocket();
          fetchInitialUnreadCount();
          
          // 초기 툴팁 표시
          setTimeout(() => {
            showInitialTooltip.value = true;
            setTimeout(() => {
              showInitialTooltip.value = false;
            }, 5000);
          }, 2000);
          
        } else {
          console.warn('⚠️ 사용자 정보 설정 지연 - 1초 후 재시도');
          setTimeout(() => {
            if (userStore.currentMember?.id) {
              initializeWebSocket();
              fetchInitialUnreadCount();
            }
          }, 1000);
        }
      }, 1000);
    }
  },
  { immediate: false }
);

// ===== 브라우저 알림 =====

// ✅ 브라우저 알림 표시
const showRealtimeNotification = (notification) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const browserNotification = new Notification(`🔔 새 알림`, {
        body: notification.content,
        icon: '/assets/icon/notification.png',
        tag: 'health-notification-' + notification.notificationId,
        requireInteraction: false,
        silent: false
      });
      
      // 5초 후 자동 닫기
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
      
      // 클릭시 알림창 열기
      browserNotification.onclick = () => {
        window.focus();
        showNotification.value = true;
        browserNotification.close();
      };
      
    } catch (error) {
      console.error('❌ 브라우저 알림 표시 실패:', error);
    }
  }
};

// ✅ 브라우저 알림 권한 요청
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 브라우저 알림 권한:', permission);
      
      if (permission === 'granted') {
        console.log('✅ 브라우저 알림 활성화됨');
      }
    } catch (error) {
      console.error('❌ 브라우저 알림 권한 요청 실패:', error);
    }
  }
};

// ===== UI 상호작용 =====

// ✅ 현재 페이지가 채팅 페이지인지 확인 - 개선된 버전
const isCurrentPageChat = () => {
  const currentPath = router.currentRoute.value.path;
  const isChat = currentPath === '/chat' || currentPath.startsWith('/chat/');
  
  // 디버깅용 로그 (필요시 주석 해제)
  // console.log('📍 페이지 체크:', currentPath, '채팅 페이지:', isChat);
  
  return isChat;
};

// ✅ 캐릭터 토글
const toggleCharacter = () => {
  nextTick(() => {
    showCharacter.value = !showCharacter.value;
  });
};

// ✅ 알림 토글
const toggleNotification = () => {
  nextTick(() => {
    showNotification.value = !showNotification.value;
    
    // 알림창 열 때 데이터 로드 (처음에만)
    if (showNotification.value && notifications.value.length === 0) {
      console.log('🔔 알림창 열림 - 초기 데이터 로드');
      loadNotifications(0, notificationPageSize.value);
    }
  });
};

// ✅ 알림창 닫기
const closeNotification = () => {
  showNotification.value = false;
};

// ===== 이벤트 핸들러 =====

// Notification 컴포넌트에서 호출하는 핸들러들
const handleRefreshNotifications = () => {
  refreshNotifications();
};

const handleMarkAsRead = (notificationId) => {
  markNotificationAsRead(notificationId);
};

const handleDeleteNotification = (notificationId) => {
  deleteNotification(notificationId);
};

// ===== 에러 처리 =====

// ✅ 연결 오류 표시
const showConnectionError = () => {
  const message = '실시간 알림 연결에 실패했습니다. 페이지를 새로고침하시겠습니까?';
  
  if (window.confirm(message)) {
    window.location.reload();
  } else {
    // 사용자가 새로고침을 원하지 않으면 5분 후 재시도
    setTimeout(() => {
      console.log('🔄 5분 후 자동 재시도');
      if (isLoggedIn.value && !isConnected.value) {
        initializeWebSocket();
      }
    }, 300000);
  }
};

// ✅ 알림 오류 표시
const showNotificationError = (message) => {
  console.error('❌ 알림 오류:', message);
  
  // 토스트 알림으로 표시 (showToastNotification 사용)
  showToastNotification({
    type: 'error',
    title: '알림 오류',
    content: message
  });
};

// ===== 페이지 생명주기 =====

// ✅ 페이지 언로드 처리
const handleBeforeUnload = () => {
  console.log('🔄 App.vue - 페이지 언로드, 리소스 정리');
  cleanupWebSocket();
};

// ✅ 컴포넌트 마운트
onMounted(async () => {
  console.log('📱 App.vue 마운트 시작');

  try {
    // 초기화 완료 플래그 설정
    initializationComplete.value = false;
    
    // 사용자 인증 확인
    if (isLoggedIn.value) {
      console.log('👤 로그인 상태 - WebSocket 초기화');
      
      // 초기 알림 개수 로드
      await fetchInitialUnreadCount();
      
      // WebSocket 초기화
      await initializeWebSocket();
      
      // 연결 모니터링 시작
      startConnectionMonitoring();
      
      // 브라우저 알림 권한 요청 (지연)
      setTimeout(requestNotificationPermission, 2000);
    } else {
      console.log('🔐 로그인되지 않음 - WebSocket 초기화 생략');
    }
    
    // 페이지 언로드 이벤트 리스너 등록
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 초기화 완료
    initializationComplete.value = true;
    console.log('✅ App.vue 마운트 완료');
    
  } catch (error) {
    console.error('❌ App.vue 마운트 중 오류:', error);
    
    // 오류 발생시에도 페이지는 동작하도록
    initializationComplete.value = true;
  }
});

// ✅ 컴포넌트 언마운트
onBeforeUnmount(() => {
  console.log('🧹 App.vue 언마운트 시작');

  // 이벤트 리스너 제거
  window.removeEventListener('beforeunload', handleBeforeUnload);

  // WebSocket 완전 정리
  cleanupWebSocket();

  console.log('✅ App.vue 언마운트 완료');
});

// ===== 디버깅 함수 (개발용) =====
if (process.env.NODE_ENV === 'development') {
  window.appDebug = {
    getState: () => ({
      isLoggedIn: isLoggedIn.value,
      isConnected: isConnected.value,
      unreadCount: unreadCount.value,
      notificationsCount: notifications.value.length,
      subscriptions: Object.keys(subscriptions.value).filter(key => subscriptions.value[key]),
      initializationComplete: initializationComplete.value,
      connectionRetries: connectionRetryCount.value,
      subscriptionRetries: subscriptionRetryCount.value
    }),
    
    forceReconnect: () => {
      console.log('🔧 App.vue 강제 재연결...');
      cleanupWebSocket();
      setTimeout(initializeWebSocket, 1000);
    },
    
    testNotification: () => {
      showToastNotification({
        type: 'info',
        title: '테스트',
        content: '테스트 알림입니다.'
      });
    },
    
    resetAll: () => {
      console.log('🔄 App.vue 전체 리셋...');
      cleanupWebSocket();
      notifications.value = [];
      unreadCount.value = 0;
      setTimeout(() => {
        if (isLoggedIn.value) {
          initializeWebSocket();
          fetchInitialUnreadCount();
        }
      }, 1000);
    }
  };
  
  console.log('🔧 App.vue 디버깅 도구 활성화: window.appDebug');
}
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