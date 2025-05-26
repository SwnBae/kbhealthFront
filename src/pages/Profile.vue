<template>
  <!-- 프로필 정보, 신체 정보, 피드 로딩 상태를 한 번에 관리하는 통합 로딩 오버레이 -->
  <div v-if="isLoading || isBodyInfoLoading || isFeedLoading" class="loading-overlay">
    <div class="loading-spinner"></div>
    <span>
      {{ loadingMessage }}
    </span>
  </div>

  <div v-else-if="!profile" class="not-logged-in animate-on-scroll">
    <p>로그인 상태가 아닙니다. 로그인 화면으로 이동합니다.</p>
  </div>
  <div v-else class="profile-container">
    <!-- 좌측: 유저 정보 카드 -->
    <ProfileSidebar
        :profile="profile"
        :isCurrentUser="isCurrentUser"
        class="animate-on-scroll profile-sidebar"
        @edit-info="openEditInfoModal"
        @edit-body="openEditBodyModal"
        @toggle-follow="toggleFollow"
        @open-follow-modal="openFollowModal"
        @send-message="sendMessage"
    />

    <!-- 우측 영역: 피드 표시 부분 - suppressLoading prop 추가 -->
    <FeedBlock
        v-if="profile"
        :apiUrl="`/api/feed/${profile.memberId}/feed`"
        :key="profile.memberId + '_' + refreshKey"
        :suppressLoading="true"
        style="margin: 0;"
        @feed-loading="onFeedLoading"
    />

    <!-- 모달 컴포넌트들 -->
    <transition name="fade-modal">
      <FollowModal
          v-if="showFollowModal"
          :title="modalTitle"
          :followList="followList"
          @close="closeFollowModal"
          @go-to-profile="goToProfile"
      />
    </transition>

    <transition name="fade-modal">
      <EditInfoModal
          v-if="showEditInfoModal"
          :editInfo="editInfo"
          @close="showEditInfoModal = false"
          @updated="onProfileInfoUpdated"
      />
    </transition>

    <transition name="fade-modal">
      <EditBodyModal
          v-if="showEditBodyModal"
          :editBodyInfo="editBodyInfo"
          @close="showEditBodyModal = false"
          @updated="onBodyInfoUpdated"
      />
    </transition>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, nextTick, computed} from 'vue';
import axios from 'axios';
import {useRoute, useRouter} from 'vue-router';
// Vuex 스토어 → Pinia 스토어로 변경
import { useUserStore } from "@/scripts/store";
import FeedBlock from '@/components/feed/FeedBlock.vue'

// Pinia 스토어 인스턴스 생성
const userStore = useUserStore();

// 컴포넌트 경로 수정
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue';
import FollowModal from '@/components/profile/modals/FollowModal.vue';
import EditInfoModal from '@/components/profile/modals/EditInfoModal.vue';
import EditBodyModal from '@/components/profile/modals/EditBodyModal.vue';

const profile = ref(null);
const isLoading = ref(true);
const isBodyInfoLoading = ref(false); // 신체 정보 로딩 상태
const isFeedLoading = ref(false); // 피드 로딩 상태
const route = useRoute();
const router = useRouter();
const showFollowModal = ref(false);
const modalTitle = ref('');
const followList = ref([]);
const isCurrentUser = ref(false);
const showEditInfoModal = ref(false);
const showEditBodyModal = ref(false);
const refreshKey = ref(0); // FeedBlock 강제 갱신을 위한 키

// 로딩 메시지를 동적으로 설정
const loadingMessage = computed(() => {
  if (isLoading.value) return '프로필 정보 로딩 중...';
  if (isBodyInfoLoading.value) return '신체 정보 로딩 중...';
  if (isFeedLoading.value) return '피드 로딩 중...';
  return '로딩 중...';
});

// 계정정보 수정 폼 데이터
const editInfo = ref({
  userName: '',
  password: '',
  profileImageUrl: ''
});

// 신체정보 수정 폼 데이터
const editBodyInfo = ref({
  height: null,
  weight: null,
  gender: '',
  age: null
});

// 피드 로딩 상태 핸들러
const onFeedLoading = (loading) => {
  isFeedLoading.value = loading;
};

// 애니메이션 관련 함수
const observeAnimations = () => {
  const elements = document.querySelectorAll(".animate-on-scroll");
  const scrollObserver = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      }),
      {threshold: 0.1}
  );
  elements.forEach(el => scrollObserver.observe(el));
};

