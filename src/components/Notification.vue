<!-- Notification.vue - 실시간 동기화 추가 -->
<!-- Notification.vue 템플릿 부분 - 기존 코드에 data-notification-id 속성만 추가 -->
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

      <!-- 🆕 새 알림 배너 영역 -->
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import ProfileRing from '@/components/profile/ProfileRing.vue';
import { useWebSocket } from '@/composables/useWebSocket';
import { useUserStore } from '@/scripts/store';
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
const { stompClient, isConnected, subscribe, checkConnection, waitForConnection } = useWebSocket();
const userStore = useUserStore();

// 상태 변수들
const notifications = ref([]);
const isClosing = ref(false);
const unreadOnly = ref(false);
const currentPage = ref(0);
const pageSize = ref(20);
const hasMorePages = ref(true);
const isLoading = ref(false);

// 🔥 WebSocket 구독 관련 변수들
const notificationSubscription = ref(null);
const countSubscription = ref(null);
const listUpdateSubscription = ref(null); // 🆕 리스트 업데이트 구독

// 필터링된 알림 계산
const filteredNotifications = computed(() => {
  if (unreadOnly.value) {
    return notifications.value.filter(notification => !notification.read);
  }
  return notifications.value;
});

// 🔥 실시간 알림 구독 - 리스트 동기화 추가 (디버깅 로그 포함)
const subscribeToNotifications = async () => {
  console.log('🔄 구독 시작 시도...');
  console.log('WebSocket 연결 상태:', isConnected.value);
  console.log('사용자 ID:', userStore.currentMember?.id);
  console.log('알림창 열림 상태:', props.isVisible);

  if (!userStore.currentMember?.id) {
    console.log('❌ 사용자 정보 없음');
    return;
  }

  // 🆕 WebSocket 연결이 안 되어 있으면 연결 대기
  if (!isConnected.value) {
    console.log('⏰ WebSocket 연결 대기 중...');

    try {
      // 최대 5초 대기
      await waitForConnection(5000);
      console.log('✅ WebSocket 연결 대기 완료');
    } catch (error) {
      console.error('❌ WebSocket 연결 대기 실패:', error);
      console.log('🔍 연결 상태 디버깅:');
      checkConnection();

      // 1초 후 재시도
      setTimeout(subscribeToNotifications, 1000);
      return;
    }
  }

  try {
    console.log('🚀 WebSocket 구독 시작...');

    // 1. 새로운 알림 수신 (기존 코드)
    notificationSubscription.value = subscribe('/user/queue/notifications', (message) => {
      const newNotification = JSON.parse(message.body);
      console.log('🔔 새 알림 수신:', newNotification);
      console.log('🔔 알림창 열림 상태:', props.isVisible);

      // 🔥 알림창이 열려있으면 리스트 맨 앞에 추가
      if (props.isVisible) {
        console.log('📝 알림창 열린 상태 - 리스트에 새 알림 추가');
        console.log('📊 추가 전 알림 개수:', notifications.value.length);
        notifications.value.unshift(newNotification);
        console.log('📊 추가 후 알림 개수:', notifications.value.length);

        highlightNewNotification(newNotification.notificationId);

        // 🔥 페이징 정보 업데이트
        if (currentPage.value > 0) {
          console.log('📄 현재 페이지가 첫 페이지가 아님 - 배너 표시');
          showNewNotificationBanner();
        }
      } else {
        console.log('❌ 알림창 닫힌 상태 - 새 알림 리스트 추가 안함');
      }
    });

    if (notificationSubscription.value) {
      console.log('✅ 새 알림 구독 완료: /user/queue/notifications');
    } else {
      console.error('❌ 새 알림 구독 실패');
    }

    // 2. 알림 개수 업데이트 (기존 코드)
    countSubscription.value = subscribe('/user/queue/notification-count', (message) => {
      const count = parseInt(message.body);
      console.log('🔢 알림 개수 업데이트 수신:', count);
      emit('update-count', count);
    });

    if (countSubscription.value) {
      console.log('✅ 알림 개수 구독 완료: /user/queue/notification-count');
    } else {
      console.error('❌ 알림 개수 구독 실패');
    }

    // 🆕 3. 알림 리스트 직접 동기화 (새로 추가 - 디버깅 강화)
    listUpdateSubscription.value = subscribe('/user/queue/notification-list-update', (message) => {
      console.log('📝 원시 리스트 업데이트 메시지 수신:', message);

      try {
        const updateData = JSON.parse(message.body);
        console.log('📝 파싱된 알림 리스트 업데이트:', updateData);
        console.log('📝 업데이트 타입:', updateData.type);
        console.log('📝 알림 ID:', updateData.notificationId);
        console.log('📝 알림창 열림 상태:', props.isVisible);

        // 알림창이 열려있을 때만 리스트 동기화
        if (props.isVisible) {
          console.log('🎯 알림창 열린 상태 - 리스트 업데이트 처리 시작');
          handleListUpdate(updateData);
        } else {
          console.log('❌ 알림창 닫힌 상태 - 리스트 업데이트 무시');
        }
      } catch (parseError) {
        console.error('❌ 리스트 업데이트 메시지 파싱 실패:', parseError);
      }
    });

    if (listUpdateSubscription.value) {
      console.log('✅ 리스트 업데이트 구독 완료: /user/queue/notification-list-update');
    } else {
      console.error('❌ 리스트 업데이트 구독 실패');
    }

    // 🔥 모든 구독 성공 확인
    const allSubscribed = notificationSubscription.value &&
        countSubscription.value &&
        listUpdateSubscription.value;

    if (allSubscribed) {
      console.log('✅✅✅ 모든 알림 WebSocket 구독 완료 ✅✅✅');
    } else {
      console.error('❌ 일부 WebSocket 구독 실패');
      console.error('  - 새 알림 구독:', !!notificationSubscription.value);
      console.error('  - 개수 구독:', !!countSubscription.value);
      console.error('  - 리스트 업데이트 구독:', !!listUpdateSubscription.value);
    }

  } catch (error) {
    console.error('❌ 알림 구독 실패:', error);

    // 1초 후 재시도
    setTimeout(subscribeToNotifications, 1000);
  }
};

