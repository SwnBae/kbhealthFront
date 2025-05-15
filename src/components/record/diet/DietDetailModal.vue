<template>
  <teleport to="body">
    <transition name="fade" appear>
      <div v-if="localShowModal" class="modal-overlay" @click="closeOverlay">
        <div class="modal-content" @click.stop>
          <!-- 모달 헤더 -->
          <div class="modal-header">
            <h1 class="header-title">식단 상세 정보</h1>
            <button class="modal-close" @click="closeModal">×</button>
          </div>

          <!-- 스크롤 가능한 내용물을 위한 새 컨테이너 -->
          <div class="modal-scrollable-content">
            <!-- 음식 이미지 및 기본 정보 -->
            <div class="food-info-container">
              <div class="food-image-container">
                <img :src="record.drImgUrl || '/images/default_food.png'" alt="음식 이미지" class="food-image" />
              </div>
              <div class="food-basic-info">
                <h2 class="food-name">{{ record.dietMenu }}</h2>
                <div class="meal-badge" :class="getMealTypeClass(record.mealType)">
                  {{ formatMealType(record.mealType) }}
                </div>
                <div class="food-amount">{{ record.amount }}g</div>
              </div>
            </div>

            <!-- 영양소 정보 (새로운 디자인) -->
            <div class="nutrition-section">
              <NutritionSummary
                  :diet-nutrition="record"
                  :standard-nutrition="nutritionStandard"
              />
            </div>

            <!-- 상세 정보 -->
            <div class="details-section">
              <h3 class="section-title">상세 정보</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">섭취량</span>
                  <span class="detail-value">{{ record.amount }}g</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">분류</span>
                  <span class="detail-value">{{ record.category || '미분류' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">식사 시간</span>
                  <span class="detail-value">{{ formatMealType(record.mealType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">섭취 날짜</span>
                  <span class="detail-value">{{ formatDate(record.lastModifyDate) }}</span>
                </div>
              </div>
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
import axios from 'axios';
import NutritionSummary from './detail/NutritionSummary.vue';

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

// 영양소 기준 데이터
const nutritionStandard = ref({
  calories: 2000,
  protein: 60,
  fat: 65,
  carbohydrates: 300,
  sugars: 25,
  fiber: 25,
  sodium: 2000
});

// 영양소 기준 데이터 가져오기
const fetchNutritionStandard = async () => {
  try {
    const {data} = await axios.get('/api/records/ns/current');
    nutritionStandard.value = data;
  } catch (err) {
    console.error('영양소 기준 정보 가져오기 실패:', err);
  }
};

// 포맷팅 유틸리티 함수
const formatMealType = (mealType) => {
  const types = {
    'BREAKFAST': '아침',
    'LUNCH': '점심',
    'DINNER': '저녁',
    'SNACK': '간식'
  };
  return types[mealType] || mealType;
};

const getMealTypeClass = (mealType) => {
  return `meal-type-${mealType.toLowerCase()}`;
};

const formatDate = (dateTimeStr) => {
  if (!dateTimeStr) return '정보 없음';
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
  fetchNutritionStandard();

  // 모달이 열릴 때 body 스크롤 방지
  if (localShowModal.value) {
    document.body.style.overflow = 'hidden';
  }
});

// 모달 표시 상태가 변경될 때 body 스크롤 제어
watch(() => localShowModal.value, (isVisible) => {
  document.body.style.overflow = isVisible ? 'hidden' : '';
});

// 레코드가 변경될 때마다 데이터 갱신
watch(() => props.record, (newRecord) => {
  if (newRecord && newRecord.id) {
    // 필요한 경우 상세 정보 가져오기
    // fetchDetailedRecord(newRecord.id);
  }
}, {deep: true});
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

/* 음식 정보 컨테이너 */
.food-info-container {
  padding: 0 24px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.food-image-container {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.food-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.food-basic-info {
  flex-grow: 1;
}

.food-name {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
}

.meal-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.food-amount {
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

/* 식사 유형별 색상 */
.meal-type-breakfast {
  background-color: #fff8e1;
  color: #f9a825;
}

.meal-type-lunch {
  background-color: #f1f8e9;
  color: #388e3c;
}

.meal-type-dinner {
  background-color: #e8eaf6;
  color: #283593;
}

.meal-type-snack {
  background-color: #fce4ec;
  color: #d81b60;
}

/* 섹션 스타일 */
.nutrition-section, .details-section {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

/* 상세 정보 그리드 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
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
  .food-info-container {
    flex-direction: column;
    align-items: flex-start;
  }

  .food-image-container {
    margin-right: 0;
    margin-bottom: 16px;
    width: 100%;
    height: auto;
    aspect-ratio: 16/9;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>