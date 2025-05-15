<template>
  <div class="nutrition-pie-chart">
    <div class="chart-wrapper">
      <canvas ref="pieChart" width="200" height="200"></canvas>
    </div>
    <div class="nutrition-legend">
      <div v-for="(item, index) in legendItems" :key="index" class="legend-item">
        <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
        <div class="legend-label">{{ item.label }}: {{ item.value }}g ({{ item.percentage }}%)</div>
      </div>
    </div>

    <div class="nutrition-stats">
      <div class="stats-item">
        <div class="stats-value">{{ totalNutritionValue }}g</div>
        <div class="stats-label">총 영양소</div>
      </div>
      <div class="stats-item">
        <div class="stats-value">{{ nutrition.calories || 0 }}kcal</div>
        <div class="stats-label">칼로리</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import Chart from 'chart.js/auto'; // Chart.js 직접 임포트

const props = defineProps({
  nutrition: {
    type: Object,
    required: true
  }
});

const pieChart = ref(null);
let chart = null;

// 차트 색상
const chartColors = [
  '#FF6384', // 단백질 (분홍색)
  '#36A2EB', // 지방 (파란색)
  '#FFCE56', // 탄수화물 (노란색)
  '#4BC0C0', // 당류 (청록색)
  '#9966FF', // 식이섬유 (보라색)
  '#FF9F40'  // 기타 (주황색)
];

// 영양소 데이터 계산
const nutritionData = computed(() => {
  const protein = props.nutrition.protein || 0;
  const fat = props.nutrition.fat || 0;
  const carbs = props.nutrition.carbohydrates || 0;
  const sugars = props.nutrition.sugars || 0;
  const fiber = props.nutrition.fiber || 0;

  // 순수 탄수화물(당류와 식이섬유를 제외)
  const netCarbs = Math.max(carbs - sugars - fiber, 0);

  return [protein, fat, netCarbs, sugars, fiber];
});

// 총 영양소 값
const totalNutritionValue = computed(() => {
  return nutritionData.value.reduce((acc, curr) => acc + curr, 0).toFixed(2);
});

// 영양소 비율
const nutritionPercentages = computed(() => {
  const total = nutritionData.value.reduce((acc, curr) => acc + curr, 0);
  if (total === 0) return [0, 0, 0, 0, 0];

  return nutritionData.value.map(value => Math.round((value / total) * 100));
});

// 범례 아이템
const legendItems = computed(() => {
  const labels = ['단백질', '지방', '탄수화물', '당류', '식이섬유'];
  const values = nutritionData.value;
  const percentages = nutritionPercentages.value;

  return labels.map((label, i) => ({
    label,
    value: values[i].toFixed(2),
    percentage: percentages[i],
    color: chartColors[i]
  }));
});

// 차트 초기화 함수
const initChart = () => {
  if (!pieChart.value) return;

  const ctx = pieChart.value.getContext('2d');

  // 이전 차트 제거
  if (chart) {
    chart.destroy();
  }

  // 데이터가 모두 0이면 차트 그리지 않음
  if (nutritionData.value.every(value => value === 0)) {
    // 빈 차트 표시
    chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['데이터 없음'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e0e0e0'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        }
      }
    });
    return;
  }

  // 차트 생성
  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['단백질', '지방', '탄수화물', '당류', '식이섬유'],
      datasets: [{
        data: nutritionData.value,
        backgroundColor: chartColors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const percentage = Math.round((value / totalNutritionValue.value) * 100);
              return `${label}: ${value.toFixed(2)}g (${percentage}%)`;
            }
          }
        }
      }
    }
  });
};

// 컴포넌트 마운트 시 차트 초기화
onMounted(() => {
  initChart();
});

// props 변경 시 차트 업데이트
watch(() => props.nutrition, () => {
  nextTick(() => {
    initChart();
  });
}, { deep: true });
</script>

<style scoped>
.nutrition-pie-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 10px 0;
}

.chart-wrapper {
  width: 220px;
  height: 220px;
  margin-bottom: 16px;
  position: relative;
}

.nutrition-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  width: 100%;
  max-width: 500px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-right: 8px;
  margin-bottom: 4px;
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

.legend-label {
  font-size: 14px;
  color: #555;
}

.nutrition-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 10px;
}

.stats-item {
  text-align: center;
}

.stats-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stats-label {
  font-size: 14px;
  color: #777;
  margin-top: 2px;
}

@media (max-width: 480px) {
  .chart-wrapper {
    width: 180px;
    height: 180px;
  }

  .nutrition-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .legend-item {
    margin-right: 0;
  }

  .stats-value {
    font-size: 16px;
  }

  .stats-label {
    font-size: 12px;
  }
}
</style>