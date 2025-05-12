<template>
  <div class="diet-record">
    <h2>🥗 식단 기록</h2>

    <!-- 검색 옵션 -->
    <div class="search-options">
      <input v-model="search.menuKeyword" placeholder="음식 이름" />
      <input v-model="search.startDate" type="date" />
      <input v-model="search.endDate" type="date" />
      <button @click="searchDietRecords">검색</button>
    </div>

    <!-- 기록 추가 버튼 -->
    <div>
      <button @click="showAddDietRecordForm = true">기록 추가</button>
    </div>

    <!-- 기록 수정 모달 -->
    <div v-if="showEditDietRecordForm" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditDietRecordForm = false">&times;</span>

        <h3>식단 기록 수정</h3>

        <!-- 음식 검색 및 선택 -->
        <input v-model="editDietSearchKeyword" placeholder="음식 이름 검색" />
        <button @click="searchDietsForEdit">검색</button>

        <select v-model="dietRecordToEdit.dietId">
          <option v-for="diet in diets" :key="diet.id" :value="diet.id">
            {{ diet.menu }}
          </option>
        </select>

        <input v-model="dietRecordToEdit.amount" type="number" placeholder="먹은 양" min="0" />

        <select v-model="dietRecordToEdit.mealType">
          <option value="BREAKFAST">아침</option>
          <option value="LUNCH">점심</option>
          <option value="DINNER">저녁</option>
          <option value="SNACK">간식</option>
        </select>

        <button @click="updateDietRecord">수정</button>
      </div>
    </div>

    <!-- 기록 추가 모달 -->
    <div v-if="showAddDietRecordForm" class="modal">
      <div class="modal-content">
        <span class="close" @click="showAddDietRecordForm = false">&times;</span>

        <input v-model="dietSearchKeyword" placeholder="음식 이름 검색" />
        <button @click="searchDiets">검색</button>

        <select v-model="form.dietId">
          <option v-for="diet in diets" :key="diet.id" :value="diet.id">
            {{ diet.menu }}
          </option>
        </select>

        <input type="file" @change="handleImageUpload" />

        <input v-model="form.amount" type="number" placeholder="먹은 양" min="0" />

        <select v-model="form.mealType">
          <option value="BREAKFAST">아침</option>
          <option value="LUNCH">점심</option>
          <option value="DINNER">저녁</option>
          <option value="SNACK">간식</option>
        </select>

        <button @click="addDietRecord">추가</button>
      </div>
    </div>

    <!-- 기록 목록 -->
    <ul>
      <li v-for="record in filteredRecords" :key="record.id">
        {{ record.dietMenu }} ({{ record.mealType }}) - {{ formatDate(record.lastModifyDate) }}

        <!-- 오늘일 경우에만 수정/삭제 버튼 표시 -->
        <template v-if="isToday(record.lastModifyDate)">
          <button @click="editDietRecord(record)">수정</button>
          <button @click="deleteDietRecord(record.id)">삭제</button>
        </template>
      </li>
    </ul>

  </div>
</template>

<script setup>
import {ref, onMounted, computed} from 'vue';
import axios from 'axios';

const records = ref([]);
const diets = ref([]);

const form = ref({
  dietId: '',
  amount: 0,
  mealType: 'BREAKFAST',
});

const search = ref({
  menuKeyword: '',
  startDate: '',
  endDate: '',
});

const showAddDietRecordForm = ref(false);
const showEditDietRecordForm = ref(false);
const dietSearchKeyword = ref('');
const dietRecordToEdit = ref({
  id: '',
  dietId: '',
  amount: 0,
  mealType: 'BREAKFAST',
});
const editDietSearchKeyword = ref(''); // 수정용 검색 필드 추가

const searchDiets = async () => {
  const {data} = await axios.get('/api/items/search', {
    params: {menu: dietSearchKeyword.value},
  });
  diets.value = data;
};

const searchDietsForEdit = async () => {
  const {data} = await axios.get('/api/items/search', {
    params: {menu: editDietSearchKeyword.value}, // 수정용 키워드 사용
  });
  diets.value = data;
};

const fetchDietRecords = async () => {
  const {data} = await axios.get('/api/records/diet');
  records.value = data;
};

const searchDietRecords = async () => {
  const {data} = await axios.get('/api/records/diet/search', {
    params: {
      menuKeyword: search.value.menuKeyword,
      startDate: search.value.startDate,
      endDate: search.value.endDate,
    },
  });
  records.value = data;
};

const addDietRecord = async () => {
  const {dietId, amount, mealType} = form.value;
  await axios.post('/api/records/diet', {dietId, amount, mealType});
  resetForm();
  showAddDietRecordForm.value = false;
  await fetchDietRecords();
};

const deleteDietRecord = async (id) => {
  const record = records.value.find(r => r.id === id);
  if (isToday(record.lastModifyDate)) {
    await axios.delete(`/api/records/diet/${id}`);
    await fetchDietRecords();
  }
};

const editDietRecord = (record) => {
  dietRecordToEdit.value = { ...record }; // 기존 데이터를 수정용 폼에 채운다
  showEditDietRecordForm.value = true; // 수정 폼을 띄운다
};

const updateDietRecord = async () => {
  const {dietId, amount, mealType, id} = dietRecordToEdit.value;
  await axios.put(`/api/records/diet/${id}`, { dietId, amount, mealType });
  showEditDietRecordForm.value = false; // 수정 폼을 닫는다
  await fetchDietRecords(); // 기록 새로고침
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
    dietId: '',
    amount: 0,
    mealType: 'BREAKFAST',
  };
};

const filteredRecords = computed(() => {
  return records.value.filter(record => {
    const recordDate = new Date(record.lastModifyDate);
    const startDate = search.value.startDate ? new Date(search.value.startDate) : null;
    const endDate = search.value.endDate ? new Date(search.value.endDate) : null;

    const isInRange = (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate);
    const matchesKeyword = !search.value.menuKeyword || record.dietMenu.includes(search.value.menuKeyword);

    return isInRange && matchesKeyword;
  });
});

onMounted(() => {
  fetchDietRecords();
});
</script>

<style scoped>
.diet-record {
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
</style>
