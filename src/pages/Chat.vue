<template>
  <div class="chat-layout">
    <div class="chat-sidebar">
      <!-- 채팅방 목록 -->
      <div class="chat-rooms-header">
        <h2>채팅</h2>
        <div class="unread-badge" v-if="totalUnreadCount > 0">
          {{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }}
        </div>
      </div>

      <div class="chat-rooms-list">
        <div v-if="chatRooms.length === 0" class="no-chat-rooms">
          아직 대화가 없습니다
        </div>

        <div
            v-for="room in chatRooms"
            :key="room.chatRoomId"
            class="chat-room-item"
            :class="{
            active: selectedRoomId === room.chatRoomId,
            unread: room.unreadCount > 0
          }"
            @click="selectChatRoom(room)"
        >
          <div class="room-avatar">
            <img :src="room.partnerProfileImage || '/assets/img/default_profile.png'" :alt="room.partnerName" />
          </div>
          <div class="room-info">
            <div class="room-name">{{ room.partnerName }}</div>
            <div class="room-last-message">{{ room.lastMessage || '메시지가 없습니다' }}</div>
            <div class="room-time">{{ formatTime(room.lastMessageTime) }}</div>
          </div>
          <div v-if="room.unreadCount > 0" class="room-unread-count">
            {{ room.unreadCount > 99 ? '99+' : room.unreadCount }}
          </div>
        </div>
      </div>
    </div>

    <div class="chat-main">
      <div v-if="!selectedRoomId" class="chat-empty">
        <div class="empty-icon">💬</div>
        <h3>대화를 시작해보세요</h3>
        <p>왼쪽에서 채팅방을 선택하거나 새로운 대화를 시작하세요.</p>
      </div>

      <div v-else class="chat-conversation">
        <!-- 채팅 헤더 -->
        <div class="chat-header">
          <div class="chat-partner-info">
            <img :src="selectedRoom?.partnerProfileImage || '/assets/img/default_profile.png'" :alt="selectedRoom?.partnerName" class="partner-avatar" />
            <div class="partner-name">{{ selectedRoom?.partnerName }}</div>
          </div>
        </div>

        <!-- 메시지 리스트 -->
        <div class="messages-container" ref="messagesContainer" @scroll="handleScroll">
          <div class="messages-list">
            <div v-if="isLoadingMessages" class="loading-messages">
              메시지를 불러오는 중...
            </div>

            <div
                v-for="message in messages"
                :key="message.id"
                class="message-item"
                :class="{
                'sent': message.senderId === currentUserId,
                'received': message.senderId !== currentUserId
              }"
            >
              <div class="message-content">
                <div class="message-text">{{ message.content }}</div>
                <div class="message-info">
                  <span class="message-time">{{ formatMessageTime(message.createdDate) }}</span>
                  <span v-if="message.senderId === currentUserId && message.isRead" class="read-status">읽음</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 메시지 입력 -->
        <div class="message-input-container">
          <div class="message-input">
            <input
                v-model="newMessage"
                @keyup.enter="sendMessage"
                placeholder="메시지를 입력하세요..."
                :disabled="!isConnected || isSending"
            />
            <button
                @click="sendMessage"
                :disabled="!newMessage.trim() || !isConnected || isSending"
                class="send-button"
            >
              {{ isSending ? '전송 중...' : '전송' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useWebSocket } from '@/composables/useWebSocket.js';
import { useUserStore } from '@/scripts/store.js';
import { useToast } from '@/composables/useToast.js';
import axios from 'axios';
import { useRoute } from 'vue-router';

const route = useRoute();
const userStore = useUserStore();
const { stompClient, isConnected, subscribe, waitForConnection } = useWebSocket();
const { notification } = useToast();

// 상태 관리
const chatRooms = ref([]);
const selectedRoomId = ref(null);
const selectedRoom = ref(null);
const messages = ref([]);
const newMessage = ref('');
const totalUnreadCount = ref(0);
const isLoadingMessages = ref(false);
const isSending = ref(false);
const messagesContainer = ref(null);

// 페이징 관련
const currentPage = ref(0);
const hasMoreMessages = ref(true);

// WebSocket 구독
const chatMessageSubscription = ref(null);
const chatRoomUpdateSubscription = ref(null);

// 현재 사용자 ID
const currentUserId = computed(() => userStore.currentMember?.id);

// 임시 메시지 ID 생성기
let tempMessageId = -1;

// 채팅방 목록 로드 - 🔥 이 함수가 누락되어 있었음
const loadChatRooms = async () => {
  try {
    const response = await axios.get('/api/chat/rooms');
    chatRooms.value = response.data;

    // 총 읽지 않은 개수 계산
    totalUnreadCount.value = chatRooms.value.reduce((sum, room) => sum + room.unreadCount, 0);

  } catch (error) {
    console.error('채팅방 목록 로드 실패:', error);
    chatRooms.value = [];
  }
};

// 채팅방 선택
const selectChatRoom = async (room) => {
  selectedRoomId.value = room.chatRoomId;
  selectedRoom.value = room;
  messages.value = [];
  currentPage.value = 0;
  hasMoreMessages.value = true;

  // 메시지 로드
  await loadMessages(room.chatRoomId, 0);

  // 읽음 처리
  if (room.unreadCount > 0) {
    await markMessagesAsRead(room.chatRoomId);
  }

  // 스크롤을 맨 아래로
  scrollToBottom();
};

// 메시지 로드
const loadMessages = async (chatRoomId, page = 0) => {
  if (isLoadingMessages.value) return;

  isLoadingMessages.value = true;

  try {
    const response = await axios.get(`/api/chat/rooms/${chatRoomId}/messages`, {
      params: { page, size: 20 }
    });

    const newMessages = response.data.content.reverse();

    if (page === 0) {
      messages.value = newMessages;
    } else {
      messages.value = [...newMessages, ...messages.value];
    }

    hasMoreMessages.value = !response.data.last;
    currentPage.value = response.data.number;

  } catch (error) {
    console.error('메시지 로드 실패:', error);
    if (page === 0) {
      messages.value = [];
    }
  } finally {
    isLoadingMessages.value = false;
  }
};

// 메시지 전송 - 낙관적 업데이트 적용
const sendMessage = async () => {
  if (!newMessage.value.trim() || !selectedRoomId.value || !isConnected.value || isSending.value) return;

  const messageContent = newMessage.value.trim();
  const partnerId = getPartnerId(selectedRoomId.value);

  // 낙관적 업데이트 - 즉시 UI에 메시지 추가
  const tempMessage = {
    id: tempMessageId--,
    senderId: currentUserId.value,
    receiverId: partnerId,
    content: messageContent,
    createdDate: new Date().toISOString(),
    isRead: false,
    chatRoomId: selectedRoomId.value,
    isTemporary: true
  };

  messages.value.push(tempMessage);
  newMessage.value = '';
  scrollToBottom();

  // 채팅방 목록에서도 즉시 업데이트
  updateChatRoomLastMessage(selectedRoomId.value, messageContent, new Date().toISOString());

  isSending.value = true;

  try {
    // WebSocket으로 메시지 전송
    if (stompClient.value && stompClient.value.connected) {
      stompClient.value.publish({
        destination: '/app/send-message',
        body: JSON.stringify({
          receiverId: partnerId,
          content: messageContent
        })
      });
    } else {
      throw new Error('WebSocket 연결이 끊어졌습니다.');
    }

  } catch (error) {
    console.error('메시지 전송 실패:', error);

    // 실패 시 임시 메시지 제거
    messages.value = messages.value.filter(m => m.id !== tempMessage.id);
    newMessage.value = messageContent; // 입력 복구

    // 토스트 알림으로 오류 표시
    notification({
      type: 'error',
      title: '전송 실패',
      content: '메시지 전송에 실패했습니다. 다시 시도해주세요.'
    });
  } finally {
    isSending.value = false;
  }
};

// 채팅방 목록의 마지막 메시지 즉시 업데이트
const updateChatRoomLastMessage = (chatRoomId, content, timestamp) => {
  const roomIndex = chatRooms.value.findIndex(room => room.chatRoomId === chatRoomId);
  if (roomIndex > -1) {
    const room = chatRooms.value[roomIndex];
    room.lastMessage = content;
    room.lastMessageTime = timestamp;

    // 채팅방을 맨 위로 이동
    const updatedRoom = chatRooms.value.splice(roomIndex, 1)[0];
    chatRooms.value.unshift(updatedRoom);
  }
};

// 채팅방 ID에서 상대방 ID 추출
const getPartnerId = (chatRoomId) => {
  const [id1, id2] = chatRoomId.split('_').map(Number);
  return id1 === currentUserId.value ? id2 : id1;
};

// 메시지 읽음 처리
const markMessagesAsRead = async (chatRoomId) => {
  try {
    await axios.post(`/api/chat/rooms/${chatRoomId}/read`);

    // 로컬 상태에서도 읽음 처리
    const roomIndex = chatRooms.value.findIndex(room => room.chatRoomId === chatRoomId);
    if (roomIndex > -1) {
      const previousUnreadCount = chatRooms.value[roomIndex].unreadCount;
      chatRooms.value[roomIndex].unreadCount = 0;

      // 총 읽지 않은 개수 업데이트
      totalUnreadCount.value -= previousUnreadCount;
    }
  } catch (error) {
    console.error('읽음 처리 실패:', error);
  }
};

// 스크롤 처리 (무한 스크롤)
const handleScroll = async () => {
  if (!messagesContainer.value || !hasMoreMessages.value || isLoadingMessages.value) return;

  const { scrollTop } = messagesContainer.value;

  if (scrollTop === 0) {
    const oldScrollHeight = messagesContainer.value.scrollHeight;
    await loadMessages(selectedRoomId.value, currentPage.value + 1);

    nextTick(() => {
      const newScrollHeight = messagesContainer.value.scrollHeight;
      messagesContainer.value.scrollTop = newScrollHeight - oldScrollHeight;
    });
  }
};

// 스크롤을 맨 아래로
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 🔥 개선된 채팅 구독 - 안정성 향상
const subscribeToChat = async () => {
  console.log('📡 채팅 WebSocket 구독 시작...');
  console.log('📡 현재 연결 상태:', isConnected.value);

  // 연결이 안되어 있다면 연결 대기
  if (!isConnected.value) {
    console.log('📡 WebSocket 연결 대기 중...');
    try {
      await waitForConnection(10000); // 10초 대기
      console.log('✅ WebSocket 연결 대기 완료');
    } catch (error) {
      console.error('❌ WebSocket 연결 대기 실패:', error);
      // 연결 실패시 3초 후 재시도
      setTimeout(() => {
        console.log('🔄 채팅 구독 재시도...');
        subscribeToChat();
      }, 3000);
      return;
    }
  }

  try {
    console.log('📡 채팅 메시지 구독 시작...');

    // 🔥 기존 구독이 있으면 해제
    if (chatMessageSubscription.value) {
      try {
        chatMessageSubscription.value.unsubscribe();
      } catch (e) {
        console.warn('기존 채팅 메시지 구독 해제 실패:', e);
      }
    }

    if (chatRoomUpdateSubscription.value) {
      try {
        chatRoomUpdateSubscription.value.unsubscribe();
      } catch (e) {
        console.warn('기존 채팅방 업데이트 구독 해제 실패:', e);
      }
    }

    // 새 메시지 수신 - 중복 처리 방지
    chatMessageSubscription.value = subscribe('/user/queue/chat-messages', (message) => {
      const newMsg = JSON.parse(message.body);
      console.log('📨 새 채팅 메시지 수신:', newMsg);

      // 임시 메시지 제거 (내가 보낸 메시지가 서버에서 돌아온 경우)
      if (newMsg.senderId === currentUserId.value) {
        messages.value = messages.value.filter(m => !m.isTemporary || m.content !== newMsg.content);
      }

      // 현재 선택된 채팅방의 메시지인 경우
      if (selectedRoomId.value === newMsg.chatRoomId) {
        // 중복 메시지 체크 - 더 엄격하게
        const existingMessage = messages.value.find(m => {
          // ID가 같은 경우
          if (m.id === newMsg.id && m.id > 0) return true;

          // 내용, 발송자, 시간이 매우 유사한 경우 (1초 이내)
          if (m.senderId === newMsg.senderId && m.content === newMsg.content) {
            const timeDiff = Math.abs(new Date(m.createdDate) - new Date(newMsg.createdDate));
            return timeDiff < 1000;
          }

          return false;
        });

        if (!existingMessage) {
          messages.value.push(newMsg);
          scrollToBottom();
        }

        // 상대방 메시지인 경우 읽음 처리
        if (newMsg.senderId !== currentUserId.value) {
          markMessagesAsRead(newMsg.chatRoomId);
        }
      }

      // 채팅방 목록 업데이트
      updateChatRoomFromMessage(newMsg);
    });

    console.log('📡 채팅방 업데이트 구독 시작...');

    // 채팅방 목록 업데이트 구독
    chatRoomUpdateSubscription.value = subscribe('/user/queue/chat-room-update', () => {
      console.log('📨 채팅방 목록 업데이트 알림 수신');
      loadChatRooms();
    });

    // 구독 성공 여부 확인
    if (chatMessageSubscription.value && chatRoomUpdateSubscription.value) {
      console.log('✅ 채팅 WebSocket 구독 완료');
    } else {
      console.error('❌ 채팅 WebSocket 구독 실패 - 구독 객체가 null');

      // 구독 실패시 재시도
      setTimeout(() => {
        console.log('🔄 구독 실패로 인한 재시도...');
        subscribeToChat();
      }, 3000);
    }

  } catch (error) {
    console.error('❌ 채팅 WebSocket 구독 중 오류:', error);
    // 오류 발생시 재시도
    setTimeout(() => {
      console.log('🔄 오류로 인한 채팅 구독 재시도...');
      subscribeToChat();
    }, 3000);
  }
};

// 메시지로부터 채팅방 목록 업데이트
const updateChatRoomFromMessage = (newMsg) => {
  const roomIndex = chatRooms.value.findIndex(room => room.chatRoomId === newMsg.chatRoomId);

  if (roomIndex > -1) {
    const room = chatRooms.value[roomIndex];
    room.lastMessage = newMsg.content;
    room.lastMessageTime = newMsg.createdDate;

    // 채팅방을 맨 위로 이동
    const updatedRoom = chatRooms.value.splice(roomIndex, 1)[0];
    chatRooms.value.unshift(updatedRoom);
  } else {
    // 새로운 채팅방인 경우 목록 다시 로드
    loadChatRooms();
  }
};

// 시간 포맷팅
const formatTime = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return date.toLocaleDateString();
};

