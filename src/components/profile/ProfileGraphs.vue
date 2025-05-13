<template>
  <div class="profile-graphs">
    <div class="card">
      <h3 class="graph-title">오늘의 영양 달성률</h3>
      <NutritionRadar :data="profile.todayAchievement" />
    </div>
    <div class="card">
      <h3 class="graph-title">최근 10일 간 점수</h3>
      <ScoreLineChart :series="profile.last10DaysScores" />
    </div>
  </div>
</template>

<script setup>
import NutritionRadar from "@/components/NutritionRadar.vue";
import ScoreLineChart from "@/components/ScoreLineChart.vue";

defineProps({
  profile: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.profile-graphs {
  display: flex;
  flex-direction: column;
  gap: 1.2rem; /* 살짝 더 조밀하게 */
}

.card {
  background-color: #fff;
  border: 1px solid #ddd; /* profile-info-card와 통일 */
  border-radius: 0.75rem; /* profile-info-card와 동일한 둥글기 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 동일한 그림자 효과 */
  padding: 1.5rem;
  transition: transform 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card:hover {
  transform: translateY(-2px);
}

.graph-title {
  text-align: center;
  margin-bottom: 1rem;
  color: #333;
  font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
  font-weight: 600;
  font-size: 1.1rem; /* profile-info-card의 텍스트 크기와 비슷하게 */
  letter-spacing: -0.02em;
  position: relative;
}

.graph-title::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  border-radius: 1px;
}

</style>