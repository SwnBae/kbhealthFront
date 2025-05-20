<template>
  <div class="comment-system">
    <!-- 댓글 목록 -->
    <transition name="expand-comment">
      <div v-if="visible" class="comment-list">
        <div class="comment-scroll" ref="commentScrollEl">
          <p v-if="comments.length === 0" class="no-comment">
            첫 번째 댓글을 남겨보세요
          </p>
          <transition-group name="fade-comment-item" tag="div">
            <!-- 댓글 아이템 내부에 삭제 버튼 추가 -->
            <div v-for="comment in comments" :key="comment.commentId" class="comment-item">
              <div class="comment-profile">
                <router-link :to="`/profile/${comment.writerAccount}`">
                  <!-- ProfileRing 컴포넌트 사용 -->
                  <ProfileRing :profile-image-url="getProfileImage(comment.writerProfileImage)"
                    :base-score="comment.writerBaseScore || 0" :size="45" :stroke-width="2" progress-color="#4CAF50"
                    alt-text="프로필" />
                </router-link>
              </div>
              <div class="comment-content">
                <router-link :to="`/profile/${comment.writerAccount}`" class="comment-writer">
                  {{ comment.writer }}
                </router-link>
                <span class="comment-text">{{ comment.comment }}</span>
                <div class="comment-meta">
                  <span class="comment-time">{{ formatCommentTime(comment.createdAt) }}</span>
                  <button v-if="isCommentOwner(comment)" class="comment-delete-btn"
                    @click="deleteComment(comment.commentId)">
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </transition-group>
          <div v-if="!lastPage && !isLoading" class="comment-loading">
            더 불러오는 중...
          </div>
        </div>
        <div class="comment-input">
          <!-- 현재 사용자 프로필에도 ProfileRing 적용 -->
          <ProfileRing :profile-image-url="getCurrentUserProfile()" 
                     :base-score="userStore.currentMember?.baseScore || 0" 
                     :size="40"
                     :stroke-width="2" 
                     progress-color="#4CAF50" 
                     class="comment-profile-ring" 
                     alt-text="내 프로필" />
          <input v-model="newComment" type="text" placeholder="댓글 달기..." class="comment-field"
            @keyup.enter="submitComment" />
          <button class="submit-comment" @click="submitComment" :disabled="!newComment.trim()">
            게시
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ProfileRing from '@/components/profile/ProfileRing.vue';
import 'dayjs/locale/ko'; // 한국어 로케일 추가

// Vuex 스토어 -> Pinia 스토어로 변경
import { useUserStore } from '@/scripts/store'; 
const userStore = useUserStore();

// dayjs 설정
dayjs.extend(relativeTime);
dayjs.locale('ko'); // 한국어 로케일 사용

