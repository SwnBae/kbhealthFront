<template>
  <div class="write-form">
    <h2>게시글 작성</h2>

    <form @submit.prevent="submitPost">
      <div>
        <label>제목</label>
        <input v-model="title" required />
      </div>

      <div>
        <label>내용</label>
        <textarea v-model="content" required></textarea>
      </div>

      <div>
        <label>이미지 URL</label>
        <input v-model="imageUrl" />
      </div>

      <button type="submit">등록</button>
    </form>

    <div v-if="success" class="success">
      게시글이 성공적으로 등록되었습니다!
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

export default {
  name: "FeedWrite",
  setup() {
    const title = ref("")
    const content = ref("")
    const imageUrl = ref("")
    const success = ref(false)
    const router = useRouter()

    const submitPost = async () => {
      try {
        await axios.post("/api/feed", {
          title: title.value,
          content: content.value,
          imageUrl: imageUrl.value
        })
        success.value = true
        setTimeout(() => {
          router.push("/feed")
        }, 1000)
      } catch (e) {
        alert("게시글 등록에 실패했습니다.")
        console.error(e)
      }
    }

    return { title, content, imageUrl, submitPost, success }
  }
}
</script>

<style scoped>
.write-form {
  max-width: 500px;
  margin: 0 auto;
}
input, textarea {
  width: 100%;
  margin-bottom: 1rem;
}
.success {
  color: green;
  margin-top: 1rem;
}
</style>
