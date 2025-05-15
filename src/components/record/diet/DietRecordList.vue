<template>
  <div class="diet-records-container">
    <div
        v-for="record in records"
        :key="record.id"
        class="diet-record-card animate-on-scroll"
        @click="showRecordDetail(record)"
    >
      <div class="diet-info">
        <div class="diet-menu">{{ record.dietMenu }}</div>
        <div class="diet-details">
          <span class="meal-type" :class="getMealTypeClass(record.mealType)">{{ formatMealType(record.mealType) }}</span>
          <span class="record-date">{{ formatDate(record.lastModifyDate) }}</span>
        </div>
      </div>

      <!-- 오늘일 경우에만 수정/삭제 버튼 표시 -->
      <div class="record-actions" v-if="isToday(record.lastModifyDate)">
        <button class="edit-btn" @click.stop="$emit('edit', record)">수정</button>
        <button class="delete-btn" @click.stop="$emit('delete', record.id)">삭제</button>
      </div>
    </div>

    <div v-if="records.length === 0" class="no-records animate-on-scroll">
      <p>기록된 식단이 없습니다.</p>
    </div>

    <!-- 식단 상세 정보 모달 -->
    <DietDetailModal
        v-if="selectedRecord"
        :record="selectedRecord"
        :showModal="showDetailModal"
        @close="closeDetailModal"
    />
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import DietDetailModal from './DietDetailModal.vue';

dayjs.extend(relativeTime);

defineProps({
  records: {
    type: Array,
    required: true
  }
});

defineEmits(['edit', 'delete']);

// 선택한 기록과 모달 상태 관리
const selectedRecord = ref(null);
const showDetailModal = ref(false);

// 식단 기록 상세 정보 표시
const showRecordDetail = (record) => {
  selectedRecord.value = record;
  showDetailModal.value = true;
};

// 상세 정보 모달 닫기
const closeDetailModal = () => {
  showDetailModal.value = false;
  // 모달이 닫힌 후 선택된 기록 초기화 (애니메이션을 위해 지연)
  setTimeout(() => {
    selectedRecord.value = null;
  }, 300);
};

const isToday = (dateStr) => {
  const today = new Date();
  const targetDate = new Date(dateStr);
  return today.toDateString() === targetDate.toDateString();
};

const formatDate = (dateTimeStr) => {
  return dayjs(dateTimeStr).fromNow(); // 상대적 시간 표시 (예: "3시간 전")
};

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
</script>

<style scoped>
/* 기록 카드 스타일 */
.diet-records-container {
  margin-top: 20px;
}

.diet-record-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.6s ease, box-shadow 0.6s ease;
  cursor: pointer; /* 클릭 가능함을 표시 */
}

.diet-record-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  background-color: #f9f9f9;
}

.diet-info {
  flex-grow: 1;
}

.diet-menu {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 6px;
  color: #333;
}

.diet-details {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 0.9rem;
}

/* 식사 유형별 색상 */
.meal-type {
  padding: 4px 10px;
  border-radius: 12px;
  margin-right: 10px;
  font-weight: 500;
}

.meal-type-breakfast {
  background-color: #fff8e1; /* 부드러운 크림 옐로우 */
  color: #f9a825; /* 따뜻한 머스터드 */
}

.meal-type-lunch {
  background-color: #f1f8e9; /* 연한 민트/그린톤 */
  color: #388e3c; /* 균형 잡힌 포레스트 그린 */
}

.meal-type-dinner {
  background-color: #e8eaf6; /* 연한 네이비 톤 배경 (인디고 계열) */
  color: #283593; /* 깊은 인디고 / 네이비 텍스트 */
}

.meal-type-snack {
  background-color: #fce4ec; /* 연한 코튼 핑크 */
  color: #d81b60; /* 딸기빛 진한 핑크 */
}

.record-date {
  color: #999;
  font-size: 0.85rem;
}

.record-actions {
  display: flex;
  gap: 8px;
}

.edit-btn, .delete-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.6s ease;
  font-size: 0.9rem;
  z-index: 1; /* 버튼이 카드 클릭 이벤트 위에 오도록 함 */
}

.edit-btn {
  background-color: #f0f7f0;
  color: #4caf50;
}

.delete-btn {
  background-color: #fff0f0;
  color: #ff6b6b;
}

.edit-btn:hover {
  background-color: #e0f2e0;
  transform: scale(1.05);
}

.delete-btn:hover {
  background-color: #ffe0e0;
  transform: scale(1.05);
}

.no-records {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 1.1rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* 애니메이션 공통 스타일 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 2s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 반응형 디자인 */
@media (max-width: 500px) {
  .diet-record-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .record-actions {
    margin-top: 10px;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>