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
                v-for="(message, index) in messages"
                :key="message.id"
                class="message-item"
                :class="{
                'sent': message.senderId === currentUserId,
                'received': message.senderId !== currentUserId
              }"
            >
              <div class="message-content">
                <div class="message-text" :class="{ 'temporary': message.isTemporary }">
                  {{ message.content }}
                </div>
                <div class="message-info">
                  <span class="message-time">{{ formatMessageTime(message.createdDate) }}</span>
                  <!-- 🆕 체크 표시 - 마지막 메시지에만 -->
                  <span v-if="shouldShowReadCheck(message, index)" class="read-check">
                    ✓
                  </span>
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
const { stompClient, isConnected, subscribe, unsubscribe, waitForConnection, checkConnection } = useWebSocket();
const { notification } = useToast();

// ===== 상태 관리 =====
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

// 🔧 WebSocket 구독 관리 - 고유 ID로 관리
const subscriptions = ref({
  chatMessages: null,
  chatRoomUpdate: null,
  messageReadStatus: null
});

// 현재 사용자 ID
const currentUserId = computed(() => userStore.currentMember?.id);

// 임시 메시지 ID 생성기
let tempMessageId = -1;

// 🔧 연결 상태 모니터링
const connectionMonitor = ref(null);
const reconnectAttempts = ref(0);
const maxReconnectAttempts = ref(5);

// 🆕 체크 표시 로직 - 마지막 메시지에만
const shouldShowReadCheck = (message, index) => {
  if (message.isTemporary) return false;

  if (message.senderId === currentUserId.value) {
    const myMessages = messages.value.filter(m => m.senderId === currentUserId.value && !m.isTemporary);
    const lastMyMessage = myMessages[myMessages.length - 1];
    return message.id === lastMyMessage?.id && message.isRead;
  }

  if (message.senderId !== currentUserId.value) {
    const partnerMessages = messages.value.filter(m => m.senderId !== currentUserId.value);
    const lastPartnerMessage = partnerMessages[partnerMessages.length - 1];
    return message.id === lastPartnerMessage?.id;
  }

  return false;
};

// ===== 채팅방 관리 =====
const loadChatRooms = async () => {
  try {
    console.log('📋 채팅방 목록 로드 시작');
    const response = await axios.get('/api/chat/rooms');
    chatRooms.value = response.data;

    totalUnreadCount.value = chatRooms.value.reduce((sum, room) => sum + room.unreadCount, 0);
    console.log('✅ 채팅방 로드 완료:', chatRooms.value.length, '개');

  } catch (error) {
    console.error('❌ 채팅방 목록 로드 실패:', error);
    chatRooms.value = [];
    
    notification({
      type: 'error',
      title: '채팅방 로드 실패',
      content: '채팅방 목록을 불러올 수 없습니다.'
    });
  }
};

const selectChatRoom = async (room) => {
  console.log('🎯 채팅방 선택:', room.chatRoomId, room.partnerName);
  
  // 이미 선택된 채팅방이면 스킵
  if (selectedRoomId.value === room.chatRoomId) {
    console.log('⏭️ 이미 선택된 채팅방 - 스킵');
    return;
  }
  
  selectedRoomId.value = room.chatRoomId;
  selectedRoom.value = room;
  messages.value = [];
  currentPage.value = 0;
  hasMoreMessages.value = true;

  try {
    // 메시지 로드
    await loadMessages(room.chatRoomId, 0);

    // 읽음 처리
    if (room.unreadCount > 0) {
      await markMessagesAsRead(room.chatRoomId);
    }

    // 스크롤을 맨 아래로
    scrollToBottom();
    
    console.log('✅ 채팅방 선택 완료');
  } catch (error) {
    console.error('❌ 채팅방 선택 중 오류:', error);
  }
};

