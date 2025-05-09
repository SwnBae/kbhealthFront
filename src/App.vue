<template>
  <Header />
  <RouterView />
  <Footer />
</template>

<script>
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import userStore from "@/scripts/store";
import axios from "axios";
import { onMounted } from "vue";
import { useRouter } from "vue-router";

export default {
  name: 'App',
  components: {
    Footer,
    Header
  },
  setup() {
    const router = useRouter();

    // 로그인 상태 체크 및 상태 관리
    const check = async () => {
      try {
        const { data } = await axios.get("/api/auth/check");
        if (!data) {
          router.push("/login");  // 로그인되지 않으면 로그인 페이지로 리디렉션
        } else {
          userStore.commit("setCurrentMember", data);  // 로그인한 사용자 정보 저장
        }
      } catch (error) {
        router.push("/login");  // 오류 발생 시 로그인 페이지로 리디렉션
      }
    };

    onMounted(() => {
      check();  // 앱이 처음 마운트될 때만 체크
    });
  }
};
</script>



<style>
.bd-placeholder-img {
  font-size: 1.125rem;
  text-anchor: middle;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}

@media (min-width: 768px) {
  .bd-placeholder-img-lg {
    font-size: 3.5rem;
  }
}

.b-example-divider {
  height: 3rem;
  background-color: rgba(0, 0, 0, .1);
  border: solid rgba(0, 0, 0, .15);
  border-width: 1px 0;
  box-shadow: inset 0 .5em 1.5em rgba(0, 0, 0, .1), inset 0 .125em .5em rgba(0, 0, 0, .15);
}

.b-example-vr {
  flex-shrink: 0;
  width: 1.5rem;
  height: 100vh;
}

.bi {
  vertical-align: -.125em;
  fill: currentColor;
}

.nav-scroller {
  position: relative;
  z-index: 2;
  height: 2.75rem;
  overflow-y: hidden;
}

.nav-scroller .nav {
  display: flex;
  flex-wrap: nowrap;
  padding-bottom: 1rem;
  margin-top: -1px;
  overflow-x: auto;
  text-align: center;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}
</style>
