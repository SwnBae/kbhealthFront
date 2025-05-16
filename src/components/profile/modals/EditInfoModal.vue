<template>
  <teleport to="body">
    <div ref="modalRef" class="modal-overlay" @click.self="closeOverlay">
      <div class="modal-content animate-on-scroll in-view" @click.stop>
        <div class="modal-header">
          <h1 class="header-title">계정정보 수정</h1>
          <button class="modal-close" @click="closeModal">×</button>
        </div>

        <!-- 이미지 업로드 영역 -->
        <div class="image-upload-container">
          <label class="image-upload-area" :class="{ 'has-image': previewImage }">
            <div v-if="!previewImage" class="upload-placeholder">
              <div class="plus-icon">+</div>
              <span class="upload-text">프로필 사진 추가</span>
            </div>
            <img v-if="previewImage" :src="previewImage" alt="미리보기" class="preview-image" />
            <input
                type="file"
                @change="handleImageUpload"
                accept="image/*"
                class="file-input-hidden"
            />
          </label>
        </div>

        <!-- 입력 폼 -->
        <div class="form-container">
          <div class="form-group">
            <input
                class="input-field"
                v-model="form.userName"
                placeholder="닉네임"
                :class="{ 'invalid': showError && !form.userName }"
            />
          </div>

          <div class="form-group">
            <input
                class="input-field"
                v-model="form.password"
                type="password"
                placeholder="비밀번호"
                :class="{ 'invalid': showError && !form.password }"
            />
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
            <button class="submit-button" @click="updateProfile" :disabled="loading">
              <span v-if="loading" class="spinner"></span>
              {{ loading ? '저장 중...' : '저장하기' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onBeforeUnmount, watch } from 'vue';
import axios from 'axios';

const props = defineProps({
  editInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'updated']);

// 모달 상태 및 요소 참조
const modalRef = ref(null);
const scrollbarWidth = ref(0);

const form = ref({
  userName: '',
  password: '',
  profileImageUrl: ''
});

const loading = ref(false);
const formError = ref('');
const showError = ref(false);
const imageFile = ref(null);
const previewImage = ref(null);

// 스크롤바 너비 계산
const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

// 모달 설정 - 개선된 스크롤 처리
const setupModal = () => {
  // 모달이 열리기 전의 스크롤 위치 저장
  const scrollY = window.scrollY;

  // 스크롤바 너비 계산
  scrollbarWidth.value = getScrollbarWidth();

  // CSS 변수로 패딩 설정 (스크롤바 자리 대체)
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth.value}px`);

  // 현재 스크롤 위치를 유지하면서 스크롤 방지
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;

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
    modalRef.value.querySelector('.modal-content').classList.add('popIn');
  }

  // 폼 초기화
  initializeForm();
};

// 스타일 초기화 함수
const resetBodyStyles = () => {
  // 원래 스크롤 위치 복원
  const scrollY = parseInt(document.body.style.top || '0', 10) * -1;

  // 모든 스타일 초기화
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';
  document.documentElement.style.setProperty('--scrollbar-width', '0px');

  // 스크롤 위치 복원
  window.scrollTo(0, scrollY);
};

// 모달이 열릴 때 초기화
onMounted(() => {
  setupModal();
});

// 컴포넌트 제거 시 원래 상태로 복원
onBeforeUnmount(() => {
  resetBodyStyles();
});

// 컴포넌트 마운트 시와 props 변경 시 초기화
const initializeForm = () => {
  form.value = {
    userName: props.editInfo.userName || '',
    password: props.editInfo.password || '',
    profileImageUrl: props.editInfo.profileImageUrl || ''
  };

  // 기존 이미지 로드 시도
  previewImage.value = null; // 초기화

  if (props.editInfo.profileImageUrl) {
    previewImage.value = props.editInfo.profileImageUrl;
    console.log('props에서 이미지 URL 사용:', previewImage.value);
  }
};

// props가 변경될 때마다 폼 상태 업데이트
watch(() => props.editInfo, () => {
  initializeForm();
}, { deep: true });

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
    console.log('새 이미지 설정됨');
  };
  reader.readAsDataURL(file);
};

const updateProfile = async () => {
  formError.value = '';
  showError.value = true;

  // 유효성 검사
  if (!form.value.userName) {
    formError.value = '닉네임을 입력해주세요.';
    return;
  }

  if (!form.value.password) {
    formError.value = '비밀번호를 입력해주세요.';
    return;
  }

  loading.value = true;
  try {
    const formData = new FormData();
    const memberEditRequest = {
      userName: form.value.userName,
      password: form.value.password,
      profileImageUrl: form.value.profileImageUrl
    };

    formData.append('memberEditRequest', new Blob([JSON.stringify(memberEditRequest)], { type: 'application/json' }));
    if (imageFile.value) {
      formData.append('image', imageFile.value);
    }

    await axios.post('/api/profile/editinfo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    // 성공 시 업데이트된 정보를 전달하고 애니메이션 시작 후 닫기
    const updatedProfileInfo = {
      ...memberEditRequest,
      profileImagePreview: previewImage.value // 새 이미지 미리보기도 함께 전달
    };

    emit('updated', updatedProfileInfo);
    closeModal();
  } catch (err) {
    console.error('프로필 수정 실패', err);
    formError.value = '수정에 실패했습니다. 다시 시도해주세요.';
  } finally {
    loading.value = false;
  }
};

// 닫기 함수 - 애니메이션 포함
const closeModal = () => {
  // 닫기 애니메이션 추가
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
      resetBodyStyles();
      emit('close');
    }, 300); // 애니메이션 시간에 맞춰 조정
  } else {
    resetBodyStyles();
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
</script>

<style scoped>
:root {
  --scrollbar-width: 0px;
}

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
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e6e6e6 #f5f5f5;
  /* 스크롤바가 있어도 둥근 모서리 유지 */
  border-radius: 12px;
  mask-image: radial-gradient(white, black);
  -webkit-mask-image: -webkit-radial-gradient(white, black);
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

/* 스크롤바 스타일 수정 */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
  margin: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #e6e6e6;
  border-radius: 3px;
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
  padding: 20px;
  display: flex;
  justify-content: center;
}

.image-upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  border: 1px dashed #dbdbdb;
  border-radius: 50%; /* 원형 프로필 이미지 */
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  position: relative;
  width: 120px;
  height: 120px;
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
  font-size: 32px;
  font-weight: 300;
  margin-bottom: 4px;
}

.upload-text {
  font-size: 12px;
  text-align: center;
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
  background-color: #f7f7f7; /* 연한 회색 배경 */
}

.input-field:focus {
  outline: none;
  border-color: #a8a8a8;
  background-color: #fff; /* 포커스 시 흰색 배경 */
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
  margin-top: 24px;
}

.submit-button, .cancel-button {
  padding: 10px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button {
  background-color: #e6e6e6; /* 연한 회색 */
  color: #333; /* 어두운 회색 텍스트 */
  border: 1px solid #d1d1d1; /* 연한 회색 테두리 */
  border-radius: 20px; /* 둥근 모서리 */
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
  background-color: #d1d1d1; /* 약간 더 진한 회색 */
  color: #222; /* 더 어두운 회색 텍스트 */
}

.submit-button:disabled {
  background-color: #e6e6e6; /* 비활성화 시에도 비슷한 연한 회색 */
  color: #999; /* 부드러운 회색 텍스트 */
  border-color: #d1d1d1; /* 연한 회색 테두리 */
  cursor: not-allowed;
}

.cancel-button {
  background-color: transparent;
  color: inherit; /* 색상은 부모로부터 상속 */
  border: 1px solid #ddd; /* 버튼 테두리 */
  border-radius: 20px; /* 둥근 모서리 */
  padding: 8px 20px; /* 버튼 크기 */
  font-size: 14px; /* 글자 크기 */
  font-weight: 600; /* 글자 굵기 */
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-button:hover:not(:disabled) {
  background-color: #f6f6f6; /* 호버 시 배경색 */
  color: #333; /* 호버 시 텍스트 색상 */
  border-color: #ddd; /* 테두리 색상 */
}

.cancel-button:disabled {
  color: #8e8e8e;
  cursor: not-allowed;
}

/* 로딩 스피너 */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #333;
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
    height: auto;
    max-width: none;
    border-radius: 0;
    display: flex;
    flex-direction: column;
  }

  .image-upload-container {
    padding: 30px 20px;
  }

  .form-container {
    padding: 20px;
  }
}
</style>