// 🆕 알림 리스트 업데이트 처리 (디버깅 로그 대폭 강화)
const handleListUpdate = (updateData) => {
  console.log('🎯🎯🎯 리스트 업데이트 핸들러 실행 🎯🎯🎯');
  console.log('🎯 받은 데이터:', updateData);

  const { type, notificationId, notification } = updateData;

  console.log(`📋 업데이트 타입: ${type}`);
  console.log(`📋 알림 ID: ${notificationId}`);
  console.log(`📊 현재 알림 리스트 개수: ${notifications.value.length}`);
  console.log(`📊 현재 필터링된 알림 개수: ${filteredNotifications.value.length}`);

  switch (type) {
    case 'DELETE':
      console.log('🗑️🗑️ 삭제 처리 시작 🗑️🗑️');
      console.log('🗑️ 삭제할 알림 ID:', notificationId);

      const beforeDeleteCount = notifications.value.length;
      const targetNotification = notifications.value.find(n => n.notificationId === notificationId);
      console.log('🗑️ 삭제 대상 알림 찾음:', targetNotification ? '있음' : '없음');

      notifications.value = notifications.value.filter(n => n.notificationId !== notificationId);
      const afterDeleteCount = notifications.value.length;

      console.log(`🗑️ 삭제 완료: ${beforeDeleteCount} → ${afterDeleteCount}`);
      console.log('🗑️ 실제로 삭제됨:', beforeDeleteCount > afterDeleteCount ? '예' : '아니오');
      break;

    case 'READ':
      console.log('👁️👁️ 읽음 처리 시작 👁️👁️');
      console.log('👁️ 읽음 처리할 알림 ID:', notificationId);

      const readIndex = notifications.value.findIndex(n => n.notificationId === notificationId);
      console.log(`👁️ 읽음 처리할 알림 인덱스: ${readIndex}`);

      if (readIndex !== -1) {
        const beforeRead = notifications.value[readIndex].read;
        console.log('👁️ 읽음 처리 전 상태:', beforeRead ? '이미 읽음' : '읽지 않음');

        notifications.value.splice(readIndex, 1, {
          ...notifications.value[readIndex],
          read: true
        });

        console.log('👁️ 읽음 처리 완료');
        console.log('👁️ 읽음 처리 후 상태:', notifications.value[readIndex].read ? '읽음' : '읽지 않음');
      } else {
        console.warn('⚠️ 읽음 처리할 알림을 찾을 수 없음');
      }
      break;

    case 'CREATE':
      console.log('➕➕ 새 알림 추가 처리 시작 ➕➕');
      console.log('➕ 추가할 알림 데이터:', notification);

      if (notification && !notifications.value.find(n => n.notificationId === notification.notificationId)) {
        const beforeCreateCount = notifications.value.length;
        notifications.value.unshift(notification);
        const afterCreateCount = notifications.value.length;

        console.log(`➕ 새 알림 추가 완료: ${beforeCreateCount} → ${afterCreateCount}`);
      } else {
        console.log('➕ 이미 존재하는 알림이거나 데이터 없음 - 추가 안함');
      }
      break;

    case 'READ_ALL':
      console.log('👁️‍🗨️👁️‍🗨️ 전체 읽음 처리 시작 👁️‍🗨️👁️‍🗨️');

      const unreadCount = notifications.value.filter(n => !n.read).length;
      console.log(`👁️‍🗨️ 읽지 않은 알림 개수: ${unreadCount}`);

      notifications.value = notifications.value.map(n => ({
        ...n,
        read: true
      }));

      const afterReadAllUnreadCount = notifications.value.filter(n => !n.read).length;
      console.log(`👁️‍🗨️ 전체 읽음 처리 후 읽지 않은 개수: ${afterReadAllUnreadCount}`);
      console.log('👁️‍🗨️ 전체 읽음 처리 완료');
      break;

    case 'DELETE_ALL':
      console.log('🗑️🗑️🗑️ 전체 삭제 처리 시작 🗑️🗑️🗑️');

      const beforeDeleteAllCount = notifications.value.length;
      notifications.value = [];
      const afterDeleteAllCount = notifications.value.length;

      console.log(`🗑️🗑️🗑️ 전체 삭제 완료: ${beforeDeleteAllCount} → ${afterDeleteAllCount}`);
      break;

    default:
      console.warn('❓❓ 알 수 없는 업데이트 타입:', type);
      console.warn('❓ 전체 업데이트 데이터:', updateData);
  }

  console.log(`📊 업데이트 처리 후 알림 개수: ${notifications.value.length}`);
  console.log(`📊 업데이트 처리 후 필터링된 알림 개수: ${filteredNotifications.value.length}`);
  console.log('🎯🎯🎯 리스트 업데이트 핸들러 완료 🎯🎯🎯');
};

