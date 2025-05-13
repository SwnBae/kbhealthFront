<template>
  <div v-if="isLoading">로딩 중...</div>
  <div v-else-if="!profile">로그인 상태가 아닙니다. 로그인 화면으로 이동합니다.</div>
  <div v-else class="profile">

    <!-- 좌측: 유저 정보 카드 -->
    <aside class="profile-sidebar">
      <div class="profile-info-card">
        <img :src="profile.profileImageUrl" alt="프로필 이미지" class="profile-image" />
        <h2>{{ profile.userName }}</h2>
        <div v-if="isCurrentUser">
          <div class="edit-buttons">
            <button @click="showEditInfoModal = true" class="edit-button">계정정보 수정</button>
            <button @click="showEditBodyModal = true" class="edit-button">신체정보 수정</button>
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
          <div class="stat-item" @click="openFollowModal('following')">
            <strong>팔로잉</strong><br/>
            {{ profile.followingCount }}
          </div>
          <div class="stat-item" @click="openFollowModal('follower')">
            <strong>팔로워</strong><br/>
            {{ profile.followerCount }}
          </div>
        </div>
        <div v-if="!isCurrentUser">
          <button v-if="!profile.following" @click="toggleFollow" class="follow-button">팔로우</button>
          <button v-else @click="toggleFollow" class="unfollow-button">언팔로우</button>
        </div>
      </div>

      <!-- 그래프 영역 -->
      <div class="profile-graphs">
        <div class="card">
          <h3>오늘의 영양 달성률</h3>
          <NutritionRadar :data="profile.todayAchievement" />
        </div>
        <div class="card">
          <h3>최근 10일 간 점수</h3>
          <ScoreLineChart :series="profile.last10DaysScores" />
        </div>
      </div>
    </aside>

    <!-- 우측 영역 -->
    <section class="profile-main">
      <!-- 📌 향후 게시물 피드 영역 -->
      <div class="card">
        <h3>개인 게시물 (예정)</h3>
        <p>향후 여기에 게시물이 들어갈 예정입니다.</p>
      </div>
    </section>

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

    <!-- 계정정보 수정 모달 -->
    <div v-if="showEditInfoModal" class="modal" @click.self="showEditInfoModal = false">
      <div class="modal-content">
        <h3>계정정보 수정</h3>
        <form @submit.prevent="submitEditInfo">
          <label>닉네임: <input v-model="editInfo.userName" required /></label><br/>
          <label>비밀번호: <input type="password" v-model="editInfo.password" required /></label><br/>
          <label>프로필 이미지 URL: <input v-model="editInfo.profileImageUrl" /></label><br/>
          <button type="submit">저장</button>
          <button type="button" @click="showEditInfoModal = false">취소</button>
        </form>
      </div>
    </div>

    <!-- 신체정보 수정 모달 -->
    <div v-if="showEditBodyModal" class="modal" @click.self="showEditBodyModal = false">
      <div class="modal-content">
        <h3>신체정보 수정</h3>
        <form @submit.prevent="submitEditBodyInfo">
          <label>키(cm): <input type="number" v-model.number="editBodyInfo.height" required /></label><br/>
          <label>몸무게(kg): <input type="number" v-model.number="editBodyInfo.weight" required /></label><br/>
          <label>성별:
            <select v-model="editBodyInfo.gender" required>
              <option disabled value="">선택</option>
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
            </select>
          </label><br/>
          <label>나이: <input type="number" v-model.number="editBodyInfo.age" required /></label><br/>
          <button type="submit">저장</button>
          <button type="button" @click="showEditBodyModal = false">취소</button>
        </form>
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
const showEditInfoModal = ref(false);
const showEditBodyModal = ref(false);

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

// 계정정보 수정 폼 데이터
const editInfo = ref({
  userName: '',
  password: '',
  profileImageUrl: ''
});

