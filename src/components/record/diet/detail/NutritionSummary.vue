<template>
  <div class="nutrition-summary">
    <!-- 왼쪽: 영양소 바 그래프 -->
    <div class="nutrition-bars-container">
      <div class="nutrition-bars">
        <div
            v-for="nutrient in displayedNutrients"
            :key="nutrient.name"
            class="nutrient-bar-item"
        >
          <div class="nutrient-info">
            <span class="nutrient-name">{{ nutrient.label }}</span>
            <span class="nutrient-value">{{ nutrient.value }}{{ nutrient.unit }}</span>
          </div>
          <div class="bar-container">
            <div class="bar-bg"></div>
            <div
                class="bar-fill"
                :style="{
                width: `${nutrient.percentage}%`,
                backgroundColor: nutrient.color
              }"
            ></div>
          </div>
          <div class="percent-info">일일 권장량의 {{ nutrient.percentage }}%</div>
        </div>
      </div>
    </div>

    <!-- 오른쪽: 원형 그래프 -->
    <div class="nutrition-pie">
      <!-- 버튼만 별도로 상단에 배치 -->
      <div class="mode-toggle-container">
        <button class="toggle-button" @click="detailedMode = !detailedMode">
          {{ detailedMode ? '간략히 보기' : '자세히 보기' }}
        </button>
      </div>

      <!-- 원 그래프 컨테이너 -->
      <div class="pie-chart-wrapper">
        <div class="pie-chart-container">
          <canvas ref="pieChartRef" width="180" height="180"></canvas>
        </div>
      </div>

      <div class="pie-legend">
        <div v-for="(item, idx) in pieData" :key="idx" class="legend-item">
          <div class="color-dot" :style="{ backgroundColor: item.color }"></div>
          <span class="percent">{{ item.percent }}%</span>
          <span class="label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 상세 영양 섭취 정보 테이블 (토글 형식) -->
    <div class="nutrition-detail-section">
      <div class="detail-header" @click="showDetailTable = !showDetailTable">
        <h3 class="detail-title">상세 영양 섭취 정보</h3>
        <span class="toggle-icon">{{ showDetailTable ? '▲' : '▼' }}</span>
      </div>

      <div class="detail-content" v-if="showDetailTable">
        <table class="nutrition-table">
          <thead>
          <tr>
            <th>영양소</th>
            <th>함량</th>
            <th>일일 권장량</th>
            <th>비율</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="nutrient in allNutrients" :key="nutrient.name">
            <td>{{ nutrient.label }}</td>
            <td>{{ nutrient.value }}{{ nutrient.unit }}</td>
            <td>{{ getStandardValue(nutrient.name) }}{{ nutrient.unit }}</td>
            <td>{{ nutrient.percentage }}%</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps({
  dietNutrition: {
    type: Object,
    required: true
  },
  standardNutrition: {
    type: Object,
    required: true
  }
});

const pieChartRef = ref(null);
let chart = null;
const detailedMode = ref(false); // 상세 모드 토글 상태
const showDetailTable = ref(false); // 상세 테이블 표시 여부

// 영양소 색상 맵
const nutrientColors = {
  calories: '#FF6384',
  protein: '#36A2EB',
  carbohydrates: '#FFCE56',
  fat: '#4BC0C0',
  sugars: '#FF9F40',
  fiber: '#9966FF',
  sodium: '#C9CBCF'
};

