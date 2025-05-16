<template>
  <div class="exercise-record-wrapper">
    <!-- 검색 옵션 -->
    <ExerciseSearch
        :searchInput="searchInput"
        @search="searchExerciseRecords"
        class="fade-in-animation"
    />

    <!-- 기록 목록 -->
    <ExerciseRecordList
        :records="displayedRecords"
        @edit="editExerciseRecord"
        @delete="deleteExerciseRecord"
        @toggle-completion="toggleExerciseCompletion"
        @show-detail="showRecordDetail"
    />

    <!-- 기록 추가 모달 -->
    <AddExerciseModal
        v-if="showAddExerciseModal"
        :showModal="showAddExerciseModal"
        @close="showAddExerciseModal = false"
        @added="onRecordAdded"
    />

    <!-- 기록 수정 모달 -->
    <EditExerciseModal
        v-if="showEditExerciseModal && selectedRecord"
        :showModal="showEditExerciseModal"
        :recordToEdit="selectedRecord"
        @close="showEditExerciseModal = false"
        @updated="onRecordUpdated"
    />

    <!-- 상세 정보 모달 -->
    <ExerciseDetailModal
        v-if="showDetailModal && selectedRecord"
        :showModal="showDetailModal"
        :record="selectedRecord"
        @close="closeDetailModal"
    />

    <!-- 운동 기록 로딩 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>운동 정보 로딩 중...</span>
    </div>

    <!-- 플로팅 기록 추가 버튼 -->
    <button ref="floatingBtn" class="create-record-floating-btn" @click="showAddExerciseModal = true">
      <span class="plus-icon">+</span>
      <span class="btn-text">기록 추가</span>
    </button>
  </div>
</template>

<script setup>
import {ref, computed, onMounted, nextTick} from 'vue';
import axios from 'axios';
import ExerciseSearch from './exercise/ExerciseSearch.vue';
import ExerciseRecordList from './exercise/ExerciseRecordList.vue';
import AddExerciseModal from './exercise/AddExerciseModal.vue';
import EditExerciseModal from './exercise/EditExerciseModal.vue';
import ExerciseDetailModal from './exercise/ExerciseDetailModal.vue';

// 기록 데이터 및 상태 관리
const records = ref([]);
const showAddExerciseModal = ref(false);
const showEditExerciseModal = ref(false);
const showDetailModal = ref(false);
const selectedRecord = ref(null);
const floatingBtn = ref(null); // 플로팅 버튼 ref 추가
const isLoading = ref(false); // 로딩 상태

// 검색 상태
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
  isSearched: false
});

// API 경로
const API_BASE_URL = '/api/records'; // 공통 기본 URL

/* 스크롤 애니메이션 관찰자 설정 개선 */
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

// 페이지 로드 시 데이터 가져오기
onMounted(async () => {
  fetchExerciseRecords();

  // 호버 인텐트 설정 추가
  nextTick(() => {
    setupHoverIntent();
  });
});

// 기록 가져오기
const fetchExerciseRecords = async () => {
  isLoading.value = true;
  try {
    // 백엔드 API URL에 맞게 수정
    const {data} = await axios.get(`${API_BASE_URL}/exercise`);
    records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
    await nextTick();
    observeFeedAnimation();
  } catch (error) {
    console.error('운동 기록을 가져오는 데 실패했습니다:', error);
  } finally {
    isLoading.value = false;
  }
};

