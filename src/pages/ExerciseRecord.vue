<template>
  <div class="exercise-record">
    <h2>🏋️ 운동 기록</h2>
    <div>
      <input v-model="form.exerciseName" placeholder="운동 이름" />
      <input v-model="form.durationMinutes" type="number" placeholder="소요 시간(분)" />
      <input v-model="form.caloriesBurned" type="number" placeholder="소모 칼로리" />
      <input v-model="form.exerciseType" placeholder="운동 종류" />
      <button @click="addExercise">추가</button>
    </div>

    <ul>
      <li v-for="record in records" :key="record.id">
        {{ record.exerciseName }} - {{ record.durationMinutes }}분 / {{ record.caloriesBurned }}kcal
        - {{ record.exerciseType }}
        <button @click="editExercise(record)">수정</button>
        <button @click="deleteExercise(record.id)">삭제</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const records = ref([]);
const form = ref({
  exerciseName: '',
  durationMinutes: 0,
  caloriesBurned: 0,
  exerciseType: '',
});

const fetchExercise = async () => {
  const { data } = await axios.get('/api/records/exercise');
  records.value = data;
};

const addExercise = async () => {
  await axios.post('/api/records/exercise', form.value);
  form.value = { exerciseName: '', durationMinutes: 0, caloriesBurned: 0, exerciseType: '' };
  await fetchExercise();
};

const deleteExercise = async (id) => {
  await axios.delete(`/api/records/exercise/${id}`);
  await fetchExercise();
};

const editExercise = async (record) => {
  const exerciseName = prompt('수정할 운동 이름', record.exerciseName);
  const durationMinutes = prompt('수정할 시간(분)', record.durationMinutes);
  const caloriesBurned = prompt('수정할 칼로리', record.caloriesBurned);
  const exerciseType = prompt('수정할 운동 종류', record.exerciseType);
  if (exerciseName && durationMinutes && caloriesBurned && exerciseType) {
    await axios.put(`/api/records/exercise/${record.id}`, {
      ...record,
      exerciseName,
      durationMinutes,
      caloriesBurned,
      exerciseType,
    });
    await fetchExercise();
  }
};

onMounted(fetchExercise);
</script>
