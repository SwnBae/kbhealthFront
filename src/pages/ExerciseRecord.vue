<template>
  <div class="exercise-record-wrapper">
    <h2 class="header">Exercise Record</h2>

    <!-- 검색 옵션 -->
    <div class="search-options fade-in-animation">
      <input class="search-input" v-model="searchInput.startDate" type="date" />
      <input class="search-input" v-model="searchInput.endDate" type="date" />
      <input class="search-input" v-model="searchInput.exerciseKeyword" placeholder="운동 이름" @keyup.enter="searchExerciseRecords" />
      <button class="search-button" @click="searchExerciseRecords">검색</button>
    </div>

    <!-- 기록 추가 버튼 -->
    <div class="add-record-btn-container fade-in-animation">
      <button class="add-record-btn" @click="showAddExerciseForm = true">기록 추가</button>
    </div>

    <!-- 기록 목록 -->
    <div class="exercise-records-container">
      <div v-for="record in displayedRecords" :key="record.id"
           class="exercise-record-card animate-on-scroll"
           :class="record.exercised ? 'completed' : 'not-completed'">
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
              v-model="record.exercised"
              @change="toggleExerciseCompletion(record)"
              :disabled="!isToday(record.lastModifyDate)"
              class="completion-checkbox"
          />
          <span class="completion-label">{{ record.exercised ? '완료' : '미완료' }}</span>
        </div>

        <!-- 오늘일 경우에만 수정/삭제 버튼 표시 -->
        <div class="record-actions" v-if="isToday(record.lastModifyDate)">
          <button class="edit-btn" @click="openEditModal(record)">수정</button>
          <button class="delete-btn" @click="deleteExerciseRecord(record.id)">삭제</button>
        </div>
      </div>

      <div v-if="displayedRecords.length === 0" class="no-records animate-on-scroll">
        <p>기록된 운동이 없습니다.</p>
      </div>
    </div>

    <!-- 기록 추가 모달 -->
    <transition name="fade-modal">
      <div v-if="showAddExerciseForm" class="modal">
        <div class="modal-content">
          <span class="close" @click="showAddExerciseForm = false">&times;</span>

          <h3 class="modal-header">운동 기록 추가</h3>

          <input class="input-text" v-model="form.exerciseName" placeholder="운동 이름" />
          <input class="input-number" v-model.number="form.durationMinutes" type="number" placeholder="소요 시간(분)" min="0" />
          <input class="input-number" v-model.number="form.caloriesBurned" type="number" placeholder="소모 칼로리(kcal)" min="0" />

          <select class="select-menu" v-model="form.exerciseType">
            <option disabled value="">운동 종류 선택</option>
            <option value="CARDIO">유산소</option>
            <option value="WEIGHT">무산소</option>
            <option value="YOGA">요가</option>
            <option value="SWIMMING">수영</option>
          </select>

          <button class="submit-btn" @click="addExerciseRecord">추가</button>
        </div>
      </div>
    </transition>

    <!-- 기록 수정 모달 -->
    <transition name="fade-modal">
      <div v-if="showEditExerciseForm" class="modal">
        <div class="modal-content">
          <span class="close" @click="showEditExerciseForm = false">&times;</span>

          <h3 class="modal-header">운동 기록 수정</h3>

          <input class="input-text" v-model="editForm.exerciseName" placeholder="운동 이름" />
          <input class="input-number" v-model.number="editForm.durationMinutes" type="number" placeholder="소요 시간(분)" min="0" />
          <input class="input-number" v-model.number="editForm.caloriesBurned" type="number" placeholder="소모 칼로리(kcal)" min="0" />

          <select class="select-menu" v-model="editForm.exerciseType">
            <option disabled value="">운동 종류 선택</option>
            <option value="CARDIO">유산소</option>
            <option value="WEIGHT">무산소</option>
            <option value="YOGA">요가</option>
            <option value="SWIMMING">수영</option>
          </select>

          <button class="submit-btn" @click="updateExerciseRecord">수정</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const records = ref([]);
const showAddExerciseForm = ref(false);
const showEditExerciseForm = ref(false);

const form = ref({
  exerciseName: '',
  durationMinutes: 0,
  caloriesBurned: 0,
  exerciseType: 'CARDIO',
});

