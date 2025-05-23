<!-- components/ToastContainer.vue -->
<template>
  <div class="toast-container">
    <TransitionGroup 
      name="toast-stack" 
      tag="div" 
      class="toast-stack"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-for="(toast, index) in toasts"
        :key="toast.id"
        class="toast-wrapper"
        :data-index="index"
        :style="getToastStyle(index)"
      >
        <ToastNotification
          :title="toast.title"
          :message="toast.message"
          :type="toast.type"
          :duration="toast.duration"
          :show-progress="toast.showProgress"
          @close="removeToast(toast.id)"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useToast } from '@/composables/useToast';
import ToastNotification from './ToastNotification.vue';

const { toasts, removeToast } = useToast();

// 애니메이션 상태 관리
const isAnimating = ref(false);
const toastHeights = ref(new Map());

// 각 토스트의 스타일 계산 (스택 효과)
const getToastStyle = (index) => {
  const baseDelay = index * 50; // 계단식 애니메이션
  const scale = Math.max(0.95, 1 - index * 0.02); // 뒤쪽으로 갈수록 살짝 작아짐
  const translateY = index * -2; // 뒤쪽으로 갈수록 살짝 위로
  const opacity = Math.max(0.8, 1 - index * 0.1); // 뒤쪽으로 갈수록 살짝 투명
  
  return {
    '--animation-delay': `${baseDelay}ms`,
    '--scale': scale,
    '--translate-y': `${translateY}px`,
    '--opacity': opacity,
    'z-index': 9999 - index // 위쪽이 더 높은 z-index
  };
};

// 애니메이션 이벤트 핸들러들
const onBeforeEnter = (el) => {
  // 새 토스트가 들어오기 전 상태
  el.style.height = '0px';
  el.style.opacity = '0';
  el.style.transform = 'translateX(100%) scale(0.8)';
  el.style.marginBottom = '0px';
};

const onEnter = (el, done) => {
  // 높이 측정을 위해 잠시 보이게 함
  el.style.height = 'auto';
  const height = el.offsetHeight;
  
  // 다시 0으로 설정 후 애니메이션 시작
  el.style.height = '0px';
  
  // 강제 리플로우
  el.offsetHeight;
  
  // 애니메이션 시작
  el.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  el.style.height = `${height}px`;
  el.style.opacity = '1';
  el.style.transform = 'translateX(0) scale(1)';
  el.style.marginBottom = '8px';
  
  // 애니메이션 완료 후 height를 auto로 변경
  setTimeout(() => {
    el.style.height = 'auto';
    done();
  }, 400);
};

const onLeave = (el, done) => {
  // 현재 높이 고정
  const height = el.offsetHeight;
  el.style.height = `${height}px`;
  
  // 강제 리플로우
  el.offsetHeight;
  
  // 제거 애니메이션
  el.style.transition = 'all 0.3s ease-out';
  el.style.height = '0px';
  el.style.opacity = '0';
  el.style.transform = 'translateX(100%) scale(0.8)';
  el.style.marginBottom = '0px';
  
  setTimeout(() => {
    done();
  }, 300);
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
  max-width: 400px;
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: 0; /* gap 제거, margin으로 처리 */
}

.toast-wrapper {
  pointer-events: auto;
  transform-origin: top right;
  position: relative;
  overflow: hidden;
  
  /* 스택 효과 적용 */
  transform: translateY(var(--translate-y, 0)) scale(var(--scale, 1));
  opacity: var(--opacity, 1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 애니메이션 지연 */
  transition-delay: var(--animation-delay, 0ms);
}

/* 호버 시 전체 스택 효과 */
.toast-container:hover .toast-wrapper {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.toast-container:hover .toast-wrapper:not(:first-child) {
  transform: translateY(calc(var(--index, 0) * 4px)) scale(0.98);
}

/* TransitionGroup 애니메이션 클래스 */
.toast-stack-move {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 모바일 최적화 */
@media (max-width: 480px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .toast-wrapper {
    transform-origin: top center;
  }
}

/* 접근성: 애니메이션 줄이기 설정 존중 */
@media (prefers-reduced-motion: reduce) {
  .toast-wrapper,
  .toast-stack-move {
    transition-duration: 0.1s;
  }
  
  .toast-wrapper {
    transform: none !important;
    opacity: 1 !important;
  }
}</style>