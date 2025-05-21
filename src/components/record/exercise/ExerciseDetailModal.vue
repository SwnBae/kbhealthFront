<template>
  <teleport to="body">
    <div ref="modalRef" class="modal-overlay" @click.self="closeOverlay" :class="{'fadeIn': localShowModal, 'fadeOut': !localShowModal && modalClosing}">
      <div class="modal-content animate-on-scroll in-view" @click.stop :class="{'popIn': localShowModal, 'popOut': !localShowModal && modalClosing}">
        <!-- 모달 헤더 -->
        <div class="modal-header">
          <h1 class="header-title">운동 상세 정보</h1>
          <button class="modal-close" @click="closeModal">×</button>
        </div>

        <!-- 스크롤 가능한 내용물을 위한 새 컨테이너 -->
        <div class="modal-scrollable-content">
          <!-- 운동 이미지 섹션 (이미지 처리 로직 변경) -->
          <div class="exercise-image-container">
            <img 
              :src="getImageUrl(record.erImgUrl)" 
              alt="운동 이미지" 
              class="exercise-image"
              @error="handleImageError" 
            />
          </div>

          <!-- 기본 정보 -->
          <div class="info-section">
            <h4 class="exercise-name">{{ record.exerciseName }}</h4>

            <div class="exercise-type-container">
              <span class="exercise-type" :class="getExerciseTypeClass(record.exerciseType)">
                {{ formatExerciseType(record.exerciseType) }}
              </span>
              <span class="completion-badge" :class="record.exercised ? 'completed' : 'not-completed'">
                {{ record.exercised ? '완료됨' : '미완료' }}
              </span>
            </div>

            <div class="exercise-stats">
              <div class="stat-item">
                <div class="stat-icon">⏱️</div>
                <div class="stat-value">{{ record.durationMinutes }}분</div>
                <div class="stat-label">소요 시간</div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">🔥</div>
                <div class="stat-value">{{ record.caloriesBurned }}kcal</div>
                <div class="stat-label">소모 칼로리</div>
              </div>
            </div>
          </div>

          <!-- 메타 정보 -->
          <div class="meta-section">
            <p class="record-date">
              <span class="meta-label">기록 일시:</span>
              <span>{{ formatDate(record.lastModifyDate) }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onBeforeUnmount, watch } from 'vue';
import dayjs from 'dayjs';
// 기본 이미지 import
import defaultExerciseImage from '/assets/img/default_weight.png';

const props = defineProps({
  record: {
    type: Object,
    required: true
  },
  showModal: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

// 모달 상태 및 요소 참조
const modalRef = ref(null);
const localShowModal = ref(props.showModal);
const modalClosing = ref(false);
const scrollbarWidth = ref(0);
// 스크롤 위치를 저장할 변수 추가
const savedScrollY = ref(0);

// 이미지 URL 처리 함수 추가
const getImageUrl = (url) => {
  return url && url.trim() !== '' ? url : defaultExerciseImage;
};

// 이미지 오류 처리 함수 추가
const handleImageError = (event) => {
  event.target.src = defaultExerciseImage;
  event.target.onerror = null; // 오류 이벤트 재발생 방지
};

// 부모의 showModal 값이 변경될 때 로컬 상태도 업데이트
watch(() => props.showModal, (newValue) => {
  if (newValue) {
    modalClosing.value = false;
    localShowModal.value = true;
    setupModal();
  } else {
    // 부모가 모달을 닫으려고 할 때 즉시 닫지 않고 애니메이션 후 처리
    closeModal();
  }
});

// 스크롤바 너비 계산
const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

const lockScroll = () => {
  // 현재 스크롤 위치 저장
  savedScrollY.value = window.scrollY;

  // 스크롤바 너비 계산
  scrollbarWidth.value = getScrollbarWidth();

  // body에 overflow: hidden을 적용하여 스크롤 방지
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;
};

const unlockScroll = () => {
  // body에서 overflow: hidden 제거
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};

// 모달 설정 - 개선된 스크롤 처리
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
};

const formatExerciseType = (exerciseType) => {
  const types = {
    'CARDIO': '유산소',
    'WEIGHT': '무산소',
    'YOGA': '요가',
    'SWIMMING': '수영'
  };
  return types[exerciseType] || exerciseType;
};

const getExerciseTypeClass = (exerciseType) => {
  return `exercise-type-${exerciseType.toLowerCase()}`;
};

const formatDate = (dateTimeStr) => {
  return dayjs(dateTimeStr).format('YYYY년 MM월 DD일 HH:mm');
};

// 모달이 열릴 때 초기화
onMounted(() => {
  if (localShowModal.value) {
    setupModal();
  }
});

// 컴포넌트 제거 시 원래 상태로 복원
onBeforeUnmount(() => {
  unlockScroll();
});

// 닫기 함수 - 애니메이션 포함 (순서 변경)
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

    // 애니메이션 완료 후 모달 닫기 및 스크롤 해제
    setTimeout(() => {
      unlockScroll(); // 스크롤 해제
      localShowModal.value = false;
      emit('close');
    }, 300);
  } else {
    unlockScroll();
    localShowModal.value = false;
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
  z-index: 2000;
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

.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 92%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  padding-bottom: 24px;
  display: flex;
  flex-direction: column;
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

/* 스크롤 가능한 내부 컨테이너 */
.modal-scrollable-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  /* 모던 브라우저를 위한 스크롤바 스타일링 */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent; /* Firefox */
}

