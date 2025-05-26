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
          <button v-if="displayNotifications.length > 0" class="read-all-button" @click="markAllAsRead">
            모든 읽음
          </button>
          <button class="close-icon" @click="closeModal">✕</button>
        </div>
      </div>

      <!-- 알림이 없을 때 -->
      <div v-if="filteredNotifications.length === 0" class="no-notifications">
        {{ unreadOnly ? '읽지 않은 알림이 없습니다.' : '알림이 없습니다.' }}
      </div>

      <!-- 알림 목록 -->
      <div class="notifications-container" @scroll="handleScroll">
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
        <button v-if="displayNotifications.length > 0" class="delete-all-button" @click="deleteAllNotifications">
          모든 알림 삭제
        </button>
      </div>
    </div>
  </div>

  <!-- 게시글 상세 모달 -->
  <PostDetailModal
    v-if="showPostModal && selectedPostId !== null"
    :is-visible="showPostModal"
    :post-id="selectedPostId"
    @close="closePostModal"
    @post-updated="handlePostUpdated"
    @post-deleted="handlePostDeleted"
  />
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, watch, nextTick} from 'vue';
import ProfileRing from '@/components/profile/ProfileRing.vue';
import PostDetailModal from '@/components/feed/PostDetailModal.vue';
import {useUserStore} from '@/scripts/store';
import axios from 'axios';
import router from '@/scripts/router';

// ✅ Props로 알림 데이터 받기 (App.vue에서 전달)
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  notifications: {
    type: Array,
    default: () => []
  },
  unreadCount: {
    type: Number,
    default: 0
  }
});

// ✅ 이벤트 정의 - App.vue와 통신
const emit = defineEmits([
  'close',
  'refresh-notifications',
  'mark-as-read',
  'delete-notification',
  'load-more-notifications'
]);

const userStore = useUserStore();

// ✅ 로컬 상태 관리 (UI 전용)
const isClosing = ref(false);
const unreadOnly = ref(false);
const currentPage = ref(0);
const pageSize = ref(20);
const hasMorePages = ref(true);
const isLoading = ref(false);

// 게시글 모달 상태
const showPostModal = ref(false);
const selectedPostId = ref(null);

// ✅ 표시할 알림 목록 (props에서 받은 데이터 사용)
const displayNotifications = computed(() => props.notifications || []);

// ✅ 필터링된 알림 계산
const filteredNotifications = computed(() => {
  if (unreadOnly.value) {
    return displayNotifications.value.filter(notification => !notification.read);
  }
  return displayNotifications.value;
});

// ✅ 모든 WebSocket 관련 코드 제거!
// - subscribeToNotifications 함수 삭제
// - WebSocket 구독 관련 모든 코드 삭제
// - 실시간 업데이트는 App.vue에서 props로 받아서 처리

// ✅ 페이지 로딩 - App.vue에 요청
const loadNotifications = async (page = 0) => {
  if (isLoading.value || (!hasMorePages.value && page > 0)) return;

  isLoading.value = true;
  try {
    console.log(`알림 로드 요청: page=${page}`);
    emit('load-more-notifications', page, pageSize.value);
    currentPage.value = page;
  } catch (error) {
    console.error('알림 로딩 중 오류:', error);
  } finally {
    isLoading.value = false;
  }
};

// ✅ 개별 알림 읽음 처리 - App.vue에 요청
const markAsRead = async (notificationId) => {
  console.log(`알림 읽음 처리 요청: ${notificationId}`);
  emit('mark-as-read', notificationId);
};

// ✅ 모든 알림 읽음 처리 - API 직접 호출 후 App.vue에 알림
const markAllAsRead = async () => {
  try {
    await axios.put('/api/notifications/read-all');
    console.log('모든 알림 읽음 처리 완료');
    
    // App.vue에 새로고침 요청
    emit('refresh-notifications');
  } catch (error) {
    console.error('모든 알림 읽음 처리 실패:', error);
  }
};

// ✅ 개별 알림 삭제 - App.vue에 요청
const deleteNotification = async (notificationId) => {
  try {
    // 삭제 애니메이션
    const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (element) {
      element.classList.add('removing');
    }

    // 애니메이션 후 App.vue에 삭제 요청
    setTimeout(() => {
      console.log(`알림 삭제 요청: ${notificationId}`);
      emit('delete-notification', notificationId);
    }, 300);
  } catch (error) {
    console.error('알림 삭제 중 오류:', error);
  }
};

// ✅ 모든 알림 삭제 - API 직접 호출 후 App.vue에 알림
const deleteAllNotifications = async () => {
  if (!confirm('모든 알림을 삭제하시겠습니까?')) return;

  try {
    await axios.delete('/api/notifications/all');
    console.log('모든 알림 삭제 완료');
    
    // App.vue에 새로고침 요청
    emit('refresh-notifications');
  } catch (error) {
    console.error('모든 알림 삭제 실패:', error);
  }
};

// 게시글 모달 관련 함수들 (기존과 동일)
const openPostModal = (postId) => {
  selectedPostId.value = postId;
  showPostModal.value = true;
};

const closePostModal = () => {
  showPostModal.value = false;
  selectedPostId.value = null;
};

const handlePostUpdated = (updatedPost) => {
  console.log('게시글 업데이트됨:', updatedPost);
};

const handlePostDeleted = (postId) => {
  console.log('게시글 삭제됨:', postId);
};

// ✅ 알림 클릭 처리 - 읽음 처리만 App.vue에 요청
const handleNotificationClick = async (notification) => {
  // 읽음 처리
  if (!notification.read) {
    await markAsRead(notification.notificationId);
  }

  // 알림 타입별 처리 (기존과 동일)
  if (notification.type === 'FOLLOW') {
    if (notification.actorAccount) {
      closeModal();
      router.push(`/profile/${notification.actorAccount}`);
    }
  } else if (notification.type === 'LIKE' || notification.type === 'MENTION') {
    if (notification.relatedId) {
      openPostModal(notification.relatedId);
    }
  } else if (notification.type === 'COMMENT') {
    if (notification.relatedPostId) {
      openPostModal(notification.relatedPostId);
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

// ✅ 스크롤 처리 (무한 스크롤) - 간소화
const handleScroll = (e) => {
  const container = e.target;
  const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

  if (isAtBottom && hasMorePages.value && !isLoading.value) {
    loadNotifications(currentPage.value + 1);
  }
};

// 알림 내용 포맷팅 (기존과 동일)
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

// 시간 포맷팅 (기존과 동일)
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

// ✅ 알림창 표시 상태 감시 - WebSocket 구독 제거
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    console.log('알림창 열림 - 스크롤 이벤트 리스너 추가');
    
    nextTick(() => {
      const container = document.querySelector('.notifications-container');
      if (container) {
        container.addEventListener('scroll', handleScroll);
      }
    });
  } else {
    console.log('알림창 닫힘 - 스크롤 이벤트 리스너 제거');
    
    const container = document.querySelector('.notifications-container');
    if (container) {
      container.removeEventListener('scroll', handleScroll);
    }
  }
});

// ✅ 컴포넌트 마운트 - WebSocket 관련 코드 제거
onMounted(() => {
  console.log('NotificationDropdown 마운트 - WebSocket 구독 없음 (App.vue에서 관리)');
});

// ✅ 컴포넌트 언마운트 - WebSocket 구독 해제 코드 제거
onUnmounted(() => {
  console.log('NotificationDropdown 언마운트 - 스크롤 이벤트만 정리');
  
  const container = document.querySelector('.notifications-container');
  if (container) {
    container.removeEventListener('scroll', handleScroll);
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