<template>
  <teleport to="body">
    <div ref="modalRef" class="modal" @click.self="closeOverlay">
      <div class="modal-content animate-on-scroll in-view" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ title }} 목록</h3>
          <button class="close-icon" @click="closeModal">✕</button>
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
               @click="goToProfile(user.account)">
            <div class="profile-cell">
              <!-- ProfileRing 컴포넌트 사용 -->
              <ProfileRing
                :profile-image-url="user.profileImageUrl"
                :base-score="user.baseScore || 0"
                :size="48"
                :stroke-width="3"
                progress-color="#a5d6a7"
                alt-text="프로필 이미지"
                class="profile-avatar"
              />
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
  </teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import ProfileRing from '@/components/profile/ProfileRing.vue';

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

const emit = defineEmits(['close', 'go-to-profile']);

const searchQuery = ref('');
const filteredList = ref([]);
const modalRef = ref(null);
const scrollbarWidth = ref(0);
const savedScrollY = ref(0);

// 스크롤바 너비 계산
const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

const lockScroll = () => {
  // 현재 스크롤 위치 저장
  savedScrollY.value = window.scrollY;

  // 스크롤바 너비 계산
  scrollbarWidth.value = getScrollbarWidth();

  // body에 overflow: hidden을 적용하여 스크롤 방지
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;
};

// 스크롤 해제 함수 - DietDetailModal 방식으로 변경
const unlockScroll = () => {
  // body에서 overflow: hidden 제거
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};

// 모달 설정 - 개선된 스크롤 처리
const setupModal = () => {
  // 모달이 열리기 전 스크롤 잠금
  lockScroll();

  // 애니메이션 요소에 in-view 클래스 추가
  const elements = document.querySelectorAll(".animate-on-scroll");
  elements.forEach(el => {
    if (!el.classList.contains('in-view')) {
      el.classList.add('in-view');
    }
  });

  // 모달 애니메이션 클래스 추가
  if (modalRef.value) {
    modalRef.value.classList.add('fadeIn');
    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.add('popIn');
    }
  }

  // 모달 리스트 초기 필터링
  filterFollowList();
};

onMounted(() => {
  setupModal();
});

onBeforeUnmount(() => {
  unlockScroll();
});

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

// 닫기 함수
const closeModal = () => {
  // 닫기 애니메이션 추가
  if (modalRef.value) {
    modalRef.value.classList.remove('fadeIn');
    modalRef.value.classList.add('fadeOut');

    const contentEl = modalRef.value.querySelector('.modal-content');
    if (contentEl) {
      contentEl.classList.remove('popIn');
      contentEl.classList.add('popOut');
    }

    // 애니메이션 완료 후 모달 닫기 및 스크롤 해제
    setTimeout(() => {
      unlockScroll(); // 스크롤 해제만 하고 window.scrollTo() 호출 제거
      emit('close');
    }, 300);
  } else {
    unlockScroll(); // 스크롤 해제만 하고 window.scrollTo() 호출 제거
    emit('close');
  }
};

// 오버레이 클릭 시 모달 닫기
const closeOverlay = (event) => {
  // 모달 내부가 아닌 오버레이 영역 클릭 시에만 닫기
  if (event.target.classList.contains('modal')) {
    closeModal();
  }
};

const goToProfile = (account) => {
  // 부모 컴포넌트에게 이동 요청 전달 (모달이 닫히기 전에 이벤트 발생)
  emit('go-to-profile', account);

  // 모달 닫기
  closeModal();
};
</script>

<style scoped>
:root {
  --scrollbar-width: 0px;
}

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
}

.modal.fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

.modal.fadeOut {
  animation: fadeOut 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
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

.modal-content.popIn {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.modal-content.popOut {
  animation: popOut 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes popOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.95);
  }
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

/* ProfileRing 컴포넌트를 위한 스타일 */
.profile-avatar {
  flex-shrink: 0;
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