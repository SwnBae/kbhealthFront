<template>
  <div>
    <Radar :data="radarData" :options="radarOptions" />
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { Radar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
} from 'chart.js';

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    RadarController,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    CategoryScale
);

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

// 100% 기준의 데이터 구성
const radarData = {
  labels: ['칼로리', '단백질', '지방', '탄수화물', '당', '식이섬유', '나트륨'],
  datasets: [
    {
      label: '달성률',
      data: [
        props.data.caloriesRate * 100,
        props.data.proteinRate * 100,
        props.data.fatRate * 100,
        props.data.carbRate * 100,
        props.data.sugarsRate * 100,
        props.data.fiberRate * 100,
        props.data.sodiumRate * 100,
      ],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      pointBackgroundColor: 'rgba(54, 162, 235, 1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 2,
    },
  ],
};

const radarOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#333',
        font: {
          size: 14,
          family: 'Noto Sans KR, sans-serif',
          weight: 'bold',
        },
      },
    },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#333',
      bodyColor: '#333',
      borderColor: 'rgba(54, 162, 235, 0.3)',
      borderWidth: 1,
      callbacks: {
        label: function (context) {
          const value = context.parsed.r;
          return `${value.toFixed(1)}%`; // ← 소수점 한 자리
        },
      },
    },
  },
  scales: {
    r: {
      beginAtZero: true,
      min: 0,
      max: 100,
      ticks: {
        stepSize: 20,
        callback: (value) => `${value}%`,
        backdropColor: 'transparent',
        color: '#888',
        font: {
          size: 12,
        },
      },
      pointLabels: {
        color: '#444',
        font: {
          size: 13,
          weight: '600',
        },
      },
      grid: {
        color: 'rgba(200, 200, 200, 0.2)',
      },
      angleLines: {
        color: 'rgba(150, 150, 150, 0.15)',
      },
    },
  },
};

</script>
