<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-content">
        <button class="nav-btn btn d-flex flex-column align-items-center"
                @click="goTo('/home')"
                :class="{ 'active': isActive('/home') }">
          <div class="icon-container">
            <i class="bi bi-house-fill"></i>
          </div>
          <small>홈</small>
        </button>

        <div v-if="userStore.state.currentMember.id" class="position-relative">
          <button class="nav-btn btn d-flex flex-column align-items-center"
                  @click="openSearchModal">
            <div class="icon-container">
              <i class="bi bi-search"></i>
            </div>
            <small>검색</small>
          </button>
        </div>

        <button class="nav-btn btn d-flex flex-column align-items-center"
                @click="goTo('/ranking')"
                :class="{ 'active': isActive('/ranking') }">
          <div class="icon-container">
            <i class="bi bi-bar-chart-fill"></i>
          </div>
          <small>랭킹</small>
        </button>

        <button class="nav-btn btn d-flex flex-column align-items-center"
                @click="goTo('/records')"
                :class="{ 'active': isActive('/records') }">
          <div class="icon-container">
            <i class="bi bi-journal-medical"></i>
          </div>
          <small>기록</small>
        </button>

        <button class="nav-btn btn d-flex flex-column align-items-center"
                @click="reloadToProfile"
                :class="{ 'active': isActive('/profile') }">
          <div class="icon-container">
            <i class="bi bi-person-circle"></i>
          </div>
          <small>프로필</small>
        </button>

        <button v-if="userStore.state.currentMember.id"
                class="nav-btn btn d-flex flex-column align-items-center"
                @click="logout">
          <div class="icon-container">
            <i class="bi bi-box-arrow-right"></i>
          </div>
          <small>로그아웃</small>
        </button>
      </div>
    </div>

    <div class="search-modal" v-if="showSearch" @click.self="closeSearchModal">
      <div class="modal-content animate-on-scroll in-view">
        <div class="modal-header">
          <h3 class="modal-title">유저 검색</h3>
          <button class="close-icon" @click="closeSearchModal">✕</button>
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

        <div class="follow-list-container">
          <div v-if="searchResults.length === 0 && searched" class="no-results">
            검색 결과가 없습니다.
          </div>
          <div v-for="member in searchResults"
               :key="member.memberId"
               class="follow-card animate-on-scroll in-view"
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
  </footer>
</template>

<script>
import userStore from "@/scripts/store";
import router from "@/scripts/router";
import axios from "axios";

export default {
  name: 'Footer',
  data() {
    return {
      keyword: '',
      searchResults: [],
      showSearch: false,
      searched: false
    };
  },
  methods: {
    goTo(path) {
      if (this.isActive(path)) return; // 이미 해당 페이지에 있으면 작업 중단
      router.push(path);
    },
    openSearchModal() {
      this.keyword = '';
      this.searchResults = [];
      this.searched = false;
      this.showSearch = true;
      // 모달이 열릴 때 body에 스크롤 방지 클래스 추가
      document.body.classList.add('modal-open');
    },
    closeSearchModal() {
      this.showSearch = false;
      // 모달이 닫힐 때 body에서 스크롤 방지 클래스 제거
      document.body.classList.remove('modal-open');
    },
    clearSearch() {
      this.keyword = '';
      this.searchResults = [];
      this.searched = false;
    },
    async searchMembers() {
      if (!this.keyword.trim()) return;

      try {
        const res = await axios.get(`/api/profile/members/search?keyword=${this.keyword}`);
        this.searchResults = res.data;
        this.searched = true;
      } catch (e) {
        alert("검색 중 오류가 발생했습니다");
      }
    },
    goToProfile(account) {
      this.closeSearchModal();
      router.push(`/profile/${account}`).then(() => {
        location.reload();
      });
    },
    reloadToProfile() {
      router.push("/profile");
    },
    logout() {
      axios.get("/api/auth/logout").then((res) => {
        alert(res.data);
        userStore.commit("setCurrentMember", {id: 0, account: ''});
        router.push({path: "/login"}).then(() => {
          location.reload();
        });
      }).catch(() => {
        alert("로그아웃 중 오류가 발생했습니다.");
      });
    },
    isActive(path) {
      // 현재 경로가 전달된 경로로 시작하는지 확인
      return router.currentRoute.value.path.startsWith(path);
    }
  },
  computed: {
    userStore() {
      return userStore;
    }
  }
};
</script>

