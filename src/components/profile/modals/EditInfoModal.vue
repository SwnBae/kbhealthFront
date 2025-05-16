<template>
  <teleport to="body">
    <transition name="fade" appear>
      <div class="modal-overlay" v-if="localShowModal" @click="closeOverlay">
        <div class="modal-content" @click.stop>
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
    </transition>
  </teleport>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch } from 'vue';
import axios from 'axios';

const props = defineProps({
  editInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'updated']);

// v-if로 마운트될 때 항상 보이도록 설정
const localShowModal = ref(true);

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

// 모달이 열릴 때 body 스크롤 방지
onMounted(() => {
  document.body.style.overflow = 'hidden';
  initializeForm();
});

// 모달 표시 상태가 변경될 때 body 스크롤 제어
watch(() => localShowModal.value, (isVisible) => {
  document.body.style.overflow = isVisible ? 'hidden' : '';
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
    startCloseAnimation();
  } catch (err) {
    console.error('프로필 수정 실패', err);
    formError.value = '수정에 실패했습니다. 다시 시도해주세요.';
  } finally {
    loading.value = false;
  }
};

// 닫기 애니메이션 시작 함수
const startCloseAnimation = () => {
  localShowModal.value = false;
  // CSS 애니메이션 시간에 맞춰 지연 후 부모에게 실제 닫힘 알림
  setTimeout(() => {
    emit('close');
  }, 300); // fade 애니메이션 시간(0.3s)과 일치시킴
};

const closeModal = () => {
  startCloseAnimation();
};

// 오버레이 클릭 시 모달 닫기
const closeOverlay = () => {
  startCloseAnimation();
};
</script>

<style scoped>
/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
  overflow: hidden; /* 바깥 영역 스크롤 방지 */
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

/* 트랜지션 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 모달 스케일 애니메이션 */
@keyframes modal-in {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes modal-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.9);
    opacity: 0;
  }
}

/* 일관된 모달 클래스 */
.modal-standard {
  animation: modal-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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