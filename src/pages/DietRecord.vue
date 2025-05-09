<template>
  <div class="diet-record">
    <h2>🥗 식단 기록</h2>
    <div>
      <input v-model="form.menu" placeholder="메뉴" />
      <input v-model="form.calories" type="number" placeholder="칼로리" />
      <button @click="addDiet">추가</button>
    </div>

    <ul>
      <li v-for="record in records" :key="record.id">
        {{ record.dietMenu }} - {{ record.calories }} kcal ({{ record.mealType }})
        <button @click="editDiet(record)">수정</button>
        <button @click="deleteDiet(record.id)">삭제</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const records = ref([]);
const form = ref({ menu: '', calories: 0 });

const fetchDiet = async () => {
  const { data } = await axios.get('/api/records/diet');
  records.value = data;
};

const addDiet = async () => {
  await axios.post('/api/records/diet', form.value);
  form.value = { menu: '', calories: 0 };
  await fetchDiet();
};

const deleteDiet = async (id) => {
  await axios.delete(`/api/records/diet/${id}`);
  await fetchDiet();
};

const editDiet = async (record) => {
  const menu = prompt('수정할 메뉴', record.dietMenu);
  const calories = prompt('수정할 칼로리', record.calories);
  if (menu && calories) {
    await axios.put(`/api/records/diet/${record.id}`, { ...record, dietMenu: menu, calories });
    await fetchDiet();
  }
};

onMounted(fetchDiet);
</script>
