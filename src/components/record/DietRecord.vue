<template>
  <div class="diet-record-wrapper">
    <!-- 검색 옵션 -->
    <SearchBar
        :searchInput="searchInput"
        @search="searchDietRecords"
    />

    <!-- 기록 목록 -->
    <DietRecordList
        :records="displayedRecords"
        @edit="editDietRecord"
        @delete="deleteDietRecord"
    />

    <!-- 기록 추가 모달 -->
    <AddDietRecordModal
        v-if="showAddDietRecordModal"
        @close="showAddDietRecordModal = false"
        @added="onRecordAdded"
    />

    <!-- 기록 수정 모달 -->
    <EditDietRecordModal
        v-if="showEditDietRecordModal"
        :recordToEdit="dietRecordToEdit"
        @close="showEditDietRecordModal = false"
        @updated="onRecordUpdated"
    />

    <!-- 데이터 로딩 오버레이 - 식단 기록 로딩 추가 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>식단 기록 로딩 중...</span>
    </div>

    <!-- 영양소 정보 로딩 -->
    <div v-if="isNutritionLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>영양소 정보 로딩 중...</span>
    </div>

    <!-- 플로팅 기록 추가 버튼 -->
    <button ref="floatingBtn" class="create-record-floating-btn" @click="showAddDietRecordModal = true">
      <span class="plus-icon">+</span>
      <span class="btn-text">기록 추가</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import axios from 'axios';
import DietRecordList from './diet/DietRecordList.vue';
import SearchBar from './diet/SearchBar.vue';
import AddDietRecordModal from './diet/AddDietRecordModal.vue';
import EditDietRecordModal from './diet/EditDietRecordModal.vue';

// Vue 데이터 및 함수
const records = ref([]);
const showAddDietRecordModal = ref(false);
const showEditDietRecordModal = ref(false);
const dietRecordToEdit = ref({
  id: '',
  dietId: '',
  amount: 0,
  mealType: 'BREAKFAST',
  drImgUrl: null,
  dietMenu: ''
});
const floatingBtn = ref(null); // 플로팅 버튼 ref 추가
const isNutritionLoading = ref(false); // 영양소 정보 로딩 상태
const isLoading = ref(false); // 식단 기록 로딩 상태 추가

// 영양소 기준 데이터
const nutritionStandard = ref({
  calories: 2000,
  protein: 60,
  fat: 65,
  carbohydrates: 300,
  sugars: 25,
  fiber: 25,
  sodium: 2000
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

// 스크롤 애니메이션 관찰자 설정
const observeFeedAnimation = () => {
  const elements = document.querySelectorAll(".animate-on-scroll");
  const scrollObserver = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          // 관찰 중단 - 한 번 보여진 후에는 계속 표시
          scrollObserver.unobserve(entry.target);
        }
      }),
      {threshold: 0.1}
  );
  elements.forEach(el => scrollObserver.observe(el));

  // 페이드 인 애니메이션 요소에도 클래스 추가
  document.querySelectorAll(".fade-in-animation").forEach(el => {
    el.classList.add("fade-in-active");
  });
};

// 호버 인텐트 기능 설정
const setupHoverIntent = () => {
  if (!floatingBtn.value) return;

  let leaveTimeout = null;

  // 마우스가 버튼 위에 올라왔을 때
  floatingBtn.value.addEventListener('mouseenter', () => {
    // 떠나는 타이머가 있다면 취소
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      leaveTimeout = null;
    }

    // 확장 클래스 즉시 추가
    floatingBtn.value.classList.add('expanded');
  });

  // 마우스가 버튼에서 떠났을 때
  floatingBtn.value.addEventListener('mouseleave', () => {
    // 지연 시간 후 클래스 제거 (700ms 지연)
    leaveTimeout = setTimeout(() => {
      if (floatingBtn.value) {
        floatingBtn.value.classList.remove('expanded');
      }
    }, 700); // 0.7초 동안 확장 상태 유지
  });
};

// 영양소 기준 정보 가져오기
const fetchNutritionStandard = async () => {
  isNutritionLoading.value = true;
  try {
    const { data } = await axios.get('/api/records/ns/current');
    nutritionStandard.value = data;
    console.log('영양소 기준 정보 로드 완료:', nutritionStandard.value);
  } catch (err) {
    console.error('영양소 기준 정보 로드 실패:', err);
  } finally {
    isNutritionLoading.value = false;
  }
};

const fetchDietRecords = async () => {
  isLoading.value = true; // 로딩 시작
  try {
    const { data } = await axios.get('/api/records/diet');
    records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
    await nextTick();
    observeFeedAnimation();
  } catch (err) {
    console.error('식단 기록 불러오기 실패', err);
  } finally {
    isLoading.value = false; // 로딩 종료
  }
};