const editForm = ref({
  id: '',
  exerciseName: '',
  durationMinutes: 0,
  caloriesBurned: 0,
  exerciseType: 'CARDIO',
});

// 입력용 검색 상태 (UI에 바인딩)
const searchInput = ref({
  exerciseKeyword: '',
  startDate: '',
  endDate: '',
});

// 실제 적용되는 검색 상태 (검색 버튼 클릭 시에만 업데이트)
const appliedSearch = ref({
  exerciseKeyword: '',
  startDate: '',
  endDate: '',
  isSearched: false // 검색 버튼이 클릭되었는지 여부
});

// 스크롤 애니메이션 관찰자 설정
const observeFeedAnimation = () => {
  const elements = document.querySelectorAll(".animate-on-scroll");
  const scrollObserver = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      }),
      { threshold: 0.1 }
  );
  elements.forEach(el => scrollObserver.observe(el));

  // 페이드 인 애니메이션 요소에도 클래스 추가
  document.querySelectorAll(".fade-in-animation").forEach(el => {
    el.classList.add("fade-in-active");
  });
};

const fetchExerciseRecords = async () => {
  const { data } = await axios.get('/api/records/exercise');
  records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
  await nextTick();
  observeFeedAnimation();
};

const searchExerciseRecords = async () => {
  // 검색 버튼 클릭 시 입력값을 적용된 검색 상태로 복사
  appliedSearch.value = {
    exerciseKeyword: searchInput.value.exerciseKeyword,
    startDate: searchInput.value.startDate,
    endDate: searchInput.value.endDate,
    isSearched: true
  };

  // API 호출을 통한 서버 검색
  const { data } = await axios.get('/api/records/exercise/search', {
    params: {
      exerciseKeyword: searchInput.value.exerciseKeyword,
      startDate: searchInput.value.startDate,
      endDate: searchInput.value.endDate,
    },
  });
  records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
  await nextTick();
  observeFeedAnimation();
};

const addExerciseRecord = async () => {
  await axios.post('/api/records/exercise', form.value);
  resetForm();
  showAddExerciseForm.value = false;
  await fetchExerciseRecords();

  // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
  if (appliedSearch.value.isSearched) {
    await searchExerciseRecords();
  }
};

const updateExerciseRecord = async () => {
  await axios.put(`/api/records/exercise/${editForm.value.id}`, editForm.value);
  showEditExerciseForm.value = false;
  await fetchExerciseRecords();

  // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
  if (appliedSearch.value.isSearched) {
    await searchExerciseRecords();
  }
};

const deleteExerciseRecord = async (id) => {
  const record = records.value.find(r => r.id === id);
  if (isToday(record.lastModifyDate)) {
    await axios.delete(`/api/records/exercise/${id}`);
    await fetchExerciseRecords();

    // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
    if (appliedSearch.value.isSearched) {
      await searchExerciseRecords();
    }
  }
};

const openEditModal = (record) => {
  editForm.value = { ...record };
  showEditExerciseForm.value = true;
};

const toggleExerciseCompletion = async (record) => {
  try {
    if (record.exercised) {
      await axios.put(`/api/records/exercise/${record.id}/complete`);
    } else {
      await axios.put(`/api/records/exercise/${record.id}/uncomplete`);
    }
    await fetchExerciseRecords();

    // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
    if (appliedSearch.value.isSearched) {
      await searchExerciseRecords();
    }
  } catch (e) {
    console.error(e);
  }
};

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

const resetForm = () => {
  form.value = {
    exerciseName: '',
    durationMinutes: 0,
    caloriesBurned: 0,
    exerciseType: 'CARDIO',
  };
};

// 표시할 레코드 계산 (검색 버튼 클릭 시에만 필터링)
const displayedRecords = computed(() => {
  // 검색이 적용되지 않았으면 모든 기록 표시
  if (!appliedSearch.value.isSearched) {
    return records.value;
  }

  // 검색이 적용된 경우 필터링
  return records.value.filter(record => {
    const recordDate = new Date(record.lastModifyDate);
    const startDate = appliedSearch.value.startDate ? new Date(appliedSearch.value.startDate) : null;
    const endDate = appliedSearch.value.endDate ? new Date(appliedSearch.value.endDate) : null;

    const isInRange = (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate);
    const matchesKeyword = !appliedSearch.value.exerciseKeyword ||
        record.exerciseName.includes(appliedSearch.value.exerciseKeyword);

    return isInRange && matchesKeyword;
  });
});

