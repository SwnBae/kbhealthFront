<template>
  <teleport to="body">
    <transition name="fade" appear>
      <div class="modal-overlay" v-if="localShowModal" @click="closeOverlay">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h1 class="header-title">신체정보 수정</h1>
            <button class="modal-close" @click="closeModal">×</button>
          </div>

          <!-- 입력 폼 -->
          <div class="form-container">
            <div class="form-group">
              <input
                  class="input-field"
                  v-model.number="form.height"
                  type="number"
                  placeholder="키(cm)"
                  min="0"
                  :class="{ 'invalid': showError && !form.height }"
              />
            </div>

            <div class="form-group">
              <input
                  class="input-field"
                  v-model.number="form.weight"
                  type="number"
                  placeholder="몸무게(kg)"
                  min="0"
                  :class="{ 'invalid': showError && !form.weight }"
              />
            </div>

            <div class="form-group">
              <select class="input-field" v-model="form.gender" :class="{ 'invalid': showError && !form.gender }">
                <option disabled value="">성별 선택</option>
                <option value="MALE">남성</option>
                <option value="FEMALE">여성</option>
              </select>
            </div>

            <div class="form-group">
              <input
                  class="input-field"
                  v-model.number="form.age"
                  type="number"
                  placeholder="나이"
                  min="0"
                  :class="{ 'invalid': showError && !form.age }"
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
              <button class="submit-button" @click="updateBodyInfo" :disabled="loading">
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
  editBodyInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'updated']);

// v-if로 마운트될 때 항상 보이도록 설정
const localShowModal = ref(true);

const form = ref({
  height: null,
  weight: null,
  gender: '',
  age: null
});

const loading = ref(false);
const formError = ref('');
const showError = ref(false);

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
    height: props.editBodyInfo.height || null,
    weight: props.editBodyInfo.weight || null,
    gender: props.editBodyInfo.gender || '',
    age: props.editBodyInfo.age || null
  };
};

// props가 변경될 때마다 폼 상태 업데이트
watch(() => props.editBodyInfo, () => {
  initializeForm();
}, { deep: true });

const updateBodyInfo = async () => {
  formError.value = '';
  showError.value = true;

  // 유효성 검사
  if (!form.value.height) {
    formError.value = '키를 입력해주세요.';
    return;
  }

  if (!form.value.weight) {
    formError.value = '몸무게를 입력해주세요.';
    return;
  }

  if (!form.value.gender) {
    formError.value = '성별을 선택해주세요.';
    return;
  }

  if (!form.value.age) {
    formError.value = '나이를 입력해주세요.';
    return;
  }

  loading.value = true;
  try {
    // memberId가 필요하므로 부모로부터 받거나 현재 상태에서 추출해야 합니다
    const memberId = props.editBodyInfo.id || props.editBodyInfo.memberId;
    const payload = {
      id: memberId,
      ...form.value
    };

    await axios.post('/api/profile/editbodyinfo', payload);

    // 성공 시 업데이트된 정보를 전달하고 애니메이션 시작 후 닫기
    emit('updated', form.value);
    startCloseAnimation();
  } catch (err) {
    console.error('신체정보 수정 실패', err);
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

  .form-container {
    padding: 20px;
  }
}
</style>