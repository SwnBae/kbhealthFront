<template>
  <teleport to="body">
    <transition name="fade" appear>
      <div class="modal-overlay" v-if="visible">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="header-title">새 게시물 만들기</h1>
            <button class="modal-close" @click="emit('close')">×</button>
          </div>

          <!-- 이미지 업로드 섹션 -->
          <div class="image-upload-container">
            <label class="image-upload-area" :class="{ 'has-image': previewImage }">
              <div v-if="!previewImage" class="upload-placeholder">
                <div class="plus-icon">+</div>
                <span class="upload-text">사진을 추가하세요</span>
              </div>
              <img v-if="previewImage" :src="previewImage" alt="미리보기" class="preview-image" />
              <input
                  type="file"
                  @change="handleImageChange"
                  accept="image/*"
                  class="file-input-hidden"
              />
            </label>
          </div>

          <!-- 입력 폼 -->
          <div class="form-container">
            <div class="form-group">
              <input
                  v-model="form.title"
                  placeholder="제목"
                  class="input-field"
                  :class="{ invalid: showError && !form.title.trim() }"
              />
            </div>

            <div class="form-group">
              <textarea
                  v-model="form.content"
                  placeholder="내용을 입력하세요..."
                  class="input-field textarea"
                  :class="{ invalid: showError && !form.content.trim() }"
                  rows="6"
              ></textarea>
            </div>

            <!-- 오류 메시지 -->
            <p v-if="formError" class="form-error">
              {{ formError }}
            </p>

            <!-- 버튼 영역 -->
            <div class="action-buttons">
              <button class="cancel-button" @click="emit('close')" :disabled="loading">
                취소
              </button>
              <button class="submit-button" @click="submit" :disabled="loading">
                <span v-if="loading" class="spinner"></span>
                {{ loading ? '공유 중...' : '공유하기' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { reactive, ref, toRefs, watch, onMounted } from 'vue';
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

onMounted(() => {
  // 필요한 초기화 로직이 있으면 여기에 추가
});
</script>

<style scoped>
/* 모달 오버레이 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

/* 모달 컨텐츠 */
.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 95%;
  max-width: 500px;
  overflow: hidden;
}

/* 모달 헤더 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 0;
  position: relative;
  border-bottom: 1px solid #efefef;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin: 0;
  text-align: center;
}

.modal-close {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #262626;
  padding: 0;
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: #000;
}

/* 이미지 업로드 영역 */
.image-upload-container {
  padding: 12px;
  display: flex;
  justify-content: center; /* 가운데 정렬 */
}

.image-upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  border: 1px dashed #dbdbdb;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  position: relative;
  aspect-ratio: 1/1;
  width: 40%;
}

.image-upload-area:hover {
  background-color: #f0f0f0;
}

.image-upload-area.has-image {
  border-style: solid;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8e8e8e;
}

.plus-icon {
  font-size: 48px;
  font-weight: 300;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.file-input-hidden {
  opacity: 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

/* 폼 영역 */
.form-container {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.input-field {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  background-color: #fff;
}

.input-field:focus {
  outline: none;
  border-color: #a8a8a8;
}

.textarea {
  resize: none;
  min-height: 120px;
}

.invalid {
  border-color: #ed4956;
}

/* 오류 메시지 */
.form-error {
  color: #ed4956;
  font-size: 13px;
  margin: 8px 0;
}

/* 버튼 영역 */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.submit-button, .cancel-button {
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button {
  background-color: #e1f7e1;  /* 연한 초록색 */
  color: #4caf50;  /* 초록색 텍스트 */
  border: 1px solid #b2dfbb;  /* 연한 초록색 테두리 */
  border-radius: 20px;  /* 둥근 모서리 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}


.submit-button:hover:not(:disabled) {
  background-color: #c8e6c9;  /* 약간 더 진한 초록색 */
  color: #388e3c;  /* 어두운 초록색 텍스트 */
}


.submit-button:disabled {
  background-color: #c8e6c9;  /* 비활성화 시에도 비슷한 연한 초록색 */
  color: #a5d6a7;  /* 부드러운 초록색 텍스트 */
  border-color: #81c784;  /* 더 연한 초록색 테두리 */
  cursor: not-allowed;
}

.cancel-button {
  background-color: transparent;
  color: inherit;  /* 색상은 부모로부터 상속 */
  border: 1px solid #ddd;  /* 버튼 테두리 */
  border-radius: 20px;  /* 둥근 모서리 */
  padding: 8px 20px;  /* 버튼 크기 */
  font-size: 14px;  /* 글자 크기 */
  font-weight: 600;  /* 글자 굵기 */
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-button:hover:not(:disabled) {
  background-color: #f6f6f6;  /* 호버 시 배경색 */
  color: #333;  /* 호버 시 텍스트 색상 */
  border-color: #ddd;  /* 테두리 색상 */
}


.cancel-button:disabled {
  color: #8e8e8e;
  cursor: not-allowed;
}

/* 로딩 스피너 */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 트랜지션 애니메이션 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 반응형 디자인 */
@media (max-width: 500px) {
  .modal-content {
    width: 100%;
    height: 100%;
    max-width: none;
    border-radius: 0;
    display: flex;
    flex-direction: column;
  }

  .image-upload-container {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .form-container {
    border-top: 1px solid #efefef;
  }
}
</style>