onMounted(() => {
  fetchExerciseRecords();
});
</script>

<style scoped>
/* 기본 스타일 */
.exercise-record-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 애니메이션 공통 스타일 - 수정됨: 기록은 3초 딜레이로 표시 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 3s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 검색창과 추가 버튼용 페이드인 애니메이션 - 수정됨: 2초 딜레이로 표시 */
.fade-in-animation {
  opacity: 0;
  transition: opacity 2s ease;
}

.fade-in-animation.fade-in-active {
  opacity: 1;
}

/* 헤더 스타일 */
.header {
  font-size: 28px;
  font-weight: bold;
  color: #222;
  text-align: left;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
}

/* 검색 옵션 스타일 */
.search-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  padding: 10px 15px;
  border-radius: 20px;
  border: 1px solid #e6e6e6;
  background-color: #f9f9f9;
  color: #333;
  font-size: 14px;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 120px;
}

.search-input:focus {
  border-color: #3f51b5;
  background-color: #fff;
  box-shadow: 0 0 5px rgba(63, 81, 181, 0.3);
  outline: none;
}

.search-button {
  background-color: #3f51b5;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.search-button:hover {
  background-color: #303f9f;
}

/* 기록 추가 버튼 스타일 */
.add-record-btn-container {
  margin: 20px 0;
  text-align: center;
}

.add-record-btn {
  background-color: #3f51b5;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 3px 5px rgba(0,0,0,0.1);
}

.add-record-btn:hover {
  background-color: #303f9f;
  box-shadow: 0 5px 10px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

/* 기록 카드 스타일 */
.exercise-records-container {
  margin-top: 20px;
}

.exercise-record-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-bottom: 16px;
  overflow: hidden;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.6s ease, box-shadow 0.6s ease;
}

.exercise-record-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}

.exercise-record-card.completed {
  border-left: 4px solid #2196F3;
}

.exercise-record-card.not-completed {
  border-left: 4px solid #ff6b6b;
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

/* 운동 유형별 색상 - 수정됨: 더 대중적인 색상으로 변경 */
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
  background-color: #ede7f6; /* 밝은 퍼플 - 수영 */
  color: #7b1fa2; /* 표준 퍼플 */

}

.exercise-type-yoga {
  background-color: #e8f5e9; /* 밝은 그린 - 무산소 */
  color: #388e3c; /* 표준 그린 */
}

.exercise-type-swimming {
  background-color: #e3f2fd; /* 밝은 블루 - 요가 */
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
}

.edit-btn, .delete-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.6s ease;
  font-size: 0.9rem;
}

.edit-btn {
  background-color: #f0f7f0;
  color: #3f51b5;
}

.delete-btn {
  background-color: #fff0f0;
  color: #ff6b6b;
}

.edit-btn:hover {
  background-color: #e0f2e0;
}

.delete-btn:hover {
  background-color: #ffe0e0;
}

.no-records {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 1.1rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

/* 모달 스타일 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.modal-header {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.close {
  position: absolute;
  top: 15px;
  right: 20px;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  transition: color 0.6s ease;
}

.close:hover {
  color: #333;
}

/* 입력 필드 스타일 */
.select-menu, .input-number, .input-text {
  width: 100%;
  padding: 12px 15px;
  margin: 10px 0;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 14px;
  transition: border-color 0.6s ease;
}

.select-menu:focus, .input-number:focus, .input-text:focus {
  border-color: #3f51b5;
  outline: none;
}

.submit-btn {
  width: 100%;
  background-color: #3f51b5;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 15px;
  transition: background-color 0.6s ease;
}

.submit-btn:hover {
  background-color: #303f9f;
}

/* 애니메이션 */
.fade-modal-enter-active, .fade-modal-leave-active {
  transition: opacity 0.6s ease;
}
.fade-modal-enter-from, .fade-modal-leave-to {
  opacity: 0;
}
</style>