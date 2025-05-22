<template>
  <div v-if="isVisible" class="notification-container"
       :class="{'bounceIn': isVisible && !isClosing, 'bounceOut': isClosing}">

    <div class="notification-content">
      <div class="modal-header">
        <h3 class="modal-title">알림</h3>
        <div class="header-controls">
          <button class="filter-button" @click="toggleUnreadOnly">
            {{ unreadOnly ? '모든 알림 보기' : '안 읽은 알림만 보기' }}
          </button>
          <button v-if="notifications.length > 0" class="read-all-button" @click="markAllAsRead">
            모두 읽음
          </button>
          <button class="close-icon" @click="closeModal">✕</button>
        </div>
      </div>

      <!-- 새 알림 배너 영역 -->
      <div id="new-notification-banner-area"></div>

      <!-- 알림이 없을 때 -->
      <div v-if="filteredNotifications.length === 0" class="no-notifications">
        {{ unreadOnly ? '읽지 않은 알림이 없습니다.' : '알림이 없습니다.' }}
      </div>

      <!-- 알림 목록 -->
      <div class="notifications-container">
        <div v-for="notification in filteredNotifications"
             :key="notification.notificationId"
             :data-notification-id="notification.notificationId"
             class="notification-item"
             :class="{'unread': !notification.read}"
             @click="handleNotificationClick(notification)">
          <div class="notification-cell">
            <ProfileRing
                v-if="notification.actorProfileImage"
                :profile-image-url="notification.actorProfileImage"
                :base-score="0"
                :size="48"
                :stroke-width="3"
                progress-color="#a5d6a7"
                alt-text="프로필 이미지"
                class="profile-avatar"
            />
            <div v-else class="default-avatar">
              <img src="/assets/img/default_profile.png" alt="기본 이미지" class="default-avatar-img">
            </div>

            <div class="notification-details">
              <div class="notification-content-text" v-html="formatContent(notification)"></div>
              <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
            </div>

            <button class="delete-button" @click.stop="deleteNotification(notification.notificationId)">
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- 추가 기능 버튼 -->
      <div class="notification-actions">
        <button v-if="notifications.length > 0" class="delete-all-button" @click="deleteAllNotifications">
          모든 알림 삭제
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, watch, nextTick} from 'vue';
import ProfileRing from '@/components/profile/ProfileRing.vue';
import {useWebSocket} from '@/composables/useWebSocket';
import {useUserStore} from '@/scripts/store';
import axios from 'axios';
import router from '@/scripts/router';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

// WebSocket 및 사용자 정보
const {stompClient, isConnected, subscribe, checkConnection, waitForConnection} = useWebSocket();
const userStore = useUserStore();

// 상태 변수들
const notifications = ref([]);
const isClosing = ref(false);
const unreadOnly = ref(false);
const currentPage = ref(0);
const pageSize = ref(20);
const hasMorePages = ref(true);
const isLoading = ref(false);

// WebSocket 구독 관련 변수들
const notificationSubscription = ref(null);
const countSubscription = ref(null);
const listUpdateSubscription = ref(null);

// 필터링된 알림 계산
const filteredNotifications = computed(() => {
  if (unreadOnly.value) {
    return notifications.value.filter(notification => !notification.read);
  }
  return notifications.value;
});

// WebSocket을 통한 실시간 알림 구독
const subscribeToNotifications = async () => {
  if (!userStore.currentMember?.id) return;

  // WebSocket 연결 대기
  if (!isConnected.value) {
    try {
      await waitForConnection(5000);
    } catch (error) {
      setTimeout(subscribeToNotifications, 1000);
      return;
    }
  }

  try {
    // 새로운 알림 수신
    notificationSubscription.value = subscribe('/user/queue/notifications', (message) => {
      const newNotification = JSON.parse(message.body);

      if (props.isVisible) {
        notifications.value.unshift(newNotification);
        highlightNewNotification(newNotification.notificationId);

        if (currentPage.value > 0) {
          showNewNotificationBanner();
        }
      }
    });

    // 알림 개수 업데이트
    countSubscription.value = subscribe('/user/queue/notification-count', (message) => {
      const count = parseInt(message.body);
      emit('update-count', count);
    });

    // 알림 리스트 실시간 동기화
    listUpdateSubscription.value = subscribe('/user/queue/notification-list-update', (message) => {
      try {
        const updateData = JSON.parse(message.body);
        if (props.isVisible) {
          handleListUpdate(updateData);
        }
      } catch (parseError) {
        console.error('리스트 업데이트 메시지 파싱 실패:', parseError);
      }
    });

  } catch (error) {
    setTimeout(subscribeToNotifications, 1000);
  }
};

