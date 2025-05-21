<!-- Character.vue -->
<template>
  <div class="character-container">
    <!-- 캐릭터 애니메이션 -->
    <div class="character">
      <!-- 캐릭터 이미지 - 동적 이미지로 변경 -->
      <div class="character-face">
        <img :src="getImageUrl(currentFrame)" alt="토끼 캐릭터" class="character-image">
      </div>
    </div>

    <!-- 말풍선 (대화상자) -->
    <div class="speech-bubble">
      <div class="speech-content">
        <p v-html="formattedMessage"></p>

        <!-- 로딩 표시 -->
        <div v-if="loading" class="loading-indicator">
          <span>음식을 추천 중이에요...</span>
        </div>

        <!-- 초기 선택 버튼들 (대화 후 표시) -->
        <div v-if="showOptions" class="option-buttons">
          <button
              @click="selectOption(0)"
              class="option-button"
          >
            {{ options[0].label }}
          </button>
          <button
              @click="selectOption(1)"
              class="option-button"
          >
            {{ options[1].label }}
          </button>
        </div>

        <!-- 다시 추천 받기 버튼 (1번 응답 후 표시) -->
        <div v-if="showRetryButton" class="retry-button-container">
          <button
              @click="retryRecommendation"
              class="retry-button"
          >
            이게 뭐야?! 다시 추천해줘!!
          </button>
        </div>
      </div>
    </div>

    <!-- 캐릭터 닫기 버튼 -->
    <button @click="$emit('close')" class="close-button">
      닫기
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onUnmounted, nextTick } from 'vue';
import axios from 'axios';

// 이미지 경로 관리를 위한 함수
const getImageUrl = (frame) => {
  // Vite에서는 import.meta.url을 사용
  return `/assets/img/rabbit/rabbitchat (${frame}).png`;
};

// 초기 메시지
const initialMessage = "안녕하세요! 오늘 식사는 결정하셨나요?";
const currentMessage = ref(initialMessage);
const displayedMessage = ref(''); // 화면에 표시될 메시지
const loading = ref(false); // 로딩 상태 추가
const showRetryButton = ref(false); // 다시 추천 버튼 표시 여부

// 애니메이션 관련 변수 추가
const currentFrame = ref(1);
const isTyping = ref(false);
const animationTimer = ref(null);
const maxFrames = 112; // 총 프레임 수
const animationSpeed = 30; // 프레임 간 간격 (밀리초)

// 토끼 애니메이션 함수 추가
const animateRabbit = () => {
  clearInterval(animationTimer.value);
  
  // 1번 프레임부터 시작
  currentFrame.value = 1;
  isTyping.value = true;
  
  animationTimer.value = setInterval(() => {
    if (currentFrame.value < maxFrames) {
      currentFrame.value++;
    } else {
      // 애니메이션 시퀀스 끝에 도달
      if (isTyping.value) {
        // 아직 타이핑 중이면 1번 프레임으로 돌아감
        currentFrame.value = 1;
      } else {
        // 타이핑이 끝났으면 마지막 프레임에서 정지
        clearInterval(animationTimer.value);
      }
    }
  }, animationSpeed);
};

// 타이핑 효과 관련 변수
const typingSpeed = 50; // 타이핑 속도 (밀리초)
let typingTimer = null;

// 메시지가 표시될 때마다 스크롤 맨 아래로 이동
const scrollToBottom = () => {
  nextTick(() => {
    const speechContent = document.querySelector('.speech-content');
    if (speechContent) {
      speechContent.scrollTop = speechContent.scrollHeight;
    }
  });
};

// 타이핑 효과 함수 수정
const typeMessage = (message) => {
  let i = 0;
  displayedMessage.value = '';
  showRetryButton.value = false; // 타이핑 시작 시 다시 추천 버튼 숨기기
  
  // 애니메이션 시작 추가
  animateRabbit();

  clearInterval(typingTimer);
  typingTimer = setInterval(() => {
    if (i < message.length) {
      displayedMessage.value += message.charAt(i);
      i++;
      // 타이핑 중에도 스크롤 위치 업데이트
      scrollToBottom();
    } else {
      clearInterval(typingTimer);
      
      // 타이핑 완료 추가
      isTyping.value = false;

      // 타이핑이 끝난 후 버튼 표시 처리
      if (message === initialMessage) {
        // 초기 메시지 후 선택지 표시
        setTimeout(() => {
          showOptions.value = true;
          scrollToBottom();
        }, 500);
      } else if (options[0].response && message === options[0].response) {
        // GPT 응답 후 '다시 추천' 버튼 표시
        setTimeout(() => {
          showRetryButton.value = true;
          scrollToBottom();
        }, 500);
      }
    }
  }, typingSpeed);
};

// 컴포넌트가 언마운트될 때 타이머 정리 추가
onUnmounted(() => {
  clearInterval(typingTimer);
  clearInterval(animationTimer.value);
});

// 줄바꿈을 HTML <br> 태그로 변환하는 계산된 속성
const formattedMessage = computed(() => {
  return displayedMessage.value.replace(/\n/g, '<br>');
});

// 선택 옵션 표시 여부
const showOptions = ref(false);

// 선택 옵션과 응답
const options = [
  {
    label: "오늘 뭐먹지?",
    response: "" // GPT API 응답으로 채워질 예정
  },
  {
    label: "앞으로 뭐먹지?",
    response: "요즘 날씨가 좋으니 샐러드는 어떨까요? 건강도 챙기고 가벼운 식사를 즐겨보세요."
  }
];