// 기본 영양소 데이터 (전체)
const allNutrients = computed(() => {
  const diet = props.dietNutrition;
  const standard = props.standardNutrition;

  return [
    {
      name: 'calories',
      label: '칼로리',
      value: diet.calories || 0,
      unit: 'kcal',
      percentage: Math.min(Math.round(((diet.calories || 0) / (standard.calories || 2000)) * 100), 100),
      color: nutrientColors.calories
    },
    {
      name: 'protein',
      label: '단백질',
      value: diet.protein || 0,
      unit: 'g',
      percentage: Math.min(Math.round(((diet.protein || 0) / (standard.protein || 60)) * 100), 100),
      color: nutrientColors.protein
    },
    {
      name: 'carbohydrates',
      label: '탄수화물',
      value: diet.carbohydrates || 0,
      unit: 'g',
      percentage: Math.min(Math.round(((diet.carbohydrates || 0) / (standard.carbohydrates || 300)) * 100), 100),
      color: nutrientColors.carbohydrates
    },
    {
      name: 'fat',
      label: '지방',
      value: diet.fat || 0,
      unit: 'g',
      percentage: Math.min(Math.round(((diet.fat || 0) / (standard.fat || 65)) * 100), 100),
      color: nutrientColors.fat
    },
    {
      name: 'sugars',
      label: '당류',
      value: diet.sugars || 0,
      unit: 'g',
      percentage: Math.min(Math.round(((diet.sugars || 0) / (standard.sugars || 25)) * 100), 100),
      color: nutrientColors.sugars
    },
    {
      name: 'fiber',
      label: '식이섬유',
      value: diet.fiber || 0,
      unit: 'g',
      percentage: Math.min(Math.round(((diet.fiber || 0) / (standard.fiber || 25)) * 100), 100),
      color: nutrientColors.fiber
    },
    {
      name: 'sodium',
      label: '나트륨',
      value: diet.sodium || 0,
      unit: 'mg',
      percentage: Math.min(Math.round(((diet.sodium || 0) / (standard.sodium || 2000)) * 100), 100),
      color: nutrientColors.sodium
    }
  ];
});

// 주요 영양소만 포함 (간략 모드)
const mainNutrients = computed(() => {
  return allNutrients.value.filter(nutrient =>
      ['calories', 'protein', 'carbohydrates', 'fat'].includes(nutrient.name)
  );
});

// 모드에 따라 표시할 영양소
const displayedNutrients = computed(() => {
  return detailedMode.value ? allNutrients.value : mainNutrients.value;
});

// 파이 차트 데이터 (간략 모드)
const mainPieData = computed(() => {
  const diet = props.dietNutrition;

  // 영양소 값
  const protein = diet.protein || 0;
  const fat = diet.fat || 0;
  const carbs = diet.carbohydrates || 0;

  // 총합 계산
  const total = protein + fat + carbs;

  // 비율 계산 (0으로 나누는 것 방지)
  const getPercent = (value) => total === 0 ? 0 : Math.round((value / total) * 100);

  return [
    {
      label: '단백질',
      value: protein,
      percent: getPercent(protein),
      color: nutrientColors.protein
    },
    {
      label: '탄수화물',
      value: carbs,
      percent: getPercent(carbs),
      color: nutrientColors.carbohydrates
    },
    {
      label: '지방',
      value: fat,
      percent: getPercent(fat),
      color: nutrientColors.fat
    }
  ];
});

// 파이 차트 데이터 (상세 모드)
const detailedPieData = computed(() => {
  const diet = props.dietNutrition;

  // 영양소 값
  const protein = diet.protein || 0;
  const fat = diet.fat || 0;
  const carbs = Math.max((diet.carbohydrates || 0) - (diet.sugars || 0), 0);
  const sugars = diet.sugars || 0;
  const fiber = diet.fiber || 0;

  // 총합 계산
  const total = protein + fat + carbs + sugars + fiber;

  // 비율 계산 (0으로 나누는 것 방지)
  const getPercent = (value) => total === 0 ? 0 : Math.round((value / total) * 100);

  return [
    {
      label: '단백질',
      value: protein,
      percent: getPercent(protein),
      color: nutrientColors.protein
    },
    {
      label: '탄수화물',
      value: carbs,
      percent: getPercent(carbs),
      color: nutrientColors.carbohydrates
    },
    {
      label: '지방',
      value: fat,
      percent: getPercent(fat),
      color: nutrientColors.fat
    },
    {
      label: '당류',
      value: sugars,
      percent: getPercent(sugars),
      color: nutrientColors.sugars
    },
    {
      label: '식이섬유',
      value: fiber,
      percent: getPercent(fiber),
      color: nutrientColors.fiber
    }
  ];
});

// 현재 모드에 따른 파이 데이터
const pieData = computed(() => {
  return detailedMode.value ? detailedPieData.value : mainPieData.value;
});

// 영양소 기준값 가져오기
const getStandardValue = (nutrientName) => {
  const standards = {
    calories: props.standardNutrition.calories || 2000,
    protein: props.standardNutrition.protein || 60,
    carbohydrates: props.standardNutrition.carbohydrates || 300,
    fat: props.standardNutrition.fat || 65,
    sugars: props.standardNutrition.sugars || 25,
    fiber: props.standardNutrition.fiber || 25,
    sodium: props.standardNutrition.sodium || 2000
  };

  return standards[nutrientName];
};

