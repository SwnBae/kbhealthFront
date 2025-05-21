<template>
  <teleport to="body">
    <div v-if="localVisible" ref="modalRef" class="modal-overlay" @click.self="closeOverlay" :class="{'fadeIn': localVisible, 'fadeOut': !localVisible && modalClosing}">
      <div class="modal-content animate-on-scroll in-view" @click.stop :class="{'popIn': localVisible, 'popOut': !localVisible && modalClosing}">
        <div class="modal-header">
          <h1 class="header-title">새 게시물 만들기</h1>
          <button class="modal-close" @click="closeModal">×</button>
        </div>

        <!-- 이미지 업로드 섹션 -->
        <div class="image-upload-container">
          <div class="image-upload-wrapper">
            <label class="image-upload-area" :class="{ 'has-image': previewImage }">
              <div v-if="!previewImage" class="upload-placeholder">
                <div class="plus-icon">+</div>
                <span class="upload-text">사진을 추가하세요</span>
              </div>
              <img v-if="previewImage" :src="previewImage" alt="미리보기" class="preview-image" />
              <input
                  type="file"
                  @change="handleImageUpload"
                  accept="image/*"
                  class="file-input-hidden"
                  ref="fileInput"
              />
            </label>

            <!-- 이미지가 있을 때만 표시되는 수정/삭제 옵션 -->
            <div v-if="previewImage" class="image-actions">
              <button class="image-action-btn edit-btn" @click="triggerFileInput">
                <span class="action-icon">✏️</span> 변경
              </button>
              <button class="image-action-btn delete-btn" @click="removeImage">
                <span class="action-icon">🗑️</span> 삭제
              </button>
            </div>
          </div>
        </div>

        <!-- 입력 폼 -->
        <div class="form-container">
          <div class="form-group">
            <input
                v-model="form.title"
                placeholder="제목"
                class="input-field"
                :class="{ invalid: showError && !form.title.trim() }"
            />
          </div>

          <div class="form-group">
            <textarea
                v-model="form.content"
                placeholder="내용을 입력하세요..."
                class="input-field textarea"
                :class="{ invalid: showError && !form.content.trim() }"
                rows="6"
            ></textarea>
          </div>

          <!-- 오류 메시지 -->
          <p v-if="formError" class="form-error">
            {{ formError }}
          </p>

          <!-- 버튼 영역 -->
          <div class="action-buttons">
            <button class="cancel-button" @click="closeModal" :disabled="loading">
              취소
            </button>
            <button class="submit-button" @click="submit" :disabled="loading">
              <span v-if="loading" class="spinner"></span>
              {{ loading ? '공유 중...' : '공유하기' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
import axios from 'axios';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'posted']);

// 모달 상태 및 요소 참조
const modalRef = ref(null);
const localVisible = ref(false); // 초기값을 false로 설정
const modalClosing = ref(false);
const scrollbarWidth = ref(0);

// 부모의 visible 값이 변경될 때 로컬 상태도 업데이트
watch(() => props.visible, (newValue) => {
  if (newValue) {
    modalClosing.value = false;
    localVisible.value = true;
    setupModal();
  } else if (localVisible.value) { // localVisible이 true일 때만 닫기 애니메이션 실행
    // 부모가 모달을 닫으려고 할 때 즉시 닫지 않고 애니메이션 후 처리
    closeModal();
  }
});

// props.visible의 초기값을 watch하기 위한 즉시 실행
onMounted(() => {
  if (props.visible) {
    localVisible.value = true;
    setupModal();
  }
});

const form = reactive({
  title: '',
  content: ''
});

const loading = ref(false);
const formError = ref('');
const showError = ref(false);
const imageFile = ref(null);
const previewImage = ref(null);
const fileInput = ref(null);

// 스크롤바 너비 계산
const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

// 스크롤 잠금 함수 - 개선된 방식
const lockScroll = () => {
  // 스크롤바 너비 계산
  scrollbarWidth.value = getScrollbarWidth();

  // body에 overflow: hidden을 적용하여 스크롤 방지
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;
};

// 스크롤 해제 함수 - 개선된 방식
const unlockScroll = () => {
  // body에서 overflow: hidden 제거
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};

// 모달 설정 - 개선된 스크롤 처리
const setupModal = () => {
  // 스크롤 잠금
  lockScroll();

  // 애니메이션 요소에 in-view 클래스 추가
  const elements = document.querySelectorAll(".animate-on-scroll");
  elements.forEach(el => {
    if (!el.classList.contains('in-view')) {
      el.classList.add('in-view');
    }
  });

  // 모달에 fadeIn 클래스와 모달 콘텐츠에 popIn 클래스 추가
  if (modalRef.value) {
    modalRef.value.classList.add('fadeIn');
    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.add('popIn');
    }
  }
};

