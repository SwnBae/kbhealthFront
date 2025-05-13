<!-- components/ProfileMain.vue -->
<template>
  <section class="profile-main">
    <!-- 📌 향후 게시물 피드 영역 -->
    <div class="card">
      <h3>개인 게시물 (예정)</h3>
      <p>향후 여기에 게시물이 들어갈 예정입니다.</p>
    </div>
  </section>
</template>

<script setup>
// 현재 별도의 props나 emit이 필요 없지만 향후 확장성을 위해 빈 컴포넌트로 생성
</script>

<style scoped>
.profile-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  height: 80vh;
  overflow-y: auto;
}
</style>