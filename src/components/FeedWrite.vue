<template>
  <div class="feed-wrapper">
    <h1 class="header animate-on-scroll">게시글 작성</h1>

    <form @submit.prevent="submitPost" class="write-form animate-on-scroll">
      <div class="form-group animate-on-scroll" style="animation-delay: 0.1s">
        <label>이미지 URL</label>
        <input
            v-model="imageUrl"
            placeholder="이미지 URL을 입력하세요 (선택사항)"
            class="input-field"
        />
        <div v-if="imageUrl" class="image-preview-container">
          <img :src="imageUrl" alt="미리보기" class="image-preview" />
        </div>
      </div>

      <div class="form-group animate-on-scroll" style="animation-delay: 0.2s">
        <label>제목</label>
        <input
            v-model="title"
            required
            placeholder="제목을 입력하세요"
            class="input-field"
        />
      </div>

      <div class="form-group animate-on-scroll" style="animation-delay: 0.3s">
        <label>내용</label>
        <textarea
            v-model="content"
            required
            placeholder="내용을 입력하세요"
            class="input-field textarea"
            rows="6"
        ></textarea>
      </div>

      <div class="action-buttons animate-on-scroll" style="animation-delay: 0.4s">
        <button type="button" @click="router.push('/feed')" class="cancel-button">취소</button>
        <button type="submit" class="submit-button">등록하기</button>
      </div>
    </form>

    <div v-if="success" class="success-message animate-on-scroll">
      <div class="success-card">
        게시글이 성공적으로 등록되었습니다!
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

export default {
  name: "FeedWrite",
  setup() {
    const title = ref("");
    const content = ref("");
    const imageUrl = ref("");
    const success = ref(false);
    const router = useRouter();

    const submitPost = async () => {
      try {
        await axios.post("/api/feed", {
          title: title.value,
          content: content.value,
          imageUrl: imageUrl.value
        });
        success.value = true;
        setTimeout(() => {
          router.push("/feed");
        }, 1500);
      } catch (e) {
        alert("게시글 등록에 실패했습니다.");
        console.error(e);
      }
    };

    // 스크롤 애니메이션 관찰자 설정
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

    onMounted(() => {
      observeFeedAnimation();
    });

    return { title, content, imageUrl, submitPost, success, router };
  }
};
</script>

<style scoped>
/* 기본 레이아웃 및 애니메이션 */
.feed-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
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

.header {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  text-align: left;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
}

/* 폼 스타일 */
.write-form {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  padding: 24px;
  margin-bottom: 24px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.write-form:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #444;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
  color: #333;
}

.input-field:focus {
  outline: none;
  border-color: #aaa;
  box-shadow: 0 0 0 2px rgba(170, 170, 170, 0.2);
  background-color: #fff;
}

.textarea {
  resize: vertical;
  min-height: 150px;
}

/* 버튼 스타일 */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
}

.submit-button, .cancel-button {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-button {
  background-color: #444;
  color: white;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.submit-button:hover {
  background-color: #333;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cancel-button {
  background-color: transparent;
  color: #555;
  border: 1px solid #ddd;
}

.cancel-button:hover {
  background-color: #f5f5f5;
  color: #333;
  transform: translateY(-2px);
}

/* 이미지 미리보기 */
.image-preview-container {
  margin-top: 10px;
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.image-preview {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
}

/* 성공 메시지 */
.success-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: auto;
  animation: fadeInUp 0.6s ease forwards;
}

.success-card {
  background: rgba(68, 68, 68, 0.9);
  color: white;
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate(-50%, 40px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .feed-wrapper {
    padding: 15px;
  }

  .header {
    font-size: 24px;
  }

  .write-form {
    padding: 20px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .submit-button, .cancel-button {
    width: 100%;
  }
}
</style>