const check = async () => {
  try {
    const {data} = await axios.get(`/api/auth/check`);
    if (data) {
      // Pinia 액션으로 변경
      userStore.setCurrentMember(data);
      const account = route.params.account || data.account;
      await fetchProfile(account);
    } else {
      profile.value = null;
    }
  } catch (error) {
    profile.value = null;
  } finally {
    isLoading.value = false;
    await nextTick();
    observeAnimations();
  }
};

const fetchProfile = async (account) => {
  isLoading.value = true; // 항상 프로필 불러올 때 로딩 상태 표시
  try {
    // 프로필 데이터를 가져올 때는 모달을 항상 닫도록 설정
    showFollowModal.value = false;

    const {data} = await axios.get(`/api/profile/${account}`);
    profile.value = data;
    // Pinia 스토어 직접 접근으로 변경
    isCurrentUser.value = data.memberId === userStore.currentMember.id;
  } catch (error) {
    console.error("프로필 데이터를 가져오는 데 실패했습니다.", error);
    profile.value = null;
  } finally {
    isLoading.value = false;
  }
};

// 모달 열릴 때 현재 데이터 채워 넣기
watch(showEditInfoModal, (val) => {
  if (val && profile.value) {
    editInfo.value = {
      userName: profile.value.userName,
      password: '',
      profileImageUrl: profile.value.profileImageUrl
    };
  }
});

watch(showEditBodyModal, (val) => {
  if (val && profile.value) {
    editBodyInfo.value = {
      height: profile.value.height || null,
      weight: profile.value.weight || null,
      gender: profile.value.gender || '',
      age: profile.value.age || null
    };
  }
});

const openEditInfoModal = () => {
  showEditInfoModal.value = true;
};

const openEditBodyModal = () => {
  showEditBodyModal.value = true;
};

// 계정정보 업데이트 처리
const onProfileInfoUpdated = async (updatedInfo) => {
  isLoading.value = true; // 업데이트 시 로딩 상태 표시
  try {
    // 1. 즉시 UI 업데이트 (낙관적 업데이트)
    if (profile.value) {
      profile.value.userName = updatedInfo.userName;

      // 이미지가 업데이트된 경우 미리보기 사용
      if (updatedInfo.profileImagePreview) {
        profile.value.profileImageUrl = updatedInfo.profileImagePreview;
      }

      showSuccessNotification('계정정보가 성공적으로 수정되었습니다.');

      // 2. 백그라운드에서 새로운 데이터 가져오기
      if (route.params.account) {
        await fetchProfile(route.params.account);
        refreshKey.value++; // FeedBlock 새로고침
      }
    }
  } catch (error) {
    showErrorNotification('계정정보 수정에 실패했습니다.');
  } finally {
    isLoading.value = false;
  }
};

// 신체정보 수정 제출
const onBodyInfoUpdated = async (updatedBodyInfo) => {
  isBodyInfoLoading.value = true; // 신체 정보 업데이트 시 로딩 상태 표시
  try {
    // 낙관적 UI 업데이트
    if (profile.value) {
      profile.value.height = updatedBodyInfo.height;
      profile.value.weight = updatedBodyInfo.weight;
      profile.value.gender = updatedBodyInfo.gender;
      profile.value.age = updatedBodyInfo.age;
    }

    showSuccessNotification('신체정보가 성공적으로 수정되었습니다.');

    // 백그라운드에서 최신 데이터 가져오기
    if (route.params.account) {
      await fetchProfile(route.params.account);
      refreshKey.value++; // FeedBlock 새로고침
    }
  } catch (error) {
    showErrorNotification('신체정보 수정에 실패했습니다.');
    console.error(error);
  } finally {
    isBodyInfoLoading.value = false;
  }
};

// 애니메이션된 알림 표시
const showSuccessNotification = (message) => {
  const notification = document.createElement('div');
  notification.className = 'notification success-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }, 10);
};

const showErrorNotification = (message) => {
  const notification = document.createElement('div');
  notification.className = 'notification error-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }, 10);
};

const openFollowModal = async (type) => {
  modalTitle.value = type === 'following' ? '팔로잉' : '팔로워';
  try {
    const {data} = await axios.get(`/api/follow/${type}List/${profile.value.memberId}`);
    followList.value = data;
  } catch (error) {
    console.error(`${modalTitle.value} 목록을 가져오는 데 실패했습니다.`, error);
    followList.value = [];
  } finally {
    showFollowModal.value = true;
  }
};

const closeFollowModal = () => {
  showFollowModal.value = false;
};