const props = defineProps({
  postId: {
    type: Number,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  },
  commentCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:commentCount']);

// 상태 관리
const comments = ref([]);
const page = ref(0);
const size = 10; // 한 번에 로드하는 댓글 수
const lastPage = ref(false);
const isLoading = ref(false);
const newComment = ref('');
const commentScrollEl = ref(null);
let scrollEventBound = false;

// 현재 사용자 프로필 이미지
const getCurrentUserProfile = () => {
  // Pinia에서는 state 없이 직접 접근
  const currentMember = userStore.currentMember;
  if (currentMember && currentMember.profileImage) {
    return currentMember.profileImage;
  }
  return '/images/default_profile.png';
};

// 프로필 이미지 URL 가져오기
const getProfileImage = (url) => {
  return url && url.trim() !== '' ? url : '/images/default_profile.png';
};

// 댓글 작성 시간 포맷팅
const formatCommentTime = (timestamp) => {
  if (!timestamp) return '';

  const now = dayjs();
  const commentTime = dayjs(timestamp);
  const diffHours = now.diff(commentTime, 'hour');

  if (diffHours < 24) {
    return commentTime.fromNow(); // 24시간 이내: ~분 전, ~시간 전
  } else if (diffHours < 168) { // 일주일 이내
    return commentTime.format('ddd HH:mm'); // 요일 시간
  } else {
    return commentTime.format('YYYY.MM.DD'); // 날짜
  }
};

// 댓글 불러오기 메서드
const loadMoreComments = async () => {
  if (isLoading.value || lastPage.value) return;

  isLoading.value = true;
  try {
    console.log(`댓글 로드 중: postId=${props.postId}, page=${page.value}, size=${size}`);

    const res = await axios.get(`/api/feed/${props.postId}/commentList`, {
      params: { page: page.value, size },
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
    });

    // 데이터 형식 확인 및 로그
    console.log('댓글 로드 응답:', res.data);

    // API 응답이 페이지네이션 형식인지 확인
    if (res.data && res.data.content) {
      // 각 댓글의 구조 출력 (디버깅용)
      if (res.data.content.length > 0) {
        console.log('첫 번째 댓글 객체 구조:', JSON.stringify(res.data.content[0], null, 2));
      }

      comments.value.push(...res.data.content);
      lastPage.value = res.data.last;

      console.log(`${res.data.content.length}개 댓글 로드, 마지막 페이지: ${res.data.last}`);
    }
    // 배열 형식인지 확인
    else if (Array.isArray(res.data)) {
      // 각 댓글의 구조 출력 (디버깅용)
      if (res.data.length > 0) {
        console.log('첫 번째 댓글 객체 구조:', JSON.stringify(res.data[0], null, 2));
      }

      comments.value.push(...res.data);
      lastPage.value = res.data.length < size;

      console.log(`${res.data.length}개 댓글 로드, 마지막 페이지: ${res.data.length < size}`);
    }
    // 응답 형식 오류
    else {
      console.error('알 수 없는 API 응답 형식:', res.data);
      lastPage.value = true; // 오류 방지를 위해 마지막 페이지로 설정
    }

    page.value++;

    // 다음 틱에 스크롤 이벤트 재설정
    await nextTick();
    await setupScrollListener();
  } catch (error) {
    console.error('댓글 불러오기 실패', error);
    lastPage.value = true; // 오류 방지를 위해 마지막 페이지로 설정
  } finally {
    isLoading.value = false;
  }
};

// 댓글 소유자 확인 메서드 (본인이 작성한 댓글인지 확인)
const isCommentOwner = (comment) => {
  // Pinia에서는 state 없이 직접 접근
  const currentMember = userStore.currentMember;
  if (!currentMember) return false;
  
  // userStore에서 가져온 현재 사용자 ID와 댓글 작성자 ID 비교
  console.log('댓글 소유권 확인:', {
    commentId: comment.commentId,
    commentWriter: comment.writer,
    commentWriterAccount: comment.writerAccount,
    currentUserId: currentMember.id,
    currentUserAccount: currentMember.account
  });
  
  // account 값으로 비교 (writerAccount 필드 사용)
  return currentMember.account === comment.writerAccount;
};

// 댓글 삭제 메서드
const deleteComment = async (commentId) => {
  if (!confirm('댓글을 삭제하시겠습니까?')) return;

  try {
    console.log(`댓글 삭제 요청: postId=${props.postId}, commentId=${commentId}`);

    await axios.delete(
      `/api/feed/${props.postId}/comment/${commentId}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );

    // 삭제된 댓글을 배열에서 제거
    comments.value = comments.value.filter(c => c.commentId !== commentId);

    // 부모 컴포넌트에 댓글 수 업데이트 알림
    emit('update:commentCount', props.commentCount - 1);

    console.log('댓글이 성공적으로 삭제되었습니다.');
  } catch (error) {
    console.error('댓글 삭제 실패', error);
    alert('댓글 삭제에 실패했습니다: ' + (error.response?.data || error.message));
  }
};

// 스크롤 이벤트 핸들러
const handleScroll = () => {
  const el = commentScrollEl.value;
  if (!el) return;

  // 스크롤 위치 계산 (더 일찍 로드 시작하도록 20px 여유 추가)
  const scrolledToBottom =
    Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 30;

  // 조건 충족 시 더 많은 댓글 로드
  if (scrolledToBottom && !lastPage.value && !isLoading.value) {
    console.log('스크롤 하단 도달, 더 많은 댓글 로드');
    loadMoreComments();
  }
};

// 스크롤 이벤트 연결
const setupScrollListener = async () => {
  await nextTick();

  if (commentScrollEl.value) {
    // 이전 이벤트 리스너 제거 (중복 방지)
    if (scrollEventBound) {
      commentScrollEl.value.removeEventListener('scroll', handleScroll);
    }

    // 새 이벤트 리스너 추가
    commentScrollEl.value.addEventListener('scroll', handleScroll);
    scrollEventBound = true;

    // 초기 실행 (적은 댓글 수로 스크롤이 없을 때도 더 로드)
    const el = commentScrollEl.value;
    if (el.scrollHeight <= el.clientHeight && !lastPage.value && !isLoading.value) {
      loadMoreComments();
    }
  }
};

// 댓글 등록
const submitComment = async () => {
  const trimmedComment = newComment.value.trim();
  if (!trimmedComment) return;

  try {
    await axios.post(
      `/api/feed/${props.postId}/comment`,
      { comment: trimmedComment },
      { headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` } }
    );

    // 댓글 목록 리셋 후 재로딩
    comments.value = [];
    page.value = 0;
    lastPage.value = false;
    newComment.value = '';

    // 부모 컴포넌트에 댓글 수 업데이트 알림
    emit('update:commentCount', props.commentCount + 1);

    await loadMoreComments();
  } catch (error) {
    console.error('댓글 작성 실패', error);
  }
};

// 댓글 초기화
const initComments = async () => {
  comments.value = [];
  page.value = 0;
  lastPage.value = false;

  if (props.visible) {
    await loadMoreComments();
    await setupScrollListener();
  }
};

// visible prop 변경 감지
watch(() => props.visible, async (newValue) => {
  if (newValue) {
    // 댓글이 없으면 로드
    if (comments.value.length === 0) {
      await loadMoreComments();
    }

    // 항상 스크롤 리스너 설정 (재설정)
    await nextTick();
    await setupScrollListener();
  }
});