// ===== 메시지 관리 =====
const loadMessages = async (chatRoomId, page = 0) => {
  if (isLoadingMessages.value) {
    console.log('⏳ 이미 메시지 로딩 중 - 중복 요청 방지');
    return;
  }

  isLoadingMessages.value = true;

  try {
    console.log(`📨 메시지 로드: 채팅방=${chatRoomId}, 페이지=${page}`);
    
    const response = await axios.get(`/api/chat/rooms/${chatRoomId}/messages`, {
      params: { page, size: 20 }
    });

    const newMessages = response.data.content.reverse();

    if (page === 0) {
      messages.value = newMessages;
      console.log('📨 초기 메시지 로드:', newMessages.length, '개');
    } else {
      messages.value = [...newMessages, ...messages.value];
      console.log('📨 추가 메시지 로드:', newMessages.length, '개');
    }

    hasMoreMessages.value = !response.data.last;
    currentPage.value = response.data.number;

  } catch (error) {
    console.error('❌ 메시지 로드 실패:', error);
    
    if (page === 0) {
      messages.value = [];
    }
    
    notification({
      type: 'error',
      title: '메시지 로드 실패',
      content: '메시지를 불러올 수 없습니다.'
    });
  } finally {
    isLoadingMessages.value = false;
  }
};

// 🔧 개선된 메시지 전송
const sendMessage = async () => {
  if (!newMessage.value.trim() || !selectedRoomId.value || isSending.value) {
    console.log('📤 메시지 전송 조건 불충족:', {
      hasMessage: !!newMessage.value.trim(),
      hasRoom: !!selectedRoomId.value,
      isConnected: isConnected.value,
      isSending: isSending.value
    });
    return;
  }

  // 🔧 연결 상태 재확인
  if (!isConnected.value) {
    console.warn('⚠️ WebSocket 연결 끊어짐 - 재연결 시도');
    await checkConnection();
    
    if (!isConnected.value) {
      notification({
        type: 'error',
        title: '연결 오류',
        content: '채팅 서버와 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.'
      });
      return;
    }
  }

  const messageContent = newMessage.value.trim();
  const partnerId = getPartnerId(selectedRoomId.value);
  const tempId = tempMessageId--;

  console.log('📤 메시지 전송 시작:', {
    content: messageContent.substring(0, 20) + (messageContent.length > 20 ? '...' : ''),
    partnerId,
    tempId,
    room: selectedRoomId.value
  });

  // 🔧 낙관적 업데이트 - 즉시 UI에 메시지 추가
  const tempMessage = {
    id: tempId,
    senderId: currentUserId.value,
    receiverId: partnerId,
    content: messageContent,
    createdDate: new Date().toISOString(),
    isRead: false,
    chatRoomId: selectedRoomId.value,
    isTemporary: true
  };

  messages.value.push(tempMessage);
  const messageToSend = newMessage.value;
  newMessage.value = ''; // 입력창 즉시 클리어
  scrollToBottom();

  // 채팅방 목록에서도 즉시 업데이트
  updateChatRoomLastMessage(selectedRoomId.value, messageContent, new Date().toISOString());

  isSending.value = true;

  try {
    // 🔧 WebSocket으로 메시지 전송
    if (stompClient.value && stompClient.value.connected) {
      stompClient.value.publish({
        destination: '/app/send-message',
        body: JSON.stringify({
          receiverId: partnerId,
          content: messageContent
        })
      });

      console.log('✅ 메시지 전송 성공');
    } else {
      throw new Error('WebSocket 연결이 끊어졌습니다.');
    }

  } catch (error) {
    console.error('❌ 메시지 전송 실패:', error);

    // 🔧 실패 시 임시 메시지 제거 및 입력 복구
    const failedMsgIndex = messages.value.findIndex(m => m.id === tempId);
    if (failedMsgIndex > -1) {
      messages.value.splice(failedMsgIndex, 1);
    }

    newMessage.value = messageToSend; // 입력 복구

    notification({
      type: 'error',
      title: '전송 실패',
      content: '메시지 전송에 실패했습니다. 연결을 확인해주세요.'
    });

    // 🔧 연결 문제인 경우 재연결 시도
    if (error.message.includes('연결')) {
      setTimeout(subscribeToChat, 2000);
    }
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

    const updatedRoom = chatRooms.value.splice(roomIndex, 1)[0];
    chatRooms.value.unshift(updatedRoom);
  }
};

// 채팅방 ID에서 상대방 ID 추출
const getPartnerId = (chatRoomId) => {
  const [id1, id2] = chatRoomId.split('_').map(Number);
  return id1 === currentUserId.value ? id2 : id1;
};

