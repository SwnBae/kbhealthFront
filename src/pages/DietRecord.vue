<template>
  <div class="diet-record">
    <h2 class="header">Diet Record</h2>

    <!-- 검색 옵션 -->
    <div class="search-options">
      <input class="search-input" v-model="search.startDate" type="date" />
      <input class="search-input" v-model="search.endDate" type="date" />
      <input class="search-input" v-model="search.menuKeyword" placeholder="음식 이름" />
      <button class="search-button" @click="searchDietRecords">검색</button>
    </div>

    <!-- 기록 추가 버튼 -->
    <div class="add-record-btn-container">
      <button class="add-record-btn" @click="showAddDietRecordForm = true">기록 추가</button>
    </div>

    <!-- 기록 수정 모달 -->
    <div v-if="showEditDietRecordForm" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditDietRecordForm = false">&times;</span>

        <h3 class="modal-header">식단 기록 수정</h3>

        <input class="file-input" type="file" @change="handleImageUpload" />
        <!-- 음식 검색 및 선택 -->
        <div class="search-container">
          <input class="search-input-diet" v-model="editDietSearchKeyword" placeholder="음식 이름 검색" />
          <button class="search-button-diet" @click="searchDietsForEdit">검색</button>
        </div>

        <!-- 검색 결과 리스트 -->
        <ul class="search-result-list">
          <li
              v-for="diet in diets"
              :key="diet.id"
              class="search-result-item"
              @click="selectDietForEdit(diet)"
          >
          {{ diet.menu }}
          </li>
        </ul>

        <input class="input-number" v-model="dietRecordToEdit.amount" type="number" placeholder="먹은 양" min="0" />

        <select class="select-menu" v-model="dietRecordToEdit.mealType">
          <option value="BREAKFAST">아침</option>
          <option value="LUNCH">점심</option>
          <option value="DINNER">저녁</option>
          <option value="SNACK">간식</option>
        </select>

        <button class="submit-btn" @click="updateDietRecord">수정</button>
      </div>
    </div>

    <!-- 기록 추가 모달 -->
    <div v-if="showAddDietRecordForm" class="modal">
      <div class="modal-content">
        <span class="close" @click="showAddDietRecordForm = false">&times;</span>

        <h3 class="modal-header">식단 기록 추가</h3>
        <input class="file-input" type="file" @change="handleImageUpload" />
        <div class="search-container">
          <input class="search-input-diet" v-model="dietSearchKeyword" placeholder="음식 이름 검색" />
          <button class="search-button-diet" @click="searchDiets">검색</button>
        </div>

        <!-- 검색 결과 리스트 -->
        <ul class="search-result-list">
          <li
              v-for="diet in diets"
              :key="diet.id"
              class="search-result-item"
              @click="selectDiet(diet)"
          >
            {{ diet.menu }}
          </li>
        </ul>

        <input class="input-number" v-model="form.amount" type="number" placeholder="먹은 양 (g, ml)" min="0" />

        <select class="select-menu" v-model="form.mealType">
          <option value="BREAKFAST">아침</option>
          <option value="LUNCH">점심</option>
          <option value="DINNER">저녁</option>
          <option value="SNACK">간식</option>
        </select>

        <button class="submit-btn" @click="addDietRecord">추가</button>
      </div>
    </div>

    <!-- 기록 목록 -->
    <ul class="diet-record-list">
      <li v-for="record in filteredRecords" :key="record.id" class="diet-record-item">
        <div class="diet-info">
          {{ record.dietMenu }} ({{ record.mealType }}) - {{ formatDate(record.lastModifyDate) }}
        </div>

        <!-- 오늘일 경우에만 수정/삭제 버튼 표시 -->
        <template v-if="isToday(record.lastModifyDate)">
          <button class="edit-btn" @click="editDietRecord(record)">수정</button>
          <button class="delete-btn" @click="deleteDietRecord(record.id)">삭제</button>
        </template>
      </li>
    </ul>

  </div>
</template>

<script setup>
import {ref, onMounted, computed} from 'vue';
import axios from 'axios';

// Vue 데이터 및 함수는 그대로 유지
const records = ref([]);
const diets = ref([]);