const formatMessageTime = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// 🔥 구독 정리 개선
const cleanupSubscriptions = () => {
  console.log('🧹 Chat 구독 정리 시작...');

  if (chatMessageSubscription.value) {
    try {
      chatMessageSubscription.value.unsubscribe();
      chatMessageSubscription.value = null;
      console.log('✅ 채팅 메시지 구독 해제 완료');
    } catch (error) {
      console.warn('⚠️ 채팅 메시지 구독 해제 실패:', error);
    }
  }

  if (chatRoomUpdateSubscription.value) {
    try {
      chatRoomUpdateSubscription.value.unsubscribe();
      chatRoomUpdateSubscription.value = null;
      console.log('✅ 채팅방 업데이트 구독 해제 완료');
    } catch (error) {
      console.warn('⚠️ 채팅방 업데이트 구독 해제 실패:', error);
    }
  }

  console.log('✅ Chat 구독 정리 완료');
};

// 컴포넌트 마운트
onMounted(async () => {
  console.log('Chat.vue 마운트됨');

  try {
    await loadChatRooms();
    await subscribeToChat();

    const roomId = route.query.roomId;
    const partnerName = route.query.partnerName;
    const partnerImage = route.query.partnerImage;

    if (roomId && partnerName && chatRooms.value.length === 0) {
      const fakeRoom = {
        chatRoomId: roomId,
        partnerName: partnerName,
        partnerProfileImage: partnerImage,
        lastMessage: '',
        lastMessageTime: null,
        unreadCount: 0
      };

      chatRooms.value = [fakeRoom];
      await selectChatRoom(fakeRoom);
    }
  } catch (error) {
    console.error('Chat.vue 마운트 중 오류:', error);
  }
});