// goToProfile 함수 개선 - location.reload() 제거
const goToProfile = (account) => {
  // 팔로우 모달 닫기
  closeFollowModal();

  // 이미 같은 프로필 페이지면 아무것도 하지 않음
  if (route.params.account === account) return;

  // 다른 프로필 페이지로 이동
  router.push(`/profile/${account}`);
};

// 팔로우/언팔로우 버튼 기능
const toggleFollow = async () => {
  try {
    // 낙관적 UI 업데이트 - 바로 상태 반영
    const wasFollowing = profile.value.following;
    profile.value.following = !wasFollowing;

    if (wasFollowing) {
      // 언팔로우
      profile.value.followerCount = Math.max(0, profile.value.followerCount - 1);
      await axios.delete(`/api/follow/following/${profile.value.memberId}`);
      showSuccessNotification('언팔로우 되었습니다.');
    } else {
      // 팔로우
      profile.value.followerCount += 1;
      await axios.post(`/api/follow/following/${profile.value.memberId}`);
      showSuccessNotification('팔로우 되었습니다.');
    }

    // API 호출 결과로 확실한 상태 반영
    // await fetchProfile(route.params.account);
  } catch (error) {
    // 에러 발생시 원래 상태로 복구
    profile.value.following = !profile.value.following;
    if (profile.value.following) {
      profile.value.followerCount = Math.max(0, profile.value.followerCount - 1);
    } else {
      profile.value.followerCount += 1;
    }

    showErrorNotification('팔로우/언팔로우 처리 중 오류가 발생했습니다.');
    console.error('팔로우/언팔로우 처리 중 오류가 발생했습니다.', error);
  }
};

const sendMessage = async () => {
  if (!profile.value) return;

  try {
    const partnerId = profile.value.memberId;
    const chatRoomId = Math.min(userStore.currentMember.id, partnerId) + '_' + Math.max(userStore.currentMember.id, partnerId);

    // 채팅 페이지로 바로 이동
    router.push({
      path: '/chat',
      query: {
        roomId: chatRoomId,
        partnerName: profile.value.userName,
        partnerImage: profile.value.profileImageUrl,
        partnerAccount: profile.value.account,
        partnerBaseScore: profile.value.baseScore
      }
    });

    showSuccessNotification(`${profile.value.userName}님과의 채팅을 시작합니다.`);

  } catch (error) {
    showErrorNotification('채팅 시작 중 오류가 발생했습니다.');
  }
};

// 라우트 파라미터가 변경될 때마다 체크
watch(() => route.params.account, (newAccount) => {
  if (newAccount) {
    isLoading.value = true;

    // 라우트가 변경될 때도 모달을 닫도록 설정
    showFollowModal.value = false;

    check();
  }
}, {immediate: true});

onMounted(async () => {
  isLoading.value = true;
  await check();

});
</script>

<style scoped>
/* 기본 스타일 */
.profile-container {
  display: flex;
  gap: 1rem;
  max-width: 1200px; /* 전체 컨테이너 너비 줄임 */
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
  color: #333;
  justify-content: center; /* 컨텐츠 중앙 정렬 */
}

.profile-sidebar {
  /* 기존 스타일 유지 */
  position: sticky;
  flex: 0 0 auto;
  top: 20px;
  max-width: 350px;
  align-self: flex-start;
  padding: 0 20px;

  /* 스크롤 숨기되 내용은 스크롤 가능하게 */
  overflow: auto;
  scrollbar-width: none; /* Firefox */
}

.profile-sidebar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

/* 알림 스타일 */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
  max-width: 300px;
}

.notification.show {
  opacity: 1;
  transform: translateY(0);
}

.success-notification {
  background-color: #4caf50;
  color: white;
}

.error-notification {
  background-color: #f44336;
  color: white;
}

/* 애니메이션 스타일 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 1s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 모달 페이드 애니메이션 */
.fade-modal-enter-active,
.fade-modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-modal-enter-from,
.fade-modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 통합된 로딩 오버레이 스타일 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #4caf50;
  font-weight: 500;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(76, 175, 80, 0.2);
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.not-logged-in {
  text-align: center;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-width: 600px;
  margin: 40px auto;
}

/* 미디어 쿼리 추가 - 작은 화면에서 레이아웃 조정 */
@media (max-width: 768px) {
  .profile-container {
    flex-direction: column;
    align-items: center;
  }

  .profile-sidebar {
    position: relative;
    max-width: 100%;
    margin-bottom: 2rem;
  }

  .notification {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: calc(100% - 20px);
  }
}
</style>