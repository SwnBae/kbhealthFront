<template>
  <div class="nutrition-bar-chart">
    <div class="chart-container">
      <div
          v-for="(nutrient) in nutrients"
          :key="nutrient.name"
          class="nutrient-bar"
      >
        <div class="nutrient-label">{{ nutrient.label }}</div>
        <div class="bar-container">
          <div
              class="bar"
              :style="{ width: `${nutrient.percentage}%`, backgroundColor: getBarColor(nutrient.percentage) }"
          >
            <span v-if="nutrient.percentage >= 20" class="bar-label">{{ nutrient.percentage }}%</span>
          </div>
          <span v-if="nutrient.percentage < 20" class="external-bar-label">{{ nutrient.percentage }}%</span>
        </div>
        <div class="nutrient-values">
          <span class="current-value">{{ nutrient.value }}{{ nutrient.unit }}</span>
          <span class="standard-value">/ {{ nutrient.standard }}{{ nutrient.unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

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

// 영양소 데이터 계산
const nutrients = computed(() => {
  return [
    {
      name: 'calories',
      label: '칼로리',
      value: props.dietNutrition.calories || 0,
      standard: props.standardNutrition.calories || 2000,
      percentage: calculatePercentage(props.dietNutrition.calories, props.standardNutrition.calories),
      unit: 'kcal'
    },
    {
      name: 'protein',
      label: '단백질',
      value: props.dietNutrition.protein || 0,
      standard: props.standardNutrition.protein || 60,
      percentage: calculatePercentage(props.dietNutrition.protein, props.standardNutrition.protein),
      unit: 'g'
    },
    {
      name: 'fat',
      label: '지방',
      value: props.dietNutrition.fat || 0,
      standard: props.standardNutrition.fat || 65,
      percentage: calculatePercentage(props.dietNutrition.fat, props.standardNutrition.fat),
      unit: 'g'
    },
    {
      name: 'carbohydrates',
      label: '탄수화물',
      value: props.dietNutrition.carbohydrates || 0,
      standard: props.standardNutrition.carbohydrates || 300,
      percentage: calculatePercentage(props.dietNutrition.carbohydrates, props.standardNutrition.carbohydrates),
      unit: 'g'
    },
    {
      name: 'sugars',
      label: '당류',
      value: props.dietNutrition.sugars || 0,
      standard: props.standardNutrition.sugars || 25,
      percentage: calculatePercentage(props.dietNutrition.sugars, props.standardNutrition.sugars),
      unit: 'g'
    },
    {
      name: 'fiber',
      label: '식이섬유',
      value: props.dietNutrition.fiber || 0,
      standard: props.standardNutrition.fiber || 25,
      percentage: calculatePercentage(props.dietNutrition.fiber, props.standardNutrition.fiber),
      unit: 'g'
    },
    {
      name: 'sodium',
      label: '나트륨',
      value: props.dietNutrition.sodium || 0,
      standard: props.standardNutrition.sodium || 2000,
      percentage: calculatePercentage(props.dietNutrition.sodium, props.standardNutrition.sodium),
      unit: 'mg'
    }
  ];
});

// 퍼센트 계산 함수
const calculatePercentage = (value, total) => {
  if (!total || total === 0 || !value) return 0;
  return Math.min(Math.round((value / total) * 100), 100); // 최대 100%로 제한
};

// 막대 색상 결정 함수
const getBarColor = (percentage) => {
  if (percentage <= 25) return '#4caf50'; // 녹색 (낮음)
  if (percentage <= 50) return '#8bc34a'; // 연두색 (적당)
  if (percentage <= 75) return '#ffeb3b'; // 노란색 (보통)
  if (percentage <= 90) return '#ff9800'; // 주황색 (높음)
  return '#f44336'; // 빨간색 (초과)
};

</script>

<style scoped>
.nutrition-bar-chart {
  width: 100%;
  padding: 10px 0;
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nutrient-bar {
  display: flex;
  align-items: center;
  width: 100%;
}

.nutrient-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.bar-container {
  flex-grow: 1;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin: 0 12px;
}

.bar {
  height: 100%;
  border-radius: 10px;
  transition: width 0.8s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
}

.bar-label, .external-bar-label {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
}

.external-bar-label {
  color: #333;
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.nutrient-values {
  width: 110px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  text-align: right;
}

.current-value {
  font-weight: 600;
  color: #333;
}

.standard-value {
  color: #888;
}

@media (max-width: 600px) {
  .nutrient-bar {
    flex-wrap: wrap;
  }

  .nutrient-label {
    width: 100%;
    margin-bottom: 4px;
  }

  .bar-container {
    flex: 1 1 100%;
    margin: 4px 0;
    order: 3;
  }

  .nutrient-values {
    width: 100%;
    flex-direction: row;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>