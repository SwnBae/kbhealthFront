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
  </teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

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

// 스크롤바 너비 계산
const getScrollbarWidth = () => {
  return window.innerWidth - document.documentElement.clientWidth;
};

// 모달 설정 - 개선된 스크롤 처리
const setupModal = () => {
  // 모달이 열리기 전의 스크롤 위치 저장
  const scrollY = window.scrollY;

  // 스크롤바 너비 계산
  scrollbarWidth.value = getScrollbarWidth();

  // CSS 변수로 패딩 설정 (스크롤바 자리 대체)
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth.value}px`);

  // 현재 스크롤 위치를 유지하면서 스크롤 방지
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.style.paddingRight = `${scrollbarWidth.value}px`;

  // 애니메이션 요소에 in-view 클래스 추가
  const elements = document.querySelectorAll(".animate-on-scroll");
  elements.forEach(el => {
    if (!el.classList.contains('in-view')) {
      el.classList.add('in-view');
    }
  });

  // 모달에 fadeIn 클래스 추가
  if (modalRef.value) {
    modalRef.value.classList.add('fadeIn');
    modalRef.value.querySelector('.modal-content').classList.add('popIn');
  }

  // 모달 리스트 초기 필터링
  filterFollowList();
};

onMounted(() => {
  setupModal();
});

onBeforeUnmount(() => {
  // 컴포넌트 제거 시 원래 상태로 복원
  resetBodyStyles();
});

// 스타일 초기화 함수
const resetBodyStyles = () => {
  // 원래 스크롤 위치 복원
  const scrollY = parseInt(document.body.style.top || '0', 10) * -1;

  // 모든 스타일 초기화
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';
  document.documentElement.style.setProperty('--scrollbar-width', '0px');

  // 스크롤 위치 복원
  window.scrollTo(0, scrollY);
};

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

    // 애니메이션 완료 후 모달 닫기 및 스타일 초기화
    setTimeout(() => {
      resetBodyStyles();
      emit('close');
    }, 300); // 애니메이션 시간에 맞춰 조정
  } else {
    resetBodyStyles();
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

// 프로필로 이동 함수 - 모달 닫고 이동
const goToProfile = (account) => {
  // 모달 닫기 후 프로필 이동
  closeModal();
  // 부모 컴포넌트에게 이동 요청 전달
  setTimeout(() => {
    emit('go-to-profile', account);
  }, 300); // 애니메이션 완료 후 이동
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