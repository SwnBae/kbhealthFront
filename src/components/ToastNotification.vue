<!-- components/ToastNotification.vue -->
<template>
  <div class="toast-notification" :class="typeClass">
    <div class="toast-content">
      <!-- 알림 아이콘 -->
      <div class="toast-icon">
        <component :is="iconComponent" />
      </div>

      <!-- 알림 내용 -->
      <div class="toast-text">
        <div class="toast-title">{{ title }}</div>
        <div class="toast-message">{{ message }}</div>
      </div>

      <!-- 닫기 버튼 -->
      <button 
        @click="close" 
        class="toast-close" 
        aria-label="알림 닫기"
        @mouseenter="pauseProgress"
        @mouseleave="resumeProgress"
      >
        ✕
      </button>
    </div>

    <!-- 진행 바 -->
    <div v-if="showProgress && duration > 0" class="toast-progress">
      <div 
        class="toast-progress-bar" 
        :class="{ paused: isPaused }"
        :style="progressStyle"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: '알림'
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
  },
  duration: {
    type: Number,
    default: 5000
  },
  showProgress: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close']);

const progress = ref(100);
const isPaused = ref(false);
let progressInterval = null;
let autoCloseTimer = null;
let startTime = null;
let pausedTime = 0;

// 타입별 클래스
const typeClass = computed(() => `toast-${props.type}`);

// 타입별 아이콘 컴포넌트
const iconComponent = computed(() => {
  const icons = {
    info: 'InfoIcon',
    success: 'CheckIcon',
    warning: 'WarningIcon',
    error: 'ErrorIcon'
  };
  return icons[props.type] || 'InfoIcon';
});

// 진행 바 스타일
const progressStyle = computed(() => ({
  width: `${progress.value}%`,
  transition: progress.value === 100 ? 'none' : 
    isPaused.value ? 'none' : `width ${props.duration}ms linear`
}));

// 토스트 닫기
const close = () => {
  clearTimers();
  emit('close');
};

// 진행 바 일시정지
const pauseProgress = () => {
  if (props.duration > 0 && !isPaused.value) {
    isPaused.value = true;
    clearTimers();
  }
};

// 진행 바 재개
const resumeProgress = () => {
  if (props.duration > 0 && isPaused.value) {
    isPaused.value = false;
    startProgressAnimation();
  }
};

// 타이머 정리
const clearTimers = () => {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
};

// 진행 바 애니메이션 시작
const startProgressAnimation = () => {
  if (props.duration <= 0) return;
  
  const currentTime = Date.now();
  const elapsedBeforePause = pausedTime;
  startTime = currentTime - elapsedBeforePause;
  
  progressInterval = setInterval(() => {
    if (isPaused.value) return;
    
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, props.duration - elapsed);
    progress.value = (remaining / props.duration) * 100;
    
    if (remaining <= 0) {
      clearInterval(progressInterval);
      close();
    }
  }, 16); // 60fps
  
  // 자동 닫기 타이머 설정
  const remainingDuration = props.duration - elapsedBeforePause;
  autoCloseTimer = setTimeout(() => {
    if (!isPaused.value) {
      close();
    }
  }, remainingDuration);
};

// 마운트 시 진행 바 시작
onMounted(() => {
  if (props.duration > 0) {
    startProgressAnimation();
  }
});

// 컴포넌트 해제 시 타이머 정리
onUnmounted(() => {
  clearTimers();
});
</script>

<style scoped>
.toast-notification {
  width: 100%;
  min-width: 300px;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 8px 32px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
  
  /* 호버 효과 */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-notification:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 16px 48px rgba(0, 0, 0, 0.08);
}

.toast-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

.toast-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-top: 2px;
  transition: all 0.2s ease;
}

.toast-text {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
  color: #1a1a1a;
}

.toast-message {
  font-size: 13px;
  line-height: 1.4;
  color: #6b7280;
  word-break: break-word;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 16px;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  line-height: 1;
}

.toast-close:hover {
  background-color: #f3f4f6;
  color: #374151;
  transform: scale(1.1);
}

.toast-progress {
  height: 3px;
  background-color: rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.toast-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 16ms linear;
  border-radius: 0 2px 2px 0;
}

.toast-progress-bar.paused {
  animation: pulse 1s ease-in-out infinite;
}

/* 타입별 스타일 */
.toast-info .toast-icon {
  background-color: #dbeafe;
  color: #3b82f6;
}

.toast-info .toast-progress-bar {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.toast-success .toast-icon {
  background-color: #d1fae5;
  color: #10b981;
}

.toast-success .toast-progress-bar {
  background: linear-gradient(90deg, #10b981, #059669);
}

.toast-warning .toast-icon {
  background-color: #fef3c7;
  color: #f59e0b;
}

.toast-warning .toast-progress-bar {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.toast-error .toast-icon {
  background-color: #fee2e2;
  color: #ef4444;
}

.toast-error .toast-progress-bar {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

/* 애니메이션 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 모바일 최적화 */
@media (max-width: 480px) {
  .toast-notification {
    min-width: auto;
    max-width: none;
    width: 100%;
  }

  .toast-content {
    padding: 14px;
    gap: 10px;
  }

  .toast-title {
    font-size: 13px;
  }

  .toast-message {
    font-size: 12px;
  }
}

/* 접근성: 애니메이션 줄이기 */
@media (prefers-reduced-motion: reduce) {
  .toast-notification,
  .toast-icon,
  .toast-close {
    transition-duration: 0.1s;
  }
  
  .toast-notification:hover {
    transform: none;
  }
}</style>