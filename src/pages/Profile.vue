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
      <p><strong>팔로잉 수:</strong> {{ profile.followingCount }}</p>
      <p><strong>팔로워 수:</strong> {{ profile.followerCount }}</p>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import userStore from "@/scripts/store";

// 차트 컴포넌트 import
import NutritionRadar from "@/components/NutritionRadar.vue";
import ScoreLineChart from "@/components/ScoreLineChart.vue";

const profile = ref(null);
const isLoading = ref(true); // 로딩 상태를 관리하는 변수

const check = async () => {
  try {
    const {data} = await axios.get(`/api/auth/check`);
    if (data) {
      userStore.commit("setCurrentMember", data);
      await fetchProfile(data.account); // 프로필 데이터를 가져오는 함수 호출
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
    const {data} = await axios.get(`/api/profile/${account}`);
    profile.value = data;
  } catch (error) {
    console.error("프로필 데이터를 가져오는 데 실패했습니다.", error);
    profile.value = null;
  }
};

onMounted(() => {
  check(); // 앱이 처음 마운트될 때만 check() 호출
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
  min-height: 400px; /* ⬆ 최소 높이 증가 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* ⬅ 차트를 중앙에 정렬 */
  width: 100%;
}

.charts {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center; /* 중앙 정렬로 여백을 줄임 */
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
</style>





