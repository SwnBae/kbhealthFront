<!-- components/ToastContainer.vue -->
<template>
  <div class="toast-container">
    <ToastNotification
        v-for="toast in toasts"
        :key="toast.id"
        :title="toast.title"
        :message="toast.message"
        :type="toast.type"
        :duration="toast.duration"
        :show-progress="toast.showProgress"
        @close="removeToast(toast.id)"
    />
  </div>
</template>

<script setup>
import { useToast } from '@/composables/useToast';
import ToastNotification from './ToastNotification.vue';

const { toasts, removeToast } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;
  padding: 20px;
}

.toast-container > * {
  pointer-events: auto;
  margin-bottom: 8px;
}

/* 모바일에서는 전체 너비 */
@media (max-width: 480px) {
  .toast-container {
    left: 0;
    right: 0;
    padding: 10px;
  }
}
</style>