// postId가 변경될 때 댓글 초기화
watch(() => props.postId, async () => {
  await initComments();
});

// 컴포넌트 마운트 시 초기화
onMounted(async () => {
  // Pinia 스토어에서 현재 사용자 정보 확인
  console.log('현재 로그인 사용자:', userStore.currentMember);

  if (props.visible) {
    await loadMoreComments();
    await setupScrollListener();
  }
});
</script>

<style scoped>
/* 댓글 시스템 컨테이너 */
.comment-system {
  position: relative;
  margin-top: 8px;
}

/* 댓글 목록 컨테이너 */
.comment-list {
  margin-top: 12px;
  border-top: 1px solid #eaeaea;
  padding-top: 12px;
}

/* 댓글 스크롤 영역 */
.comment-scroll {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
  border-radius: 12px;
  scroll-behavior: smooth;
  position: relative;
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
}

/* 스크롤바 숨기기 */
.comment-scroll::-webkit-scrollbar {
  display: none;
}

/* 댓글 로딩 상태 */
.comment-loading {
  text-align: center;
  color: #8e8e8e;
  font-size: 0.8rem;
  padding: 8px;
  font-weight: 500;
  letter-spacing: 0.2px;
  margin: 8px 0;
  position: relative;
}

.comment-loading::after {
  content: "";
  display: block;
  width: 24px;
  height: 1px;
  margin: 6px auto 0;
  background: #dbdbdb;
}

/* 댓글 아이템 스타일 */
.comment-item {
  margin-bottom: 16px;
  font-size: 0.92rem;
  display: flex;
  gap: 10px;
  line-height: 1.4;
  position: relative;
  padding: 0 4px;
}

.comment-item:last-child {
  margin-bottom: 6px;
}

/* 댓글 프로필 영역 */
.comment-profile {
  flex-shrink: 0;
  margin-left: 5px;
}

/* 댓글 내용 영역 */
.comment-content {
  flex: 1;
}

/* 댓글 프로필 링 */
.comment-profile-ring {
  margin-left: 10px;
}

/* 댓글 작성자 */
.comment-writer {
  font-weight: 600;
  color: #262626;
  text-decoration: none;
  margin-right: 4px;
}

/* 댓글 텍스트 */
.comment-text {
  color: #262626;
  word-break: break-word;
}

/* 댓글 메타 정보 */
.comment-meta {
  display: flex;
  margin-top: 4px;
  align-items: center;
}

.comment-time {
  font-size: 0.75rem;
  color: #8e8e8e;
  font-weight: 500;
}

/* 댓글 삭제 버튼 */
.comment-delete-btn {
  background: none;
  border: none;
  color: #8e8e8e;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0 6px;
  margin-left: 8px;
  font-weight: 500;
  transition: color 0.2s;
}

.comment-delete-btn:hover {
  color: #ed4956;
}

/* 댓글 없음 메시지 */
.no-comment {
  color: #8e8e8e;
  font-size: 0.9rem;
  text-align: center;
  padding: 16px 0;
  letter-spacing: 0.2px;
  font-weight: 400;
}

/* 댓글 입력 영역 */
.comment-input {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  position: relative;
  align-items: center;
}

/* 댓글 입력 필드 */
.comment-field {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #efefef;
  border-radius: 22px;
  font-size: 0.9rem;
  background-color: #fafafa;
  transition: all 0.3s ease;
  box-shadow: none;
}

.comment-field:focus {
  outline: none;
  border-color: #bdbdbd;
  background-color: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.03);
}

.comment-field::placeholder {
  color: #8e8e8e;
}

/* 댓글 등록 버튼 */
.submit-comment {
  padding: 8px 16px;
  background-color: transparent;
  color: #0095f6;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: color 0.2s;
  flex-shrink: 0;
}

.submit-comment:hover {
  color: #0074cc;
}

.submit-comment:disabled {
  color: #c0dffd;
  cursor: default;
}

/* 애니메이션 CSS만으로 수정 */
.expand-comment-enter-active {
  animation: expand-animation 0.35s ease-out forwards;
  overflow: hidden;
}

.expand-comment-leave-active {
  animation: collapse-animation 0.35s ease-in forwards;
  overflow: hidden;
}

@keyframes expand-animation {
  0% {
    max-height: 0;
    opacity: 0;
    transform: translateY(-8px);
  }

  100% {
    max-height: 400px;
    /* 충분히 큰 값 */
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes collapse-animation {
  0% {
    max-height: 400px;
    /* 충분히 큰 값 */
    opacity: 1;
    transform: translateY(0);
  }

  100% {
    max-height: 0;
    opacity: 0;
    transform: translateY(-8px);
  }
}

.fade-comment-item-enter-active {
  transition: all 0.5s ease;
}

.fade-comment-item-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-comment-item-enter-to {
  opacity: 1;
  transform: translateY(0);
}
</style>