// 🔧 개선된 메시지 읽음 처리
const markMessagesAsRead = async (chatRoomId) => {
  try {
    await axios.post(`/api/chat/rooms/${chatRoomId}/read`);

    // 🔧 현재 채팅방의 상대방 메시지들을 읽음 처리
    messages.value.forEach(msg => {
      if (msg.chatRoomId === chatRoomId && msg.senderId !== currentUserId.value) {
        msg.isRead = true;
      }
    });

    // 로컬 상태에서도 읽음 처리
    const roomIndex = chatRooms.value.findIndex(room => room.chatRoomId === chatRoomId);
    if (roomIndex > -1) {
      const previousUnreadCount = chatRooms.value[roomIndex].unreadCount;
      chatRooms.value[roomIndex].unreadCount = 0;
      totalUnreadCount.value -= previousUnreadCount;
    }
    
    console.log('✅ 메시지 읽음 처리 완료:', chatRoomId);
  } catch (error) {
    console.error('❌ 읽음 처리 실패:', error);
  }
};

// ===== 스크롤 관리 =====
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

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// ===== WebSocket 구독 관리 =====

// 🔧 완전히 개선된 채팅 구독
const subscribeToChat = async () => {
  if (!currentUserId.value || currentUserId.value === 0) {
    console.log('❌ 로그인되지 않은 상태 - 구독 중단');
    return;
  }

  console.log('📡 Chat.vue WebSocket 구독 시작...');
  console.log('📡 현재 연결 상태:', isConnected.value);

  // 🔧 연결 대기
  if (!isConnected.value) {
    console.log('📡 WebSocket 연결 대기 중...');
    try {
      await waitForConnection(15000);
      console.log('✅ WebSocket 연결 대기 완료');
    } catch (error) {
      console.error('❌ WebSocket 연결 대기 실패:', error);
      
      // 재시도 로직
      if (reconnectAttempts.value < maxReconnectAttempts.value) {
        reconnectAttempts.value++;
        const delay = Math.min(2000 * reconnectAttempts.value, 10000);
        console.log(`🔄 ${delay}ms 후 재시도 (${reconnectAttempts.value}/${maxReconnectAttempts.value})`);
        
        setTimeout(() => {
          subscribeToChat();
        }, delay);
      } else {
        console.error('🚨 최대 재시도 횟수 초과');
        notification({
          type: 'error',
          title: '연결 실패',
          content: '채팅 서버 연결에 실패했습니다. 페이지를 새로고침해주세요.'
        });
      }
      return;
    }
  }

  try {
    // 🔧 기존 구독 정리
    cleanupSubscriptions();

    const userId = currentUserId.value;
    const timestamp = Date.now();

    // 🔧 1. 채팅 메시지 구독 - 고유 ID 사용
    console.log('📡 채팅 메시지 구독 시작...');
    const chatMessageSubId = `chat-messages-${userId}-${timestamp}-1`;
    
    subscriptions.value.chatMessages = subscribe(
      '/user/queue/chat-messages',
      (message) => {
        try {
          const newMsg = JSON.parse(message.body);
          console.log('📨 Chat.vue - 새 채팅 메시지:', {
            id: newMsg.id,
            senderId: newMsg.senderId,
            chatRoomId: newMsg.chatRoomId,
            content: newMsg.content?.substring(0, 30) + '...',
            currentRoom: selectedRoomId.value
          });

          handleNewChatMessage(newMsg);
        } catch (parseError) {
          console.error('❌ 채팅 메시지 파싱 실패:', parseError);
        }
      },
      chatMessageSubId
    );

    // 🔧 2. 채팅방 업데이트 구독
    console.log('📡 채팅방 업데이트 구독 시작...');
    const roomUpdateSubId = `chat-room-update-${userId}-${timestamp}-2`;
    
    subscriptions.value.chatRoomUpdate = subscribe(
      '/user/queue/chat-room-update',
      () => {
        console.log('📨 채팅방 목록 업데이트 알림 수신');
        loadChatRooms();
      },
      roomUpdateSubId
    );

    // 🔧 3. 읽음 상태 업데이트 구독
    console.log('📡 읽음 상태 구독 시작...');
    const readStatusSubId = `message-read-status-${userId}-${timestamp}-3`;
    
    subscriptions.value.messageReadStatus = subscribe(
      '/user/queue/message-read-status',
      (message) => {
        try {
          const readStatus = JSON.parse(message.body);
          console.log('📖 메시지 읽음 상태 업데이트:', readStatus);

          if (selectedRoomId.value === readStatus.chatRoomId) {
            let updatedCount = 0;
            messages.value.forEach(msg => {
              if (msg.senderId === currentUserId.value && !msg.isTemporary && !msg.isRead) {
                msg.isRead = true;
                updatedCount++;
              }
            });
            
            if (updatedCount > 0) {
              console.log('✅ 내 메시지 읽음 상태 업데이트:', updatedCount, '개');
            }
          }
        } catch (parseError) {
          console.error('❌ 읽음 상태 파싱 실패:', parseError);
        }
      },
      readStatusSubId
    );

    console.log('✅ Chat.vue WebSocket 구독 완료');
    reconnectAttempts.value = 0; // 성공시 리셋

    // 🔧 구독 상태 확인
    setTimeout(() => {
      console.log('🔍 Chat.vue 구독 상태 확인:', {
        chatMessages: !!subscriptions.value.chatMessages,
        chatRoomUpdate: !!subscriptions.value.chatRoomUpdate,
        messageReadStatus: !!subscriptions.value.messageReadStatus,
        isConnected: isConnected.value
      });
    }, 1000);

  } catch (error) {
    console.error('❌ 채팅 WebSocket 구독 중 오류:', error);
    
    setTimeout(() => {
      console.log('🔄 오류로 인한 채팅 구독 재시도...');
      subscribeToChat();
    }, 5000);
  }
};

