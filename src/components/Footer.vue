<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-content">
        <button class="nav-btn btn d-flex flex-column align-items-center" @click="goTo('/home')"
                :class="{ 'active': isActive('/home') }" title="홈">
          <div class="icon-container">
            <img src="/assets/icon/home.png" alt="홈" class="nav-icon" />
          </div>
        </button>

        <div v-if="isLoggedIn" class="position-relative">
          <button class="nav-btn btn d-flex flex-column align-items-center" @click="openSearchModal" title="검색">
            <div class="icon-container">
              <img src="/assets/icon/search.png" alt="검색" class="nav-icon" />
            </div>
          </button>
        </div>

        <button class="nav-btn btn d-flex flex-column align-items-center" @click="goTo('/ranking')"
                :class="{ 'active': isActive('/ranking') }" title="랭킹">
          <div class="icon-container">
            <img src="/assets/icon/ranking.png" alt="랭킹" class="nav-icon" />
          </div>
        </button>

        <button class="nav-btn btn d-flex flex-column align-items-center" @click="goTo('/records')"
                :class="{ 'active': isActive('/records') }" title="기록">
          <div class="icon-container">
            <img src="/assets/icon/records.png" alt="기록" class="nav-icon" />
          </div>
        </button>

        <button class="nav-btn btn d-flex flex-column align-items-center" @click="reloadToProfile"
                :class="{ 'active': isActive('/profile') }" title="프로필">
          <div class="icon-container">
            <img src="/assets/icon/profile.png" alt="프로필" class="nav-icon" />
          </div>
        </button>

        <button v-if="isLoggedIn" class="nav-btn btn d-flex flex-column align-items-center"
                @click="logout" title="로그아웃">
          <div class="icon-container">
            <img src="/assets/icon/logout.png" alt="로그아웃" class="nav-icon" />
          </div>
        </button>
      </div>
    </div>

    <!-- Teleport를 사용하여 모달을 body에 렌더링 -->
    <teleport to="body">
      <div ref="modalRef" class="modal" v-if="localShowSearch" @click.self="closeOverlay" :class="{'fadeIn': localShowSearch}">
        <div class="modal-content animate-on-scroll in-view" :class="{'popIn': localShowSearch}" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">유저 검색</h3>
            <button class="close-icon" @click="closeModal">✕</button>
          </div>

          <div class="search-container">
            <input
                type="text"
                v-model="keyword"
                placeholder="계정명 또는 사용자명으로 검색"
                class="search-input"
                @keyup.enter="searchMembers"
            />
            <button class="search-button" @click="clearSearch">
              <span v-if="keyword">✕</span>
            </button>
          </div>

          <div class="search-results-container">
            <div v-if="searchResults.length === 0 && searched" class="no-results">
              검색 결과가 없습니다.
            </div>
            <div v-for="member in searchResults"
                 :key="member.memberId"
                 class="search-result-item animate-on-scroll in-view"
                 @click="goToProfile(member.account)">
              <div class="profile-cell">
                <router-link :to="`/profile/${member.account}`" class="profile-link" @click.stop>
                  <!-- ProfileRing 컴포넌트 사용 -->
                  <ProfileRing
                      :profile-image-url="member.profileImageUrl"
                      :base-score="member.baseScore || 0"
                      :size="48"
                      :stroke-width="3"
                      progress-color="#a5d6a7"
                      alt-text="프로필 이미지"
                  />
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
  </footer>
</template>

<script setup>
// Pinia 스토어 가져오기
import { useUserStore } from "@/scripts/store";
import router from "@/scripts/router";
import axios from "axios";
import { ref, computed, onBeforeUnmount } from 'vue';
import ProfileRing from "@/components/profile/ProfileRing.vue";

// Pinia 스토어 인스턴스 생성
const userStore = useUserStore();

const keyword = ref('');
const searchResults = ref([]);
const showSearch = ref(false);
const localShowSearch = ref(false);
const searched = ref(false);
const modalRef = ref(null);
const scrollbarWidth = ref(0);
const savedScrollY = ref(0);

// 전역 스토어의 currentMember.id가 0이 아니면 로그인 상태로 봄
const isLoggedIn = computed(() => {
  return userStore.currentMember.id !== 0;
});

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

  // 모달 애니메이션 클래스 추가
  if (modalRef.value) {
    modalRef.value.classList.add('fadeIn');
    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.add('popIn');
    }
  }
};

// 컴포넌트 제거 시 원래 상태로 복원
onBeforeUnmount(() => {
  unlockScroll();
});

const goTo = (path) => {
  if (isActive(path)) return; // 이미 해당 페이지에 있으면 작업 중단
  router.push(path);
};

const openSearchModal = () => {
  keyword.value = '';
  searchResults.value = [];
  searched.value = false;
  localShowSearch.value = true;
  setupModal(); // 모달 열 때 스크롤 방지 및 애니메이션 설정
};

