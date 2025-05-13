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

const lineOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 14,
          weight: 'bold',
        },
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => `점수: ${context.raw}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 10,
        font: {
          size: 12,
        },
      },
    },
    x: {
      ticks: {
        font: {
          size: 12,
        },
      },
    },
  },
};

const lineData = {
  labels: props.series.map(item => item.date),
  datasets: [
    {
      label: '점수',
      data: props.series.map(item => item.totalScore),
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      pointBackgroundColor: 'rgba(75, 192, 192, 1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 2,
    },
  ],
};

</script>