// 🔧 새 채팅 메시지 처리 로직 분리
const handleNewChatMessage = (newMsg) => {
  // 🔧 현재 선택된 채팅방의 메시지만 처리
  if (selectedRoomId.value !== newMsg.chatRoomId) {
    console.log('🔄 다른 채팅방 메시지 - 채팅방 목록만 업데이트');
    updateChatRoomFromMessage(newMsg);
    return;
  }

  // 🔧 임시 메시지 처리 (내가 보낸 메시지)
  if (newMsg.senderId === currentUserId.value) {
    const tempMsgIndex = messages.value.findIndex(m =>
        m.isTemporary &&
        m.content === newMsg.content &&
        m.senderId === newMsg.senderId &&
        m.chatRoomId === newMsg.chatRoomId
    );

    if (tempMsgIndex > -1) {
      console.log('🔄 임시 메시지 교체:', messages.value[tempMsgIndex].id, '->', newMsg.id);
      // 임시 메시지를 실제 메시지로 교체
      messages.value[tempMsgIndex] = { ...newMsg, isTemporary: false };
      
      // 채팅방 목록 업데이트
      updateChatRoomFromMessage(newMsg);
      return;
    }
  }

  // 🔧 완화된 중복 메시지 체크
  const existingMessage = messages.value.find(m => {
    // 1. 같은 ID인 경우 (확실한 중복)
    if (m.id === newMsg.id && m.id > 0) return true;
    
    // 2. 매우 유사한 메시지 체크 (500ms 이내 + 같은 내용 + 같은 발신자)
    if (m.senderId === newMsg.senderId && 
        m.content === newMsg.content && 
        !m.isTemporary &&
        m.chatRoomId === newMsg.chatRoomId) {
      const timeDiff = Math.abs(new Date(m.createdDate) - new Date(newMsg.createdDate));
      return timeDiff < 500; // 0.5초로 더 완화
    }

    return false;
  });

  if (!existingMessage) {
    console.log('✅ 새 메시지 추가:', newMsg.id);
    messages.value.push(newMsg);
    scrollToBottom();

    // 상대방 메시지인 경우 즉시 읽음 처리
    if (newMsg.senderId !== currentUserId.value) {
      markMessagesAsRead(newMsg.chatRoomId);
    }
  } else {
    console.log('⚠️ 중복 메시지 무시:', newMsg.id, '(기존:', existingMessage.id, ')');
  }

  // 채팅방 목록 업데이트
  updateChatRoomFromMessage(newMsg);
};

