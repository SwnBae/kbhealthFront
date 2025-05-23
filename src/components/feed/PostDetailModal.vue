<template>
  <div v-if="isVisible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <!-- 모달 헤더 -->
      <div class="modal-header">
        <h3 class="modal-title">게시글</h3>
        <button class="close-button" @click="closeModal">✕</button>
      </div>

      <!-- 로딩 상태 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>게시글을 불러오는 중...</p>
      </div>

      <!-- 에러 상태 -->
      <div v-else-if="error" class="error-container">
        <p>{{ error }}</p>
        <button @click="loadPost" class="retry-button">다시 시도</button>
      </div>

      <!-- 게시글 내용 -->
      <div v-else-if="post" class="modal-content">
        <!-- 작성자 정보 -->
        <div class="user-info">
          <router-link
            :to="`/profile/${post.writerAccount}`"
            class="profile-link"
            @click="closeModal"
          >
            <ProfileRing
              :profile-image-url="getImageUrl(post.writerProfileImage, true)"
              :base-score="post.baseScore"
              :size="40"  
              :stroke-width="2"
              progress-color="#4CAF50"
              alt-text="profile"
              @error="handleImageError($event, true)"
            />
          </router-link>
          <div class="user-details">
            <router-link
              :to="`/profile/${post.writerAccount}`"
              class="username"
              @click="closeModal"
            >
              {{ post.writerName }}
            </router-link>
            <span class="location" v-if="post.location">{{ post.location }}</span>
            <span class="created-time">{{ formatTime(post.createdAt) }}</span>
          </div>
          
          <!-- 게시글 메뉴 (현재 사용자가 작성자인 경우에만 표시) -->
          <div class="post-actions-menu" v-if="isCurrentUserPost" ref="menuContainer">
            <button class="post-menu-btn" @click.stop="togglePostMenu">
              <span class="dots">⋯</span>
            </button>
            
            <div v-if="showPostMenu" class="post-dropdown-menu">
              <button @click="openEditModal" class="dropdown-item">
                <span class="item-icon">✏️</span> 수정하기
              </button>
              <button @click="openDeleteModal" class="dropdown-item delete">
                <span class="item-icon">🗑️</span> 삭제하기
              </button>
            </div>
          </div>
        </div>

        <!-- 스크롤 가능한 컨텐츠 영역 -->
        <div class="scrollable-content">
          <!-- 게시글 내용 -->
          <div class="post-content-section">
            <h2 class="post-title">{{ post.title }}</h2>
            <p class="post-content">{{ post.content }}</p>
          </div>

          <!-- 본문 이미지 -->
          <div class="image-container">
            <img
              :src="getImageUrl(post.imageUrl, false)"
              class="post-image"
              alt="post"
              @error="handleImageError($event, false)"
            />
          </div>

          <!-- 댓글 시스템 -->
          <div class="comments-section">
            <CommentSystem
              :post-id="postId"
              :visible="true"
              :comment-count="post.commentCount"
              :is-modal="true"
              @update:comment-count="updateCommentCount"
              ref="commentSystemRef"
            />
          </div>
        </div>

        <!-- 고정된 액션 바 -->
        <div class="action-bar">
          <div class="stats-row">
            <span class="like-count">좋아요 {{ formatCount(post.likeCount) }}개</span>
            <span class="comment-count">댓글 {{ formatCount(post.commentCount) }}개</span>
          </div>
          
          <div class="action-buttons">
            <button class="action-btn like-btn" @click="toggleLike" :class="{ active: post.liked }">
              <span :class="{'liked-animation': post.likeAnimating}">
                {{ post.liked ? '💖' : '🤍' }}
              </span> 
              <span class="action-text">좋아요</span>
            </button>
            <button class="action-btn comment-btn" @click="focusCommentInput">
              <span>💬</span>
              <span class="action-text">댓글</span>
            </button>
          </div>
        </div>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CommentSystem from '@/components/feed/CommentSystem.vue';
