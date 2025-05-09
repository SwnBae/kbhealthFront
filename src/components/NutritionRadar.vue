<template>
  <div>
    <Radar :data="radarData" :options="radarOptions" />
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { Radar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, RadarController, RadialLinearScale, ArcElement, CategoryScale } from 'chart.js';

// chart.js 기본 설정
ChartJS.register(Title, Tooltip, Legend, RadarController, RadialLinearScale, ArcElement, CategoryScale);

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const radarData = {
  labels: ['칼로리', '단백질', '지방', '탄수화물', '당', '식이섬유', '나트륨'],
  datasets: [
    {
      label: '오늘의 영양 달성률',
      data: [
        props.data.caloriesRate * 100,
        props.data.proteinRate * 100,
        props.data.fatRate * 100,
        props.data.carbRate * 100,
        props.data.sugarsRate * 100,
        props.data.fiberRate * 100,
        props.data.sodiumRate * 100,
      ],
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1,
    },
  ],
};

const radarOptions = {
  responsive: true,
  scales: {
    r: {
      beginAtZero: true,
    },
  },
};
</script>