/* Webkit 브라우저(Chrome, Safari 등)를 위한 스크롤바 스타일링 */
.modal-scrollable-content::-webkit-scrollbar {
  width: 6px;
}

.modal-scrollable-content::-webkit-scrollbar-track {
  background: transparent;
}

.modal-scrollable-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

/* 모달 헤더 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
  position: relative;
  border-bottom: 1px solid #efefef;
  margin-bottom: 16px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
  text-align: center;
}

.modal-close {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #555;
  padding: 0;
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: #000;
}

/* 운동 이미지 섹션 */
.exercise-image-container {
  padding: 0 24px 16px;
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.exercise-image {
  max-width: 100%;
  height: auto;
  max-height: 250px;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* 정보 섹션 */
.info-section {
  padding: 0 24px 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.exercise-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #333;
}

.exercise-type-container {
  display: flex;
  margin-bottom: 15px;
  gap: 10px;
  flex-wrap: wrap;
}

/* 운동 유형별 색상 */
.exercise-type {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 14px;
  display: inline-block;
}

.exercise-type-cardio {
  background-color: #ffebee; /* 밝은 레드 - 유산소 */
  color: #e53935; /* 표준 레드 */
}

.exercise-type-weight {
  background-color: #ede7f6; /* 밝은 퍼플 - 무산소 */
  color: #7b1fa2; /* 표준 퍼플 */
}

.exercise-type-yoga {
  background-color: #e8f5e9; /* 밝은 그린 - 요가 */
  color: #388e3c; /* 표준 그린 */
}

.exercise-type-swimming {
  background-color: #e3f2fd; /* 밝은 블루 - 수영 */
  color: #1976d2; /* 표준 블루 */
}

/* 완료 상태 뱃지 */
.completion-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 14px;
}

.completed {
  background-color: #e8f5e9;
  color: #4caf50;
}

.not-completed {
  background-color: #ffebee;
  color: #f44336;
}

/* 운동 통계 */
.exercise-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-top: 20px;
}

.stat-item {
  background-color: #f8f9fa;
  border-radius: 10px;
  padding: 15px;
  text-align: center;
}

.stat-icon {
  font-size: 24px;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

/* 메타 섹션 */
.meta-section {
  padding: 0 24px;
  color: #666;
  font-size: 14px;
}

.meta-label {
  font-weight: 600;
  margin-right: 5px;
}

.record-date {
  margin: 0;
}

/* 반응형 디자인 */
@media (max-width: 600px) {
  .exercise-stats {
    grid-template-columns: 1fr;
  }
}
</style>