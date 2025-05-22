import { ref, onMounted, onUnmounted } from 'vue';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useUserStore } from '@/scripts/store';

export function useWebSocket() {
    const stompClient = ref(null);
    const isConnected = ref(false);
    const userStore = useUserStore();

    const connect = () => {
        if (!userStore.currentMember.id || userStore.currentMember.id === 0) {
            console.log('로그인되지 않은 상태에서는 WebSocket에 연결하지 않습니다.');
            return;
        }

        const socket = new SockJS('/ws');
        stompClient.value = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                // HttpOnly 쿠키가 자동으로 전송되므로 별도 토큰 불필요
            },
            debug: (str) => {
                console.log('STOMP Debug:', str);
            },
            reconnectDelay: 5000, // 5초마다 재연결 시도
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        stompClient.value.onConnect = (frame) => {
            console.log('WebSocket 연결됨:', frame);
            isConnected.value = true;
        };

        // useWebSocket.js에서 에러 내용 자세히 보기
        stompClient.value.onStompError = (frame) => {
            console.error('WebSocket 오류:', frame);
            console.error('에러 헤더:', frame.headers);
            console.error('에러 본문:', new TextDecoder().decode(frame.binaryBody));
            isConnected.value = false;
        };

        stompClient.value.onDisconnect = () => {
            console.log('WebSocket 연결 해제됨');
            isConnected.value = false;
        };

        stompClient.value.activate();
    };

    const disconnect = () => {
        if (stompClient.value) {
            stompClient.value.deactivate();
            isConnected.value = false;
        }
    };

    const subscribe = (destination, callback) => {
        if (stompClient.value && isConnected.value) {
            return stompClient.value.subscribe(destination, callback);
        }
        return null;
    };

    return {
        stompClient,
        isConnected,
        connect,
        disconnect,
        subscribe
    };
}