// 메시지로부터 채팅방 목록 업데이트
const updateChatRoomFromMessage = (newMsg) => {
  const roomIndex = chatRooms.value.findIndex(room => room.chatRoomId === newMsg.chatRoomId);

  if (roomIndex > -1) {
    const room = chatRooms.value[roomIndex];
    room.lastMessage = newMsg.content;
    room.lastMessageTime = newMsg.createdDate;

    // 🔧 내가 보낸 메시지가 아닌 경우에만 unread 증가
    if (newMsg.senderId !== currentUserId.value && selectedRoomId.value !== newMsg.chatRoomId) {
      room.unreadCount = (room.unreadCount || 0) + 1;
      totalUnreadCount.value++;
    }

    // 채팅방을 맨 위로 이동
    const updatedRoom = chatRooms.value.splice(roomIndex, 1)[0];
    chatRooms.value.unshift(updatedRoom);
    
    console.log('✅ 채팅방 목록 업데이트 완료');
  } else {
    console.log('🔄 새로운 채팅방 - 전체 목록 다시 로드');
    loadChatRooms();
  }
};

// 🔧 구독 정리
const cleanupSubscriptions = () => {
  console.log('🧹 Chat.vue 구독 정리 시작...');

  Object.entries(subscriptions.value).forEach(([key, subscription]) => {
    if (subscription) {
      try {
        if (typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
        console.log(`✅ ${key} 구독 해제 완료`);
      } catch (error) {
        console.warn(`⚠️ ${key} 구독 해제 실패:`, error);
      }
      subscriptions.value[key] = null;
    }
  });

  console.log('✅ Chat.vue 구독 정리 완료');
};

// 🔧 연결 상태 모니터링
const startConnectionMonitoring = () => {
  if (connectionMonitor.value) {
    clearInterval(connectionMonitor.value);
  }

  connectionMonitor.value = setInterval(() => {
    if (!isConnected.value) {
      console.warn('⚠️ WebSocket 연결 끊어짐 감지');
      
      // 연결 상태 체크 후 재구독
      checkConnection().then(() => {
        if (isConnected.value) {
          console.log('🔄 연결 복구됨 - 재구독 시도');
          subscribeToChat();
        }
      });
    }
  }, 10000); // 10초마다 체크

  console.log('✅ 연결 상태 모니터링 시작');
};

const stopConnectionMonitoring = () => {
  if (connectionMonitor.value) {
    clearInterval(connectionMonitor.value);
    connectionMonitor.value = null;
    console.log('🛑 연결 상태 모니터링 중지');
  }
};

// ===== 시간 포맷팅 =====
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


// 🔧 새로운 채팅방 처리 함수
const handleQueryParams = async () => {
  const roomId = route.query.roomId;
  const partnerName = route.query.partnerName;
  const partnerImage = route.query.partnerImage;

  if (!roomId || !partnerName) return;

  console.log('🎯 쿼리 파라미터 처리:', { roomId, partnerName });

  // 기존 채팅방 목록에서 해당 roomId 찾기
  let targetRoom = chatRooms.value.find(room => room.chatRoomId === roomId);

  // 없으면 새로운 fake room 생성
  if (!targetRoom) {
    console.log('📝 새로운 채팅방 생성:', roomId);
    
    const fakeRoom = {
      chatRoomId: roomId,
      partnerName: partnerName,
      partnerProfileImage: partnerImage || '/assets/img/default_profile.png',
      lastMessage: '',
      lastMessageTime: null,
      unreadCount: 0
    };

    // 채팅방 목록 맨 앞에 추가
    chatRooms.value.unshift(fakeRoom);
    targetRoom = fakeRoom;
  }

  // 채팅방 선택
  if (targetRoom) {
    await selectChatRoom(targetRoom);
    console.log('✅ 채팅방 선택 완료:', roomId);
  }
};

// ===== 생명주기 관리 =====

// 🔧 컴포넌트 마운트
onMounted(async () => {
  console.log('🚀 Chat.vue 마운트 시작');

  try {
    // 1. 채팅방 목록 로드
    await loadChatRooms();

    // 2. WebSocket 구독
    await subscribeToChat();

    // 3. 연결 모니터링 시작
    startConnectionMonitoring();

    // 4. 쿼리 파라미터 처리 (개선됨)
    await handleQueryParams();

    console.log('✅ Chat.vue 마운트 완료');
  } catch (error) {
    console.error('❌ Chat.vue 마운트 중 오류:', error);
    
    notification({
      type: 'error',
      title: '초기화 실패',
      content: '채팅을 초기화하는 중 오류가 발생했습니다.'
    });
  }
});

// 🔧 컴포넌트 언마운트
onUnmounted(() => {
  console.log('🧹 Chat.vue 언마운트 시작');
  
  // 연결 모니터링 중지
  stopConnectionMonitoring();
  
  // 구독 정리
  cleanupSubscriptions();
  
  // 상태 초기화
  reconnectAttempts.value = 0;
  
  console.log('✅ Chat.vue 언마운트 완료');
});

// ===== 반응형 감시 =====

// 🔧 로그인 상태 변화 감지
watch(() => userStore.currentMember?.id, (newId, oldId) => {
  console.log('👤 사용자 상태 변화:', { oldId, newId });
  
  if (newId && newId !== 0 && newId !== oldId) {
    console.log('🔑 로그인 감지 - 채팅 초기화');
    
    // 기존 구독 정리 후 재구독
    setTimeout(() => {
      loadChatRooms();
      subscribeToChat();
    }, 1000);
  } else if ((!newId || newId === 0) && oldId && oldId !== 0) {
    console.log('🚪 로그아웃 감지 - 구독 정리');
    cleanupSubscriptions();
    stopConnectionMonitoring();
  }
});

// 🔧 쿼리 파라미터 변화 감지
watch(() => route.query.roomId, async (newRoomId, oldRoomId) => {
  if (newRoomId && newRoomId !== oldRoomId) {
    console.log('🔄 쿼리 파라미터 변화 감지:', { oldRoomId, newRoomId });
    await handleQueryParams();
  }
}, { immediate: false }); // immediate: false로 설정하여 onMounted와 중복 실행 방지

// 🔧 전체 쿼리 변화도 감지 (새로 추가)
watch(() => [route.query.roomId, route.query.partnerName, route.query.partnerImage], 
  async ([newRoomId, newPartnerName, newPartnerImage], [oldRoomId, oldPartnerName, oldPartnerImage]) => {
    // roomId가 변경되었거나, 같은 roomId지만 파트너 정보가 변경된 경우
    if (newRoomId && (
      newRoomId !== oldRoomId || 
      newPartnerName !== oldPartnerName || 
      newPartnerImage !== oldPartnerImage
    )) {
      console.log('🔄 채팅 파라미터 전체 변화 감지');
      await handleQueryParams();
    }
  }, 
  { immediate: false }
);

// ===== 디버깅 함수 (개발용) =====
if (process.env.NODE_ENV === 'development') {
  window.chatDebug = {
    getState: () => ({
      selectedRoomId: selectedRoomId.value,
      messagesCount: messages.value.length,
      tempMessages: messages.value.filter(m => m.isTemporary).length,
      subscriptions: Object.keys(subscriptions.value).filter(key => subscriptions.value[key]),
      isConnected: isConnected.value,
      reconnectAttempts: reconnectAttempts.value
    }),
    
    forceReconnect: () => {
      console.log('🔧 강제 재연결 시도...');
      cleanupSubscriptions();
      setTimeout(subscribeToChat, 1000);
    },
    
    clearTempMessages: () => {
      const tempCount = messages.value.filter(m => m.isTemporary).length;
      messages.value = messages.value.filter(m => !m.isTemporary);
      console.log('🧹 임시 메시지 정리:', tempCount, '개 제거');
    },
    
    testMessage: (content = '테스트 메시지') => {
      if (selectedRoomId.value) {
        newMessage.value = content;
        sendMessage();
      } else {
        console.log('❌ 선택된 채팅방 없음');
      }
    }
  };
  
  console.log('🔧 Chat.vue 디버깅 도구 활성화: window.chatDebug');
}
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

.read-check {
  color: #28a745;
  font-weight: bold;
  font-size: 12px;
}
</style>