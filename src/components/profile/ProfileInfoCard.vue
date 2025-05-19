<!-- components/ProfileInfoCard.vue -->
<template>
  <div class="profile-info-card animate-on-scroll">
    <!-- ProfileRing 컴포넌트 사용 -->
    <div class="profile-avatar-container">
      <ProfileRing
          :profile-image-url="profile.profileImageUrl"
          :base-score="profile.baseScore || 0"
          :size="120"
          :stroke-width="3"
          progress-color="#a5d6a7"
          alt-text="프로필 이미지"
      />
    </div>

    <h2 class="profile-name">{{ profile.userName }}</h2>
    <!-- 계정 정보(@account) 추가 -->
    <div class="account-info">
      <span class="account-value">@{{ profile.account }}</span>
    </div>

    <div v-if="isCurrentUser" class="edit-buttons">
      <button @click="$emit('edit-info')" class="edit-button">계정정보 수정</button>
      <button @click="$emit('edit-body')" class="edit-button">신체정보 수정</button>
    </div>

    <div class="score-box">
      <div class="score-item">
        <div class="score-count">{{ profile.totalScore }}</div>
        <div class="score-label">총 점수</div>
      </div>
      <div class="score-item">
        <div class="score-count">{{ profile.baseScore }}</div>
        <div class="score-label">기본 점수</div>
      </div>
    </div>

    <div class="profile-stats">
      <div class="stat-item" @click="$emit('open-follow-modal', 'follower')">
        <div class="stat-count">{{ profile.followerCount }}</div>
        <div class="stat-label">팔로워</div>
      </div>
      <div class="stat-item" @click="$emit('open-follow-modal', 'following')">
        <div class="stat-count">{{ profile.followingCount }}</div>
        <div class="stat-label">팔로잉</div>
      </div>
    </div>

    <div v-if="!isCurrentUser" class="follow-button-container">
      <button
          v-if="!profile.following"
          @click="$emit('toggle-follow')"
          class="follow-button">팔로우</button>
      <button
          v-else
          @click="$emit('toggle-follow')"
          class="unfollow-button">언팔로우</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import ProfileRing from '@/components/profile/ProfileRing.vue';

defineProps({
  profile: {
    type: Object,
    required: true
  },
  isCurrentUser: {
    type: Boolean,
    default: false
  }
});

defineEmits(['edit-info', 'edit-body', 'toggle-follow', 'open-follow-modal']);

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
.account-info {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 0.8rem; /* 아래 여백 추가 */
}

.account-value {
  color: #666;
}

.edit-buttons {
  display: flex;
  gap: 0.6rem;
  margin: 0.8rem 0;
  justify-content: center;
}

.profile-info-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
  padding: 1.2rem;
  text-align: center;
  margin-bottom: 1.2rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}

.profile-info-card:hover {
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

/* 프로필 아바타 컨테이너 - ProfileRing을 위한 래퍼 */
.profile-avatar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.profile-name {
  font-size: 1.3rem;
  font-weight: bold;
  color: #222;
  margin: 0.4rem 0 0.2rem; /* 아래 마진 줄임 (0.8rem → 0.2rem) */
}

.edit-button {
  padding: 6px 14px;
  background-color: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 16px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.edit-button:hover {
  background-color: #f9f9f9;
  transform: translateY(-1px);
}

.score-box {
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
  padding: 0.8rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
}

.score-item {
  flex: 1;
  cursor: default;
}

.score-count {
  font-size: 1.3rem;
  font-weight: 700;
  color: #222;
  margin-bottom: 0.2rem;
}

.score-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  margin: 1.2rem 0;
  text-align: center;
}

.stat-item {
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.4rem 0;
  border-radius: 6px;
}

.stat-item:hover {
  transform: translateY(-2px);
  background-color: #f2f2f2;
}

.stat-count {
  font-size: 1.3rem;
  font-weight: 700;
  color: #222;
  margin-bottom: 0.2rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.follow-button-container {
  margin-top: 1rem;
}

.follow-button,
.unfollow-button {
  padding: 6px 18px;
  border-radius: 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.follow-button {
  background-color: #007bff;
  color: white;
  border: none;
}

.follow-button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

.unfollow-button {
  background-color: #ff6b6b;
  color: white;
  border: none;
}

.unfollow-button:hover {
  background-color: #ff4d4d;
  transform: translateY(-2px);
}
</style>