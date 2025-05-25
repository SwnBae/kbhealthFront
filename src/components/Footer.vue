<!-- components/Footer.vue - 커스텀 이벤트 방식으로 수정 -->
<template>
  <aside class="sidebar" ref="sidebarRef" :class="{ 'expanded': isExpanded }" @mouseenter="expandSidebar"
         @mouseleave="collapseSidebar">
    <div class="sidebar-container">
      <div class="sidebar-content">
        <button class="nav-btn btn" @click="goTo('/home')" :class="{ 'active': isActive('/home') }" title="홈">
          <div class="icon-container">
            <img src="/assets/icon/home.png" alt="홈" class="nav-icon" />
          </div>
          <span class="nav-text">홈</span>
        </button>

        <button v-if="isLoggedIn" class="nav-btn btn" @click="openSearchModal" title="검색">
          <div class="icon-container">
            <img src="/assets/icon/search.png" alt="검색" class="nav-icon" />
          </div>
          <span class="nav-text">검색</span>
        </button>

        <button v-if="isLoggedIn" class="nav-btn btn" @click="goTo('/chat')" :class="{ 'active': isActive('/chat') }" title="채팅">
          <div class="icon-container">
            <img src="/assets/icon/chat.png" alt="채팅" class="nav-icon" />
            <!-- 🎯 Chat.vue와 동기화되는 채팅 개수 표시 -->
            <div v-if="chatUnreadCount > 0" class="chat-badge">
              {{ chatUnreadCount > 99 ? '99+' : chatUnreadCount }}
            </div>
          </div>
          <span class="nav-text">채팅</span>
        </button>

        <!-- 다른 버튼들... -->
        <button class="nav-btn btn" @click="goTo('/ranking')" :class="{ 'active': isActive('/ranking') }" title="랭킹">
          <div class="icon-container">
            <img src="/assets/icon/ranking.png" alt="랭킹" class="nav-icon" />
          </div>
          <span class="nav-text">랭킹</span>
        </button>

        <button class="nav-btn btn" @click="goTo('/records')" :class="{ 'active': isActive('/records') }" title="기록">
          <div class="icon-container">
            <img src="/assets/icon/records.png" alt="기록" class="nav-icon" />
          </div>
          <span class="nav-text">기록</span>
        </button>

        <button class="nav-btn btn" @click="reloadToProfile" :class="{ 'active': isActive('/profile') }" title="프로필">
          <div class="icon-container">
            <img src="/assets/icon/profile.png" alt="프로필" class="nav-icon" />
          </div>
          <span class="nav-text">프로필</span>
        </button>

        <button v-if="isLoggedIn" class="nav-btn btn" @click="logout" title="로그아웃">
          <div class="icon-container">
            <img src="/assets/icon/logout.png" alt="로그아웃" class="nav-icon" />
          </div>
          <span class="nav-text">로그아웃</span>
        </button>
      </div>
    </div>

    <!-- 검색 모달... (기존과 동일) -->
    <teleport to="body">
      <div ref="modalRef" class="modal" v-if="localShowSearch" @click.self="closeOverlay"
           :class="{ 'fadeIn': localShowSearch }">
        <div class="modal-content animate-on-scroll in-view" :class="{ 'popIn': localShowSearch }" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">유저 검색</h3>
            <button class="close-icon" @click="closeModal">✕</button>
          </div>

          <div class="search-container">
            <input type="text" v-model="keyword" placeholder="계정명 또는 사용자명으로 검색" class="search-input"
                   @keyup.enter="searchMembers" />
            <button class="search-button" @click="clearSearch">
              <span v-if="keyword">✕</span>
            </button>
          </div>

          <div class="search-results-container">
            <div v-if="searchResults.length === 0 && searched" class="no-results">
              검색 결과가 없습니다.
            </div>
            <div v-for="member in searchResults" :key="member.memberId"
                 class="search-result-item animate-on-scroll in-view" @click="goToProfile(member.account)">
              <div class="profile-cell">
                <router-link :to="`/profile/${member.account}`" class="profile-link" @click.stop>
                  <ProfileRing :profile-image-url="member.profileImageUrl" :base-score="member.baseScore || 0"
                               :size="48" :stroke-width="3" progress-color="#a5d6a7" alt-text="프로필 이미지" />
                </router-link>
                <div class="user-details">
                  <span class="nickname">{{ member.userName }}</span>
                  <div class="account-info">
                    <span class="account-value">@{{ member.account }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </aside>
</template>

<script setup>
import { useUserStore } from "@/scripts/store";
import router from "@/scripts/router";
import axios from "axios";
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue';
import ProfileRing from "@/components/profile/ProfileRing.vue";
import { useWebSocket } from '@/composables/useWebSocket'; // 🆕 추가

const userStore = useUserStore();
const { subscribe,isConnected } = useWebSocket(); // 🆕 추가

// 기본 변수들
const keyword = ref('');
const searchResults = ref([]);
const showSearch = ref(false);
const localShowSearch = ref(false);
const searched = ref(false);
const modalRef = ref(null);
const sidebarRef = ref(null);
const scrollbarWidth = ref(0);
const savedScrollY = ref(0);
const isExpanded = ref(false);

// 🎯 채팅 개수 - 알림과 완전히 동일한 방식
const chatUnreadCount = ref(0);
const chatUnreadCountSubscription = ref(null); // 🆕 추가

const isLoggedIn = computed(() => {
  return userStore.currentMember.id !== 0;
});

// 🎯 초기 채팅 개수 조회 - App.vue의 fetchUnreadCountOnce와 동일
const fetchChatUnreadCountOnce = async () => {
  if (!isLoggedIn.value) return;

  try {
    console.log('📧 Footer - 초기 채팅 개수 조회');
    const response = await axios.get('/api/chat/unread-count');
    chatUnreadCount.value = response.data;
    console.log('📧 Footer - 초기 채팅 개수:', chatUnreadCount.value);
  } catch (error) {
    console.error('❌ Footer - 채팅 개수 조회 실패:', error);
  }
};

const subscribeToChatUnreadCount = () => {
  if (!isLoggedIn.value) return;

  // 🆕 WebSocket 연결 확인 후 구독 (App.vue와 동일한 패턴)
  if (!isConnected.value) {
    console.log('📧 Footer - WebSocket 미연결, 1초 후 재시도');
    setTimeout(subscribeToChatUnreadCount, 1000);
    return;
  }

  console.log('📧 Footer - 채팅 개수 구독 시작');

  try {
    chatUnreadCountSubscription.value = subscribe('/user/queue/chat-unread-count', (message) => {
      const count = JSON.parse(message.body);
      console.log('📧 Footer - 채팅 개수 실시간 업데이트:', chatUnreadCount.value, '->', count);
      chatUnreadCount.value = count;
    });

    console.log('✅ Footer - 채팅 개수 구독 완료');
  } catch (error) {
    console.error('❌ Footer - 채팅 개수 구독 실패:', error);
    setTimeout(subscribeToChatUnreadCount, 1000);
  }
};

// 🎯 WebSocket 정리 함수 - App.vue와 완전히 동일한 패턴
const cleanupChatUpdates = () => {
  console.log('🧹 Footer - 채팅 관련 정리');

  if (chatUnreadCountSubscription.value) {
    try {
      chatUnreadCountSubscription.value.unsubscribe();
      chatUnreadCountSubscription.value = null;
      console.log('✅ Footer - 채팅 개수 구독 해제 완료');
    } catch (error) {
      console.warn('⚠️ Footer - 채팅 개수 구독 해제 실패:', error);
    }
  }

  // 채팅 개수 초기화
  chatUnreadCount.value = 0;
};

// 🎯 사용자 상태 변화 감지 - App.vue와 완전히 동일한 패턴
watch(
    () => userStore.currentMember.id,
    (newId, oldId) => {
      console.log('👤 Footer - 사용자 상태 변화:', { oldId, newId });

      if (oldId !== 0 && newId === 0) {
        // 로그아웃 감지
        console.log('🚪 Footer - 로그아웃 감지, 채팅 구독 정리');
        cleanupChatUpdates();

      } else if (oldId === 0 && newId !== 0) {
        // 로그인 감지
        console.log('🔑 Footer - 로그인 감지, 채팅 구독 시작');

        setTimeout(() => {
          if (userStore.currentMember && userStore.currentMember.id !== 0) {
            fetchChatUnreadCountOnce();
            subscribeToChatUnreadCount();
          }
        }, 500);
      }
    },
    { immediate: false }
);

// 컴포넌트 마운트
onMounted(async () => {
  console.log('🚀 Footer 컴포넌트 마운트됨');

  if (isLoggedIn.value) {
    console.log('🔑 Footer - 로그인 상태, 채팅 초기화 시작');
    await fetchChatUnreadCountOnce();
    subscribeToChatUnreadCount();
  }
});

// 컴포넌트 언마운트
onBeforeUnmount(() => {
  console.log('🧹 Footer 컴포넌트 언마운트');
  unlockScroll();
  cleanupChatUpdates();
});

// 나머지 함수들 (기존과 동일)
const expandSidebar = () => {
  isExpanded.value = true;
};

const collapseSidebar = () => {
  isExpanded.value = false;
};

const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

const lockScroll = () => {
  savedScrollY.value = window.scrollY;
  scrollbarWidth.value = getScrollbarWidth();
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;
};

const unlockScroll = () => {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};

const setupModal = () => {
  lockScroll();
  const elements = document.querySelectorAll(".animate-on-scroll");
  elements.forEach(el => {
    if (!el.classList.contains('in-view')) {
      el.classList.add('in-view');
    }
  });

  if (modalRef.value) {
    modalRef.value.classList.add('fadeIn');
    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.add('popIn');
    }
  }
};

