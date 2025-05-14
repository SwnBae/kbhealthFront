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
      <div
          v-for="post in posts"
          :key="post.postId"
          class="feed-card animate-on-scroll"
      >
        <!-- 작성자 -->
        <div class="user-info">
          <router-link
              :to="`/profile/${post.writerAccount}`"
              class="profile-container"
          >
            <svg class="profile-ring" viewBox="0 0 36 36">
              <circle class="ring-bg" cx="18" cy="18" r="16" />
              <circle
                  class="ring-progress"
                  cx="18"
                  cy="18"
                  r="16"
                  :stroke-dasharray="`${(
                  (Math.min(1000, post.baseScore || 0) / 1000) *
                  100.48
                ).toFixed(2)} 100.48`"
                  transform="rotate(-90 18 18)"
              />
            </svg>
            <img
                :src="getImageUrl(post.writerProfileImage)"
                class="profile-img"
                alt="profile"
            />
          </router-link>
          <router-link
              :to="`/profile/${post.writerAccount}`"
              class="username"
          >
            {{ post.writerName }}
          </router-link>
        </div>

        <!-- 본문 이미지 -->
        <img
            :src="getImageUrl(post.imageUrl)"
            class="post-img"
            alt="post"
        />

        <!-- 내용 -->
        <div class="post-content">
          <p class="title">{{ post.title }}</p>
          <p class="content">{{ post.content }}</p>
        </div>

        <!-- 액션 -->
        <div class="post-actions">
          <button class="like-btn" @click="toggleLike(post)">
            {{ post.liked ? '💖' : '🤍' }} {{ post.likeCount }}
          </button>
          <button class="comment-btn" @click="toggleComments(post)">
            💬 {{ post.commentCount }}
          </button>
        </div>

        <!-- 댓글 -->
        <transition name="expand-comment">
          <div v-if="post.commentsVisible" class="comment-list">
            <div
                class="comment-scroll"
                :ref="el => setCommentScrollEl(post, el)"
            >
              <p v-if="post.comments.length === 0" class="no-comment">
                댓글이 없습니다.
              </p>
              <transition-group name="fade-comment-item" tag="div">
                <div
                    v-for="comment in post.comments"
                    :key="comment.commentId"
                    class="comment-item"
                >
                  <router-link
                      :to="`/profile/${comment.writerAccount}`"
                      class="comment-writer"
                  >
                    {{ comment.writer }}
                  </router-link>
                  : {{ comment.comment }}
                </div>
              </transition-group>
              <div v-if="!post.lastCommentPage" class="comment-loading">
                불러오는 중...
              </div>
            </div>
            <div class="comment-input">
              <input
                  v-model="post.newComment"
                  type="text"
                  placeholder="댓글을 입력하세요"
                  class="comment-field"
              />
              <button
                  class="submit-comment"
                  @click="submitComment(post)"
              >
                등록
              </button>
            </div>
          </div>
        </transition>

        <!-- 작성 시간 -->
        <div class="created-time">
          {{ formatTime(post.createdAt) }}
        </div>
      </div>

      <!-- 로딩 / 빈 상태 -->
      <div v-if="posts.length === 0" class="no-posts">
        <p>게시글이 없습니다.</p>
      </div>
      <div
          ref="sentinel"
          v-if="!isLastPage && posts.length > 0"
          class="loading"
      >
        <p>불러오는 중...</p>
      </div>
    </div>

    <!-- 플로팅 게시글 작성 버튼 (오른쪽으로 이동) -->
    <button ref="floatingBtn" class="create-post-floating-btn" @click="showModal = true">
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

dayjs.extend(relativeTime);

const props = defineProps({
  apiUrl: {
    type: String,
    required: true
  }
})

// state
const posts = ref([]);
const page = ref(0);
const size = 5;
const isLastPage = ref(false);
const sentinel = ref(null);
const observer = ref(null);
const showModal = ref(false);
const floatingBtn = ref(null); // 플로팅 버튼에 대한 ref 추가

// 유틸
const formatTime = t => dayjs(t).fromNow();
const getImageUrl = url =>
    url && url.trim() !== '' ? url : '/images/default_post_image.png';

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

// 피드 불러오기
const loadPosts = async () => {
  try {
    const res = await axios.get(props.apiUrl, {
      params: { page: page.value, size }
    });
    const newPosts = res.data.content.map(p => ({
      ...p,
      comments: [],
      commentsVisible: false,
      newComment: '',
      commentPage: 0,
      lastCommentPage: false,
      isLoadingComments: false,
      commentScrollEl: null,
      _scrollBound: false
    }));
    posts.value.push(...newPosts);
    isLastPage.value = res.data.last;
    page.value++;
    await nextTick();
    observeFeedAnimation();
  } catch (e) {
    console.error('피드 로딩 오류', e);
  }
};

// 무한 스크롤
const initObserver = () => {
  observer.value = new IntersectionObserver(
      ([e]) => e.isIntersecting && !isLastPage.value && loadPosts(),
      { threshold: 1.0 }
  );
  sentinel.value && observer.value.observe(sentinel.value);
};

// 좋아요 토글
const toggleLike = async post => {
  try {
    const res = await axios.put(
        `/api/feed/${post.postId}/like`,
        null,
        { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );
    post.liked = res.data;
    post.likeCount += post.liked ? 1 : -1;
  } catch (e) {
    console.error('좋아요 실패', e);
  }
};

// 댓글 토글 & 페이징
const toggleComments = async post => {
  post.commentsVisible = !post.commentsVisible;
  if (post.commentsVisible && post.commentPage === 0) {
    await loadMoreComments(post);
    await nextTick();
    if (post.commentScrollEl && !post._scrollBound) {
      post.commentScrollEl.addEventListener('scroll', () => handleScroll(post));
      post._scrollBound = true;
    }
  }
};
const setCommentScrollEl = (post, el) => (post.commentScrollEl = el);
const handleScroll = post => {
  const el = post.commentScrollEl;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5 && !post.lastCommentPage) {
    loadMoreComments(post);
  }
};
const loadMoreComments = async post => {
  if (post.isLoadingComments || post.lastCommentPage) return;
  post.isLoadingComments = true;
  try {
    const res = await axios.get(`/api/feed/${post.postId}/commentList`, {
      params: { page: post.commentPage, size },
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
    });
    post.comments.push(...res.data.content);
    post.lastCommentPage = res.data.last;
    post.commentPage++;
  } catch (e) {
    console.error('댓글 불러오기 실패', e);
  } finally {
    post.isLoadingComments = false;
  }
};

// 댓글 등록
const submitComment = async post => {
  if (!post.newComment.trim()) return;
  try {
    await axios.post(`/api/feed/${post.postId}/comment`, { comment: post.newComment }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
    });
    post.comments = [];
    post.commentPage = 0;
    post.lastCommentPage = false;
    await loadMoreComments(post);
    post.newComment = '';
  } catch (e) {
    console.error('댓글 작성 실패', e);
  }
};

// 피드 새로고침
const reloadFeed = async () => {
  page.value = 0;
  posts.value = [];
  isLastPage.value = false;
  await loadPosts();
};

// 호버 인텐트 기능 설정
const setupHoverIntent = () => {
  if (!floatingBtn.value) return;

  let leaveTimeout = null;

  // 마우스가 버튼 위에 올라왔을 때
  floatingBtn.value.addEventListener('mouseenter', () => {
    // 떠나는 타이머가 있다면 취소
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      leaveTimeout = null;
    }

    // 확장 클래스 즉시 추가
    floatingBtn.value.classList.add('expanded');
  });

  // 마우스가 버튼에서 떠났을 때
  floatingBtn.value.addEventListener('mouseleave', () => {
    // 지연 시간 후 클래스 제거 (700ms 지연)
    leaveTimeout = setTimeout(() => {
      if (floatingBtn.value) {
        floatingBtn.value.classList.remove('expanded');
      }
    }, 700); // 0.7초 동안 확장 상태 유지
  });
};

// 라이프사이클
onMounted(async () => {
  await loadPosts();
  initObserver();

  // 호버 인텐트 설정 추가
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

/* 상단 작성 버튼 */
.feed-header {
  text-align: right;
  margin-bottom: 16px;
}
.create-post-btn {
  padding: 8px 14px;
  background-color: #4caf50;
  color: white;
  border: none;
  cursor: pointer;
  font-weight: bold;
}
.create-post-btn:hover {
  background-color: #388e3c;
}

/* 플로팅 게시글 작성 버튼 - 개선된 호버링 기능 */
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
  transition: margin-right 0.5s ease , opacity 0.5s ease;
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
  .create-post-floating-btn:hover {
    width: 150px; /* 더 넓게 확장 */
  }

  /* 호버 시 아이콘 위치 조정 */
  .create-post-floating-btn:hover .plus-icon {
    opacity: 0;
  }

  /* 호버 시 텍스트 부드럽게 등장 */
  .create-post-floating-btn:hover .btn-text {
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
    z-index: 1000;
  }
}


/* 피드 카드 & 애니메이션 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 1.2s ease;
}
.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}
.feed-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-bottom: 20px;
  overflow: hidden;
  padding: 16px;
}

/* 유저 정보 */
.profile-container {
  position: relative;
  width: 48px; height: 48px;
}
.profile-ring { position: absolute; width: 48px; height: 48px; top: 0; left: 0; }
.ring-bg { fill: none; stroke: #f0f7f0; stroke-width: 3; }
.ring-progress {
  fill: none; stroke: #a5d6a7; stroke-width: 3; stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}
.profile-img {
  width: 40px; height: 40px; border-radius: 50%; object-fit: cover;
  position: absolute; top: 4px; left: 4px; z-index: 1; border: 1px solid #f0f0f0;
}
.user-info { display: flex; align-items: center; margin-bottom: 12px; }
.username { font-weight: bold; margin-left: 10px; }

.profile-container,
.username,
.comment-writer {
  color: #333; /* 원하는 색상으로 */
  text-decoration: none;
}

/* 본문 */
.post-img {
  width: 100%; aspect-ratio: 1/1; object-fit: cover;
  object-position: center; border-radius: 8px; margin-bottom: 12px;
}
.post-content .title { font-size: 1.1rem; font-weight: bold; margin-bottom: 6px; }
.post-content .content { margin-bottom: 8px; }

/* 액션 버튼 */
.post-actions {
  display: flex; justify-content: space-between; margin-top: 10px; color: #555;
}
.like-btn, .comment-btn {
  background: none; border: none; cursor: pointer; font-size: 1rem;
}
.like-btn:hover, .comment-btn:hover { opacity: 0.7; }

/* 댓글 */
.comment-list { margin-top: 10px; }
.comment-scroll {
  max-height: 160px; overflow-y: auto; padding: 10px;
  background: #f9f9f9; border-radius: 8px; scroll-behavior: smooth;
}
.comment-loading { text-align: center; color: #888; font-size: 0.9rem; padding: 10px; }
.comment-item { margin-bottom: 6px; font-size: 0.95rem; }
.comment-writer { font-weight: bold; }
.no-comment { color: #777; font-size: 0.9rem; }
.comment-input {
  display: flex; gap: 8px; margin-top: 8px;
}
.comment-field {
  flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;
}
.submit-comment {
  padding: 6px 12px; background-color: #007bff; color: white;
  border: none; border-radius: 4px; cursor: pointer;
}
.submit-comment:hover { background-color: #0056b3; }

/* 시간 */
.created-time {
  font-size: 0.85rem; color: gray; margin-top: 8px; text-align: right;
}

/* 상세 애니메이션 */
.expand-comment-enter-active,
.expand-comment-leave-active {
  transition: max-height 0.8s ease, opacity 0.6s ease;
  overflow: hidden;
}
.expand-comment-enter-from,
.expand-comment-leave-to { max-height: 0; opacity: 0; }
.expand-comment-enter-to,
.expand-comment-leave-from { max-height: 600px; opacity: 1; }
.fade-comment-item-enter-active { transition: all 0.5s ease; }
.fade-comment-item-enter-from { opacity: 0; transform: translateY(10px); }
.fade-comment-item-enter-to { opacity: 1; transform: translateY(0); }

/* 빈 상태 & 로딩 */
.loading { text-align: center; padding: 20px; }
.no-posts {
  text-align: center; padding: 40px; font-size: 1.2rem; color: #888;
}
</style>