const form = ref({
  dietId: '',
  amount: null,
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
const editDietSearchKeyword = ref('');

const searchDiets = async () => {
  const {data} = await axios.get('/api/items/search', {
    params: {menu: dietSearchKeyword.value},
  });
  diets.value = data;
};

const searchDietsForEdit = async () => {
  const {data} = await axios.get('/api/items/search', {
    params: {menu: editDietSearchKeyword.value},
  });
  diets.value = data;
};

const selectDietForEdit = (diet) => {
  dietRecordToEdit.value.dietId = diet.id;
  editDietSearchKeyword.value = diet.menu; // 선택한 음식 이름을 검색 키워드로 설정
  diets.value = []; // 결과 목록을 닫음
};

const fetchDietRecords = async () => {
  const {data} = await axios.get('/api/records/diet');
  records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
};

const searchDietRecords = async () => {
  const {data} = await axios.get('/api/records/diet/search', {
    params: {
      menuKeyword: search.value.menuKeyword,
      startDate: search.value.startDate,
      endDate: search.value.endDate,
    },
  });
  records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
};

const selectDiet = (diet) => {
  form.value.dietId = diet.id;
  dietSearchKeyword.value = diet.menu;
  diets.value = []; // 결과 닫기
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
  dietRecordToEdit.value = { ...record };
  editDietSearchKeyword.value = record.dietMenu;
  showEditDietRecordForm.value = true;
};

const updateDietRecord = async () => {
  const {dietId, amount, mealType, id} = dietRecordToEdit.value;
  await axios.put(`/api/records/diet/${id}`, { dietId, amount, mealType });
  showEditDietRecordForm.value = false;
  await fetchDietRecords();
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
.modal-header {
  font-size: 20px;
  font-weight: 600;
  text-align: center;  /* 가운데 정렬 */
  margin-bottom: 20px;  /* 아래쪽 여백 */
  color: #333;  /* 텍스트 색상 */
}

.diet-record {
  max-width: 1200px; /* 가로 기준으로 확대 */
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f2f5;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header {
  font-size: 28px;
  font-weight: 600;
  color: #222; /* 차분한 딥 그레이 */
  text-align: left; /* 좌상단 정렬 */
  margin-bottom: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* 모던한 글씨체 유지 */
  padding-bottom: 8px; /* 줄과 텍스트 사이 간격 */
  border-bottom: 1px solid #ccc; /* 희미한 회색 줄 */
}

.search-options {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.search-options input, .search-options button {
  padding: 8px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-right: 10px;
  transition: background-color 0.3s ease;
}

.search-container {
  display: flex; /* 한 줄로 배치 */
  justify-content: space-between; /* 요소 간 간격을 자동으로 맞추기 */
  align-items: center; /* 세로로 가운데 정렬 */
  gap: 10px; /* 입력창과 버튼 사이에 간격 추가 */
}

.search-input {
  width: 180px;
  padding: 10px 15px;
  border-radius: 20px; /* 둥근 모서리 */
  border: 1px solid #ddd; /* 얇은 테두리 */
  background-color: #f7f7f7; /* 밝은 배경 */
  color: #333; /* 글자 색 */
  font-size: 14px; /* 글자 크기 */
  transition: all 0.3s ease; /* 애니메이션 추가 */
}

.search-input-diet {
  width: 370px;
  padding: 10px 15px;
  border-radius: 20px; /* 둥근 모서리 */
  border: 1px solid #ddd; /* 얇은 테두리 */
  background-color: #f7f7f7; /* 밝은 배경 */
  color: #333; /* 글자 색 */
  font-size: 14px; /* 글자 크기 */
  transition: all 0.3s ease; /* 애니메이션 추가 */
}

.search-input-diet:focus {
  border-color: #1877f2; /* 파란색 테두리 */
  background-color: #fff; /* 포커스 시 흰색 배경 */
  box-shadow: 0 0 5px rgba(24, 119, 242, 0.3); /* 파란색 그림자 */
  outline: none; /* 기본 포커스 윤곽선 제거 */
}


.search-options input:nth-child(3) {
  width: 300px;
}

.search-button {
  background-color: #808080; /* 회색으로 변경 */
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.search-button:hover {
  background-color: #505050; /* 진해지는 효과 */
}

.search-button-diet{
  background-color: #808080; /* 회색으로 변경 */
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 10px 15px; /* 패딩을 늘려서 버튼 크기 키우기 */
  font-size: 14px; /* 글자 크기 늘리기 */
  width: auto; /* 내용에 맞춰 자동으로 버튼 크기 조정 */
}

.search-button-diet:hover {
  background-color: #505050; /* 진해지는 효과 */
}

.add-record-btn-container {
  margin-top: 20px;
  text-align: center;
}

.add-record-btn {
  background-color: #808080; /* 회색 */
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
}

.add-record-btn:hover {
  background-color: #505050; /* 진해지는 효과 */
}

.diet-record-list {
  list-style-type: none;
  padding: 0;
  margin-top: 20px;
}

.diet-record-item {
  background-color: white;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diet-info {
  flex-grow: 1;
  color: #333;
}

.edit-btn, .delete-btn {
  background-color: #f0f2f5;
  border: 1px solid #ddd;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.edit-btn:hover, .delete-btn:hover {
  background-color: #ddd;
}

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
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  position: relative;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  cursor: pointer;
}

.select-menu, .input-number, .file-input {
  width: 100%;
  padding: 10px;
  margin: 8px 0;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.submit-btn {
  background-color: #808080; /* 회색 */
  color: white;
  border: none;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.submit-btn:hover {
  background-color: #505050; /* 진해지는 효과 */
}

.search-result-list {
  list-style-type: none;
  padding: 0;
  margin: 10px 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
}

.search-result-item {
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.search-result-item:hover {
  background-color: #f0f2f5;
}
</style>

