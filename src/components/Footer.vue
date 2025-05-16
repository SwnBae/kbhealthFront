<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-content">
        <button class="nav-btn btn d-flex flex-column align-items-center" @click="goTo('/home')"
                :class="{ 'active': isActive('/home') }">
          <div class="icon-container">
            <i class="bi bi-house-fill"></i>
          </div>
          <small>홈</small>
        </button>

        <div v-if="isLoggedIn" class="position-relative">
          <button class="nav-btn btn d-flex flex-column align-items-center" @click="openSearchModal">
            <div class="icon-container">
              <i class="bi bi-search"></i>
            </div>
            <small>검색</small>
          </button>
        </div>

        <button class="nav-btn btn d-flex flex-column align-items-center" @click="goTo('/ranking')"
                :class="{ 'active': isActive('/ranking') }">
          <div class="icon-container">
            <i class="bi bi-bar-chart-fill"></i>
          </div>
          <small>랭킹</small>
        </button>

        <button class="nav-btn btn d-flex flex-column align-items-center" @click="goTo('/records')"
                :class="{ 'active': isActive('/records') }">
          <div class="icon-container">
            <i class="bi bi-journal-medical"></i>
          </div>
          <small>기록</small>
        </button>

        <button class="nav-btn btn d-flex flex-column align-items-center" @click="reloadToProfile"
                :class="{ 'active': isActive('/profile') }">
          <div class="icon-container">
            <i class="bi bi-person-circle"></i>
          </div>
          <small>프로필</small>
        </button>

        <button v-if="isLoggedIn" class="nav-btn btn d-flex flex-column align-items-center"
                @click="logout">
          <div class="icon-container">
            <i class="bi bi-box-arrow-right"></i>
          </div>
          <small>로그아웃</small>
        </button>
      </div>
    </div>

    <!-- Teleport를 사용하여 모달을 body에 렌더링 -->
    <teleport to="body">
      <transition name="fade" appear>
        <div class="modal-overlay" v-if="localShowSearch" @click="closeOverlay">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">유저 검색</h3>
              <button class="modal-close" @click="closeModal">×</button>
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
              <div v-for="member in searchResults" :key="member.memberId" class="search-result-item"
                   @click="goToProfile(member.account)">
                <div class="profile-cell">
                  <div class="profile-container">
                    <img :src="member.profileImageUrl" alt="프로필 이미지" class="profile-img" />
                  </div>
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
      </transition>
    </teleport>
  </footer>
</template>

<script>
import userStore from "@/scripts/store";
import router from "@/scripts/router";
import axios from "axios";
import { ref, computed, watch } from 'vue';

export default {
  name: 'Footer',
  setup() {
    const keyword = ref('');
    const searchResults = ref([]);
    const showSearch = ref(false);
    const localShowSearch = ref(false);
    const searched = ref(false);

    // 전역 스토어의 currentMember.id가 0이 아니면 로그인 상태로 본다
    const isLoggedIn = computed(() => {
      return userStore.state.currentMember.id !== 0;
    });

    // 모달 표시 상태가 변경될 때 body 스크롤 제어
    watch(() => localShowSearch.value, (isVisible) => {
      document.body.style.overflow = isVisible ? 'hidden' : '';
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
    };

    // 닫기 애니메이션 시작 함수
    const startCloseAnimation = () => {
      localShowSearch.value = false;
      // CSS 애니메이션 시간에 맞춰 지연 후 상태 변경
      setTimeout(() => {
        showSearch.value = false;
      }, 300); // fade 애니메이션 시간(0.3s)과 일치시킴
    };

    const closeModal = () => {
      startCloseAnimation();
    };

    // 오버레이 클릭 시 모달 닫기
    const closeOverlay = (event) => {
      // 모달 내부가 아닌 오버레이 영역 클릭 시에만 닫기
      if (event.target.classList.contains('modal-overlay')) {
        startCloseAnimation();
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
            userStore.commit("setCurrentMember", { id: 0, account: '', name: '' });
            router.push("/login");
          })
          .catch(() => alert("로그아웃 중 오류가 발생했습니다."));
    };

    const isActive = (path) => {
      // 현재 경로가 전달된 경로로 시작하는지 확인
      return router.currentRoute.value.path.startsWith(path);
    };

    return {
      keyword,
      searchResults,
      showSearch,
      localShowSearch,
      searched,
      isLoggedIn,
      goTo,
      openSearchModal,
      closeModal,
      closeOverlay,
      clearSearch,
      searchMembers,
      goToProfile,
      reloadToProfile,
      logout,
      isActive
    };
  }
};
</script>

