<template>
  <teleport to="body">
    <transition name="fade" appear>
      <div class="modal-overlay" v-if="localShowModal" @click="closeOverlay">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h1 class="header-title">운동 기록 추가</h1>
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
                  class="input-field"
                  v-model="form.exerciseName"
                  placeholder="운동 이름"
                  :class="{ 'invalid': showError && !form.exerciseName }"
              />
            </div>

            <div class="form-group">
              <select class="input-field" v-model="form.exerciseType">
                <option disabled value="">운동 종류 선택</option>
                <option value="CARDIO">유산소</option>
                <option value="WEIGHT">무산소</option>
                <option value="YOGA">요가</option>
                <option value="SWIMMING">수영</option>
              </select>
            </div>

            <div class="form-group">
              <input
                  class="input-field"
                  v-model.number="form.durationMinutes"
                  type="number"
                  placeholder="소요 시간(분)"
                  min="0"
                  :class="{ 'invalid': showError && !form.durationMinutes }"
              />
            </div>

            <div class="form-group">
              <input
                  class="input-field"
                  v-model.number="form.caloriesBurned"
                  type="number"
                  placeholder="소모 칼로리(kcal)"
                  min="0"
                  :class="{ 'invalid': showError && !form.caloriesBurned }"
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
              <button class="submit-button" @click="addExerciseRecord" :disabled="loading">
                <span v-if="loading" class="spinner"></span>
                {{ loading ? '추가 중...' : '추가하기' }}
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
  showModal: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'added']);

// 로컬 상태 추가 - 애니메이션을 위한 지연 처리
const localShowModal = ref(props.showModal);

// 부모의 showModal 값이 변경될 때 로컬 상태도 업데이트
watch(() => props.showModal, (newValue) => {
  if (newValue) {
    localShowModal.value = true;
  } else {
    // 부모가 모달을 닫으려고 할 때 즉시 닫지 않고 애니메이션 후 처리
    startCloseAnimation();
  }
});

const form = ref({
  exerciseName: '',
  durationMinutes: null,
  caloriesBurned: null,
  exerciseType: 'CARDIO'
});

const loading = ref(false);
const formError = ref('');
const showError = ref(false);
const imageFile = ref(null);
const previewImage = ref(null);
const fileInput = ref(null);

// 모달이 열릴 때 body 스크롤 방지
onMounted(() => {
  document.body.style.overflow = 'hidden';
});

// 모달 표시 상태가 변경될 때 body 스크롤 제어
watch(() => localShowModal.value, (isVisible) => {
  document.body.style.overflow = isVisible ? 'hidden' : '';
});

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
  form.value = {
    exerciseName: '',
    durationMinutes: null,
    caloriesBurned: null,
    exerciseType: 'CARDIO'
  };
  imageFile.value = null;
  previewImage.value = null;
  formError.value = '';
  showError.value = false;
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
const closeOverlay = (event) => {
  // 모달 내부가 아닌 오버레이 영역 클릭 시에만 닫기
  if (event.target.classList.contains('modal-overlay')) {
    startCloseAnimation();
  }
};

const addExerciseRecord = async () => {
  showError.value = true;
  formError.value = '';

  // 유효성 검사
  if (!form.value.exerciseName) {
    formError.value = '운동 이름을 입력해주세요.';
    return;
  }

  if (!form.value.durationMinutes) {
    formError.value = '소요 시간을 입력해주세요.';
    return;
  }

  if (!form.value.caloriesBurned) {
    formError.value = '소모 칼로리를 입력해주세요.';
    return;
  }

  loading.value = true;
  try {
    // FormData 객체 생성
    const formData = new FormData();
    const exerciseRecord = {
      exerciseName: form.value.exerciseName,
      durationMinutes: form.value.durationMinutes,
      caloriesBurned: form.value.caloriesBurned,
      exerciseType: form.value.exerciseType
    };

    formData.append('record', new Blob([JSON.stringify(exerciseRecord)], {type: 'application/json'}));
    if (imageFile.value) {
      formData.append('image', imageFile.value);
    }

    await axios.post('/api/records/exercise', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    resetForm();
    emit('added');
    // 추가 성공 후 닫기 애니메이션 시작
    startCloseAnimation();
  } catch (err) {
    console.error('운동 기록 추가 실패', err);
    formError.value = '추가에 실패했습니다. 다시 시도해주세요.';
  } finally {
    loading.value = false;
  }
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

/* 트랜지션 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  background-color: #e1e6ff; /* 연한 파란색 */
  color: #3f51b5; /* 파란색 텍스트 */
  border: 1px solid #b2b8e8; /* 연한 파란색 테두리 */
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
  background-color: #c5cae9; /* 약간 더 진한 파란색 */
  color: #303f9f; /* 어두운 파란색 텍스트 */
}

.submit-button:disabled {
  background-color: #c5cae9; /* 비활성화 시에도 비슷한 연한 파란색 */
  color: #9fa8da; /* 부드러운 파란색 텍스트 */
  border-color: #7986cb; /* 더 연한 파란색 테두리 */
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