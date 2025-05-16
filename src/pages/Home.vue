<template>
  <div class="home-container">
    <!-- 팔로우 랭킹 섹션 -->
    <div class="following-ranking-section">
      <FollowingRanking :showTitle="true" />
    </div>
    
    <!-- 피드 블록 -->
    <FeedBlock apiUrl="/api/feed" />
  </div>
</template>

<script setup>
import FeedBlock from '@/components/feed/FeedBlock.vue';
import FollowingRanking from '@/components/feed/FollowingRanking.vue';
</script>

<style scoped>
.home-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
}

.following-ranking-section {
  margin-bottom: 24px;
  border-radius: 12px;
  background-color: #fff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

/* 모바일 반응형 스타일 */
@media (max-width: 768px) {
  .home-container {
    padding: 0 8px;
  }
  
  .following-ranking-section {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 8px;
  }
}
</style>