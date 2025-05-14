<template>
  <div class="feed-wrapper">
    <div v-for="post in posts" :key="post.postId" class="feed-card animate-on-scroll">
      <div class="user-info">
        <router-link :to="`/profile/${post.writerAccount}`" class="profile-container text-decoration-none">
          <svg class="profile-ring" viewBox="0 0 36 36">
            <circle class="ring-bg" cx="18" cy="18" r="16" />
            <circle class="ring-progress" cx="18" cy="18" r="16"
                    :stroke-dasharray="`${(Math.min(1000, post.baseScore || 0) / 1000 * 100.48).toFixed(2)} 100.48`"
                    transform="rotate(-90 18 18)"
            />
          </svg>
          <img :src="post.writerProfileImage" class="profile-img" />
        </router-link>
        <router-link :to="`/profile/${post.writerAccount}`" class="username text-dark text-decoration-none">
          {{ post.writerName }}
        </router-link>
      </div>

      <img :src="post.imageUrl" class="post-img" />

      <div class="post-content">
        <p class="title">{{ post.title }}</p>
        <p class="content">{{ post.content }}</p>
      </div>

      <div class="post-actions">
        <button @click="toggleLike(post)" class="like-btn">
          {{ post.liked ? "💖" : "🤍" }} {{ post.likeCount }}
        </button>
        <button @click="toggleComments(post)" class="comment-btn">
          💬 {{ post.commentCount }}
        </button>
      </div>

      <transition name="expand-comment">
        <div v-if="post.commentsVisible" class="comment-list">
          <div class="comment-scroll" :ref="el => setCommentScrollEl(post, el)">
            <p v-if="post.comments.length === 0" class="no-comment">댓글이 없습니다.</p>
            <transition-group name="fade-comment-item" tag="div">
              <div v-for="comment in post.comments" :key="comment.commentId" class="comment-item">
                <router-link :to="`/profile/${comment.writerAccount}`" class="text-dark text-decoration-none fw-bold">
                  {{ comment.writer }}
                </router-link>: {{ comment.comment }}
              </div>
            </transition-group>
            <div v-if="!post.lastCommentPage" class="comment-loading">불러오는 중...</div>
          </div>

          <div class="comment-input">
            <input v-model="post.newComment" type="text" placeholder="댓글을 입력하세요" class="comment-field" />
            <button @click="submitComment(post)" class="submit-comment">등록</button>
          </div>
        </div>
      </transition>

      <div class="created-time">{{ formatTime(post.createdAt) }}</div>
    </div>

    <div v-if="posts.length === 0" class="no-posts">
      <p>게시글이 없습니다.</p>
    </div>

    <div ref="sentinel" v-if="!isLastPage && posts.length > 0" class="loading">
      <p>불러오는 중...</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from "vue";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default {
  name: "Feed",
  setup() {
    const posts = ref([]);
    const page = ref(0);
    const size = 5;
    const isLastPage = ref(false);
    const sentinel = ref(null);
    const observer = ref(null);

    const formatTime = time => dayjs(time).fromNow();

    const observeFeedAnimation = () => {
      const elements = document.querySelectorAll(".animate-on-scroll");
      const scrollObserver = new IntersectionObserver(
        entries => entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        }),
        { threshold: 0.1 }
      );
      elements.forEach(el => scrollObserver.observe(el));
    };

    const loadPosts = async () => {
      try {
        const res = await axios.get("/api/feed", { params: { page: page.value, size } });
        const newPosts = res.data.content.map(p => ({
          ...p,
          comments: [], commentsVisible: false, newComment: "", commentPage: 0,
          lastCommentPage: false, isLoadingComments: false,
          commentScrollEl: null, _scrollBound: false
        }));
        posts.value.push(...newPosts);
        isLastPage.value = res.data.last;
        page.value++;
        await nextTick(); observeFeedAnimation();
      } catch (err) {
        console.error("피드 로딩 오류", err);
      }
    };

    const initObserver = () => {
      observer.value = new IntersectionObserver(
        ([entry]) => entry.isIntersecting && !isLastPage.value && loadPosts(),
        { threshold: 1.0 }
      );
      sentinel.value && observer.value.observe(sentinel.value);
    };

    const toggleLike = async post => {
      try {
        const res = await axios.put(
          `/api/feed/${post.postId}/like`, null,
          { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
        );
        post.liked = res.data;
        post.likeCount += post.liked ? 1 : -1;
      } catch (e) {
        console.error("좋아요 토글 실패", e);
      }
    };

    const toggleComments = async post => {
      post.commentsVisible = !post.commentsVisible;
      post.commentsVisible && post.commentPage === 0 && await loadMoreComments(post);
      await nextTick();
      if (post.commentScrollEl && !post._scrollBound) {
        post.commentScrollEl.addEventListener("scroll", () => handleScroll(post));
        post._scrollBound = true;
      }
    };

    const setCommentScrollEl = (post, el) => { post.commentScrollEl = el; };

    const handleScroll = post => {
      const el = post.commentScrollEl;
      el.scrollTop + el.clientHeight >= el.scrollHeight - 5 && !post.lastCommentPage && loadMoreComments(post);
    };

    const loadMoreComments = async post => {
      if (post.isLoadingComments || post.lastCommentPage) return;
      post.isLoadingComments = true;
      try {
        const res = await axios.get(
          `/api/feed/${post.postId}/commentList`,
          { params: { page: post.commentPage, size: 5 },
            headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
        );
        post.comments.push(...res.data.content);
        post.lastCommentPage = res.data.last;
        post.commentPage++;
      } catch (e) {
        console.error("댓글 불러오기 실패", e);
      } finally { post.isLoadingComments = false; }
    };

    const submitComment = async post => {
      if (!post.newComment.trim()) return;
      try {
        await axios.post(
          `/api/feed/${post.postId}/comment`,
          { comment: post.newComment },
          { headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` } }
        );
        post.comments = []; post.commentPage = 0; post.lastCommentPage = false;
        await loadMoreComments(post); post.newComment = "";
      } catch (e) { console.error("댓글 작성 실패", e); }
    };

    onMounted(async () => { await loadPosts(); initObserver(); });

    return { posts, sentinel, isLastPage, formatTime, toggleLike,
      toggleComments, submitComment, setCommentScrollEl };
  }
};
</script>

<style scoped>
.feed-wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
.animate-on-scroll { opacity: 0; transform: translateY(40px); transition: all 1.2s ease; }
.animate-on-scroll.in-view { opacity: 1; transform: translateY(0); }
.feed-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-bottom: 20px; overflow: hidden; padding: 16px; }
.profile-container { position: relative; width: 48px; height: 48px; }
.profile-ring { position: absolute; width: 48px; height: 48px; top: 0; left: 0; }
.ring-bg { fill: none; stroke: #f0f7f0; stroke-width: 3; }
.ring-progress { fill: none; stroke: #a5d6a7; stroke-width: 3;
  stroke-linecap: round; transition: stroke-dasharray 0.6s ease; }
.profile-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover;
  position: absolute; top: 4px; left: 4px; z-index: 1; border: 1px solid #f0f0f0; }
.user-info { display: flex; align-items: center; margin-bottom: 12px; }
.username { font-weight: bold; margin-left: 10px; }
.post-img { width: 100%; border-radius: 8px; margin-bottom: 12px; }
.post-content .title { font-size: 1.1rem; font-weight: bold; margin-bottom: 6px; }
.post-content .content { margin-bottom: 8px; }
.post-actions { display: flex; justify-content: space-between; margin-top: 10px; color: #555; }
.like-btn, .comment-btn { background: none; border: none; cursor: pointer; font-size: 1rem; }
.like-btn:hover, .comment-btn:hover { opacity: 0.7; }
.comment-list { margin-top: 10px; }
.comment-scroll { max-height: 160px; overflow-y: auto; padding: 10px;
  background: #f9f9f9; border-radius: 8px; scroll-behavior: smooth; }
.comment-loading { text-align: center; color: #888; font-size: 0.9rem; padding: 10px; }
.comment-item { margin-bottom: 6px; font-size: 0.95rem; }
.no-comment { color: #777; font-size: 0.9rem; }
.comment-input { display: flex; gap: 8px; margin-top: 8px; }
.comment-field { flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; }
.submit-comment { padding: 6px 12px; background-color: #007bff; color: white;
  border: none; border-radius: 4px; cursor: pointer; }
.submit-comment:hover { background-color: #0056b3; }
.created-time { font-size: 0.85rem; color: gray; margin-top: 8px; text-align: right; }
.loading { text-align: center; padding: 20px; }
.no-posts { text-align: center; padding: 40px; font-size: 1.2rem; color: #888; }

/* 댓글 리스트 확장 애니메이션 */
.expand-comment-enter-active, .expand-comment-leave-active {
  transition: max-height 0.8s ease, opacity 0.6s ease; overflow: hidden;
}
.expand-comment-enter-from, .expand-comment-leave-to { max-height: 0; opacity: 0; }
.expand-comment-enter-to, .expand-comment-leave-from { max-height: 600px; opacity: 1; }

/* 댓글 하나씩 등장 애니메이션 */
.fade-comment-item-enter-active { transition: all 0.5s ease; }
.fade-comment-item-enter-from { opacity: 0; transform: translateY(10px); }
.fade-comment-item-enter-to { opacity: 1; transform: translateY(0); }

/* 링크 기본 스타일 제거 */
.router-link, .router-link:visited { color: inherit; text-decoration: none; }
.router-link:hover { text-decoration: none; color: inherit; cursor: pointer; }
</style>
