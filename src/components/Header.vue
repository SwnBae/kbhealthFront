<template>
  <header>
    <div class="collapse bg-dark" id="navbarHeader">
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
                <li>
                  <router-link to="/profile" class="text-white">내 계정정보</router-link>
                </li>
                <li>
                  <router-link to="/diet-record" class="text-white">식단기록</router-link>
                </li>
                <li>
                  <router-link to="/exercise-record" class="text-white">운동기록</router-link>
                </li>
                <li>
                  <a class="text-white" @click="logout()">로그아웃</a>
                </li>
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
      <div class="container">
        <router-link to="/" class="navbar-brand d-flex align-items-center" @click.prevent="reloadToHome">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor"
               stroke-linecap="round" stroke-linejoin="round" stroke-width="2" aria-hidden="true" class="me-2"
               viewBox="0 0 24 24">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <strong>KB Health</strong>
        </router-link>
        <router-link to="/cart" class="cart btn" v-if="userStore.state.currentMember.id">
          <i class="fa fa-shopping-cart" aria-hidden="true"></i>
        </router-link>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarHeader"
                aria-controls="navbarHeader" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
      </div>
    </div>
  </header>
</template>

<script>
import userStore from "@/scripts/store";  // store를 userStore로 변경
import router from "@/scripts/router";
import axios from "axios";

export default {
  name: 'Header',
  setup() {
    const logout = () => {
      axios.get("/api/auth/logout").then((res) => {
        alert(res.data);
        userStore.commit("setCurrentMember", { id: 0, account: '' });  // 수정된 방식

        router.push({ path: "/login" }).then(() => {
          location.reload();  // 경로 변경 후 강제로 새로 고침
        });
      }).catch(() => {
        alert("로그아웃 중 오류가 발생했습니다.");
      });
    };

    const reloadToHome = () => {
      window.location.replace("/");  // 메인 페이지로 리로드
    };

    return { logout, userStore,reloadToHome };  // userStore를 반환하여 템플릿에서 사용할 수 있도록
  }
}

</script>

<style scoped>
header ul li a {
  cursor: pointer;
}

header .navbar .cart {
  margin-left: auto;
  color: #fff;
}
</style>