// 파일 입력 트리거 함수 (이미지 변경 버튼 클릭 시)
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

// 이미지 삭제 함수
const removeImage = () => {
  previewImage.value = null;
  imageFile.value = null;

  // 파일 입력 필드 초기화
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const handleImageUpload = e => {
  const file = e.target.files[0];
  if (!file) return;
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    alert('지원하지 않는 이미지 형식입니다. (jpg, jpeg, png, gif만 가능)');
    return;
  }
  imageFile.value = file;
  const reader = new FileReader();
  reader.onload = () => {
    previewImage.value = reader.result;
  };
  reader.readAsDataURL(file);
};

const resetForm = () => {
  Object.assign(form, { title: '', content: '' });
  imageFile.value = null;
  previewImage.value = null;
  formError.value = '';
  showError.value = false;
};

// 닫기 함수 - 애니메이션 포함
const closeModal = () => {
  // 닫기 애니메이션 추가
  modalClosing.value = true;
  if (modalRef.value) {
    modalRef.value.classList.remove('fadeIn');
    modalRef.value.classList.add('fadeOut');

    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.remove('popIn');
      contentEl.classList.add('popOut');
    }

    // 애니메이션 완료 후 모달 닫기 및 스타일 초기화
    setTimeout(() => {
      unlockScroll(); // 스크롤 해제
      localVisible.value = false;
      emit('close');
    }, 300); // 애니메이션 시간에 맞춰 조정
  } else {
    unlockScroll(); // 스크롤 해제
    localVisible.value = false;
    emit('close');
  }
};

// 오버레이 클릭 시 모달 닫기
const closeOverlay = (event) => {
  // 모달 내부가 아닌 오버레이 영역 클릭 시에만 닫기
  if (event.target.classList.contains('modal-overlay')) {
    closeModal();
  }
};

const submit = async () => {
  showError.value = true;
  formError.value = '';

  // 유효성 검사
  if (!form.title.trim() || !form.content.trim()) {
    formError.value = '제목과 내용을 모두 입력하세요.';
    return;
  }

  loading.value = true;
  try {
    // FormData 객체 생성
    const formData = new FormData();
    formData.append('post', new Blob([JSON.stringify(form)], { type: 'application/json' }));
    if (imageFile.value) {
      formData.append('image', imageFile.value);
    }

    await axios.post('/api/feed', formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('jwt')}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    resetForm();
    emit('posted');
    // 추가 성공 후 닫기 애니메이션 시작
    closeModal();
  } catch (err) {
    console.error('게시글 등록 실패', err);
    formError.value = '등록에 실패했습니다. 다시 시도해주세요.';
  } finally {
    loading.value = false;
  }
};

// 컴포넌트 제거 시 원래 상태로 복원
onBeforeUnmount(() => {
  unlockScroll();
});

// visible 변경 시 상태 초기화
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});
</script>

<style scoped>
:root {
  --scrollbar-width: 0px;
}

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

.modal-overlay.fadeOut {
  animation: fadeOut 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
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

.modal-content.popOut {
  animation: popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
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

@keyframes popOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.95);
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

/* 이미지 업로드 영역 */
.image-upload-container {
  padding: 12px;
  display: flex;
  justify-content: center;
}

.image-upload-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 250px;
}

.image-upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  border: 1px dashed #dbdbdb;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  position: relative;
  aspect-ratio: 1/1;
  width: 100%;
}

.image-upload-area:hover {
  background-color: #f0f0f0;
}

.image-upload-area.has-image {
  border-style: solid;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8e8e8e;
}

.plus-icon {
  font-size: 48px;
  font-weight: 300;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.file-input-hidden {
  opacity: 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

/* 이미지 동작 버튼 스타일 */
.image-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  width: 100%;
  justify-content: center;
}

.image-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid #efefef;
  background-color: #fff;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background-color: #e3f2fd; /* 연한 파란색 배경 */
  border-color: #bbdefb;
  color: #2196f3; /* 파란색 텍스트 */
}

.delete-btn:hover {
  background-color: #ffebee;
  border-color: #ffcdd2;
  color: #e53935;
}

.action-icon {
  font-size: 14px;
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

  .image-upload-container {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .form-container {
    border-top: 1px solid #efefef;
  }
}
</style>