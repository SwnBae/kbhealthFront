<template>
  <teleport to="body">
    <transition name="fade" appear>
      <div v-if="localShowModal" class="modal-overlay" @click="closeOverlay">
        <div class="modal-content" @click.stop>
          <!-- 모달 헤더 -->
          <div class="modal-header">
            <h1 class="header-title">운동 상세 정보</h1>
            <button class="modal-close" @click="closeModal">×</button>
          </div>

          <!-- 스크롤 가능한 내용물을 위한 새 컨테이너 -->
          <div class="modal-scrollable-content">
            <!-- 운동 이미지 섹션 -->
            <div class="exercise-image-container">
              <img :src="record.erImgUrl || '/images/default_exercise.png'" alt="운동 이미지" class="exercise-image" />
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
    </transition>
  </teleport>
</template>

<script setup>
import {ref, defineProps, defineEmits, onMounted, watch} from 'vue';
import dayjs from 'dayjs';

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

// 닫기 애니메이션 시작 함수
const startCloseAnimation = () => {
  localShowModal.value = false;
  // CSS 애니메이션 시간에 맞춰 지연 후 부모에게 실제 닫힘 알림
  setTimeout(() => {
    emit('close');
  }, 300); // fade 애니메이션 시간(0.3s)과 일치시킴
};

// 모달 닫기
const closeModal = () => {
  startCloseAnimation();
};

// 오버레이 클릭 시 모달 닫기
const closeOverlay = () => {
  startCloseAnimation();
};

// 컴포넌트 마운트 시 실행
onMounted(() => {
  // 모달이 열릴 때 body 스크롤 방지
  if (localShowModal.value) {
    document.body.style.overflow = 'hidden';
  }
});

// 모달 표시 상태가 변경될 때 body 스크롤 제어
watch(() => localShowModal.value, (isVisible) => {
  document.body.style.overflow = isVisible ? 'hidden' : '';
});
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
  z-index: 2000;
  backdrop-filter: blur(3px);
  overflow: hidden; /* 바깥 영역 스크롤 방지 */
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 92%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden; /* 중요: overflow-y: auto 대신 overflow: hidden 사용 */
  padding-bottom: 24px;
  display: flex;
  flex-direction: column;
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

/* 트랜지션 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 일관된 모달 클래스 */
.modal-standard {
  animation: modal-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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

/* 반응형 디자인 */
@media (max-width: 600px) {
  .exercise-stats {
    grid-template-columns: 1fr;
  }
}
</style>