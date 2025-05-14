<!-- LineChart.vue -->
<template>
  <div class="chart-wrapper animate-on-scroll">
    <Line :data="lineData" :options="lineOptions" />
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineController,
  LinearScale,
  PointElement,
  LineElement,
  CategoryScale
} from 'chart.js';
import { onMounted } from 'vue';

// chart.js 기본 설정
ChartJS.register(
    Title,
    Tooltip,
    Legend,
    LineController,
    LinearScale,
    PointElement,
    LineElement,
    CategoryScale
);

const props = defineProps({
  series: {
    type: Array,
    required: true,
  },
});

const lineOptions = {
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
          size: 11,
          family: 'Noto Sans KR, sans-serif',
        },
        color: '#666',
      },
      grid: {
        color: 'rgba(200, 200, 200, 0.2)',
      },
    },
    x: {
      ticks: {
        font: {
          size: 11,
          family: 'Noto Sans KR, sans-serif',
        },
        color: '#666',
      },
      grid: {
        color: 'rgba(200, 200, 200, 0.2)',
      },
    },
  },
};

const lineData = {
  labels: props.series.map(item => item.date.slice(5)),
  datasets: [
    {
      label: '점수',
      data: props.series.map(item => item.totalScore),
      borderColor: '#a5d6a7',
      backgroundColor: 'rgba(165, 214, 167, 0.4)',
      pointBackgroundColor: '#a5d6a7',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#a5d6a7',
      borderWidth: 2,
      tension: 0.3, // 부드러운 곡선
    },
  ],
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