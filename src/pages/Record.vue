<template>
  <div class="record-wrapper">
    <!-- 탭 전환 -->
    <div class="tab-container fade-in-animation">
      <button
          @click="activeTab = 'diet'"
          :class="['tab-button', activeTab === 'diet' ? 'active' : '']"
      >
        Diet Record
      </button>
      <button
          @click="activeTab = 'exercise'"
          :class="['tab-button', activeTab === 'exercise' ? 'active' : '']"
      >
        Exercise Record
      </button>
    </div>

    <!-- 콘텐츠 영역 -->
    <div class="content-container">
      <transition name="fade" mode="out-in">
        <DietRecord v-if="activeTab === 'diet'" key="diet" />
        <ExerciseRecord v-else key="exercise" />
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import DietRecord from '@/components/record/DietRecord.vue';
import ExerciseRecord from '@/components/record/ExerciseRecord.vue';

const activeTab = ref('diet');

// 페이드 인 애니메이션 적용
const applyFadeInAnimation = () => {
  document.querySelectorAll(".fade-in-animation").forEach(el => {
    el.classList.add("fade-in-active");
  });
};

onMounted(async () => {
  await nextTick();
  applyFadeInAnimation();
});
</script>

<style scoped>
/* 기본 스타일 */
.record-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 탭 컨테이너 스타일 */
.tab-container {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #e6e6e6;
  opacity: 0;
  transition: opacity 2s ease;
}

.tab-container.fade-in-active {
  opacity: 1;
}

.tab-button {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  font-size: 18px;
  color: #666;
  background: transparent;
  border: none;
  position: relative;
  cursor: pointer;
  transition: color 0.3s ease;
}

.tab-button:hover {
  color: #333;
}

.tab-button.active {
  color: #222;
  font-weight: 600;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #222;
  transition: all 0.3s ease;
}

/* 콘텐츠 영역 스타일 */
.content-container {
  flex: 1;
}

/* 페이드 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>