// 🆕 새 알림 배너 표시 (선택사항)
const showNewNotificationBanner = () => {
  console.log('📢 새 알림 배너 표시 시작');

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
    console.log('📢 배너에서 맨 위로 이동 클릭');
    currentPage.value = 0;
    loadNotifications(0);
    banner.remove();
  };

  const container = document.querySelector('.notifications-container');
  if (container) {
    container.insertBefore(banner, container.firstChild);
    setTimeout(() => {
      console.log('📢 배너 자동 제거 (10초 후)');
      banner.remove();
    }, 10000);
    console.log('📢 새 알림 배너 표시 완료');
  } else {
    console.warn('⚠️ 알림 컨테이너를 찾을 수 없어 배너 표시 실패');
  }
};

// 🔥 새 알림 하이라이트 효과
const highlightNewNotification = (notificationId) => {
  console.log('✨ 새 알림 하이라이트 효과 시작:', notificationId);

  nextTick(() => {
    const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (element) {
      console.log('✨ 하이라이트 대상 요소 찾음');
      element.style.animation = 'newNotificationHighlight 2s ease-out';
      setTimeout(() => {
        element.style.animation = '';
        console.log('✨ 하이라이트 효과 완료');
      }, 2000);
    } else {
      console.warn('⚠️ 하이라이트할 요소를 찾을 수 없음:', notificationId);
    }
  });
};

