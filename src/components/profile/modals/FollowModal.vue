<!-- components/profile/modals/FollowListModal.vue -->
<template>
  <div class="modal" @click.self="$emit('close')">
    <div class="modal-content animate-on-scroll in-view">
      <div class="modal-header">
        <h3 class="modal-title">{{ title }} 목록</h3>
        <button class="close-icon" @click="$emit('close')">✕</button>
      </div>

      <!-- 검색 필드 추가 -->
      <div class="search-container">
        <input
            type="text"
            v-model="searchQuery"
            placeholder="계정명 또는 사용자명으로 검색"
            class="search-input"
            @input="filterFollowList"
        />
        <button class="search-button" @click="clearSearch">
          <span v-if="searchQuery">✕</span>
        </button>
      </div>

      <div class="follow-list-container">
        <div v-if="filteredList.length === 0" class="no-results">
          검색 결과가 없습니다.
        </div>
        <div v-for="user in filteredList"
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
              <div class="account-info">
                <span class="account-value">@{{ user.account }}</span>
              </div>
              <div class="score-info">
                <span class="score-label">총 점수:</span> <span class="score-value">{{ user.totalScore }}</span>
                <span class="score-separator">|</span>
                <span class="score-label">최근 10일:</span> <span class="score-value">{{ user.baseScore }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  followList: {
    type: Array,
    default: () => []
  }
});

const searchQuery = ref('');
const filteredList = ref([]);

// 검색 결과 필터링 함수
const filterFollowList = () => {
  if (!searchQuery.value) {
    filteredList.value = props.followList;
    return;
  }

  const query = searchQuery.value.toLowerCase();
  filteredList.value = props.followList.filter(user =>
      user.account.toLowerCase().includes(query) ||
      user.userName.toLowerCase().includes(query)
  );
};

// 검색어 초기화
const clearSearch = () => {
  searchQuery.value = '';
  filterFollowList();
};

// followList가 변경되면 필터 다시 적용
watch(() => props.followList, () => {
  filterFollowList();
}, { immediate: true });

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
  padding: 1.5rem 1.5rem;
  padding-top: 0.3rem;
  padding-right: 1rem;/* 상단 여백 줄임 */
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e6e6e6 #f5f5f5;
  /* 스크롤바가 있어도 둥근 모서리 유지 */
  border-radius: 12px;
  mask-image: radial-gradient(white, black);
  -webkit-mask-image: -webkit-radial-gradient(white, black);
}

/* 스크롤바 스타일 수정 */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
  margin: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #e6e6e6;
  border-radius: 3px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px; /* 여백 줄임 */
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
  position: relative;
}

.modal-title {
  font-size: 24px; /* 폰트 크기 약간 줄임 */
  font-weight: bold;
  color: #222;
  text-align: left;
  margin: 0;
}

.close-icon {
  font-size: 18px;
  color: #888;
  background: none;
  border: none;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-icon:hover {
  background-color: #f0f0f0;
  color: #333;
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

/* 검색 컨테이너 스타일 */
.search-container {
  position: relative;
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: #a5d6a7;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.search-button {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 16px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.3s ease;
}

.search-button:hover {
  color: #666;
}

.follow-list-container {
  margin-top: 20px;
}

.no-results {
  text-align: center;
  padding: 30px 0;
  color: #888;
  font-size: 15px;
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

.account-info {
  font-size: 13px;
  color: #888;
  margin-top: 2px;
}

.account-value {
  color: #666;
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
</style>