<template>
  <div>
    <Line :data="lineData" :options="lineOptions" />
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, LineController, LinearScale, PointElement, LineElement, CategoryScale } from 'chart.js';

// chart.js 기본 설정
ChartJS.register(Title, Tooltip, Legend, LineController, LinearScale, PointElement, LineElement, CategoryScale);

const props = defineProps({
  series: {
    type: Array,
    required: true,
  },
});

const lineData = {
  labels: props.series.map(item => item.date), // 날짜 레이블
  datasets: [
    {
      label: '점수',
      data: props.series.map(item => item.totalScore), // 점수 데이터
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
      tension: 0.1,
    },
  ],
};

const lineOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
    },
  },
};
</script>