// 컴포넌트 언마운트
onUnmounted(() => {
  console.log('Chat.vue 언마운트됨');
  cleanupSubscriptions();
});

// 로그인 상태 변화 감지
watch(() => userStore.currentMember?.id, (newId) => {
  if (newId && newId !== 0) {
    loadChatRooms();
    subscribeToChat();
  }
});

// 쿼리 파라미터 변화 감지
watch(() => route.query.roomId, async (newRoomId) => {
  if (newRoomId && chatRooms.value.length > 0) {
    const targetRoom = chatRooms.value.find(room => room.chatRoomId === newRoomId);
    if (targetRoom) {
      await selectChatRoom(targetRoom);
    }
  }
});
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background-color: #f8f9fa;
}

.chat-sidebar {
  width: 350px;
  background: white;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.chat-rooms-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-rooms-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.unread-badge {
  background: #dc3545;
  color: white;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.chat-rooms-list {
  flex: 1;
  overflow-y: auto;
}

.no-chat-rooms {
  padding: 40px 20px;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}

.chat-room-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f8f9fa;
  transition: background-color 0.2s ease;
  position: relative;
}

.chat-room-item:hover {
  background-color: #f8f9fa;
}

.chat-room-item.active {
  background-color: #e3f2fd;
  border-right: 3px solid #2196f3;
}

.chat-room-item.unread {
  background-color: #fff8e1;
}

.room-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
}

