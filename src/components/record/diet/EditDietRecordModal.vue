<template>
  <teleport to="body">
    <transition name="fade" appear>
      <div class="modal-overlay" v-if="showModal" @click="closeOverlay">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h1 class="header-title">식단 기록 수정</h1>
            <button class="modal-close" @click="closeModal">×</button>
          </div>

          <!-- 이미지 업로드 섹션 -->
          <div class="image-upload-container">
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
              />
            </label>
          </div>

          <!-- 입력 폼 -->
          <div class="form-container">
            <!-- 음식 검색 및 선택 -->
            <div class="form-group">
              <input
                  class="input-field"
                  v-model="dietSearchKeyword"
                  placeholder="음식 이름 검색"
                  @keyup.enter="searchDiets"
                  :class="{ invalid: showError && !dietSearchKeyword }"
              />
              <button class="search-button-diet" @click="searchDiets">검색</button>
            </div>

            <!-- 검색 결과 리스트 -->
            <transition name="fade">
              <ul v-if="diets.length > 0" class="search-result-list">
                <transition-group name="fade-list" tag="div">
                  <li
                      v-for="diet in diets"
                      :key="diet.id"
                      class="search-result-item"
                      @click="selectDiet(diet)"
                  >
                    {{ diet.menu }}
                  </li>
                </transition-group>
              </ul>
            </transition>

            <div class="form-group">
              <input
                  class="input-field"
                  v-model="form.amount"
                  type="number"
                  placeholder="먹은 양 (g, ml)"
                  min="0"
                  :class="{ invalid: showError && !form.amount }"
              />
            </div>

            <div class="form-group">
              <select class="input-field" v-model="form.mealType">
                <option value="BREAKFAST">아침</option>
                <option value="LUNCH">점심</option>
                <option value="DINNER">저녁</option>
                <option value="SNACK">간식</option>
              </select>
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
              <button class="submit-button" @click="updateDietRecord" :disabled="loading">
                <span v-if="loading" class="spinner"></span>
                {{ loading ? '수정 중...' : '수정하기' }}
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
  recordToEdit: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'updated']);

const showModal = ref(true);
const diets = ref([]);
const form = ref({
  id: '',
  dietId: '',
  amount: 0,
  mealType: 'BREAKFAST'
});
const dietSearchKeyword = ref('');
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

// 모달이 닫힐 때 body 스크롤 복원
watch(() => showModal.value, (isVisible) => {
  document.body.style.overflow = isVisible ? 'hidden' : '';
});

// 컴포넌트 마운트 시와 props 변경 시 초기화
const initializeForm = async () => {
  form.value = {
    id: props.recordToEdit.id,
    dietId: props.recordToEdit.dietId,
    amount: props.recordToEdit.amount,
    mealType: props.recordToEdit.mealType
  };
  dietSearchKeyword.value = props.recordToEdit.dietMenu || '';

  // 기존 이미지 로드 시도
  previewImage.value = null; // 초기화

  if (props.recordToEdit.drImgUrl) {
    previewImage.value = props.recordToEdit.drImgUrl;
    console.log('props에서 이미지 URL 사용:', previewImage.value);
  }
};

// props가 변경될 때마다 폼 상태 업데이트
watch(() => props.recordToEdit, () => {
  initializeForm();
}, { deep: true });

const searchDiets = async () => {
  try {
    const { data } = await axios.get('/api/items/search', {
      params: { menu: dietSearchKeyword.value },
    });
    diets.value = data;
  } catch (err) {
    console.error('음식 검색 실패', err);
    formError.value = '음식 검색에 실패했습니다. 다시 시도해 주세요.';
  }
};

const selectDiet = (diet) => {
  form.value.dietId = diet.id;
  dietSearchKeyword.value = diet.menu;
  diets.value = []; // 결과 닫기
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
    console.log('새 이미지 설정됨');
  };
  reader.readAsDataURL(file);
};

const updateDietRecord = async () => {
  formError.value = '';
  showError.value = true;

  if (!form.value.dietId || !dietSearchKeyword.value) {
    formError.value = '음식을 선택해주세요.';
    return;
  }

  if (!form.value.amount) {
    formError.value = '먹은 양을 입력해주세요.';
    return;
  }

  loading.value = true;
  try {
    const formData = new FormData();
    const dietRecord = {
      id: form.value.id,
      dietId: form.value.dietId,
      amount: form.value.amount,
      mealType: form.value.mealType
    };

    formData.append('record', new Blob([JSON.stringify(dietRecord)], { type: 'application/json' }));
    if (imageFile.value) {
      formData.append('image', imageFile.value);
    }

    await axios.put(`/api/records/diet/${form.value.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    emit('updated');
  } catch (err) {
    console.error('식단 기록 수정 실패', err);
    formError.value = '수정에 실패했습니다. 다시 시도해주세요.';
  } finally {
    loading.value = false;
  }
};

const closeModal = () => {
  emit('close');
};

// 오버레이 클릭 시 모달 닫기
const closeOverlay = () => {
  emit('close');
};
</script>

<style scoped>
/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
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
  padding: 12px;
  display: flex;
  justify-content: center;
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
  width: 40%;
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

/* 검색 버튼 (음식 검색용) */
.search-button-diet {
  position: absolute;
  right: 4px;
  top: 4px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
}

.search-button-diet:hover {
  background-color: #3d9440;
}

/* 검색 결과 리스트 */
.search-result-list {
  background: white;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  margin-top: -12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  padding: 0;
  list-style: none;
}

.search-result-item {
  padding: 10px 15px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background-color: #f7f7f7;
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
  to { transform: rotate(360deg); }
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
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes modal-out {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0; }
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