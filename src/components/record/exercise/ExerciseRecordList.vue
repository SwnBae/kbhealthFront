<script setup>
import { defineProps, defineEmits, onMounted } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

defineProps({
  records: {
    type: Array,
    required: true
  }
});

// toggle-completion 이벤트가 record 객체 전체를 전달하도록 변경
defineEmits(['edit', 'delete', 'toggle-completion', 'show-detail']);

// 날짜 포맷 유틸리티
const isToday = (dateStr) => {
  const today = new Date();
  const targetDate = new Date(dateStr);
  return today.toDateString() === targetDate.toDateString();
};

const formatDate = (dateTimeStr) => {
  return dayjs(dateTimeStr).fromNow(); // 상대적 시간 표시 (예: "3시간 전")
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

onMounted(() => {
  // Mount시 애니메이션 설정
  console.log('ExerciseRecordList 컴포넌트 마운트됨');
});
</script>

<template>
  <div class="exercise-records-container">
    <div
        v-for="record in records"
        :key="record.id"
        class="exercise-record-card animate-on-scroll"
        :class="record.exercised ? 'completed' : 'not-completed'"
        @click="$emit('show-detail', record)"
    >
      <div class="exercise-info">
        <div class="exercise-name">{{ record.exerciseName }}</div>
        <div class="exercise-details">
          <span class="exercise-type" :class="getExerciseTypeClass(record.exerciseType)">{{ formatExerciseType(record.exerciseType) }}</span>
          <span class="exercise-duration">{{ record.durationMinutes }}분</span>
          <span class="record-date">{{ formatDate(record.lastModifyDate) }}</span>
        </div>
      </div>

      <div class="record-completion">
        <input
            type="checkbox"
            :checked="record.exercised"
            @change="$emit('toggle-completion', record)"
            @click.stop
            :disabled="!isToday(record.lastModifyDate)"
            class="completion-checkbox"
        />
        <span class="completion-label">{{ record.exercised ? '완료' : '미완료' }}</span>
      </div>

      <!-- 오늘일 경우에만 수정/삭제 버튼 표시 -->
      <div class="record-actions" v-if="isToday(record.lastModifyDate)">
        <button class="edit-btn" @click.stop="$emit('edit', record)">수정</button>
        <button class="delete-btn" @click.stop="$emit('delete', record.id)">삭제</button>
      </div>
    </div>

    <div v-if="records.length === 0" class="no-records animate-on-scroll">
      <p>기록된 운동이 없습니다.</p>
    </div>
  </div>
</template>

<style scoped>
/* 기록 컨테이너 */
.exercise-records-container {
  margin-top: 20px;
}

/* 기록 카드 스타일 */
.exercise-record-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
  cursor: pointer;
  position: relative;
}

.exercise-record-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.exercise-record-card.completed {
  border-left: 4px solid #2196F3;
}

.exercise-record-card.completed:hover {
  box-shadow: 0 10px 20px rgba(33, 150, 243, 0.15); /* 파란색 그림자 */
}

.exercise-record-card.not-completed {
  border-left: 4px solid #ff6b6b;
}

.exercise-record-card.not-completed:hover {
  box-shadow: 0 10px 20px rgba(255, 107, 107, 0.15); /* 빨간색 그림자 */
}

.exercise-info {
  flex-grow: 1;
}

.exercise-name {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 6px;
  color: #333;
}

.exercise-details {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 0.9rem;
  gap: 10px;
}

/* 운동 유형별 색상 */
.exercise-type {
  padding: 4px 10px;
  border-radius: 12px;
  margin-right: 10px;
  font-weight: 500;
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

.exercise-duration {
  color: #666;
}

.record-date {
  color: #999;
  font-size: 0.85rem;
}

.record-completion {
  display: flex;
  align-items: center;
  margin: 0 15px;
}

.completion-checkbox {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  cursor: pointer;
}

.completion-label {
  font-size: 0.9rem;
  color: #666;
}

.record-actions {
  display: flex;
  gap: 8px;
  z-index: 1; /* 버튼이 카드 클릭 이벤트 위에 오도록 함 */
}

.edit-btn, .delete-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease-out;
  font-size: 0.9rem;
}

.edit-btn {
  background-color: #eceef8;
  color: #3f51b5;
}

.delete-btn {
  background-color: #fff0f0;
  color: #ff6b6b;
}

.edit-btn:hover {
  background-color: #dfe1f2;
  transform: translateY(-2px);
}

.delete-btn:hover {
  background-color: #ffe0e0;
  transform: translateY(-2px);
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
  transform: translateY(20px);
  transition: all 0.5s ease-out;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 반응형 디자인 */
@media (max-width: 500px) {
  .exercise-record-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .record-completion {
    margin: 10px 0;
  }

  .record-actions {
    margin-top: 10px;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>