const goTo = (path) => {
  if (isActive(path)) return;
  router.push(path);
};

const openSearchModal = () => {
  keyword.value = '';
  searchResults.value = [];
  searched.value = false;
  localShowSearch.value = true;
  setupModal();
};

const closeModal = () => {
  if (modalRef.value) {
    modalRef.value.classList.remove('fadeIn');
    modalRef.value.classList.add('fadeOut');

    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.remove('popIn');
      contentEl.classList.add('popOut');
    }

    setTimeout(() => {
      unlockScroll();
      localShowSearch.value = false;
    }, 300);
  } else {
    unlockScroll();
    localShowSearch.value = false;
  }
};

const closeOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    closeModal();
  }
};

const clearSearch = () => {
  keyword.value = '';
  searchResults.value = [];
  searched.value = false;
};

const searchMembers = async () => {
  if (!keyword.value.trim()) return;

  try {
    const res = await axios.get(`/api/profile/members/search?keyword=${keyword.value}`);
    searchResults.value = res.data;
    searched.value = true;
  } catch (e) {
    alert("검색 중 오류가 발생했습니다");
  }
};

const goToProfile = (account) => {
  closeModal();
  router.push(`/profile/${account}`);
};

const reloadToProfile = () => {
  router.push("/profile");
};

const logout = () => {
  axios.get("/api/auth/logout")
      .then((res) => {
        alert(res.data);
        userStore.setCurrentMember({ id: 0, account: '', name: '' });
        router.push("/login");
      })
      .catch(() => alert("로그아웃 중 오류가 발생했습니다."));
};

