<template>
  <div class="chat-toast-container">
    <TransitionGroup name="chat-toast" tag="div" class="chat-toast-list">
      <div
          v-for="toast in chatToasts"
          :key="toast.id"
          class="chat-toast"
          @click="handleToastClick(toast)"
      >
        <div class="toast-avatar">
          <img :src="toast.senderImage" :alt="toast.senderName" />
        </div>
        <div class="toast-content">
          <div class="toast-sender">{{ toast.senderName }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close" @click.stop="removeToast(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import router from '@/scripts/router.js';

const chatToasts = ref([]);
let toastIdCounter = 0;

// 채팅 토스트 추가
const addChatToast = (chatMessage) => {
  const toast = {
    id: ++toastIdCounter,
    chatRoomId: chatMessage.chatRoomId,
    senderName: chatMessage.senderName,
    senderImage: chatMessage.senderProfileImage,
    message: chatMessage.content,
    timestamp: Date.now()
  };

  chatToasts.value.unshift(toast);

  // 최대 3개까지만 표시
  if (chatToasts.value.length > 3) {
    chatToasts.value = chatToasts.value.slice(0, 3);
  }

  // 5초 후 자동 제거
  setTimeout(() => {
    removeToast(toast.id);
  }, 5000);
};

// 토스트 제거
const removeToast = (id) => {
  const index = chatToasts.value.findIndex(toast => toast.id === id);
  if (index > -1) {
    chatToasts.value.splice(index, 1);
  }
};

// 토스트 클릭 시 채팅 페이지로 이동
const handleToastClick = (toast) => {
  router.push('/chat');
  removeToast(toast.id);
};

// 외부에서 사용할 수 있도록 expose
defineExpose({
  addChatToast,
  removeToast
});
</script>

<style scoped>
.chat-toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.chat-toast-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.chat-toast {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  max-width: 350px;
  min-width: 280px;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s ease;
}

.chat-toast:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.toast-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.toast-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-sender {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.toast-message {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.toast-close:hover {
  background: #f5f5f5;
  color: #666;
}

/* 토스트 애니메이션 */
.chat-toast-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.chat-toast-leave-active {
  transition: all 0.3s ease-out;
}

.chat-toast-enter-from {
  opacity: 0;
  transform: translateY(-30px) scale(0.9);
}

.chat-toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.chat-toast-move {
  transition: transform 0.3s ease;
}

/* 모바일 최적화 */
@media (max-width: 480px) {
  .chat-toast-container {
    top: 15px;
    left: 10px;
    right: 10px;
    transform: none;
  }

  .chat-toast {
    max-width: none;
    min-width: auto;
    width: 100%;
  }

  .toast-message {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>