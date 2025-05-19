<template>
  <teleport to="body">
    <div ref="modalRef" class="modal-overlay" @click.self="closeOverlay">
      <div class="modal-content animate-on-scroll in-view" @click.stop>
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
  </teleport>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onBeforeUnmount, watch } from 'vue';
import axios from 'axios';

const props = defineProps({
  editBodyInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'updated']);

// 모달 상태 및 요소 참조
const modalRef = ref(null);
const scrollbarWidth = ref(0);
const savedScrollY = ref(0);

const form = ref({
  height: null,
  weight: null,
  gender: '',
  age: null
});

const loading = ref(false);
const formError = ref('');
const showError = ref(false);

// 스크롤바 너비 계산
const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

// 스크롤 잠금 함수 - DietDetailModal 방식으로 변경
const lockScroll = () => {
  // 현재 스크롤 위치 저장
  savedScrollY.value = window.scrollY;

  // 스크롤바 너비 계산
  scrollbarWidth.value = getScrollbarWidth();

  // body에 overflow: hidden을 적용하여 스크롤 방지
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;
};

// 스크롤 해제 함수 - DietDetailModal 방식으로 변경
const unlockScroll = () => {
  // body에서 overflow: hidden 제거
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};

// 모달 설정 - DietDetailModal 방식으로 변경
const setupModal = () => {
  // 모달이 열리기 전 스크롤 잠금
  lockScroll();

  // 애니메이션 요소에 in-view 클래스 추가
  const elements = document.querySelectorAll(".animate-on-scroll");
  elements.forEach(el => {
    if (!el.classList.contains('in-view')) {
      el.classList.add('in-view');
    }
  });

  // 모달 애니메이션 클래스 추가
  if (modalRef.value) {
    modalRef.value.classList.add('fadeIn');
    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.add('popIn');
    }
  }

  // 폼 초기화
  initializeForm();
};

// 모달이 열릴 때 초기화
onMounted(() => {
  setupModal();
});

// 컴포넌트 제거 시 원래 상태로 복원
onBeforeUnmount(() => {
  unlockScroll();
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
    closeModal();
  } catch (err) {
    console.error('신체정보 수정 실패', err);
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

    // 애니메이션 완료 후 모달 닫기 및 스크롤 해제
    setTimeout(() => {
      unlockScroll(); // 스크롤 해제만 하고 window.scrollTo() 호출 제거
      emit('close');
    }, 300);
  } else {
    unlockScroll(); // 스크롤 해제만 하고 window.scrollTo() 호출 제거
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

  .form-container {
    padding: 20px;
  }
}
</style>