.room-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  margin-bottom: 4px;
}

.room-last-message {
  font-size: 14px;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.room-time {
  font-size: 12px;
  color: #adb5bd;
}

.room-unread-count {
  background: #dc3545;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
  margin-left: 8px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #6c757d;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.chat-empty h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #333;
}

.chat-empty p {
  margin: 0;
  font-size: 16px;
}

.chat-conversation {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
}

.chat-partner-info {
  display: flex;
  align-items: center;
}

.partner-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
}

.partner-name {
  font-weight: 600;
  font-size: 18px;
  color: #333;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-messages {
  text-align: center;
  padding: 20px;
  color: #6c757d;
  font-size: 14px;
}

.message-item {
  display: flex;
  margin-bottom: 8px;
}

.message-item.sent {
  justify-content: flex-end;
}

.message-item.received {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.message-item.sent .message-content {
  align-items: flex-end;
}

.message-item.received .message-content {
  align-items: flex-start;
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message-item.sent .message-text {
  background: #2196f3;
  color: white;
  border-bottom-right-radius: 4px;
}

.message-item.received .message-text {
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
  border: 1px solid #e9ecef;
}

.message-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 11px;
  color: #adb5bd;
}

.message-time {
  font-size: 11px;
}

.read-status {
  font-size: 11px;
  color: #28a745;
  font-weight: 500;
}

.message-input-container {
  padding: 20px;
  background: white;
  border-top: 1px solid #e9ecef;
}

.message-input {
  display: flex;
  gap: 12px;
  align-items: center;
}

.message-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e9ecef;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  background: #f8f9fa;
  transition: all 0.2s ease;
}

.message-input input:focus {
  border-color: #2196f3;
  background: white;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.message-input input:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.send-button {
  padding: 12px 20px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.send-button:hover:not(:disabled) {
  background: #1976d2;
  transform: translateY(-1px);
}

.send-button:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

/* 스크롤바 스타일링 */
.chat-rooms-list::-webkit-scrollbar,
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.chat-rooms-list::-webkit-scrollbar-track,
.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-rooms-list::-webkit-scrollbar-thumb,
.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-rooms-list::-webkit-scrollbar-thumb:hover,
.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .chat-layout {
    flex-direction: column;
  }

  .chat-sidebar {
    width: 100%;
    height: 40%;
    border-right: none;
    border-bottom: 1px solid #e9ecef;
  }

  .chat-main {
    height: 60%;
  }

  .message-content {
    max-width: 85%;
  }

  .messages-container {
    padding: 16px;
  }

  .message-input-container {
    padding: 16px;
  }
}
</style>