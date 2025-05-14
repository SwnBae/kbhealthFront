<!-- components/profile/modals/FollowListModal.vue -->
<template>
  <div class="modal" @click.self="$emit('close')">
    <div class="modal-content animate-on-scroll in-view">
      <h3 class="modal-title">{{ title }} 목록</h3>
      <div class="follow-list-container">
        <div v-for="user in followList"
             :key="user.followId"
             class="follow-card animate-on-scroll in-view"
             @click="$emit('go-to-profile', user.account)">
          <div class="profile-cell">
            <div class="profile-container">
              <svg class="profile-ring" viewBox="0 0 36 36">
                <circle class="ring-bg" cx="18" cy="18" r="16" />
                <circle class="ring-progress" cx="18" cy="18" r="16"
                        :stroke-dasharray="`${(Math.min(1000, user.baseScore || 0) / 1000 * 100.48).toFixed(2)} 100.48`"
                        transform="rotate(-90 18 18)"
                />
              </svg>
              <img :src="user.profileImageUrl" alt="프로필 이미지" class="profile-img" />
            </div>
            <div class="user-details">
              <span class="nickname">{{ user.userName }}</span>
              <div class="score-info">
                <span class="score-label">총 점수:</span> <span class="score-value">{{ user.totalScore }}</span>
                <span class="score-separator">|</span>
                <span class="score-label">최근 10일:</span> <span class="score-value">{{ user.baseScore }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="button-container">
        <button type="button" class="close-button" @click="$emit('close')">닫기</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  followList: {
    type: Array,
    default: () => []
  }
});

defineEmits(['close', 'go-to-profile']);
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e6e6e6 #f5f5f5;
}

.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #e6e6e6;
  border-radius: 3px;
}

.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

.modal-title {
  font-size: 28px;
  font-weight: bold;
  color: #222;
  text-align: left;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
}

.follow-list-container {
  margin-top: 20px;
}

.follow-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.follow-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.profile-cell {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

.profile-container {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.profile-ring {
  position: absolute;
  width: 48px;
  height: 48px;
  top: 0;
  left: 0;
}

.ring-bg {
  fill: none;
  stroke: #f0f7f0;
  stroke-width: 3;
}

.ring-progress {
  fill: none;
  stroke: #a5d6a7;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}

.profile-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 1;
  border: 1px solid #f0f0f0;
}

.user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.nickname {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.score-info {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.score-label {
  color: #888;
}

.score-value {
  font-weight: 600;
  color: #555;
}

.score-separator {
  margin: 0 6px;
  color: #ddd;
}

.button-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.close-button {
  padding: 8px 20px;
  background-color: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.close-button:hover {
  background-color: #f9f9f9;
  transform: translateY(-2px);
}
</style>