const isActive = (path) => {
  return router.currentRoute.value.path.startsWith(path);
};
</script>

<style scoped>
:root {
  --scrollbar-width: 0px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 70px;
  position: fixed;
  left: 5px;
  top: 50%;
  transform: translateY(-50%);
  height: auto;
  min-height: 450px;
  border: none;
  margin: 0;
  padding: 15px 10px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 95vh;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  transition: width 0.3s ease;
}

.sidebar::-webkit-scrollbar {
  display: none;
}

.sidebar.expanded {
  width: 180px;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  width: 100%;
  gap: 20px;
}

/* 버튼 기본 스타일 */
.nav-btn {
  position: relative;
  padding: 0;
  margin: 0;
  width: 50px;
  height: 50px;
  border: none;
  background: transparent;
  border-radius: 12px;
  overflow: visible;
  transition: background-color 0.3s ease;
}

/* 확장된 상태에서도 버튼 크기 유지 */
.sidebar.expanded .nav-btn {
  width: 50px;
}

/* 아이콘 컨테이너 */
.icon-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: none;
}

.nav-icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
  transition: transform 0.3s ease;
}

/* 텍스트 요소를 버튼 영역 바깥에 배치 */
.nav-text {
  position: absolute;
  left: 60px;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.sidebar.expanded .nav-text {
  opacity: 1;
}

/* 호버 및 액티브 상태 */
.nav-btn:hover {
  color: #212529;
  background-color: rgba(108, 117, 125, 0.1);
}

.nav-btn:hover .nav-icon {
  transform: scale(1.15);
}

.nav-btn:active {
  transform: scale(0.95);
}

.nav-btn.active {
  color: #212529;
  background-color: rgba(108, 117, 125, 0.1);
}

.nav-btn.active .nav-icon {
  transform: scale(1.2);
}

.nav-btn.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 24px;
  background-color: #a5d6a7;
  border-radius: 0 4px 4px 0;
  transform: translateY(-50%);
}

