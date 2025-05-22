<!-- Notification.vue - Non-modal 방식 -->
<template>
  <!-- 🔥 teleport 제거, 전체 화면 오버레이 제거 -->
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

      <!-- 알림이 없을 때 -->
      <div v-if="filteredNotifications.length === 0" class="no-notifications">
        {{ unreadOnly ? '읽지 않은 알림이 없습니다.' : '알림이 없습니다.' }}
      </div>

      <!-- 알림 목록 -->
      <div class="notifications-container">
        <div v-for="notification in filteredNotifications"
             :key="notification.notificationId"
             class="notification-item"
             :class="{'unread': !notification.read}"
             @click="handleNotificationClick(notification)">
          <div class="notification-cell">
            <!-- ProfileRing 컴포넌트 사용 -->
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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import ProfileRing from '@/components/profile/ProfileRing.vue';
import axios from 'axios';
import router from '@/scripts/router';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

// 상태 변수들
const notifications = ref([]);
const isClosing = ref(false);
const unreadOnly = ref(false);
const currentPage = ref(0);
const pageSize = ref(20);
const hasMorePages = ref(true);
const isLoading = ref(false);

// 필터링된 알림 계산
const filteredNotifications = computed(() => {
  if (unreadOnly.value) {
    return notifications.value.filter(notification => !notification.read);
  }
  return notifications.value;
});

// 🔥 스크롤 잠금 관련 함수들 제거 (Non-modal이므로 불필요)

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

// 페이지 로딩 함수
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
    console.error('알림 로딩 중 오류 발생:', error);
  } finally {
    isLoading.value = false;
  }
};

// 알림 클릭 이벤트 처리
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

// 단일 알림 읽음 처리
const markAsRead = async (notificationId) => {
  try {
    await axios.put(`/api/notifications/${notificationId}/read`);
    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    if (index !== -1) {
      notifications.value.splice(index, 1, {
        ...notifications.value[index],
        read: true
      });
    }
  } catch (error) {
    console.error('알림 읽음 처리 중 오류 발생:', error);
  }
};

// 모든 알림 읽음 처리
const markAllAsRead = async () => {
  try {
    await axios.put('/api/notifications/read-all');
    notifications.value = notifications.value.map(n => ({
      ...n,
      read: true
    }));
  } catch (error) {
    console.error('모든 알림 읽음 처리 중 오류 발생:', error);
  }
};

// 단일 알림 삭제
const deleteNotification = async (notificationId) => {
  try {
    await axios.delete(`/api/notifications/${notificationId}`);
    notifications.value = notifications.value.filter(n => n.notificationId !== notificationId);
  } catch (error) {
    console.error('알림 삭제 중 오류 발생:', error);
  }
};

// 모든 알림 삭제
const deleteAllNotifications = async () => {
  if (!confirm('모든 알림을 삭제하시겠습니까?')) return;

  try {
    await axios.delete('/api/notifications/all');
    notifications.value = [];
  } catch (error) {
    console.error('모든 알림 삭제 중 오류 발생:', error);
  }
};

// 읽지 않은 알림만 필터링 토글
const toggleUnreadOnly = () => {
  unreadOnly.value = !unreadOnly.value;
};

// 🔥 애니메이션 시간 조정
const closeModal = () => {
  isClosing.value = true;
  setTimeout(() => {
    emit('close');
    isClosing.value = false;
  }, 250); // 부드러운 애니메이션 시간과 맞춤
};

// 무한 스크롤 구현을 위한 스크롤 이벤트 핸들러
const handleScroll = (e) => {
  const container = e.target;
  const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

  if (isAtBottom && hasMorePages.value && !isLoading.value) {
    loadNotifications(currentPage.value + 1);
  }
};

// isVisible prop이 변경될 때마다 알림 목록 새로고침
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadNotifications(0);

    // 스크롤 이벤트 리스너 추가
    nextTick(() => {
      const container = document.querySelector('.notifications-container');
      if (container) {
        container.addEventListener('scroll', handleScroll);
      }
    });
  } else {
    // 스크롤 이벤트 리스너 제거
    const container = document.querySelector('.notifications-container');
    if (container) {
      container.removeEventListener('scroll', handleScroll);
    }
  }
});

// 컴포넌트 마운트 시 초기화
onMounted(() => {
  if (props.isVisible) {
    loadNotifications(0);
  }
});
</script>

<style scoped>
/* 🔥 알림 버튼 바로 왼쪽에 위치 */
.notification-container {
  position: fixed;
  top: 20px; /* 알림 버튼과 같은 높이 */
  right: 80px; /* 알림 버튼(48px) + 여백(32px) = 80px */
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

/* 🔥 부드러운 애니메이션으로 수정 */
.notification-container.bounceIn {
  animation: gentleBounceIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.notification-container.bounceOut {
  animation: gentleBounceOut 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

/* 🔥 과하지 않은 부드러운 애니메이션 */
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  color: #222;
  margin: 0;
}

.filter-button, .read-all-button {
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 12px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-button:hover, .read-all-button:hover {
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

.notifications-container {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
  scroll-behavior: smooth;
}

/* 스크롤바 스타일 */
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

.notification-item {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 8px;
  padding: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid #f0f0f0;
}

.notification-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.notification-item.unread {
  background-color: #f0f8ff;
  border-left: 3px solid #a5d6a7;
}

.notification-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-avatar, .default-avatar {
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

.no-notifications {
  text-align: center;
  padding: 20px 0;
  color: #888;
  font-size: 13px;
}

/* 🔥 화살표 추가 - 알림 버튼을 가리키는 꼬리 */
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

/* 모바일 최적화 */
@media (max-width: 480px) {
  .notification-container {
    top: 60px;
    right: 10px;
    left: 10px;
  }

  /* 모바일에서는 화살표 제거 */
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

  .filter-button, .read-all-button {
    font-size: 10px;
    padding: 3px 6px;
  }
}
</style>