<template>
  <header>
    <div class="collapse bg-dark" id="navbarHeader" ref="navbarHeader">
      <div class="container">
        <div class="row">
          <div class="col-sm-4 py-4">
            <h4 class="text-white">사이트맵</h4>
            <ul class="list-unstyled">
              <li>
                <router-link to="/" class="text-white" @click.prevent="reloadToHome">
                  <span v-if="userStore.state.currentMember.id">{{ userStore.state.currentMember.account }}</span>
                  <span v-else>메인 화면</span>
                </router-link>
              </li>
              <template v-if="userStore.state.currentMember.id">
                <li><router-link to="/profile" class="text-white" @click="reloadToProfile">내 계정정보</router-link></li>
                <li><router-link to="/diet-record" class="text-white">식단기록</router-link></li>
                <li><router-link to="/exercise-record" class="text-white">운동기록</router-link></li>
                <li><router-link to="/ranking" class="text-white">랭킹</router-link></li>
                <li><a class="text-white" @click="logout()">로그아웃</a></li>
              </template>
              <li v-else>
                <router-link to="/login" class="text-white">로그인</router-link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="navbar navbar-dark bg-dark shadow-sm">
      <div class="container d-flex align-items-center justify-content-between">
        <router-link to="/" class="navbar-brand d-flex align-items-center" @click.prevent="reloadToHome">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor"
               stroke-linecap="round" stroke-linejoin="round" stroke-width="2" aria-hidden="true" class="me-2"
               viewBox="0 0 24 24">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <strong>KB Health</strong>
        </router-link>

        <!-- 검색 입력창 & 버튼 -->
        <div class="search-area" v-if="userStore.state.currentMember.id">
          <input v-model="keyword" placeholder="유저 (계정 / 닉네임)" class="form-control form-control-sm" />
          <button @click="searchMembers" class="btn btn-outline-light btn-sm ms-2">검색</button>
        </div>

        <!-- 장바구니 아이콘 -->
        <router-link to="/cart" class="cart btn" v-if="userStore.state.currentMember.id">
          <i class="fa fa-shopping-cart" aria-hidden="true"></i>
        </router-link>

        <!-- 햄버거 버튼 -->
        <button class="navbar-toggler" type="button" @click="toggleNavbar" aria-controls="navbarHeader" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
      </div>
    </div>

    <!-- 검색 결과 모달 -->
    <div class="modal fade" id="searchModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">검색 결과</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <ul class="list-group">
              <li v-for="member in searchResults" :key="member.memberId" class="list-group-item list-group-item-action"
                  @click="goToProfile(member.account)" data-bs-dismiss="modal">
                {{ member.userName }} ({{ member.account }})
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import userStore from "@/scripts/store";
import router from "@/scripts/router";
import axios from "axios";
import * as bootstrap from 'bootstrap';

export default {
  name: 'Header',
  data() {
    return {
      keyword: '',
      searchResults: []
    };
  },
  setup() {
    const logout = () => {
      axios.get("/api/auth/logout").then((res) => {
        alert(res.data);
        userStore.commit("setCurrentMember", {id: 0, account: ''});
        router.push({path: "/login"}).then(() => {
          location.reload();
        });
      }).catch(() => {
        alert("로그아웃 중 오류가 발생했습니다.");
      });
    };

    const reloadToHome = () => {
      window.location.replace("/");
    };

    return {logout, reloadToHome, userStore};
  },
  methods: {
    async searchMembers() {
      if (!this.keyword.trim()) return alert("검색어를 입력하세요");
      try {
        const res = await axios.get(`/api/profile/members/search?keyword=${this.keyword}`);
        this.searchResults = res.data;
        new bootstrap.Modal(document.getElementById('searchModal')).show();
      } catch (e) {
        alert("검색 중 오류가 발생했습니다");
      }
    },
    goToProfile(account) {
      router.push(`/profile/${account}`).then(() => {
        location.reload(); // 프로필 페이지로 이동 후 새로고침
      });
    },
    toggleNavbar() {
      const navbar = this.$refs.navbarHeader;
      const bsCollapse = new bootstrap.Collapse(navbar);
      bsCollapse.toggle();  // 클릭 시 토글 (열고 닫기)
    },
    reloadToProfile() {
      router.push("/profile").then(() => {
        location.reload(); // 프로필 페이지로 이동 후 새로고침
      });
    }
  }
};
</script>

<style scoped>
header ul li a {
  cursor: pointer;
}

header .navbar .cart {
  color: #fff;
  margin-left: 1rem;
}

.search-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
}
</style>
