<!-- ProfileRing을 사용하는 Post.vue 업데이트 - 수정/삭제 기능 포함 -->
<template>
  <div class="feed-card animate-on-scroll">
    <!-- 작성자 -->
    <div class="user-info">
      <router-link
        :to="`/profile/${post.writerAccount}`"
        class="profile-link"
      >
        <!-- ProfileRing 컴포넌트 사용 -->
        <ProfileRing
          :profile-image-url="getImageUrl(post.writerProfileImage)"
          :base-score="post.baseScore"
          :size="42"
          :stroke-width="2.5"
          progress-color="#4CAF50"
          alt-text="profile"
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
      
      <!-- 게시글 메뉴 (현재 사용자가 작성자인 경우에만 표시) -->
      <div class="post-actions-menu" v-if="isCurrentUserPost">
        <button class="post-menu-btn" @click="togglePostMenu" aria-label="게시글 메뉴">
          <span class="dots">⋯</span>
        </button>
        
        <!-- 드롭다운 메뉴 -->
        <div v-if="showPostMenu" class="post-dropdown-menu">
          <button @click="openEditModal" class="dropdown-item">
            <span class="item-icon">✏️</span> 수정하기
          </button>
          <button @click="openDeleteModal" class="dropdown-item delete">
            <span class="item-icon">🗑️</span> 삭제하기
          </button>
        </div>
      </div>
      
      <!-- 일반 메뉴 버튼 (다른 사용자의 게시글인 경우) -->
      <!-- <button v-else class="post-menu-btn" aria-label="게시글 메뉴">
        <span class="dots">⋯</span>
      </button> -->
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
    
    <!-- 수정 모달 -->
    <PostEditModal
      v-if="showEditModal"
      :post="post"
      @close="showEditModal = false"
      @submit="handleEditSubmit"
    />
    
    <!-- 삭제 확인 모달 -->
    <DeleteConfirmModal
      v-if="showDeleteModal"
      :postId="post.postId"
      @close="showDeleteModal = false"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, computed } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CommentSystem from '@/components/feed/CommentSystem.vue';
import ProfileRing from '@/components/profile/ProfileRing.vue';
import PostEditModal from '@/components/feed/PostEditModal.vue';
import DeleteConfirmModal from '@/components/feed/DeleteConfirmModal.vue';
import axios from 'axios';
import userStore from "@/scripts/store";

dayjs.extend(relativeTime);

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:post', 'delete:post', 'edit:post']);

// 상태 관리
const showPostMenu = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);

// 현재 사용자가 게시글 작성자인지 확인
const isCurrentUserPost = computed(() => {
  const currentUserId = userStore.state.currentMember?.id;
  return currentUserId && props.post.writerId === currentUserId;
});

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

// 게시글 메뉴 토글
const togglePostMenu = () => {
  showPostMenu.value = !showPostMenu.value;
  
  // 메뉴가 열렸을 때 외부 클릭 이벤트 추가
  if (showPostMenu.value) {
    document.addEventListener('click', closeMenuOnOutsideClick);
  } else {
    document.removeEventListener('click', closeMenuOnOutsideClick);
  }
};

// 외부 클릭 시 메뉴 닫기
const closeMenuOnOutsideClick = (event) => {
  // 메뉴 또는 메뉴 버튼 외부를 클릭했는지 확인
  const target = event.target;
  const postActionsMenu = document.querySelector('.post-actions-menu');
  if (postActionsMenu && !postActionsMenu.contains(target)) {
    showPostMenu.value = false;
    document.removeEventListener('click', closeMenuOnOutsideClick);
  }
};

// 모달 열기
const openEditModal = () => {
  showPostMenu.value = false;
  showEditModal.value = true;
};

const openDeleteModal = () => {
  showPostMenu.value = false;
  showDeleteModal.value = true;
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

// 게시글 수정 제출 처리
const handleEditSubmit = async (editedData) => {
  try {
    await axios.put(
      `/api/feed/${props.post.postId}`,
      {
        title: editedData.title,
        content: editedData.content
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );
    
    // 수정된 데이터로 포스트 업데이트
    const updatedPost = { 
      ...props.post,
      title: editedData.title,
      content: editedData.content
    };
    
    emit('edit:post', updatedPost);
    showEditModal.value = false;
    
    // 성공 메시지 표시
    showNotification('게시글이 수정되었습니다.', 'success');
  } catch (error) {
    console.error('게시글 수정 실패', error);
    showNotification('게시글 수정에 실패했습니다.', 'error');
  }
};

// 게시글 삭제 확인 처리
const handleDeleteConfirm = async (postId) => {
  try {
    await axios.delete(
      `/api/feed/${postId}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );
    
    // 부모 컴포넌트에 삭제 이벤트 발생
    emit('delete:post', postId);
    showDeleteModal.value = false;
    
    // 성공 메시지 표시
    showNotification('게시글이 삭제되었습니다.', 'success');
  } catch (error) {
    console.error('게시글 삭제 실패', error);
    showNotification('게시글 삭제에 실패했습니다.', 'error');
  }
};

// 알림 표시 함수
const showNotification = (message, type = 'success') => {
  const notification = document.createElement('div');
  notification.className = `notification ${type}-notification`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }, 10);
};
</script>

<style scoped>
/* 피드 카드 디자인 */
.feed-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
  overflow: hidden;
  padding: 0;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
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
  position: relative;
}

/* 라우터 링크 스타일 */
.profile-link {
  text-decoration: none;
  flex-shrink: 0;
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

/* 게시글 메뉴 드롭다운 */
.post-actions-menu {
  position: relative;
}

.post-menu-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 1.2rem;
  padding: 8px;
  cursor: pointer;
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

.post-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  width: 140px;
  overflow: hidden;
  z-index: 100;
  animation: dropdown-open 0.2s ease-out;
}

@keyframes dropdown-open {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 12px;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  color: #444;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item.delete {
  color: #d32f2f;
}

.dropdown-item.delete:hover {
  background-color: #ffebee;
}

.item-icon {
  margin-right: 8px;
  font-size: 1.1rem;
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

/* 알림 스타일 - 전역 스타일로 이동할 수 있음 */
:global(.notification) {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 9999;
  transform: translateY(-20px);
  opacity: 0;
  transition: transform 0.3s, opacity 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:global(.notification.show) {
  transform: translateY(0);
  opacity: 1;
}

:global(.success-notification) {
  background-color: #4caf50;
}

:global(.error-notification) {
  background-color: #f44336;
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