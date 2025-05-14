<template>
  <div class="profile-graphs">
    <div class="graph-card animate-on-scroll">
      <h3 class="graph-title">오늘의 영양 달성률</h3>
      <NutritionRadar :data="profile.todayAchievement" />
    </div>
    <div class="graph-card animate-on-scroll">
      <h3 class="graph-title">최근 10일 간 점수</h3>
      <ScoreLineChart :series="profile.last10DaysScores" />
    </div>
  </div>
</template>

<script setup>
import NutritionRadar from "@/components/NutritionRadar.vue";
import ScoreLineChart from "@/components/ScoreLineChart.vue";
import { onMounted } from 'vue';

defineProps({
  profile: {
    type: Object,
    required: true
  }
});

onMounted(() => {
  observeFeedAnimation(); // 컴포넌트가 마운트될 때 애니메이션 설정
});

// 스크롤 애니메이션 관찰자 설정
const observeFeedAnimation = () => {
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
.profile-graphs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
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

.graph-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.graph-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.graph-title {
  text-align: center;
  margin-bottom: 1rem;
  color: #222;
  font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
  font-weight: 600;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  position: relative;
  padding-bottom: 8px;
}

.graph-title::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 35px;
  height: 2px;
  background-color: #e6e6e6;
  border-radius: 1px;
}
</style>