// 파이 차트 초기화/업데이트
const updatePieChart = () => {
  if (!pieChartRef.value) return;

  const ctx = pieChartRef.value.getContext('2d');

  // 이전 차트 제거
  if (chart) {
    chart.destroy();
  }

  // 데이터 준비
  const chartData = {
    labels: pieData.value.map(item => item.label),
    datasets: [{
      data: pieData.value.map(item => item.value),
      backgroundColor: pieData.value.map(item => item.color),
      borderWidth: 0
    }]
  };

  // 파이 차트 생성
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              return `${label}: ${value.toFixed(1)}g (${pieData.value[context.dataIndex].percent}%)`;
            }
          }
        }
      }
    }
  });
};

// 컴포넌트 마운트 시 파이 차트 초기화
onMounted(() => {
  updatePieChart();
});

// props 또는 모드 변경 시 파이 차트 업데이트
watch([
  () => props.dietNutrition,
  () => props.standardNutrition,
  () => detailedMode.value
], () => {
  updatePieChart();
}, { deep: true });
</script>

<style scoped>
.nutrition-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 10px 0;
  max-width: 700px;
  margin: 0 auto;
}

/* 영양소 바 그래프 영역 */
.nutrition-bars-container {
  flex: 1;
  min-width: 280px;
  overflow: hidden; /* 바깥 스크롤 방지 */
  border-radius: 10px; /* 둥근 모서리 */
  margin-bottom: 20px;
}

.nutrition-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 12px 4px 4px;
  border-radius: 10px; /* 내부 스크롤 영역도 둥근 모서리 적용 */
}

.nutrient-bar-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nutrient-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.nutrient-name {
  font-weight: 500;
  color: #333;
}

.nutrient-value {
  font-weight: 600;
  color: #555;
}

.bar-container {
  position: relative;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
}

.bar-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
}

.bar-fill {
  position: absolute;
  height: 100%;
  border-radius: 6px;
  transition: width 0.8s ease;
}

.percent-info {
  font-size: 12px;
  color: #777;
  text-align: right;
}

/* 원형 차트 영역 */
.nutrition-pie {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 모드 토글 버튼 컨테이너 - 상단에 별도 배치 */
.mode-toggle-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 5px;
}

/* 버튼 스타일 */
.toggle-button {
  padding: 5px 10px;
  border: 1px solid #4caf50;
  background-color: white;
  color: #4caf50;
  font-size: 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-button:hover {
  background-color: #f0fff0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* 원 그래프 래퍼 - 추가 여백으로 아래로 내림 */
.pie-chart-wrapper {
  width: 100%;
  margin-top: 20px; /* 원 그래프를 더 아래로 내림 */
}

.pie-chart-container {
  width: 180px;
  height: 180px;
  position: relative;
  margin: 0 auto;
}

.pie-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.percent {
  font-weight: 600;
  color: #333;
}

.label {
  color: #555;
}

/* 상세 정보 테이블 섹션 */
.nutrition-detail-section {
  width: 100%;
  margin-top: 30px;
  border-top: 1px solid #eee;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  border-radius: 8px;
  background-color: #f9f9f9;
  transition: background-color 0.3s ease;
}

.detail-header:hover {
  background-color: #f0f0f0;
}

.detail-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.toggle-icon {
  font-size: 18px;
  color: #555;
}

.detail-content {
  padding: 0 16px 16px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.nutrition-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nutrition-table th,
.nutrition-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.nutrition-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #444;
}

.nutrition-table tr:last-child td {
  border-bottom: none;
}

.nutrition-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* 스크롤바 스타일 */
.nutrition-bars::-webkit-scrollbar {
  width: 6px;
}

.nutrition-bars::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.nutrition-bars::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 10px;
}

.nutrition-bars::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}

/* 반응형 디자인 */
@media (max-width: 580px) {
  .nutrition-summary {
    flex-direction: column;
  }

  .nutrition-pie {
    flex-direction: column;
    align-items: center;
  }

  .pie-chart-wrapper {
    margin-top: 15px; /* 모바일에서는 약간 줄임 */
  }

  .pie-legend {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 16px;
  }

  .pie-chart-container {
    width: 160px;
    height: 160px;
  }

  /* 모바일에서도 버튼 위치 조정 */
  .toggle-button {
    font-size: 11px;
    padding: 4px 8px;
  }
}
</style>