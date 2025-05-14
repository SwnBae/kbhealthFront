<!-- RadarChart.vue -->
<template>
  <div class="chart-wrapper animate-on-scroll">
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
import { onMounted } from 'vue';

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
      label: '달성률(%)',
      data: [
        props.data.caloriesRate * 100,
        props.data.proteinRate * 100,
        props.data.fatRate * 100,
        props.data.carbRate * 100,
        props.data.sugarsRate * 100,
        props.data.fiberRate * 100,
        props.data.sodiumRate * 100,
      ],
      backgroundColor: 'rgba(165, 214, 167, 0.4)',
      borderColor: '#a5d6a7',
      pointBackgroundColor: '#a5d6a7',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#a5d6a7',
      borderWidth: 2,
    },
  ],
};

const radarOptions = {
  responsive: true,
  maintainAspectRatio: true,
  animation: {
    duration: 800,
    easing: 'easeOutQuart'
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#222',
        font: {
          size: 13,
          family: 'Noto Sans KR, sans-serif',
          weight: '600',
        },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#222',
      bodyColor: '#666',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      padding: 10,
      boxPadding: 6,
      cornerRadius: 8,
      titleFont: {
        size: 13,
        weight: '600',
        family: 'Noto Sans KR, sans-serif',
      },
      bodyFont: {
        size: 12,
        family: 'Noto Sans KR, sans-serif',
      },
      callbacks: {
        label: function (context) {
          const value = context.parsed.r;
          return `${value.toFixed(1)}%`;
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
        color: '#666',
        font: {
          size: 11,
          family: 'Noto Sans KR, sans-serif',
        },
      },
      pointLabels: {
        color: '#444',
        font: {
          size: 12,
          weight: '600',
          family: 'Noto Sans KR, sans-serif',
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

onMounted(() => {
  observeChartAnimation();
});

// 스크롤 애니메이션 관찰자 설정
const observeChartAnimation = () => {
  const elements = document.querySelectorAll(".animate-on-scroll");
  const scrollObserver = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      }),
      {threshold: 0.1}
  );
  elements.forEach(el => scrollObserver.observe(el));
};
</script>

<style scoped>
.chart-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
  padding: 1.2rem;
  margin-bottom: 1.2rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  max-width: 540px;
  margin-left: 1rem;
  margin-right: 1rem;
}

.chart-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 애니메이션 효과 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

.chart-wrapper {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}
</style>
