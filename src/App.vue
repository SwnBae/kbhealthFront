<!-- App.vue -->
<template>
  <div class="app-layout">
    <Footer v-if="isLoggedIn" class="sidebar-footer" />
    <div class="contentBox">
      <RouterView />
    </div>

    <!-- 왼쪽 버튼과 캐릭터 영역 분리 -->
    <!-- 고정된 버튼 영역 -->
    <div v-if="isLoggedIn" class="fixed-button">
      <button
          @click="toggleCharacter"
          class="character-button"
          title="캐릭터 보기"
      >
        <img src="/assets/img/rabbit/rabbitgo (1).png" alt="토끼 캐릭터" class="button-image">
      </button>
    </div>

    <!-- Character 컴포넌트 분리 -->
    <div v-if="showCharacter && isLoggedIn" class="fixed-character">
      <Character
          @close="showCharacter = false"
      />
    </div>
  </div>
</template>

<script setup>
// 기존 import에 nextTick 추가
import { onMounted, computed, ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Footer from "@/components/Footer.vue";
import Character from "@/components/Character.vue"; 
import { useUserStore } from "@/scripts/store"; 
import axios from "axios";

// 필요한 객체 초기화
const router = useRouter();
const userStore = useUserStore(); 
const showCharacter = ref(false); 

// 로그인 여부 확인
const check = async () => {
  try {
    const { data } = await axios.get("/api/auth/check");
    if (!data) {
      router.push("/login");
    } else {
      userStore.setCurrentMember(data);
    }
  } catch (error) {
    router.push("/login");
  }
};

// 로그인 여부 computed로 확인
const isLoggedIn = computed(() => userStore.currentMember.id !== 0);

// 캐릭터 표시/숨김 토글 함수 - nextTick 사용
const toggleCharacter = () => {
  nextTick(() => {
    showCharacter.value = !showCharacter.value;
  });
};

// 컴포넌트 마운트 시 로그인 상태 확인
onMounted(() => {
  check();
});
</script>

<style>
.app-layout {
  display: flex;
  min-height: 100vh; /* 최소 높이를 뷰포트 높이로 설정하여 푸터가 화면 전체 높이를 차지하도록 함 */
}

.sidebar-footer {
  width: 80px; /* 30px에서 80px로 증가 - Footer.vue의 너비(70px)보다 약간 크게 설정 */
  background-color: transparent; /* 배경색을 투명하게 변경 - Footer.vue에서 이미 배경색을 설정하고 있음 */
  border-right: none; /* 테두리 제거 */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px; /* 상단 여백 유지 */
  position: fixed; /* 좌측에 고정 유지 */
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 10; /* 다른 요소 위에 표시 유지 */
}

.contentBox {
  flex-grow: 1;
  padding-left: 95px; /* 75px에서 95px로 증가 - 푸터 크기가 커졌으므로 패딩도 늘림 */
}

/* 여기서부터 수정된 캐릭터 버튼 스타일 */
.fixed-button {
  position: fixed;
  left: 50px;
  bottom: 30px;
  z-index: 11;
}

.character-button {
  width: 60px;
  height: 60px;
  background-color: transparent;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  padding: 0;
}

.character-button:hover {
  transform: scale(1.1);
}

.button-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.fixed-character {
  position: fixed;
  left: 100px; /* 왼쪽에 배치 */
  top: 50px; /* 상단에서 여백 */
  z-index: 100;
  width: 350px; /* 너비 지정 */
}
/* 여기까지 수정된 스타일 */

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