/* FollowModal에서 가져온 모달 스타일 */
.modal {
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

.modal.fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

.modal.fadeOut {
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

.modal-content {
  background-color: white;
  padding: 1.5rem 1.5rem;
  padding-top: 0.3rem;
  padding-right: 1rem;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e6e6e6 #f5f5f5;
  border-radius: 12px;
  mask-image: radial-gradient(white, black);
  -webkit-mask-image: -webkit-radial-gradient(white, black);
}

.modal-content.popIn {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.modal-content.popOut {
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

/* 스크롤바 스타일 */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
  margin: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #e6e6e6;
  border-radius: 3px;
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

.modal-title {
  font-size: 24px;
  font-weight: bold;
  color: #222;
  text-align: left;
  margin: 0;
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

.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 검색 컨테이너 스타일 */
.search-container {
  position: relative;
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: #a5d6a7;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.search-button {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 16px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.3s ease;
}

.search-button:hover {
  color: #666;
}

.search-results-container {
  margin-top: 20px;
}

.no-results {
  text-align: center;
  padding: 30px 0;
  color: #888;
  font-size: 15px;
}

.search-result-item {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.search-result-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.profile-cell {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

/* ProfileRing 컴포넌트용 스타일 */
.profile-link {
  flex-shrink: 0;
  text-decoration: none;
}

.user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.nickname {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.account-info {
  font-size: 13px;
  color: #888;
  margin-top: 2px;
}

.account-value {
  color: #666;
}

.score-info {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.score-label {
  color: #888;
}

.score-value {
  font-weight: 600;
  color: #555;
}

.score-separator {
  margin: 0 6px;
  color: #ddd;
}

/* 모바일 화면 최적화 */
@media (max-width: 480px) {
  .sidebar-container {
    width: 95%;
    border-radius: 12px 12px 0 0;
  }

  .sidebar {
    width: 60px;
    padding: 12px 8px;
    min-height: 400px;
  }

  .sidebar.expanded {
    width: 160px;
  }

  .sidebar-content {
    gap: 15px;
  }

  .nav-btn {
    width: 45px;
    height: 45px;
  }

  .icon-container {
    width: 45px;
    height: 45px;
  }

  .nav-icon {
    width: 26px;
    height: 26px;
  }

  .nav-text {
    left: 55px;
    font-size: 13px;
  }

  .modal-content {
    width: 95%;
    max-height: 70vh;
    margin: 0 10px;
  }
}

.chat-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #28a745;
  color: white;
  font-size: 10px;
  font-weight: bold;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse 2s infinite;
  z-index: 1;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
</style>