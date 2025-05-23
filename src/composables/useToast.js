// composables/useToast.js - 개선된 토스트 관리자
import { ref, nextTick } from 'vue';

// 전역 토스트 상태
const toasts = ref([]);
const recentToasts = ref(new Set()); // 중복 방지용
let toastIdCounter = 0;

// 설정
const CONFIG = {
  maxToasts: 5,
  stackDelay: 50, // 스택 애니메이션 지연
  duplicateWindow: 3000, // 중복 방지 시간 (3초)
  positions: ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center']
};

export function useToast() {
    
    // 중복 토스트 확인
    const isDuplicate = (message, type) => {
        const key = `${type}:${message}`;
        return recentToasts.value.has(key);
    };

    // 중복 방지 키 추가
    const addDuplicateKey = (message, type) => {
        const key = `${type}:${message}`;
        recentToasts.value.add(key);
        
        // 일정 시간 후 제거
        setTimeout(() => {
            recentToasts.value.delete(key);
        }, CONFIG.duplicateWindow);
    };

    // 토스트 추가 (개선된 버전)
    const showToast = async (options) => {
        const toastConfig = {
            id: ++toastIdCounter,
            title: options.title || '알림',
            message: options.message || '',
            type: options.type || 'info',
            duration: options.duration !== undefined ? options.duration : 5000,
            showProgress: options.showProgress !== undefined ? options.showProgress : true,
            preventDuplicate: options.preventDuplicate !== false, // 기본값: true
            ...options
        };

        // 중복 확인
        if (toastConfig.preventDuplicate && isDuplicate(toastConfig.message, toastConfig.type)) {
            console.log('중복 토스트 방지:', toastConfig.message);
            return null;
        }

        // 중복 방지 키 추가
        if (toastConfig.preventDuplicate) {
            addDuplicateKey(toastConfig.message, toastConfig.type);
        }

        // 최대 개수 초과 시 오래된 토스트 제거
        if (toasts.value.length >= CONFIG.maxToasts) {
            const removeCount = toasts.value.length - CONFIG.maxToasts + 1;
            for (let i = 0; i < removeCount; i++) {
                toasts.value.shift();
            }
        }

        // 새 토스트를 맨 앞에 추가 (최신이 위로)
        toasts.value.unshift(toastConfig);

        // 스택 애니메이션을 위한 약간의 지연
        await nextTick();

        return toastConfig.id;
    };

    // 토스트 제거 (부드러운 애니메이션을 위한 개선)
    const removeToast = async (id) => {
        const index = toasts.value.findIndex(toast => toast.id === id);
        if (index === -1) return;

        // 토스트 제거
        toasts.value.splice(index, 1);

        // DOM 업데이트 대기
        await nextTick();
    };

    // 모든 토스트 제거 (순차적 애니메이션)
    const clearToasts = async (animated = true) => {
        if (!animated) {
            toasts.value = [];
            return;
        }

        // 순차적으로 제거 (아래부터 위로)
        const toastsCopy = [...toasts.value];
        for (let i = toastsCopy.length - 1; i >= 0; i--) {
            await new Promise(resolve => {
                removeToast(toastsCopy[i].id);
                setTimeout(resolve, 100); // 100ms 간격으로 제거
            });
        }
    };

    // 특정 타입의 토스트만 제거
    const clearToastsByType = (type) => {
        toasts.value = toasts.value.filter(toast => toast.type !== type);
    };

    // 편의 메서드들 (개선된 버전)
    const success = (message, options = {}) => {
        return showToast({
            message,
            type: 'success',
            title: options.title || '성공',
            duration: options.duration || 4000,
            ...options
        });
    };

    const error = (message, options = {}) => {
        return showToast({
            message,
            type: 'error',
            title: options.title || '오류',
            duration: options.duration || 8000, // 오류는 더 오래 표시
            ...options
        });
    };

    const warning = (message, options = {}) => {
        return showToast({
            message,
            type: 'warning',
            title: options.title || '경고',
            duration: options.duration || 6000,
            ...options
        });
    };

    const info = (message, options = {}) => {
        return showToast({
            message,
            type: 'info',
            title: options.title || '알림',
            ...options
        });
    };

    // 영구 토스트 (사용자가 직접 닫을 때까지 유지)
    const persistent = (message, options = {}) => {
        return showToast({
            message,
            duration: 0, // 자동 닫기 없음
            showProgress: false,
            ...options
        });
    };

    // 액션 버튼이 있는 토스트
    const withAction = (message, actionText, actionCallback, options = {}) => {
        return showToast({
            message,
            actionText,
            actionCallback,
            duration: 0, // 액션이 있으면 자동 닫기 없음
            showProgress: false,
            ...options
        });
    };

    // 로딩 토스트 (진행률 표시)
    const loading = (message, options = {}) => {
        return showToast({
            message,
            type: 'info',
            title: options.title || '처리 중...',
            duration: 0,
            showProgress: true,
            isLoading: true,
            ...options
        });
    };

    // 로딩 토스트 업데이트
    const updateLoadingToast = (id, progress, message) => {
        const toast = toasts.value.find(t => t.id === id);
        if (toast && toast.isLoading) {
            toast.message = message || toast.message;
            toast.progress = progress;
        }
    };

    // 로딩 완료
    const completeLoading = (id, successMessage, options = {}) => {
        const toast = toasts.value.find(t => t.id === id);
        if (toast && toast.isLoading) {
            toast.type = 'success';
            toast.title = '완료';
            toast.message = successMessage || '작업이 완료되었습니다.';
            toast.isLoading = false;
            toast.duration = options.duration || 3000;
            toast.showProgress = false;
            
            // 자동 닫기 타이머 시작
            setTimeout(() => {
                removeToast(id);
            }, toast.duration);
        }
    };

    // WebSocket 알림 전용 (중복 방지 및 그룹핑)
    const notification = (notificationData) => {
        const typeMessages = {
            FOLLOW: { title: '👥 새 팔로워', type: 'info' },
            LIKE: { title: '❤️ 좋아요', type: 'success' },
            COMMENT: { title: '💬 새 댓글', type: 'info' },
            MENTION: { title: '🏷️ 멘션', type: 'warning' }
        };

        const config = typeMessages[notificationData.type] || {
            title: '🔔 알림',
            type: 'info'
        };

        return showToast({
            title: config.title,
            message: notificationData.content,
            type: config.type,
            duration: 4000,
            preventDuplicate: true // 알림은 중복 방지
        });
    };

    // 일괄 알림 (여러 알림을 하나로 그룹핑)
    const batchNotification = (notifications, options = {}) => {
        if (notifications.length === 0) return;
        
        if (notifications.length === 1) {
            return notification(notifications[0]);
        }

        // 여러 알림을 하나로 합침
        const types = [...new Set(notifications.map(n => n.type))];
        const count = notifications.length;
        
        const title = types.length === 1 
            ? `${typeMessages[types[0]]?.title || '🔔 알림'} (${count}개)`
            : `🔔 새 알림 (${count}개)`;
            
        const message = notifications.length <= 3
            ? notifications.map(n => n.content).join('\n')
            : `${notifications.slice(0, 2).map(n => n.content).join('\n')}\n그 외 ${count - 2}개...`;

        return showToast({
            title,
            message,
            type: 'info',
            duration: 6000,
            ...options
        });
    };

    // 토스트 통계
    const getStats = () => {
        const stats = toasts.value.reduce((acc, toast) => {
            acc[toast.type] = (acc[toast.type] || 0) + 1;
            return acc;
        }, {});

        return {
            total: toasts.value.length,
            byType: stats,
            recentCount: recentToasts.value.size
        };
    };

    return {
        // 상태
        toasts,
        
        // 핵심 메서드
        showToast,
        removeToast,
        clearToasts,
        clearToastsByType,
        
        // 편의 메서드
        success,
        error,
        warning,
        info,
        persistent,
        withAction,
        
        // 로딩 관련
        loading,
        updateLoadingToast,
        completeLoading,
        
        // 알림 관련
        notification,
        batchNotification,
        
        // 유틸리티
        getStats
    };
}

// 전역 편의 객체 (선택사항)
export const toast = {
    success: (msg, opts) => useToast().success(msg, opts),
    error: (msg, opts) => useToast().error(msg, opts),
    warning: (msg, opts) => useToast().warning(msg, opts),
    info: (msg, opts) => useToast().info(msg, opts),
    loading: (msg, opts) => useToast().loading(msg, opts),
    show: (opts) => useToast().showToast(opts)
};