// 검색 실행
const searchExerciseRecords = async (searchData) => {
  // 검색 버튼 클릭 시 전달받은 값으로 입력값 업데이트
  if (searchData) {
    searchInput.value = {...searchData};
  }

  // 검색 상태 적용
  appliedSearch.value = {
    exerciseKeyword: searchInput.value.exerciseKeyword,
    startDate: searchInput.value.startDate,
    endDate: searchInput.value.endDate,
    isSearched: true
  };

  isLoading.value = true;
  try {
    // 백엔드 API URL에 맞게 수정
    const {data} = await axios.get(`${API_BASE_URL}/exercise/search`, {
      params: {
        exerciseName: searchInput.value.exerciseKeyword, // 백엔드 파라미터 이름에 맞게 수정
        startDate: searchInput.value.startDate,
        endDate: searchInput.value.endDate,
      },
    });
    records.value = data.sort((a, b) => new Date(b.lastModifyDate) - new Date(a.lastModifyDate));
    await nextTick();
    observeFeedAnimation();
  } catch (error) {
    console.error('운동 기록 검색에 실패했습니다:', error);
  } finally {
    isLoading.value = false;
  }
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

// 모달 관련 기능
const editExerciseRecord = (record) => {
  selectedRecord.value = {...record};
  showEditExerciseModal.value = true;
};

const showRecordDetail = (record) => {
  selectedRecord.value = record;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
};

// 운동 완료 토글 - 식단 기록 스타일로 수정
const toggleExerciseCompletion = async (record) => {
  try {
    // 백엔드 API URL에 맞게 수정
    const endpoint = record.exercised
        ? `${API_BASE_URL}/exercise/${record.id}/uncomplete`
        : `${API_BASE_URL}/exercise/${record.id}/complete`;

    // 백엔드 API 호출
    await axios.put(endpoint);

    // 서버에서 데이터 즉시 갱신
    await fetchExerciseRecords();

    // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
    if (appliedSearch.value.isSearched) {
      await searchExerciseRecords();
    }
  } catch (err) {
    console.error('운동 완료 상태 변경에 실패했습니다:', err);
    // 에러 발생시 경고창 (식단 기록 스타일)
    alert('상태 변경에 실패했습니다. 다시 시도해주세요.');
  }
};

// 운동 기록 삭제 - 식단 기록 스타일로 수정
const deleteExerciseRecord = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/exercise/${id}`);
    await fetchExerciseRecords();

    // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
    if (appliedSearch.value.isSearched) {
      await searchExerciseRecords();
    }
  } catch (err) {
    console.error('운동 기록 삭제 실패', err);
    alert('삭제에 실패했습니다. 다시 시도해주세요.');
  }
};

// 운동 추가 후 처리 - 함수명 변경
const onRecordAdded = async () => {
  showAddExerciseModal.value = false;
  await fetchExerciseRecords();

  // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
  if (appliedSearch.value.isSearched) {
    await searchExerciseRecords();
  }
};

// 운동 수정 후 처리 - 함수명 변경
const onRecordUpdated = async () => {
  showEditExerciseModal.value = false;

  console.log("갱신 전");
  await fetchExerciseRecords();
  console.log("갱신 후");
  // 검색이 이미 적용된 상태였다면, 검색 결과 업데이트
  if (appliedSearch.value.isSearched) {
    await searchExerciseRecords();
  }

};
</script>

<style scoped>
/* 기본 스타일 */
.exercise-record-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
  padding-bottom: 80px; /* 플로팅 버튼 공간 확보 */
}

/* 애니메이션 공통 스타일 - 속도 개선 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease-out;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 페이드인 애니메이션 속도 개선 */
.fade-in-animation {
  opacity: 0;
  transition: opacity 0.5s ease-out;
}

.fade-in-animation.fade-in-active {
  opacity: 1;
}

/* 플로팅 운동 기록 추가 버튼 */
.create-record-floating-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: #3f51b5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(63, 81, 181, 0.4);
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: width 0.5s ease,
  border-radius 0.5s ease,
  background-color 0.3s ease,
  box-shadow 0.3s ease,
  transform 0.3s ease;
  z-index: 1000;
  padding: 0;
}

.create-record-floating-btn:hover {
  background-color: #303f9f;
  box-shadow: 0 6px 16px rgba(63, 81, 181, 0.5);
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
  color: #3f51b5;
  font-weight: 500;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(63, 81, 181, 0.2);
  border-top: 4px solid #3f51b5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* PC에서 호버링 개선 */
@media (min-width: 769px) {
  .create-record-floating-btn {
    overflow: hidden;
    width: 56px;
    transition: width 0.5s ease,
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