<!--
파일 위치: @/components/feed/PostEditModal.vue
게시글 수정을 위한 모달 컴포넌트
-->
<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')" :class="{'fadeIn': true}">
      <div class="modal-content animate-on-scroll in-view" @click.stop :class="{'popIn': true}">
        <div class="modal-header">
          <h1 class="header-title">게시글 수정</h1>
          <button class="modal-close" @click="$emit('close')">×</button>
        </div>
        
        <!-- 입력 폼 -->
        <div class="form-container">
          <div class="form-group">
            <input
              v-model="editedPost.title"
              placeholder="제목"
              class="input-field"
              :class="{ invalid: showError && !editedPost.title.trim() }"
            />
          </div>

          <div class="form-group">
            <textarea
              v-model="editedPost.content"
              placeholder="내용을 입력하세요..."
              class="input-field textarea"
              :class="{ invalid: showError && !editedPost.content.trim() }"
              rows="6"
            ></textarea>
          </div>

          <!-- 오류 메시지 -->
          <p v-if="formError" class="form-error">
            {{ formError }}
          </p>

          <!-- 버튼 영역 -->
          <div class="action-buttons">
            <button class="cancel-button" @click="$emit('close')" :disabled="loading">
              취소
            </button>
            <button class="submit-button" @click="submitEdit" :disabled="!isValid || loading">
              <span v-if="loading" class="spinner"></span>
              {{ loading ? '수정 중...' : '수정하기' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'submit']);

// 모달 상태
const loading = ref(false);
const formError = ref('');
const showError = ref(false);

// 수정할 게시글 데이터
const editedPost = ref({
  title: props.post.title || '',
  content: props.post.content || ''
});

// props 변경 시 editedPost 업데이트
watch(() => props.post, (newPost) => {
  editedPost.value = {
    title: newPost.title || '',
    content: newPost.content || ''
  };
}, { immediate: true });

// 유효성 검사
const isValid = computed(() => {
  return editedPost.value.title.trim() !== '' && 
         editedPost.value.content.trim() !== '';
});

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

// 수정 제출
const submitEdit = () => {
  showError.value = true;
  formError.value = '';

  // 유효성 검사
  if (!editedPost.value.title.trim() || !editedPost.value.content.trim()) {
    formError.value = '제목과 내용을 모두 입력하세요.';
    return;
  }

  loading.value = true;
  
  // 부모 컴포넌트에 수정 데이터 전달
  setTimeout(() => {
    emit('submit', {
      postId: props.post.postId,
      title: editedPost.value.title.trim(),
      content: editedPost.value.content.trim()
    });
    
    loading.value = false;
  }, 300); // 실제 API 호출 대신 지연 효과 부여 (실제 구현에서는 제거)
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
  max-width: 500px;
  overflow: hidden;
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
  color: #262626;
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

/* 폼 영역 */
.form-container {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
  position: relative;
}

.input-field {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  background-color: #fff;
}

.input-field:focus {
  outline: none;
  border-color: #a8a8a8;
}

.textarea {
  resize: none;
  min-height: 120px;
}

.invalid {
  border-color: #ed4956;
}

/* 오류 메시지 */
.form-error {
  color: #ed4956;
  font-size: 13px;
  margin: 8px 0;
}

/* 버튼 영역 */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.submit-button, .cancel-button {
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button {
  background-color: #e1f7e1;  /* 연한 초록색 */
  color: #4caf50;  /* 초록색 텍스트 */
  border: 1px solid #b2dfbb;  /* 연한 초록색 테두리 */
  border-radius: 20px;  /* 둥근 모서리 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.submit-button:hover:not(:disabled) {
  background-color: #c8e6c9;  /* 약간 더 진한 초록색 */
  color: #388e3c;  /* 어두운 초록색 텍스트 */
}

.submit-button:disabled {
  background-color: #c8e6c9;  /* 비활성화 시에도 비슷한 연한 초록색 */
  color: #a5d6a7;  /* 부드러운 초록색 텍스트 */
  border-color: #81c784;  /* 더 연한 초록색 테두리 */
  cursor: not-allowed;
}

.cancel-button {
  background-color: transparent;
  color: inherit;  /* 색상은 부모로부터 상속 */
  border: 1px solid #ddd;  /* 버튼 테두리 */
  border-radius: 20px;  /* 둥근 모서리 */
  padding: 8px 20px;  /* 버튼 크기 */
  font-size: 14px;  /* 글자 크기 */
  font-weight: 600;  /* 글자 굵기 */
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-button:hover:not(:disabled) {
  background-color: #f6f6f6;  /* 호버 시 배경색 */
  color: #333;  /* 호버 시 텍스트 색상 */
  border-color: #ddd;  /* 테두리 색상 */
}

.cancel-button:disabled {
  color: #8e8e8e;
  cursor: not-allowed;
}

/* 로딩 스피너 */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
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
    width: 100%;
    height: 100%;
    max-width: none;
    border-radius: 0;
    display: flex;
    flex-direction: column;
  }

  .form-container {
    flex: 1;
  }
}
</style>