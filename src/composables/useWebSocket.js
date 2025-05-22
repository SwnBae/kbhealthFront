import { ref, onMounted, onUnmounted } from 'vue';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useUserStore } from '@/scripts/store';

// 🔥 전역 WebSocket 상태 (모든 컴포넌트에서 공유)
const globalStompClient = ref(null);
const globalIsConnected = ref(false);
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

export function useWebSocket() {
    const userStore = useUserStore();

    const connect = () => {
        console.log('🔌 WebSocket 연결 시도 시작...');
        console.log('🔌 현재 사용자 ID:', userStore.currentMember?.id);
        console.log('🔌 현재 전역 연결 상태:', globalIsConnected.value);

        if (!userStore.currentMember?.id || userStore.currentMember.id === 0) {
            console.log('❌ 로그인되지 않은 상태에서는 WebSocket에 연결하지 않습니다.');
            return;
        }

        // 🔥 이미 연결되어 있으면 연결 안함
        if (globalStompClient.value && globalIsConnected.value) {
            console.log('✅ 이미 WebSocket이 연결되어 있습니다.');
            return;
        }

        // 🔥 연결 시도 횟수 제한
        if (connectionAttempts >= maxConnectionAttempts) {
            console.error('❌ WebSocket 연결 최대 시도 횟수 초과');
            return;
        }

        connectionAttempts++;
        console.log(`🚀 WebSocket 연결 시도 ${connectionAttempts}/${maxConnectionAttempts}`);

        console.log('🚀 SockJS 소켓 생성 중...');
        const socket = new SockJS('/ws');

        console.log('🚀 STOMP 클라이언트 생성 중...');
        globalStompClient.value = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                // HttpOnly 쿠키가 자동으로 전송되므로 별도 토큰 불필요
            },
            debug: (str) => {
                console.log('📡 STOMP Debug:', str);
            },
            reconnectDelay: 5000, // 5초마다 재연결 시도
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        globalStompClient.value.onConnect = (frame) => {
            console.log('✅✅✅ 전역 WebSocket 연결 성공! ✅✅✅');
            console.log('🔗 연결 프레임:', frame);
            globalIsConnected.value = true;
            connectionAttempts = 0; // 성공 시 카운터 리셋
        };

        globalStompClient.value.onStompError = (frame) => {
            console.error('❌❌❌ 전역 WebSocket STOMP 오류 ❌❌❌');
            console.error('🔴 에러 프레임:', frame);
            console.error('🔴 에러 헤더:', frame.headers);
            if (frame.binaryBody) {
                console.error('🔴 에러 본문:', new TextDecoder().decode(frame.binaryBody));
            }
            globalIsConnected.value = false;
        };

        globalStompClient.value.onWebSocketError = (error) => {
            console.error('❌❌❌ 전역 WebSocket 연결 오류 ❌❌❌');
            console.error('🔴 WebSocket 오류:', error);
            globalIsConnected.value = false;
        };

        globalStompClient.value.onDisconnect = () => {
            console.log('🔌 전역 WebSocket 연결 해제됨');
            globalIsConnected.value = false;
        };

        // 🔥 연결 상태 변화 모니터링
        globalStompClient.value.onWebSocketClose = (event) => {
            console.log('🔌 전역 WebSocket 연결 닫힘:', event);
            globalIsConnected.value = false;
        };

        console.log('🚀 WebSocket 연결 활성화 중...');

        try {
            globalStompClient.value.activate();
            console.log('🔄 WebSocket 활성화 명령 전송됨');
        } catch (error) {
            console.error('❌ WebSocket 활성화 실패:', error);
            globalIsConnected.value = false;
        }
    };

    const disconnect = () => {
        console.log('🔌 전역 WebSocket 연결 해제 시작...');

        if (globalStompClient.value) {
            globalStompClient.value.deactivate();
            globalStompClient.value = null;
            globalIsConnected.value = false;
            connectionAttempts = 0;
            console.log('✅ 전역 WebSocket 연결 해제 완료');
        } else {
            console.log('⚠️ 해제할 WebSocket 연결이 없습니다.');
        }
    };

    const subscribe = (destination, callback) => {
        console.log('📡 구독 시도:', destination);
        console.log('📡 전역 연결 상태:', globalIsConnected.value);
        console.log('📡 전역 클라이언트 존재:', !!globalStompClient.value);

        if (globalStompClient.value && globalIsConnected.value) {
            console.log('✅ 구독 성공:', destination);
            return globalStompClient.value.subscribe(destination, callback);
        } else {
            console.warn('❌ 구독 실패 - WebSocket 연결되지 않음:', destination);
            console.warn('❌ 전역 연결 상태:', globalIsConnected.value);
            console.warn('❌ 전역 클라이언트:', globalStompClient.value);
            return null;
        }
    };

    // 🆕 연결 상태 확인 헬퍼 함수
    const checkConnection = () => {
        console.log('🔍 전역 WebSocket 연결 상태 확인:');
        console.log('  - globalIsConnected:', globalIsConnected.value);
        console.log('  - globalStompClient 존재:', !!globalStompClient.value);
        console.log('  - globalStompClient 활성:', globalStompClient.value?.active);
        console.log('  - 사용자 ID:', userStore.currentMember?.id);
        console.log('  - 연결 시도 횟수:', connectionAttempts);

        return {
            isConnected: globalIsConnected.value,
            hasClient: !!globalStompClient.value,
            isActive: globalStompClient.value?.active,
            userId: userStore.currentMember?.id,
            attempts: connectionAttempts
        };
    };

    // 🆕 강제 재연결 함수
    const forceReconnect = () => {
        console.log('🔄 강제 재연결 시작...');
        connectionAttempts = 0; // 카운터 리셋
        disconnect();
        setTimeout(() => {
            connect();
        }, 1000);
    };

    // 🆕 연결 대기 함수
    const waitForConnection = (maxWaitTime = 10000) => {
        return new Promise((resolve, reject) => {
            if (globalIsConnected.value) {
                resolve(true);
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (globalIsConnected.value) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime > maxWaitTime) {
                    clearInterval(checkInterval);
                    reject(new Error('WebSocket 연결 대기 시간 초과'));
                }
            }, 100);
        });
    };

    return {
        // 🔥 전역 상태 반환
        stompClient: globalStompClient,
        isConnected: globalIsConnected,
        connect,
        disconnect,
        subscribe,
        checkConnection,
        forceReconnect,
        waitForConnection // 🆕 추가
    };
}