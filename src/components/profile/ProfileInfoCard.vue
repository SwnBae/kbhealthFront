<!-- components/ProfileInfoCard.vue -->
<template>
  <div class="profile-info-card">
    <img :src="profile.profileImageUrl" alt="프로필 이미지" class="profile-image" />
    <h2>{{ profile.userName }}</h2>

    <div v-if="isCurrentUser">
      <div class="edit-buttons">
        <button @click="$emit('edit-info')" class="edit-button">계정정보 수정</button>
        <button @click="$emit('edit-body')" class="edit-button">신체정보 수정</button>
      </div>
    </div>

    <div class="score-box">
      <div class="score-item">
        <span>총 점수</span>
        <strong>{{ profile.totalScore }}</strong>
      </div>
      <div class="score-item">
        <span>기본 점수</span>
        <strong>{{ profile.baseScore }}</strong>
      </div>
    </div>

    <div class="profile-stats">
      <div class="stat-item" @click="$emit('open-follow-modal', 'following')">
        <strong>팔로잉</strong><br/>
        {{ profile.followingCount }}
      </div>
      <div class="stat-item" @click="$emit('open-follow-modal', 'follower')">
        <strong>팔로워</strong><br/>
        {{ profile.followerCount }}
      </div>
    </div>

    <div v-if="!isCurrentUser">
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
</script>

<style scoped>
.profile-info-card {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 0.9rem; /* 전체 글씨 크기 소폭 축소 */
}

.profile-image {
  width: 40%; /* 더 작게 */
  max-width: 120px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto 0.8rem;
  display: block;
}

.edit-buttons {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.8rem;
  justify-content: center;
}

.edit-button {
  background-color: #f0f0f0;
  color: black;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.75rem;
  transition: background-color 0.2s ease;
}

.edit-button:hover {
  background-color: #c0c0c0;
}

.score-box {
  display: flex;
  justify-content: space-around;
  margin: 1.2rem 0;
  padding: 0.8rem;
  background-color: #fafafa;
  border-radius: 0.6rem;
  border: 1px solid #eee;
  font-size: 1rem;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #333;
}

.score-item strong {
  font-size: 1.4rem;
  color: #000;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 1.2rem;
  font-size: 0.95rem;
  cursor: pointer;
}

.stat-item {
  flex: 1;
  text-align: center;
  font-weight: bold;
  padding: 0.4rem 0.8rem;
  border-radius: 0.4rem;
  transition: background-color 0.2s;
}

.stat-item:hover {
  background-color: #f0f0f0;
  color: #007bff;
}

.follow-button,
.unfollow-button {
  padding: 0.45rem 0.9rem;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-top: 0.8rem;
}

.follow-button {
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}

.follow-button:hover {
  background-color: #0056b3;
}

.unfollow-button {
  background-color: #ff4d4d;
  color: white;
  border: none;
  cursor: pointer;
}

.unfollow-button:hover {
  background-color: #e60000;
}

</style>