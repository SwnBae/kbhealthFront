<template>
  <div class="exercise-record">
    <h2>🏋️ 운동 기록</h2>

    <!-- 검색 옵션 -->
    <div class="search-options">
      <input v-model="search.startDate" type="date" />
      <input v-model="search.endDate" type="date" />
      <button @click="searchExerciseRecords">검색</button>
    </div>

    <!-- 기록 추가 버튼 -->
    <div>
      <button @click="showAddExerciseForm = true">기록 추가</button>
    </div>

    <!-- 기록 추가 모달 -->
    <div v-if="showAddExerciseForm" class="modal">
      <div class="modal-content">
        <span class="close" @click="showAddExerciseForm = false">&times;</span>

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
      <li v-for="record in filteredRecords" :key="record.id" :class="{'completed': record.exercised}">
        <input
            type="checkbox"
            v-model="record.exercised"
            @change="toggleExerciseCompletion(record)"
            :disabled="!isToday(record.lastModifyDate)"
        />
        <strong>{{ record.exerciseName }}</strong>
        - {{ record.durationMinutes }}분
        - {{ record.exerciseType }}
        - {{ formatDate(record.lastModifyDate) }}
        <span>{{ record.exercised ? '✅' : '❌' }}</span> <!-- 상태 표시 -->
        <button v-if="isToday(record.lastModifyDate)" @click="openEditModal(record)">수정</button>
        <button v-if="isToday(record.lastModifyDate)" @click="deleteExerciseRecord(record.id)">삭제</button>
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
});

const fetchExerciseRecords = async () => {
  const { data } = await axios.get('/api/records/exercise');
  records.value = data;
};

const searchExerciseRecords = async () => {
  const { data } = await axios.get('/api/records/exercise/search', {
    params: {
      startDate: search.value.startDate,
      endDate: search.value.endDate,
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

    return (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate);
  });
});

onMounted(() => {
  fetchExerciseRecords();
});
</script>

<style scoped>
.exercise-record {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.search-options input {
  margin-right: 10px;
}

ul {
  list-style-type: none;
  padding: 0;
}

button:disabled {
  background-color: grey;
  cursor: not-allowed;
}

/* 모달 스타일 */
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
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  cursor: pointer;
}

/* 완료된 항목 스타일 */
.completed {
  background-color: lightblue;
  text-decoration: line-through;
}
</style>