// 🔥 실시간 읽음 처리 - 서버에 알림 + 즉시 UI 업데이트 (디버깅 추가)
const markAsRead = async (notificationId) => {
  console.log('👁️ 읽음 처리 시작:', notificationId);

  try {
    // 🔥 먼저 UI 즉시 업데이트 (낙관적 업데이트)
    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    console.log('👁️ 읽음 처리할 알림 인덱스:', index);

    if (index !== -1 && !notifications.value[index].read) {
      console.log('👁️ UI 즉시 업데이트 (낙관적)');
      notifications.value.splice(index, 1, {
        ...notifications.value[index],
        read: true
      });
      console.log('👁️ UI 업데이트 완료');
    } else {
      console.log('👁️ 이미 읽은 알림이거나 찾을 수 없음');
    }

    // API 호출
    console.log('👁️ API 호출 시작');
    await axios.put(`/api/notifications/${notificationId}/read`);
    console.log('👁️ API 호출 성공');

  } catch (error) {
    console.error('❌ 알림 읽음 처리 중 오류 발생:', error);

    // 🔥 실패 시 원상복구
    console.log('🔄 읽음 처리 실패 - 원상복구 시작');
    const index = notifications.value.findIndex(n => n.notificationId === notificationId);
    if (index !== -1) {
      notifications.value.splice(index, 1, {
        ...notifications.value[index],
        read: false
      });
      console.log('🔄 원상복구 완료');
    }
  }
};

// 🔥 실시간 모든 알림 읽음 처리 (디버깅 추가)
const markAllAsRead = async () => {
  console.log('👁️‍🗨️ 모든 알림 읽음 처리 시작');

  try {
    // 🔥 먼저 UI 즉시 업데이트
    const originalNotifications = [...notifications.value];
    const unreadCount = notifications.value.filter(n => !n.read).length;
    console.log('👁️‍🗨️ 읽지 않은 알림 개수:', unreadCount);

    notifications.value = notifications.value.map(n => ({
      ...n,
      read: true
    }));
    console.log('👁️‍🗨️ UI 즉시 업데이트 완료');

    // API 호출
    console.log('👁️‍🗨️ API 호출 시작');
    await axios.put('/api/notifications/read-all');
    console.log('👁️‍🗨️ API 호출 성공');

  } catch (error) {
    console.error('❌ 모든 알림 읽음 처리 중 오류 발생:', error);
    console.log('🔄 모든 알림 읽음 실패 - 원상복구');
    notifications.value = originalNotifications;
  }
};