import ProfileRing from '@/components/profile/ProfileRing.vue';
import PostEditModal from '@/components/feed/PostEditModal.vue';
import DeleteConfirmModal from '@/components/feed/DeleteConfirmModal.vue';
import axios from 'axios';
import { useUserStore } from "@/scripts/store";
import defaultPostImage from '/assets/img/default_post_image.png';
import defaultProfileImage from '/assets/img/default_profile.png';

dayjs.extend(relativeTime);

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  postId: {
    type: [String, Number],
    required: true
  }
});

const emit = defineEmits(['close', 'post-updated', 'post-deleted']);

const router = useRouter();
const userStore = useUserStore();

// 상태 관리
const post = ref(null);
const isLoading = ref(false);
const error = ref(null);
const showPostMenu = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const menuContainer = ref(null);
const commentSystemRef = ref(null);

// 현재 사용자가 게시글 작성자인지 확인
const isCurrentUserPost = computed(() => {
  const currentUserId = userStore.currentMember?.id;
  return currentUserId && post.value?.writerId === currentUserId;
});

// 게시글 로딩
const loadPost = async () => {
  if (!props.postId) return;
  
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await axios.get(`/api/feed/post/${props.postId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
    });
    
    post.value = {
      ...response.data,
      commentsVisible: true,
      likeAnimating: false
    };
  } catch (err) {
    console.error('게시글 로딩 실패:', err);
    error.value = '게시글을 불러올 수 없습니다.';
  } finally {
    isLoading.value = false;
  }
};

// 이미지 URL 처리
const getImageUrl = (url, isProfile = false) => {
  const defaultImage = isProfile ? defaultProfileImage : defaultPostImage;
  return url && url.trim() !== '' ? url : defaultImage;
};

// 이미지 로드 에러 처리
const handleImageError = (event, isProfile = false) => {
  event.target.src = isProfile ? defaultProfileImage : defaultPostImage;
  event.target.onerror = null;
};

// 시간 포맷팅
const formatTime = (t) => dayjs(t).fromNow();

// 숫자 포맷팅
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
const togglePostMenu = (event) => {
  event.stopPropagation();
  showPostMenu.value = !showPostMenu.value;
  
  if (showPostMenu.value) {
    setTimeout(() => {
      document.addEventListener('click', closeMenuOnOutsideClick);
    }, 0);
  }
};

// 외부 클릭 시 메뉴 닫기
const closeMenuOnOutsideClick = (event) => {
  if (menuContainer.value && !menuContainer.value.contains(event.target)) {
    showPostMenu.value = false;
    document.removeEventListener('click', closeMenuOnOutsideClick);
  }
};

// 모달 관련 함수들
const openEditModal = () => {
  showPostMenu.value = false;
  showEditModal.value = true;
};

const openDeleteModal = () => {
  showPostMenu.value = false;
  showDeleteModal.value = true;
};

const closeModal = () => {
  emit('close');
};

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    closeModal();
  }
};

// 좋아요 토글
const toggleLike = async () => {
  if (!post.value) return;
  
  try {
    const res = await axios.put(
      `/api/feed/${post.value.postId}/like`,
      null,
      { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );
    
    post.value.liked = res.data;
    post.value.likeCount += post.value.liked ? 1 : -1;
    
    if (post.value.liked) {
      post.value.likeAnimating = true;
      setTimeout(() => {
        post.value.likeAnimating = false;
      }, 700);
    }
    
    emit('post-updated', post.value);
  } catch (error) {
    console.error('좋아요 실패', error);
  }
};

// 댓글 입력창 포커스
const focusCommentInput = () => {
  nextTick(() => {
    if (commentSystemRef.value) {
      commentSystemRef.value.focusInput?.();
    }
  });
};

// 댓글 수 업데이트
const updateCommentCount = (count) => {
  if (post.value) {
    post.value.commentCount = count;
    emit('post-updated', post.value);
  }
};

// 게시글 수정 처리
const handleEditSubmit = async (editedData) => {
  try {
    await axios.put(
      `/api/feed/${post.value.postId}`,
      {
        title: editedData.title,
        content: editedData.content
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );
    
    post.value.title = editedData.title;
    post.value.content = editedData.content;
    
    emit('post-updated', post.value);
    showEditModal.value = false;
    showNotification('게시글이 수정되었습니다.', 'success');
  } catch (error) {
    console.error('게시글 수정 실패', error);
    showNotification('게시글 수정에 실패했습니다.', 'error');
  }
};

// 게시글 삭제 처리
const handleDeleteConfirm = async (postId) => {
  try {
    await axios.delete(
      `/api/feed/${postId}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );
    
    emit('post-deleted', postId);
    showDeleteModal.value = false;
    closeModal();
    showNotification('게시글이 삭제되었습니다.', 'success');
  } catch (error) {
    console.error('게시글 삭제 실패', error);
    showNotification('게시글 삭제에 실패했습니다.', 'error');
  }
};

