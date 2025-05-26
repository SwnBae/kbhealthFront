import { ref, onMounted, onUnmounted } from 'vue';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useUserStore } from '@/scripts/store';

// 🔥 전역 WebSocket 상태
const globalStompClient = ref(null);
const globalIsConnected = ref(false);
const globalSubscriptions = new Map(); // 🆕 구독 관리
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

export function useWebSocket() {
    const connect = () => {
        const userStore = useUserStore();
        const currentUser = userStore.currentMember;
        const userId = currentUser?.id;

        if (!userId || userId === 0) {
            console.log('❌ 로그인되지 않은 상태에서는 WebSocket에 연결하지 않습니다.');
            return;
        }

        if (globalStompClient.value && globalIsConnected.value) {
            console.log('✅ 이미 WebSocket이 연결되어 있습니다.');
            return;
        }

        if (connectionAttempts >= maxConnectionAttempts) {
            console.error('❌ WebSocket 연결 최대 시도 횟수 초과');
            return;
        }

        connectionAttempts++;
        console.log(`🚀 WebSocket 연결 시도 ${connectionAttempts}/${maxConnectionAttempts}`);

        const socket = new SockJS('/ws');
        globalStompClient.value = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log('📡 STOMP Debug:', str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        globalStompClient.value.onConnect = (frame) => {
            console.log('✅ WebSocket 연결 성공!');
            globalIsConnected.value = true;
            connectionAttempts = 0;

            // 🆕 재연결 시 기존 구독 복구
            restoreSubscriptions();
        };

        globalStompClient.value.onStompError = (frame) => {
            console.error('❌ WebSocket STOMP 오류', frame);
            globalIsConnected.value = false;
        };

        globalStompClient.value.onDisconnect = () => {
            console.log('🔌 WebSocket 연결 해제됨');
            globalIsConnected.value = false;
        };

        try {
            globalStompClient.value.activate();
        } catch (error) {
            console.error('❌ WebSocket 활성화 실패:', error);
            globalIsConnected.value = false;
        }
    };

    const disconnect = () => {
        console.log('🔌 WebSocket 연결 해제 시작...');

        // 🆕 모든 구독 정리
        clearAllSubscriptions();

        if (globalStompClient.value) {
            globalStompClient.value.deactivate();
            globalStompClient.value = null;
            globalIsConnected.value = false;
            connectionAttempts = 0;
            console.log('✅ WebSocket 연결 해제 완료');
        }
    };

    // 🔧 개선된 구독 함수 - 중복 구독 허용으로 변경
    const subscribe = (destination, callback, subscriptionId = null) => {
        console.log('📡 구독 시도:', destination, 'ID:', subscriptionId);

        // 🔧 구독 ID 생성
        const subId = subscriptionId || `${destination}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 🔧 동일 ID가 이미 존재하는 경우만 방지 (destination 중복은 허용)
        if (globalSubscriptions.has(subId)) {
            console.warn('⚠️ 동일 ID 구독이 이미 존재:', subId);
            return globalSubscriptions.get(subId).subscription;
        }

        if (globalStompClient.value && globalIsConnected.value) {
            try {
                const subscription = globalStompClient.value.subscribe(destination, callback);

                // 구독 정보 저장
                globalSubscriptions.set(subId, {
                    subscription,
                    destination,
                    callback,
                    subscriptionId: subId,
                    createdAt: new Date().toISOString()
                });

                console.log('✅ 구독 성공:', destination, '(ID:', subId, ')');
                return subscription;
            } catch (error) {
                console.error('❌ 구독 실패:', destination, error);
                return null;
            }
        } else {
            console.warn('❌ WebSocket 연결되지 않음, 구독 대기:', destination);

            // 연결 대기 후 재시도
            const retrySubscribe = () => {
                if (globalIsConnected.value) {
                    return subscribe(destination, callback, subscriptionId);
                } else {
                    setTimeout(retrySubscribe, 1000);
                }
            };

            setTimeout(retrySubscribe, 1000);
            return null;
        }
    };

    // 🆕 특정 구독 해제
    const unsubscribe = (subscriptionId) => {
        console.log('🔄 구독 해제 시도:', subscriptionId);

        if (globalSubscriptions.has(subscriptionId)) {
            const subInfo = globalSubscriptions.get(subscriptionId);
            try {
                if (subInfo.subscription && subInfo.subscription.unsubscribe) {
                    subInfo.subscription.unsubscribe();
                }
                globalSubscriptions.delete(subscriptionId);
                console.log('✅ 구독 해제 완료:', subInfo.destination, 'ID:', subscriptionId);
                return true;
            } catch (error) {
                console.warn('⚠️ 구독 해제 실패:', subscriptionId, error);
                globalSubscriptions.delete(subscriptionId);
                return false;
            }
        }

        console.warn('⚠️ 해제할 구독을 찾을 수 없음:', subscriptionId);
        return false;
    };

    const debugSubscriptions = () => {
        console.log('🔍 현재 구독 상태:');
        console.log('📊 연결 상태:', globalIsConnected.value);
        console.log('📊 구독 개수:', globalSubscriptions.size);

        globalSubscriptions.forEach((subInfo, subId) => {
            console.log(`📋 구독 ID: ${subId}`);
            console.log(`📋 Destination: ${subInfo.destination}`);
            console.log(`📋 생성 시간: ${subInfo.createdAt}`);
            console.log('---');
        });
    };

    // 🆕 모든 구독 정리
    const clearAllSubscriptions = () => {
        console.log('🧹 모든 구독 정리 시작...');

        globalSubscriptions.forEach((subInfo, subId) => {
            try {
                if (subInfo.subscription) {
                    subInfo.subscription.unsubscribe();
                }
            } catch (error) {
                console.warn('⚠️ 구독 해제 실패:', subId, error);
            }
        });

        globalSubscriptions.clear();
        console.log('✅ 모든 구독 정리 완료');
    };

    // 🆕 재연결 시 구독 복구
    const restoreSubscriptions = () => {
        console.log('🔄 구독 복구 시작...');

        const subscriptionsToRestore = Array.from(globalSubscriptions.entries());
        globalSubscriptions.clear(); // 기존 구독 정보 초기화

        subscriptionsToRestore.forEach(([subId, subInfo]) => {
            console.log('🔄 구독 복구:', subInfo.destination);
            subscribe(subInfo.destination, subInfo.callback, subId);
        });

        console.log('✅ 구독 복구 완료');
    };

    // 🆕 연결 대기 (Promise 기반)
    const waitForConnection = (timeout = 10000) => {
        return new Promise((resolve, reject) => {
            if (globalIsConnected.value) {
                resolve();
                return;
            }

            const startTime = Date.now();
            const checkConnection = () => {
                if (globalIsConnected.value) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('WebSocket 연결 대기 시간 초과'));
                } else {
                    setTimeout(checkConnection, 100);
                }
            };

            checkConnection();
        });
    };

    // 🔧 강제 재연결 개선
    const forceReconnect = () => {
        console.log('🔄 강제 재연결 시작...');
        connectionAttempts = 0;
        disconnect();
        setTimeout(() => {
            connect();
        }, 1000);
    };

    // 🔧 연결 상태 확인
    const checkConnection = () => {
        if (!globalIsConnected.value && globalStompClient.value) {
            console.log('🔄 연결 상태 불일치 감지 - 재연결 시도');
            forceReconnect();
        }
        return globalIsConnected.value;
    };

    // 🆕 구독 상태 확인
    const getSubscriptionStatus = () => {
        return {
            isConnected: globalIsConnected.value,
            subscriptionCount: globalSubscriptions.size,
            subscriptions: Array.from(globalSubscriptions.keys())
        };
    };

    return {
        stompClient: globalStompClient,
        isConnected: globalIsConnected,
        connect,
        disconnect,
        subscribe,
        unsubscribe,
        waitForConnection,
        forceReconnect,
        checkConnection, // 🆕 추가
        getSubscriptionStatus,
        debugSubscriptions, // 🆕 디버깅용

        // 🆕 편의 함수들
        subscribeNotifications: (callback) => subscribe('/user/queue/notifications', callback, 'notifications'),
        subscribeNotificationCount: (callback) => subscribe('/user/queue/notification-count', callback, 'notification-count'),
        subscribeChatMessages: (callback) => subscribe('/user/queue/chat-messages', callback, 'chat-messages'),
        subscribeChatUnreadCount: (callback) => subscribe('/user/queue/chat-unread-count', callback, 'chat-unread-count'),
    };
}