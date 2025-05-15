<!--
수정된 Feed.vue - 기본 기능만 포함된 단순화 버전
-->
<template>
  <div class="feed-container">
    <!-- 작성 모달 -->
    <PostCreateModal
      :visible="showModal"
      @close="showModal = false"
      @posted="reloadFeed" 
    />

    <!-- 피드 목록 -->
    <div class="feed-wrapper">
      <!-- 로딩 중 표시 -->
      <div v-if="isLoading && posts.length === 0" class="loading-message">
        <div class="spinner"></div>
        <p>게시글을 불러오는 중...</p>
      </div>
      
      <!-- 게시물 목록 -->
      <div v-else>
        <!-- 게시물이 있을 때 -->
        <div v-if="posts.length > 0">
          <Post 
            v-for="(post, index) in posts" 
            :key="post.postId"
            :post="post"
            @update:post="updatePost(index, $event)"
            class="feed-item"
          />
        </div>
        
        <!-- 게시물이 없을 때 -->
        <div v-else class="no-posts">
          <div class="empty-state-icon">📭</div>
          <p>게시글이 없습니다.</p>
          <p class="empty-state-subtitle">첫 번째 게시글을 작성해보세요!</p>
          <button class="create-post-btn" @click="showModal = true">게시글 작성하기</button>
        </div>
      </div>

      <!-- 더 불러오는 중 표시 -->
      <div
        ref="sentinel"
        v-if="!isLastPage && posts.length > 0"
        class="loading-more"
      >
        <p>불러오는 중...</p>
      </div>
    </div>

    <!-- 플로팅 게시글 작성 버튼 -->
    <button 
      ref="floatingBtn" 
      class="create-post-floating-btn" 
      @click="showModal = true"
    >
      <span class="plus-icon">+</span>
      <span class="btn-text">게시글 작성</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PostCreateModal from '@/components/feed/PostCreateModal.vue';
import Post from '@/components/feed/Post.vue';

dayjs.extend(relativeTime);

const props = defineProps({
  apiUrl: {
    type: String,
    required: true
  }
});

// state
const posts = ref([]);
const page = ref(0);
const size = 5;
const isLastPage = ref(false);
const isLoading = ref(true);
const sentinel = ref(null);
const observer = ref(null);
const showModal = ref(false);
const floatingBtn = ref(null);

// 피드 불러오기
const loadPosts = async () => {
  if (posts.value.length > 0 && isLoading.value) return;
  
  try {
    isLoading.value = true;
    
    const res = await axios.get(props.apiUrl, {
      params: { page: page.value, size }
    });
    
    // 응답 데이터 처리 (API 응답 구조에 따라 조정)
    let newPosts = [];
    
    if (res.data && res.data.content) {
      // 페이징 응답 (Spring Data 스타일)
      newPosts = res.data.content;
      isLastPage.value = res.data.last;
    } else if (Array.isArray(res.data)) {
      // 배열 응답
      newPosts = res.data;
      isLastPage.value = newPosts.length < size;
    } else {
      console.error('지원되지 않는 API 응답 형식', res.data);
      return;
    }
    
    // 필요한 속성 추가
    const formattedPosts = newPosts.map(p => ({
      ...p,
      commentsVisible: false,
      likeAnimating: false
    }));
    
    posts.value.push(...formattedPosts);
    page.value++;
    
    // 개발용 로그
    console.log(`${formattedPosts.length}개의 게시글을 불러왔습니다.`);
    
    // 애니메이션 적용
    await nextTick();
    observeFeedAnimation();
  } catch (error) {
    console.error('피드 로딩 오류:', error);
    // 실패해도 조용히 처리 (UX를 위해)
  } finally {
    isLoading.value = false;
  }
};

// 피드 애니메이션
const observeFeedAnimation = () => {
  const els = document.querySelectorAll('.animate-on-scroll');
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('in-view');
      });
    },
    { threshold: 0.1 }
  );
  els.forEach(el => io.observe(el));
};

// 무한 스크롤
const initObserver = () => {
  observer.value = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && !isLastPage.value && !isLoading.value) {
        loadPosts();
      }
    },
    { threshold: 0.5 }
  );
  
  if (sentinel.value) {
    observer.value.observe(sentinel.value);
  }
};

// 새 게시물 작성 완료 처리 - handleNewPost 함수 주석 처리
/* 
const handleNewPost = (newPost) => {
  posts.value.unshift({
    ...newPost,
    commentsVisible: false,
    likeAnimating: false
  });
  
  showModal.value = false;
  
  // 스크롤을 위로 이동
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
*/