// 🔥 실시간 단일 알림 삭제 (디버깅 추가)
const deleteNotification = async (notificationId) => {
  console.log('🗑️ 단일 알림 삭제 시작:', notificationId);

  try {
    // 🔥 먼저 UI에서 즉시 제거 (애니메이션 효과 추가)
    const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (element) {
      console.log('🗑️ 삭제 애니메이션 시작');
      element.classList.add('removing');
    } else {
      console.warn('⚠️ 삭제할 요소를 찾을 수 없음');
    }

    // 애니메이션 후 배열에서 제거
    setTimeout(() => {
      console.log('🗑️ 배열에서 알림 제거 시작');
      const originalNotifications = [...notifications.value];
      const beforeCount = notifications.value.length;

      notifications.value = notifications.value.filter(n => n.notificationId !== notificationId);
      const afterCount = notifications.value.length;

      console.log(`🗑️ UI에서 제거 완료: ${beforeCount} → ${afterCount}`);

      // API 호출 후 실패 시 복구를 위해 originalNotifications 저장
      console.log('🗑️ API 호출 시작');
      axios.delete(`/api/notifications/${notificationId}`)
          .then(() => {
            console.log('🗑️ API 호출 성공');
          })
          .catch(error => {
            console.error('❌ 알림 삭제 중 오류 발생:', error);
            console.log('🔄 삭제 실패 - 원상복구');
            notifications.value = originalNotifications;
          });
    }, 300);

  } catch (error) {
    console.error('❌ 알림 삭제 중 오류 발생:', error);
  }
};

// 🔥 실시간 모든 알림 삭제 (디버깅 추가)
const deleteAllNotifications = async () => {
  if (!confirm('모든 알림을 삭제하시겠습니까?')) {
    console.log('🗑️ 모든 알림 삭제 취소됨');
    return;
  }

  console.log('🗑️🗑️ 모든 알림 삭제 시작');

  try {
    // 🔥 먼저 UI에서 즉시 제거
    const originalNotifications = [...notifications.value];
    const beforeCount = notifications.value.length;

    notifications.value = [];
    console.log(`🗑️🗑️ UI에서 모든 알림 제거: ${beforeCount} → 0`);

    // API 호출
    console.log('🗑️🗑️ API 호출 시작');
    await axios.delete('/api/notifications/all');
    console.log('🗑️🗑️ API 호출 성공');

  } catch (error) {
    console.error('❌ 모든 알림 삭제 중 오류 발생:', error);
    console.log('🔄 모든 알림 삭제 실패 - 원상복구');
    notifications.value = originalNotifications;
  }
};

// 페이지 로딩 함수 (기존 코드 유지)
const loadNotifications = async (page = 0) => {
  if (isLoading.value || (!hasMorePages.value && page > 0)) return;

  console.log(`📄 알림 페이지 로딩 시작: 페이지 ${page}`);
  isLoading.value = true;

  try {
    const response = await axios.get(`/api/notifications/paged?page=${page}&size=${pageSize.value}`);
    const data = response.data;

    console.log(`📄 API 응답 받음: ${data.content.length}개 알림`);

    if (page === 0) {
      notifications.value = data.content;
      console.log('📄 첫 페이지 - 알림 리스트 초기화');
    } else {
      notifications.value = [...notifications.value, ...data.content];
      console.log('📄 추가 페이지 - 알림 리스트에 추가');
    }

    hasMorePages.value = !data.last;
    currentPage.value = data.number;

    console.log(`📄 페이지 로딩 완료: 총 ${notifications.value.length}개, 추가 페이지 있음: ${hasMorePages.value}`);
  } catch (error) {
    console.error('❌ 알림 로딩 중 오류 발생:', error);
  } finally {
    isLoading.value = false;
  }
};

// 나머지 함수들 (기존 코드와 동일)
const handleNotificationClick = async (notification) => {
  console.log('🖱️ 알림 클릭:', notification.notificationId);

  if (!notification.read) {
    console.log('🖱️ 읽지 않은 알림 - 읽음 처리');
    await markAsRead(notification.notificationId);
  }

  if (notification.type === 'FOLLOW') {
    if (notification.actorAccount) {
      console.log('🖱️ 팔로우 알림 - 프로필 페이지로 이동');
      closeModal();
      router.push(`/profile/${notification.actorAccount}`);
    }
  } else if (['LIKE', 'COMMENT', 'MENTION'].includes(notification.type)) {
    if (notification.relatedId) {
      console.log('🖱️ 좋아요/댓글/멘션 알림 - 게시글 페이지로 이동');
      closeModal();
      alert('게시글 페이지로 이동합니다(미구현)');
    }
  }
};