<style scoped>
.footer {
  display: flex;
  flex-direction: column;
  /* 내부 요소 세로 배치 */
  align-items: center;
  /* 가운데 정렬 */
  width: 5%;
  /* App.vue에서 너비 조정 */
  top: 60px;
  /* 화면 상단에서 50px 떨어진 위치에 고정 */
  bottom: auto;
  height: 300px;
  border: none;
  margin-top: 0;
  margin-bottom: 0;
  padding: 1px;
  background-color: #fff;
  /* 배경색 필요 시 추가 */
  border-radius: 16px;
  /* 둥근 테두리 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  /* 부드러운 그림자 효과 */
}

.footer-container {
  display: flex;
  flex-direction: column;
  /* 내부 요소 세로 배치 */
  align-items: center;
  /* 가운데 정렬 */
  width: 100%;
  max-width: none;
  /* 최대 너비 제거 */
  background-color: transparent;
  /* 배경 투명하게 */
  border-radius: 0;
  box-shadow: none;
  border: none;
  margin: 0;
  padding: 0;
}

.footer-content {
  display: flex;
  flex-direction: column;
  /* 내부 버튼 세로 배치 */
  align-items: center;
  /* 가운데 정렬 */
  padding: 6px 0;
  width: 100%;
  max-width: 80px;
  /* 푸터 너비에 맞게 조정 */
}

.nav-btn {
  position: relative;
  font-size: 0.8rem;
  /* 더 작은 폰트 크기 */
  color: #6c757d;
  padding: 8px;
  /* 패딩 조정 */
  border: none;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  border-radius: 8px;
  margin: 5px 0;
  /* 상하 마진 조정 */
  width: 100%;
  /* 버튼 너비 부모에 맞게 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  color: #212529;
  transform: translateX(3px);
  /* 호버 시 약간 오른쪽으로 이동 */
}

.nav-btn:active {
  transform: translateX(0);
}

.nav-btn.active {
  color: #212529;
  background-color: rgba(108, 117, 125, 0.1);
  /* 회색 계열로 변경 */
  border-radius: 8px;
}

.nav-btn.active::after {
  content: '';
  position: absolute;
  left: 0;
  /* 활성 표시줄 위치 변경 */
  top: 50%;
  width: 2px;
  /* 얇은 세로 선 */
  height: 20px;
  background-color: #a5d6a7;
  /* 초록색 계열로 변경 */
  border-radius: 0 4px 4px 0;
  /* 오른쪽만 둥글게 */
  transform: translateY(-50%);
}

.icon-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: auto;
  /* 높이 자동 조정 */
  margin-bottom: 5px;
  /* 아이콘 아래 마진 */
  transition: transform 0.3s ease;
}

.nav-btn:hover .icon-container {
  transform: scale(1.15);
}

.nav-btn.active .icon-container {
  transform: scale(1.2);
}

.nav-btn.active .bi {
  color: #6c757d;
  /* 회색 계열로 유지 */
}

.footer small {
  font-size: 0.7rem;
  opacity: 0.9;
  transition: opacity 0.3s ease;
  white-space: nowrap;
  /* 텍스트 줄바꿈 방지 */
}

.nav-btn:hover small {
  opacity: 1;
}

/* 모달 스타일 (EditBodyModal과 일관성 유지) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
  overflow: hidden; /* 바깥 영역 스크롤 방지 */
}

/* 모달 컨텐츠 */
.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 95%;
  max-width: 500px;
  overflow: hidden;
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e6e6e6 #f5f5f5;
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

/* 모달 헤더 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 0;
  position: relative;
  border-bottom: 1px solid #efefef;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin: 0;
  text-align: center;
}

.modal-close {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #262626;
  padding: 0;
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: #000;
}

/* 검색 컨테이너 스타일 */
.search-container {
  position: relative;
  margin: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  background-color: #f7f7f7; /* 연한 회색 배경 */
}

.search-input:focus {
  outline: none;
  border-color: #a8a8a8;
  background-color: #fff; /* 포커스 시 흰색 배경 */
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

/* 검색 결과 컨테이너 */
.search-results-container {
  padding: 0 16px 16px;
}

.no-results {
  text-align: center;
  padding: 30px 0;
  color: #888;
  font-size: 15px;
}

.search-result-item {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
  overflow: hidden;
  padding: 12px;
  display: flex;
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  border: 1px solid #f0f0f0;
}

.search-result-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.profile-cell {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

.profile-container {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.profile-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #f0f0f0;
}

.user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.nickname {
  font-size: 15px;
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

/* 트랜지션 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 푸터에 다음과 같은 스타일 추가 (실제 푸터 클래스명에 맞게 수정) */
.footer {
  pointer-events: none;
  /* 푸터가 마우스 이벤트를 차단하지 않도록 설정 */
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

  .nav-btn {
    padding: 8px 6px;
  }

  .footer small {
    font-size: 0.7rem;
  }

  .modal-content {
    width: 95%;
    max-height: 70vh;
    margin: 0 10px;
  }
}
</style>