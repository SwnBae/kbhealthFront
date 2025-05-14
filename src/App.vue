<template>
  <div class="app-layout">
    <Footer v-if="isLoggedIn" class="sidebar-footer" />
    <div class="contentBox">
      <RouterView />
    </div>
  </div>
</template>

<script>
import Footer from "@/components/Footer";
import userStore from "@/scripts/store";
import axios from "axios";
import { onMounted, computed } from "vue";
import { useRouter } from "vue-router";

export default {
  name: 'App',
  components: {
    Footer,
  },
  setup() {
    const router = useRouter();

    // 로그인 여부 확인
    const check = async () => {
      try {
        const { data } = await axios.get("/api/auth/check");
        if (!data) {
          router.push("/login");
        } else {
          userStore.commit("setCurrentMember", data);
        }
      } catch (error) {
        router.push("/login");
      }
    };

    onMounted(() => {
      check();
    });

    // 로그인 여부 computed로 확인
    const isLoggedIn = computed(() => userStore.state.currentMember.id !== 0);

    return {
      isLoggedIn
    };
  }
};
</script>

<style>
.app-layout {
  display: flex;
  min-height: 100vh; /* 최소 높이를 뷰포트 높이로 설정하여 푸터가 화면 전체 높이를 차지하도록 함 */
}

.sidebar-footer {
  width: 30px; /* 적절한 너비 설정 */
  background-color: #f8f9fa; /* 사이드바 배경색 */
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px; /* 상단 여백 */
  position: fixed; /* 좌측에 고정 */
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 10; /* 다른 요소 위에 표시 */
}

.contentBox {
  flex-grow: 1;
  padding-left: 80px; /* 푸터 너비만큼 왼쪽 패딩을 주어 콘텐츠가 가려지지 않도록 함 */
}

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