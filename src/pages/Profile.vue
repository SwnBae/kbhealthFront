<template>
  <div v-if="isLoading">로딩 중...</div>
  <div v-else-if="!profile">로그인 상태가 아닙니다. 로그인 화면으로 이동합니다.</div>
  <div v-else class="profile">
    <h2>{{ profile.userName }}님의 프로필</h2>

    <!-- 프로필 정보 출력 -->
    <div class="profile-info">
      <p><strong>회원 ID:</strong> {{ profile.memberId }}</p>
      <p><strong>총 점수:</strong> {{ profile.totalScore }}</p>
      <p><strong>기본 점수:</strong> {{ profile.baseScore }}</p>
      <p><strong>프로필 이미지:</strong> <img :src="profile.profileImageUrl" alt="프로필 이미지" class="profile-image" /></p>
      <p><strong>팔로잉 수:</strong> <span @click="openFollowModal('following')">{{ profile.followingCount }}</span></p>
      <p><strong>팔로워 수:</strong> <span @click="openFollowModal('follower')">{{ profile.followerCount }}</span></p>

      <!-- Follow/Unfollow Button -->
      <div v-if="!isCurrentUser">
        <button
            v-if="!profile.following"
            @click="toggleFollow"
            class="follow-button">
          팔로우
        </button>
        <button
            v-else
            @click="toggleFollow"
            class="unfollow-button">
          언팔로우
        </button>
      </div>

    </div>

    <!-- 오늘의 영양 달성률과 최근 10일간 점수 출력 (가로로 나란히 배치) -->
    <div class="charts">
      <div class="nutrition-achievement">
        <h3>오늘의 영양 달성률</h3>
        <NutritionRadar :data="profile.todayAchievement" />
      </div>
      <div class="last-10-days-scores">
        <h3>최근 10일 간 점수</h3>
        <ScoreLineChart :series="profile.last10DaysScores" />
      </div>
    </div>

    <!-- 팔로잉/팔로워 모달 -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <h3>{{ modalTitle }} 목록</h3>
        <ul>
          <li v-for="user in followList" :key="user.followId" @click="goToProfile(user.account)">
            <img :src="user.profileImageUrl" alt="profile image" class="modal-profile-image" />
            <span>{{ user.userName }} | 총 점수: {{ user.totalScore }} | 최근 10일 점수: {{ user.baseScore }}</span>
          </li>
        </ul>
        <button @click="closeModal">닫기</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import userStore from "@/scripts/store";
import NutritionRadar from "@/components/NutritionRadar.vue";
import ScoreLineChart from "@/components/ScoreLineChart.vue";

const profile = ref(null);
const isLoading = ref(true);
const route = useRoute();
const router = useRouter(); // 라우터 사용
const showModal = ref(false); // 모달 상태
const modalTitle = ref(''); // 모달 제목 (팔로잉 / 팔로워)
const followList = ref([]); // 팔로잉 / 팔로워 리스트
const isCurrentUser = ref(false); // 현재 사용자가 자신을 보고 있는지 여부

const check = async () => {
  try {
    const { data } = await axios.get(`/api/auth/check`);
    if (data) {
      userStore.commit("setCurrentMember", data);
      const account = route.params.account || data.account;
      await fetchProfile(account);
    } else {
      profile.value = null;
    }
  } catch (error) {
    profile.value = null;
  } finally {
    isLoading.value = false;
  }
};

const fetchProfile = async (account) => {
  try {
    const { data } = await axios.get(`/api/profile/${account}`);
    profile.value = data;
    isCurrentUser.value = data.memberId === userStore.state.currentMember.id; // 현재 사용자 프로필인지 확인
  } catch (error) {
    console.error("프로필 데이터를 가져오는 데 실패했습니다.", error);
    profile.value = null;
  }
};

const openFollowModal = async (type) => {
  modalTitle.value = type === 'following' ? '팔로잉' : '팔로워';
  try {
    const { data } = await axios.get(`/api/follow/${type}List/${profile.value.memberId}`);
    followList.value = data;
  } catch (error) {
    console.error(`${modalTitle.value} 목록을 가져오는 데 실패했습니다.`, error);
    followList.value = [];
  }
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const goToProfile = (account) => {
  router.push(`/profile/${account}`).then(() => {
    location.reload(); // 프로필 페이지로 이동 후 새로고침
  }).catch((error) => {
    console.error('Error navigating to profile:', error);
  });
};

// 팔로우/언팔로우 버튼 기능
const toggleFollow = async () => {
  try {
    if (profile.value.following) {
      await axios.delete(`/api/follow/following/${profile.value.memberId}`);
      profile.value.following = false;
    } else {
      await axios.post(`/api/follow/following/${profile.value.memberId}`);
      profile.value.following = true;
    }

    fetchProfile(route.params.account);
  } catch (error) {
    console.error('팔로우/언팔로우 처리 중 오류가 발생했습니다.', error);
  }
};

watch(() => route.params.account, () => {
  check();
});

onMounted(() => {
  check();
});
</script>



<style scoped>
/* 전체 프로필 컨테이너 */
.profile {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', sans-serif;
  color: #333;
}

/* 프로필 정보 카드 */
.profile-info {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
  display: grid;
  gap: 1rem;
}

.profile-info p {
  margin: 0;
  font-size: 1rem;
}

.profile-info strong {
  display: inline-block;
  width: 120px;
}

/* 프로필 이미지 스타일 */
.profile-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ccc;
}

/* 차트 섹션 */
.charts {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: space-between;
}

.nutrition-achievement,
.last-10-days-scores {
  flex: 1 1 48%;
  background-color: #ffffff;
  border: 1px solid #ddd;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.charts {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
}

/* 반응형 대응 */
@media (max-width: 768px) {
  .charts {
    flex-direction: column;
  }

  .nutrition-achievement,
  .last-10-days-scores {
    flex: 1 1 100%;
  }

  .profile-info {
    padding: 1.5rem;
  }
}

/* 모달 스타일 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 1rem;
  max-width: 600px;
  width: 100%;
}

.modal-profile-image {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.modal ul {
  list-style-type: none;
  padding: 0;
}

.modal li {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  cursor: pointer;
}

.modal li:hover {
  background-color: #f0f0f0;
  border-radius: 5px;
  padding: 0.5rem;
}

/* 팔로우/언팔로우 버튼 색상 */
.follow-button {
  background-color: #007bff; /* 파랑 */
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
}

.follow-button:hover {
  background-color: #0056b3; /* 파랑 - hover 상태 */
}

.unfollow-button {
  background-color: #ff4d4d; /* 빨강 */
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
}

.unfollow-button:hover {
  background-color: #e60000; /* 빨강 - hover 상태 */
}

button:hover {
  background-color: #0056b3;
}
</style>

