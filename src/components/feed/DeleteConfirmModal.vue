<!--
파일 위치: @/components/feed/DeleteConfirmModal.vue
게시글 삭제 확인을 위한 모달 컴포넌트
-->
<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')" :class="{'fadeIn': true}">
      <div class="modal-content animate-on-scroll in-view" @click.stop :class="{'popIn': true}">
        <div class="modal-header">
          <h1 class="header-title">게시글 삭제</h1>
          <button class="modal-close" @click="$emit('close')">×</button>
        </div>
        
        <div class="modal-body">
          <div class="warning-icon">🗑️</div>
          <p class="confirm-message">정말 이 게시글을 삭제하시겠습니까?</p>
          <p class="sub-message">이 작업은 되돌릴 수 없습니다.</p>
        </div>
        
        <div class="action-buttons">
          <button class="cancel-button" @click="$emit('close')" :disabled="loading">
            취소
          </button>
          <button class="delete-button" @click="confirmDelete" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? '삭제 중...' : '삭제하기' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  postId: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['close', 'confirm']);

const loading = ref(false);

// 모달이 열릴 때 스크롤 방지
onMounted(() => {
  document.body.style.overflow = 'hidden';
  
  // 애니메이션 요소에 in-view 클래스 추가
  const elements = document.querySelectorAll(".animate-on-scroll");
  elements.forEach(el => {
    if (!el.classList.contains('in-view')) {
      el.classList.add('in-view');
    }
  });
});

// 모달이 닫힐 때 스크롤 복원
onBeforeUnmount(() => {
  document.body.style.overflow = '';
});

// 삭제 확인
const confirmDelete = () => {
  loading.value = true;
  
  // 약간의 지연 효과 추가 (실제 구현에서는 제거)
  setTimeout(() => {
    emit('confirm', props.postId);
    loading.value = false;
  }, 300);
};
</script>

<style scoped>
/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.modal-overlay.fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 모달 컨텐츠 */
.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 95%;
  max-width: 400px;
  overflow: hidden;
  padding-bottom: 20px;
}

.modal-content.popIn {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 애니메이션 클래스 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 모달 헤더 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 0;
  position: relative;
  border-bottom: 1px solid #efefef;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #d32f2f;
  margin: 0;
  text-align: center;
}

.modal-close {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #262626;
  padding: 0;
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: #000;
}

/* 모달 본문 */
.modal-body {
  padding: 24px 20px;
  text-align: center;
}

.warning-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-message {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.sub-message {
  color: #888;
  font-size: 14px;
  margin: 0;
}

/* 버튼 영역 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 0 20px;
}

.cancel-button, .delete-button {
  padding: 10px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button {
  background-color: transparent;
  color: inherit;
  border: 1px solid #ddd;
  padding: 8px 20px;
}

.cancel-button:hover:not(:disabled) {
  background-color: #f6f6f6;
  color: #333;
}

.cancel-button:disabled {
  color: #8e8e8e;
  cursor: not-allowed;
}

.delete-button {
  background-color: #ffebee; /* 연한 빨간색 배경 */
  color: #d32f2f; /* 빨간색 텍스트 */
  border: 1px solid #ffcdd2; /* 연한 빨간색 테두리 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  box-shadow: 0 2px 4px rgba(211, 47, 47, 0.1);
}

.delete-button:hover:not(:disabled) {
  background-color: #ffcdd2; /* 좀 더 진한 빨간색 배경 */
  color: #b71c1c; /* 더 진한 빨간색 텍스트 */
}

.delete-button:disabled {
  background-color: #ffcdd2;
  color: #ef9a9a;
  cursor: not-allowed;
}

/* 로딩 스피너 */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #d32f2f;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
  margin-right: 6px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 반응형 디자인 */
@media (max-width: 500px) {
  .modal-content {
    width: 90%;
  }
}
</style>