<template>
  <footer class="footer fixed-bottom bg-dark text-white d-flex justify-content-around align-items-center py-2">
    <!-- 홈 -->
    <button class="btn btn-dark d-flex flex-column align-items-center" @click="goTo('/home')">
      <i class="bi bi-house-fill"></i>
      <small>홈</small>
    </button>

    <!-- 검색 -->
    <div v-if="userStore.state.currentMember.id" class="position-relative">
      <button class="btn btn-dark d-flex flex-column align-items-center" @click="openSearchModal">
        <i class="bi bi-search"></i>
        <small>검색</small>
      </button>
    </div>

    <!-- 랭킹 -->
    <button class="btn btn-dark d-flex flex-column align-items-center" @click="goTo('/ranking')">
      <i class="bi bi-bar-chart-fill"></i>
      <small>랭킹</small>
    </button>

    <!-- 식단기록 -->
    <button class="btn btn-dark d-flex flex-column align-items-center" @click="goTo('/records')">
      <i class="bi bi-journal-medical"></i>
      <small>기록</small>
    </button>

    <!-- 프로필 -->
    <button class="btn btn-dark d-flex flex-column align-items-center" @click="reloadToProfile">
      <i class="bi bi-person-circle"></i>
      <small>프로필</small>
    </button>

    <!-- 로그아웃 -->
    <button v-if="userStore.state.currentMember.id" class="btn btn-dark d-flex flex-column align-items-center" @click="logout">
      <i class="bi bi-box-arrow-right"></i>
      <small>로그아웃</small>
    </button>
  </footer>

  <!-- 검색 모달 내부에 입력창 + 검색 버튼 + 결과 리스트 포함 -->
  <div class="modal fade" id="searchModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">유저 검색</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="d-flex mb-3">
            <input v-model="keyword" placeholder="유저 검색" class="form-control form-control-sm me-2" />
            <button @click="searchMembers" class="btn btn-sm btn-dark">검색</button>
          </div>
          <ul class="list-group">
            <li v-for="member in searchResults" :key="member.memberId" class="list-group-item list-group-item-action"
                @click="goToProfile(member.account)" data-bs-dismiss="modal">
              <img :src="member.profileImageUrl" alt="프로필 이미지" class="rounded-circle me-2" width="32" height="32" />
              <span>{{ member.userName }} ({{ member.account }})</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import userStore from "@/scripts/store";
import router from "@/scripts/router";
import axios from "axios";
import * as bootstrap from 'bootstrap';

export default {
  name: 'Footer',
  data() {
    return {
      keyword: '',
      searchResults: [],
      showSearch: false
    };
  },
  methods: {
    goTo(path) {
      router.push(path);
    },
    openSearchModal() {
      this.keyword = '';
      this.searchResults = [];
      new bootstrap.Modal(document.getElementById('searchModal')).show();
    },
    async searchMembers() {
      if (!this.keyword.trim()) return alert("검색어를 입력하세요");
      try {
        const res = await axios.get(`/api/profile/members/search?keyword=${this.keyword}`);
        this.searchResults = res.data;
        this.showSearch = false;
      } catch (e) {
        alert("검색 중 오류가 발생했습니다");
      }
    },
    goToProfile(account) {
      router.push(`/profile/${account}`).then(() => {
        location.reload();
      });
    },
    reloadToProfile() {
      if (router.currentRoute.value.path === '/profile') return; // 이미 프로필에 있으면 이동 X
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
.footer button {
  font-size: 0.9rem;
  color: white;
}
.footer small {
  font-size: 0.65rem;
}
.modal.fade .modal-dialog {
  animation: fadeInModal 0.5s ease-out;
}
@keyframes fadeInModal {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
