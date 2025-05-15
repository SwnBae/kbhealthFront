<!--
파일 위치: @/components/feed/Post.vue
개별 게시물을 표시하는 컴포넌트 - Feed 컴포넌트에서 분리
-->
<template>
  <div class="feed-card animate-on-scroll">
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
      <div class="user-details">
        <router-link
          :to="`/profile/${post.writerAccount}`"
          class="username"
        >
          {{ post.writerName }}
        </router-link>
        <span class="location" v-if="post.location">{{ post.location }}</span>
      </div>
      <button class="post-menu-btn" aria-label="게시글 메뉴">
        <span class="dots">⋯</span>
      </button>
    </div>

    <!-- 본문 이미지 -->
    <img
      :src="getImageUrl(post.imageUrl)"
      class="post-img"
      alt="post"
      loading="lazy"
    />

    <!-- 액션 -->
    <div class="post-actions">
      <div class="action-buttons">
        <button class="like-btn" @click="toggleLike" aria-label="좋아요">
          <span :class="{'liked-animation': post.likeAnimating}">
            {{ post.liked ? '💖' : '🤍' }}
          </span> 
          <span class="action-text">좋아요</span>
        </button>
        <button class="comment-btn" @click="toggleComments" aria-label="댓글">
          <span>💬</span>
          <span class="action-text">댓글</span>
        </button>
      </div>
    </div>
    
    <!-- 좋아요 카운트 -->
    <div class="like-count">
      좋아요 {{ formatCount(post.likeCount) }}개
    </div>

    <!-- 내용 -->
    <div class="post-content">
      <p class="title">{{ post.title }}</p>
      <p class="content">{{ post.content }}</p>
    </div>
    
    <!-- 댓글 수 표시 -->
    <div class="comment-count" v-if="post.commentCount > 0" @click="toggleComments">
      댓글 {{ formatCount(post.commentCount) }}개 보기
    </div>

    <!-- 댓글 시스템 컴포넌트 사용 -->
    <CommentSystem
      :post-id="post.postId"
      :visible="post.commentsVisible"
      :comment-count="post.commentCount"
      @update:comment-count="updateCommentCount"
    />

    <!-- 작성 시간 -->
    <div class="created-time">
      {{ formatTime(post.createdAt) }}
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CommentSystem from '@/components/feed/CommentSystem.vue';
import axios from 'axios';

dayjs.extend(relativeTime);

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:post']);

// 이미지 URL 처리
const getImageUrl = url => 
  url && url.trim() !== '' ? url : '/images/default_post_image.png';

// 시간 포맷팅
const formatTime = t => dayjs(t).fromNow();

// 숫자 포맷팅 (1000 -> 1K)
const formatCount = (count) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  } else {
    return count.toString();
  }
};

// 좋아요 토글
const toggleLike = async () => {
  try {
    const res = await axios.put(
      `/api/feed/${props.post.postId}/like`,
      null,
      { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );
    
    // 포스트 데이터 업데이트를 위한 복사본 생성
    const updatedPost = { ...props.post };
    updatedPost.liked = res.data;
    updatedPost.likeCount += updatedPost.liked ? 1 : -1;
    
    // 좋아요 애니메이션 효과 추가
    if (updatedPost.liked) {
      updatedPost.likeAnimating = true;
      setTimeout(() => {
        updatedPost.likeAnimating = false;
        // 타이머 후에도 업데이트된 상태 전달
        emit('update:post', { ...updatedPost, likeAnimating: false });
      }, 700);
    }
    
    // 부모 컴포넌트에 업데이트된 포스트 전달
    emit('update:post', updatedPost);
  } catch (error) {
    console.error('좋아요 실패', error);
  }
};

// 댓글 토글
const toggleComments = () => {
  const updatedPost = { 
    ...props.post, 
    commentsVisible: !props.post.commentsVisible 
  };
  emit('update:post', updatedPost);
};

// 댓글 수 업데이트
const updateCommentCount = (count) => {
  const updatedPost = { ...props.post, commentCount: count };
  emit('update:post', updatedPost);
};
</script>

<style scoped>
/* 피드 카드 디자인 개선 */
.feed-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
  overflow: hidden;
  padding: 0;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feed-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}

/* 유저 정보 */
.user-info {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
}

.profile-container {
  position: relative;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
}

.profile-ring {
  position: absolute;
  width: 42px;
  height: 42px;
  top: 0;
  left: 0;
}

.ring-bg {
  fill: none;
  stroke: #f0f7f0;
  stroke-width: 2.5;
}

.ring-progress {
  fill: none;
  stroke: #4CAF50;
  stroke-width: 2.5;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}

.profile-img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 1;
  border: 1px solid #f0f0f0;
}

.user-details {
  flex: 1;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
}

.username {
  font-weight: 600;
  font-size: 0.95rem;
  color: #333;
  text-decoration: none;
}

.location {
  font-size: 0.75rem;
  color: #888;
  margin-top: 2px;
}

.post-menu-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 1.2rem;
  padding: 8px;
  cursor: pointer;
  margin-left: auto;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.post-menu-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dots {
  line-height: 0;
  transform: rotate(90deg);
  display: block;
}

/* 본문 이미지 */
.post-img {
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
  object-position: center;
  margin-bottom: 0;
  border-radius: 0;
}

/* 액션 버튼 */
.post-actions {
  display: flex;
  padding: 12px 16px;
  align-items: center;
}

.action-buttons {
  display: flex;
  width: 100%;
}

.like-btn,
.comment-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
  padding: 8px 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  color: #555;
  margin-right: 12px;
}

.like-btn:hover,
.comment-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 좋아요 버튼 아이콘 컨테이너 */
.like-btn span:first-child, 
.comment-btn span:first-child {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  font-size: 1.2rem;
}

.action-text {
  font-size: 0.9rem;
}

/* 좋아요 수 */
.like-count {
  padding: 0 16px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #333;
  margin-bottom: 6px;
}

/* 내용 */
.post-content {
  padding: 0 16px 12px;
}

.post-content .title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: #222;
}

.post-content .content {
  margin-bottom: 0;
  color: #444;
  line-height: 1.4;
  font-size: 0.95rem;
}

/* 댓글 수 표시 */
.comment-count {
  padding: 0 16px 12px;
  font-size: 0.9rem;
  color: #777;
  cursor: pointer;
}

.comment-count:hover {
  text-decoration: underline;
}

/* 좋아요 애니메이션 */
@keyframes likeAnimation {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.liked-animation {
  display: inline-block;
  animation: likeAnimation 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 시간 */
.created-time {
  font-size: 0.8rem;
  color: #888;
  padding: 10px 16px;
  border-top: 1px solid #f5f5f5;
}

/* 애니메이션 효과 */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 1s ease, transform 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* 반응형 디자인 */
@media (max-width: 480px) {
  .feed-card {
    border-radius: 12px;
    margin-bottom: 16px;
  }
  
  .user-info {
    padding: 12px;
  }
  
  .post-content, 
  .like-count, 
  .comment-count {
    padding-left: 12px;
    padding-right: 12px;
  }
  
  .post-actions {
    padding: 10px 12px;
  }
  
  .action-text {
    display: none;
  }
  
  .created-time {
    padding: 8px 12px;
  }
}
</style>