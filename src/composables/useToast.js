// composables/useToast.js - 토스트 관리자
import { ref, nextTick } from 'vue';

// 전역 토스트 상태
const toasts = ref([]);
let toastIdCounter = 0;

export function useToast() {

    // 토스트 추가
    const showToast = (options) => {
        const toast = {
            id: ++toastIdCounter,
            title: options.title || '알림',
            message: options.message || '',
            type: options.type || 'info',
            duration: options.duration !== undefined ? options.duration : 5000,
            showProgress: options.showProgress !== undefined ? options.showProgress : true,
            ...options
        };

        toasts.value.push(toast);

        // 최대 토스트 개수 제한 (5개)
        if (toasts.value.length > 5) {
            toasts.value.shift();
        }

        return toast.id;
    };

    // 토스트 제거
    const removeToast = (id) => {
        const index = toasts.value.findIndex(toast => toast.id === id);
        if (index > -1) {
            toasts.value.splice(index, 1);
        }
    };

    // 모든 토스트 제거
    const clearToasts = () => {
        toasts.value = [];
    };

    // 편의 메서드들
    const success = (message, options = {}) => {
        return showToast({
            message,
            type: 'success',
            title: '성공',
            ...options
        });
    };

    const error = (message, options = {}) => {
        return showToast({
            message,
            type: 'error',
            title: '오류',
            duration: 8000, // 오류는 좀 더 오래 표시
            ...options
        });
    };

    const warning = (message, options = {}) => {
        return showToast({
            message,
            type: 'warning',
            title: '경고',
            ...options
        });
    };

    const info = (message, options = {}) => {
        return showToast({
            message,
            type: 'info',
            title: '알림',
            ...options
        });
    };

    // 알림 타입별 메시지
    const notification = (notificationData) => {
        const typeMessages = {
            FOLLOW: {
                title: '👥 새 팔로워',
                type: 'info'
            },
            LIKE: {
                title: '❤️ 좋아요',
                type: 'success'
            },
            COMMENT: {
                title: '💬 새 댓글',
                type: 'info'
            }
        };

        const config = typeMessages[notificationData.type] || {
            title: '🔔 알림',
            type: 'info'
        };

        return showToast({
            title: config.title,
            message: notificationData.content,
            type: config.type,
            duration: 4000
        });
    };

    return {
        toasts,
        showToast,
        removeToast,
        clearToasts,
        success,
        error,
        warning,
        info,
        notification
    };
}