// 신체정보 수정 폼 데이터
const editBodyInfo = ref({
  height: null,
  weight: null,
  gender: '',
  age: null
});

// 모달 열릴 때 현재 데이터 채워 넣기
watch(showEditInfoModal, (val) => {
  if (val && profile.value) {
    editInfo.value = {
      userName: profile.value.userName,
      password: '',
      profileImageUrl: profile.value.profileImageUrl
    };
  }
});

watch(showEditBodyModal, (val) => {
  if (val && profile.value) {
    editBodyInfo.value = {
      height: profile.value.height || null,
      weight: profile.value.weight || null,
      gender: profile.value.gender || '',
      age: profile.value.age || null
    };
  }
});

// 계정정보 수정 제출
const submitEditInfo = async () => {
  try {
    const payload = {
      id: profile.value.memberId,
      ...editInfo.value
    };
    await axios.post('/api/profile/editinfo', payload);
    alert('계정정보 수정 완료');
    showEditInfoModal.value = false;
    location.reload();
  } catch (error) {
    alert('계정정보 수정 실패');
    console.error(error);
  }
};

// 신체정보 수정 제출
const submitEditBodyInfo = async () => {
  try {
    const payload = {
      id: profile.value.memberId,
      ...editBodyInfo.value
    };
    await axios.post('/api/profile/editbodyinfo', payload);
    alert('신체정보 수정 완료');
    showEditBodyModal.value = false;
    location.reload();
  } catch (error) {
    alert('신체정보 수정 실패');
    console.error(error);
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
  display: flex;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', sans-serif;
  color: #333;
}

.profile-image {
  width: 50%;
  max-width: 150px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto 1rem;
  display: block;
}

.edit-buttons {
  display: flex;
  gap: 0.5rem; /* 버튼 사이 간격 */
  margin-top: 1rem;
  justify-content: center;
}

.edit-button {
  background-color: #f0f0f0;
  color: black;
  border: none;
  padding: 0.5rem 1rem;
  margin: 0.3rem 0;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8rem;
  transition: background-color 0.2s ease;
}

.edit-button:hover {
  background-color: #c0c0c0;
}


/* 좌측 영역 (유저 정보 카드 및 그래프) */
.profile-sidebar {
  width: 30%;
  height: 80vh;  /* 높이를 제한하여 스크롤을 적용 */
  overflow-y: auto;  /* 세로 스크롤 */
  padding-right: 1rem;
}

.score-box {
  display: flex;
  justify-content: space-around;
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: #fafafa;
  border-radius: 0.75rem;
  border: 1px solid #eee;
  font-size: 1.1rem;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #333;
}

.score-item strong {
  font-size: 1.6rem;
  color: #000;
}


/* 유저 정보 카드 스타일 */
.profile-info-card {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
  margin-bottom: 2rem;
}

/* 팔로우 */
.profile-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}

.stat-item {
  flex: 1;
  text-align: center;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.stat-item:hover {
  background-color: #f0f0f0;
  color: #007bff;
}

/* 그래프 영역 */
.profile-graphs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 카드 스타일 */
.card {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 1rem;
}

/* 오른쪽 전체 영역 */
.profile-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  height: 80vh;  /* 높이를 제한하여 스크롤을 적용 */
  overflow-y: auto;  /* 세로 스크롤 */
}

/* 게시물 카드 */
.profile-main .card {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 1rem;
}

/* 모달 스타일 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: #333;
}

.modal-content form label {
  display: block;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  color: #444;
}

.modal-content input,
.modal-content select {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.3rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.modal-content button {
  margin-top: 1rem;
  margin-right: 0.5rem;
  padding: 0.6rem 1.2rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.modal-content button[type="button"] {
  background-color: #ccc;
  color: #333;
}

.modal-content button:hover {
  opacity: 0.9;
}

.modal-profile-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 10px;
  vertical-align: middle;
}

.modal li {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  cursor: pointer;
}

.modal li:hover {
  background-color: #f0f0f0;
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