const searchDietRecords = async (searchData) => {
  // 검색 버튼 클릭 시 전달받은 값으로 입력값 업데이트
  if (searchData) {
    searchInput.value = { ...searchData };
  }

  // 검색 상태 적용
  appliedSearch.value = {
    menuKeyword: searchInput.value.menuKeyword,
    startDate: searchInput.value.startDate,
    endDate: searchInput.value.endDate,
    isSearched: true
  };

  isLoading.value = true; // 로딩 시작
  try {
    // API 호출을 통한 서버 검색
    const { data } = await axios.get('/api/records/diet/search', {
      params: {
        menuKeyword: searchInput.value.menuKeyword,
        startDate: searchInput.value.startDate,
        endDate: searchInput.value.endDate,
      },
    });
    records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
    await nextTick();
    observeFeedAnimation();
  } catch (err) {
    console.error('식단 기록 검색 실패', err);
  } finally {
    isLoading.value = false; // 로딩 종료
  }
};

const deleteDietRecord = async (id) => {
  isLoading.value = true; // 로딩 시작
  try {
    await axios.delete(`/api/records/diet/${id}`);
    await fetchDietRecords();

    // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
    if (appliedSearch.value.isSearched) {
      await searchDietRecords();
    }
  } catch (err) {
    console.error('식단 기록 삭제 실패', err);
    alert('삭제에 실패했습니다. 다시 시도해주세요.');
  } finally {
    isLoading.value = false; // 로딩 종료
  }
};

const editDietRecord = (record) => {
  dietRecordToEdit.value = {...record};
  showEditDietRecordModal.value = true;
};

const onRecordAdded = async () => {
  showAddDietRecordModal.value = false;
  isLoading.value = true; // 로딩 시작
  await fetchDietRecords();

  // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
  if (appliedSearch.value.isSearched) {
    await searchDietRecords();
  }
  isLoading.value = false; // 로딩 종료
};

const onRecordUpdated = async () => {
  showEditDietRecordModal.value = false;
  isLoading.value = true; // 로딩 시작
  await fetchDietRecords();

  // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
  if (appliedSearch.value.isSearched) {
    await searchDietRecords();
  }
  isLoading.value = false; // 로딩 종료
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

onMounted(async () => {
  // 병렬로 데이터 로드
  isLoading.value = true; // 로딩 시작
  await Promise.all([
    fetchDietRecords(),
    fetchNutritionStandard()
  ]);
  isLoading.value = false; // 로딩 종료

  // 호버 인텐트 설정 추가
  nextTick(() => {
    setupHoverIntent();
  });
});
</script>

<style scoped>
/* 기본 스타일 */
.diet-record-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
  padding-bottom: 80px; /* 플로팅 버튼 공간 확보 */
}

.animate-on-scroll {
  opacity: 0;
  transform: translateY(20px); /* 40px에서 20px로 변경 */
  transition: all 0.5s ease-out; /* 2s ease에서 0.5s ease-out으로 변경 */
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 페이드인 애니메이션 속도 개선 */
.fade-in-animation {
  opacity: 0;
  transition: opacity 0.5s ease-out; /* 1.5s ease에서 0.5s ease-out으로 변경 */
}

.fade-in-animation.fade-in-active {
  opacity: 1;
}

/* 플로팅 식단 기록 추가 버튼 */
.create-record-floating-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: #4caf50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition:
      width 0.5s ease,
      border-radius 0.5s ease,
      background-color 0.3s ease,
      box-shadow 0.3s ease,
      transform 0.3s ease;
  z-index: 1000;
  padding: 0;
}

.create-record-floating-btn:hover {
  background-color: #388e3c;
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.5);
}

/* 플러스 아이콘 */
.plus-icon {
  position: absolute;
  bottom: 4px;
  opacity: 1;
  font-size: 36px;
  font-weight: 400;
  transition: margin-right 0.5s ease, opacity 0.5s ease;
}

/* 버튼 텍스트 - 기본은 투명 */
.btn-text {
  position: absolute;
  opacity: 0;
  visibility: hidden;
  white-space: nowrap;
  transition: opacity 0.5s ease;
}

/* 로딩 오버레이 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #4caf50;
  font-weight: 500;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(76, 175, 80, 0.2);
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* PC에서 호버링 개선 */
@media (min-width: 769px) {
  .create-record-floating-btn {
    overflow: hidden;
    width: 56px;
    transition:
        width 0.5s ease,
        border-radius 0.5s ease,
        background-color 0.5s ease,
        box-shadow 0.5s ease,
        transform 0.5s ease;
  }

  /* 호버 시 버튼 확장 */
  .create-record-floating-btn:hover,
  .create-record-floating-btn.expanded {
    width: 150px; /* 더 넓게 확장 */
  }

  /* 호버 시 아이콘 위치 조정 */
  .create-record-floating-btn:hover .plus-icon,
  .create-record-floating-btn.expanded .plus-icon {
    opacity: 0;
  }

  /* 호버 시 텍스트 부드럽게 등장 */
  .create-record-floating-btn:hover .btn-text,
  .create-record-floating-btn.expanded .btn-text {
    opacity: 1;
    visibility: visible;
  }

  /* 가상 요소로 호버 영역 확장 */
  .create-record-floating-btn::after {
    content: '';
    position: absolute;
    top: -35px;
    left: -35px;
    right: -35px;
    bottom: -35px;
    z-index: -1;
  }
}
</style>