// 알림 표시
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

// ESC 키로 모달 닫기
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
};

// 워처와 라이프사이클
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadPost();
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = '';
    document.removeEventListener('click', closeMenuOnOutsideClick);
  }
});

onMounted(() => {
  if (props.isVisible) {
    loadPost();
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('click', closeMenuOnOutsideClick);
  document.body.style.overflow = '';
});
</script>

<style scoped>
/* 모달 오버레이 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 모달 컨테이너 */
.modal-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 모달 헤더 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.3rem;
  color: #666;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 모달 내용 */
.modal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 로딩 및 에러 상태 */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #f0f0f0;
  border-top: 2px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 12px;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #45a049;
}

/* 사용자 정보 */
.user-info {
  display: flex;
  align-items: center;
  padding: 16px 20px 12px;
  position: relative;
  flex-shrink: 0;
}

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
  font-size: 1rem;
  color: #333;
  text-decoration: none;
  margin-bottom: 2px;
}

.username:hover {
  text-decoration: underline;
}

.location {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 2px;
}

.created-time {
  font-size: 0.75rem;
  color: #888;
}

/* 스크롤 가능한 컨텐츠 영역 */
.scrollable-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 게시글 내용 */
.post-content-section {
  padding: 0 20px 16px;
}

.post-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #222;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.post-content {
  color: #444;
  line-height: 1.5;
  font-size: 0.95rem;
  margin: 0;
  white-space: pre-wrap;
}

/* 이미지 */
.image-container {
  margin: 0 0 16px 0;
}

.post-image {
  width: 100%;
  object-fit: cover;
  object-position: center;
}

/* 댓글 섹션 */
.comments-section {
  border-top: 1px solid #f0f0f0;
  min-height: 200px;
}

/* 고정된 액션 바 */
.action-bar {
  flex-shrink: 0;
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  background: white;
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 0.85rem;
}

.like-count,
.comment-count {
  font-weight: 600;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  background: none;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 10px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.02);
  border-color: #ccc;
}

.action-btn.active {
  background-color: rgba(76, 175, 80, 0.08);
  border-color: #4CAF50;
  color: #4CAF50;
}

.action-btn span:first-child {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  font-size: 1.1rem;
}

/* 게시글 메뉴 */
.post-actions-menu {
  position: relative;
}

.post-menu-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 1.1rem;
  padding: 6px;
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
  width: 130px;
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
  padding: 10px;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
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
  margin-right: 6px;
  font-size: 1rem;
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

/* 반응형 디자인 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-container {
    max-width: 100%;
    max-height: 85vh;
  }
  
  .modal-header {
    padding: 14px 16px;
  }
  
  .user-info,
  .post-content-section,
  .action-bar {
    padding-left: 16px;
    padding-right: 16px;
  }
  
  .post-title {
    font-size: 1.1rem;
  }
  
  .post-content {
    font-size: 0.9rem;
  }
  
  .action-btn {
    padding: 8px 10px;
    font-size: 0.8rem;
  }
  
  .action-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 5px;
  }
  
  .modal-container {
    max-height: 90vh;
    border-radius: 12px;
  }
  
  .stats-row {
    flex-direction: column;
    gap: 6px;
  }
  
  .action-buttons {
    gap: 6px;
  }
  
  .action-btn {
    padding: 8px;
  }
}</style>