<template>
  <div class="diet-record-wrapper">
    <h2 class="header">Diet Record</h2>

    <!-- 검색 옵션 -->
    <div class="search-options fade-in-animation">
      <input class="search-input" v-model="searchInput.startDate" type="date" />
      <input class="search-input" v-model="searchInput.endDate" type="date" />
      <input class="search-input" v-model="searchInput.menuKeyword" placeholder="음식 이름" @keyup.enter="searchDietRecords" />
      <button class="search-button" @click="searchDietRecords">검색</button>
    </div>

    <!-- 기록 추가 버튼 -->
    <div class="add-record-btn-container fade-in-animation">
      <button class="add-record-btn" @click="showAddDietRecordForm = true">기록 추가</button>
    </div>

    <!-- 기록 목록 -->
    <div class="diet-records-container">
      <div v-for="record in displayedRecords" :key="record.id" class="diet-record-card animate-on-scroll">
        <div class="diet-info">
          <div class="diet-menu">{{ record.dietMenu }}</div>
          <div class="diet-details">
            <span class="meal-type" :class="getMealTypeClass(record.mealType)">{{ formatMealType(record.mealType) }}</span>
            <span class="record-date">{{ formatDate(record.lastModifyDate) }}</span>
          </div>
        </div>

        <!-- 오늘일 경우에만 수정/삭제 버튼 표시 -->
        <div class="record-actions" v-if="isToday(record.lastModifyDate)">
          <button class="edit-btn" @click="editDietRecord(record)">수정</button>
          <button class="delete-btn" @click="deleteDietRecord(record.id)">삭제</button>
        </div>
      </div>

      <div v-if="displayedRecords.length === 0" class="no-records animate-on-scroll">
        <p>기록된 식단이 없습니다.</p>
      </div>
    </div>

    <!-- 기록 수정 모달 -->
    <transition name="fade-modal">
      <div v-if="showEditDietRecordForm" class="modal">
        <div class="modal-content">
          <span class="close" @click="showEditDietRecordForm = false">&times;</span>

          <h3 class="modal-header">식단 기록 수정</h3>

          <input class="file-input" type="file" @change="handleImageUpload" />

          <!-- 음식 검색 및 선택 -->
          <div class="search-container">
            <input class="search-input-diet" v-model="editDietSearchKeyword" placeholder="음식 이름 검색" @keyup.enter="searchDietsForEdit" />
            <button class="search-button-diet" @click="searchDietsForEdit">검색</button>
          </div>

          <!-- 검색 결과 리스트 -->
          <transition name="fade">
            <ul v-if="diets.length > 0" class="search-result-list">
              <transition-group name="fade-list" tag="div">
                <li
                    v-for="diet in diets"
                    :key="diet.id"
                    class="search-result-item"
                    @click="selectDietForEdit(diet)"
                >
                  {{ diet.menu }}
                </li>
              </transition-group>
            </ul>
          </transition>

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
    </transition>

    <!-- 기록 추가 모달 -->
    <transition name="fade-modal">
      <div v-if="showAddDietRecordForm" class="modal">
        <div class="modal-content">
          <span class="close" @click="showAddDietRecordForm = false">&times;</span>

          <h3 class="modal-header">식단 기록 추가</h3>
          <input class="file-input" type="file" @change="handleImageUpload" />

          <div class="search-container">
            <input class="search-input-diet" v-model="dietSearchKeyword" placeholder="음식 이름 검색" @keyup.enter="searchDiets" />
            <button class="search-button-diet" @click="searchDiets">검색</button>
          </div>

          <!-- 검색 결과 리스트 -->
          <transition name="fade">
            <ul v-if="diets.length > 0" class="search-result-list">
              <transition-group name="fade-list" tag="div">
                <li
                    v-for="diet in diets"
                    :key="diet.id"
                    class="search-result-item"
                    @click="selectDiet(diet)"
                >
                  {{ diet.menu }}
                </li>
              </transition-group>
            </ul>
          </transition>

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
    </transition>
  </div>
</template>

<script setup>
import {ref, onMounted, computed, nextTick} from 'vue';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Vue 데이터 및 함수
const records = ref([]);
const diets = ref([]);

const form = ref({
  dietId: '',
  amount: null,
  mealType: 'BREAKFAST',
});

// 입력용 검색 상태 (UI에 바인딩)
const searchInput = ref({
  menuKeyword: '',
  startDate: '',
  endDate: '',
});