const closeModal = () => {
  // 닫기 애니메이션 추가
  if (modalRef.value) {
    modalRef.value.classList.remove('fadeIn');
    modalRef.value.classList.add('fadeOut');

    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.remove('popIn');
      contentEl.classList.add('popOut');
    }

    // 애니메이션 완료 후 모달 닫기 및 스크롤 해제
    setTimeout(() => {
      unlockScroll(); // 스크롤 해제만 하고 window.scrollTo() 호출 제거
      localShowSearch.value = false;
    }, 300);
  } else {
    unlockScroll(); // 스크롤 해제만 하고 window.scrollTo() 호출 제거
    localShowSearch.value = false;
  }
};

// 오버레이 클릭 시 모달 닫기
const closeOverlay = (event) => {
  // 모달 내부가 아닌 오버레이 영역 클릭 시에만 닫기
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
        // Pinia 스토어의 action 직접 호출
        userStore.setCurrentMember({ id: 0, account: '', name: '' });
        router.push("/login");
      })
      .catch(() => alert("로그아웃 중 오류가 발생했습니다."));
};

const isActive = (path) => {
  // 현재 경로가 전달된 경로로 시작하는지 확인
  return router.currentRoute.value.path.startsWith(path);
};
</script>

<style scoped>
:root {
  --scrollbar-width: 0px;
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 70px; /* 80px에서 70px로 줄임 - 텍스트가 없어서 더 좁아도 됨 */
  position: fixed;
  left: 5px;
  top: 50%;
  transform: translateY(-50%);
  height: auto;
  min-height: 450px; /* 500px에서 450px로 줄임 - 버튼 간 간격이 줄어 전체 높이도 줄임 */
  border: none;
  margin: 0;
  padding: 15px 10px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 95vh;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  width: 100%;
  max-width: 70px; /* 100px에서 70px로 줄임 */
  gap: 20px; /* 5px에서 20px로 증가 - 텍스트가 없으므로 버튼 간격 늘림 */
}

.nav-btn {
  position: relative;
  color: #6c757d;
  padding: 10px;
  border: none;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  border-radius: 12px; /* 50%에서 12px로 변경 - 둥근 정사각형으로 변경 */
  margin: 0;
  width: 50px;
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  color: #212529;
  transform: scale(1.1);
  background-color: rgba(108, 117, 125, 0.1);
}

.nav-btn:active {
  transform: scale(0.95);
}

.nav-btn.active {
  color: #212529;
  background-color: rgba(108, 117, 125, 0.1);
  border-radius: 12px; /* 50%에서 12px로 변경 */
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

.icon-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: auto;
  margin-bottom: 0; /* 10px에서 0으로 변경 - 텍스트가 없으므로 마진 필요 없음 */
  transition: transform 0.3s ease;
}

.nav-icon {
  width: 30px; /* 36px에서 30px로 변경 */
  height: 30px; /* 36px에서 30px로 변경 */
  object-fit: contain;
  transition: transform 0.3s ease;
}

.nav-btn:hover .icon-container {
  transform: scale(1.15);
}

.nav-btn.active .icon-container {
  transform: scale(1.2);
}

.footer small {
  font-size: 0.9rem; /* 0.7rem에서 0.9rem으로 폰트 크기 증가 */
  opacity: 0.9;
  transition: opacity 0.3s ease;
  white-space: nowrap;
}

.nav-btn:hover small {
  opacity: 1;
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
  padding-right: 1rem;/* 상단 여백 줄임 */
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e6e6e6 #f5f5f5;
  /* 스크롤바가 있어도 둥근 모서리 유지 */
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

/* 스크롤바 스타일 수정 */
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
  margin-bottom: 16px; /* 여백 줄임 */
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
  position: relative;
}

.modal-title {
  font-size: 24px; /* 폰트 크기 약간 줄임 */
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

/* 푸터에 다음과 같은 스타일 추가 (실제 푸터 클래스명에 맞게 수정) */
.footer {
  pointer-events: none; /* 푸터가 마우스 이벤트를 차단하지 않도록 설정 */
}

/* 푸터 내의 실제 상호작용이 필요한 요소들에는 pointer-events 재활성화 */
.footer a,
.footer button,
.footer input {
  pointer-events: auto;
}

/* 모바일 화면 최적화 */
@media (max-width: 480px) {
  .footer-container {
    width: 95%;
    border-radius: 12px 12px 0 0;
  }

  .footer {
    width: 60px; /* 모바일에서는 더 작게 */
    padding: 12px 8px;
    min-height: 400px;
  }

  .footer-content {
    gap: 15px; /* 모바일에서는 간격 약간 줄임 */
  }

  .nav-btn {
    width: 45px; /* 모바일에서는 버튼 작게 */
    height: 45px;
    padding: 8px;
  }

  .nav-icon {
    width: 26px; /* 모바일에서는 아이콘 작게 */
    height: 26px;
  }

  .modal-content {
    width: 95%;
    max-height: 70vh;
    margin: 0 10px;
  }
}
</style>