<template>
  <teleport to="body">
    <div ref="modalRef" class="notification-modal" @click.self="closeOverlay"
         :class="{'fadeIn': isVisible, 'fadeOut': isClosing}">
      <div class="notification-content animate-on-scroll in-view"
           :class="{'popIn': isVisible, 'popOut': isClosing}">
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
               class="notification-item animate-on-scroll in-view"
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
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
const modalRef = ref(null);
const scrollbarWidth = ref(0);
const savedScrollY = ref(0);

// 필터링된 알림 계산
const filteredNotifications = computed(() => {
  if (unreadOnly.value) {
    return notifications.value.filter(notification => !notification.read);
  }
  return notifications.value;
});

// 알림 내용 포맷팅
const formatContent = (notification) => {
  let content = notification.content;

  // 액터 이름이 있으면 굵게 표시
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
  // 읽음 처리
  if (!notification.read) {
    await markAsRead(notification.notificationId);
  }

  // 알림 타입에 따른 네비게이션
  if (notification.type === 'FOLLOW') {
    if (notification.actorAccount) {  // actorId 대신 actorAccount 사용
      closeModal();
      router.push(`/profile/${notification.actorAccount}`);  // ID 대신 account 사용
    }
  } else if (['LIKE', 'COMMENT', 'MENTION'].includes(notification.type)) {
    if (notification.relatedId) {
      closeModal();
      // 게시글 페이지가 아직 구현되지 않았으므로 임시 처리
      alert('게시글 페이지로 이동합니다(미구현)');
      // 추후 구현 시: router.push(`/posts/${notification.relatedId}`);
    }
  }
};

// 단일 알림 읽음 처리
const markAsRead = async (notificationId) => {
  try {
    await axios.put(`/api/notifications/${notificationId}/read`);

    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    if (index !== -1) {
      console.log('알림 읽음 처리 완료:', notificationId);

      // 반응형 업데이트를 위해 새 객체로 교체
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
    // 모든 알림의 상태 업데이트
    notifications.value = notifications.value.map(n => ({
      ...n,
      isRead: true
    }));
  } catch (error) {
    console.error('모든 알림 읽음 처리 중 오류 발생:', error);
  }
};

// 단일 알림 삭제
const deleteNotification = async (notificationId) => {
  try {
    await axios.delete(`/api/notifications/${notificationId}`);
    // 삭제된 알림을 배열에서 제거
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

// 스크롤바 너비 계산
const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

// 스크롤 잠금 함수
const lockScroll = () => {
  // 현재 스크롤 위치 저장
  savedScrollY.value = window.scrollY;

  // 스크롤바 너비 계산
  scrollbarWidth.value = getScrollbarWidth();

  // body에 overflow: hidden을 적용하여 스크롤 방지
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;
};

// 스크롤 해제 함수
const unlockScroll = () => {
  // body에서 overflow: hidden 제거
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};

// 모달 설정 - 개선된 스크롤 처리
const setupModal = () => {
  // 모달이 열리기 전 스크롤 잠금
  lockScroll();

  // 애니메이션 요소에 in-view 클래스 추가
  const elements = document.querySelectorAll(".animate-on-scroll");
  elements.forEach(el => {
    if (!el.classList.contains('in-view')) {
      el.classList.add('in-view');
    }
  });
};

// 컴포넌트 제거 시 원래 상태로 복원
onBeforeUnmount(() => {
  unlockScroll();
});

// 모달 닫기 함수
const closeModal = () => {
  isClosing.value = true;
  setTimeout(() => {
    unlockScroll();
    emit('close');
    isClosing.value = false;
  }, 300);
};

// 오버레이 클릭 시 모달 닫기
const closeOverlay = (event) => {
  // 모달 내부가 아닌 오버레이 영역 클릭 시에만 닫기
  if (event.target.classList.contains('notification-modal')) {
    closeModal();
  }
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
    setupModal();
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
    setupModal();
    loadNotifications(0);
  }
});
</script>

<style scoped>
:root {
  --scrollbar-width: 0px;
}

.notification-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.notification-modal.fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

.notification-modal.fadeOut {
  animation: fadeOut 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.notification-content {
  background-color: white;
  padding: 1.5rem;
  padding-top: 0.3rem;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  scrollbar-width: thin;
  scrollbar-color: #e6e6e6 #f5f5f5;
  /* 스크롤바가 있어도 둥근 모서리 유지 */
  border-radius: 12px;
  mask-image: radial-gradient(white, black);
  -webkit-mask-image: -webkit-radial-gradient(white, black);
}

.notification-content.popIn {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.notification-content.popOut {
  animation: popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes popOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.95);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
  position: relative;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title {
  font-size: 24px;
  font-weight: bold;
  color: #222;
  text-align: left;
  margin: 0;
}

.filter-button, .read-all-button {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 16px;
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
  font-size: 18px;
  color: #888;
  background: none;
  border: none;
  cursor: pointer;
  width: 28px;
  height: 28px;
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
  margin: 0 -1rem;
  padding: 0 1rem;
  scroll-behavior: smooth;
}

/* 스크롤바 스타일 */
.notifications-container::-webkit-scrollbar {
  width: 6px;
}

.notifications-container::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
  margin: 4px;
}

.notifications-container::-webkit-scrollbar-thumb {
  background-color: #e6e6e6;
  border-radius: 3px;
}

.notification-item {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  border: 1px solid #f0f0f0;
}

.notification-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.notification-item.unread {
  background-color: #f0f8ff;
  border-left: 3px solid #a5d6a7;
}

.notification-cell {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

.profile-avatar, .default-avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
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
  gap: 5px;
}

.notification-content-text {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.notification-time {
  font-size: 12px;
  color: #888;
}

.delete-button {
  background: none;
  border: none;
  font-size: 14px;
  color: #ccc;
  width: 24px;
  height: 24px;
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
  margin-top: 16px;
  text-align: center;
}

.delete-all-button {
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 20px;
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
  padding: 30px 0;
  color: #888;
  font-size: 15px;
}

.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 모바일 화면 최적화 */
@media (max-width: 480px) {
  .notification-content {
    width: 95%;
    max-height: 70vh;
    padding: 1rem;
  }

  .notification-item {
    padding: 12px;
  }

  .modal-title {
    font-size: 20px;
  }

  .filter-button, .read-all-button {
    font-size: 10px;
    padding: 4px 8px;
  }
}
</style>