// 실제 적용되는 검색 상태 (검색 버튼 클릭 시에만 업데이트)
const appliedSearch = ref({
  menuKeyword: '',
  startDate: '',
  endDate: '',
  isSearched: false // 검색 버튼이 클릭되었는지 여부
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

// 스크롤 애니메이션 관찰자 설정
const observeFeedAnimation = () => {
  const elements = document.querySelectorAll(".animate-on-scroll");
  const scrollObserver = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      }),
      {threshold: 0.1}
  );
  elements.forEach(el => scrollObserver.observe(el));

  // 페이드 인 애니메이션 요소에도 클래스 추가
  document.querySelectorAll(".fade-in-animation").forEach(el => {
    el.classList.add("fade-in-active");
  });
};

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
  await nextTick();
  observeFeedAnimation();
};

const searchDietRecords = async () => {
  // 검색 버튼 클릭 시 입력값을 적용된 검색 상태로 복사
  appliedSearch.value = {
    menuKeyword: searchInput.value.menuKeyword,
    startDate: searchInput.value.startDate,
    endDate: searchInput.value.endDate,
    isSearched: true
  };

  // API 호출을 통한 서버 검색 (기존 코드와 동일)
  const {data} = await axios.get('/api/records/diet/search', {
    params: {
      menuKeyword: searchInput.value.menuKeyword,
      startDate: searchInput.value.startDate,
      endDate: searchInput.value.endDate,
    },
  });
  records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
  await nextTick();
  observeFeedAnimation();
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

  // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
  if (appliedSearch.value.isSearched) {
    await searchDietRecords();
  }
};

const deleteDietRecord = async (id) => {
  const record = records.value.find(r => r.id === id);
  if (isToday(record.lastModifyDate)) {
    await axios.delete(`/api/records/diet/${id}`);
    await fetchDietRecords();

    // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
    if (appliedSearch.value.isSearched) {
      await searchDietRecords();
    }
  }
};

const editDietRecord = (record) => {
  dietRecordToEdit.value = {...record};
  editDietSearchKeyword.value = record.dietMenu;
  showEditDietRecordForm.value = true;
};

const updateDietRecord = async () => {
  const {dietId, amount, mealType, id} = dietRecordToEdit.value;
  await axios.put(`/api/records/diet/${id}`, {dietId, amount, mealType});
  showEditDietRecordForm.value = false;
  await fetchDietRecords();

  // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
  if (appliedSearch.value.isSearched) {
    await searchDietRecords();
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

const resetForm = () => {
  form.value = {
    dietId: '',
    amount: 0,
    mealType: 'BREAKFAST',
  };
  dietSearchKeyword.value = '';
};

const handleImageUpload = (event) => {
  // 이미지 업로드 로직
  console.log('이미지 업로드', event.target.files[0]);
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
    const matchesKeyword = !appliedSearch.value.menuKeyword ||
        record.dietMenu.includes(appliedSearch.value.menuKeyword);

    return isInRange && matchesKeyword;
  });
});

onMounted(() => {
  fetchDietRecords();
});
</script>

<style scoped>
/* 기본 스타일 */
.diet-record-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 애니메이션 공통 스타일 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 3s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 검색창과 추가 버튼용 페이드인 애니메이션 */
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
  border-color: #4caf50;
  background-color: #fff;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
  outline: none;
}

.search-button {
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.search-button:hover {
  background-color: #3d9440;
}

/* 기록 추가 버튼 스타일 */
.add-record-btn-container {
  margin: 20px 0;
  text-align: center;
}

.add-record-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1);
}

.add-record-btn:hover {
  background-color: #3d9440;
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

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
}

.diet-record-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
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

/* 검색 컨테이너 스타일 */
.search-container {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.search-input-diet {
  flex: 1;
  padding: 12px 15px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 14px;
}

.search-button-diet {
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0 15px;
  cursor: pointer;
}

.search-result-list {
  list-style-type: none;
  padding: 0;
  margin: 10px 0 15px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #fff;
}

.search-result-item {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.6s ease;
}

.search-result-item:hover {
  background-color: #f9f9f9;
}

.search-result-item:last-child {
  border-bottom: none;
}

/* 입력 필드 스타일 */
.select-menu, .input-number, .file-input {
  width: 100%;
  padding: 12px 15px;
  margin: 10px 0;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 14px;
  transition: border-color 0.6s ease;
}

.select-menu:focus, .input-number:focus {
  border-color: #4caf50;
  outline: none;
}

.submit-btn {
  width: 100%;
  background-color: #4caf50;
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
  background-color: #3d9440;
}

/* 애니메이션 */
.fade-modal-enter-active, .fade-modal-leave-active {
  transition: opacity 0.6s ease;
}

.fade-modal-enter-from, .fade-modal-leave-to {
  opacity: 0;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.6s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.fade-list-enter-active {
  transition: all 0.6s ease;
}

.fade-list-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-list-enter-to {
  opacity: 1;
  transform: translateY(0);
}
</style>