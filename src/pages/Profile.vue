
<!-- Profile.vue -->
<template>
  <div v-if="isLoading">로딩 중...</div>
  <div v-else-if="!profile">로그인 상태가 아닙니다. 로그인 화면으로 이동합니다.</div>
  <div v-else class="profile">
    <!-- 좌측: 유저 정보 카드 -->
    <ProfileSidebar
        :profile="profile"
        :isCurrentUser="isCurrentUser"
        @edit-info="openEditInfoModal"
        @edit-body="openEditBodyModal"
        @toggle-follow="toggleFollow"
        @open-follow-modal="openFollowModal"
    />

    <!-- 우측 영역 -->
    <ProfileMain />

    <!-- 모달 컴포넌트들 -->
    <FollowModal
        v-if="showModal"
        :title="modalTitle"
        :followList="followList"
        @close="closeModal"
        @go-to-profile="goToProfile"
    />

    <EditInfoModal
        v-if="showEditInfoModal"
        v-model:editInfo="editInfo"
        @close="showEditInfoModal = false"
        @submit="submitEditInfo"
    />

    <EditBodyModal
        v-if="showEditBodyModal"
        v-model:editBodyInfo="editBodyInfo"
        @close="showEditBodyModal = false"
        @submit="submitEditBodyInfo"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import userStore from "@/scripts/store";

// 컴포넌트 경로 수정
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue';
import ProfileMain from '@/components/profile/ProfileMain.vue';
import FollowModal from '@/components/profile/modals/FollowModal.vue';
import EditInfoModal from '@/components/profile/modals/EditInfoModal.vue';
import EditBodyModal from '@/components/profile/modals/EditBodyModal.vue';

const profile = ref(null);
const isLoading = ref(true);
const route = useRoute();
const router = useRouter();
const showModal = ref(false);
const modalTitle = ref('');
const followList = ref([]);
const isCurrentUser = ref(false);
const showEditInfoModal = ref(false);
const showEditBodyModal = ref(false);

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
    isCurrentUser.value = data.memberId === userStore.state.currentMember.id;
  } catch (error) {
    console.error("프로필 데이터를 가져오는 데 실패했습니다.", error);
    profile.value = null;
  }
};

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

const openEditInfoModal = () => {
  console.log('계정정보 모달 열기');
  showEditInfoModal.value = true;
  console.log('showEditInfoModal 값:', showEditInfoModal.value);
};

const openEditBodyModal = () => {
  console.log('신체정보 모달 열기');
  showEditBodyModal.value = true;
  console.log('showEditBodyModal 값:', showEditBodyModal.value);
};

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
    location.reload();
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
.profile {
  display: flex;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', sans-serif;
  color: #333;
}
</style>
