<template>
  <div class="search-options fade-in-animation">
    <input class="search-input" v-model="localSearchInput.startDate" type="date" />
    <input class="search-input" v-model="localSearchInput.endDate" type="date" />
    <input
        class="search-input"
        v-model="localSearchInput.menuKeyword"
        placeholder="음식 이름"
        @keyup.enter="emitSearch"
    />
    <button class="search-button" @click="emitSearch">검색</button>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch, onMounted } from 'vue';

const props = defineProps({
  searchInput: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['search']);

// 로컬 검색 상태
const localSearchInput = ref({
  menuKeyword: '',
  startDate: '',
  endDate: ''
});

// 컴포넌트 마운트 시 초기값 설정
onMounted(() => {
  // props로부터 초기값 설정
  localSearchInput.value = {
    menuKeyword: props.searchInput.menuKeyword || '',
    startDate: props.searchInput.startDate || '',
    endDate: props.searchInput.endDate || ''
  };
});

// props가 변경될 때 로컬 상태도 업데이트
watch(() => props.searchInput, (newValue) => {
  localSearchInput.value = {
    menuKeyword: newValue.menuKeyword || '',
    startDate: newValue.startDate || '',
    endDate: newValue.endDate || ''
  };
}, { deep: true });

const emitSearch = () => {
  // 부모 컴포넌트에 검색 이벤트 발생
  emit('search', localSearchInput.value);
};
</script>

<style scoped>
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

/* 페이드인 애니메이션 */
.fade-in-animation {
  opacity: 0;
  transition: opacity 1.5s ease;
}

.fade-in-animation.fade-in-active {
  opacity: 1;
}

/* 반응형 디자인 */
@media (max-width: 500px) {
  .search-options {
    flex-direction: column;
  }
}
</style>