// 실시간 알림 리스트 업데이트 처리
const handleListUpdate = (updateData) => {
  const {type, notificationId, notification} = updateData;

  switch (type) {
    case 'DELETE':
      notifications.value = notifications.value.filter(n => n.notificationId !== notificationId);
      break;

    case 'READ':
      const readIndex = notifications.value.findIndex(n => n.notificationId === notificationId);
      if (readIndex !== -1) {
        notifications.value.splice(readIndex, 1, {
          ...notifications.value[readIndex],
          read: true
        });
      }
      break;

    case 'CREATE':
      if (notification && !notifications.value.find(n => n.notificationId === notification.notificationId)) {
        notifications.value.unshift(notification);
      }
      break;

    case 'READ_ALL':
      notifications.value = notifications.value.map(n => ({
        ...n,
        read: true
      }));
      break;

    case 'DELETE_ALL':
      notifications.value = [];
      break;
  }
};

// 새 알림 배너 표시
const showNewNotificationBanner = () => {
  const banner = document.createElement('div');
  banner.className = 'new-notification-banner';
  banner.innerHTML = `
    <div class="banner-content">
      📢 새 알림이 있습니다.
      <button onclick="this.parentElement.parentElement.scrollToTop()">맨 위로 이동</button>
      <button onclick="this.parentElement.parentElement.remove()">닫기</button>
    </div>
  `;
  banner.scrollToTop = () => {
    currentPage.value = 0;
    loadNotifications(0);
    banner.remove();
  };

  const container = document.querySelector('.notifications-container');
  if (container) {
    container.insertBefore(banner, container.firstChild);
    setTimeout(() => banner.remove(), 10000);
  }
};

// 새 알림 하이라이트 효과
const highlightNewNotification = (notificationId) => {
  nextTick(() => {
    const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (element) {
      element.style.animation = 'newNotificationHighlight 2s ease-out';
      setTimeout(() => {
        element.style.animation = '';
      }, 2000);
    }
  });
};

// 개별 알림 읽음 처리 (낙관적 업데이트)
const markAsRead = async (notificationId) => {
  try {
    // UI 즉시 업데이트
    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    if (index !== -1 && !notifications.value[index].read) {
      notifications.value.splice(index, 1, {
        ...notifications.value[index],
        read: true
      });
    }

    // API 호출
    await axios.put(`/api/notifications/${notificationId}/read`);
  } catch (error) {
    // 실패 시 원상복구
    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    if (index !== -1) {
      notifications.value.splice(index, 1, {
        ...notifications.value[index],
        read: false
      });
    }
  }
};

// 모든 알림 읽음 처리 (낙관적 업데이트)
const markAllAsRead = async () => {
  try {
    const originalNotifications = [...notifications.value];

    // UI 즉시 업데이트
    notifications.value = notifications.value.map(n => ({
      ...n,
      read: true
    }));

    // API 호출
    await axios.put('/api/notifications/read-all');
  } catch (error) {
    // 실패 시 원상복구
    notifications.value = originalNotifications;
  }
};

// 개별 알림 삭제 (낙관적 업데이트)
const deleteNotification = async (notificationId) => {
  try {
    // 삭제 애니메이션
    const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (element) {
      element.classList.add('removing');
    }

    // 애니메이션 후 UI에서 제거
    setTimeout(() => {
      const originalNotifications = [...notifications.value];
      notifications.value = notifications.value.filter(n => n.notificationId !== notificationId);

      // API 호출
      axios.delete(`/api/notifications/${notificationId}`)
          .catch(error => {
            // 실패 시 원상복구
            notifications.value = originalNotifications;
          });
    }, 300);
  } catch (error) {
    console.error('알림 삭제 중 오류:', error);
  }
};

// 모든 알림 삭제 (낙관적 업데이트)
const deleteAllNotifications = async () => {
  if (!confirm('모든 알림을 삭제하시겠습니까?')) return;

  try {
    const originalNotifications = [...notifications.value];

    // UI 즉시 업데이트
    notifications.value = [];

    // API 호출
    await axios.delete('/api/notifications/all');
  } catch (error) {
    // 실패 시 원상복구
    notifications.value = originalNotifications;
  }
};

