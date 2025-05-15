<!--
파일 위치: @/components/feed/SkeletonPost.vue
로딩 상태를 위한 게시물 스켈레톤 컴포넌트
-->
<template>
  <div class="skeleton-post">
    <!-- 작성자 스켈레톤 -->
    <div class="skeleton-header">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-user-info">
        <div class="skeleton-username"></div>
        <div class="skeleton-location"></div>
      </div>
    </div>
    
    <!-- 이미지 스켈레톤 -->
    <div class="skeleton-image"></div>
    
    <!-- 액션 스켈레톤 -->
    <div class="skeleton-actions">
      <div class="skeleton-action"></div>
      <div class="skeleton-action"></div>
    </div>
    
    <!-- 내용 스켈레톤 -->
    <div class="skeleton-content">
      <div class="skeleton-title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  </div>
</template>

<script setup>
// 스켈레톤 컴포넌트는 props가 필요 없음
</script>

<style scoped>
.skeleton-post {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
  overflow: hidden;
  padding: 0;
  position: relative;
}

/* 공통 스켈레톤 애니메이션 */
@keyframes skeleton-loading {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
}

.skeleton-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-user-info {
  margin-left: 12px;
  flex: 1;
}

.skeleton-username {
  width: 120px;
  height: 16px;
  margin-bottom: 6px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-location {
  width: 80px;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 1/1;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-actions {
  display: flex;
  padding: 12px 16px;
  gap: 16px;
}

.skeleton-action {
  height: 32px;
  width: 80px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-content {
  padding: 0 16px 16px;
}

.skeleton-title {
  height: 20px;
  width: 80%;
  margin-bottom: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-line {
  height: 14px;
  width: 100%;
  margin-bottom: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-line.short {
  width: 70%;
}

@media (max-width: 480px) {
  .skeleton-post {
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .skeleton-header {
    padding: 12px;
  }

  .skeleton-content {
    padding: 0 12px 12px;
  }
}
</style>