const toggleUnreadOnly = () => {
  unreadOnly.value = !unreadOnly.value;
  console.log('🔍 필터 토글:', unreadOnly.value ? '읽지 않은 알림만' : '모든 알림');
};

const closeModal = () => {
  console.log('❌ 알림창 닫기 시작');
  isClosing.value = true;
  setTimeout(() => {
    emit('close');
    isClosing.value = false;
    console.log('❌ 알림창 닫기 완료');
  }, 250);
};

const handleScroll = (e) => {
  const container = e.target;
  const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

  if (isAtBottom && hasMorePages.value && !isLoading.value) {
    console.log('📜 스크롤 끝 - 다음 페이지 로딩');
    loadNotifications(currentPage.value + 1);
  }
};

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

// isVisible prop이 변경될 때마다 알림 목록 새로고침
watch(() => props.isVisible, (newValue) => {
  console.log('👁️ 알림창 표시 상태 변경:', newValue ? '열림' : '닫힘');

  if (newValue) {
    console.log('🚀 알림창 열림 - 초기화 시작');
    loadNotifications(0);
    subscribeToNotifications();

    nextTick(() => {
      const container = document.querySelector('.notifications-container');
      if (container) {
        container.addEventListener('scroll', handleScroll);
        console.log('📜 스크롤 이벤트 리스너 추가');
      }
    });
  } else {
    console.log('❌ 알림창 닫힘 - 정리 시작');
    const container = document.querySelector('.notifications-container');
    if (container) {
      container.removeEventListener('scroll', handleScroll);
      console.log('📜 스크롤 이벤트 리스너 제거');
    }
  }
});

onMounted(() => {
  console.log('🎬 Notification 컴포넌트 마운트됨');
  console.log('🎬 초기 알림창 표시 상태:', props.isVisible);

  if (props.isVisible) {
    console.log('🎬 마운트 시 알림창 열린 상태 - 초기화');
    loadNotifications(0);
    subscribeToNotifications();
  }
});

// 🔥 컴포넌트 언마운트 시 모든 구독 해제 (디버깅 추가)
onUnmounted(() => {
  console.log('🏁 Notification 컴포넌트 언마운트 시작');

  if (notificationSubscription.value) {
    notificationSubscription.value.unsubscribe();
    console.log('🏁 새 알림 구독 해제');
  }
  if (countSubscription.value) {
    countSubscription.value.unsubscribe();
    console.log('🏁 알림 개수 구독 해제');
  }
  if (listUpdateSubscription.value) {
    listUpdateSubscription.value.unsubscribe();
    console.log('🏁 리스트 업데이트 구독 해제');
  }

  console.log('🏁 Notification 컴포넌트 언마운트 완료');
});
</script>

<style scoped>
/* ===========================================
   메인 컨테이너 및 애니메이션
=========================================== */
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

/* ===========================================
   애니메이션 키프레임
=========================================== */
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

@keyframes readingTransition {
  0% {
    background-color: #f0f8ff;
    border-left-color: #a5d6a7;
  }
  50% {
    background-color: #f8f9fa;
    transform: scale(0.98);
  }
  100% {
    background-color: #fff;
    border-left-color: transparent;
    transform: scale(1);
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===========================================
   모달 헤더
=========================================== */
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

/* ===========================================
   새 알림 배너
=========================================== */
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

/* ===========================================
   알림 리스트 컨테이너
=========================================== */
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

/* ===========================================
   알림 아이템
=========================================== */
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

.notification-item.reading {
  animation: readingTransition 0.5s ease-out;
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

/* ===========================================
   알림 아이템 내부 구조
=========================================== */
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

/* ===========================================
   하단 액션 버튼
=========================================== */
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

/* ===========================================
   로딩 상태
=========================================== */
.notifications-loading {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 13px;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #a5d6a7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

/* ===========================================
   반응형 디자인
=========================================== */
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