// 피드 새로고침 (PostCreateModal 컴포넌트에서 사용)
const reloadFeed = async () => {
  page.value = 0;
  posts.value = [];
  isLastPage.value = false;
  isLoading.value = true;
  await loadPosts();
};

// 개별 포스트 업데이트
const updatePost = (index, updatedPost) => {
  posts.value[index] = updatedPost;
};

// 호버 인텐트 기능 설정
const setupHoverIntent = () => {
  if (!floatingBtn.value) return;

  let leaveTimeout = null;

  // 마우스 호버 효과
  floatingBtn.value.addEventListener('mouseenter', () => {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      leaveTimeout = null;
    }
    floatingBtn.value.classList.add('expanded');
  });

  floatingBtn.value.addEventListener('mouseleave', () => {
    leaveTimeout = setTimeout(() => {
      if (floatingBtn.value) {
        floatingBtn.value.classList.remove('expanded');
      }
    }, 700);
  });
};

// 컴포넌트 마운트
onMounted(async () => {
  // 초기 게시글 로드
  await loadPosts();
  
  // 무한 스크롤 설정
  initObserver();

  // 버튼 효과 설정
  nextTick(() => {
    setupHoverIntent();
  });
});
</script>

<style scoped>
.feed-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  padding-bottom: 80px; /* 플로팅 버튼 공간 확보 */
}

.feed-wrapper {
  display: flex;
  flex-direction: column;
}

/* 로딩 상태 */
.loading-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #4caf50;
  animation: spin 1s infinite linear;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-message p {
  color: #666;
  font-size: 0.9rem;
}

.loading-more {
  text-align: center;
  padding: 20px;
  color: #666;
}

/* 빈 상태 */
.no-posts {
  text-align: center;
  padding: 60px 20px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.no-posts p {
  margin: 0 0 8px;
  font-size: 1.2rem;
  color: #555;
}

.empty-state-subtitle {
  font-size: 1rem !important;
  color: #888 !important;
  margin-bottom: 24px !important;
}

.create-post-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
}

.create-post-btn:hover {
  background-color: #388e3c;
  transform: translateY(-2px);
}

/* 플로팅 게시글 작성 버튼 */
.create-post-floating-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: #4caf50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition:
    width 0.5s ease,
    border-radius 0.5s ease,
    background-color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.3s ease;
  z-index: 1000;
  padding: 0;
}

.create-post-floating-btn:hover {
  background-color: #388e3c;
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.5);
}

/* 플러스 아이콘 */
.plus-icon {
  position: absolute;
  bottom: 4px;
  opacity: 1;
  font-size: 36px;
  font-weight: 400;
  transition: margin-right 0.5s ease, opacity 0.5s ease;
}

/* 버튼 텍스트 — 기본은 투명 */
.btn-text {
  position: absolute;
  opacity: 0;
  visibility: hidden;
  white-space: nowrap;
  transition: opacity 0.5s ease;
}

/* PC에서 호버링 개선 */
@media (min-width: 769px) {
  .create-post-floating-btn {
    overflow: hidden;
    width: 56px;
    transition:
      width 0.5s ease,
      border-radius 0.5s ease,     
      background-color 0.5s ease,
      box-shadow 0.5s ease,
      transform 0.5s ease;
  }

  /* 호버 시 버튼 확장 */
  .create-post-floating-btn:hover,
  .create-post-floating-btn.expanded {
    width: 150px; /* 더 넓게 확장 */
  }

  /* 호버 시 아이콘 위치 조정 */
  .create-post-floating-btn:hover .plus-icon,
  .create-post-floating-btn.expanded .plus-icon {
    opacity: 0;
  }

  /* 호버 시 텍스트 부드럽게 등장 */
  .create-post-floating-btn:hover .btn-text,
  .create-post-floating-btn.expanded .btn-text {
    opacity: 1;
    visibility: visible;
  }

  /* 가상 요소로 호버 영역 확장 */
  .create-post-floating-btn::after {
    content: '';
    position: absolute;
    top: -35px;
    left: -35px;
    right: -35px;
    bottom: -35px;
    z-index: -1;
  }
}

/* 반응형 디자인 추가 */
@media (max-width: 480px) {
  .feed-container {
    padding: 10px;
  }
  
  .create-post-floating-btn {
    bottom: 16px;
    right: 16px;
  }
  
  .no-posts {
    padding: 40px 16px;
  }
  
  .empty-state-icon {
    font-size: 48px;
  }
}
</style>