// 페이지 로딩
const loadNotifications = async (page = 0) => {
  if (isLoading.value || (!hasMorePages.value && page > 0)) return;

  isLoading.value = true;

  try {
    const response = await axios.get(`/api/notifications/paged?page=${page}&size=${pageSize.value}`);
    const data = response.data;

    if (page === 0) {
      notifications.value = data.content;
    } else {
      notifications.value = [...notifications.value, ...data.content];
    }

    hasMorePages.value = !data.last;
    currentPage.value = data.number;
  } catch (error) {
    console.error('알림 로딩 중 오류:', error);
  } finally {
    isLoading.value = false;
  }
};

// 알림 클릭 처리
const handleNotificationClick = async (notification) => {
  if (!notification.read) {
    await markAsRead(notification.notificationId);
  }

  if (notification.type === 'FOLLOW') {
    if (notification.actorAccount) {
      closeModal();
      router.push(`/profile/${notification.actorAccount}`);
    }
  } else if (['LIKE', 'COMMENT', 'MENTION'].includes(notification.type)) {
    if (notification.relatedId) {
      closeModal();
      alert('게시글 페이지로 이동합니다(미구현)');
    }
  }
};

// 필터 토글
const toggleUnreadOnly = () => {
  unreadOnly.value = !unreadOnly.value;
};

// 모달 닫기
const closeModal = () => {
  isClosing.value = true;
  setTimeout(() => {
    emit('close');
    isClosing.value = false;
  }, 250);
};

// 스크롤 처리 (무한 스크롤)
const handleScroll = (e) => {
  const container = e.target;
  const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

  if (isAtBottom && hasMorePages.value && !isLoading.value) {
    loadNotifications(currentPage.value + 1);
  }
};

// 알림 내용 포맷팅
const formatContent = (notification) => {
  let content = notification.content;
  if (notification.actorName) {
    content = content.replace(
        notification.actorName,
        `<strong>${notification.actorName}</strong>`
    );
  }
  return content;
};

// 시간 포맷팅
const formatTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return '방금 전';
  } else if (diffMin < 60) {
    return `${diffMin}분 전`;
  } else if (diffHour < 24) {
    return `${diffHour}시간 전`;
  } else if (diffDay < 7) {
    return `${diffDay}일 전`;
  } else {
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
  }
};

// 알림창 표시 상태 감시
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadNotifications(0);
    subscribeToNotifications();

    nextTick(() => {
      const container = document.querySelector('.notifications-container');
      if (container) {
        container.addEventListener('scroll', handleScroll);
      }
    });
  } else {
    const container = document.querySelector('.notifications-container');
    if (container) {
      container.removeEventListener('scroll', handleScroll);
    }
  }
});

// 컴포넌트 마운트
onMounted(() => {
  if (props.isVisible) {
    loadNotifications(0);
    subscribeToNotifications();
  }
});

// 컴포넌트 언마운트 시 구독 해제
onUnmounted(() => {
  if (notificationSubscription.value) {
    notificationSubscription.value.unsubscribe();
  }
  if (countSubscription.value) {
    countSubscription.value.unsubscribe();
  }
  if (listUpdateSubscription.value) {
    listUpdateSubscription.value.unsubscribe();
  }
});
</script>

