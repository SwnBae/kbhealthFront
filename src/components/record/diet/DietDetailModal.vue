<template>
  <teleport to="body">
    <div ref="modalRef" class="modal-overlay" @click.self="closeOverlay" :class="{'fadeIn': localShowModal, 'fadeOut': !localShowModal && modalClosing}">
      <div class="modal-content animate-on-scroll in-view" @click.stop :class="{'popIn': localShowModal, 'popOut': !localShowModal && modalClosing}">
        <!-- 모달 헤더 -->
        <div class="modal-header">
          <h1 class="header-title">식단 상세 정보</h1>
          <button class="modal-close" @click="closeModal">×</button>
        </div>

        <!-- 스크롤 가능한 내용물을 위한 새 컨테이너 -->
        <div class="modal-scrollable-content">
          <!-- 음식 이미지 및 기본 정보 (이미지 처리 로직 변경) -->
          <div class="food-info-container">
            <div class="food-image-container">
              <img 
                :src="getImageUrl(record.drImgUrl)" 
                alt="음식 이미지" 
                class="food-image"
                @error="handleImageError" 
              />
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
  </teleport>
</template>

<script setup>
import {ref, defineProps, defineEmits, onMounted, onBeforeUnmount, watch} from 'vue';
import dayjs from 'dayjs';
import axios from 'axios';
import NutritionSummary from './detail/NutritionSummary.vue';
// 기본 이미지 import
import defaultFoodImage from '/assets/img/default_food.png';

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
  return url && url.trim() !== '' ? url : defaultFoodImage;
};

// 이미지 오류 처리 함수 추가
const handleImageError = (event) => {
  event.target.src = defaultFoodImage;
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

// 스크롤바 너비 계산
const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

// 스크롤 잠금 함수 - 새로운 방식
const lockScroll = () => {
  // 현재 스크롤 위치 저장
  savedScrollY.value = window.scrollY;

  // 스크롤바 너비 계산
  scrollbarWidth.value = getScrollbarWidth();

  // body에 overflow: hidden을 적용하여 스크롤 방지
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;
};

// 스크롤 해제 함수 - 새로운 방식
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

  // 영양소 기준 데이터 가져오기
  fetchNutritionStandard();
};

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

// 닫기 함수 - 애니메이션 포함 (새로운 방식)
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

// 레코드가 변경될 때마다 데이터 갱신
watch(() => props.record, (newRecord) => {
  if (newRecord && newRecord.id) {
    // 필요한 경우 상세 정보 가져오기
    // fetchDetailedRecord(newRecord.id);
  }
}, {deep: true});
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