// GPT API 호출 함수
const callGptRecommendation = async () => {
  loading.value = true;
  showOptions.value = false; // 선택지 숨기기
  showRetryButton.value = false; // 다시 추천 버튼 숨기기

  try {
    const response = await axios.post('/api/gpt/recommendDiet');

    // API 응답 저장 (줄바꿈 처리)
    options[0].response = response.data.recommendation;
    currentMessage.value = response.data.recommendation;
  } catch (error) {
    console.error('음식 추천 API 호출 중 오류 발생:', error);
    currentMessage.value = "죄송해요, 추천을 가져오는 중에 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
  } finally {
    loading.value = false;
  }
};

// 다시 추천 요청 함수
const retryRecommendation = () => {
  callGptRecommendation();
};

// 초기 메시지 타이핑 시작
onMounted(() => {
  nextTick(() => {
    typeMessage(initialMessage);
  });
});

// currentMessage가 변경될 때 타이핑 효과 적용
watch(currentMessage, (newMessage) => {
  typeMessage(newMessage);
});

// 선택지 클릭 처리
const selectOption = (index) => {
  if (index === 0) {
    // '오늘 뭐먹지?' 선택 시 GPT API 호출
    callGptRecommendation();
  } else {
    // 다른 선택지는 기존 로직 유지
    showOptions.value = false; // 선택지 먼저 숨기기
    currentMessage.value = options[index].response;
  }
};

// emit 정의
defineEmits(['close']);
</script>

<style scoped>
.character-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px; /* 요소 간격 추가 */
  background-color: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.character {
  width: 140px;
  height: 140px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.character-face {
  position: relative;
  width: 120px;
  height: 120px;
  background-color: transparent;
  border-radius: 50%;
  overflow: hidden;
}

/* 캐릭터 이미지 */
.character-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 말풍선 스타일 */
.speech-bubble {
  position: relative;
  width: 330px; /* 너비 증가 */
  padding: 0;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  z-index: 1;
  margin-top: 10px;
}

/* 말풍선 안에 스크롤 가능한 내용 컨테이너 */
.speech-content {
  max-height: 300px; /* 최대 높이 설정 - 필요에 따라 조정 가능 */
  overflow-y: auto; /* 세로 스크롤 자동 표시 */
  padding: 18px;
  border-radius: 10px;
}

/* 스크롤바 스타일 커스터마이징 */
.speech-content::-webkit-scrollbar {
  width: 6px;
}

.speech-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.speech-content::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 10px;
}

.speech-content::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}

.speech-bubble::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -10px;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid white;
}

.speech-bubble p {
  margin: 0;
  font-size: 14px; /* 12px에서 14px로 증가 */
  color: #333;
  margin-bottom: 8px; /* 6px에서 8px로 증가 */
  word-break: break-word;
  line-height: 1.5; /* 줄 간격 추가 */
}

/* 로딩 인디케이터 스타일 */
.loading-indicator {
  display: flex;
  justify-content: center;
  margin: 10px 0;
  font-size: 14px;
  color: #666;
}

.loading-indicator span {
  display: inline-block;
  animation: bounce 1.5s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
  40% {transform: translateY(-5px);}
  60% {transform: translateY(-3px);}
}

/* 선택 버튼 스타일 */
.option-buttons {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 8px;
  width: 100%;
  animation: expandOptions 0.5s ease-out; /* 선택지 확장 애니메이션 추가 */
}

.option-button {
  padding: 8px 12px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 13px;
  color: #4b5563;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
  text-align: left;
  width: 100%;
  animation: expandButton 0.5s ease-out; /* 버튼 확장 애니메이션 추가 */
}

.option-button:hover {
  background-color: #e5e7eb;
  transform: scale(1.03); /* 확대 효과 줄임 */
}

/* 다시 추천 버튼 스타일 */
.retry-button-container {
  display: flex;
  justify-content: center;
  margin-top: 12px;
  width: 100%;
  animation: fadeIn 0.5s ease-out;
}

.retry-button {
  padding: 8px 15px;
  background-color: #ffe8e8; /* 약간 붉은 배경 */
  border: 1px solid #ffd5d5;
  border-radius: 12px;
  font-size: 13px;
  color: #e74c3c; /* 붉은 색 텍스트 */
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  width: 100%;
  font-weight: bold;
  animation: pulseButton 2s infinite;
}

.retry-button:hover {
  background-color: #ffd5d5;
  transform: scale(1.03);
}

@keyframes pulseButton {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* 닫기 버튼 스타일 */
.close-button {
  padding: 6px 12px; /* 패딩 줄임 */
  border-radius: 12px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #4b5563;
  font-size: 12px; /* 폰트 크기 줄임 */
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 3px; /* 여백 줄임 */
  width: 80%; /* 버튼 너비 조정 */
}

.close-button:hover {
  background-color: #e5e7eb;
}

/* 애니메이션 정의 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}


@keyframes expandOptions {
  from {
    transform: scaleY(0);
    transform-origin: top;
    opacity: 0;
  }
  to {
    transform: scaleY(1);
    transform-origin: top;
    opacity: 1;
  }
}

@keyframes expandButton {
  from {
    transform: scaleX(0.5);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}
</style>