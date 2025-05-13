<template>
  <div class="exercise-record">
    <h2 class="header">Exercise Record</h2>

    <!-- 검색 옵션 -->
    <div class="search-options">
      <input v-model="search.startDate" type="date" />
      <input v-model="search.endDate" type="date" />
      <input v-model="search.exerciseKeyword" placeholder="운동 이름 검색" />
      <button @click="searchExerciseRecords">검색</button>
    </div>

    <!-- 기록 추가 버튼 -->
    <div class="add-button-wrapper">
      <button @click="showAddExerciseForm = true">기록 추가</button>
    </div>

    <!-- 기록 추가 모달 -->
    <div v-if="showAddExerciseForm" class="modal">
      <div class="modal-content">
        <span class="close" @click="showAddExerciseForm = false">&times;</span>
        <h3 class="modal-header">운동 기록 수정</h3>

        <input v-model="form.exerciseName" placeholder="운동 이름" />
        <input v-model.number="form.durationMinutes" type="number" placeholder="소요 시간(분)" min="0" />
        <input v-model.number="form.caloriesBurned" type="number" placeholder="소모 칼로리(kcal)" min="0" />

        <select v-model="form.exerciseType">
          <option disabled value="">운동 종류 선택</option>
          <option value="CARDIO">유산소</option>
          <option value="WEIGHT">무산소</option>
          <option value="YOGA">요가</option>
          <option value="SWIMMING">수영</option>
        </select>

        <button @click="addExerciseRecord">추가</button>
      </div>
    </div>

    <!-- 기록 수정 모달 -->
    <div v-if="showEditExerciseForm" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditExerciseForm = false">&times;</span>

        <h3 class="modal-header">운동 기록 수정</h3>

        <input v-model="editForm.exerciseName" placeholder="운동 이름" />
        <input v-model.number="editForm.durationMinutes" type="number" placeholder="소요 시간(분)" min="0" />
        <input v-model.number="editForm.caloriesBurned" type="number" placeholder="소모 칼로리(kcal)" min="0" />

        <select v-model="editForm.exerciseType">
          <option disabled value="">운동 종류 선택</option>
          <option value="CARDIO">유산소</option>
          <option value="WEIGHT">무산소</option>
          <option value="YOGA">요가</option>
          <option value="SWIMMING">수영</option>
        </select>

        <button @click="updateExerciseRecord">수정</button>
      </div>
    </div>

    <!-- 기록 목록 -->
    <ul>
      <li v-for="record in filteredRecords" :key="record.id" :class="getRecordClass(record)">
        <div class="record-left">
          <input
              type="checkbox"
              v-model="record.exercised"
              @change="toggleExerciseCompletion(record)"
              :disabled="!isToday(record.lastModifyDate)"
          />
          <div class="record-info">
            <div class="record-title">{{ record.exerciseName }}</div>
            <div class="record-details">
              <div class="detail-item">
                <label>시간</label>
                <span>{{ record.durationMinutes }}분</span>
              </div>
              <div class="detail-item">
                <label>종류</label>
                <span>{{ record.exerciseType }}</span>
              </div>
              <div class="detail-item">
                <label>날짜</label>
                <span>{{ formatDate(record.lastModifyDate) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="record-actions" v-if="isToday(record.lastModifyDate)">
          <button @click="openEditModal(record)">수정</button>
          <button @click="deleteExerciseRecord(record.id)">삭제</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const records = ref([]);
const showAddExerciseForm = ref(false);
const showEditExerciseForm = ref(false);

const form = ref({
  exerciseName: '',
  durationMinutes: 0,
  caloriesBurned: 0,
  exerciseType: '',
});

const editForm = ref({
  exerciseName: '',
  durationMinutes: 0,
  caloriesBurned: 0,
  exerciseType: '',
});

const search = ref({
  startDate: '',
  endDate: '',
  exerciseKeyword: '',
});

const fetchExerciseRecords = async () => {
  const { data } = await axios.get('/api/records/exercise');
  records.value = data;
};

const getRecordClass = (record) => {
  return record.exercised ? 'completed' : 'not-completed';  // 완료된 운동은 'completed', 완료되지 않으면 'not-completed'
};


const searchExerciseRecords = async () => {
  const { data } = await axios.get('/api/records/exercise/search', {
    params: {
      exerciseKeyword: search.value.exerciseKeyword,  // 운동 이름
      startDate: search.value.startDate,        // 시작 날짜
      endDate: search.value.endDate,            // 끝 날짜
    },
  });
  records.value = data;
};


const addExerciseRecord = async () => {
  await axios.post('/api/records/exercise', form.value);
  resetForm();
  showAddExerciseForm.value = false;
  await fetchExerciseRecords();
};

const updateExerciseRecord = async () => {
  await axios.put(`/api/records/exercise/${editForm.value.id}`, editForm.value);
  showEditExerciseForm.value = false;
  await fetchExerciseRecords();
};

const deleteExerciseRecord = async (id) => {
  const record = records.value.find(r => r.id === id);
  if (isToday(record.lastModifyDate)) {
    await axios.delete(`/api/records/exercise/${id}`);
    await fetchExerciseRecords();
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
    await fetchExerciseRecords(); // 업데이트 후 목록 새로고침
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
  return new Date(dateTimeStr).toLocaleDateString();
};

const resetForm = () => {
  form.value = {
    exerciseName: '',
    durationMinutes: 0,
    exerciseType: '',
  };
};

const filteredRecords = computed(() => {
  return records.value.filter(record => {
    const recordDate = new Date(record.lastModifyDate);
    const startDate = search.value.startDate ? new Date(search.value.startDate) : null;
    const endDate = search.value.endDate ? new Date(search.value.endDate) : null;

    const isInRange = (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate);
    const matchesKeyword = !search.value.exerciseKeyword || record.exerciseName.includes(search.value.exerciseKeyword);

    return isInRange && matchesKeyword;
  });
});


onMounted(() => {
  fetchExerciseRecords();
});
</script>

<style scoped>
.modal-header {
  font-size: 20px;
  font-weight: 600;
  text-align: center;  /* 가운데 정렬 */
  margin-bottom: 20px;  /* 아래쪽 여백 */
  color: #333;  /* 텍스트 색상 */
}


.record-info {
  display: flex;
  gap: 20px; /* 제목과 내용을 일정 간격으로 배치 */
  align-items: center; /* 세로 중앙 정렬 */
}

.record-title {
  font-weight: 700; /* 굵게 */
  font-size: 20px; /* 더 큰 글씨 */
  color: #222;
  flex-shrink: 0; /* 제목의 크기가 줄어들지 않도록 설정 */
}

.record-details {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #555;
  justify-content: center; /* 내용을 가로로 가운데 정렬 */
  flex-grow: 1; /* 내용이 남은 공간을 채우도록 설정 */
}

.detail-item {
  display: flex;
  flex-direction: column;
  justify-content: center; /* 세로로 가운데 정렬 */
}

.detail-item label {
  font-size: 11px;
  color: #888;
  margin-bottom: 2px;
  font-weight: 500;
  letter-spacing: 0.3px;
}


.header {
  font-size: 28px;
  font-weight: 600;
  color: #222;
  text-align: left;
  margin-bottom: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding-bottom: 8px;
  border-bottom: 1px solid #ccc;
}

.exercise-record {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f2f5;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.exercise-record h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
}

.search-options {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.search-options input,
.search-options button {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.search-options button {
  background-color: #eee;
  cursor: pointer;
  transition: background 0.2s;
}

.search-options button:hover {
  background-color: #ddd;
}

/* ✅ 기록 추가 버튼 중앙 정렬 */
.add-button-wrapper {
  text-align: center;
  margin-bottom: 20px;
}

.add-button-wrapper > button {
  padding: 8px 16px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background-color: #eee;
  cursor: pointer;
  transition: background 0.2s;
}

.add-button-wrapper > button:hover {
  background-color: #ddd;
}

ul {
  list-style: none;
  padding: 0;
  margin-top: 16px;
}

li {
  padding: 12px;
  border-bottom: 1px solid #fff; /* ✅ 구분선 흰색 */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

li.completed {
  background-color: #e0f3ff;
}
li.not-completed {
  background-color: #f8d7da; /* 빨간색 배경 */
}

/* 수정 / 삭제 버튼 */
li button {
  margin-left: 6px;
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background-color: #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
}

li button:hover {
  background-color: #e0e0e0;
}

/* ✅ 모달 스타일 + 애니메이션 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.3s ease-in-out;
  z-index: 100;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.3s ease-in-out; /* ✅ 추가 애니메이션 */
}

.modal-content input,
.modal-content select {
  width: 100%;
  margin-bottom: 12px;
  padding: 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.modal-content button {
  width: 100%;
  padding: 10px;
  background-color: #f0f0f0;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-content button:hover {
  background-color: #ddd;
}

.close {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 22px;
  cursor: pointer;
}

/* ✅ 애니메이션 정의 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>

