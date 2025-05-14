<template>
  <teleport to="body">
    <transition name="fade-slide" appear>
      <div class="modal-overlay" v-if="visible">
        <div class="modal-content">
          <button class="modal-close" @click="emit('close')">×</button>
          <h3 class="modal-title">게시글 작성</h3>
          <input
            v-model="form.title"
            placeholder="제목"
            class="modal-input"
            :class="{ invalid: showError && !form.title.trim() }"
          />
          <textarea
            v-model="form.content"
            placeholder="내용"
            class="modal-textarea"
            :class="{ invalid: showError && !form.content.trim() }"
          ></textarea>
          <p v-if="formError" class="form-error">{{ formError }}</p>

          <label class="file-upload-label">
            이미지 업로드
            <input
              type="file"
              @change="handleImageChange"
              accept="image/*"
              class="modal-file-input-hidden"
            />
          </label>

          <div v-if="previewImage" class="image-preview">
            <img :src="previewImage" alt="미리보기" />
          </div>

          <div class="modal-actions">
            <button class="modal-submit-btn" @click="submit" :disabled="loading">
              <span v-if="loading" class="spinner"></span>
              {{ loading ? '등록 중...' : '등록' }}
            </button>
            <button class="modal-cancel-btn" @click="emit('close')" :disabled="loading">
              취소
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { reactive, ref, toRefs, watch } from 'vue';
import axios from 'axios';

const props = defineProps({ visible: Boolean });
const { visible } = toRefs(props);
const emit = defineEmits(['close', 'posted']);
const form = reactive({ title: '', content: '' });
const imageFile = ref(null);
const previewImage = ref(null);
const loading = ref(false);
const formError = ref('');
const showError = ref(false);

const handleImageChange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    alert('지원하지 않는 이미지 형식입니다. (jpg, jpeg, png, gif만 가능)');
    return;
  }
  imageFile.value = file;
  const reader = new FileReader();
  reader.onload = () => { previewImage.value = reader.result; };
  reader.readAsDataURL(file);
};

const submit = async () => {
  formError.value = '';
  showError.value = true;
  if (!form.title.trim() || !form.content.trim()) {
    formError.value = '제목과 내용을 모두 입력하세요.';
    return;
  }
  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('post', new Blob([JSON.stringify(form)], { type: 'application/json' }));
    if (imageFile.value) formData.append('image', imageFile.value);
    await axios.post('/api/feed', formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('jwt')}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    emit('posted');
    emit('close');
  } catch (err) {
    console.error('게시글 등록 실패', err);
    alert('등록에 실패했습니다.');
  } finally {
    loading.value = false;
    showError.value = false;
  }
};

watch(visible, (newVal) => {
  if (!newVal) {
    Object.assign(form, { title: '', content: '' });
    imageFile.value = null;
    previewImage.value = null;
    formError.value = '';
    showError.value = false;
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  background: #fff;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  width: 95%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Segoe UI', sans-serif;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-title {
  font-size: 1.5rem;
  text-align: center;
  margin-bottom: 12px;
}

.modal-input,
.modal-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 14px;
}
.modal-input:focus,
.modal-textarea:focus {
  border-color: #1976d2;
  outline: none;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.2);
}
.invalid {
  border-color: #e53935;
  background-color: #fff6f6;
}

.form-error {
  color: #e53935;
  font-size: 13px;
  margin-top: -10px;
  margin-bottom: -4px;
  padding-left: 2px;
}

.modal-textarea { min-height: 120px; resize: vertical; }

.file-upload-label {
  display: inline-block;
  background-color: #1976d2;
  color: white;
  padding: 10px;
  text-align: center;
  border-radius: 6px;
  cursor: pointer;
}

.modal-file-input-hidden { display: none; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-submit-btn,
.modal-cancel-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.modal-submit-btn {
  background-color: #4caf50;
  color: white;
}
.modal-submit-btn:hover {
  background-color: #43a047;
}
.modal-submit-btn:disabled {
  background-color: #9e9e9e;
  cursor: not-allowed;
}

.modal-cancel-btn {
  background-color: #e0e0e0;
  color: #333;
}
.modal-cancel-btn:hover {
  background-color: #d5d5d5;
}
.modal-cancel-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.image-preview {
  text-align: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 250px;
  border-radius: 12px;
  margin-top: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