<style scoped>
.footer {
  display: flex;
  flex-direction: column; /* 내부 요소 세로 배치 */
  align-items: center; /* 가운데 정렬 */
  width: 5%; /* App.vue에서 너비 조정 */
  top: 25vh; /* 화면 상단에서 50px 떨어진 위치에 고정 */
  height: 300px;
  border: none;
  margin-top: 0;
  margin-bottom: 0;
  padding: 1px;
  background-color: #fff; /* 배경색 필요 시 추가 */
  border-radius: 16px; /* 둥근 테두리 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* 부드러운 그림자 효과 */
}

.footer-container {
  display: flex;
  flex-direction: column; /* 내부 요소 세로 배치 */
  align-items: center; /* 가운데 정렬 */
  width: 100%;
  max-width: none; /* 최대 너비 제거 */
  background-color: transparent; /* 배경 투명하게 */
  border-radius: 0;
  box-shadow: none;
  border: none;
  margin: 0;
  padding: 0;
}

.footer-content {
  display: flex;
  flex-direction: column; /* 내부 버튼 세로 배치 */
  align-items: center; /* 가운데 정렬 */
  padding: 6px 0;
  width: 100%;
  max-width: 80px; /* 푸터 너비에 맞게 조정 */
}

.nav-btn {
  position: relative;
  font-size: 0.8rem; /* 더 작은 폰트 크기 */
  color: #6c757d;
  padding: 8px; /* 패딩 조정 */
  border: none;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  border-radius: 8px;
  margin: 5px 0; /* 상하 마진 조정 */
  width: 100%; /* 버튼 너비 부모에 맞게 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  color: #212529;
  transform: translateX(3px); /* 호버 시 약간 오른쪽으로 이동 */
}

.nav-btn:active {
  transform: translateX(0);
}

.nav-btn.active {
  color: #212529;
  background-color: rgba(108, 117, 125, 0.1); /* 회색 계열로 변경 */
  border-radius: 8px;
}

.nav-btn.active::after {
  content: '';
  position: absolute;
  left: 0; /* 활성 표시줄 위치 변경 */
  top: 50%;
  width: 2px; /* 얇은 세로 선 */
  height: 20px;
  background-color: #a5d6a7; /* 초록색 계열로 변경 */
  border-radius: 0 4px 4px 0; /* 오른쪽만 둥글게 */
  transform: translateY(-50%);
}

.icon-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: auto; /* 높이 자동 조정 */
  margin-bottom: 5px; /* 아이콘 아래 마진 */
  transition: transform 0.3s ease;
}

.nav-btn:hover .icon-container {
  transform: scale(1.15);
}

.nav-btn.active .icon-container {
  transform: scale(1.2);
}

.nav-btn.active .bi {
  color: #6c757d; /* 회색 계열로 유지 */
}

.footer small {
  font-size: 0.7rem;
  opacity: 0.9;
  transition: opacity 0.3s ease;
  white-space: nowrap; /* 텍스트 줄바꿈 방지 */
}

.nav-btn:hover small {
  opacity: 1;
}

/* 검색 모달 스타일링 (기존 스타일 유지) */
.search-modal {
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
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
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
  border-color: #a0a0a0; /* 회색 계열로 변경 */
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

.follow-list-container {
  margin-top: 20px;
}

.no-results {
  text-align: center;
  padding: 30px 0;
  color: #888;
  font-size: 15px;
}

.follow-card {
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

.follow-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.profile-cell {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

.profile-container {
  position: relative;
  width: 48px;
  height: 48px;
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

/* 모달 열려 있을 때 body 스크롤 방지 */
:global(.modal-open) {
  overflow: hidden;
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
  }
}

/* 푸터에 다음과 같은 스타일 추가 (실제 푸터 클래스명에 맞게 수정) */
.footer {
  pointer-events: none; /* 푸터가 마우스 이벤트를 차단하지 않도록 설정 */
}

/* 푸터 내의 실제 상호작용이 필요한 요소들에는 pointer-events 재활성화 */
.footer a, .footer button, .footer input {
  pointer-events: auto;
}
</style>