<style scoped>
/* 메인 컨테이너 및 애니메이션 */
.notification-container {
  position: fixed;
  top: 20px;
  right: 80px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.notification-container.bounceIn {
  animation: gentleBounceIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.notification-container.bounceOut {
  animation: gentleBounceOut 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

/* 컨테이너 화살표 */
.notification-container::after {
  content: '';
  position: absolute;
  top: 20px;
  right: -8px;
  width: 0;
  height: 0;
  border-left: 8px solid rgba(255, 255, 255, 0.95);
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  filter: drop-shadow(2px 0 4px rgba(0, 0, 0, 0.1));
}

/* 애니메이션 키프레임 */
@keyframes gentleBounceIn {
  0% {
    transform: scale(0.8) translateY(-10px);
    opacity: 0;
  }
  60% {
    transform: scale(1.02);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes gentleBounceOut {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8) translateY(-10px);
    opacity: 0;
  }
}

@keyframes newNotificationHighlight {
  0% {
    background-color: #e8f5e8;
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(165, 214, 167, 0.4);
  }
  25% {
    background-color: #d4edda;
    box-shadow: 0 6px 16px rgba(165, 214, 167, 0.6);
  }
  50% {
    background-color: #c3e6cb;
    transform: scale(1.01);
  }
  75% {
    background-color: #d4edda;
  }
  100% {
    background-color: #f0f8ff;
    transform: scale(1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
    max-height: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
    max-height: 100px;
  }
}

/* 모달 헤더 */
.notification-content {
  width: 400px;
  max-height: 500px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  color: #222;
  margin: 0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-button,
.read-all-button {
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 12px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-button:hover,
.read-all-button:hover {
  background-color: #e5e7eb;
  color: #212529;
}

.close-icon {
  font-size: 16px;
  color: #888;
  background: none;
  border: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-icon:hover {
  background-color: #f0f0f0;
  color: #333;
}

/* 새 알림 배너 */
.new-notification-banner {
  background: linear-gradient(135deg, #e8f5e8, #d4edda);
  border: 1px solid #a5d6a7;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #2d5a2d;
  animation: slideDown 0.3s ease-out;
  position: relative;
  overflow: hidden;
}

.new-notification-banner::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #a5d6a7, #4caf50);
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.banner-content button {
  background: #4caf50;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.banner-content button:hover {
  background: #45a049;
}

.banner-content button:last-child {
  background: #9e9e9e;
}

.banner-content button:last-child:hover {
  background: #757575;
}

/* 알림 리스트 컨테이너 */
.notifications-container {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
  scroll-behavior: smooth;
}

.notifications-container::-webkit-scrollbar {
  width: 4px;
}

.notifications-container::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 2px;
}

.notifications-container::-webkit-scrollbar-thumb {
  background-color: #e6e6e6;
  border-radius: 2px;
}

.no-notifications {
  text-align: center;
  padding: 20px 0;
  color: #888;
  font-size: 13px;
}

/* 알림 아이템 */
.notification-item {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f0f0f0;
  transform-origin: center;
}

.notification-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.notification-item.unread {
  background-color: #f0f8ff;
  border-left: 3px solid #a5d6a7;
}

.notification-item.removing {
  opacity: 0;
  transform: translateX(100px) scale(0.9);
  max-height: 0;
  padding: 0;
  margin: 0;
  border: none;
  overflow: hidden;
}

/* 알림 타입별 시각적 구분 */
.notification-item[data-type="FOLLOW"] {
  border-left-color: #3b82f6;
}

.notification-item[data-type="LIKE"] {
  border-left-color: #ef4444;
}

.notification-item[data-type="COMMENT"] {
  border-left-color: #f59e0b;
}

.notification-item[data-type="MENTION"] {
  border-left-color: #8b5cf6;
}

/* 알림 아이템 내부 구조 */
.notification-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-avatar,
.default-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
}

.default-avatar {
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-avatar-img {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.notification-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notification-content-text {
  font-size: 13px;
  color: #333;
  line-height: 1.3;
}

.notification-time {
  font-size: 11px;
  color: #888;
}

.delete-button {
  background: none;
  border: none;
  font-size: 12px;
  color: #ccc;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.5;
}

.notification-item:hover .delete-button {
  opacity: 1;
}

.delete-button:hover {
  background-color: #f5f5f5;
  color: #666;
}

/* 하단 액션 버튼 */
.notification-actions {
  margin-top: 12px;
  text-align: center;
}

.delete-all-button {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 16px;
  background-color: #fff0f0;
  border: 1px solid #ffe0e0;
  color: #e74c3c;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-all-button:hover {
  background-color: #ffe0e0;
}

/* 반응형 디자인 */
@media (max-width: 480px) {
  .notification-container {
    top: 60px;
    right: 10px;
    left: 10px;
  }

  .notification-container::after {
    display: none;
  }

  .notification-content {
    width: 100%;
    max-height: 400px;
    padding: 15px;
  }

  .modal-title {
    font-size: 18px;
  }

  .filter-button,
  .read-all-button {
    font-size: 10px;
    padding: 3px 6px;
  }

  .new-notification-banner {
    padding: 10px 12px;
    font-size: 12px;
  }

  .banner-content {
    flex-direction: column;
    gap: 8px;
  }

  .banner-content button {
    width: 100%;
    padding: 6px 12px;
  }
}
</style>